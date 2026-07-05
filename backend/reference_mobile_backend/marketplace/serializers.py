from rest_framework import serializers
from django.contrib.auth.models import User
from django.utils import timezone
from django.db import models
from .models import UserProfile, Product, ProductImage, Auction, Bid, Conversation, Message, UserAgent, Notification, AgentPendingBid

import logging
logger = logging.getLogger(__name__)


class UserSerializer(serializers.ModelSerializer):
    """User serializer for authentication responses"""
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_staff', 'is_superuser']
        read_only_fields = ['id']


class UserProfileSerializer(serializers.ModelSerializer):
    """User profile serializer"""
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = UserProfile
        fields = [
            'id', 'user', 'role', 'phone', 'city', 'trust_score', 
            'is_verified', 'avatar', 'wallet_balance', 
            'total_sales', 'seller_rating', 'created_at'
        ]
        read_only_fields = ['id', 'trust_score', 'wallet_balance', 'total_sales', 'seller_rating', 'created_at']


class ProductImageSerializer(serializers.ModelSerializer):
    """Product image serializer"""
    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'is_primary', 'order']
        read_only_fields = ['id']


class BidSerializer(serializers.ModelSerializer):
    """Bid serializer with bidder info"""
    bidder_name = serializers.CharField(source='bidder.username', read_only=True)
    bidder_avatar = serializers.ImageField(source='bidder.profile.avatar', read_only=True)
    
    class Meta:
        model = Bid
        fields = ['id', 'auction', 'bidder', 'bidder_name', 'bidder_avatar', 'amount', 'created_at']
        read_only_fields = ['id', 'created_at']


class AuctionSerializer(serializers.ModelSerializer):
    """Auction serializer with bidding history (optimized)"""
    highest_bidder_name = serializers.CharField(source='highest_bidder.username', read_only=True, allow_null=True)
    total_bids = serializers.SerializerMethodField()
    product_title = serializers.CharField(source='product.title', read_only=True)
    product_image = serializers.SerializerMethodField()
    product_status = serializers.CharField(source='product.status', read_only=True)
    owner_id = serializers.IntegerField(source='product.owner.id', read_only=True)
    
    class Meta:
        model = Auction
        fields = [
            'id', 'product', 'product_title', 'product_image', 'product_status',
            'owner_id', 'starting_bid', 'current_bid', 'highest_bidder', 
            'highest_bidder_name', 'start_time', 'end_time', 
            'is_active', 'total_bids'
        ]
        read_only_fields = ['id', 'current_bid', 'highest_bidder']

    def get_total_bids(self, obj):
        # Use annotated value from queryset for maximum speed
        return getattr(obj, 'annotated_total_bids', obj.bids.count())

    def get_product_image(self, obj):
        """Get product image URL — works with Cloudinary and local storage."""
        try:
            primary_img = obj.product.images.filter(is_primary=True).first()
            if not primary_img:
                primary_img = obj.product.images.first()
            if primary_img and primary_img.image:
                url = primary_img.image.url
                # Cloudinary URLs are already absolute
                if url.startswith('http'):
                    return url
                # Local files need the request to build absolute URI
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(url)
                return url
        except Exception:
            pass
        return None


class AuctionDetailSerializer(AuctionSerializer):
    """Detailed auction serializer including full bidding history"""
    bids = BidSerializer(many=True, read_only=True)
    
    class Meta(AuctionSerializer.Meta):
        fields = AuctionSerializer.Meta.fields + ['bids']


class ProductListSerializer(serializers.ModelSerializer):
    """Lightweight product serializer for list views"""
    owner_name = serializers.CharField(source='owner.username', read_only=True)
    owner_id = serializers.IntegerField(source='owner.id', read_only=True)
    seller = serializers.SerializerMethodField()
    primary_image = serializers.SerializerMethodField()
    is_auction = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Product
        fields = [
            'id', 'title', 'description', 'price', 'category', 'condition', 'status',
            'location', 'phone_number', 'is_auction',
            'auction_end_time', 'primary_image', 'owner_name', 'owner_id', 'seller', 'views_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'owner_name', 'owner_id', 'seller', 'views_count', 'created_at', 'updated_at']
    
    def get_seller(self, obj):
        try:
            return {
                'id': obj.owner.id,
                'username': obj.owner.username,
                'first_name': obj.owner.first_name,
                'last_name': obj.owner.last_name,
                'trust_score': getattr(obj.owner.profile, 'trust_score', 0.0) if hasattr(obj.owner, 'profile') else 0.0
            }
        except Exception:
            return None

    def get_primary_image(self, obj):
        primary_img = obj.images.filter(is_primary=True).first()
        if primary_img:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(primary_img.image.url)
        return None


class ProductDetailSerializer(serializers.ModelSerializer):
    """Detailed product serializer with all relations"""
    owner = UserSerializer(read_only=True)
    owner_profile = serializers.SerializerMethodField()
    images = ProductImageSerializer(many=True, read_only=True)
    auction = AuctionDetailSerializer(read_only=True)
    
    class Meta:
        model = Product
        fields = [
            'id', 'owner', 'owner_profile', 'title', 'description', 
            'price', 'category', 'condition', 'status', 'location',
            'phone_number', 'is_auction', 'auction_end_time', 
            'views_count', 'images', 'auction', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'owner', 'views_count', 'created_at', 'updated_at']
    
    def get_owner_profile(self, obj):
        try:
            profile = obj.owner.profile
            return {
                'trust_score': profile.trust_score,
                'seller_rating': float(profile.seller_rating),
                'total_sales': profile.total_sales,
                'city': profile.city,
                'avatar': self.context['request'].build_absolute_uri(profile.avatar.url) if profile.avatar else None
            }
        except UserProfile.DoesNotExist:
            return None


# ──────────────────────────────────────────────────────────────
# AUTO-BIDDING ENGINE
# ──────────────────────────────────────────────────────────────

import threading
from django.db import connection

def run_auto_bidding_async(auction_id, detected_item):
    """Wrapper to run auto-bidding in a background thread to avoid UI lag."""
    from .models import Auction
    try:
        # Re-fetch auction in this thread's context
        auction = Auction.objects.get(id=auction_id)
        run_auto_bidding(auction, detected_item)
    except Exception as e:
        logger.error(f"[Agent] Async auto-bidding error: {e}")
    finally:
        connection.close()

def run_auto_bidding(auction, detected_item):
    """
    Core auto-bidding logic. Called after a new auction is created.
    
    1. Find all active UserAgents targeting this detected_item.
    2. Filter out agents with insufficient wallet balance.
    3. Simulate bidding war and handle wallet deductions/refunds.
    """
    from decimal import Decimal
    
    BID_INCREMENT = Decimal('50.00')
    
    seller = auction.product.owner
    starting_bid = auction.starting_bid
    
    min_required_budget = auction.current_bid + BID_INCREMENT
    if auction.highest_bidder is None:
        min_required_budget = starting_bid

    potential_agents = list(
        UserAgent.objects.filter(
            is_active=True,
            max_budget__gte=min_required_budget
        ).filter(
            # Flexible match: match English ID OR Arabic label
            models.Q(target_item=detected_item) | 
            models.Q(target_item=__import__('ai.classifier', fromlist=['YOLO_CLASS_LABELS']).YOLO_CLASS_LABELS.get(detected_item, ''))
        ).exclude(user=seller)
         .exclude(user=auction.highest_bidder)
         .select_related('user', 'user__profile')
    )
    
    # Pre-filter by balance and notifications
    filtered_agents = []
    for agent in potential_agents:
        # 1. Wallet Balance Check
        if agent.user.profile.wallet_balance < min_required_budget:
            # Notify once per hour about low balance
            from django.utils import timezone
            if not Notification.objects.filter(
                user=agent.user,
                title="⚠️ رصيد غير كافٍ للوكيل",
                created_at__gt=timezone.now() - timezone.timedelta(hours=1)
            ).exists():
                Notification.objects.create(
                    user=agent.user,
                    title="⚠️ رصيد غير كافٍ للوكيل",
                    message=f"الوكيل '{agent.target_item}' حاول المزايدة على '{auction.product.title}' لكن رصيدك {agent.user.profile.wallet_balance} ج.م وهو غير كافٍ.",
                    related_product=auction.product
                )
            continue
            
        # 2. Duplicate Notification Check (don't process same product twice)
        if Notification.objects.filter(related_product=auction.product, user=agent.user).exists():
            continue
            
        filtered_agents.append(agent)
    
    if not filtered_agents:
        return
    
    from ai.agent_graph import smart_agent_evaluator
    from concurrent.futures import ThreadPoolExecutor, as_completed
    
    matching_agents = []
    product = auction.product

    def _evaluate_single_agent(agent):
        if agent.requirements_prompt.strip():
            logger.info(f"[AgentGraph] Evaluating agent {agent.user.username} requirements...")
            eval_result = smart_agent_evaluator.invoke({
                "product_title": product.title,
                "product_desc": product.description,
                "product_condition": product.condition,
                "product_price": str(product.price),
                "agent_requirements": agent.requirements_prompt,
                "agent_max_budget": str(agent.max_budget),
            })
            
            reason = eval_result.get("reason", "") if isinstance(eval_result, dict) else getattr(eval_result, 'reason', '')
            is_match = eval_result.get("is_match", False) if isinstance(eval_result, dict) else getattr(eval_result, 'is_match', False)
            return agent, is_match, reason
        else:
            return agent, True, "طابق الفئة المطلوبة (تلقائي)"

    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = {executor.submit(_evaluate_single_agent, agent): agent for agent in filtered_agents}
        for future in as_completed(futures):
            try:
                agent, is_match, reason = future.result(timeout=30)
                if is_match:
                    logger.info(f"[AgentGraph] MATCH: {reason}")
                    agent._ai_reasoning = reason
                    matching_agents.append(agent)
                else:
                    logger.info(f"[AgentGraph] REJECT: {reason}")
                    _notify_agent_rejection(agent, product, reason)
            except Exception as e:
                failed_agent = futures[future]
                logger.error(f"[AgentGraph] Evaluation failed for {failed_agent.user.username}: {e}")
            
    matching_agents.sort(key=lambda a: a.max_budget, reverse=True)

    if not matching_agents:
        logger.info(f"[Agent] No matching agents for '{detected_item}'")
        return
    
    logger.info(f"[Agent] 🤖 Found {len(matching_agents)} true matching agent(s) for '{detected_item}'")

    # ── Pending-Bid Creation (no wallet deduction, no Bid yet) ─────
    # Each matching agent gets a pending bid proposal — the user must approve.
    for agent in matching_agents:
        proposed_amount = starting_bid if auction.highest_bidder is None else auction.current_bid + BID_INCREMENT
        reasoning = getattr(agent, '_ai_reasoning', '')

        # Avoid duplicate pending bids for same agent+auction
        if AgentPendingBid.objects.filter(agent=agent, auction=auction, status='pending').exists():
            logger.info(f"[Agent] Already has a pending bid for {agent.user.username} on auction {auction.id}")
            continue

        notification = Notification.objects.create(
            user=agent.user,
            title="🤖 وجد الوكيل منتجاً مناسباً!",
            message=(
                f"وجدت منتجاً يطابق تماماً ما تبحث عنه: \"{auction.product.title}\"\n"
                f"السعر المقترح: {proposed_amount} ج.م\n"
                f"انتظر موافقتك للمزايدة."
            ),
            related_product=auction.product,
            reasoning=reasoning,
        )

        AgentPendingBid.objects.create(
            agent=agent,
            auction=auction,
            proposed_amount=proposed_amount,
            previous_amount=Decimal('0.00'),
            status='pending',
            ai_reasoning=reasoning,
            notification=notification,
            is_counter_bid=False,
            round_number=1,
        )
        logger.info(
            f"[Agent] ✅ Pending bid created for {agent.user.username} — "
            f"proposed {proposed_amount} on '{auction.product.title}'"
        )


def _notify_agent_bid(agent, auction, amount, detected_item, outbid=False):
    """Send a notification + chat message to the agent owner about a bid."""
    from ai.classifier import YOLO_CLASS_LABELS
    
    item_label = YOLO_CLASS_LABELS.get(detected_item, detected_item)
    product = auction.product
    
    if outbid:
        title = f"🤖 الوكيل الذكي خسر المزايدة"
        message = (
            f"الوكيل الذكي بتاعك زايد بمبلغ {amount} جنيه على \"{product.title}\" ({item_label}) "
            f"لكن فيه مزايد تاني كسب. ميزانيتك القصوى كانت {agent.max_budget} جنيه."
        )
    else:
        title = f"🤖 الوكيل الذكي زايد بنجاح!"
        message = (
            f"الوكيل الذكي بتاعك لسه حاطط مزايدة بقيمة {amount} جنيه "
            f"على \"{product.title}\" ({item_label})! ✅"
        )
    
    # Create notification record
    reasoning = getattr(agent, '_ai_reasoning', '')
    Notification.objects.create(
        user=agent.user,
        title=title,
        message=message,
        related_product=product,
        reasoning=reasoning
    )
    
    # Optional: Add reasoning to the message for more clarity
    if reasoning:
        message += f"\n\nسبب المزايدة: {reasoning}"
    
    # Also send a chat message via the existing Conversation system
    try:
        conversation, _ = Conversation.objects.get_or_create(
            product=product,
            buyer=agent.user,
            defaults={'seller': product.owner}
        )
        Message.objects.create(
            conversation=conversation,
            sender=product.owner,
            content=message
        )
    except Exception as e:
        logger.error(f"[Agent] Failed to send chat notification: {e}")

def _notify_agent_rejection(agent, product, reason):
    """Notify the user that their agent matched the category but was rejected by LLM."""
    # Prevent duplicate rejection notifications for same user+product
    already_notified = Notification.objects.filter(
        user=agent.user,
        related_product=product,
        title__contains='تخطى منتج'
    ).exists()
    if already_notified:
        return
    
    title = f"\U0001f916 الوكيل تخطى منتج: {product.title}"
    message = f"الوكيل وجد منتج من نفس الفئة المطلوبة ولكن لم يزايد عليه بناءً على شروطك."
    
    Notification.objects.create(
        user=agent.user,
        title=title,
        message=message,
        related_product=product,
        reasoning=reason
    )


BID_INCREMENT = 50  # Agent counter-bid increment in EGP
MAX_COUNTER_BID_ROUNDS = 3  # Hard limit to prevent infinite agent-vs-agent loops


def agent_counter_bid_async(auction_id, manual_bidder_id, round_number=1):
    """Wrapper to run agent counter-bidding in a background thread."""
    from .models import Auction
    from django.contrib.auth.models import User
    try:
        auction = Auction.objects.get(id=auction_id)
        manual_bidder = User.objects.get(id=manual_bidder_id)
        agent_counter_bid(auction, manual_bidder, round_number=round_number)
    except Exception as e:
        logger.error(f"[Agent] Async counter-bid error: {e}")
    finally:
        connection.close()

def agent_counter_bid(auction, manual_bidder, round_number=1):
    """
    Called AFTER a manual bid is placed.
    Find active agents targeting this product's detected item and
    auto-counter-bid by BID_INCREMENT, as long as max_budget allows.
    
    round_number: Guards against infinite loops. Max 3 rounds per auction event.
    """
    from decimal import Decimal
    
    BID_INCREMENT = Decimal('50.00')
    
    if round_number > MAX_COUNTER_BID_ROUNDS:
        logger.info(f"[Agent] ⛔ Max counter-bid rounds ({MAX_COUNTER_BID_ROUNDS}) reached. Stopping.")
        return
    product = auction.product
    detected_item = product.detected_item

    if not detected_item:
        return

    potential_agents = list(
        UserAgent.objects
        .filter(target_item=detected_item, is_active=True)
        .exclude(user=manual_bidder)
        .exclude(user=product.owner)
        .select_related('user', 'user__profile')
    )

    from ai.agent_graph import smart_agent_evaluator
    matching_agents = []
    
    for agent in potential_agents:
        if agent.requirements_prompt.strip():
            eval_result = smart_agent_evaluator.invoke({
                "product_title": product.title,
                "product_desc": product.description,
                "product_condition": product.condition,
                "product_price": str(product.price),
                "agent_requirements": agent.requirements_prompt,
                "agent_max_budget": str(agent.max_budget),
            })
            if eval_result.get("is_match"):
                matching_agents.append(agent)
        else:
            matching_agents.append(agent)

    for agent in matching_agents:
        counter_amount = auction.current_bid + BID_INCREMENT

        if counter_amount > agent.max_budget:
            logger.info(
                f"[Agent] ⛔ {agent.user.username}'s agent can't counter-bid "
                f"({counter_amount} > budget {agent.max_budget})"
            )
            Notification.objects.create(
                user=agent.user,
                title="⛔ الوكيل تجاوز الميزانية",
                message=(
                    f"تجاوزت مزايدتك على \"{product.title}\" حد الميزانية القصوى ({agent.max_budget} ج.م). "
                    f"المزايدة الحالية: {auction.current_bid} ج.م."
                ),
                related_product=product,
            )
            continue

        # Expire any stale pending bids for this agent+auction
        AgentPendingBid.objects.filter(
            agent=agent, auction=auction, status='pending'
        ).update(status='expired')

        # Determine previous_amount: last approved pending bid, else last actual Bid
        last_approved = AgentPendingBid.objects.filter(
            agent=agent, auction=auction, status='approved'
        ).order_by('-created_at').first()
        if last_approved:
            previous_amount = last_approved.proposed_amount
        else:
            previous_bid = Bid.objects.filter(auction=auction, bidder=agent.user).order_by('-amount').first()
            previous_amount = previous_bid.amount if previous_bid else Decimal('0.00')

        delta = counter_amount - previous_amount

        notification = Notification.objects.create(
            user=agent.user,
            title="⚡ تجاوز مزايدتك أحد المزايدين!",
            message=(
                f"تجاوز أحدهم مزايدتك على \"{product.title}\"\n"
                f"الوكيل يقترح المزايدة بـ {counter_amount} ج.م\n"
                f"فرق {delta} ج.م فقط — انتظر موافقتك."
            ),
            related_product=product,
        )

        AgentPendingBid.objects.create(
            agent=agent,
            auction=auction,
            proposed_amount=counter_amount,
            previous_amount=previous_amount,
            status='pending',
            ai_reasoning=f"Counter-bid after being outbid. Delta: {delta} EGP",
            notification=notification,
            is_counter_bid=True,
            round_number=round_number,
        )
        logger.info(
            f"[Agent] 🤖 Pending counter-bid created for {agent.user.username}: "
            f"{counter_amount} (delta {delta}) on '{product.title}'"
        )


# ──────────────────────────────────────────────────────────────


class ProductCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating products"""
    images = ProductImageSerializer(many=True, read_only=True)
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(max_length=1000000, allow_empty_file=False),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Product
        fields = [
            'id', 'title', 'description', 'price', 'category', 'condition', 
            'status', 'location', 'phone_number', 'is_auction',
            'auction_end_time', 'images', 'uploaded_images',
            'created_at', 'updated_at', 'detected_item'
        ]
        read_only_fields = ['id', 'status', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        try:
            uploaded_images = validated_data.pop('uploaded_images', [])
            
            # ── Server-side override: Force new products to pending
            validated_data['status'] = 'pending'
            
            product = Product.objects.create(**validated_data)
            
            auction = None
            # Create Auction if is_auction and end_time provided
            # Auction starts NOW (at creation time)
            if product.is_auction and product.auction_end_time:
                # Server-side validation: reject end_time in the past
                now = timezone.now()
                if product.auction_end_time <= now:
                    product.delete()
                    raise serializers.ValidationError({
                        "auction_end_time": "وقت انتهاء المزاد يجب أن يكون في المستقبل"
                    })
                if product.auction_end_time < now + timezone.timedelta(minutes=5):
                    product.delete()
                    raise serializers.ValidationError({
                        "auction_end_time": "وقت انتهاء المزاد يجب أن يكون بعد 5 دقائق على الأقل"
                    })
                auction = Auction.objects.create(
                    product=product,
                    starting_bid=product.price,
                    current_bid=product.price,
                    start_time=now,
                    end_time=product.auction_end_time,
                    is_active=True
                )
            
            # Create product images
            for idx, image in enumerate(uploaded_images):
                ProductImage.objects.create(
                    product=product,
                    image=image,
                    is_primary=(idx == 0),
                    order=idx
                )
            
            # ── AI Agent Trigger (Async) ──────────────────────
            if auction:
                if product.detected_item:
                    logger.info(f"[Agent] 🤖 Product {product.id} already has detected_item '{product.detected_item}' from frontend. Triggering auto-bidding immediately...")
                    try:
                        from .tasks import run_auto_bidding_celery
                        run_auto_bidding_celery.delay(auction.id, product.detected_item)
                    except Exception:
                        run_auto_bidding_async(auction.id, product.detected_item)
                elif uploaded_images:
                    def run_ai_tasks():
                        try:
                            first_image = product.images.filter(is_primary=True).first()
                            if not first_image or not first_image.image:
                                return

                            try:
                                image_path = first_image.image.path
                            except NotImplementedError:
                                image_path = first_image.image.url
                                
                            from ai.classifier import classify_image, guess_item_from_text
                            logger.info(f"[Agent] 🤖 Starting background classification for product {product.id}...")
                            result = classify_image(image_path)
                            detected_item = result.get('detected_class')
                            
                            # Fallback: Guess from text if image classification fails
                            if not detected_item:
                                logger.info(f"[Agent] ⚠️ Image detection failed for {product.id}, trying text guess...")
                                detected_item = guess_item_from_text(product.title)

                            if detected_item:
                                product.detected_item = detected_item
                                product.save(update_fields=['detected_item'])
                                logger.info(f"[Agent] 🔍 Identified as '{detected_item}' — triggering agents...")
                                
                                # Trigger auto-bidding
                                try:
                                    from .tasks import run_auto_bidding_celery
                                    run_auto_bidding_celery.delay(auction.id, detected_item)
                                except Exception:
                                    run_auto_bidding_async(auction.id, detected_item)
                            else:
                                logger.warning(f"[Agent] ❌ Could not identify product {product.id} (image/text)")
                        except Exception as e:
                            logger.error(f"[Agent] Background AI error: {e}")
                        finally:
                            from django.db import connection
                            connection.close()

                    # Launch in thread so response is sent immediately
                    threading.Thread(target=run_ai_tasks, daemon=True).start()
            # ──────────────────────────────────────────────────
            
            return product
        except Exception as e:
            if 'product' in locals():
                product.delete()
            # Log error for server-side debugging
            logger.error(f"[ProductCreate] Server error: {e}", exc_info=True)
            # Return error to client
            raise serializers.ValidationError({"detail": f"Server Error: {str(e)}"})

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        # Update auction starting bid if there are no bids yet
        if instance.is_auction:
            auction = getattr(instance, 'auction', None)
            if auction and not auction.bids.exists():
                auction.starting_bid = instance.price
                auction.current_bid = instance.price
                auction.save(update_fields=['starting_bid', 'current_bid'])
        return instance

    def to_representation(self, instance):
        try:
            return super().to_representation(instance)
        except Exception as e:
            logger.error(f"[ProductCreate] Serialization error: {e}", exc_info=True)
            return {
                "id": instance.id, 
                "title": instance.title, 
                "warning": "Product created but failed to serialize response",
                "error": str(e)
            }


class RegisterSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    password = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True, min_length=8)
    city = serializers.CharField(write_only=True)
    phone = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2', 'first_name', 'last_name', 'city', 'phone']
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Passwords don't match"})
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password2')
        city = validated_data.pop('city')
        phone = validated_data.pop('phone', '')
        
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )
        
        # Create user profile
        UserProfile.objects.create(user=user, city=city, phone=phone)
        
        return user


class MessageSerializer(serializers.ModelSerializer):
    """Serializer for individual chat messages"""
    sender_name = serializers.CharField(source='sender.username', read_only=True)
    sender_avatar = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ['id', 'conversation', 'sender', 'sender_name', 'sender_avatar', 'content', 'is_read', 'created_at']
        read_only_fields = ['id', 'sender', 'created_at']

    def get_sender_avatar(self, obj):
        try:
            if obj.sender.profile.avatar:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(obj.sender.profile.avatar.url)
        except UserProfile.DoesNotExist:
            pass
        return None


class ConversationListSerializer(serializers.ModelSerializer):
    """Lightweight conversation serializer for list views"""
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    other_participant = serializers.SerializerMethodField()
    product_title = serializers.CharField(source='product.title', read_only=True)
    product_image = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            'id', 'product', 'product_title', 'product_image',
            'other_participant', 'last_message', 'unread_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_last_message(self, obj):
        last_msg = obj.messages.order_by('-created_at').first()
        if last_msg:
            return {
                'content': last_msg.content[:100],
                'sender_name': last_msg.sender.username,
                'created_at': last_msg.created_at.isoformat(),
                'is_read': last_msg.is_read,
            }
        return None

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and request.user:
            return obj.messages.filter(is_read=False).exclude(sender=request.user).count()
        return 0

    def get_other_participant(self, obj):
        request = self.context.get('request')
        if request and request.user:
            other_user = obj.seller if request.user == obj.buyer else obj.buyer
            avatar_url = None
            try:
                if other_user.profile.avatar:
                    avatar_url = request.build_absolute_uri(other_user.profile.avatar.url)
            except UserProfile.DoesNotExist:
                pass
            return {
                'id': other_user.id,
                'username': other_user.username,
                'avatar': avatar_url,
            }
        return None

    def get_product_image(self, obj):
        primary_img = obj.product.images.filter(is_primary=True).first()
        if primary_img:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(primary_img.image.url)
        return None


class ConversationDetailSerializer(serializers.ModelSerializer):
    """Full conversation serializer with all messages"""
    messages = MessageSerializer(many=True, read_only=True)
    buyer = UserSerializer(read_only=True)
    seller = UserSerializer(read_only=True)
    product_title = serializers.CharField(source='product.title', read_only=True)
    product_image = serializers.SerializerMethodField()
    other_participant = serializers.SerializerMethodField()


    class Meta:
        model = Conversation
        fields = [
            'id', 'product', 'product_title', 'product_image',
            'buyer', 'seller', 'other_participant', 'messages', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_other_participant(self, obj):
        request = self.context.get('request')
        if request and request.user:
            other_user = obj.seller if request.user == obj.buyer else obj.buyer
            # Handle case where user is neither buyer nor seller (e.g. admin)
            if not other_user:
                return None
                
            avatar_url = None
            try:
                if hasattr(other_user, 'profile') and other_user.profile.avatar:
                    avatar_url = request.build_absolute_uri(other_user.profile.avatar.url)
            except Exception:
                pass
            return {
                'id': other_user.id,
                'username': other_user.username,
                'avatar': avatar_url,
            }
        return None

    def get_product_image(self, obj):
        primary_img = obj.product.images.filter(is_primary=True).first()
        if primary_img:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(primary_img.image.url)
        return None


class UserAgentSerializer(serializers.ModelSerializer):
    """Serializer for AI Auto-Bidder agent configuration"""
    user_name = serializers.CharField(source='user.username', read_only=True)
    target_label = serializers.SerializerMethodField()

    class Meta:
        model = UserAgent
        fields = [
            'id', 'user', 'user_name', 'target_item', 'target_label',
            'max_budget', 'requirements_prompt', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'user_name', 'created_at', 'updated_at']

    def get_target_label(self, obj):
        """Return the human-readable Arabic label for the target item."""
        from ai.classifier import YOLO_CLASS_LABELS, CATEGORY_MAP
        item_label = YOLO_CLASS_LABELS.get(obj.target_item, obj.target_item)
        category_label = CATEGORY_MAP.get(obj.target_item, '')
        if category_label:
            return f"{item_label} ({category_label})"
        return item_label


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for user notifications"""
    product_title = serializers.CharField(source='related_product.title', read_only=True, allow_null=True)

    class Meta:
        model = Notification
        fields = ['id', 'title', 'message', 'reasoning', 'is_read', 'related_product', 'product_title', 'created_at']
        read_only_fields = ['id', 'title', 'message', 'reasoning', 'related_product', 'created_at']


class AgentPendingBidSerializer(serializers.ModelSerializer):
    """Serializer for AgentPendingBid — includes auction/product context for the Flutter UI."""
    from decimal import Decimal as _Decimal

    auction_id = serializers.IntegerField(source='auction.id', read_only=True)
    product_title = serializers.CharField(source='auction.product.title', read_only=True)
    product_image = serializers.SerializerMethodField()
    current_bid = serializers.DecimalField(
        source='auction.current_bid', max_digits=10, decimal_places=2, read_only=True
    )
    auction_end_time = serializers.DateTimeField(source='auction.end_time', read_only=True)
    auction_is_active = serializers.BooleanField(source='auction.is_active', read_only=True)
    agent_id = serializers.IntegerField(source='agent.id', read_only=True)
    agent_target = serializers.CharField(source='agent.target_item', read_only=True)
    delta_amount = serializers.SerializerMethodField()

    class Meta:
        model = AgentPendingBid
        fields = [
            'id', 'agent_id', 'agent_target',
            'auction_id', 'product_title', 'product_image',
            'current_bid', 'auction_end_time', 'auction_is_active',
            'proposed_amount', 'previous_amount', 'delta_amount',
            'status', 'ai_reasoning', 'is_counter_bid', 'round_number',
            'created_at',
        ]
        read_only_fields = fields

    def get_product_image(self, obj):
        try:
            primary_img = obj.auction.product.images.filter(is_primary=True).first()
            if not primary_img:
                primary_img = obj.auction.product.images.first()
            if primary_img and primary_img.image:
                url = primary_img.image.url
                if url.startswith('http'):
                    return url
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(url)
                return url
        except Exception:
            pass
        return None

    def get_delta_amount(self, obj):
        """Amount the wallet will be charged on approval (proposed - previous)."""
        from decimal import Decimal
        delta = obj.proposed_amount - (obj.previous_amount or Decimal('0.00'))
        return str(max(delta, Decimal('0.00')))

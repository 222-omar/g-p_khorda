from rest_framework import serializers
from django.contrib.auth.models import User
from django.utils import timezone
from .models import UserProfile, Product, ProductImage, Auction, Bid, Conversation, Message, UserAgent, Notification

import logging
logger = logging.getLogger(__name__)


class UserSerializer(serializers.ModelSerializer):
    """User serializer for authentication responses"""
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        read_only_fields = ['id']


class UserProfileSerializer(serializers.ModelSerializer):
    """User profile serializer"""
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = UserProfile
        fields = [
            'id', 'user', 'phone', 'city', 'trust_score', 
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
    """Auction serializer with bidding history"""
    bids = BidSerializer(many=True, read_only=True)
    highest_bidder_name = serializers.CharField(source='highest_bidder.username', read_only=True, allow_null=True)
    total_bids = serializers.SerializerMethodField()
    product_title = serializers.CharField(source='product.title', read_only=True)
    product_image = serializers.SerializerMethodField()
    
    class Meta:
        model = Auction
        fields = [
            'id', 'product', 'product_title', 'product_image',
            'starting_bid', 'current_bid', 'highest_bidder', 
            'highest_bidder_name', 'start_time', 'end_time', 
            'is_active', 'total_bids', 'bids'
        ]
        read_only_fields = ['id', 'current_bid', 'highest_bidder']

    def get_total_bids(self, obj):
        return obj.bids.count()

    def get_product_image(self, obj):
        primary_img = obj.product.images.filter(is_primary=True).first()
        if primary_img:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(primary_img.image.url)
        return None


class ProductListSerializer(serializers.ModelSerializer):
    """Lightweight product serializer for list views"""
    owner_name = serializers.CharField(source='owner.username', read_only=True)
    owner_id = serializers.IntegerField(source='owner.id', read_only=True)
    primary_image = serializers.SerializerMethodField()
    is_auction = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Product
        fields = [
            'id', 'title', 'price', 'category', 'condition', 'status',
            'location', 'phone_number', 'is_auction',
            'auction_end_time', 'primary_image', 'owner_name', 'owner_id', 'views_count', 'created_at'
        ]
        read_only_fields = ['id', 'owner_name', 'owner_id', 'views_count', 'created_at']
    
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
    auction = AuctionSerializer(read_only=True)
    
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
    2. Filter out the seller's own agents and agents with budget < starting_bid.
    3. If one agent: place a bid at the starting_bid.
    4. If multiple agents: simulate a bidding war.
       - Sort agents by max_budget descending.
       - Winner pays: min(winner_budget, second_highest_budget + increment).
    5. Create Bid records, update the Auction, and notify winners.
    """
    from decimal import Decimal
    
    BID_INCREMENT = Decimal('50.00')  # Each incremental outbid step
    
    seller = auction.product.owner
    starting_bid = auction.starting_bid
    
    # Find matching active agents (exclude seller and the current leader)
    # They must have budget >= (current_bid + increment) to outbid the leader.
    min_required_budget = auction.current_bid + BID_INCREMENT
    if auction.highest_bidder is None:
        min_required_budget = starting_bid

    potential_agents = list(
        UserAgent.objects.filter(
            target_item=detected_item,
            is_active=True,
            max_budget__gte=min_required_budget
        ).exclude(user=seller)
         .exclude(user=auction.highest_bidder) # Don't bid against yourself
         .select_related('user')
    )
    
    # Filter out agents already notified about this product (bid or rejection)
    # This prevents duplicate LLM calls and notifications on every loop cycle
    already_notified_user_ids = set(
        Notification.objects.filter(
            related_product=auction.product,
            user__in=[a.user for a in potential_agents]
        ).values_list('user_id', flat=True)
    )
    potential_agents = [a for a in potential_agents if a.user_id not in already_notified_user_ids]
    
    if not potential_agents:
        return
    
    # --- LLM Evaluation Step ---
    from ai.agent_graph import smart_agent_evaluator
    matching_agents = []
    product = auction.product
    
    for agent in potential_agents:
        if agent.requirements_prompt.strip():
            logger.info(f"[AgentGraph] Evaluating agent {agent.user.username} requirements...")
            eval_result = smart_agent_evaluator.invoke({
                "product_title": product.title,
                "product_desc": product.description,
                "product_condition": product.condition,
                "product_price": str(product.price),
                "agent_requirements": agent.requirements_prompt,
            })
            
            reason = eval_result.get("reason", "") if isinstance(eval_result, dict) else getattr(eval_result, 'reason', '')
            is_match = eval_result.get("is_match", False) if isinstance(eval_result, dict) else getattr(eval_result, 'is_match', False)

            if is_match:
                logger.info(f"[AgentGraph] MATCH: {reason}")
                # Store reasoning on the agent object temporarily for notification
                agent._ai_reasoning = reason
                matching_agents.append(agent)
            else:
                logger.info(f"[AgentGraph] REJECT: {reason}")
                # Send a rejection notification so the user knows why it didn't bid
                _notify_agent_rejection(agent, product, reason)
        else:
            # No specific requirements, automatically match
            agent._ai_reasoning = "طابق الفئة المطلوبة (تلقائي)"
            matching_agents.append(agent)
            
    # Sort agents by budget for the bidding war logic
    matching_agents.sort(key=lambda a: a.max_budget, reverse=True)
    # ---------------------------

    if not matching_agents:
        logger.info(f"[Agent] No matching agents for '{detected_item}'")
        return
    
    logger.info(f"[Agent] 🤖 Found {len(matching_agents)} true matching agent(s) for '{detected_item}'")
    
    if len(matching_agents) == 1:
        # Single agent — place bid at starting price
        agent = matching_agents[0]
        bid_amount = starting_bid
        
        bid = Bid.objects.create(
            auction=auction,
            bidder=agent.user,
            amount=bid_amount
        )
        auction.current_bid = bid_amount
        auction.highest_bidder = agent.user
        auction.save(update_fields=['current_bid', 'highest_bidder'])
        
        _notify_agent_bid(agent, auction, bid_amount, detected_item)
        logger.info(f"[Agent] ✅ Single agent {agent.user.username} bid {bid_amount}")
    
    else:
        # Multiple agents — simulate bidding war
        # Agents are sorted by max_budget DESC
        winner = matching_agents[0]
        runner_up = matching_agents[1]
        
        # Winner pays just enough to beat the runner-up
        winning_bid = min(
            winner.max_budget,
            runner_up.max_budget + BID_INCREMENT
        )
        
        # Create bid records for the runner-up first, then the winner
        # This shows the bidding war history
        runner_up_bid_amount = runner_up.max_budget
        Bid.objects.create(
            auction=auction,
            bidder=runner_up.user,
            amount=runner_up_bid_amount
        )
        _notify_agent_bid(runner_up, auction, runner_up_bid_amount, detected_item, outbid=True)
        
        bid = Bid.objects.create(
            auction=auction,
            bidder=winner.user,
            amount=winning_bid
        )
        
        # Update auction state
        auction.current_bid = winning_bid
        auction.highest_bidder = winner.user
        auction.save(update_fields=['current_bid', 'highest_bidder'])
        
        _notify_agent_bid(winner, auction, winning_bid, detected_item)
        
        logger.info(
            f"[Agent] ✅ Bidding war: {winner.user.username} wins at {winning_bid} "
            f"(beat {runner_up.user.username} at {runner_up_bid_amount})"
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


def agent_counter_bid_async(auction_id, manual_bidder_id):
    """Wrapper to run agent counter-bidding in a background thread."""
    from .models import Auction
    from django.contrib.auth.models import User
    try:
        auction = Auction.objects.get(id=auction_id)
        manual_bidder = User.objects.get(id=manual_bidder_id)
        agent_counter_bid(auction, manual_bidder)
    except Exception as e:
        logger.error(f"[Agent] Async counter-bid error: {e}")
    finally:
        connection.close()

def agent_counter_bid(auction, manual_bidder):
    """
    Called AFTER a manual bid is placed.
    Find active agents targeting this product's detected item and
    auto-counter-bid by BID_INCREMENT, as long as max_budget allows.
    """
    product = auction.product
    detected_item = product.detected_item

    if not detected_item:
        return  # Product was never classified by YOLO

    # Find active agents for this item, excluding the manual bidder and the seller
    potential_agents = list(
        UserAgent.objects
        .filter(target_item=detected_item, is_active=True)
        .exclude(user=manual_bidder)
        .exclude(user=product.owner)
        .select_related('user')
    )

    # --- LLM Evaluation Step ---
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
            })
            if eval_result.get("is_match"):
                matching_agents.append(agent)
        else:
            matching_agents.append(agent)
    # ---------------------------

    for agent in matching_agents:
        counter_amount = auction.current_bid + BID_INCREMENT

        if counter_amount > agent.max_budget:
            logger.info(
                f"[Agent] ⛔ {agent.user.username}'s agent can't counter-bid "
                f"({counter_amount} > budget {agent.max_budget})"
            )
            _notify_agent_bid(agent, auction, auction.current_bid, detected_item, outbid=True)
            continue

        # Place the counter-bid
        Bid.objects.create(
            auction=auction,
            bidder=agent.user,
            amount=counter_amount
        )
        auction.current_bid = counter_amount
        auction.highest_bidder = agent.user
        auction.save(update_fields=['current_bid', 'highest_bidder'])

        logger.info(
            f"[Agent] 🤖 {agent.user.username}'s agent counter-bid "
            f"{counter_amount} on '{product.title}'"
        )
        _notify_agent_bid(agent, auction, counter_amount, detected_item)


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
            'location', 'phone_number', 'is_auction',
            'auction_end_time', 'images', 'uploaded_images'
        ]
        read_only_fields = ['id']
    
    def create(self, validated_data):
        try:
            uploaded_images = validated_data.pop('uploaded_images', [])
            product = Product.objects.create(**validated_data)
            
            auction = None
            # Create Auction if is_auction and end_time provided
            # Auction starts NOW (at creation time)
            if product.is_auction and product.auction_end_time:
                auction = Auction.objects.create(
                    product=product,
                    starting_bid=product.price,
                    current_bid=product.price,
                    start_time=timezone.now(),
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
            
            # ── AI Agent Trigger ──────────────────────────────
            # If this is an auction, run YOLO on the first image
            # and trigger auto-bidding for matching agents.
            if auction and uploaded_images:
                try:
                    first_image = product.images.filter(is_primary=True).first()
                    if first_image and first_image.image:
                        try:
                            # Local storage uses path
                            image_path = first_image.image.path
                        except NotImplementedError:
                            # Cloud storage (Cloudinary) uses url
                            image_path = first_image.image.url
                            
                        from ai.classifier import classify_image
                        result = classify_image(image_path)
                        detected_item = result.get('detected_class')
                        if detected_item:
                            # Store on Product for counter-bid lookup
                            product.detected_item = detected_item
                            product.save(update_fields=['detected_item'])
                            logger.info(f"[Agent] 🔍 Detected '{detected_item}' — checking agents...")
                            # Start background thread for AI evaluation and bidding
                            threading.Thread(
                                target=run_auto_bidding_async,
                                args=(auction.id, detected_item),
                                daemon=True
                            ).start()
                            logger.info(f"[Agent] 🚀 Started background agent thread for '{detected_item}'")
                except Exception as e:
                    # Agent failure should NOT block product creation
                    logger.error(f"[Agent] Auto-bidding error (non-blocking): {e}")
                    import traceback
                    traceback.print_exc()
            # ──────────────────────────────────────────────────
            
            return product
        except Exception as e:
            if 'product' in locals():
                product.delete()
            # Log error for server-side debugging
            import traceback
            traceback.print_exc()
            # Return error to client
            raise serializers.ValidationError({"detail": f"Server Error: {str(e)}"})

    def to_representation(self, instance):
        try:
            return super().to_representation(instance)
        except Exception as e:
            import traceback
            traceback.print_exc()
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

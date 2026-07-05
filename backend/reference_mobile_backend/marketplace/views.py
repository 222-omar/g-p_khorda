from rest_framework import viewsets, status, filters
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAuthenticatedOrReadOnly, BasePermission, SAFE_METHODS
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import models
from django_filters.rest_framework import DjangoFilterBackend
from decimal import Decimal
import random
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Product, ProductImage, Auction, Bid, UserProfile, Conversation, Message, Wishlist, UserAgent, Notification, AgentPendingBid
from .serializers import (
    ProductListSerializer, ProductDetailSerializer, ProductCreateSerializer,
    AuctionSerializer, BidSerializer, UserProfileSerializer, UserSerializer,
    RegisterSerializer, ConversationListSerializer, ConversationDetailSerializer,
    MessageSerializer, UserAgentSerializer, NotificationSerializer,
    AgentPendingBidSerializer
)
import logging
logger = logging.getLogger(__name__)
def close_expired_auctions():
    """Auto-close expired auctions and notify winners"""
    expired = Auction.objects.filter(is_active=True, end_time__lte=timezone.now())
    for auction in expired:
        auction.is_active = False
        auction.save(update_fields=['is_active'])
        # Mark the product as sold
        auction.product.status = 'sold'
        auction.product.save(update_fields=['status'])
        # Send auto-message to winner
        if auction.highest_bidder:
            send_winner_message(auction)


def send_winner_message(auction):
    """Send a congratulations message to the auction winner from the seller via the chat system"""
    try:
        conversation, _ = Conversation.objects.get_or_create(
            product=auction.product,
            buyer=auction.highest_bidder,
            defaults={'seller': auction.product.owner}
        )
        Message.objects.create(
            conversation=conversation,
            sender=auction.product.owner,
            content=f'🎉 ألف مبروك! لقد فزت بالمزاد على "{auction.product.title}". تم خصم مبلغ {auction.current_bid} جنيه من محفظتك. خلينا نتفق على ميعاد ومكان المقابلة لإتمام الاستلام.'
        )
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"[Auction] Failed to send winner message: {e}", exc_info=True)

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        # Determine if the input is email or username
        login_input = attrs.get('username')
        password = attrs.get('password')

        if login_input and password:
            # Check if input is email
            if '@' in login_input:
                try:
                    user = User.objects.get(email=login_input)
                    attrs['username'] = user.username
                except User.DoesNotExist:
                    # If email doesn't exist, let it fail naturally or handle error
                    pass
        
        try:
            result = super().validate(attrs)
            # Include admin status in login response
            has_profile = hasattr(self.user, 'profile')
            result['is_admin'] = has_profile and self.user.profile.role == 'admin'
            print(f"[Backend Auth] Login successful for user: {attrs.get('username')} (is_admin={result['is_admin']})")
            return result
        except Exception as e:
            raise e

from .throttles import LoginRateThrottle, RegisterRateThrottle

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [LoginRateThrottle]

@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([RegisterRateThrottle])
def register_view(request):
    """User registration endpoint"""
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user_view(request):
    """Get current authenticated user with profile"""
    try:
        profile = request.user.profile
    except UserProfile.DoesNotExist:
        # Auto-create profile for users that don't have one (e.g. old superusers)
        role = 'admin' if (request.user.is_superuser or request.user.is_staff) else 'user'
        profile = UserProfile.objects.create(
            user=request.user,
            role=role,
            city='',
        )
    
    serializer = UserProfileSerializer(profile, context={'request': request})
    data = serializer.data
    data['is_admin'] = profile.role == 'admin'
    return Response(data)

class IsOwnerOrReadOnly(BasePermission):
    """
    Object-level permission to only allow owners of an object to edit or delete it.
    """
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return obj.owner == request.user


class ProductViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Product CRUD operations
    List, Create, Retrieve, Update, Delete products
    """
    queryset = Product.objects.select_related('owner', 'owner__profile').prefetch_related('images', 'auction')
    permission_classes = [IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'condition', 'status', 'is_auction', 'detected_item']
    search_fields = ['title']
    ordering_fields = ['created_at', 'price', 'views_count']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ProductListSerializer
        elif self.action == 'create' or self.action == 'update' or self.action == 'partial_update':
            return ProductCreateSerializer
        return ProductDetailSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by price range
        min_price = self.request.query_params.get('min_price')
        max_price = self.request.query_params.get('max_price')
        
        if min_price:
            queryset = queryset.filter(price__gte=min_price)
        if max_price:
            queryset = queryset.filter(price__lte=max_price)
        
        # On list view, default to non-auction products unless specified
        if self.action == 'list':
            if self.request.query_params.get('auctions_only') == 'true':
                queryset = queryset.filter(is_auction=True, auction__is_active=True)
            elif self.request.query_params.get('is_auction') is None:
                queryset = queryset.filter(is_auction=False)
        
        return queryset
    
    def retrieve(self, request, *args, **kwargs):
        """Increment views count on product detail view (atomic)"""
        instance = self.get_object()
        Product.objects.filter(pk=instance.pk).update(
            views_count=models.F('views_count') + 1
        )
        instance.refresh_from_db(fields=['views_count'])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Check if they are trying to toggle is_auction status
        if 'is_auction' in request.data:
            val = request.data['is_auction']
            is_auction_bool = str(val).lower() == 'true' if not isinstance(val, bool) else val
            if is_auction_bool != instance.is_auction:
                return Response(
                    {"detail": "لا يمكن تغيير نوع الإعلان (مزاد/متجر) بعد النشر."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Check for auction end time edit if there are bids
        if instance.is_auction and 'auction_end_time' in request.data:
            has_bids = hasattr(instance, 'auction') and instance.auction.bids.exists()
            if has_bids:
                from django.utils.dateparse import parse_datetime
                new_time = parse_datetime(request.data['auction_end_time'])
                if new_time and instance.auction_end_time:
                    if timezone.is_naive(new_time):
                        new_time = timezone.make_aware(new_time)
                    if new_time != instance.auction_end_time:
                        return Response(
                            {"detail": "لا يمكن تعديل وقت انتهاء المزاد بعد بدء المزايدة وبدء تلقي العروض."},
                            status=status.HTTP_400_BAD_REQUEST
                        )

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def perform_create(self, serializer):
        """Set owner to current user when creating product"""
        serializer.save(owner=self.request.user)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_listings(self, request):
        """Get current user's products"""
        products = self.queryset.filter(owner=request.user)
        serializer = ProductListSerializer(products, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def purchase(self, request, pk=None):
        """Purchase a product, transferring wallet balance"""
        from django.db import transaction
        with transaction.atomic():
            # Lock the product row
            product = Product.objects.select_for_update().get(pk=pk)
            
            if product.status != 'active':
                return Response({'error': 'المنتج غير متاح للبيع حالياً'}, status=status.HTTP_400_BAD_REQUEST)
                
            if product.owner == request.user:
                return Response({'error': 'لا يمكنك شراء منتجك الخاص'}, status=status.HTTP_400_BAD_REQUEST)
                
            buyer_profile = request.user.profile
            seller_profile = product.owner.profile
            
            if buyer_profile.wallet_balance < product.price:
                return Response({'error': 'رصيد المحفظة غير كافٍ لإتمام عملية الشراء'}, status=status.HTTP_400_BAD_REQUEST)
                
            # Transfer funds
            buyer_profile.wallet_balance -= product.price
            buyer_profile.save()
            
            seller_profile.wallet_balance += product.price
            seller_profile.total_sales += 1
            seller_profile.save()
            
            # Mark product as sold
            product.status = 'sold'
            product.save(update_fields=['status'])
            
            # Notify seller
            try:
                Notification.objects.create(
                    user=product.owner,
                    title='تم بيع منتجك!',
                    message=f'لقد تم شراء منتج "{product.title}" وتمت إضافة {product.price} إلى محفظتك.',
                    related_product=product
                )
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"Failed to create purchase notification: {e}")
            
            return Response({'status': 'success', 'message': 'تم الشراء بنجاح'}, status=status.HTTP_200_OK)


class AuctionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing auctions"""
    queryset = Auction.objects.select_related(
        'product', 'product__owner', 'highest_bidder'
    ).prefetch_related('bids', 'product__images')
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            from .serializers import AuctionDetailSerializer
            return AuctionDetailSerializer
        return AuctionSerializer

    def get_queryset(self):
        from django.db.models import Count

        # Simple, reliable queryset
        queryset = Auction.objects.select_related(
            'product', 'product__owner', 'highest_bidder'
        ).prefetch_related(
            'product__images'
        ).annotate(
            annotated_total_bids=Count('bids', distinct=True)
        )

        return queryset.order_by('-is_active', '-end_time')

    from django.utils.decorators import method_decorator
    from django.views.decorators.cache import cache_page

    @method_decorator(cache_page(60), name='dispatch')
    def list(self, request, *args, **kwargs):
        """Cached list of auctions for 60 seconds to beat network latency"""
        return super().list(request, *args, **kwargs)

    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def place_bid(self, request, pk=None):
        """Place a bid on an auction (atomic + row-level lock)"""
        from django.db import transaction

        with transaction.atomic():
            # Lock the auction row — no other bid can read it until we commit
            auction = Auction.objects.select_for_update().get(pk=pk)

            # Validation
            if not auction.is_active:
                return Response({'error': 'المزاد غير نشط'}, status=status.HTTP_400_BAD_REQUEST)
            
            if auction.end_time < timezone.now():
                # Auto-close this auction
                auction.is_active = False
                auction.save(update_fields=['is_active'])
                auction.product.status = 'sold'
                auction.product.save(update_fields=['status'])
                if auction.highest_bidder:
                    send_winner_message(auction)
                return Response({'error': 'المزاد انتهى'}, status=status.HTTP_400_BAD_REQUEST)
            
            if auction.product.owner == request.user:
                return Response({'error': 'لا يمكنك المزايدة على مزادك الخاص'}, status=status.HTTP_400_BAD_REQUEST)
            
            amount = Decimal(str(request.data.get('amount', 0)))
            
            if amount <= auction.current_bid:
                return Response({
                    'error': f'يجب أن تكون المزايدة أعلى من السعر الحالي ({auction.current_bid} جنيه)'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Create bid
            bid = Bid.objects.create(
                auction=auction,
                bidder=request.user,
                amount=amount
            )
            
            # Update auction
            auction.current_bid = amount
            auction.highest_bidder = request.user
            auction.save(update_fields=['current_bid', 'highest_bidder'])
        
        # Agent counter-bid runs OUTSIDE the transaction to avoid long locks
        try:
            from .tasks import agent_counter_bid_celery
            agent_counter_bid_celery.delay(auction.id, request.user.id)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"[Agent] Celery counter-bid failed, using Thread: {e}")
            import threading
            from .serializers import agent_counter_bid_async
            threading.Thread(
                target=agent_counter_bid_async,
                args=(auction.id, request.user.id),
                daemon=True
            ).start()
        
        return Response(BidSerializer(bid).data, status=status.HTTP_201_CREATED)


class UserProfileViewSet(viewsets.ModelViewSet):
    """ViewSet for user profiles"""
    queryset = UserProfile.objects.select_related('user')
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        # Only allow users to edit their own profile
        if self.action in ['update', 'partial_update', 'destroy']:
            return self.queryset.filter(user=self.request.user)
        return self.queryset
    
    @action(detail=False, methods=['get', 'patch'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """Get or update current user's profile"""
        profile = get_object_or_404(UserProfile, user=request.user)
        
        if request.method == 'PATCH':
            user = request.user
            # Update User model fields (first_name, last_name)
            if 'first_name' in request.data:
                user.first_name = request.data['first_name']
            if 'last_name' in request.data:
                user.last_name = request.data['last_name']
            user.save()
            
            # Update Profile model fields (avatar, phone, city)
            profile_fields = {}
            if 'phone' in request.data:
                profile_fields['phone'] = request.data['phone']
            if 'city' in request.data:
                profile_fields['city'] = request.data['city']
            if profile_fields:
                for key, val in profile_fields.items():
                    setattr(profile, key, val)
                profile.save()
            
            # Handle avatar file upload
            if 'avatar' in request.FILES:
                profile.avatar = request.FILES['avatar']
                profile.save(update_fields=['avatar'])
        
        serializer = self.get_serializer(profile)
        return Response(serializer.data)


class ConversationViewSet(viewsets.ModelViewSet):
    """ViewSet for chat conversations"""
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return ConversationListSerializer
        return ConversationDetailSerializer

    def get_queryset(self):
        return Conversation.objects.filter(
            models.Q(buyer=self.request.user) | models.Q(seller=self.request.user)
        ).select_related(
            'product', 'buyer', 'seller', 'buyer__profile', 'seller__profile'
        ).prefetch_related('messages', 'product__images')

    def retrieve(self, request, *args, **kwargs):
        """Get conversation and mark messages as read"""
        instance = self.get_object()
        # Mark all messages from the other user as read
        instance.messages.filter(is_read=False).exclude(sender=request.user).update(is_read=True)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def start_conversation(self, request):
        """Start a new conversation or return existing one for a product"""
        product_id = request.data.get('product_id')
        if not product_id:
            return Response({'error': 'product_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        product = get_object_or_404(Product, id=product_id)

        # Can't start a conversation with yourself
        if product.owner == request.user:
            return Response({'error': 'Cannot start a conversation with yourself'}, status=status.HTTP_400_BAD_REQUEST)

        # Get or create conversation
        conversation, created = Conversation.objects.get_or_create(
            product=product,
            buyer=request.user,
            defaults={'seller': product.owner}
        )

        serializer = ConversationDetailSerializer(conversation, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        """Send a message in a conversation"""
        conversation = self.get_object()

        # Verify user is a participant
        if request.user not in [conversation.buyer, conversation.seller]:
            return Response({'error': 'You are not a participant in this conversation'}, status=status.HTTP_403_FORBIDDEN)

        content = request.data.get('content', '').strip()
        if not content:
            return Response({'error': 'Message content is required'}, status=status.HTTP_400_BAD_REQUEST)

        message = Message.objects.create(
            conversation=conversation,
            sender=request.user,
            content=content
        )

        # Update conversation timestamp
        conversation.save()  # triggers auto_now on updated_at

        serializer = MessageSerializer(message, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get total unread message count for the current user"""
        count = Message.objects.filter(
            conversation__in=Conversation.objects.filter(
                models.Q(buyer=request.user) | models.Q(seller=request.user)
            ),
            is_read=False
        ).exclude(sender=request.user).count()
        return Response({'unread_count': count})

    @action(detail=True, methods=['delete'])
    def delete_conversation(self, request, pk=None):
        """Delete an entire conversation (only for participants)"""
        conversation = self.get_object()
        if request.user not in [conversation.buyer, conversation.seller]:
            return Response({'error': 'You are not a participant in this conversation'}, status=status.HTTP_403_FORBIDDEN)
        conversation.delete()
        return Response({'status': 'deleted'}, status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['delete'], url_path='delete_message/(?P<message_id>[0-9]+)')
    def delete_message(self, request, pk=None, message_id=None):
        """Delete a specific message (only the sender can delete)"""
        conversation = self.get_object()
        message = get_object_or_404(Message, id=message_id, conversation=conversation)
        if message.sender != request.user:
            return Response({'error': 'You can only delete your own messages'}, status=status.HTTP_403_FORBIDDEN)
        message.delete()
        return Response({'status': 'deleted'}, status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['patch'], url_path='edit_message/(?P<message_id>[0-9]+)')
    def edit_message(self, request, pk=None, message_id=None):
        """Edit a specific message (only the sender can edit)"""
        conversation = self.get_object()
        message = get_object_or_404(Message, id=message_id, conversation=conversation)
        if message.sender != request.user:
            return Response({'error': 'You can only edit your own messages'}, status=status.HTTP_403_FORBIDDEN)
        content = request.data.get('content', '').strip()
        if not content:
            return Response({'error': 'Message content is required'}, status=status.HTTP_400_BAD_REQUEST)
        message.content = content
        message.save()
        serializer = MessageSerializer(message, context={'request': request})
        return Response(serializer.data)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_general_stats(request):
    """
    Get general statistics for the landing page
    """
    total_users = User.objects.count()
    products_sold = Product.objects.filter(status='sold').count()
    scrap_count = Product.objects.filter(category='scrap').count()
    
    # Calculate active governorates/cities from profiles and products
    user_locations = UserProfile.objects.values_list('city', flat=True).distinct()
    product_locations = Product.objects.values_list('location', flat=True).distinct()
    
    # Combine and convert to set to get unique locations (case insensitive roughly)
    locations = set([loc.lower().strip() for loc in user_locations if loc])
    locations.update([loc.lower().strip() for loc in product_locations if loc])
    
    active_governorates = len(locations)
    
    # Missing fields for dashboard visualization
    active_auctions = Auction.objects.filter(is_active=True).count()
    pending_products = Product.objects.filter(status='pending').count()
    
    # Calculate weekly activity
    import datetime
    from django.utils import timezone
    today = timezone.now().date()
    weekly_activity = []
    for i in range(7):
        day = today - datetime.timedelta(days=6-i)
        count = Product.objects.filter(created_at__date=day).count()
        weekly_activity.append(count)
        
    # Calculate category distribution for sold products
    from django.db.models import Count
    category_sales = Product.objects.filter(status='sold').values('category').annotate(count=Count('id'))
    category_map = dict(Product.CATEGORY_CHOICES)
    category_distribution = []
    for item in category_sales:
        cat_key = item['category']
        cat_name = category_map.get(cat_key, cat_key)
        category_distribution.append({
            'name': cat_name,
            'count': item['count']
        })
        
    return Response({
        'total_users': total_users,
        'products_sold': products_sold,
        'scrap_count': scrap_count,
        'active_governorates': active_governorates,
        'active_auctions': active_auctions,
        'pending_products': pending_products,
        'weekly_activity': weekly_activity,
        'category_distribution': category_distribution
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def get_categories(request):
    """
    Get all available product categories based on Product model choices.
    """
    categories = [
        {'id': choice[0], 'name': choice[1]}
        for choice in Product.CATEGORY_CHOICES
    ]
    return Response(categories)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def wishlist_list(request):
    """Get user's wishlist products"""
    wishlist_items = Wishlist.objects.filter(user=request.user).select_related(
        'product', 'product__owner'
    ).prefetch_related('product__images')
    
    products_data = []
    for item in wishlist_items:
        product = item.product
        primary_image = product.images.filter(is_primary=True).first()
        if not primary_image:
            primary_image = product.images.first()
        
        products_data.append({
            'id': product.id,
            'title': product.title,
            'price': str(product.price),
            'category': product.category,
            'condition': product.condition,
            'status': product.status,
            'is_auction': product.is_auction,
            'primary_image': request.build_absolute_uri(primary_image.image.url) if primary_image else None,
            'owner_name': product.owner.username,
            'created_at': product.created_at.isoformat(),
            'wishlisted_at': item.created_at.isoformat(),
        })
    
    return Response(products_data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def wishlist_toggle(request, product_id):
    """Add or remove a product from wishlist"""
    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response({'error': 'المنتج غير موجود'}, status=status.HTTP_404_NOT_FOUND)
    
    wishlist_item, created = Wishlist.objects.get_or_create(
        user=request.user,
        product=product
    )
    
    if not created:
        wishlist_item.delete()
        return Response({'status': 'removed', 'is_wishlisted': False})
    
    return Response({'status': 'added', 'is_wishlisted': True}, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def wishlist_check(request, product_id):
    """Check if a product is in user's wishlist"""
    is_wishlisted = Wishlist.objects.filter(
        user=request.user,
        product_id=product_id
    ).exists()
    return Response({'is_wishlisted': is_wishlisted})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def wishlist_ids(request):
    """Get all wishlisted product IDs for current user"""
    ids = list(Wishlist.objects.filter(user=request.user).values_list('product_id', flat=True))
    return Response({'product_ids': ids})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def classify_image_view(request):
    """
    Accept an image file and return the predicted product category
    using the YOLO model.
    """
    image_file = request.FILES.get('image')
    if not image_file:
        return Response(
            {'error': 'No image file provided'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # ── File size check (max 5 MB) ─────────────────────────────
    MAX_UPLOAD_SIZE = 5 * 1024 * 1024  # 5 MB
    if image_file.size > MAX_UPLOAD_SIZE:
        return Response(
            {'error': 'Image too large. Maximum size is 5 MB.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # ── MIME type validation ───────────────────────────────────
    ALLOWED_CONTENT_TYPES = {'image/jpeg', 'image/png', 'image/webp', 'image/jpg'}
    content_type = image_file.content_type
    if content_type not in ALLOWED_CONTENT_TYPES:
        return Response(
            {'error': f'Invalid file type "{content_type}". Only JPEG, PNG, and WebP are allowed.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    import tempfile
    import os
    from ai.classifier import classify_image

    # Save to temp file for YOLO inference
    suffix = os.path.splitext(image_file.name)[1] or '.jpg'
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix, mode='wb') as tmp:
        for chunk in image_file.chunks():
            tmp.write(chunk)
        tmp_path = tmp.name

    try:
        result = classify_image(tmp_path)
        return Response(result)
    finally:
        os.unlink(tmp_path)


# ──────────────────────────────────────────────────────────────
# AI AGENT ENDPOINTS
# ──────────────────────────────────────────────────────────────

class UserAgentViewSet(viewsets.ModelViewSet):
    """
    CRUD ViewSet for AI Auto-Bidder agents.
    Users can create, view, update, and delete their own agents.
    """
    serializer_class = UserAgentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserAgent.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_agent_targets(request):
    """
    Return all available YOLO target items for the agent dropdown.
    Each item has: id, label (Arabic + category), label_ar, category.
    """
    from ai.classifier import get_available_targets
    targets = get_available_targets()
    return Response(targets)


# ──────────────────────────────────────────────────────────────
# NOTIFICATIONS ENDPOINTS
# ──────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notifications_list(request):
    """Get all notifications for current user"""
    notifications = Notification.objects.filter(user=request.user)[:50]
    serializer = NotificationSerializer(notifications, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def notifications_mark_read(request):
    """Mark notifications as read. Optionally takes notification_id."""
    notif_id = request.data.get('notification_id')
    if notif_id:
        Notification.objects.filter(user=request.user, id=notif_id).update(is_read=True)
    else:
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return Response({'status': 'ok'})


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def notifications_delete(request):
    """Delete notifications. Optionally takes notification_id."""
    notif_id = request.data.get('notification_id')
    if notif_id:
        Notification.objects.filter(user=request.user, id=notif_id).delete()
    else:
        Notification.objects.filter(user=request.user).delete()
    return Response({'status': 'ok'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notifications_unread_count(request):
    """Get unread notification count"""
    count = Notification.objects.filter(user=request.user, is_read=False).count()
    return Response({'unread_count': count})


# ──────────────────────────────────────────────────────────────
# HEALTH CHECK
# ──────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    GET /api/health/
    Returns system health for load balancers and monitoring.
    No authentication required.
    """
    from django.db import connection
    import time

    health = {
        'status': 'ok',
        'version': '1.0.0',
        'database': 'unknown',
    }

    # Check database connectivity
    try:
        start = time.time()
        connection.ensure_connection()
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        db_latency_ms = int((time.time() - start) * 1000)
        health['database'] = 'ok'
        health['db_latency_ms'] = db_latency_ms
    except Exception as e:
        health['status'] = 'degraded'
        health['database'] = f'error: {str(e)}'

    http_status = 200 if health['status'] == 'ok' else 503
    return Response(health, status=http_status)


@api_view(['POST'])
@permission_classes([AllowAny])
def visual_search_view(request):
    """
    Visual Search: Accept an uploaded image, generate its embedding,
    compare against all product images, and return the most similar products.
    """
    image_file = request.FILES.get('image')
    if not image_file:
        return Response({'error': 'يرجى إرفاق صورة للبحث'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        from ai.vision_service import get_image_embedding, cosine_similarity
        import logging
        logger = logging.getLogger(__name__)

        # Read the uploaded image bytes
        image_bytes = image_file.read()
        logger.info(f"[VisualSearch] Processing image: {image_file.name} ({len(image_bytes)} bytes)")

        # Get embedding for the uploaded image
        query_embedding = get_image_embedding(image_bytes)

        # Get all active products with images
        products = Product.objects.filter(status='active').select_related('owner').prefetch_related('images')
        
        results = []
        for product in products:
            # Check if we already have the embedding stored
            product_embedding = product.visual_embedding

            if not product_embedding:
                # If not stored, we skip it for now to avoid timeout
                # It will be populated by the background script
                continue

            # Pure visual similarity: Image Embedding vs Image Embedding
            score = cosine_similarity(query_embedding, product_embedding)
            similarity = round(score * 100, 1)
            
            results.append({
                'product': product,
                'similarity': similarity,
            })

        # Sort by similarity descending, take top 3
        results.sort(key=lambda x: x['similarity'], reverse=True)
        top_results = results[:3]

        # Serialize results
        serialized = []
        for r in top_results:
            p = r['product']
            primary_img = p.images.first()
            serialized.append({
                'id': p.id,
                'title': p.title,
                'price': str(p.price),
                'category': p.category,
                'condition': p.condition,
                'location': p.location,
                'owner_name': p.owner.username,
                'primary_image': primary_img.image.url if primary_img else None,
                'similarity': round(r['similarity'] * 100, 1),
                'is_auction': p.is_auction,
                'created_at': p.created_at.isoformat() if p.created_at else None,
            })

        return Response({
            'count': len(serialized),
            'results': serialized,
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({'error': f'حدث خطأ أثناء البحث: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ──────────────────────────────────────────────────────────────
# AGENT PENDING BIDS ENDPOINTS
# ──────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def agent_pending_bids_list(request):
    """
    GET /api/v1/agent-pending-bids/
    Return all pending (status='pending') AI proposed bids for the current user.
    """
    pending = AgentPendingBid.objects.filter(
        agent__user=request.user,
        status='pending',
    ).select_related(
        'agent', 'auction', 'auction__product', 'notification'
    ).prefetch_related('auction__product__images').order_by('-created_at')

    serializer = AgentPendingBidSerializer(pending, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def agent_pending_bid_approve(request, pk):
    """
    POST /api/v1/agent-pending-bids/{id}/approve/
    Approve a pending bid:
    - Validates auction is still active.
    - Validates proposed_amount > current_bid.
    - Deducts delta (proposed_amount - previous_amount) from wallet.
    - Creates Bid, updates Auction, refunds previous highest bidder.
    - Marks pending bid as 'approved'.
    """
    from django.db import transaction
    from decimal import Decimal

    try:
        pending_bid = AgentPendingBid.objects.select_related(
            'agent', 'agent__user', 'agent__user__profile',
            'auction', 'auction__product', 'auction__highest_bidder',
        ).get(pk=pk, agent__user=request.user, status='pending')
    except AgentPendingBid.DoesNotExist:
        return Response(
            {'error': 'المزايدة المعلقة غير موجودة أو تمت معالجتها مسبقاً'},
            status=status.HTTP_404_NOT_FOUND
        )

    with transaction.atomic():
        # Lock the auction row
        auction = Auction.objects.select_for_update().get(pk=pending_bid.auction_id)

        # Validate auction is still active
        if not auction.is_active:
            return Response({'error': 'المزاد غير نشط'}, status=status.HTTP_400_BAD_REQUEST)
        if auction.end_time < timezone.now():
            auction.is_active = False
            auction.save(update_fields=['is_active'])
            return Response({'error': 'انتهى وقت المزاد'}, status=status.HTTP_400_BAD_REQUEST)

        proposed_amount = pending_bid.proposed_amount
        previous_amount = pending_bid.previous_amount or Decimal('0.00')

        # Validate proposed_amount is still competitive
        if proposed_amount < auction.current_bid or (proposed_amount == auction.current_bid and auction.highest_bidder is not None):
            pending_bid.status = 'expired'
            pending_bid.save(update_fields=['status'])
            return Response(
                {'error': f'المبلغ المقترح ({proposed_amount}) لم يعد صالحاً لأن المزايدة الحالية ({auction.current_bid}). تم إلغاء الطلب.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        delta = proposed_amount - previous_amount
        if delta < Decimal('0.00'):
            delta = Decimal('0.00')

        # Check wallet
        agent_profile = pending_bid.agent.user.profile
        if agent_profile.wallet_balance < delta:
            return Response(
                {'error': f'رصيد المحفظة غير كافٍ. المطلوب: {delta} ج.م، المتاح: {agent_profile.wallet_balance} ج.م'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Refund previous highest bidder (if exists and is not the agent)
        previous_highest_bidder = auction.highest_bidder
        if previous_highest_bidder and previous_highest_bidder != pending_bid.agent.user:
            highest_bid_obj = Bid.objects.filter(
                auction=auction, bidder=previous_highest_bidder
            ).order_by('-amount').first()
            if highest_bid_obj:
                prev_profile = previous_highest_bidder.profile
                prev_profile.wallet_balance += highest_bid_obj.amount
                prev_profile.save(update_fields=['wallet_balance'])
                logger.info(
                    f"[PendingBid] Refunded {previous_highest_bidder.username} "
                    f"amount {highest_bid_obj.amount}"
                )

        # Deduct delta from wallet
        agent_profile.wallet_balance -= delta
        agent_profile.save(update_fields=['wallet_balance'])

        # Create the actual Bid
        bid = Bid.objects.create(
            auction=auction,
            bidder=pending_bid.agent.user,
            amount=proposed_amount,
        )

        # Update auction
        auction.current_bid = proposed_amount
        auction.highest_bidder = pending_bid.agent.user
        auction.save(update_fields=['current_bid', 'highest_bidder'])

        # Mark pending bid as approved
        pending_bid.status = 'approved'
        pending_bid.save(update_fields=['status'])

        # Success notification
        Notification.objects.create(
            user=pending_bid.agent.user,
            title='✅ تمت المزايدة بنجاح!',
            message=(
                f'تمت الموافقة على مزايدة الوكيل بمبلغ {proposed_amount} ج.م '
                f'على "{auction.product.title}". '
                f'تم خصم {delta} ج.م من محفظتك.'
            ),
            related_product=auction.product,
        )

        logger.info(
            f"[PendingBid] ✅ Approved bid {pending_bid.id} — "
            f"{pending_bid.agent.user.username} bid {proposed_amount} (delta {delta})"
        )

    return Response(
        {'status': 'approved', 'bid_id': bid.id, 'amount': str(proposed_amount), 'delta': str(delta)},
        status=status.HTTP_200_OK
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def agent_pending_bid_reject(request, pk):
    """
    POST /api/v1/agent-pending-bids/{id}/reject/
    Reject a pending bid — marks it as 'rejected', no wallet changes.
    """
    try:
        pending_bid = AgentPendingBid.objects.get(
            pk=pk, agent__user=request.user, status='pending'
        )
    except AgentPendingBid.DoesNotExist:
        return Response(
            {'error': 'المزايدة المعلقة غير موجودة أو تمت معالجتها مسبقاً'},
            status=status.HTTP_404_NOT_FOUND
        )

    pending_bid.status = 'rejected'
    pending_bid.save(update_fields=['status'])
    logger.info(f"[PendingBid] ❌ Rejected pending bid {pending_bid.id}")
    return Response({'status': 'rejected'}, status=status.HTTP_200_OK)

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAuthenticatedOrReadOnly
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

from .models import Product, ProductImage, Auction, Bid, UserProfile, Conversation, Message, Wishlist
from .serializers import (
    ProductListSerializer, ProductDetailSerializer, ProductCreateSerializer,
    AuctionSerializer, BidSerializer, UserProfileSerializer, UserSerializer,
    RegisterSerializer, ConversationListSerializer, ConversationDetailSerializer,
    MessageSerializer
)


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
    """Send a congratulations message to the auction winner via the chat system"""
    try:
        conversation, _ = Conversation.objects.get_or_create(
            product=auction.product,
            buyer=auction.highest_bidder,
            defaults={'seller': auction.product.owner}
        )
        Message.objects.create(
            conversation=conversation,
            sender=auction.product.owner,
            content=f'🎉 تهانينا! لقد فزت بالمزاد على "{auction.product.title}" بمبلغ {auction.current_bid} جنيه. تواصل مع البائع لإتمام عملية الشراء.'
        )
    except Exception as e:
        import traceback
        traceback.print_exc()

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
        
        return super().validate(attrs)

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

@api_view(['POST'])
@permission_classes([AllowAny])
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
        profile = UserProfileSerializer(request.user.profile, context={'request': request})
        return Response(profile.data)
    except UserProfile.DoesNotExist:
        return Response({'error': 'Profile not found'}, status=status.HTTP_404_NOT_FOUND)


class ProductViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Product CRUD operations
    List, Create, Retrieve, Update, Delete products
    """
    queryset = Product.objects.select_related('owner', 'owner__profile').prefetch_related('images', 'auction')
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'condition', 'status', 'is_auction']
    search_fields = ['title', 'description', 'location']
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
        """Increment views count on product detail view"""
        instance = self.get_object()
        instance.views_count += 1
        instance.save(update_fields=['views_count'])
        serializer = self.get_serializer(instance)
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


class AuctionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing auctions"""
    queryset = Auction.objects.select_related(
        'product', 'product__owner', 'highest_bidder'
    ).prefetch_related('bids', 'product__images')
    serializer_class = AuctionSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        # Auto-close expired auctions first
        close_expired_auctions()
        
        queryset = super().get_queryset()
        
        # Only filter active auctions if explicitly requested
        active_only = self.request.query_params.get('active_only', 'false')
        if active_only == 'true':
            queryset = queryset.filter(is_active=True, end_time__gt=timezone.now())
        
        return queryset.order_by('-is_active', '-end_time')
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def place_bid(self, request, pk=None):
        """Place a bid on an auction"""
        auction = self.get_object()
        
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
        auction.save()
        
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
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """Get current user's profile"""
        profile = get_object_or_404(UserProfile, user=request.user)
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
    
    return Response({
        'total_users': total_users,
        'products_sold': products_sold,
        'scrap_count': scrap_count,
        'active_governorates': active_governorates
    })


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


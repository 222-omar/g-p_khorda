from rest_framework import viewsets, status, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAuthenticatedOrReadOnly, IsAdminUser
from .permissions import IsAdminRole
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

from .models import Product, ProductImage, Auction, Bid, UserProfile, SellerRating, Conversation, Message, Wishlist, UserAgent, Notification, WalletTransaction
from .serializers import (
    ProductListSerializer, ProductDetailSerializer, ProductCreateSerializer,
    AuctionSerializer, BidSerializer, UserProfileSerializer, UserSerializer,
    RegisterSerializer, ConversationListSerializer, ConversationDetailSerializer,
    MessageSerializer, UserAgentSerializer, NotificationSerializer
)


def close_expired_auctions():
    """Auto-close expired auctions, refund losers, deduct winner, and notify."""
    expired = Auction.objects.filter(is_active=True, end_time__lte=timezone.now())
    for auction in expired:
        auction.is_active = False
        auction.save(update_fields=['is_active'])
        # Mark the product as sold
        auction.product.status = 'sold'
        auction.product.save(update_fields=['status'])

        # ── Wallet: Refund losers & deduct winner ──
        winner = auction.highest_bidder
        all_bids = auction.bids.select_related('bidder', 'bidder__profile').order_by('-amount')

        # Track which users we've already processed (only refund their LATEST held bid)
        processed_users = set()

        for bid in all_bids:
            bidder = bid.bidder
            if bidder.id in processed_users:
                continue
            processed_users.add(bidder.id)

            try:
                profile = bidder.profile
            except UserProfile.DoesNotExist:
                continue

            if winner and bidder.id == winner.id:
                # Winner: the hold stays (already deducted). Log a deduct transaction.
                WalletTransaction.objects.create(
                    user=bidder,
                    transaction_type='bid_deduct',
                    amount=bid.amount,
                    balance_after=profile.wallet_balance,
                    description=f'خصم فوز مزاد: "{auction.product.title}"',
                    related_auction=auction,
                )
                # Transfer funds to seller
                try:
                    seller_profile = auction.product.owner.profile
                    seller_profile.wallet_balance += bid.amount
                    seller_profile.total_sales = (seller_profile.total_sales or 0) + 1
                    seller_profile.save(update_fields=['wallet_balance', 'total_sales'])
                    WalletTransaction.objects.create(
                        user=auction.product.owner,
                        transaction_type='topup',
                        amount=bid.amount,
                        balance_after=seller_profile.wallet_balance,
                        description=f'بيع مزاد: "{auction.product.title}" - الفائز: {bidder.username}',
                        related_auction=auction,
                    )
                except UserProfile.DoesNotExist:
                    pass
            else:
                # Loser: refund the held bid amount
                profile.wallet_balance += bid.amount
                profile.save(update_fields=['wallet_balance'])
                WalletTransaction.objects.create(
                    user=bidder,
                    transaction_type='bid_refund',
                    amount=bid.amount,
                    balance_after=profile.wallet_balance,
                    description=f'استرداد مزايدة: "{auction.product.title}"',
                    related_auction=auction,
                )
        # ──────────────────────────────────────────

        # Send auto-message to winner
        if winner:
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
        print(f"\n[Backend Auth] Login attempt received")
        print(f"[Backend Auth] Request data keys: {list(attrs.keys())}")
        
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
                    print(f"[Backend Auth] Email {login_input} not found, falling back to username")
                    pass
                
        try:
            result = super().validate(attrs)
            # Include admin status in login response
            has_profile = hasattr(self.user, 'profile')
            result['is_admin'] = has_profile and self.user.profile.role == 'admin'
            print(f"[Backend Auth] Login successful for user: {attrs.get('username')} (is_admin={result['is_admin']})")
            return result
        except Exception as e:
            print(f"[Backend Auth] Login failed: {str(e)}")
            raise

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    """User registration endpoint"""
    print(f"\n[Backend Auth] Registration attempt received")
    print(f"[Backend Auth] Request data: {request.data}")
    
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        print(f"[Backend Auth] Registration successful for user: {user.username}")
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)
    
    print(f"[Backend Auth] Registration failed with errors: {serializer.errors}")
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


class ProductViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Product CRUD operations
    List, Create, Retrieve, Update, Delete products
    """
    queryset = Product.objects.select_related('owner', 'owner__profile').prefetch_related('images', 'auction')
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'condition', 'status', 'is_auction', 'owner']
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
    
    def perform_update(self, serializer):
        """Allow admin to update any product"""
        if self.request.user.is_staff or serializer.instance.owner == self.request.user:
            serializer.save()
        else:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You do not have permission to edit this product.')
    
    def perform_destroy(self, instance):
        """Allow admin to delete any product"""
        if self.request.user.is_staff or instance.owner == self.request.user:
            instance.delete()
        else:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You do not have permission to delete this product.')
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_listings(self, request):
        """Get current user's products"""
        products = self.queryset.filter(owner=request.user)
        serializer = ProductListSerializer(products, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def purchase(self, request, pk=None):
        """Purchase a non-auction product directly using wallet balance"""
        product = self.get_object()

        # Can't buy your own product
        if product.owner == request.user:
            return Response({'error': 'لا يمكنك شراء منتجك الخاص'}, status=status.HTTP_400_BAD_REQUEST)

        # Must be active and non-auction
        if product.status != 'active':
            return Response({'error': 'هذا المنتج غير متاح للشراء (مباع أو غير نشط)'}, status=status.HTTP_400_BAD_REQUEST)

        if product.is_auction:
            return Response({'error': 'هذا المنتج مطروح في مزاد، لا يمكن شراؤه مباشرة'}, status=status.HTTP_400_BAD_REQUEST)

        # Check buyer wallet
        try:
            buyer_profile = request.user.profile
        except UserProfile.DoesNotExist:
            return Response({'error': 'الملف الشخصي غير موجود'}, status=status.HTTP_400_BAD_REQUEST)

        price = product.price

        if buyer_profile.wallet_balance < price:
            return Response({
                'error': f'رصيدك غير كافي لشراء هذا المنتج. رصيدك: {buyer_profile.wallet_balance} جنيه، والسعر: {price} جنيه.',
                'insufficient_balance': True,
                'current_balance': float(buyer_profile.wallet_balance),
                'required': float(price),
            }, status=status.HTTP_400_BAD_REQUEST)

        # Deduct from buyer
        buyer_profile.wallet_balance -= price
        buyer_profile.save(update_fields=['wallet_balance'])
        WalletTransaction.objects.create(
            user=request.user,
            transaction_type='bid_deduct',
            amount=price,
            balance_after=buyer_profile.wallet_balance,
            description=f'شراء منتج: "{product.title}"',
        )

        # Add to seller
        try:
            seller_profile = product.owner.profile
            seller_profile.wallet_balance += price
            seller_profile.total_sales = (seller_profile.total_sales or 0) + 1
            seller_profile.save(update_fields=['wallet_balance', 'total_sales'])
            WalletTransaction.objects.create(
                user=product.owner,
                transaction_type='topup',
                amount=price,
                balance_after=seller_profile.wallet_balance,
                description=f'بيع منتج: "{product.title}" للمشتري {request.user.username}',
            )
        except UserProfile.DoesNotExist:
            pass

        # Mark product as sold
        product.status = 'sold'
        product.save(update_fields=['status'])

        # Send message to seller
        try:
            conversation, _ = Conversation.objects.get_or_create(
                product=product,
                buyer=request.user,
                defaults={'seller': product.owner}
            )
            Message.objects.create(
                conversation=conversation,
                sender=request.user,
                content=f'🎉 تم شراء المنتج "{product.title}" بمبلغ {price} جنيه. تواصل مع البائع لإتمام التسليم.'
            )
        except Exception:
            pass

        return Response({
            'status': 'success',
            'message': f'تم شراء "{product.title}" بنجاح!',
            'new_balance': float(buyer_profile.wallet_balance),
        })


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
        
        # ── Wallet Balance Check + Hold ──────────────────
        try:
            profile = request.user.profile
        except UserProfile.DoesNotExist:
            return Response({'error': 'الملف الشخصي غير موجود'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user had a previous bid on this auction (to refund)
        previous_bid = Bid.objects.filter(auction=auction, bidder=request.user).order_by('-amount').first()
        available_balance = profile.wallet_balance
        if previous_bid:
            # User already has a held bid; they only need to cover the difference
            needed = amount - previous_bid.amount
        else:
            needed = amount
        
        if available_balance < needed:
            return Response({
                'error': f'رصيدك غير كافي للمزايدة. رصيدك الحالي: {profile.wallet_balance} جنيه، والمطلوب: {needed} جنيه.',
                'insufficient_balance': True,
                'current_balance': float(profile.wallet_balance),
                'required': float(needed),
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # If user had a previous bid, refund it first
        if previous_bid:
            profile.wallet_balance += previous_bid.amount
            WalletTransaction.objects.create(
                user=request.user,
                transaction_type='bid_refund',
                amount=previous_bid.amount,
                balance_after=profile.wallet_balance,
                description=f'استرداد مزايدة سابقة: "{auction.product.title}"',
                related_auction=auction,
            )
        
        # Hold the new bid amount
        profile.wallet_balance -= amount
        profile.save(update_fields=['wallet_balance'])
        WalletTransaction.objects.create(
            user=request.user,
            transaction_type='bid_hold',
            amount=amount,
            balance_after=profile.wallet_balance,
            description=f'حجز مزايدة: "{auction.product.title}"',
            related_auction=auction,
        )
        # ───────────────────────────────────────────────────
        
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
        
        # ── Agent Counter-Bid (Asynchronous) ────────────────
        import threading
        from .serializers import agent_counter_bid_async
        try:
            threading.Thread(
                target=agent_counter_bid_async,
                args=(auction.id, request.user.id),
                daemon=True
            ).start()
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"[Agent] Counter-bid thread error: {e}")
        # ───────────────────────────────────────────────────
        
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
    
    @action(detail=False, methods=['get', 'patch', 'put'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """Get or update current user's profile"""
        profile = get_object_or_404(UserProfile, user=request.user)
        
        if request.method in ['PATCH', 'PUT']:
            serializer = self.get_serializer(profile, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
            
        serializer = self.get_serializer(profile)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='by_user/(?P<user_id>\d+)', permission_classes=[AllowAny])
    def by_user(self, request, user_id=None):
        """Get public profile by user ID"""
        profile = get_object_or_404(UserProfile.objects.select_related('user'), user__id=user_id)
        # Custom dict to return specific public fields
        avatar_url = request.build_absolute_uri(profile.avatar.url) if profile.avatar else None
        return Response({
            'user_id': profile.user.id,
            'name': f"{profile.user.first_name} {profile.user.last_name}".strip() or profile.user.username,
            'avatar': avatar_url,
            'trust_score': profile.trust_score,
            'seller_rating': float(profile.seller_rating),
            'rating_count': profile.rating_count,
            'total_sales': profile.total_sales,
            'city': profile.city,
            'joined_at': profile.user.date_joined,
            'is_verified': profile.is_verified,
        })

    @action(detail=False, methods=['post'], url_path='rate/(?P<user_id>\d+)', permission_classes=[IsAuthenticated])
    def rate(self, request, user_id=None):
        """Rate a user's profile"""
        profile = get_object_or_404(UserProfile, user__id=user_id)
        
        # Prevent self-rating
        if profile.user == request.user:
            return Response({'error': 'لا يمكنك تقييم نفسك'}, status=status.HTTP_400_BAD_REQUEST)
            
        rating = request.data.get('rating')
        try:
            rating = float(rating)
            if rating < 1 or rating > 5:
                raise ValueError
        except (TypeError, ValueError):
            return Response({'error': 'التقييم يجب أن يكون رقماً من 1 إلى 5'}, status=status.HTTP_400_BAD_REQUEST)

        # Update or create the individual rating
        SellerRating.objects.update_or_create(
            seller=profile,
            rater=request.user,
            defaults={'rating': int(rating)}
        )

        # Recalculate average and count from database
        aggregate = SellerRating.objects.filter(seller=profile).aggregate(
            avg_rating=models.Avg('rating'),
            total_count=models.Count('rating')
        )
        
        new_rating = aggregate['avg_rating'] or 0
        new_count = aggregate['total_count'] or 0
        
        profile.seller_rating = new_rating
        profile.rating_count = new_count
        profile.save(update_fields=['seller_rating', 'rating_count'])
        
        return Response({
            'message': 'تم إضافة التقييم بنجاح',
            'new_rating': round(new_rating, 2),
            'rating_count': new_count
        })


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
    """Mark all notifications as read for the current user"""
    Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return Response({'status': 'ok'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notifications_unread_count(request):
    """Get unread notification count"""
    count = Notification.objects.filter(user=request.user, is_read=False).count()
    return Response({'unread_count': count})


# ──────────────────────────────────────────────────────────────
# ADMIN DASHBOARD API ENDPOINTS
# ──────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAdminRole])
def admin_products_list(request):
    """Get ALL products for admin dashboard (no pagination, all statuses)"""
    products = Product.objects.select_related('owner').prefetch_related('images').order_by('-created_at')
    data = []
    for p in products:
        primary_image = p.images.filter(is_primary=True).first()
        if not primary_image:
            primary_image = p.images.first()
        data.append({
            'id': p.id,
            'title': p.title,
            'price': str(p.price),
            'category': p.category,
            'condition': p.condition,
            'status': p.status,
            'is_auction': p.is_auction,
            'owner_name': p.owner.username,
            'primary_image': request.build_absolute_uri(primary_image.image.url) if primary_image else None,
            'created_at': p.created_at.isoformat(),
        })
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAdminRole])
def admin_users_list(request):
    """Get ALL users for admin dashboard"""
    users = User.objects.select_related('profile').order_by('-date_joined')
    data = []
    for u in users:
        profile_data = {}
        try:
            profile = u.profile
            profile_data = {
                'city': profile.city,
                'phone': profile.phone,
                'trust_score': profile.trust_score,
                'is_verified': profile.is_verified,
                'total_sales': profile.total_sales,
            }
        except UserProfile.DoesNotExist:
            profile_data = {'city': '', 'phone': '', 'trust_score': 0, 'is_verified': False, 'total_sales': 0}
        
        try:
            profile = u.profile
            is_admin = profile.role == 'admin'
        except Exception:
            is_admin = False

        data.append({
            'id': u.id,
            'username': u.username,
            'email': u.email,
            'first_name': u.first_name,
            'last_name': u.last_name,
            'is_staff': u.is_staff,
            'is_admin': is_admin,
            'date_joined': u.date_joined.isoformat(),
            **profile_data,
        })
    return Response(data)


@api_view(['DELETE'])
@permission_classes([IsAdminRole])
def admin_delete_user(request, user_id):
    """Delete a user (admin only). Cannot delete yourself."""
    if request.user.id == user_id:
        return Response({'error': 'لا يمكنك حذف حسابك الخاص'}, status=status.HTTP_400_BAD_REQUEST)
    
    user = get_object_or_404(User, id=user_id)
    username = user.username
    user.delete()
    return Response({'status': 'deleted', 'username': username}, status=status.HTTP_200_OK)


# ──────────────────────────────────────────────────────────────
# WALLET / PAYMENT ENDPOINTS
# ──────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def wallet_topup_view(request):
    """Simulated payment: add funds to wallet instantly (no real payment)"""
    amount_raw = request.data.get('amount')
    if amount_raw is None:
        return Response({'error': 'المبلغ مطلوب'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        amount = Decimal(str(amount_raw))
    except Exception:
        return Response({'error': 'مبلغ غير صالح'}, status=status.HTTP_400_BAD_REQUEST)

    if amount <= 0:
        return Response({'error': 'المبلغ يجب أن يكون أكبر من صفر'}, status=status.HTTP_400_BAD_REQUEST)

    if amount > 100000:
        return Response({'error': 'الحد الأقصى للشحن الواحد 100,000 جنيه'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        profile = request.user.profile
    except UserProfile.DoesNotExist:
        return Response({'error': 'الملف الشخصي غير موجود'}, status=status.HTTP_404_NOT_FOUND)

    profile.wallet_balance += amount
    profile.save(update_fields=['wallet_balance'])

    WalletTransaction.objects.create(
        user=request.user,
        transaction_type='topup',
        amount=amount,
        balance_after=profile.wallet_balance,
        description=f'شحن رصيد: {amount} جنيه',
    )

    return Response({
        'status': 'success',
        'new_balance': float(profile.wallet_balance),
        'amount_added': float(amount),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def wallet_transactions_view(request):
    """Get the user's wallet transaction history"""
    transactions = WalletTransaction.objects.filter(user=request.user)[:50]
    data = []
    for t in transactions:
        data.append({
            'id': t.id,
            'type': t.transaction_type,
            'type_label': dict(WalletTransaction.TRANSACTION_TYPES).get(t.transaction_type, t.transaction_type),
            'amount': float(t.amount),
            'balance_after': float(t.balance_after),
            'description': t.description,
            'created_at': t.created_at.isoformat(),
        })
    return Response(data)


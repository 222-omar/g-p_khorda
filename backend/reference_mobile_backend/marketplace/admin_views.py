"""
Admin-only API views.
All views require both IsAuthenticated AND IsAdminUser.
This provides server-side enforcement — Flutter's client-side GoRouter
redirect is a UX convenience, NOT a security boundary.
"""
import logging
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from django.contrib.auth.models import User

from .models import Product, Auction, Conversation, Notification, UserAgent
from .serializers import (
    ProductListSerializer, AuctionSerializer,
    ConversationListSerializer, UserAgentSerializer,
    NotificationSerializer, UserSerializer,
)

logger = logging.getLogger(__name__)


class AdminProductViewSet(viewsets.ModelViewSet):
    """Admin-only product management. Full CRUD on all products."""
    queryset = Product.objects.select_related('owner').prefetch_related('images')
    serializer_class = ProductListSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def perform_destroy(self, instance):
        """Delete product and all related records safely"""
        from django.db import transaction, connection
        with transaction.atomic():
            # Clear notifications referencing this product
            Notification.objects.filter(related_product=instance).update(related_product=None)
            # Clear orphan product_visual_embeddings table (not in Django models)
            with connection.cursor() as cursor:
                cursor.execute(
                    "DELETE FROM product_visual_embeddings WHERE product_id = %s",
                    [instance.id]
                )
            # Now delete (cascades to images, conversations, bids, wishlist, auction, etc.)
            instance.delete()

    def destroy(self, request, *args, **kwargs):
        """Override destroy to return JSON error instead of 500 HTML"""
        try:
            return super().destroy(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Failed to delete product: {e}", exc_info=True)
            return Response(
                {'error': f'فشل في حذف المنتج: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['POST'])
    def review(self, request, pk=None):
        """Accept or reject a product and notify the owner"""
        product = self.get_object()
        action_val = request.data.get('action')
        reason = request.data.get('reason', 'مخالف لشروط النشر')

        if action_val == 'approve':
            product.status = 'active'
            product.save(update_fields=['status'])
            
            # Send notification
            try:
                Notification.objects.create(
                    user=product.owner,
                    title='تم قبول منتجك!',
                    message=f'تم قبول منتجك "{product.title}" وهو الآن متاح للجميع على المنصة.',
                    related_product=product
                )
            except Exception as e:
                logger.warning(f"Failed to create approval notification: {e}")
                
            return Response({'status': 'success', 'message': 'تم قبول المنتج بنجاح'})
            
        elif action_val == 'reject':
            product.status = 'inactive'
            product.save(update_fields=['status'])
            
            # Send notification
            try:
                Notification.objects.create(
                    user=product.owner,
                    title='تم رفض منتجك',
                    message=f'تم رفض منتجك "{product.title}". السبب: {reason}',
                    related_product=product
                )
            except Exception as e:
                logger.warning(f"Failed to create rejection notification: {e}")
                
            return Response({'status': 'success', 'message': 'تم رفض المنتج'})
            
        else:
            return Response({'error': 'الإجراء غير صالح'}, status=status.HTTP_400_BAD_REQUEST)



class AdminAuctionViewSet(viewsets.ModelViewSet):
    """Admin-only auction management."""
    queryset = Auction.objects.select_related('product', 'highest_bidder')
    serializer_class = AuctionSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]


class AdminUserViewSet(viewsets.ReadOnlyModelViewSet):
    """Admin-only user listing."""
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_stats(request):
    """Admin dashboard stats — server-side guarded."""
    return Response({
        'total_products': Product.objects.count(),
        'total_auctions': Auction.objects.count(),
        'total_users': User.objects.count(),
        'total_conversations': Conversation.objects.count(),
        'total_agents': UserAgent.objects.count(),
        'total_notifications': Notification.objects.count(),
    })

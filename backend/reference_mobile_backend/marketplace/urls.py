from django.urls import path, include
from rest_framework.routers import DefaultRouter, SimpleRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    ProductViewSet,
    AuctionViewSet,
    UserProfileViewSet,
    ConversationViewSet,
    UserAgentViewSet,
    register_view,
    current_user_view,
    get_general_stats,
    CustomTokenObtainPairView,
    wishlist_list,
    wishlist_toggle,
    wishlist_check,
    wishlist_ids,
    classify_image_view,
    get_agent_targets,
    notifications_list,
    notifications_mark_read,
    notifications_delete,
    notifications_unread_count,
    get_categories,
    health_check,
    visual_search_view,
    agent_pending_bids_list,
    agent_pending_bid_approve,
    agent_pending_bid_reject,
)
from .admin_views import (
    AdminProductViewSet,
    AdminAuctionViewSet,
    AdminUserViewSet,
    admin_stats,
)

router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='product')
router.register(r'auctions', AuctionViewSet, basename='auction')
router.register(r'profiles', UserProfileViewSet, basename='profile')
router.register(r'conversations', ConversationViewSet, basename='conversation')
router.register(r'agents', UserAgentViewSet, basename='agent')

# Admin-only router (all viewsets enforce IsAdminUser)
admin_router = SimpleRouter()
admin_router.register(r'products', AdminProductViewSet, basename='admin-product')
admin_router.register(r'auctions', AdminAuctionViewSet, basename='admin-auction')
admin_router.register(r'users', AdminUserViewSet, basename='admin-user')

urlpatterns = [
    # Authentication endpoints
    path('auth/register/', register_view, name='register'),
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me/', current_user_view, name='current_user'),
    path('general-stats/', get_general_stats, name='general-stats'),
    
    # Categories endpoint
    path('categories/', get_categories, name='categories'),
    
    # Wishlist endpoints
    path('wishlist/', wishlist_list, name='wishlist-list'),
    path('wishlist/ids/', wishlist_ids, name='wishlist-ids'),
    path('wishlist/toggle/<int:product_id>/', wishlist_toggle, name='wishlist-toggle'),
    path('wishlist/check/<int:product_id>/', wishlist_check, name='wishlist-check'),
    
    # AI Classification
    path('classify-image/', classify_image_view, name='classify-image'),
    
    # Visual Search
    path('visual-search/', visual_search_view, name='visual-search'),
    
    # AI Agent
    path('agent-targets/', get_agent_targets, name='agent-targets'),
    
    # Notifications
    path('notifications/', notifications_list, name='notifications-list'),
    path('notifications/mark-read/', notifications_mark_read, name='notifications-mark-read'),
    path('notifications/delete/', notifications_delete, name='notifications-delete'),
    path('notifications/unread-count/', notifications_unread_count, name='notifications-unread-count'),
    
    # Router URLs
    path('', include(router.urls)),

    # Agent Pending Bids
    path('agent-pending-bids/', agent_pending_bids_list, name='agent-pending-bids-list'),
    path('agent-pending-bids/<int:pk>/approve/', agent_pending_bid_approve, name='agent-pending-bid-approve'),
    path('agent-pending-bids/<int:pk>/reject/', agent_pending_bid_reject, name='agent-pending-bid-reject'),

    # Health check — for load balancers and monitoring
    path('health/', health_check, name='health-check'),

    # Admin-only API (IsAdminUser enforced server-side)
    path('admin-api/stats/', admin_stats, name='admin-stats'),
    path('admin-api/', include(admin_router.urls)),
]

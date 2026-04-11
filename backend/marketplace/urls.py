from django.urls import path, include
from rest_framework.routers import DefaultRouter
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
    notifications_unread_count,
    admin_products_list,
    admin_users_list,
    admin_delete_user,
)

router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='product')
router.register(r'auctions', AuctionViewSet, basename='auction')
router.register(r'profiles', UserProfileViewSet, basename='profile')
router.register(r'conversations', ConversationViewSet, basename='conversation')
router.register(r'agents', UserAgentViewSet, basename='agent')

urlpatterns = [
    # Authentication endpoints
    path('auth/register/', register_view, name='register'),
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me/', current_user_view, name='current_user'),
    path('general-stats/', get_general_stats, name='general-stats'),
    
    # Wishlist endpoints
    path('wishlist/', wishlist_list, name='wishlist-list'),
    path('wishlist/ids/', wishlist_ids, name='wishlist-ids'),
    path('wishlist/toggle/<int:product_id>/', wishlist_toggle, name='wishlist-toggle'),
    path('wishlist/check/<int:product_id>/', wishlist_check, name='wishlist-check'),
    
    # AI Classification
    path('classify-image/', classify_image_view, name='classify-image'),
    
    # AI Agent
    path('agent-targets/', get_agent_targets, name='agent-targets'),
    
    # Notifications
    path('notifications/', notifications_list, name='notifications-list'),
    path('notifications/mark-read/', notifications_mark_read, name='notifications-mark-read'),
    path('notifications/unread-count/', notifications_unread_count, name='notifications-unread-count'),
    
    # Admin Dashboard API (IsAdminUser protected)
    path('admin-api/products/', admin_products_list, name='admin-products'),
    path('admin-api/users/', admin_users_list, name='admin-users'),
    path('admin-api/users/<int:user_id>/', admin_delete_user, name='admin-delete-user'),
    
    # Router URLs
    path('', include(router.urls)),
]



from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    ProductViewSet,
    AuctionViewSet,
    UserProfileViewSet,
    ConversationViewSet,
    register_view,
    current_user_view,
    get_general_stats,
    CustomTokenObtainPairView,
    wishlist_list,
    wishlist_toggle,
    wishlist_check,
    wishlist_ids,
    classify_image_view,
)

router = DefaultRouter()
router.register(r'products', ProductViewSet, basename='product')
router.register(r'auctions', AuctionViewSet, basename='auction')
router.register(r'profiles', UserProfileViewSet, basename='profile')
router.register(r'conversations', ConversationViewSet, basename='conversation')

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
    
    # Router URLs
    path('', include(router.urls)),
]


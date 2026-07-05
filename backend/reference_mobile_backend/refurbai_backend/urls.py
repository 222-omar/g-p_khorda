from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    # Versioned API (canonical)
    path('api/v1/', include('marketplace.urls')),
    path('api/v1/rag/', include('rag.urls')),
    # Backward-compatible unversioned routes (deprecated — remove in v2)
    path('api/', include('marketplace.urls')),
    path('api/rag/', include('rag.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

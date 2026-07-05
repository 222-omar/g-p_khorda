from django.urls import path
from .views import rag_query_view, rag_cache_stats_view

urlpatterns = [
    path('query/', rag_query_view, name='rag-query'),
    path('cache-stats/', rag_cache_stats_view, name='rag-cache-stats'),
]

from django.urls import path
from .views import rag_query_view

urlpatterns = [
    path('query/', rag_query_view, name='rag-query'),
]

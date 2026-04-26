"""
RAG API Views.
"""

import logging
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework import status

from rag.hybrid_engine import rag_query

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([AllowAny])
def rag_query_view(request):
    """
    POST /api/rag/query/

    Body: { "query": "عايز غسالة رخيصة في القاهرة", "history": [] }

    Returns:
    {
        "answer": {
            "summary": "لقيتلك 3 غسالات حلوين...",
            "items": [12, 34, 56],
            "suggested_action": "view_listing"
        },
        "meta": {
            "latency_ms": 1200,
            "sql_results": 5,
            "vector_results": 10,
            "merged_results": 8,
            "intent": "search_full",
            "tokens_saved": "0",
            "cache_hit": false
        }
    }
    """
    query = request.data.get('query', '').strip()
    history = request.data.get('history', [])  # Optional: last 3 messages

    if not query:
        return Response(
            {"error": "الرجاء إدخال سؤال أو كلمة بحث."},
            status=status.HTTP_400_BAD_REQUEST
        )

    if len(query) > 500:
        return Response(
            {"error": "السؤال طويل أوي. حاول تختصر شوية."},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        result = rag_query(query, user=request.user, history=history)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"[RAG/View] Unexpected error: {e}")
        return Response(
            {"error": "حصلت مشكلة في السيرفر. جرب تاني."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAdminUser])
def rag_cache_stats_view(request):
    """
    GET /api/rag/cache-stats/

    Returns cache statistics including hit rate and estimated tokens saved.
    Admin-only endpoint.
    """
    from rag.response_cache import get_cache

    cache = get_cache()
    stats = cache.stats()
    return Response(stats, status=status.HTTP_200_OK)

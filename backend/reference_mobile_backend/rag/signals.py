"""
Auto-embed products on save using Django signals.
When a product is created or updated, its embedding is generated
in a background thread to avoid blocking the request.

Made graceful: if RAG dependencies (google-generativeai) aren't installed,
the signal does nothing instead of crashing the whole server.
"""

import logging
import threading
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import connection

logger = logging.getLogger(__name__)

_rag_available = True
try:
    from rag.embeddings import embed_product  # noqa: F401
except ImportError:
    _rag_available = False
    logger.warning("[RAG] google-generativeai not installed — auto-embedding disabled")


def _embed_in_background(product_id):
    """Run embedding in a background thread."""
    if not _rag_available:
        return
    try:
        from marketplace.models import Product
        from rag.embeddings import embed_product
        from rag.vector_search import get_embedding_cache
        product = Product.objects.get(id=product_id)
        logger.info(f"[Signal] Generating visual embedding for new product {product_id}")
        embed_product(product)
        logger.info(f"[Signal] Successfully saved embedding for product {product_id}")
        # Invalidate in-memory cache so next search picks up the new product
        get_embedding_cache().invalidate()
    except Exception as e:
        logger.error(f"[RAG/Signal] Failed to embed product #{product_id}: {e}")
    finally:
        connection.close()


@receiver(post_save, sender='marketplace.Product')
def auto_embed_product(sender, instance, **kwargs):
    """
    Whenever a Product is saved, queue an embedding generation.
    Runs in a daemon thread so it doesn't block the HTTP response.
    """
    if not _rag_available:
        return

    # Only embed active products
    if instance.status != 'active':
        return

    threading.Thread(
        target=_embed_in_background,
        args=(instance.id,),
        daemon=True,
    ).start()

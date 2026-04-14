"""
Auto-embed products on save using Django signals.
When a product is created or updated, its embedding is generated
in a background thread to avoid blocking the request.
Also cleans up embeddings when a product is deleted.
"""

import logging
import threading
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db import connection

logger = logging.getLogger(__name__)


def _embed_in_background(product_id):
    """Run embedding in a background thread."""
    try:
        from marketplace.models import Product
        from rag.embeddings import embed_product
        product = Product.objects.get(id=product_id)
        embed_product(product)
    except Exception as e:
        logger.error(f"[RAG/Signal] Failed to embed product #{product_id}: {e}")
    finally:
        connection.close()


@receiver(post_save, sender='marketplace.Product')
def auto_embed_product(sender, instance, created, **kwargs):
    """
    Whenever a Product is saved (created or updated), queue an embedding generation.
    Runs in a daemon thread so it doesn't block the HTTP response.
    """
    # Only embed active products
    if instance.status != 'active':
        # If product was deactivated/sold, remove its embedding
        try:
            from rag.models import ProductEmbedding
            ProductEmbedding.objects.filter(product_id=instance.id).delete()
            logger.info(f"[RAG/Signal] Removed embedding for inactive product #{instance.id}")
        except Exception:
            pass
        return

    threading.Thread(
        target=_embed_in_background,
        args=(instance.id,),
        daemon=True,
    ).start()


@receiver(post_delete, sender='marketplace.Product')
def cleanup_embedding_on_delete(sender, instance, **kwargs):
    """
    When a Product is deleted, remove its embedding from the database.
    """
    try:
        from rag.models import ProductEmbedding
        deleted_count, _ = ProductEmbedding.objects.filter(product_id=instance.id).delete()
        if deleted_count:
            logger.info(f"[RAG/Signal] Cleaned up embedding for deleted product #{instance.id}")
    except Exception as e:
        logger.error(f"[RAG/Signal] Failed to clean up embedding for product #{instance.id}: {e}")

"""
Auto-embed products on save using Django signals.
When a product is created or updated, its embedding is generated
in a background thread to avoid blocking the request.
"""

import logging
import threading
from django.db.models.signals import post_save
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
def auto_embed_product(sender, instance, **kwargs):
    """
    Whenever a Product is saved, queue an embedding generation.
    Runs in a daemon thread so it doesn't block the HTTP response.
    """
    # Only embed active products
    if instance.status != 'active':
        return

    threading.Thread(
        target=_embed_in_background,
        args=(instance.id,),
        daemon=True,
    ).start()

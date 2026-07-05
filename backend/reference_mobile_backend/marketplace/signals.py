import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import ProductImage, Product
from ai.vision_service import get_image_embedding
import threading

logger = logging.getLogger(__name__)

def generate_product_embedding(product_id):
    """Background task to generate and save embedding"""
    try:
        product = Product.objects.get(id=product_id)
        if product.visual_embedding:
            return

        primary_image = product.images.filter(is_primary=True).first() or product.images.first()
        if not primary_image:
            return

        logger.info(f"[Signal] Generating visual embedding for new product {product.id}")
        
        # Read image bytes
        try:
            # Handle both local and Cloudinary storage
            if hasattr(primary_image.image, 'url') and primary_image.image.url.startswith('http'):
                import requests
                resp = requests.get(primary_image.image.url, timeout=20)
                img_bytes = resp.content
            else:
                with open(primary_image.image.path, 'rb') as f:
                    img_bytes = f.read()
            
            embedding = get_image_embedding(img_bytes)
            product.visual_embedding = embedding
            product.save(update_fields=['visual_embedding'])
            logger.info(f"[Signal] Successfully saved embedding for product {product.id}")
        except Exception as e:
            logger.error(f"[Signal] Error reading image or getting embedding: {e}")

    except Exception as e:
        logger.error(f"[Signal] Global error in background embedding task: {e}")

@receiver(post_save, sender=ProductImage)
def handle_new_product_image(sender, instance, created, **kwargs):
    """Trigger embedding generation when a product image is uploaded"""
    if created or not instance.product.visual_embedding:
        # Run in a separate thread to avoid blocking the user request
        thread = threading.Thread(target=generate_product_embedding, args=(instance.product.id,))
        thread.daemon = True
        thread.start()

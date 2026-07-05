import os
import sys
import django
from pathlib import Path
from dotenv import load_dotenv

# Setup Django
current_dir = Path(__file__).resolve().parent
sys.path.append(str(current_dir))
load_dotenv()
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'refurbai_backend.settings')
django.setup()

from marketplace.models import Product
from ai.vision_service import get_image_embedding
import requests as http_requests
import time

def populate_embeddings():
    products = Product.objects.filter(visual_embedding__isnull=True) | Product.objects.filter(visual_embedding=[])
    count = products.count()
    print(f"Found {count} products missing embeddings.")
    
    for i, product in enumerate(products):
        primary_image = product.images.filter(is_primary=True).first() or product.images.first()
        if not primary_image:
            print(f"[{i+1}/{count}] Product {product.id} has no images. Skipping.")
            continue
            
        try:
            print(f"[{i+1}/{count}] Generating embedding for product {product.id} ({product.title})...")
            img_url = primary_image.image.url
            if img_url.startswith('http'):
                resp = http_requests.get(img_url, timeout=15)
                img_bytes = resp.content
            else:
                with open(primary_image.image.path, 'rb') as f:
                    img_bytes = f.read()
            
            emb = get_image_embedding(img_bytes)
            product.visual_embedding = emb
            product.save(update_fields=['visual_embedding'])
            print(f"  SUCCESS.")
            # Small sleep to avoid hitting OpenRouter rate limits
            time.sleep(0.5)
        except Exception as e:
            print(f"  FAILED: {e}")

if __name__ == "__main__":
    populate_embeddings()

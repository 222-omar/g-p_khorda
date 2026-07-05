import os
import sys
from pathlib import Path

# Add the current directory to sys.path
current_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(current_dir))

import django
from dotenv import load_dotenv

load_dotenv()
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'refurbai_backend.settings')
django.setup()

from ai.vision_service import get_image_embedding
import requests

def test_embedding():
    # Use a sample image URL
    img_url = "https://res.cloudinary.com/dp7dqogpg/image/upload/v1/media/product_images/bed.jpg"
    print(f"Testing embedding for: {img_url}")
    
    try:
        resp = requests.get(img_url)
        img_bytes = resp.content
        print(f"Image downloaded: {len(img_bytes)} bytes")
        
        embedding = get_image_embedding(img_bytes)
        print(f"SUCCESS! Got embedding of length: {len(embedding)}")
        print(f"First 5 values: {embedding[:5]}")
    except Exception as e:
        print(f"FAILED: {e}")

if __name__ == "__main__":
    test_embedding()

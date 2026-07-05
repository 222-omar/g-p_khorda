import os
import sys
import django
from pathlib import Path
from dotenv import load_dotenv

# Setup Django
current_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(current_dir))
load_dotenv()
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'refurbai_backend.settings')
django.setup()

from marketplace.models import Product

def check_products():
    print("--- Latest 10 Products AI Data ---")
    products = Product.objects.all().order_by('-created_at')[:10]
    for p in products:
        print(f"ID: {p.id} | Title: {p.title} | Detected: {p.detected_item or 'EMPTY'} | Auction: {p.is_auction}")

if __name__ == "__main__":
    check_products()

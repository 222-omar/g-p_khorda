"""Run with: python manage.py shell < scratch/test_delete_direct.py"""
import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'refurbai_backend.settings')

# Already in shell context, just import
from marketplace.models import Product, Notification
from django.db import transaction
import traceback

products = Product.objects.all().order_by('-id')
print(f"Total products: {products.count()}")

# Pick the last product 
p = products.last()
if not p:
    print("No products to test!")
    sys.exit()

print(f"Testing delete on product ID={p.id}, title={p.title[:30]}")

# Check what related objects exist
print(f"  Images: {p.images.count()}")
print(f"  Conversations: {p.conversations.count()}")
print(f"  Wishlisted by: {p.wishlisted_by.count()}")
print(f"  Notifications: {Notification.objects.filter(related_product=p).count()}")

try:
    has_auction = hasattr(p, 'auction') and p.auction is not None
except:
    has_auction = False
print(f"  Has auction: {has_auction}")

if has_auction:
    auction = p.auction
    print(f"  Bids on auction: {auction.bids.count()}")
    print(f"  Pending bids: {auction.pending_bids.count()}")

# Now try to delete
print("\nAttempting delete...")
try:
    with transaction.atomic():
        Notification.objects.filter(related_product=p).update(related_product=None)
        p.delete()
    print("SUCCESS! Product deleted.")
except Exception as e:
    print(f"FAILED: {type(e).__name__}: {e}")
    traceback.print_exc()

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'refurbai_backend.settings')
django.setup()

from marketplace.models import Auction, Product

def check_auctions():
    total = Auction.objects.count()
    active_prod = Auction.objects.filter(product__status='active').count()
    pending_prod = Auction.objects.filter(product__status='pending').count()
    
    print(f"--- Database Status ---")
    print(f"Total Auctions: {total}")
    print(f"Auctions with Active products: {active_prod}")
    print(f"Auctions with Pending products: {pending_prod}")
    
    if pending_prod > 0:
        print("\nNote: Pending auctions won't show up for users until approved by admin.")

if __name__ == "__main__":
    check_auctions()

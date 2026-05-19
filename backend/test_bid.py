"""
Minimal script to reproduce the place_bid 500 error.
Run with: python manage.py shell < test_bid.py
"""
from decimal import Decimal
from marketplace.models import Auction, Bid, UserProfile, WalletTransaction
from marketplace.serializers import BidSerializer
from django.contrib.auth.models import User

print("=== Testing place_bid serialization ===")

# 1. Find auction 51 (the one from the log)
try:
    auction = Auction.objects.select_related('product', 'product__owner', 'highest_bidder').get(id=51)
    print(f"Auction #{auction.id}: {auction.product.title}, current_bid={auction.current_bid}")
except Auction.DoesNotExist:
    print("Auction 51 not found. Using first active auction...")
    auction = Auction.objects.filter(is_active=True).select_related('product').first()
    if not auction:
        print("No active auctions found!")
        exit()
    print(f"Using Auction #{auction.id}: {auction.product.title}")

# 2. Test BidSerializer directly - this is line 570 in views.py
print("\n--- Testing BidSerializer ---")
try:
    last_bid = Bid.objects.filter(auction=auction).order_by('-created_at').first()
    if last_bid:
        print(f"Last bid: #{last_bid.id}, amount={last_bid.amount}, bidder={last_bid.bidder}")
        data = BidSerializer(last_bid).data
        print(f"Serialized OK: {data}")
    else:
        print("No bids found on this auction yet")
except Exception as e:
    import traceback
    print(f"BidSerializer CRASHED: {e}")
    traceback.print_exc()

# 3. Test the agent_counter_bid function
print("\n--- Testing agent_counter_bid import ---")
try:
    from marketplace.serializers import agent_counter_bid
    print("Import OK")
except Exception as e:
    import traceback
    print(f"Import CRASHED: {e}")
    traceback.print_exc()

# 4. Test WalletTransaction creation with related_auction
print("\n--- Testing WalletTransaction with related_auction ---")
try:
    # Just check the field exists
    field = WalletTransaction._meta.get_field('related_auction')
    print(f"Field exists: {field}, type={field.get_internal_type()}")
except Exception as e:
    print(f"Field MISSING: {e}")

# 5. Test full flow simulation
print("\n--- Testing full atomic flow ---")
try:
    from django.db import transaction
    from django.utils import timezone

    user = User.objects.first()
    if not user:
        print("No users found!")
        exit()
    
    profile = user.profile
    print(f"User: {user.username}, wallet: {profile.wallet_balance}")
    
    # Test if profile has avatar
    print(f"Avatar field: {profile.avatar}")
    print(f"Avatar url: {profile.avatar.url if profile.avatar else 'None'}")
except Exception as e:
    import traceback
    print(f"Flow test error: {e}")
    traceback.print_exc()

print("\n=== Done ===")

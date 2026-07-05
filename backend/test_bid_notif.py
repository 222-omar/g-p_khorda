import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'refurbai_backend.settings')
django.setup()

from marketplace.models import Auction, UserProfile, Notification
from django.contrib.auth.models import User
from marketplace.services.auction import AuctionService

auction = Auction.objects.filter(is_active=True).first()
if auction:
    bidder = User.objects.exclude(id=auction.product.owner.id).first()
    if bidder:
        # ensure bidder has enough balance
        bidder.profile.wallet_balance += 1000000
        bidder.profile.save()
        
        amount = auction.current_bid + 100
        print(f"Placing bid of {amount} on auction {auction.id} by user {bidder.username}...")
        
        try:
            bid, auc = AuctionService.place_bid(bidder, auction.id, amount)
            print(f"Bid placed successfully! Bid ID: {bid.id}")
            
            notif = Notification.objects.filter(user=auction.product.owner, related_auction=auction).order_by('created_at').last()
            if notif:
                print(f"SUCCESS: Notification created for owner with ID: {notif.id} and type: {notif.notification_type}")
            else:
                print("ERROR: Notification not found!")
        except Exception as e:
            print(f"Error placing bid: {e}")
    else:
        print("No other user found to bid.")
else:
    print("No active auction found to test.")

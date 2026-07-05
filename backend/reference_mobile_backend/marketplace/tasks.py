"""
Background tasks for the marketplace app.
Can be run via:
  - Celery beat (if celery is configured)
  - Django management command: python manage.py close_expired_auctions
  - Cron job calling the management command
"""
import logging
from django.utils import timezone
from django.db import transaction

logger = logging.getLogger(__name__)


def close_expired_auctions_task():
    """
    Close all auctions past their end_time. Idempotent and safe to run frequently.
    Uses select_for_update to prevent race conditions.
    """
    from marketplace.models import Auction
    from marketplace.views import send_winner_message

    with transaction.atomic():
        expired = Auction.objects.select_for_update().filter(
            is_active=True,
            end_time__lte=timezone.now()
        )
        closed_count = 0
        for auction in expired:
            auction.is_active = False
            auction.save(update_fields=['is_active'])
            auction.product.status = 'sold'
            auction.product.save(update_fields=['status'])
            if auction.highest_bidder:
                send_winner_message(auction)
            closed_count += 1

    if closed_count:
        logger.info(f"[Tasks] Closed {closed_count} expired auction(s)")
    return closed_count


# ── Celery integration ──
try:
    from celery import shared_task

    @shared_task(name='marketplace.close_expired_auctions')
    def close_expired_auctions_celery():
        return close_expired_auctions_task()

    @shared_task(name='marketplace.run_auto_bidding')
    def run_auto_bidding_celery(auction_id, detected_item):
        from .serializers import run_auto_bidding_async
        run_auto_bidding_async(auction_id, detected_item)

    @shared_task(name='marketplace.agent_counter_bid')
    def agent_counter_bid_celery(auction_id, user_id):
        from .serializers import agent_counter_bid_async
        agent_counter_bid_async(auction_id, user_id)

except ImportError:
    pass  # Celery not installed


"""
Marketplace signals.
- Auto-creates UserProfile when a User is created (including superusers).
- Triggers agent discovery when a new direct-sale product is created.
"""

import logging
import threading
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import connection
from django.contrib.auth.models import User

logger = logging.getLogger(__name__)


# ── Auto-create UserProfile for every new User ──────────────────────────────
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """
    Automatically create a UserProfile whenever a new User is created.
    This covers users created via `createsuperuser`, Django admin, or any
    other method that bypasses the register_view serializer.
    """
    if created:
        from marketplace.models import UserProfile
        # Don't create if it already exists (e.g. register_view already created it)
        if not UserProfile.objects.filter(user=instance).exists():
            role = 'admin' if (instance.is_superuser or instance.is_staff) else 'user'
            UserProfile.objects.create(
                user=instance,
                role=role,
                city='',  # Default empty; superusers can update later
            )
            logger.info(f"[Signal] Auto-created UserProfile for '{instance.username}' (role={role})")


def _run_discovery_in_background(product_id):
    """Run agent discovery in a background thread."""
    try:
        from marketplace.serializers import run_agent_discovery_async
        run_agent_discovery_async(product_id)
    except Exception as e:
        logger.error(f"[Marketplace/Signal] Discovery failed for product #{product_id}: {e}")
    finally:
        connection.close()


@receiver(post_save, sender='marketplace.Product')
def trigger_agent_discovery(sender, instance, created, **kwargs):
    """
    When a NEW active, non-auction product is created,
    check if any agents are interested in it.
    """
    if not created:
        return

    if instance.status != 'active':
        return

    if instance.is_auction:
        return  # Auctions are handled by run_auto_bidding

    if not instance.detected_item:
        return  # No YOLO classification = can't match agents

    logger.info(f"[Marketplace/Signal] New product #{instance.id} detected as '{instance.detected_item}', triggering agent discovery")

    threading.Thread(
        target=_run_discovery_in_background,
        args=(instance.id,),
        daemon=True,
    ).start()

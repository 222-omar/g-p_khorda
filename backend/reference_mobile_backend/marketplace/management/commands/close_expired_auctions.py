"""
Management command to close expired auctions.
Usage: python manage.py close_expired_auctions

Can be scheduled via cron:
  * * * * * cd /app && python manage.py close_expired_auctions
"""
from django.core.management.base import BaseCommand
from marketplace.tasks import close_expired_auctions_task


class Command(BaseCommand):
    help = 'Close all auctions past their end_time and notify winners.'

    def handle(self, *args, **options):
        count = close_expired_auctions_task()
        self.stdout.write(self.style.SUCCESS(f'Closed {count} expired auction(s).'))

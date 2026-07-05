import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'refurbai_backend.settings')
django.setup()

from django.contrib.auth.models import User
from marketplace.models import Notification

user = User.objects.filter(username='Omarh35311').first()
if not user:
    user = User.objects.first()

notif = Notification.objects.create(
    user=user,
    title='Test WebSocket Broadcast',
    message='This is a test notification generated from the Django shell.',
    notification_type='info'
)
print(f"Created Notification ID {notif.id} for user {user.username}")

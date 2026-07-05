import os
import django
import asyncio
import websockets
from asgiref.sync import sync_to_async

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'refurbai_backend.settings')
django.setup()

from django.contrib.auth.models import User
from rest_framework_simplejwt.tokens import RefreshToken

async def test_ws():
    @sync_to_async
    def get_token():
        user = User.objects.filter(username='Omarh35311').first()
        if not user:
            user = User.objects.first()
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)

    token = await get_token()
    uri = f"ws://127.0.0.1:8000/ws/notifications/?token={token}"
    print(f"Connecting to {uri[:60]}... (token hidden)")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected! Waiting for 3 seconds...")
            await asyncio.sleep(3)
            print("Closing gracefully.")
    except Exception as e:
        print(f"Error connecting: {e}")

asyncio.run(test_ws())

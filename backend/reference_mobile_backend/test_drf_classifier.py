import os
import django
import json

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "refurbai_backend.settings")
django.setup()

from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

# Get or create a test user
user = User.objects.first()
if not user:
    user = User.objects.create_user(username="test_diagnostic", password="password123")

print(f"Using user: {user.username}")

# Generate Token
refresh = RefreshToken.for_user(user)
access_token = str(refresh.access_token)

# Setup DRF APIClient
client = APIClient()
client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')

print("Simulating POST request to /api/classify-image/ ...")
with open(r"d:\4SALE_WEP\laptop.jpg", "rb") as f:
    response = client.post("/api/classify-image/", {"image": f}, format="multipart")

print(f"Status Code: {response.status_code}")
print("Response Data:")
try:
    print(json.dumps(response.data, indent=2, ensure_ascii=False))
except Exception:
    print(response.content)

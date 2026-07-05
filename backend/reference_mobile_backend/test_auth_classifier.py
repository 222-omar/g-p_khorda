import requests
import json

# Step 1: Login to get token
login_url = "http://127.0.0.1:8000/api/auth/login/"
login_data = {
    "username": "admin",
    "password": "admin123"
}

print("Attempting to login...")
login_resp = requests.post(login_url, json=login_data)
if login_resp.status_code != 200:
    print(f"Login failed: {login_resp.status_code} - {login_resp.text}")
    exit(1)

token = login_resp.json().get("access") or login_resp.json().get("tokens", {}).get("access")
print(f"Login successful! Token: {token[:20]}...")

# Step 2: Call classify-image
classify_url = "http://127.0.0.1:8000/api/classify-image/"
headers = {
    "Authorization": f"Bearer {token}"
}
files = {
    "image": ("laptop.jpg", open(r"d:\4SALE_WEP\laptop.jpg", "rb"), "image/jpeg")
}

print("Sending classification request...")
resp = requests.post(classify_url, headers=headers, files=files, timeout=60)
print(f"Status Code: {resp.status_code}")
print("Response Headers:")
print(dict(resp.headers))
print("Response Body:")
try:
    print(json.dumps(resp.json(), indent=2, ensure_ascii=False))
except Exception:
    print(resp.text)

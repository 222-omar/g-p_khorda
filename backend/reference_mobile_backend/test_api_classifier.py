import requests
import json

url = "http://127.0.0.1:8000/api/classify-image/"
files = {'image': open(r"d:\4SALE_WEP\laptop.jpg", "rb")}

print("Sending POST request to /api/classify-image/ ...")
try:
    response = requests.post(url, files=files, timeout=40)
    print(f"Status Code: {response.status_code}")
    print("Response body:")
    print(response.text)
except Exception as e:
    print("Request failed:", e)

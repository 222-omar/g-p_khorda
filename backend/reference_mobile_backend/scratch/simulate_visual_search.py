import requests
import os

def test_visual_search():
    url = "http://127.0.0.1:8000/api/visual-search/"
    # Path to a real image on the disk to upload
    img_path = "D:/4app/backend/media/product_images/bed.jpg"
    
    if not os.path.exists(img_path):
        # Create a dummy file if not exists for testing
        print(f"File {img_path} not found, testing with a small file.")
        with open("test_img.jpg", "wb") as f:
            f.write(b"test data")
        img_path = "test_img.jpg"

    print(f"Uploading {img_path} to {url}...")
    
    # You might need a valid token if authentication is required
    # But usually search might be AllowAny or we use a test token
    headers = {
        # "Authorization": "Bearer YOUR_TOKEN_HERE"
    }

    with open(img_path, 'rb') as f:
        files = {'image': f}
        try:
            # Setting a long timeout because embedding generation is slow
            response = requests.post(url, files=files, headers=headers, timeout=100)
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text[:500]}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    test_visual_search()

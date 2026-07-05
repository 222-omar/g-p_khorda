import requests
import time

def benchmark():
    url = "http://127.0.0.1:8000/api/v1/auctions/"
    print(f"Benchmarking {url}...")
    
    times = []
    for i in range(3):
        start = time.time()
        try:
            resp = requests.get(url, timeout=30)
            end = time.time()
            elapsed = end - start
            times.append(elapsed)
            items = len(resp.json().get('results', []))
            print(f"Request {i+1}: {elapsed:.4f}s ({items} items)")
        except Exception as e:
            print(f"Request {i+1} FAILED: {e}")
            
    if times:
        print(f"Average time: {sum(times)/len(times):.4f}s")

if __name__ == "__main__":
    benchmark()

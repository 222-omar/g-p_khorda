import requests
import json

def check_data_structure():
    url = "http://127.0.0.1:8000/api/v1/auctions/"
    print(f"Checking data from {url}...")
    try:
        resp = requests.get(url, timeout=30)
        data = resp.json()
        results = data.get('results', [])
        if results:
            print("--- First Auction Item Structure ---")
            output = json.dumps(results[0], indent=2, ensure_ascii=False)
            import sys
            sys.stdout.buffer.write(output.encode('utf-8'))
            print() # Newline
        else:
            print("No results found in API response.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_data_structure()

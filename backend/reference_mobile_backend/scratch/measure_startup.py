import time
import os
import sys
from pathlib import Path

def measure_setup():
    start = time.time()
    # Add project root to sys.path
    root = Path(__file__).resolve().parent.parent
    sys.path.append(str(root))
    
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'refurbai_backend.settings')
    
    import django
    django.setup()
    
    end = time.time()
    print(f"Django Setup Time: {end-start:.4f}s")
    
    from marketplace.models import Auction
    start_q = time.time()
    count = Auction.objects.count()
    end_q = time.time()
    print(f"Simple Query Time: {end_q-start_q:.4f}s (Count: {count})")

if __name__ == "__main__":
    measure_setup()

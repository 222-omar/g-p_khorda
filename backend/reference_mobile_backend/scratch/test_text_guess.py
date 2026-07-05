import os, sys
from pathlib import Path
root = Path(__file__).resolve().parent.parent
sys.path.append(str(root))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'refurbai_backend.settings')

import django
django.setup()

from ai.classifier import guess_item_from_text

# Test cases
tests = [
    "غساله اوتوماتيك توشيبا",
    "غسالة اوتوماتيك",
    "لاب توب HP",
    "كتاب",
    "ثلاجه توشيبا",
    "سرير خشب",
    "كنبه",
    "تلفزيون سامسونج",
    "موبايل ايفون",
    "عربيه",
    "random text",
]

print("=== guess_item_from_text Tests ===")
for test in tests:
    result = guess_item_from_text(test)
    status = "OK" if result else "MISS"
    print(f"[{status}] '{test}' -> {result}")

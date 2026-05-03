
import os
import sys

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from ai.classifier import guess_item_from_text

test_titles = [
    "سرير مستعمل بالمرتبه مقاس 100 سم",
    "كاميرا كانون للبيع",
    "لابتوب ديل",
    "ثلاجة توشيبا",
    "غسالة ايديال زانوسي",
    "دولاب خشب زان",
    "كنبة سرير",
]

for title in test_titles:
    guessed = guess_item_from_text(title)
    print(f"Title: {title.encode('utf-8')} | Guessed: {guessed}")

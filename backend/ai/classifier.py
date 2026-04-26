"""
YOLO-based image classifier for product categorization.
Uses a custom YOLOv11 model (best.pt) to detect objects in product images
and map them to marketplace categories.
"""

import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# Path to the YOLO model
MODEL_PATH = Path(__file__).resolve().parent.parent.parent / 'ai' / 'best.pt'

# Map detected YOLO class names → Arabic category labels
# NOTE: Variants like food_trip / "Food trip" and wardrobe / "Wardrobe" are ALL mapped.
CATEGORY_MAP = {
    # ─── أثاث وديكور (Furniture & Decor) ───
    'bed': 'أثاث وديكور',
    'chair': 'أثاث وديكور',
    'cabinet': 'أثاث وديكور',
    'cupboard': 'أثاث وديكور',
    'curtain': 'أثاث وديكور',
    'lamp': 'أثاث وديكور',
    'mirror': 'أثاث وديكور',
    'sofa': 'أثاث وديكور',
    'table': 'أثاث وديكور',
    'wardrobe': 'أثاث وديكور',
    'Wardrobe': 'أثاث وديكور',
    'Dressing Table': 'أثاث وديكور',
    'food_trip': 'أثاث وديكور',
    'Food trip': 'أثاث وديكور',
    'safe': 'أثاث وديكور',
    'office': 'أثاث وديكور',

    # ─── الكترونيات واجهزه (Electronics & Devices) ───
    'laptop': 'الكترونيات واجهزه',
    'computer': 'الكترونيات واجهزه',
    'mobile_phone': 'الكترونيات واجهزه',
    'phone': 'الكترونيات واجهزه',
    'tv': 'الكترونيات واجهزه',
    'camera': 'الكترونيات واجهزه',
    'headphone': 'الكترونيات واجهزه',
    'airpods': 'الكترونيات واجهزه',
    'speaker': 'الكترونيات واجهزه',
    'receiver': 'الكترونيات واجهزه',
    'router': 'الكترونيات واجهزه',
    'printer': 'الكترونيات واجهزه',
    'keyboard': 'الكترونيات واجهزه',
    'watch': 'الكترونيات واجهزه',
    'controller': 'الكترونيات واجهزه',
    'ps_console': 'الكترونيات واجهزه',
    'pc_case': 'الكترونيات واجهزه',

    # ─── أجهزة منزلية (Home Appliances) ───
    'washing_machine': 'أجهزة منزلية',
    'fridge': 'أجهزة منزلية',
    'refrigerator': 'أجهزة منزلية',
    'cooker': 'أجهزة منزلية',
    'stove': 'أجهزة منزلية',
    'microwave': 'أجهزة منزلية',
    'blender': 'أجهزة منزلية',
    'ac_unit': 'أجهزة منزلية',
    'fan': 'أجهزة منزلية',
    'heater': 'أجهزة منزلية',
    'water_heater': 'أجهزة منزلية',
    'iron': 'أجهزة منزلية',
    'vacuum_cleaner': 'أجهزة منزلية',
    'vacuum cleaner': 'أجهزة منزلية',
    'water_filter': 'أجهزة منزلية',
    'gas_cylinder': 'أجهزة منزلية',
    'gas_bottle': 'أجهزة منزلية',
    'freighter': 'أجهزة منزلية',

    # ─── خورده ومعادن (Scrap & Metals) ───
    'korda': 'خورده ومعادن',
    'scrap_metal': 'خورده ومعادن',
    'copper_wire': 'خورده ومعادن',
    'wire': 'خورده ومعادن',
    'aluminum': 'خورده ومعادن',
    'equipment': 'خورده ومعادن',
    'mator': 'خورده ومعادن',

    # ─── سيارات للبيع (Cars) ───
    'car': 'سيارات للبيع',

    # ─── عقارات (Real Estate) ───
    'building': 'عقارات',

    # ─── كتب (Books) ───
    'book': 'كتب',
}

# Build case-insensitive lookup (lowercase key → original Arabic label)
_CATEGORY_MAP_LOWER = {k.lower(): v for k, v in CATEGORY_MAP.items()}

# Map Arabic category labels → Django model category IDs
ARABIC_TO_CATEGORY_ID = {
    'أثاث وديكور': 'furniture',
    'الكترونيات واجهزه': 'electronics',
    'أجهزة منزلية': 'appliances',
    'خورده ومعادن': 'scrap_metals',
    'سيارات للبيع': 'cars',
    'عقارات': 'real_estate',
    'كتب': 'books',
    'أخرى': 'other',
}

# Human-readable Arabic labels for YOLO classes (for agent target dropdown)
YOLO_CLASS_LABELS = {
    # أثاث
    'bed': 'سرير', 'chair': 'كرسي', 'cabinet': 'خزانة',
    'cupboard': 'دولاب', 'curtain': 'ستارة', 'lamp': 'لمبة / أباجورة',
    'mirror': 'مرآة', 'sofa': 'كنبة', 'table': 'طاولة / ترابيزة',
    'wardrobe': 'دولاب ملابس', 'Wardrobe': 'دولاب ملابس',
    'Dressing Table': 'تسريحة', 'food_trip': 'سفرة', 'Food trip': 'سفرة',
    'safe': 'خزنة',
    # الكترونيات
    'laptop': 'لابتوب', 'computer': 'كمبيوتر',
    'mobile_phone': 'موبايل', 'phone': 'موبايل',
    'tv': 'تلفزيون', 'camera': 'كاميرا',
    'headphone': 'سماعات', 'airpods': 'سماعات إيربودز',
    'speaker': 'سبيكر', 'receiver': 'رسيفر',
    'router': 'راوتر', 'printer': 'طابعة',
    'keyboard': 'كيبورد', 'watch': 'ساعة',
    'controller': 'دراعة تحكم', 'ps_console': 'بلايستيشن',
    'pc_case': 'كيسة كمبيوتر',
    # أجهزة منزلية
    'washing_machine': 'غسالة', 'fridge': 'ثلاجة', 'refrigerator': 'ثلاجة',
    'cooker': 'بوتاجاز', 'stove': 'بوتاجاز',
    'microwave': 'ميكروويف', 'blender': 'خلاط',
    'ac_unit': 'تكييف', 'fan': 'مروحة',
    'heater': 'دفاية', 'water_heater': 'سخان مياه',
    'iron': 'مكواة',
    'vacuum_cleaner': 'مكنسة كهربائية', 'vacuum cleaner': 'مكنسة كهربائية',
    'water_filter': 'فلتر مياه',
    'gas_cylinder': 'أنبوبة غاز', 'gas_bottle': 'أنبوبة غاز',
    'freighter': 'ديب فريزر',
    # خردة
    'korda': 'خردة', 'scrap_metal': 'خردة معادن',
    'copper_wire': 'سلك نحاس', 'wire': 'سلك',
    'aluminum': 'ألومنيوم', 'equipment': 'معدات', 'mator': 'موتور',
    # سيارات
    'car': 'سيارة',
    # عقارات
    'building': 'مبنى', 'office': 'مكتب / أوفيس',
    # كتب
    'book': 'كتاب',
}


def get_available_targets():
    """
    Return a list of all YOLO classes the agent can target,
    grouped by their Arabic category, for the frontend dropdown.
    Deduplicates variant names (e.g. wardrobe/Wardrobe → one entry).
    """
    targets = []
    seen = set()  # track lowercase keys to avoid duplicates
    for class_name, arabic_category in CATEGORY_MAP.items():
        key = class_name.lower().replace(' ', '_')
        if key in seen:
            continue
        seen.add(key)
        label = YOLO_CLASS_LABELS.get(class_name, class_name)
        targets.append({
            'id': class_name,
            'label': f"{label} ({arabic_category})",
            'label_ar': label,
            'category': arabic_category,
        })
    return targets


# Lazy-loaded model instance
_model = None


def _lookup_category(class_name: str):
    """Case-insensitive category lookup. Returns Arabic label or None."""
    # Try exact match first
    if class_name in CATEGORY_MAP:
        return CATEGORY_MAP[class_name]
    # Try case-insensitive
    return _CATEGORY_MAP_LOWER.get(class_name.lower())


def classify_image(image_path: str) -> dict:
    """
    Run inference on an image via an external Hugging Face Space API.
    Uses direct HTTP requests to the Gradio REST API for maximum compatibility.
    """
    import requests
    import base64
    import json
    import mimetypes

    fallback = {
        'category': 'other',
        'category_label': 'أخرى',
        'confidence': 0.0,
        'detected_class': None,
    }

    hf_space_url = os.getenv("HF_SPACE_URL", "").strip().rstrip("/")
    if not hf_space_url:
        logger.error("HF_SPACE_URL is not set.")
        return fallback

    # Auto-convert Space ID format (e.g. "Omarh353111/khorda_yolo") to full URL
    if not hf_space_url.startswith("http"):
        # "Omarh353111/khorda_yolo" -> "https://omarh353111-khorda-yolo.hf.space"
        hf_space_url = "https://" + hf_space_url.replace("/", "-").lower() + ".hf.space"
        print(f"[AI] 🔗 Converted Space ID to URL: {hf_space_url}")

    is_url = image_path.startswith("http://") or image_path.startswith("https://")

    try:
        # ── Step 1: Upload image to the HF Space ──
        upload_url = f"{hf_space_url}/upload"

        if is_url:
            # Download the image first (e.g. from Cloudinary)
            img_resp = requests.get(image_path, timeout=30)
            img_resp.raise_for_status()
            img_bytes = img_resp.content
            filename = "image.jpg"
        else:
            with open(image_path, "rb") as f:
                img_bytes = f.read()
            filename = os.path.basename(image_path)

        mime_type = mimetypes.guess_type(filename)[0] or "image/jpeg"
        files = {"files": (filename, img_bytes, mime_type)}
        
        upload_resp = requests.post(upload_url, files=files, timeout=60)
        upload_resp.raise_for_status()
        uploaded_files = upload_resp.json()
        
        # uploaded_files is a list of file paths on the server
        if not uploaded_files or len(uploaded_files) == 0:
            logger.error("HF Space upload returned empty result")
            return fallback
        
        uploaded_path = uploaded_files[0]  # server-side path
        print(f"[AI] 📤 Uploaded to HF Space: {uploaded_path}")

        # ── Step 2: Call the /api/predict endpoint ──
        predict_url = f"{hf_space_url}/api/predict"
        payload = {
            "data": [
                {"path": uploaded_path, "meta": {"_type": "gradio.FileData"}}
            ]
        }

        predict_resp = requests.post(
            predict_url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=120,
        )
        predict_resp.raise_for_status()
        result_json = predict_resp.json()

        print(f"[AI] 📥 HF Space raw response: {json.dumps(result_json, ensure_ascii=False)[:500]}")

        # ── Step 3: Extract the class name from response ──
        # Gradio returns {"data": [output1, output2, ...]}
        data = result_json.get("data", [])
        
        best_class = "other"
        if len(data) >= 2:
            # outputs=[gr.Image, gr.Text] -> data[1] is the text
            best_class = str(data[1]).strip()
        elif len(data) == 1:
            best_class = str(data[0]).strip()

        print(f"[AI] 🔍 Hugging Face API returned YOLO class: '{best_class}'")

        arabic_label = _lookup_category(best_class)

        if not arabic_label:
            logger.warning(f"Unknown class predicted: {best_class}")
            # Try fuzzy match
            for k in CATEGORY_MAP.keys():
                if k.lower() in best_class.lower():
                    arabic_label = CATEGORY_MAP[k]
                    best_class = k
                    break

            if not arabic_label:
                return fallback

        category_id = ARABIC_TO_CATEGORY_ID.get(arabic_label, 'other')
        print(f"[AI] ✅ Result: '{best_class}' → '{arabic_label}' ({category_id})")

        return {
            'category': category_id,
            'category_label': arabic_label,
            'confidence': 0.95,
            'detected_class': best_class,
        }

    except requests.exceptions.Timeout:
        logger.error("HF Space request timed out - Space may be sleeping")
        return fallback
    except requests.exceptions.HTTPError as e:
        logger.error(f"HF Space HTTP error: {e.response.status_code} - {e.response.text[:200]}")
        return fallback
    except Exception as e:
        logger.error(f"Hugging Face inference error: {e}")
        import traceback
        traceback.print_exc()
        return fallback




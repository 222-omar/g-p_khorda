"""
HF Space-based image classifier for product categorization.
Calls the Omarh353111/khorda_yolo HuggingFace Space remotely
instead of loading YOLO/ultralytics locally, avoiding ~300 MB
RAM overhead on Render.
"""

import os
import json
import logging
import requests as http_requests

logger = logging.getLogger(__name__)

# ─── HF Space configuration ─────────────────────────────────
HF_SPACE_URL = os.getenv(
    "HF_SPACE_URL", "https://omarh353111-khorda-yolo.hf.space"
)
HF_API_TOKEN = os.getenv("HF_API_TOKEN", "")



# Map detected YOLO class names (canonicalized) → Arabic category labels
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
    'dressing_table': 'أثاث وديكور',
    'food_trip': 'أثاث وديكور',
    'safe': 'أثاث وديكور',
    'office': 'أثاث وديكور',

    # ─── الكترونيات واجهزه (Electronics & Devices) ───
    'laptop': 'الكترونيات واجهزه',
    'computer': 'الكترونيات واجهزه',
    'mobile_phone': 'الكترونيات واجهزه',
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
    'cooker': 'أجهزة منزلية',
    'microwave': 'أجهزة منزلية',
    'blender': 'أجهزة منزلية',
    'ac_unit': 'أجهزة منزلية',
    'fan': 'أجهزة منزلية',
    'heater': 'أجهزة منزلية',
    'water_heater': 'أجهزة منزلية',
    'iron': 'أجهزة منزلية',
    'vacuum_cleaner': 'أجهزة منزلية',
    'water_filter': 'أجهزة منزلية',
    'gas_cylinder': 'أجهزة منزلية',
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
    'wardrobe': 'دولاب ملابس', 'dressing_table': 'تسريحة', 
    'food_trip': 'سفرة', 'safe': 'خزنة',
    # الكترونيات
    'laptop': 'لابتوب', 'computer': 'كمبيوتر',
    'mobile_phone': 'موبايل', 'tv': 'تلفزيون', 'camera': 'كاميرا',
    'headphone': 'سماعات', 'airpods': 'سماعات إيربودز',
    'speaker': 'سبيكر', 'receiver': 'رسيفر',
    'router': 'راوتر', 'printer': 'طابعة',
    'keyboard': 'كيبورد', 'watch': 'ساعة',
    'controller': 'دراعة تحكم', 'ps_console': 'بلايستيشن',
    'pc_case': 'كيسة كمبيوتر',
    # أجهزة منزلية
    'washing_machine': 'غسالة', 'fridge': 'ثلاجة', 
    'cooker': 'بوتاجاز', 'microwave': 'ميكروويف', 'blender': 'خلاط',
    'ac_unit': 'تكييف', 'fan': 'مروحة',
    'heater': 'دفاية', 'water_heater': 'سخان مياه',
    'iron': 'مكواة', 'vacuum_cleaner': 'مكنسة كهربائية', 
    'water_filter': 'فلتر مياه', 'gas_cylinder': 'أنبوبة غاز', 
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

def normalize_class(class_name: str) -> str:
    """Normalize YOLO raw class to a unified canonical key."""
    if not class_name:
        return 'other'
    
    key = class_name.strip().lower().replace(' ', '_')
    
    # Merge duplicates and synonyms
    unified = {
        'refrigerator': 'fridge',
        'stove': 'cooker',
        'gas_bottle': 'gas_cylinder',
        'phone': 'mobile_phone',
    }
    
    return unified.get(key, key)


def get_available_targets():
    """
    Return a list of all YOLO classes the agent can target,
    grouped by their Arabic category, for the frontend dropdown.
    """
    targets = []
    for class_name, arabic_category in CATEGORY_MAP.items():
        label = YOLO_CLASS_LABELS.get(class_name, class_name)
        targets.append({
            'id': class_name,
            'label': f"{label} ({arabic_category})",
            'label_ar': label,
            'category': arabic_category,
        })
    return targets


def guess_item_from_text(text: str) -> str:
    """
    Fallback: If YOLO fails or HF space is down, try to guess the class from the product title.
    Matches Arabic words in the title to the YOLO classes.
    """
    if not text:
        return None
        
    text_lower = text.lower()
    
    # First check exact English keys
    for key in CATEGORY_MAP.keys():
        if key.lower() in text_lower:
            return key
            
    # Then check Arabic labels
    for key, ar_label in YOLO_CLASS_LABELS.items():
        # Split by " / " for labels like 'طاولة / ترابيزة'
        labels = [l.strip() for l in ar_label.split('/')]
        for label in labels:
            if label and label in text_lower:
                return key
                
    return None

def _lookup_category(class_name: str):
    """Case-insensitive category lookup. Returns Arabic label or None."""
    return CATEGORY_MAP.get(class_name)


# ─────────────────────────────────────────────────────────────
# HF Space API helpers
# ─────────────────────────────────────────────────────────────

def _hf_headers(content_type=None):
    """Build HTTP headers for HF Space requests."""
    headers = {}
    if HF_API_TOKEN:
        headers["Authorization"] = f"Bearer {HF_API_TOKEN}"
    if content_type:
        headers["Content-Type"] = content_type
    return headers


def _upload_to_space(image_bytes: bytes, filename: str = "image.jpg") -> str:
    """
    Upload image bytes to the HF Space and return the server-side path.
    Uses the Gradio /gradio_api/upload endpoint.
    """
    upload_url = f"{HF_SPACE_URL}/gradio_api/upload"
    resp = http_requests.post(
        upload_url,
        files={"files": (filename, image_bytes, "image/jpeg")},
        headers=_hf_headers(),
        timeout=30,
    )
    resp.raise_for_status()
    paths = resp.json()
    if paths and isinstance(paths, list):
        return paths[0]
    raise ValueError(f"Unexpected upload response: {paths}")


def _predict_on_space(uploaded_path: str) -> str | None:
    """
    Call /gradio_api/call/predict with the uploaded file path,
    then read the SSE stream for the result.

    Returns the detected class string (e.g. "bed", "laptop", "other")
    or None on failure.
    """
    predict_url = f"{HF_SPACE_URL}/gradio_api/call/predict"
    input_data = {
        "path": uploaded_path,
        "meta": {"_type": "gradio.FileData"},
    }

    # Step 1 — Start the prediction
    resp = http_requests.post(
        predict_url,
        json={"data": [input_data]},
        headers=_hf_headers("application/json"),
        timeout=60,
    )
    resp.raise_for_status()
    event_id = resp.json().get("event_id")
    if not event_id:
        logger.error(f"[AI] HF Space returned no event_id: {resp.text}")
        return None

    # Step 2 — Read the SSE result stream
    result_url = f"{predict_url}/{event_id}"
    sse_resp = http_requests.get(
        result_url,
        stream=True,
        headers=_hf_headers(),
        timeout=120,
    )

    event_type = None
    for line in sse_resp.iter_lines(decode_unicode=True):
        line = line.strip()
        if line.startswith("event:"):
            event_type = line[len("event:"):].strip()
        elif line.startswith("data:") and event_type == "complete":
            data_str = line[len("data:"):].strip()
            if not data_str or data_str == "null":
                return None
            data = json.loads(data_str)
            # The Space returns: [<annotated_image_dict>, "<class_name>"]
            if isinstance(data, list) and len(data) >= 2:
                detected = data[-1]  # last element is the class string
                if isinstance(detected, str):
                    return detected
            return None
        elif event_type == "error":
            logger.error(f"[AI] HF Space prediction error (SSE): {line}")
            return None

    return None


# ─────────────────────────────────────────────────────────────
# Public API  (same signature as the old local-YOLO version)
# ─────────────────────────────────────────────────────────────

def classify_image(image_path: str) -> dict:
    """
    Classify a product image via the remote HF Space YOLO model.
    Supports both local file paths and remote URLs (Cloudinary, etc.).

    Returns a dict with keys:
        category, category_label, confidence, detected_class
    """

    fallback = {
        'category': 'other',
        'category_label': 'أخرى',
        'confidence': 0.0,
        'detected_class': None,
    }

    try:
        is_url = image_path.startswith("http://") or image_path.startswith("https://")

        # ── Step 1: Get image bytes ──────────────────────────
        if is_url:
            print(f"[AI] [OUT] Downloading image from URL: {image_path[:80]}...")
            dl = http_requests.get(image_path, timeout=15)
            dl.raise_for_status()
            image_bytes = dl.content
            filename = "image.jpg"
        else:
            with open(image_path, "rb") as f:
                image_bytes = f.read()
            filename = os.path.basename(image_path)

        # ── Step 2: Upload to HF Space ───────────────────────
        print(f"[AI] [UP] Uploading to HF Space ({HF_SPACE_URL})...")
        uploaded_path = _upload_to_space(image_bytes, filename)
        print(f"[AI] [UP] Uploaded -> {uploaded_path}")

        # ── Step 3: Run prediction ───────────────────────────
        print("[AI] [RUN] Running YOLO inference on HF Space...")
        detected_class = _predict_on_space(uploaded_path)

        if not detected_class or detected_class == "other":
            logger.warning(
                f"[AI] HF Space returned '{detected_class}'. Falling back."
            )
            return fallback

        # ── Step 4: Normalize & map to category ──────────────
        normalized = normalize_class(detected_class)
        print(
            f"[AI] [SEARCH] HF Space detected: '{detected_class}' "
            f"-> Normalized: '{normalized}'"
        )

        arabic_label = _lookup_category(normalized)
        if not arabic_label:
            logger.warning(
                f"[AI] Unknown class: '{normalized}', trying fuzzy match..."
            )
            for k in CATEGORY_MAP:
                if k in normalized:
                    arabic_label = CATEGORY_MAP[k]
                    normalized = k
                    break
            if not arabic_label:
                return fallback

        category_id = ARABIC_TO_CATEGORY_ID.get(arabic_label, "other")
        print(f"[AI] [OK] Result: '{normalized}' -> category='{category_id}'")

        return {
            'category': category_id,
            'category_label': arabic_label,
            'confidence': 1.0,          # HF Space doesn't return a score
            'detected_class': normalized,
        }

    except Exception as e:
        logger.error(f"[AI] HF Space inference error: {e}")
        import traceback
        traceback.print_exc()
        return fallback

"""
YOLO-based image classifier for product categorization.
Uses a custom YOLOv11 model (best.pt) to detect objects in product images
and map them to marketplace categories.
"""

import os
import json
import logging
import mimetypes
from pathlib import Path

import requests

logger = logging.getLogger(__name__)

# Path to the YOLO model
MODEL_PATH = Path(__file__).resolve().parent.parent.parent / 'ai' / 'best.pt'

# ──────────────────────────────────────────────
# CATEGORY MAP  (canonical snake_case keys only)
# Synonyms/variants are handled in normalize_class()
# ──────────────────────────────────────────────
CATEGORY_MAP = {
    # ─── أثاث وديكور (Furniture & Decor) ───
    'bed':            'أثاث وديكور',
    'chair':          'أثاث وديكور',
    'cabinet':        'أثاث وديكور',
    'cupboard':       'أثاث وديكور',
    'curtain':        'أثاث وديكور',
    'lamp':           'أثاث وديكور',
    'mirror':         'أثاث وديكور',
    'sofa':           'أثاث وديكور',
    'table':          'أثاث وديكور',
    'wardrobe':       'أثاث وديكور',
    'dressing_table': 'أثاث وديكور',
    'food_trip':      'أثاث وديكور',
    'safe':           'أثاث وديكور',
    'office':         'أثاث وديكور',

    # ─── الكترونيات واجهزه (Electronics & Devices) ───
    'laptop':      'الكترونيات واجهزه',
    'computer':    'الكترونيات واجهزه',
    'mobile_phone':'الكترونيات واجهزه',
    'tv':          'الكترونيات واجهزه',
    'camera':      'الكترونيات واجهزه',
    'headphone':   'الكترونيات واجهزه',
    'airpods':     'الكترونيات واجهزه',
    'speaker':     'الكترونيات واجهزه',
    'receiver':    'الكترونيات واجهزه',
    'router':      'الكترونيات واجهزه',
    'printer':     'الكترونيات واجهزه',
    'keyboard':    'الكترونيات واجهزه',
    'watch':       'الكترونيات واجهزه',
    'controller':  'الكترونيات واجهزه',
    'ps_console':  'الكترونيات واجهزه',
    'pc_case':     'الكترونيات واجهزه',

    # ─── أجهزة منزلية (Home Appliances) ───
    'washing_machine': 'أجهزة منزلية',
    'fridge':          'أجهزة منزلية',
    'cooker':          'أجهزة منزلية',
    'microwave':       'أجهزة منزلية',
    'blender':         'أجهزة منزلية',
    'ac_unit':         'أجهزة منزلية',
    'fan':             'أجهزة منزلية',
    'heater':          'أجهزة منزلية',
    'water_heater':    'أجهزة منزلية',
    'iron':            'أجهزة منزلية',
    'vacuum_cleaner':  'أجهزة منزلية',
    'water_filter':    'أجهزة منزلية',
    'gas_cylinder':    'أجهزة منزلية',
    'freighter':       'أجهزة منزلية',

    # ─── خورده ومعادن (Scrap & Metals) ───
    'korda':       'خورده ومعادن',
    'scrap_metal': 'خورده ومعادن',
    'copper_wire': 'خورده ومعادن',
    'wire':        'خورده ومعادن',
    'aluminum':    'خورده ومعادن',
    'equipment':   'خورده ومعادن',
    'mator':       'خورده ومعادن',

    # ─── سيارات للبيع (Cars) ───
    'car': 'سيارات للبيع',

    # ─── عقارات (Real Estate) ───
    'building': 'عقارات',

    # ─── كتب (Books) ───
    'book': 'كتب',
}

# Map Arabic category labels → Django model category IDs
ARABIC_TO_CATEGORY_ID = {
    'أثاث وديكور':      'furniture',
    'الكترونيات واجهزه': 'electronics',
    'أجهزة منزلية':     'appliances',
    'خورده ومعادن':     'scrap_metals',
    'سيارات للبيع':     'cars',
    'عقارات':           'real_estate',
    'كتب':              'books',
    'أخرى':             'other',
}

# Human-readable Arabic labels for YOLO classes (for agent target dropdown)
YOLO_CLASS_LABELS = {
    # أثاث
    'bed':            'سرير',
    'chair':          'كرسي',
    'cabinet':        'خزانة',
    'cupboard':       'دولاب',
    'curtain':        'ستارة',
    'lamp':           'لمبة / أباجورة',
    'mirror':         'مرآة',
    'sofa':           'كنبة',
    'table':          'طاولة / ترابيزة',
    'wardrobe':       'دولاب ملابس',
    'dressing_table': 'تسريحة',
    'food_trip':      'سفرة',
    'safe':           'خزنة',
    # الكترونيات
    'laptop':      'لابتوب',
    'computer':    'كمبيوتر',
    'mobile_phone':'موبايل',
    'tv':          'تلفزيون',
    'camera':      'كاميرا',
    'headphone':   'سماعات',
    'airpods':     'سماعات إيربودز',
    'speaker':     'سبيكر',
    'receiver':    'رسيفر',
    'router':      'راوتر',
    'printer':     'طابعة',
    'keyboard':    'كيبورد',
    'watch':       'ساعة',
    'controller':  'دراعة تحكم',
    'ps_console':  'بلايستيشن',
    'pc_case':     'كيسة كمبيوتر',
    # أجهزة منزلية
    'washing_machine': 'غسالة',
    'fridge':          'ثلاجة',
    'cooker':          'بوتاجاز',
    'microwave':       'ميكروويف',
    'blender':         'خلاط',
    'ac_unit':         'تكييف',
    'fan':             'مروحة',
    'heater':          'دفاية',
    'water_heater':    'سخان مياه',
    'iron':            'مكواة',
    'vacuum_cleaner':  'مكنسة كهربائية',
    'water_filter':    'فلتر مياه',
    'gas_cylinder':    'أنبوبة غاز',
    'freighter':       'ديب فريزر',
    # خردة
    'korda':       'خردة',
    'scrap_metal': 'خردة معادن',
    'copper_wire': 'سلك نحاس',
    'wire':        'سلك',
    'aluminum':    'ألومنيوم',
    'equipment':   'معدات',
    'mator':       'موتور',
    # سيارات
    'car': 'سيارة',
    # عقارات
    'building': 'مبنى',
    'office':   'مكتب / أوفيس',
    # كتب
    'book': 'كتاب',
}

# ──────────────────────────────────────────────
# Keyword map: Egyptian Arabic text → canonical class
# Used as a fallback when YOLO fails
# ──────────────────────────────────────────────
_KEYWORD_MAP = {
    # Appliances
    'غساله': 'washing_machine', 'غسال': 'washing_machine', 'اوتوماتيك': 'washing_machine',
    'ثلاجه': 'fridge', 'تلاجه': 'fridge',
    'بوتاجاز': 'cooker', 'فرن': 'cooker',
    'ميكروويف': 'microwave', 'ميكرويف': 'microwave', 'ميكروف': 'microwave', 'مكرويف': 'microwave', 'مكروويف': 'microwave',
    'خلاط': 'blender',
    'تكييف': 'ac_unit', 'تكيف': 'ac_unit',
    'مروحه': 'fan',
    'دفايه': 'heater', 'سخان': 'water_heater',
    'مكواه': 'iron', 'مكنسه': 'vacuum_cleaner',
    'فلتر': 'water_filter', 'ديب فريزر': 'freighter',
    # Electronics (product types first, brands last)
    'تلفزيون': 'tv', 'شاشه': 'tv', 'تليفزيون': 'tv',
    'لابتوب': 'laptop', 'لاب': 'laptop', 'كمبيوتر': 'computer',
    'موبايل': 'mobile_phone', 'تليفون': 'mobile_phone',
    'كاميرا': 'camera', 'سماعه': 'headphone', 'ايربودز': 'airpods',
    'سبيكر': 'speaker', 'رسيفر': 'receiver', 'راوتر': 'router',
    'طابعه': 'printer', 'برنتر': 'printer',
    'ساعه': 'watch', 'بلايستيشن': 'ps_console', 'ps': 'ps_console',
    'كيسه': 'pc_case',
    'ايفون': 'mobile_phone', 'سامسونج': 'mobile_phone',
    # Furniture
    'سرير': 'bed', 'كرسي': 'chair', 'كنبه': 'sofa', 'انتريه': 'sofa',
    'طاوله': 'table', 'ترابيزه': 'table', 'مكتب': 'office',
    'دولاب': 'wardrobe', 'خزنه': 'safe', 'خزانه': 'cabinet',
    'ستاره': 'curtain', 'مرايه': 'mirror', 'نجفه': 'lamp', 'اباجوره': 'lamp',
    'سفره': 'food_trip', 'تسريحه': 'dressing_table',
    # Cars / Real Estate / Books
    'عربيه': 'car', 'سياره': 'car',
    'شقه': 'building', 'عقار': 'building',
    'كتاب': 'book',
    # Scrap
    'خرده': 'korda', 'نحاس': 'copper_wire', 'المنيوم': 'aluminum', 'موتور': 'mator',
}


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

def _normalize_arabic(text: str) -> str:
    """Normalize Arabic text: taa marbuta, alef variants, etc."""
    if not text:
        return ""
    t = text
    t = t.replace('ة', 'ه')
    t = t.replace('أ', 'ا')
    t = t.replace('إ', 'ا')
    t = t.replace('آ', 'ا')
    t = t.replace('ى', 'ي')
    t = t.replace('ؤ', 'و')
    t = t.replace('ئ', 'ي')
    return t.strip()


def normalize_class(class_name: str) -> str:
    """
    Normalize a raw YOLO class name to a canonical key present in CATEGORY_MAP.
    Handles case, spaces, and known synonym variants.
    """
    if not class_name:
        return 'other'

    key = class_name.strip().lower().replace(' ', '_')

    # Merge synonyms → canonical key
    _SYNONYMS = {
        'refrigerator':  'fridge',
        'stove':         'cooker',
        'gas_bottle':    'gas_cylinder',
        'phone':         'mobile_phone',
        'wardrobe':      'wardrobe',   # already canonical
        'vacuum_cleaner':'vacuum_cleaner',
    }

    return _SYNONYMS.get(key, key)


def _lookup_category(class_name: str) -> str | None:
    """Return Arabic category label for a canonical class key, or None."""
    return CATEGORY_MAP.get(class_name)


def get_available_targets() -> list[dict]:
    """
    Return all YOLO classes the agent can target,
    for the frontend dropdown — no duplicates.
    """
    return [
        {
            'id':        class_name,
            'label':     f"{YOLO_CLASS_LABELS.get(class_name, class_name)} ({arabic_category})",
            'label_ar':  YOLO_CLASS_LABELS.get(class_name, class_name),
            'category':  arabic_category,
        }
        for class_name, arabic_category in CATEGORY_MAP.items()
    ]


def guess_item_from_text(text: str) -> str | None:
    """
    Fallback: guess YOLO class from product title using Egyptian Arabic keywords.
    Falls back to English key matching, then Arabic label matching.
    """
    if not text:
        return None

    text_norm = _normalize_arabic(text.lower())

    # 1. Egyptian Arabic keyword map (normalized)
    for keyword, yolo_class in _KEYWORD_MAP.items():
        if _normalize_arabic(keyword) in text_norm:
            logger.info(f"[TextGuess] Keyword '{keyword}' → '{yolo_class}'")
            return yolo_class

    # 2. English canonical keys
    text_lower = text.lower()
    for key in CATEGORY_MAP:
        if key in text_lower:
            return key

    # 3. Arabic YOLO labels (normalized, handles "طاولة / ترابيزة" style)
    for key, ar_label in YOLO_CLASS_LABELS.items():
        for label in (l.strip() for l in ar_label.split('/')):
            if label and _normalize_arabic(label) in text_norm:
                logger.info(f"[TextGuess] Label '{label}' → '{key}'")
                return key

    return None


# ──────────────────────────────────────────────
# Main classifier
# ──────────────────────────────────────────────

_FALLBACK = {
    'category':       'other',
    'category_label': 'أخرى',
    'confidence':     0.0,
    'detected_class': None,
}

_DEFAULT_HF_URL = "https://omarh353111-khorda-yolo.hf.space"


def _resolve_hf_url() -> str:
    url = os.getenv("HF_SPACE_URL", "").strip().rstrip("/")
    if not url:
        return _DEFAULT_HF_URL
    if not url.startswith("http"):
        # Convert "User/space_name" → full URL
        url = "https://" + url.replace("/", "-").replace("_", "-").lower() + ".hf.space"
    return url


def classify_image(image_path: str) -> dict:
    """
    Run inference via an external Hugging Face Space (Gradio REST API).
    Returns a dict with category, category_label, confidence, detected_class.
    """
    hf_space_url = _resolve_hf_url()
    logger.info(f"[AI] Using HF Space: {hf_space_url}")

    is_url = image_path.startswith(("http://", "https://"))
    temp_path = None

    try:
        # ── Step 1: Prepare image payload ──
        if is_url:
            try:
                logger.info(f"[AI] Downloading image URL: {image_path}")
                resp = requests.get(image_path, timeout=30)
                resp.raise_for_status()
                import tempfile
                with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
                    tmp.write(resp.content)
                    temp_path = tmp.name
                image_path = temp_path
                is_url = False
            except Exception as e:
                logger.error(f"[AI] Failed to download image URL {image_path}: {e}")

        if not is_url:
            upload_url = f"{hf_space_url}/gradio_api/upload"
            filename  = os.path.basename(image_path)
            mime_type = mimetypes.guess_type(filename)[0] or "image/jpeg"

            with open(image_path, "rb") as f:
                img_bytes = f.read()

            upload_resp = requests.post(
                upload_url,
                files={"files": (filename, img_bytes, mime_type)},
                timeout=30,
            )
            upload_resp.raise_for_status()
            uploaded_files = upload_resp.json()

            if not uploaded_files:
                logger.error("HF Space upload returned empty result")
                return _FALLBACK

            uploaded_path = uploaded_files[0]
            logger.info(f"[AI] Uploaded to HF Space: {uploaded_path}")
            # Use robust complete Gradio file payload
            image_data = {
                "path": uploaded_path,
                "url": f"{hf_space_url}/file={uploaded_path}",
                "orig_name": filename,
                "mime_type": mime_type,
                "meta": {"_type": "gradio.FileData"}
            }
        else:
            image_data = {"url": image_path, "meta": {"_type": "gradio.FileData"}}
            logger.info(f"[AI] Sending URL: {image_path[:80]}...")

        # ── Step 2: Submit prediction ──
        predict_resp = requests.post(
            f"{hf_space_url}/gradio_api/call/predict",
            json={"data": [image_data]},
            headers={"Content-Type": "application/json"},
            timeout=30,
        )
        predict_resp.raise_for_status()
        event_id = predict_resp.json().get("event_id")

        if not event_id:
            logger.error(f"No event_id in response: {predict_resp.json()}")
            return _FALLBACK

        logger.info(f"[AI] event_id: {event_id}")

        # ── Step 3: Poll result (SSE) ──
        result_resp = requests.get(
            f"{hf_space_url}/gradio_api/call/predict/{event_id}",
            timeout=60,
            stream=True,
        )
        result_resp.raise_for_status()

        result_data = None
        current_event = None
        
        # Read SSE stream and break early as soon as complete or error event is received
        for line in result_resp.iter_lines(decode_unicode=True):
            if not line:
                continue
            
            if line.startswith("event:"):
                current_event = line[6:].strip()
            elif line.startswith("data:"):
                data_str = line[5:].strip()
                if current_event == "complete":
                    try:
                        result_data = json.loads(data_str)
                        logger.info("[AI] Received complete event from SSE stream")
                        break
                    except json.JSONDecodeError:
                        pass
                elif current_event == "error":
                    logger.error(f"[AI] Received error event from SSE stream: {data_str}")
                    break
                elif current_event == "heartbeat":
                    # Just a heartbeat, keep waiting
                    continue

        if not result_data:
            logger.error("No result data from HF Space SSE stream")
            return _FALLBACK

        logger.debug(f"[AI] Raw response: {json.dumps(result_data, ensure_ascii=False)[:500]}")

        # ── Step 4: Extract class name ──
        data = result_data if isinstance(result_data, list) else result_data.get("data", [result_data])

        raw_class = "other"
        if len(data) >= 2:
            raw_class = str(data[1]).strip() if not isinstance(data[1], dict) else "other"
        elif len(data) == 1:
            raw_class = str(data[0]).strip() if not isinstance(data[0], dict) else "other"

        # ── Step 5: Normalize & resolve category ──
        canonical = normalize_class(raw_class)
        logger.info(f"[AI] YOLO raw='{raw_class}' → canonical='{canonical}'")

        arabic_label = _lookup_category(canonical)

        if not arabic_label:
            # Fuzzy fallback: substring match
            for k in CATEGORY_MAP:
                if k in canonical or canonical in k:
                    arabic_label = CATEGORY_MAP[k]
                    canonical = k
                    break

        if not arabic_label:
            logger.warning(f"[AI] Unknown class: '{canonical}' — returning fallback")
            return _FALLBACK

        category_id = ARABIC_TO_CATEGORY_ID.get(arabic_label, 'other')
        logger.info(f"[AI] Result: '{canonical}' → '{arabic_label}' ({category_id})")

        return {
            'category':          category_id,
            'category_label':    arabic_label,
            'confidence':        0.95,
            'detected_class':    canonical,
            'detected_class_ar': YOLO_CLASS_LABELS.get(canonical, canonical),
        }

    except requests.exceptions.Timeout:
        logger.error("HF Space timed out — Space may be sleeping")
        return _FALLBACK
    except requests.exceptions.HTTPError as e:
        logger.error(f"HF Space HTTP error: {e.response.status_code} — {e.response.text[:200]}")
        return _FALLBACK
    except Exception as e:
        logger.exception(f"HF Space inference error: {e}")
        return _FALLBACK
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
                logger.info(f"[AI] Cleaned up temporary image file {temp_path}")
            except Exception as e:
                logger.warning(f"[AI] Failed to clean up temp image file {temp_path}: {e}")
"""
YOLO-based image classifier for product categorization.
Uses a custom YOLOv11 model (best.pt) to detect objects in product images
and map them to marketplace categories.
"""

import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)



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


# ─── Path to the YOLO model file ───
MODEL_PATH = Path(__file__).resolve().parent / 'best.pt'

# Lazy-loaded model instance
_model = None


def _load_model():
    """Load the YOLO model once and cache it."""
    global _model
    if _model is None:
        try:
            from ultralytics import YOLO
            if not MODEL_PATH.exists():
                raise FileNotFoundError(f"YOLO model not found at: {MODEL_PATH}")
            logger.info(f"[AI] Loading YOLO model from: {MODEL_PATH}")
            _model = YOLO(str(MODEL_PATH))
            logger.info("[AI] YOLO model loaded successfully.")
        except Exception as e:
            logger.error(f"[AI] Failed to load YOLO model: {e}")
            raise
    return _model


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


def classify_image(image_path: str) -> dict:
    """
    Run local YOLO inference on an image using best.pt.
    Supports both local file paths and remote URLs (Cloudinary, etc.).
    """
    import requests
    import tempfile

    fallback = {
        'category': 'other',
        'category_label': 'أخرى',
        'confidence': 0.0,
        'detected_class': None,
    }

    tmp_path = None
    is_url = image_path.startswith("http://") or image_path.startswith("https://")

    try:
        # ── Step 1: Download image if it's a URL (e.g. Cloudinary) ──
        if is_url:
            print(f"[AI] [OUT] Downloading image from URL: {image_path[:80]}...")
            resp = requests.get(image_path, timeout=30)
            resp.raise_for_status()
            suffix = '.jpg'
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix, mode='wb') as tmp:
                tmp.write(resp.content)
                tmp_path = tmp.name
            local_path = tmp_path
        else:
            local_path = image_path

        # ── Step 2: Load model and run inference ──
        model = _load_model()
        print(f"[AI] [RUN] Running YOLO inference on: {local_path}")
        results = model(local_path, verbose=False)

        # ── Step 3: Extract best detection ──
        best_class = None
        best_conf = 0.0

        for result in results:
            if result.boxes is None or len(result.boxes) == 0:
                continue
            for box in result.boxes:
                conf = float(box.conf[0])
                cls_idx = int(box.cls[0])
                cls_name = model.names[cls_idx]
                if conf > best_conf:
                    best_conf = conf
                    best_class = cls_name

        if not best_class or best_conf < 0.15:
            logger.warning(f"[AI] No reliable detection (best_conf={best_conf:.2f}). Falling back.")
            return fallback

        normalized_class = normalize_class(best_class)
        print(f"[AI] [SEARCH] YOLO detected: '{best_class}' -> Normalized: '{normalized_class}' (conf={best_conf:.2f})")

        # ── Step 4: Map to Arabic category ──
        arabic_label = _lookup_category(normalized_class)

        if not arabic_label:
            logger.warning(f"[AI] Unknown class: '{normalized_class}', trying fuzzy match...")
            for k in CATEGORY_MAP.keys():
                if k in normalized_class:
                    arabic_label = CATEGORY_MAP[k]
                    normalized_class = k
                    break
            if not arabic_label:
                return fallback

        category_id = ARABIC_TO_CATEGORY_ID.get(arabic_label, 'other')
        print(f"[AI] [OK] Result: '{normalized_class}' -> category='{category_id}' conf={best_conf:.2f}")

        return {
            'category': category_id,
            'category_label': arabic_label,
            'confidence': round(best_conf, 4),
            'detected_class': normalized_class,
        }

    except FileNotFoundError as e:
        logger.error(f"[AI] Model file not found: {e}")
        return fallback
    except Exception as e:
        logger.error(f"[AI] Local YOLO inference error: {e}")
        import traceback
        traceback.print_exc()
        return fallback
    finally:
        # Clean up temp file if we downloaded a URL
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass




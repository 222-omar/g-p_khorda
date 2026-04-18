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
    'office': 'عقارات',

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
    """
    fallback = {
        'category': 'other',
        'category_label': 'أخرى',
        'confidence': 0.0,
        'detected_class': None,
    }

    hf_space_url = os.getenv("HF_SPACE_URL")
    if not hf_space_url:
        logger.error("HF_SPACE_URL is not set.")
        return fallback

    # If the image path is actually a Cloudinary URL, gradio_client can handle it directly!
    # Sometimes image.path raises NotImplementedError, so we fallback to image.url
    is_url = image_path.startswith("http://") or image_path.startswith("https://")

    try:
        from gradio_client import Client, handle_file
        
        # Connect to HF Space API
        client = Client(hf_space_url)
        
        target_file = handle_file(image_path)
        
        result_class = client.predict(
            image=target_file,
            api_name="/predict"
        )
        
        best_class = str(result_class).strip()
        
        print(f"[AI] 🔍 Hugging Face API returned YOLO class: '{best_class}'")
        
        arabic_label = _lookup_category(best_class)
        
        if not arabic_label:
            logger.warning(f"Unknown class predicted: {best_class}")
            return fallback

        category_id = ARABIC_TO_CATEGORY_ID.get(arabic_label, 'other')
        print(f"[AI] ✅ Result: '{best_class}' → '{arabic_label}' ({category_id})")

        return {
            'category': category_id,
            'category_label': arabic_label,
            'confidence': 0.95, # Mock confidence for external API
            'detected_class': best_class,
        }

    except Exception as e:
        logger.error(f"Hugging Face inference error: {e}")
        return fallback




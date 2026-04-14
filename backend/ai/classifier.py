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
CATEGORY_MAP = {
    'bed': 'أثاث وديكور', 'chair': 'أثاث وديكور', 'cabinet': 'أثاث وديكور',
    'cupboard': 'أثاث وديكور', 'curtain': 'أثاث وديكور', 'lamp': 'أثاث وديكور',
    'mirror': 'أثاث وديكور', 'Dressing Table': 'أثاث وديكور', 'Food trip': 'أثاث وديكور',
    'sofa': 'أثاث وديكور', 'table': 'أثاث وديكور', 'wardrobe': 'أثاث وديكور',

    'computer': 'الكترونيات واجهزه', 'laptop': 'الكترونيات واجهزه',
    'headphone': 'الكترونيات واجهزه', 'ac_unit': 'الكترونيات واجهزه',
    'blender': 'الكترونيات واجهزه', 'fan': 'الكترونيات واجهزه',
    'heater': 'الكترونيات واجهزه', 'microwave': 'الكترونيات واجهزه',
    'freighter': 'الكترونيات واجهزه', 'iron': 'الكترونيات واجهزه',
    'tv': 'الكترونيات واجهزه', 'oven': 'الكترونيات واجهزه', 'refrigerator': 'الكترونيات واجهزه',
    'washing_machine': 'الكترونيات واجهزه',

    'korda': 'خورده ومعادن', 'copper_wire': 'خورده ومعادن',
    'aluminum': 'خورده ومعادن', 'equipment': 'خورده ومعادن',
    'scrap_metal': 'خورده ومعادن', 'plastic_waste': 'خورده ومعادن',
    'motor_scrap': 'خورده ومعادن',

    'car': 'سيارات للبيع', 'truck': 'سيارات للبيع',
    'bus': 'سيارات للبيع', 'motorcycle': 'سيارات للبيع',

    'building': 'عقارات', 'house': 'عقارات',

    'book': 'كتب',
}

# Build case-insensitive lookup (lowercase key → original Arabic label)
_CATEGORY_MAP_LOWER = {k.lower(): v for k, v in CATEGORY_MAP.items()}

# Map Arabic category labels → Django model category IDs
ARABIC_TO_CATEGORY_ID = {
    'أثاث وديكور': 'furniture',
    'الكترونيات واجهزه': 'electronics',
    'خورده ومعادن': 'scrap_metals',
    'سيارات للبيع': 'cars',
    'عقارات': 'real_estate',
    'كتب': 'books',
    'أخرى': 'other',
}

# Human-readable labels for YOLO classes (for the agent target dropdown)
YOLO_CLASS_LABELS = {
    'bed': 'سرير', 'chair': 'كرسي', 'cabinet': 'خزانة',
    'cupboard': 'دولاب', 'curtain': 'ستارة', 'lamp': 'لمبة / أباجورة',
    'mirror': 'مرآة', 'Dressing Table': 'تسريحة', 'Food trip': 'سفرة',
    'sofa': 'كنبة', 'table': 'طاولة', 'wardrobe': 'دولاب ملابس',
    'computer': 'كمبيوتر', 'laptop': 'لابتوب',
    'headphone': 'سماعات', 'ac_unit': 'تكييف',
    'blender': 'خلاط', 'fan': 'مروحة',
    'heater': 'دفاية', 'microwave': 'ميكروويف',
    'freighter': 'شاحنة صغيرة', 'iron': 'مكواة',
    'tv': 'تلفزيون', 'oven': 'فرن', 'refrigerator': 'ثلاجة',
    'washing_machine': 'غسالة',
    'korda': 'خردة', 'copper_wire': 'سلك نحاس',
    'aluminum': 'ألومنيوم', 'equipment': 'معدات',
    'scrap_metal': 'خردة معادن', 'plastic_waste': 'بلاستيك مستعمل',
    'motor_scrap': 'موتور خردة',
    'car': 'سيارة', 'truck': 'نقل', 'bus': 'أتوبيس', 'motorcycle': 'موتوسيكل',
    'building': 'مبنى', 'house': 'منزل',
    'book': 'كتاب',
}


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




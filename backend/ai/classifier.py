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

# Lazy-loaded model instance
_model = None


def _get_model():
    """Lazy-load the YOLO model to avoid startup overhead."""
    global _model
    if _model is None:
        try:
            from ultralytics import YOLO
            if not MODEL_PATH.exists():
                logger.error(f"YOLO model not found at {MODEL_PATH}")
                return None
            _model = YOLO(str(MODEL_PATH))
            print(f"[AI] ✅ YOLO model loaded from {MODEL_PATH}")
        except ImportError:
            logger.error("ultralytics package not installed. Run: pip install ultralytics")
            return None
        except Exception as e:
            logger.error(f"Failed to load YOLO model: {e}")
            return None
    return _model


def _lookup_category(class_name: str):
    """Case-insensitive category lookup. Returns Arabic label or None."""
    # Try exact match first
    if class_name in CATEGORY_MAP:
        return CATEGORY_MAP[class_name]
    # Try case-insensitive
    return _CATEGORY_MAP_LOWER.get(class_name.lower())


def classify_image(image_path: str) -> dict:
    """
    Run YOLO inference on an image and return the predicted category.
    
    Strategy:
    1. Get all detections from YOLO
    2. For each detection, calculate box area and check if class is in our map
    3. Among KNOWN classes only, pick the one with largest (area * confidence)
    4. If no known class found, return fallback 'أخرى'
    
    This ensures the main/largest product in the image gets classified
    correctly, even if there are small background objects detected.
    """
    fallback = {
        'category': 'other',
        'category_label': 'أخرى',
        'confidence': 0.0,
        'detected_class': None,
    }

    model = _get_model()
    if model is None:
        return fallback

    try:
        results = model(image_path, verbose=False)

        if not results or len(results) == 0:
            print("[AI] ⚠️ YOLO returned no results")
            return fallback

        result = results[0]

        if result.boxes is None or len(result.boxes) == 0:
            print("[AI] ⚠️ YOLO detected no boxes")
            return fallback

        # Extract all detections
        confidences = result.boxes.conf.cpu().numpy()
        class_ids = result.boxes.cls.cpu().numpy().astype(int)
        boxes = result.boxes.xyxy.cpu().numpy()  # [x1, y1, x2, y2]

        # Log all detections for debugging
        all_detections = []
        for i in range(len(confidences)):
            cls_name = result.names.get(int(class_ids[i]), '???')
            conf = float(confidences[i])
            x1, y1, x2, y2 = boxes[i]
            area = (x2 - x1) * (y2 - y1)
            all_detections.append((cls_name, conf, area))

        print(f"[AI] 🔍 YOLO detections ({len(all_detections)} total):")
        for name, conf, area in all_detections:
            in_map = '✅' if _lookup_category(name) else '❌'
            print(f"  {in_map} '{name}' conf={conf:.2f} area={area:.0f}px²")

        # Score each detection: prioritize KNOWN classes with large boxes
        best_score = -1
        best_class_name = None
        best_confidence = 0.0
        best_arabic = None

        for i in range(len(confidences)):
            cls_name = result.names.get(int(class_ids[i]), None)
            if cls_name is None:
                continue

            arabic_label = _lookup_category(cls_name)
            if arabic_label is None:
                # Class not in our map — skip it
                logger.debug(f"  Skipping unknown class: '{cls_name}'")
                continue

            conf = float(confidences[i])
            x1, y1, x2, y2 = boxes[i]
            area = (x2 - x1) * (y2 - y1)

            # Score = area * confidence (bigger + more confident = better)
            score = area * conf

            if score > best_score:
                best_score = score
                best_class_name = cls_name
                best_confidence = conf
                best_arabic = arabic_label

        # If no known class found at all
        if best_class_name is None or best_arabic is None:
            print(f"[AI] ⚠️ No known class found. All classes: {[d[0] for d in all_detections]}")
            return fallback

        # Map to Django category ID
        category_id = ARABIC_TO_CATEGORY_ID.get(best_arabic, 'other')

        print(f"[AI] ✅ Result: '{best_class_name}' → '{best_arabic}' ({category_id}) conf={best_confidence:.2f}")

        return {
            'category': category_id,
            'category_label': best_arabic,
            'confidence': float(round(best_confidence, 4)),
            'detected_class': best_class_name,
        }

    except Exception as e:
        logger.error(f"YOLO inference error: {e}")
        return fallback

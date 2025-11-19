# toxicity_filter.py
# ===========================================
# Complete toxicity detection system with enhanced Roman Urdu support
# ===========================================

import os

# Set environment variables BEFORE importing transformers
cache_dir = os.getenv('TRANSFORMERS_CACHE', os.getenv('HF_HOME', './models'))
os.environ['TRANSFORMERS_CACHE'] = cache_dir
os.environ['HF_HOME'] = cache_dir
os.environ['HF_HUB_OFFLINE'] = '1'

import time
import re
from typing import Dict, List, Tuple
from difflib import SequenceMatcher
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
import torch

print("🚀 Loading toxicity detection models from cache...")
print(f"Cache directory: {cache_dir}")

# -------------------------------
# Model Configuration
# -------------------------------
TOXICITY_MODEL_NAME = "martin-ha/toxic-comment-model"

try:
    print(f"Loading tokenizer for {TOXICITY_MODEL_NAME}...")
    tokenizer = AutoTokenizer.from_pretrained(
        TOXICITY_MODEL_NAME,
        cache_dir=cache_dir,
        local_files_only=True
    )
    
    print(f"Loading model for {TOXICITY_MODEL_NAME}...")
    model = AutoModelForSequenceClassification.from_pretrained(
        TOXICITY_MODEL_NAME,
        cache_dir=cache_dir,
        local_files_only=True
    )
    
    toxicity_classifier = pipeline(
        "text-classification",
        model=model,
        tokenizer=tokenizer,
        device=0 if torch.cuda.is_available() else -1,
        max_length=512,
        truncation=True
    )
    print(f"✅ Toxicity model ({TOXICITY_MODEL_NAME}) loaded from cache.")
except Exception as e:
    print(f"⚠️ Error loading toxicity model from cache: {e}")
    import traceback
    traceback.print_exc()
    print("   Service will use Roman Urdu detection only (which works great!)")
    toxicity_classifier = None

# Urdu → English translator
try:
    translator = pipeline(
        "translation",
        model="Helsinki-NLP/opus-mt-ur-en",
        cache_dir=cache_dir,
        local_files_only=True
    )
    print("✅ Translation model loaded from cache.")
except Exception as e:
    print(f"⚠️ Translation model not available: {e}")
    print("   Service will work without Urdu script translation")
    translator = None

# -------------------------------
# Enhanced Roman Urdu Toxicity Detector
# -------------------------------
class RomanUrduToxicityDetector:
    """Enhanced Roman Urdu toxicity detection with fuzzy matching and phrase detection"""
    
    def __init__(self):
        # Expanded dictionary with variations and severity levels
        self.toxic_words = {
            # High severity (score: 1.0)
            "bhenchod": (1.0, ["bhenchod", "bhen chod", "bc", "benchod", "bhainchod", "bhnchod"]),
            "madarchod": (1.0, ["madarchod", "madar chod", "mc", "maderchod", "mdrchod"]),
            "bhosdike": (1.0, ["bhosdike", "bhosdi ke", "bsdk", "bhosadike", "bhosrike", "bhosdi"]),
            "randi": (1.0, ["randi", "randy", "rundi", "raandi"]),
            "harami": (0.95, ["harami", "haramzada", "haramzaada", "haraamzada", "haramzade", "haraamzade"]),
            "lund": (0.9, ["lund", "lun", "land", "lundh"]),
            "gand": (0.9, ["gand", "gaand", "gaan", "gandh"]),
            "chutiya": (0.85, ["chutiya", "chutiye", "chutya", "chuthiya", "chutiyapa", "chutiyaa"]),
            
            # Medium-high severity (score: 0.7-0.9)
            "kamine": (0.8, ["kamine", "kamina", "kaminey", "kamini", "kameena", "kameeney"]),
            "haramkhor": (0.85, ["haramkhor", "haraamkhor", "haramkhori", "haramkhoor"]),
            "tatti": (0.75, ["tatti", "tatty", "tati", "tatii"]),
            "lodu": (0.75, ["lodu", "lodoo", "lodu", "loduu"]),
            "saala": (0.7, ["saala", "sala", "saale", "saaley", "saali", "saalaa"]),
            "kutte": (0.7, ["kutta", "kutte", "kutia", "kuttey", "kutti", "kuttaa"]),
            
            # Medium severity (score: 0.5-0.7)
            "bewakoof": (0.6, ["bewakoof", "bewaqoof", "bewakuf", "bevakoof", "bevkoof", "bevaqoof"]),
            "gadha": (0.6, ["gadha", "gadhe", "gadhey", "gadhi", "gadhaa"]),
            "nalayak": (0.65, ["nalayak", "nalaiq", "nalayaq", "nalayiq", "nalayaaq"]),
            "badtameez": (0.6, ["badtameez", "badtameezi", "badtamiz", "badtmiz", "badtameezz"]),
            "pagal": (0.5, ["pagal", "paagal", "pagla", "pagli", "paglu"]),
            "ghanta": (0.55, ["ghanta", "ghante", "ghantaa"]),
            "bakwas": (0.5, ["bakwas", "bakwaas", "bakvas", "bakvass"]),
            "faltu": (0.5, ["faltu", "faltu", "faaltu", "phaaltu"]),
            
            # Contextual words (score: 0.4-0.5)
            "chup": (0.45, ["chup", "choop", "chupkar", "chup kar", "chupp"]),
            "stupid": (0.5, ["stupid", "stoopid", "stuped"]),
            "idiot": (0.5, ["idiot", "ideot", "idyot"]),
            "kamina": (0.7, ["kamina", "kameena", "kamini"]),
            "gandu": (0.85, ["gandu", "gaandu", "gandoo"]),
            "besharam": (0.6, ["besharam", "besharmi", "beshram"]),
            "namakharam": (0.7, ["namakharam", "namak haram", "namakhram"]),
            "zalim": (0.6, ["zalim", "zaalim"]),
            "dhokebaaz": (0.65, ["dhokebaaz", "dhokebaz", "dhoka baaz"]),
            "jhootha": (0.55, ["jhootha", "jhoothe", "jhoota", "jhooti"]),
        }
        
        # Toxic phrases (higher severity when combined)
        self.toxic_phrases = {
            "chup kar": 0.6,
            "chup ho ja": 0.65,
            "bhag yahan se": 0.7,
            "bhag ja": 0.65,
            "maa ki": 0.95,
            "baap ki": 0.85,
            "behen ki": 0.95,
            "bhen ki": 0.95,
            "teri maa": 0.95,
            "tera baap": 0.85,
            "teri behen": 0.95,
            "apni gand": 0.9,
            "muh band kar": 0.65,
            "shakal dekh": 0.7,
            "kutta kamina": 0.85,
            "harami saala": 0.9,
            "haramzada saala": 0.95,
            "bhag bhosdike": 0.95,
            "gaand mara": 0.95,
            "maa chod": 0.95,
            "bhen chod": 0.95,
            "lund khana": 0.95,
            "gand mein": 0.9,
            "tatti khana": 0.85,
        }
        
        # Compile regex patterns for efficient matching
        self._compile_patterns()
    
    def _compile_patterns(self):
        """Compile regex patterns for all variations"""
        self.word_patterns = {}
        for base_word, (severity, variations) in self.toxic_words.items():
            # Create pattern that matches any variation with word boundaries
            pattern = r'\b(' + '|'.join(re.escape(v) for v in variations) + r')\b'
            self.word_patterns[base_word] = (re.compile(pattern, re.IGNORECASE), severity)
        
        # Compile phrase patterns
        self.phrase_patterns = {}
        for phrase, severity in self.toxic_phrases.items():
            pattern = re.compile(r'\b' + re.escape(phrase) + r'\b', re.IGNORECASE)
            self.phrase_patterns[phrase] = (pattern, severity)
    
    def fuzzy_match(self, word: str, target: str, threshold: float = 0.85) -> bool:
        """Check if word fuzzy matches target"""
        ratio = SequenceMatcher(None, word.lower(), target.lower()).ratio()
        return ratio >= threshold
    
    def detect_toxic_words(self, text: str) -> List[Tuple[str, float, str]]:
        """
        Detect toxic words in text
        Returns: List of (matched_word, severity_score, base_word)
        """
        text_lower = text.lower()
        matches = []
        
        # Check compiled patterns
        for base_word, (pattern, severity) in self.word_patterns.items():
            found = pattern.findall(text_lower)
            for match in found:
                matches.append((match, severity, base_word))
        
        return matches
    
    def detect_toxic_phrases(self, text: str) -> List[Tuple[str, float]]:
        """
        Detect toxic phrases in text
        Returns: List of (phrase, severity_score)
        """
        text_lower = text.lower()
        matches = []
        
        for phrase, (pattern, severity) in self.phrase_patterns.items():
            if pattern.search(text_lower):
                matches.append((phrase, severity))
        
        return matches
    
    def analyze_text(self, text: str) -> Dict:
        """
        Comprehensive analysis of text for Roman Urdu toxicity
        """
        if not text or not text.strip():
            return {
                "is_toxic": False,
                "confidence": 0.0,
                "severity": 0.0,
                "toxic_words": [],
                "toxic_phrases": [],
                "details": "Empty text"
            }
        
        # Detect words and phrases
        toxic_words = self.detect_toxic_words(text)
        toxic_phrases = self.detect_toxic_phrases(text)
        
        # Calculate overall severity
        word_scores = [score for _, score, _ in toxic_words]
        phrase_scores = [score for _, score in toxic_phrases]
        all_scores = word_scores + phrase_scores
        
        if not all_scores:
            return {
                "is_toxic": False,
                "confidence": 0.0,
                "severity": 0.0,
                "toxic_words": [],
                "toxic_phrases": [],
                "details": "No toxic content detected"
            }
        
        # Calculate confidence based on multiple factors
        max_severity = max(all_scores)
        avg_severity = sum(all_scores) / len(all_scores)
        word_count = len(text.split())
        toxic_density = len(all_scores) / max(word_count, 1)
        
        # Combined confidence score
        confidence = min(
            max_severity * 0.6 +  # Weight highest severity
            avg_severity * 0.2 +   # Weight average severity
            toxic_density * 0.2,   # Weight density of toxic words
            1.0
        )
        
        is_toxic = confidence >= 0.5  # Threshold for toxicity
        
        return {
            "is_toxic": is_toxic,
            "confidence": confidence,
            "severity": max_severity,
            "toxic_words": [{"word": w, "severity": s, "base": b} for w, s, b in toxic_words],
            "toxic_phrases": [{"phrase": p, "severity": s} for p, s in toxic_phrases],
            "toxic_density": toxic_density,
            "details": f"Found {len(toxic_words)} toxic words and {len(toxic_phrases)} toxic phrases"
        }


# Initialize Roman Urdu detector globally
roman_urdu_detector = RomanUrduToxicityDetector()
print("✅ Roman Urdu detector initialized.")

# -------------------------------
# Urdu Detection
# -------------------------------
def contains_urdu(text: str) -> bool:
    """Check if text contains Urdu script"""
    return re.search(r'[\u0600-\u06FF]', text) is not None

# -------------------------------
# Text Preprocessing
# -------------------------------
def preprocess_text(text: str) -> str:
    """Clean and normalize text"""
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'http\S+', '', text)
    text = re.sub(r'[^\w\s.,!?;:]', '', text)
    return text.strip()

# -------------------------------
# Toxicity Detection (English)
# -------------------------------
def detect_toxicity(text: str, threshold: float = 0.7) -> dict:
    """Detect toxicity using ML model for English text"""
    if not text or not text.strip():
        return {"is_toxic": False, "confidence": 0.0, "label": "clean", "message": "Empty text"}
    
    if toxicity_classifier is None:
        return {"is_toxic": False, "confidence": 0.0, "label": "unknown", "message": "Model not available"}
    
    try:
        clean_text = preprocess_text(text)
        if not clean_text:
            return {"is_toxic": False, "confidence": 0.0, "label": "clean", "message": "Text too short after preprocessing"}
        
        results = toxicity_classifier(clean_text)
        result = results[0] if isinstance(results, list) and len(results) > 0 else {"label": "unknown", "score": 0.0}
        
        label = result['label'].lower()
        confidence = result['score']
        is_toxic = (label in ['toxic', 'hate', 'offensive', 'abuse']) and (confidence >= threshold)
        
        return {
            "is_toxic": is_toxic,
            "confidence": confidence,
            "label": label,
            "message": f"Detected as '{label}' with {confidence:.2%} confidence"
        }
    except Exception as e:
        return {"is_toxic": False, "confidence": 0.0, "label": "error", "message": f"Detection error: {str(e)}"}

# -------------------------------
# Real-time Toxicity Check (Unified)
# -------------------------------
def real_time_toxicity_check(text: str,
                             toxicity_threshold: float = 0.7,
                             translate_urdu: bool = True,
                             handle_roman_urdu: bool = True) -> dict:
    """
    Comprehensive toxicity check supporting English, Urdu, and Roman Urdu
    """
    detection_text = text
    translation_used = False
    roman_urdu_result = None

    # 1. Enhanced Roman Urdu Detection (Priority)
    if handle_roman_urdu:
        roman_urdu_result = roman_urdu_detector.analyze_text(text)
        if roman_urdu_result["is_toxic"]:
            # Roman Urdu toxicity detected - use it directly
            result = {
                "is_toxic": True,
                "confidence": roman_urdu_result["confidence"],
                "label": "toxic",
                "message": f"Roman Urdu toxicity: {roman_urdu_result['details']}",
                "toxic_words": roman_urdu_result["toxic_words"],
                "toxic_phrases": roman_urdu_result["toxic_phrases"],
                "severity": roman_urdu_result["severity"]
            }
            
            # Determine action based on confidence
            if result["confidence"] > 0.85:
                action = "block"
                action_message = "High confidence toxic Roman Urdu content"
            elif result["confidence"] > 0.65:
                action = "flag"
                action_message = "Likely toxic Roman Urdu content - review recommended"
            else:
                action = "warn"
                action_message = "Potentially toxic Roman Urdu content"
            
            result.update({
                "action": action,
                "action_message": action_message,
                "translation_used": False,
                "original_text": text,
                "detection_text": text,
                "detection_method": "roman_urdu"
            })
            
            return result

    # 2. Standard Urdu → English Translation
    if translate_urdu and translator and contains_urdu(text):
        try:
            translated = translator(text, max_length=512)
            detection_text = translated[0]['translation_text']
            translation_used = True
        except Exception as e:
            print(f"Translation error: {e}")
            pass

    # 3. English Toxicity Detection (Fallback)
    result = detect_toxicity(detection_text, toxicity_threshold)

    # 4. Determine action for English detection
    if result["is_toxic"]:
        if result["confidence"] > 0.9:
            action = "block"
            action_message = "Highly toxic content - should be blocked"
        elif result["confidence"] > 0.7:
            action = "flag"
            action_message = "Toxic content - should be flagged for review"
        else:
            action = "warn"
            action_message = "Potentially toxic - consider warning"
    else:
        action = "allow"
        action_message = "Clean content - safe to allow"

    result.update({
        "action": action,
        "action_message": action_message,
        "translation_used": translation_used,
        "original_text": text,
        "detection_text": detection_text,
        "detection_method": "english_model" if not translation_used else "urdu_translated"
    })

    return result

# -------------------------------
# Batch Toxicity Filter
# -------------------------------
def filter_toxic_messages(messages: list[dict],
                          toxicity_threshold: float = 0.7,
                          translate_urdu: bool = True,
                          handle_roman_urdu: bool = True) -> dict:
    """Filter toxic messages from a batch"""
    start_time = time.time()
    
    if not messages:
        return {
            "total_messages": 0,
            "toxic_messages": 0,
            "clean_messages": 0,
            "filtered_messages": [],
            "toxicity_rate": 0.0,
            "processing_time": 0.0,
            "summary": "No messages to process"
        }

    toxic_messages = []
    clean_messages = []
    detection_results = []

    for i, message in enumerate(messages):
        sender = message.get("sender_name", "Unknown")
        content = message.get("content", "")
        timestamp = message.get("time_stamp", "")

        if not content.strip():
            clean_messages.append(message)
            detection_results.append({
                "index": i,
                "sender": sender,
                "original_text": content,
                "is_toxic": False,
                "confidence": 0.0,
                "reason": "Empty message"
            })
            continue

        result = real_time_toxicity_check(
            content,
            toxicity_threshold=toxicity_threshold,
            translate_urdu=translate_urdu,
            handle_roman_urdu=handle_roman_urdu
        )

        detection_results.append({
            **result,
            "index": i,
            "sender": sender,
            "timestamp": timestamp
        })

        if result["is_toxic"]:
            toxic_messages.append(message)
        else:
            clean_messages.append(message)

    total_messages = len(messages)
    toxic_count = len(toxic_messages)
    clean_count = len(clean_messages)
    toxicity_rate = toxic_count / total_messages if total_messages > 0 else 0.0
    processing_time = time.time() - start_time

    return {
        "total_messages": total_messages,
        "toxic_messages": toxic_count,
        "clean_messages": clean_count,
        "toxicity_rate": toxicity_rate,
        "processing_time": processing_time,
        "toxic_messages_list": toxic_messages,
        "clean_messages_list": clean_messages,
        "detection_details": detection_results,
        "summary": f"Found {toxic_count} toxic messages out of {total_messages} ({toxicity_rate:.1%})"
    }

# -------------------------------
# Analyze Conversation
# -------------------------------
def analyze_conversation_toxicity(messages: list[dict],
                                  toxicity_threshold: float = 0.7) -> dict:
    """Comprehensive conversation toxicity analysis"""
    filter_result = filter_toxic_messages(
        messages,
        toxicity_threshold=toxicity_threshold
    )

    toxic_senders = {}
    toxicity_by_time = {}
    detection_methods = {"roman_urdu": 0, "english_model": 0, "urdu_translated": 0}

    for detail in filter_result["detection_details"]:
        if detail["is_toxic"]:
            sender = detail["sender"]
            toxic_senders[sender] = toxic_senders.get(sender, 0) + 1
            
            timestamp = detail.get("timestamp", "")
            if ":" in timestamp:
                hour = timestamp.split(":")[0]
                toxicity_by_time[hour] = toxicity_by_time.get(hour, 0) + 1
            
            # Track detection method
            method = detail.get("detection_method", "unknown")
            detection_methods[method] = detection_methods.get(method, 0) + 1

    most_toxic_sender = max(toxic_senders.items(), key=lambda x: x[1]) if toxic_senders else ("None", 0)

    filter_result.update({
        "toxic_senders": toxic_senders,
        "toxicity_by_time": toxicity_by_time,
        "detection_methods": detection_methods,
        "most_toxic_sender": most_toxic_sender[0],
        "most_toxic_count": most_toxic_sender[1],
        "recommendation": "Consider moderating content" if filter_result["toxic_messages"] > 0 else "Conversation appears clean"
    })

    return filter_result

# -------------------------------
# Main Execution
# -------------------------------
if __name__ == "__main__":
    print("\n" + "="*50)
    print("🧪 Toxicity Filter - Quick Test")
    print("="*50 + "\n")
    
    test_texts = [
        "Hello, how are you?",
        "You are so stupid!",
        "tum bewakoof ho",
        "chup kar saale",
        "teri maa ki bhenchod",
        "This is a normal message",
        "gadha gadha bewaqoof",
        "haramzada saala kutta",
        "Burn in hell",
        "Tairi aisi k taisi",
        "Tairi maa ki aankh",
        "Tum gadhe ho"
    ]
    
    for text in test_texts:
        result = real_time_toxicity_check(text)
        print(f"Text: '{text}'")
        print(f"  Result: {result['action'].upper()}")
        print(f"  Toxic: {result['is_toxic']} | Confidence: {result['confidence']:.2%}")
        print(f"  Method: {result['detection_method']}")
        print(f"  Message: {result['action_message']}")
        print()
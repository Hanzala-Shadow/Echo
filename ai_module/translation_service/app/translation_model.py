import os
os.environ['TRANSFORMERS_CACHE'] = os.getenv('TRANSFORMERS_CACHE', './models')
os.environ['HF_HOME'] = os.getenv('HF_HOME', './models')

from transformers import M2M100ForConditionalGeneration, M2M100Tokenizer, MarianMTModel, MarianTokenizer
import torch
import re

class EnglishRomanUrduTranslator:
    def __init__(self, use_gpu=False):
        self.device = "cuda" if use_gpu and torch.cuda.is_available() else "cpu"
        cache_dir = os.environ.get('TRANSFORMERS_CACHE', './models')
        
        print(f"Using device: {self.device}")
        print(f"Using model cache: {cache_dir}")

        # ----------------- Transliteration Models -----------------
        print("Loading Roman Urdu ↔ Urdu transliteration model from cache...")
        try:
            self.trans_tok = M2M100Tokenizer.from_pretrained(
                "Mavkif/m2m100_rup_tokenizer_both",
                cache_dir=cache_dir,
                local_files_only=True
            )
            self.trans_ru2ur = M2M100ForConditionalGeneration.from_pretrained(
                "Mavkif/m2m100_rup_rur_to_ur",
                cache_dir=cache_dir,
                local_files_only=True
            ).to(self.device)
            self.trans_ur2ru = M2M100ForConditionalGeneration.from_pretrained(
                "Mavkif/m2m100_rup_ur_to_rur",
                cache_dir=cache_dir,
                local_files_only=True
            ).to(self.device)
            print("✅ Transliteration models loaded from cache")
        except Exception as e:
            print(f"❌ Error loading transliteration models: {e}")
            print("   Run download_all_models.py first!")
            raise

        # ----------------- Translation Models -----------------
        print("Loading English ↔ Urdu translation models from cache...")
        try:
            self.en_ur_tok = MarianTokenizer.from_pretrained(
                "Helsinki-NLP/opus-mt-en-ur",
                cache_dir=cache_dir,
                local_files_only=True
            )
            self.en_ur_model = MarianMTModel.from_pretrained(
                "Helsinki-NLP/opus-mt-en-ur",
                cache_dir=cache_dir,
                local_files_only=True
            ).to(self.device)

            self.ur_en_tok = MarianTokenizer.from_pretrained(
                "Helsinki-NLP/opus-mt-ur-en",
                cache_dir=cache_dir,
                local_files_only=True
            )
            self.ur_en_model = MarianMTModel.from_pretrained(
                "Helsinki-NLP/opus-mt-ur-en",
                cache_dir=cache_dir,
                local_files_only=True
            ).to(self.device)
            print("✅ Translation models loaded from cache")
        except Exception as e:
            print(f"❌ Error loading translation models: {e}")
            print("   Run download_all_models.py first!")
            raise
        
        print("✅ All translation models ready!")

    # ----------------- Roman ↔ Urdu Transliteration -----------------
    def roman_to_urdu(self, text):
        input_text = "__roman-ur__ " + text
        tokenized = self.trans_tok(input_text, return_tensors="pt").to(self.device)
        out = self.trans_ru2ur.generate(**tokenized, max_length=200)
        ur = self.trans_tok.batch_decode(out, skip_special_tokens=True)[0]
        return ur

    def urdu_to_roman(self, text):
        input_text = "__ur__ " + text
        tokenized = self.trans_tok(input_text, return_tensors="pt").to(self.device)
        out = self.trans_ur2ru.generate(**tokenized, max_length=200)
        ru = self.trans_tok.batch_decode(out, skip_special_tokens=True)[0]
        return ru

    # ----------------- English ↔ Roman Urdu Translation -----------------
    def english_to_roman_urdu(self, text):
        # English → Urdu script
        enc = self.en_ur_tok(text, return_tensors="pt", padding=True).to(self.device)
        out = self.en_ur_model.generate(**enc, max_length=200)
        ur = self.en_ur_tok.batch_decode(out, skip_special_tokens=True)[0]

        # Urdu → Roman Urdu
        ru = self.urdu_to_roman(ur)
        return ru

    def roman_urdu_to_english(self, text):
        # Roman Urdu → Urdu script
        ur = self.roman_to_urdu(text)

        # Urdu → English
        enc = self.ur_en_tok(ur, return_tensors="pt", padding=True).to(self.device)
        out = self.ur_en_model.generate(**enc, max_length=200)
        en = self.ur_en_tok.batch_decode(out, skip_special_tokens=True)[0]
        return en

    # ----------------- Auto-detect and Translate -----------------
    def auto_translate(self, text: str) -> str:
        """
        Automatically detects language and translates accordingly:
        - English → Roman Urdu
        - Roman Urdu → English
        - Urdu Script → Roman Urdu
        """
        if not text or not text.strip():
            return text
        
        # Check if text contains Urdu script
        if self._contains_urdu_script(text):
            return self.urdu_to_roman(text)
        
        # Check if text is Roman Urdu (heuristic)
        if self._is_roman_urdu(text):
            return self.roman_urdu_to_english(text)
        
        # Otherwise, assume English
        return self.english_to_roman_urdu(text)
    
    def _contains_urdu_script(self, text: str) -> bool:
        """Check if text contains Urdu/Arabic script characters"""
        return bool(re.search(r'[\u0600-\u06FF]', text))
    
    def _is_roman_urdu(self, text: str) -> bool:
        """
        Detect if text is likely Roman Urdu based on common words
        """
        urdu_words = [
            'aap', 'main', 'mein', 'tum', 'kaise', 'kaisi', 'ho', 'hai', 'hain',
            'ka', 'ke', 'ki', 'ko', 'se', 'ne', 'tha', 'thi', 'the',
            'kya', 'kahan', 'kab', 'kyun', 'kaise', 'kitna', 'kitne',
            'haan', 'nahi', 'nahin', 'theek', 'acha', 'achha', 'bilkul',
            'ja', 'raha', 'rahe', 'rahi', 'gaya', 'gayi', 'gaye',
            'kar', 'karo', 'karna', 'karein', 'liya', 'liye', 'lia',
            'shukriya', 'mehrbani', 'salaam', 'assalam'
        ]
        
        text_lower = text.lower()
        words = text_lower.split()
        
        # Count how many Urdu words are present
        urdu_word_count = sum(1 for word in words if word in urdu_words)
        
        # If 30% or more words are Urdu words, consider it Roman Urdu
        if len(words) > 0:
            ratio = urdu_word_count / len(words)
            return ratio >= 0.3
        
        return False

# ----------------- Demo -----------------
if __name__ == "__main__":
    translator = EnglishRomanUrduTranslator(use_gpu=False)

    examples = [
        "how are you",
        "i am going to the market",
        "what is your name",
        "aap kaise hain",
        "main bazaar ja raha hoon",
        "mera naam ali hai",
        "tum kahan ja rahe ho",
        "Tum ne kya pehna hoa hai aur hamare ghar kuin aaye ho"
    ]

    for ex in examples:
        print(f"Input: {ex}")
        print(f"Auto-translated: {translator.auto_translate(ex)}")
        print()
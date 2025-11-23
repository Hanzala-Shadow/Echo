import os
os.environ['TRANSFORMERS_CACHE'] = os.getenv('TRANSFORMERS_CACHE', './models')
os.environ['HF_HOME'] = os.getenv('HF_HOME', './models')

from transformers import MarianMTModel, MarianTokenizer
import torch

class EnglishRomanUrduTranslator:
    """
    Lightweight English to Urdu Translator
    Uses only Helsinki-NLP/opus-mt-en-ur model (~150MB)
    """
    def __init__(self, use_gpu=False):
        self.device = "cuda" if use_gpu and torch.cuda.is_available() else "cpu"
        cache_dir = os.environ.get('TRANSFORMERS_CACHE', './models')
        
        print(f"Using device: {self.device}")
        print(f"Using model cache: {cache_dir}")

        # Load English → Urdu translation model
        print("Loading English → Urdu translation model from cache...")
        try:
            self.tokenizer = MarianTokenizer.from_pretrained(
                "Helsinki-NLP/opus-mt-en-ur",
                cache_dir=cache_dir,
                local_files_only=True
            )
            self.model = MarianMTModel.from_pretrained(
                "Helsinki-NLP/opus-mt-en-ur",
                cache_dir=cache_dir,
                local_files_only=True
            ).to(self.device)
            
            print("✅ Translation model loaded from cache")
        except Exception as e:
            print(f"❌ Error loading translation model: {e}")
            print("   Run download_all_models.py first!")
            raise
        
        print("✅ English to Urdu translator ready!")

    def auto_translate(self, text: str, max_length=512) -> str:
        """
        Translate English text to Urdu script
        
        Args:
            text (str): English text to translate
            max_length (int): Maximum length of translation
            
        Returns:
            str: Urdu translation
        """
        if not text or not text.strip():
            return text
        
        # Tokenize
        inputs = self.tokenizer(
            text,
            return_tensors="pt",
            max_length=max_length,
            truncation=True,
            padding=True
        ).to(self.device)
        
        # Generate translation
        translated = self.model.generate(
            **inputs,
            max_length=max_length,
            num_beams=4,
            early_stopping=True
        )
        
        urdu_text = self.tokenizer.decode(translated[0], skip_special_tokens=True)
        return urdu_text
    
    # Alias for compatibility
    def translate(self, text: str, max_length=512) -> str:
        """Alias for auto_translate"""
        return self.auto_translate(text, max_length)


# ----------------- Demo -----------------
if __name__ == "__main__":
    translator = EnglishRomanUrduTranslator(use_gpu=False)

    examples = [
        "how are you",
        "i am going to the market",
        "what is your name",
        "Hello, how are you?",
        "Thank you very much.",
        "Where are you going?"
    ]

    print("\n--- English to Urdu Translations ---\n")
    for ex in examples:
        print(f"English: {ex}")
        print(f"Urdu: {translator.auto_translate(ex)}")
        print()
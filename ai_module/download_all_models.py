"""
Download AI models locally for offline use
Run this ONCE before building Docker containers
"""
import os
from transformers import MarianMTModel, MarianTokenizer

# Set longer timeout and cache directory
os.environ['HF_HUB_DOWNLOAD_TIMEOUT'] = '600'

def download_translation_models():
    """Download models for translation service"""
    print("\n" + "="*60)
    print("DOWNLOADING TRANSLATION MODELS")
    print("="*60)
    
    cache_dir = "./models/translation"
    
    # English → Urdu translation
    print("\n1. English → Urdu tokenizer...")
    MarianTokenizer.from_pretrained("Helsinki-NLP/opus-mt-en-ur", cache_dir=cache_dir)
    
    print("2. English → Urdu model...")
    MarianMTModel.from_pretrained("Helsinki-NLP/opus-mt-en-ur", cache_dir=cache_dir)
    
    print("✅ Translation models downloaded!")
    
    
def download_summarizer_models():
    """Download models for summarizer service - UPDATED: No translation models"""
    print("\n" + "="*60)
    print("DOWNLOADING SUMMARIZER MODELS")
    print("="*60)
    print("📝 Lightweight summarizer")
    
    cache_dir = "./models/summarizer"
    
    # Lightweight chat summarizer (DistilBART ~300MB)
    print("\n1. Lightweight Chat Summarizer (DistilBART)...")
    from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
    
    print("   - Downloading tokenizer...")
    AutoTokenizer.from_pretrained(
        "sshleifer/distilbart-cnn-6-6", 
        cache_dir=cache_dir
    )
    
    print("   - Downloading model...")
    AutoModelForSeq2SeqLM.from_pretrained(
        "sshleifer/distilbart-cnn-6-6", 
        cache_dir=cache_dir
    )
    
    print("✅ Summarizer models downloaded!")
    print("   Model: sshleifer/distilbart-cnn-6-6 (~300MB)")
    print("   Features: English + Roman Urdu support")

def download_toxicity_models():
    """Download models for toxicity service"""
    print("\n" + "="*60)
    print("DOWNLOADING TOXICITY MODELS")
    print("="*60)
    
    cache_dir = "./models/toxicity"
    
    print("\n1. Multilingual toxicity classifier...")
    try:
        from transformers import AutoTokenizer, AutoModelForSequenceClassification
        print("   - Downloading tokenizer...")
        AutoTokenizer.from_pretrained(
            "unitary/multilingual-toxic-xlm-roberta",
            cache_dir=cache_dir
        )
        print("   - Downloading model...")
        AutoModelForSequenceClassification.from_pretrained(
            "unitary/multilingual-toxic-xlm-roberta",
            cache_dir=cache_dir
        )
        print("✅ Toxicity classifier downloaded!")
    except Exception as e:
        print(f"⚠️ Toxicity model failed: {e}")
        print("   Trying lighter alternative...")
        try:
            print("   - Downloading tokenizer...")
            AutoTokenizer.from_pretrained(
                "martin-ha/toxic-comment-model",
                cache_dir=cache_dir
            )
            print("   - Downloading model...")
            AutoModelForSequenceClassification.from_pretrained(
                "martin-ha/toxic-comment-model",
                cache_dir=cache_dir
            )
            print("✅ Lighter toxicity model downloaded!")
        except Exception as e2:
            print(f"❌ All toxicity models failed: {e2}")
    
    print("\n2. Urdu → English translator...")
    print("   - Downloading tokenizer...")
    MarianTokenizer.from_pretrained("Helsinki-NLP/opus-mt-ur-en", cache_dir=cache_dir)
    print("   - Downloading model...")
    MarianMTModel.from_pretrained("Helsinki-NLP/opus-mt-ur-en", cache_dir=cache_dir)
    
    print("✅ Toxicity models downloaded!")

def download_smart_reply_models():
    """Download models for smart reply service"""
    print("\n" + "="*60)
    print("DOWNLOADING SMART REPLY MODELS")
    print("="*60)
    
    cache_dir = "./models/smart_reply"
    
    print("\n1. DialoGPT-medium...")
    from transformers import AutoTokenizer, AutoModelForCausalLM
    print("   - Downloading tokenizer...")
    AutoTokenizer.from_pretrained("microsoft/DialoGPT-medium", cache_dir=cache_dir)
    print("   - Downloading model...")
    AutoModelForCausalLM.from_pretrained("microsoft/DialoGPT-medium", cache_dir=cache_dir)
    
    print("✅ Smart reply models downloaded!")

if __name__ == "__main__":
    print("\n" + "="*70)
    print(" "*15 + "AI MODELS DOWNLOADER")
    print(" "*10 + "This will download ~5-8 GB of models")
    print("="*70)
    
    input("\nPress ENTER to start downloading...")
    
    try:
        download_translation_models()
        download_summarizer_models()
        download_toxicity_models()
        download_smart_reply_models()
        
        print("\n" + "="*70)
        print("✅ ALL MODELS DOWNLOADED SUCCESSFULLY!")
        print("="*70)
        print("\nYou can now rebuild your Docker containers.")
        
    except KeyboardInterrupt:
        print("\n\n⚠️ Download interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Error during download: {e}")
        import traceback
        traceback.print_exc()
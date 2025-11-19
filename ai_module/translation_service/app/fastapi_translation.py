from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from translation_model import EnglishRomanUrduTranslator  # your class
from fastapi.middleware.cors import CORSMiddleware

# -------------------------------
# Request Schema
# -------------------------------
class TextInput(BaseModel):
    text: str

# -------------------------------
# FastAPI App
# -------------------------------
app = FastAPI(
    title="English-Roman Urdu Translator API",
    description="Automatically translates between English, Roman Urdu, and Urdu Script",
    version="1.0"
)

# Enable CORS (optional)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# -------------------------------
# Initialize Translator
# -------------------------------
translator = EnglishRomanUrduTranslator(use_gpu=False)

# -------------------------------
# API Endpoint
# -------------------------------
@app.post("/translate")
def translate_text(input: TextInput):
    text = input.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    try:
        translated = translator.auto_translate(text)
        return {
            "original_text": text,
            "translated_text": translated
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error translating text: {str(e)}")

# -------------------------------
# Root Endpoint
# -------------------------------
@app.get("/")
def root():
    return {"message": "Translator API is running. Use POST /translate with {'text': '...'}"}

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from toxicity_filter import real_time_toxicity_check
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
    title="Toxicity Filter API",
    description="Detects toxic content in English, Urdu, and Roman Urdu",
    version="1.0"
)

# Enable CORS (optional, for frontend usage)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# -------------------------------
# API Endpoint
# -------------------------------
@app.post("/detect_toxicity")
def detect_toxicity_endpoint(input: TextInput):
    text = input.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    try:
        result = real_time_toxicity_check(text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing text: {str(e)}")

# -------------------------------
# Root Endpoint
# -------------------------------
@app.get("/")
def root():
    return {"message": "Toxicity Filter API is running. Use POST /detect_toxicity with {'text': '...'}"}

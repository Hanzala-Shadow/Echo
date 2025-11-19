from fastapi import FastAPI
from pydantic import BaseModel
from smart_reply_model import SmartReplySystem

app = FastAPI(title="Smart Reply Service")

# Load offline reply model
smart_reply = SmartReplySystem(model_name="microsoft/DialoGPT-medium")

class SmartReplyRequest(BaseModel):
    message: str
    num_suggestions: int = 5

class SmartReplyResponse(BaseModel):
    detected_language: str
    suggestions: list

@app.post("/smart-reply", response_model=SmartReplyResponse)
def get_smart_replies(req: SmartReplyRequest):
    message = req.message
    n = req.num_suggestions

    detected_lang = "Roman Urdu" if smart_reply.is_roman_urdu(message) else "English"
    suggestions = smart_reply.generate_replies(message, n)

    return SmartReplyResponse(
        detected_language=detected_lang,
        suggestions=suggestions
    )

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
from summarizer_model import summarize_messages  # your module
from fastapi.middleware.cors import CORSMiddleware

# -------------------------------
# Request Schema
# -------------------------------
class Message(BaseModel):
    sender_name: str
    content: str
    time_stamp: str

class ConversationInput(BaseModel):
    messages: List[Message]
    mode: str = "hybrid"          # general, speaker, hybrid
    style: str = "structured"     # formal, casual, structured

# -------------------------------
# FastAPI App
# -------------------------------
app = FastAPI(
    title="Chat Summarizer API",
    description="Summarizes bilingual chats in English & Urdu",
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
# API Endpoint
# -------------------------------
@app.post("/summarize")
def summarize_conversation(input: ConversationInput):
    if not input.messages:
        raise HTTPException(status_code=400, detail="No messages provided")
    
    try:
        # Convert Pydantic models to list of dicts
        messages_list = [msg.dict() for msg in input.messages]
        summary = summarize_messages(messages_list, mode=input.mode, style=input.style)
        return {
            "total_messages": len(messages_list),
            "summary": summary
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error summarizing messages: {str(e)}")

# -------------------------------
# Root Endpoint
# -------------------------------
@app.get("/")
def root():
    return {"message": "Chat Summarizer API is running. Use POST /summarize with conversation messages."}

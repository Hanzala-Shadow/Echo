from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from enhanced_deadline_extractor import EnhancedDeadlineExtractor  # your code
from fastapi.middleware.cors import CORSMiddleware

# -------------------------------
# Request Schema
# -------------------------------
class Message(BaseModel):
    sender_name: str
    content: str
    time_stamp: str  # string, same format as your test

class DeadlineRequest(BaseModel):
    messages: List[Message]


# -------------------------------
# FastAPI App
# -------------------------------
app = FastAPI(
    title="Deadline Extraction API",
    description="Extracts deadlines, dates, responsibilities, and recipients from chat messages.",
    version="1.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Initialize model
extractor = EnhancedDeadlineExtractor()


# -------------------------------
# API Endpoint
# -------------------------------
@app.post("/extract_deadlines")
def extract_deadlines(request: DeadlineRequest):
    if not request.messages:
        raise HTTPException(status_code=400, detail="No messages provided")

    results = []

    try:
        for msg in request.messages:
            message_dict = msg.dict()

            # Extract deadlines using your function
            deadlines = extractor.extract_deadlines_from_message(message_dict)

            # Detect recipient
            recipient = extractor.find_deadline_recipient(
                msg.content,
                msg.sender_name
            )

            results.append({
                "sender_name": msg.sender_name,
                "content": msg.content,
                "time_stamp": msg.time_stamp,
                "recipient": recipient,
                "deadlines_found": len(deadlines),
                "deadlines": deadlines
            })

        return {
            "total_messages": len(request.messages),
            "results": results
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/")
def root():
    return {"message": "Deadline Extraction API is running. Use POST /extract_deadlines"}

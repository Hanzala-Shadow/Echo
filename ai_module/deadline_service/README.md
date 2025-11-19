# Deadline Extraction Service

Extracts deadlines and due dates from text messages.

### Endpoint
POST /extract_deadlines

### Request
```json
{
  "sender_name": "Ali",
  "content": "Complete the report by tomorrow 5pm.",
  "time_stamp": "2025-10-14 09:01"
}

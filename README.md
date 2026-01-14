# Echo 🔐  
**LAN-Based Encrypted Chat Application with AI Microservices**

Echo is a secure, LAN-based real-time chat application that integrates end-to-end encryption, WebSocket communication, and AI-powered NLP microservices for intelligent message processing such as translation, summarization, toxicity detection, smart replies, and deadline extraction.

The system follows a microservice-oriented architecture and is fully Dockerized for consistent deployment.

---

## **Key Features**

- End-to-End Encrypted Messaging  
- Real-time Communication using WebSockets  
- AI-powered microservices:
  - Translation
  - Chat Summarization
  - Toxicity Detection
  - Smart Reply Suggestions
  - Deadline Extraction
- Modular microservice-based architecture  
- Dockerized backend, frontend, and AI services  
- Optimized for LAN deployment  

---

## **Technology Stack**

### **Backend**
- Java 17
- Spring Boot
- WebSockets
- PostgreSQL
- Flyway

### **Frontend**
- React (Vite)
- Tailwind CSS

### **AI Microservices**
- Python
- FastAPI
- Transformer-based NLP models

### **DevOps**
- Docker
- Docker Compose

---

## **Prerequisites**

Ensure the following are installed on your system:

- Docker
- Docker Compose
- Git
- Linux, macOS, or WSL environment

---

## **Build and Setup Instructions**

All commands must be executed from the project root directory.

---

### **Step 1: Build Base AI Image**

```bash
docker build --no-cache -f Dockerfile.base -t ai-base:latest .
Step 2: Build AI Microservices
bash
Copy code
# Translation Service
docker build --no-cache -t translation-service:latest ./translation_service

# Summarizer Service
docker build --no-cache -t summarizer-service:latest ./summarizer_service

# Toxicity Service
docker build --no-cache -t toxicity-service:latest ./toxicity_service

# Smart Reply Service
docker build --no-cache -t smart-reply-service:latest ./smart_reply_service

# Deadline Service
docker build --no-cache -t deadline-service:latest ./deadline_service
Step 3: Build Backend and Frontend
bash
Copy code
docker compose build backend frontend
Running the Application
From the project root directory, execute:

bash
Copy code
./Echo_Begins
This script initializes and launches all required services.

Project Structure Overview
csharp
Copy code
Echo/
├── backend/
├── frontend/
├── translation_service/
├── summarizer_service/
├── toxicity_service/
├── smart_reply_service/
├── deadline_service/
├── Dockerfile.base
├── docker-compose.yml
└── Echo_Begins
Important Notes
Ensure the startup script has executable permissions:

bash
Copy code
chmod +x Echo_Begins
Initial builds may take longer due to AI model dependencies.

Rebuild Docker images after modifying any AI service code.

License
This project is developed for academic and research purposes.


FROM ai_module_base:latest

WORKDIR /app

# Copy files directly into /app (use *.py to avoid directory nesting)
COPY app/*.py ./
COPY app/requirements.txt ./

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Set PYTHONPATH to /app so imports work
ENV PYTHONPATH=/app

EXPOSE 8002

# Run uvicorn without 'app.' prefix
CMD ["uvicorn", "fastapi_summarizer:app", "--host", "0.0.0.0", "--port", "8002"]
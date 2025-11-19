FROM ai_module_base:latest

WORKDIR /app

# Copy files directly into /app (use *.py to avoid directory nesting)
COPY app/*.py ./
COPY app/requirements.txt ./

# Install dependencies + langdetect
RUN pip install --no-cache-dir -r requirements.txt langdetect

# Set PYTHONPATH to /app so imports work
ENV PYTHONPATH=/app

EXPOSE 8001

# Run uvicorn without 'app.' prefix
CMD ["uvicorn", "fastapi_translation:app", "--host", "0.0.0.0", "--port", "8001"]
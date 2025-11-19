FROM ai_module_base:latest

WORKDIR /app

# Copy app files - use explicit path
COPY app/* ./

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Set PYTHONPATH
ENV PYTHONPATH=/app

EXPOSE 8004

CMD ["uvicorn", "fastapi_deadline_extractor:app", "--host", "0.0.0.0", "--port", "8004"]
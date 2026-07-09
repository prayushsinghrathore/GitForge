FROM python:3.12-slim

WORKDIR /app

# Install git for GitHub repository import.
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Install runtime dependencies only.
COPY pyproject.toml ./
RUN pip install --no-cache-dir fastapi uvicorn[standard] pydantic

# Copy application source.
COPY cli.py ./
COPY app/ ./app/

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

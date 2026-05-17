# GitStack Backend — Production Dockerfile
# Supports: Render, Railway, Fly.io, Koyeb, AWS ECS, Google Cloud Run

FROM python:3.11-slim-bookworm

WORKDIR /app

# Install system dependencies (for Pillow, cryptography, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Non-root user for security
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:10000/health')" || exit 1

# Default port (overridden by PORT env var on most platforms)
EXPOSE 10000

CMD ["python", "app.py"]

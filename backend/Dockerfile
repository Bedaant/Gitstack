# GitStack Backend — Production Dockerfile
# Supports: Render, Railway, Fly.io, Koyeb, AWS ECS, Google Cloud Run

# ── Build stage ──
FROM python:3.11-slim-bookworm AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies into a virtual env
COPY requirements.txt .
RUN python -m venv /opt/venv && \
    /opt/venv/bin/pip install --no-cache-dir --upgrade pip && \
    /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

# ── Runtime stage ──
FROM python:3.11-slim-bookworm

WORKDIR /app

# Install runtime dependencies only (no gcc)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libffi8 \
    libssl3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual env from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application code
COPY . .

# Non-root user for security
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Health check (FastAPI health endpoint) — uses $PORT if set, falls back to 10000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-10000}/api/health || exit 1

# Default port (overridden by PORT env var on most platforms)
EXPOSE 10000

CMD ["python", "app.py"]

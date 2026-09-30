# -------------------------------------------------------------
# Stage 1: Build virtual environment and wheels
# -------------------------------------------------------------
FROM python:3.12-slim AS builder

WORKDIR /app

# Install build dependencies for C extensions (e.g. psycopg2, pillow)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# -------------------------------------------------------------
# Stage 2: Production Runtime
# -------------------------------------------------------------
FROM python:3.12-slim AS runner

WORKDIR /app

# Install runtime dependencies (libpq5 for PostgreSQL, curl for container healthchecks)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy isolated virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Create non-root system group and user
RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 --ingroup appgroup appuser

# Copy application code with proper ownership
COPY --chown=appuser:appgroup . .

# Ensure uploads directory exists and is writable by non-root user
RUN mkdir -p /app/uploads && chown -R appuser:appgroup /app/uploads

USER appuser

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    ENVIRONMENT=production

EXPOSE 8000

CMD ["gunicorn", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "app.main:app", "--bind", "0.0.0.0:8000"]

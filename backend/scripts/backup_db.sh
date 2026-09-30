#!/usr/bin/env bash
# ==============================================================================
# Surya Family Restaurant Kadiri - Production PostgreSQL Backup Script
# Performs a timestamped pg_dump with gzip compression and enforces a 30-day retention policy.
# ==============================================================================

set -euo pipefail

# Script directory and root backend directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Load .env file if available
if [ -f "${BACKEND_DIR}/.env" ]; then
    # Export non-comment lines from .env
    set -a
    # shellcheck disable=SC1091
    source <(grep -v '^#' "${BACKEND_DIR}/.env" | grep -v '^[[:space:]]*$')
    set +a
fi

# Configuration Defaults
BACKUP_DIR="${BACKUP_DIR:-${BACKEND_DIR}/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP="$(date +"%Y%m%d_%H%M%S")"
DATE_TAG="$(date +"%Y-%m-%d %H:%M:%S")"

echo "======================================================================"
echo "[${DATE_TAG}] Surya Family Restaurant - PostgreSQL Backup Routine"
echo "======================================================================"

# Ensure backup destination directory exists
mkdir -p "${BACKUP_DIR}"

# Determine Database Connection URI
DB_URI="${TARGET_DATABASE_URL:-${DATABASE_URL:-}}"

# Clean 'postgres://' to 'postgresql://' for pg_dump compatibility
if [[ "${DB_URI}" == postgres://* ]]; then
    DB_URI="postgresql://${DB_URI#postgres://}"
fi

# Extract DB name for filename prefix (defaults to 'surya_restaurant')
DB_PREFIX="surya_restaurant"
if [[ -n "${DB_URI}" ]]; then
    # Extract path portion after the last slash, before any query parameters
    EXTRACTED_NAME=$(echo "${DB_URI}" | sed -E 's/.*\///; s/\?.*//')
    if [[ -n "${EXTRACTED_NAME}" && "${EXTRACTED_NAME}" != *"@"* ]]; then
        DB_PREFIX="${EXTRACTED_NAME}"
    fi
elif [[ -n "${PGDATABASE:-}" ]]; then
    DB_PREFIX="${PGDATABASE}"
fi

BACKUP_FILE="${BACKUP_DIR}/${DB_PREFIX}_${TIMESTAMP}.sql.gz"

echo "[INFO] Destination directory : ${BACKUP_DIR}"
echo "[INFO] Target backup file    : ${BACKUP_FILE}"
echo "[INFO] Retention window      : ${RETENTION_DAYS} days"

# Check if pg_dump is available
if ! command -v pg_dump &>/dev/null; then
    echo "[ERROR] pg_dump command not found on PATH. Please install postgresql-client." >&2
    exit 1
fi

echo "[INFO] Executing pg_dump with gzip compression..."

# Execute dump using URI or standard PG environment variables
if [[ -n "${DB_URI}" ]]; then
    pg_dump --dbname="${DB_URI}" \
            --format=plain \
            --clean \
            --if-exists \
            --no-owner \
            --no-privileges \
            | gzip -9 > "${BACKUP_FILE}"
else
    pg_dump --format=plain \
            --clean \
            --if-exists \
            --no-owner \
            --no-privileges \
            | gzip -9 > "${BACKUP_FILE}"
fi

# Verify backup integrity (non-empty file)
if [ ! -s "${BACKUP_FILE}" ]; then
    echo "[ERROR] Backup file is empty or was not created: ${BACKUP_FILE}" >&2
    rm -f "${BACKUP_FILE}"
    exit 1
fi

FILE_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "[SUCCESS] Database backup created successfully!"
echo "[INFO] Backup size : ${FILE_SIZE}"

# Enforce 30-Day Retention Policy
echo "[INFO] Cleaning up backups older than ${RETENTION_DAYS} days..."
PURGED_COUNT=0
while IFS= read -r old_file; do
    if [ -n "${old_file}" ]; then
        echo "  - Removing expired backup: $(basename "${old_file}")"
        rm -f "${old_file}"
        PURGED_COUNT=$((PURGED_COUNT + 1))
    fi
done < <(find "${BACKUP_DIR}" -type f -name "${DB_PREFIX}_*.sql.gz" -mtime +"${RETENTION_DAYS}")

echo "[INFO] Purged ${PURGED_COUNT} expired backup file(s)."

# Summary of remaining backups
TOTAL_BACKUPS=$(find "${BACKUP_DIR}" -type f -name "${DB_PREFIX}_*.sql.gz" | wc -l | tr -d ' ')
echo "[INFO] Total active backups retained: ${TOTAL_BACKUPS}"
echo "======================================================================"

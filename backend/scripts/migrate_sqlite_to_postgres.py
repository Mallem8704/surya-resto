#!/usr/bin/env python3
"""
Surya Family Restaurant Kadiri - Database Migration Script
Migrates data from SQLite (surya_restaurant.db) to PostgreSQL.

Features:
- Zero-data-loss guarantee with row count validation before and after.
- Topological dependency order to respect foreign key constraints.
- Clean parsing of PostgreSQL URLs (converting postgres:// to postgresql://).
- PostgreSQL sequence synchronization (sets sequence current value to MAX(id)).
- Dry-run mode for pre-migration safety validation.
- Batch insertion for high performance.
- Supports table creation and optional table truncation.
"""

import argparse
import logging
import os
import sys
import time
from typing import Dict, List, Type

from dotenv import load_dotenv
from sqlalchemy import create_engine, func, inspect, text
from sqlalchemy.orm import Session, declarative_base, sessionmaker

# Ensure backend root is on sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# Load backend/.env
load_dotenv(os.path.join(BACKEND_DIR, ".env"))

# Import all SQLAlchemy models from the application
from app.models import (
    AuditLog,
    Base,
    CafeTable,
    CashierShift,
    Category,
    Coupon,
    Customer,
    CustomerAddress,
    CustomerOTP,
    MenuItem,
    MenuItemAddon,
    MenuItemVariant,
    Order,
    OrderItem,
    Outlet,
    Payment,
    ServiceCall,
    StockLog,
    TableReservation,
    User,
)

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("db_migration")

# Strict dependency ordering for foreign keys
# Level 0: No foreign key dependencies
# Level 1: Depends only on Level 0
# Level 2: Depends on Level 1 & 0
# Level 3: Depends on Level 2, 1, 0
# Level 4: Depends on Level 3, 2, 1, 0
TABLE_MIGRATION_ORDER: List[Type[Base]] = [
    # Level 0: Root tables
    Outlet,             # Base entity
    Customer,           # Customer directory
    CustomerOTP,        # OTP verification logs

    # Level 1: Depends on Root
    User,               # FK -> outlets.id
    CafeTable,          # FK -> outlets.id
    Category,           # FK -> outlets.id
    Coupon,             # FK -> outlets.id (nullable)
    CustomerAddress,    # FK -> customers.id

    # Level 2: Core entities
    MenuItem,           # FK -> outlets.id, categories.id
    ServiceCall,        # FK -> outlets.id, tables.id
    AuditLog,           # FK -> outlets.id, users.id (nullable)
    TableReservation,   # FK -> outlets.id, tables.id (nullable)
    CashierShift,       # FK -> outlets.id, users.id

    # Level 3: Menu sub-items & transactions
    MenuItemVariant,    # FK -> menu_items.id
    MenuItemAddon,      # FK -> menu_items.id
    StockLog,           # FK -> outlets.id, menu_items.id, users.id
    Order,              # FK -> outlets.id, tables.id, coupons.id, customers.id

    # Level 4: Order items & payments
    OrderItem,          # FK -> orders.id, menu_items.id
    Payment,            # FK -> orders.id
]


def clean_database_url(url: str) -> str:
    """Normalize database connection URL (e.g. postgres:// to postgresql://)."""
    if not url:
        return url
    url = url.strip()
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
        url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return url


def reset_postgres_sequences(engine, target_session: Session) -> None:
    """
    Synchronize PostgreSQL sequence values with the maximum ID present in each table.
    Crucial for auto-increment keys after explicit ID inserts.
    """
    if engine.dialect.name != "postgresql":
        logger.info("Target is not PostgreSQL; skipping sequence synchronization.")
        return

    logger.info("Synchronizing PostgreSQL sequences with max(id)...")
    for model in TABLE_MIGRATION_ORDER:
        table_name = model.__tablename__
        try:
            # Query the sequence name for the 'id' column
            seq_query = text(f"SELECT pg_get_serial_sequence('{table_name}', 'id')")
            seq_name = target_session.execute(seq_query).scalar()

            if seq_name:
                # Set sequence to max(id), or 1 if empty
                sync_query = text(f"""
                    SELECT setval(
                        '{seq_name}',
                        COALESCE((SELECT MAX(id) FROM {table_name}), 1),
                        (SELECT MAX(id) IS NOT NULL FROM {table_name})
                    )
                """)
                target_session.execute(sync_query)
                logger.info(f"  ✓ Reset sequence {seq_name} for table '{table_name}'")
        except Exception as exc:
            logger.warning(f"  ! Could not reset sequence for table '{table_name}': {exc}")

    target_session.commit()
    logger.info("All PostgreSQL sequences synchronized successfully.")


def verify_counts(
    sqlite_session: Session, target_session: Session
) -> Dict[str, Dict[str, int]]:
    """
    Compare record counts between source and target database.
    Returns a dictionary of counts per table.
    """
    comparison = {}
    for model in TABLE_MIGRATION_ORDER:
        table_name = model.__tablename__
        source_count = sqlite_session.query(func.count(model.id)).scalar() or 0
        target_count = target_session.query(func.count(model.id)).scalar() or 0
        comparison[table_name] = {
            "source": source_count,
            "target": target_count,
            "match": source_count == target_count,
        }
    return comparison


def run_migration(
    sqlite_url: str,
    target_url: str,
    dry_run: bool = False,
    create_tables: bool = True,
    truncate_target: bool = False,
    batch_size: int = 500,
) -> bool:
    """Execute the zero-loss migration process."""
    start_time = time.time()
    logger.info("=" * 70)
    logger.info("Surya Family Restaurant Kadiri - SQLite to PostgreSQL Migration")
    logger.info("=" * 70)
    logger.info(f"Source SQLite URL : {sqlite_url}")
    target_display = target_url.split("@")[-1] if "@" in target_url else target_url
    logger.info(f"Target Database   : ...@{target_display}")
    logger.info(f"Dry Run Mode      : {dry_run}")
    logger.info(f"Batch Size        : {batch_size}")
    logger.info("-" * 70)

    # 1. Connect to source SQLite database
    sqlite_engine = create_engine(sqlite_url, echo=False)
    SqliteSession = sessionmaker(bind=sqlite_engine)
    sqlite_session = SqliteSession()

    # 2. Count existing records in SQLite
    logger.info("Scanning source SQLite database records...")
    source_stats: Dict[str, int] = {}
    total_source_records = 0
    for model in TABLE_MIGRATION_ORDER:
        table_name = model.__tablename__
        count = sqlite_session.query(func.count(model.id)).scalar() or 0
        source_stats[table_name] = count
        total_source_records += count
        logger.info(f"  • {table_name:<22}: {count:>5} records")

    logger.info("-" * 70)
    logger.info(f"Total source records identified: {total_source_records}")
    logger.info("-" * 70)

    if dry_run:
        logger.info("[DRY RUN] Verification complete. No changes written to target.")
        sqlite_session.close()
        return True

    # 3. Connect to Target Database
    target_engine = create_engine(
        target_url,
        echo=False,
        pool_pre_ping=True,
    )

    # If target tables need to be created
    if create_tables:
        logger.info("Ensuring target schema tables exist (Base.metadata.create_all)...")
        Base.metadata.create_all(bind=target_engine)
        logger.info("Target schema tables verified / created.")

    TargetSession = sessionmaker(bind=target_engine)
    target_session = TargetSession()

    try:
        # 4. Optional Truncation (Reverse topological order to respect foreign keys)
        if truncate_target:
            logger.warning("Truncating target tables (reverse dependency order)...")
            for model in reversed(TABLE_MIGRATION_ORDER):
                table_name = model.__tablename__
                if target_engine.dialect.name == "postgresql":
                    target_session.execute(text(f"TRUNCATE TABLE {table_name} CASCADE"))
                else:
                    target_session.query(model).delete()
            target_session.commit()
            logger.info("Target tables successfully truncated.")

        # 5. Migrate records in strict topological order
        logger.info("Beginning data transfer...")
        migrated_totals = 0

        for model in TABLE_MIGRATION_ORDER:
            table_name = model.__tablename__
            record_count = source_stats[table_name]

            if record_count == 0:
                logger.info(f"Skipping empty table: {table_name}")
                continue

            logger.info(f"Migrating '{table_name}' ({record_count} records)...")
            column_names = [c.name for c in model.__table__.columns]

            # Fetch all records from source SQLite
            records = sqlite_session.query(model).all()
            batch_data = []

            for record in records:
                # Extract dictionary of column values preserving exact primary keys and types
                row_dict = {col: getattr(record, col) for col in column_names}
                batch_data.append(row_dict)

                if len(batch_data) >= batch_size:
                    target_session.bulk_insert_mappings(model, batch_data)
                    target_session.flush()
                    batch_data = []

            if batch_data:
                target_session.bulk_insert_mappings(model, batch_data)
                target_session.flush()

            target_session.commit()
            migrated_totals += record_count
            logger.info(f"  ✓ Successfully migrated {record_count} rows into '{table_name}'.")

        # 6. Synchronize sequences for PostgreSQL
        reset_postgres_sequences(target_engine, target_session)

        # 7. Post-migration Zero-Data-Loss Verification
        logger.info("-" * 70)
        logger.info("Running post-migration verification audit...")
        audit = verify_counts(sqlite_session, target_session)
        has_mismatch = False

        print("\n" + "=" * 65)
        print(f"{'TABLE NAME':<25} | {'SQLITE':>10} | {'TARGET':>10} | {'STATUS':<10}")
        print("=" * 65)
        for tbl, stat in audit.items():
            status_str = "MATCH" if stat["match"] else "MISMATCH"
            if not stat["match"]:
                has_mismatch = True
            print(
                f"{tbl:<25} | {stat['source']:>10} | {stat['target']:>10} | {status_str:<10}"
            )
        print("=" * 65 + "\n")

        if has_mismatch:
            logger.error("Data verification FAILED! Count mismatch detected.")
            target_session.rollback()
            return False

        elapsed = time.time() - start_time
        logger.info(
            f"Zero-data-loss migration completed successfully! "
            f"Migrated {migrated_totals} records across {len(TABLE_MIGRATION_ORDER)} tables in {elapsed:.2f}s."
        )
        return True

    except Exception as exc:
        logger.exception(f"Migration error occurred: {exc}")
        target_session.rollback()
        return False
    finally:
        sqlite_session.close()
        target_session.close()


def main():
    parser = argparse.ArgumentParser(
        description="Surya Family Restaurant - SQLite to PostgreSQL Database Migration"
    )
    parser.add_argument(
        "--sqlite-path",
        default=os.path.join(BACKEND_DIR, "surya_restaurant.db"),
        help="Path to source SQLite database file",
    )
    parser.add_argument(
        "--sqlite-url",
        default=None,
        help="Custom SQLAlchemy URL for source SQLite",
    )
    parser.add_argument(
        "--pg-url",
        default=None,
        help="Target PostgreSQL connection URL (defaults to DATABASE_URL in environment)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Perform dry-run inspection without writing to target",
    )
    parser.add_argument(
        "--no-create-tables",
        action="store_true",
        help="Skip auto-creation of tables in target database",
    )
    parser.add_argument(
        "--truncate",
        action="store_true",
        help="Truncate target tables before inserting data",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=500,
        help="Batch size for bulk insertions (default: 500)",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable detailed SQL debug logging",
    )

    args = parser.parse_args()

    if args.verbose:
        logger.setLevel(logging.DEBUG)

    # Determine SQLite source URL
    sqlite_url = args.sqlite_url
    if not sqlite_url:
        sqlite_abs_path = os.path.abspath(args.sqlite_path)
        if not os.path.exists(sqlite_abs_path):
            logger.error(f"SQLite database file not found: {sqlite_abs_path}")
            sys.exit(1)
        # Format connection URL for SQLite
        sqlite_url = f"sqlite:///{sqlite_abs_path}"

    # Determine Target PostgreSQL URL
    target_url = args.pg_url or os.getenv("TARGET_DATABASE_URL") or os.getenv("DATABASE_URL")
    if not target_url and not args.dry_run:
        logger.error(
            "Target PostgreSQL URL not specified! "
            "Please provide --pg-url or set DATABASE_URL in your environment."
        )
        sys.exit(1)

    target_url = clean_database_url(target_url) if target_url else ""

    success = run_migration(
        sqlite_url=sqlite_url,
        target_url=target_url,
        dry_run=args.dry_run,
        create_tables=not args.no_create_tables,
        truncate_target=args.truncate,
        batch_size=args.batch_size,
    )

    if not success:
        logger.error("Migration finished with errors.")
        sys.exit(1)

    logger.info("Migration script execution finished.")
    sys.exit(0)


if __name__ == "__main__":
    main()

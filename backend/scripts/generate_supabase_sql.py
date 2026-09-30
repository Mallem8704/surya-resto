"""
Generate clean PostgreSQL DDL & Seed Data for direct 1-click execution in Supabase SQL Editor.
Exports schema and current local records into a single supabase_schema.sql file.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.schema import CreateTable, CreateIndex
from sqlalchemy.dialects import postgresql
from app.models import Base
from app.database import SessionLocal
from app.models import (
    Outlet, Category, MenuItem, MenuItemVariant, MenuItemAddon,
    CafeTable, Coupon, Customer, User
)

OUTPUT_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "supabase_schema.sql")

def generate_sql():
    sql_lines = []
    sql_lines.append("-- ================================================================")
    sql_lines.append("-- SURYA FAMILY RESTAURANT KADIRI - SUPABASE POSTGRESQL SCHEMA")
    sql_lines.append("-- Generated for 1-Click Run in Supabase SQL Editor")
    sql_lines.append("-- ================================================================\n")

    # 1. Enable UUID Extension if needed
    sql_lines.append('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\n')

    # 2. Generate CREATE TABLE DDL for all models in topological order
    for table in Base.metadata.sorted_tables:
        sql_lines.append(f"-- Table: {table.name}")
        create_stmt = str(CreateTable(table).compile(dialect=postgresql.dialect())).strip()
        create_stmt = create_stmt.replace("CREATE TABLE ", "CREATE TABLE IF NOT EXISTS ")
        sql_lines.append(create_stmt + ";\n")

        # Indexes
        for idx in table.indexes:
            idx_stmt = str(CreateIndex(idx).compile(dialect=postgresql.dialect())).strip()
            idx_stmt = idx_stmt.replace("CREATE INDEX ", "CREATE INDEX IF NOT EXISTS ")
            idx_stmt = idx_stmt.replace("CREATE UNIQUE INDEX ", "CREATE UNIQUE INDEX IF NOT EXISTS ")
            sql_lines.append(idx_stmt + ";")
        sql_lines.append("\n")

    # 3. Add RLS Policies so Supabase Client can read Menu & insert Orders
    sql_lines.append("-- ================================================================")
    sql_lines.append("-- ROW LEVEL SECURITY & PUBLIC PERMISSIONS")
    sql_lines.append("-- ================================================================\n")
    
    public_tables = [
        "outlets", "categories", "menu_items", "menu_item_variants",
        "menu_item_addons", "tables", "coupons", "orders", "order_items",
        "customers", "customer_addresses", "table_reservations", "payments"
    ]
    for tbl in public_tables:
        sql_lines.append(f"ALTER TABLE IF EXISTS {tbl} ENABLE ROW LEVEL SECURITY;")
        sql_lines.append(f'DROP POLICY IF EXISTS "Allow public read on {tbl}" ON {tbl};')
        sql_lines.append(f'CREATE POLICY "Allow public read on {tbl}" ON {tbl} FOR SELECT USING (true);')
        sql_lines.append(f'DROP POLICY IF EXISTS "Allow public insert on {tbl}" ON {tbl};')
        sql_lines.append(f'CREATE POLICY "Allow public insert on {tbl}" ON {tbl} FOR INSERT WITH CHECK (true);')
        sql_lines.append(f'DROP POLICY IF EXISTS "Allow public update on {tbl}" ON {tbl};')
        sql_lines.append(f'CREATE POLICY "Allow public update on {tbl}" ON {tbl} FOR UPDATE USING (true);')
        sql_lines.append(f"GRANT ALL ON {tbl} TO anon, authenticated, service_role;\n")

    # 4. Export seed data from local SQLite
    sql_lines.append("-- ================================================================")
    sql_lines.append("-- SEED DATA FROM LOCAL DATABASE")
    sql_lines.append("-- ================================================================\n")

    db = SessionLocal()
    try:
        # Outlets
        for o in db.query(Outlet).all():
            addr = (o.address or '').replace("'", "''")
            ph = o.phone or ''
            curr = o.currency or 'INR'
            tax = o.tax_rate_percent or 5
            hours = o.opening_hours or '11:00 AM - 11:00 PM'
            tag = (o.tagline or 'Authentic Kadiri Flavours').replace("'", "''")
            logo = o.logo_url or ''
            upi = o.upi_vpa or '9880358634@upi'
            sql_lines.append(
                f"INSERT INTO outlets (id, name, address, phone, currency, tax_rate_percent, opening_hours, tagline, logo_url, upi_vpa) "
                f"VALUES ({o.id}, '{o.name}', '{addr}', '{ph}', '{curr}', {tax}, '{hours}', '{tag}', '{logo}', '{upi}') "
                f"ON CONFLICT (id) DO NOTHING;"
            )
        sql_lines.append("\n")

        # Categories
        for c in db.query(Category).all():
            c_name = c.name.replace("'", "''")
            name_te_val = f"'{c.name_te}'" if c.name_te else "NULL"
            sql_lines.append(
                f"INSERT INTO categories (id, outlet_id, name, name_te, sort_order, is_active) "
                f"VALUES ({c.id}, {c.outlet_id}, '{c_name}', {name_te_val}, {c.sort_order or 0}, {str(c.is_active).lower()}) "
                f"ON CONFLICT (id) DO NOTHING;"
            )
        sql_lines.append("\n")

        # Tables
        for t in db.query(CafeTable).all():
            qr = t.qr_code_url or ''
            status_val = t.status or 'free'
            sql_lines.append(
                f"INSERT INTO tables (id, outlet_id, label, status, qr_code_url) "
                f"VALUES ({t.id}, {t.outlet_id}, '{t.label}', '{status_val}', '{qr}') "
                f"ON CONFLICT (id) DO NOTHING;"
            )
        sql_lines.append("\n")

        # Menu Items
        for m in db.query(MenuItem).all():
            m_name = m.name.replace("'", "''")
            desc_val = f"'{m.description.replace('\'', '\'\'')}'" if m.description else "NULL"
            name_te_val = f"'{m.name_te}'" if m.name_te else "NULL"
            img_val = f"'{m.image_url}'" if m.image_url else "NULL"
            sql_lines.append(
                f"INSERT INTO menu_items (id, outlet_id, category_id, name, name_te, description, price_paise, image_url, is_veg, is_available, has_variants, stock_qty) "
                f"VALUES ({m.id}, {m.outlet_id}, {m.category_id}, '{m_name}', {name_te_val}, {desc_val}, {m.price_paise}, {img_val}, {str(m.is_veg).lower()}, {str(m.is_available).lower()}, {str(m.has_variants).lower()}, {m.stock_qty or 100}) "
                f"ON CONFLICT (id) DO NOTHING;"
            )
        sql_lines.append("\n")

        # Menu Item Variants
        for v in db.query(MenuItemVariant).all():
            v_name = v.name.replace("'", "''")
            name_te_val = f"'{v.name_te}'" if v.name_te else "NULL"
            sql_lines.append(
                f"INSERT INTO menu_item_variants (id, item_id, name, name_te, price_paise, is_default, is_available) "
                f"VALUES ({v.id}, {v.item_id}, '{v_name}', {name_te_val}, {v.price_paise}, {str(v.is_default).lower()}, {str(v.is_available).lower()}) "
                f"ON CONFLICT (id) DO NOTHING;"
            )
        sql_lines.append("\n")

        # Menu Item Addons
        for a in db.query(MenuItemAddon).all():
            a_name = a.name.replace("'", "''")
            name_te_val = f"'{a.name_te}'" if a.name_te else "NULL"
            sql_lines.append(
                f"INSERT INTO menu_item_addons (id, item_id, name, name_te, price_paise, is_available) "
                f"VALUES ({a.id}, {a.item_id}, '{a_name}', {name_te_val}, {a.price_paise}, {str(a.is_available).lower()}) "
                f"ON CONFLICT (id) DO NOTHING;"
            )
        sql_lines.append("\n")

        # Coupons
        for cp in db.query(Coupon).all():
            desc_val = f"'{cp.description}'" if cp.description else "NULL"
            sql_lines.append(
                f"INSERT INTO coupons (id, outlet_id, code, description, discount_type, discount_value, min_order_paise, max_discount_paise, is_active) "
                f"VALUES ({cp.id}, {cp.outlet_id or 1}, '{cp.code}', {desc_val}, '{cp.discount_type}', {cp.discount_value}, {cp.min_order_paise or 0}, {cp.max_discount_paise or 0}, {str(cp.is_active).lower()}) "
                f"ON CONFLICT (id) DO NOTHING;"
            )
        sql_lines.append("\n")

        # Reset Sequences to match max IDs
        seq_tables = ["outlets", "categories", "menu_items", "menu_item_variants", "menu_item_addons", "tables", "coupons", "customers", "orders", "order_items", "payments"]
        for st in seq_tables:
            sql_lines.append(f"SELECT setval(pg_get_serial_sequence('{st}', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM {st};")

    finally:
        db.close()

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write("\n".join(sql_lines))

    print(f"[OK] Generated Supabase SQL file at: {OUTPUT_FILE} ({len(sql_lines)} lines)")

if __name__ == "__main__":
    generate_sql()

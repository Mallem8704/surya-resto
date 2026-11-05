# -*- coding: utf-8 -*-
"""
Surya Family Restaurant Kadiri — Menu Database Synchronization Script
Synchronizes backend/surya_restaurant.db with the official physical menu dataset in app/surya_data.py.
Ensures 100% price accuracy, updates existing dishes and variants, and inserts all missing dishes.
"""

import os
import sys
import datetime
import sqlite3

# Ensure UTF-8 output on Windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

# Add backend directory to sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from app.surya_data import CATEGORIES, ITEMS

DB_PATH = os.path.join(backend_dir, "surya_restaurant.db")

# Explicit mapping from previous placeholder names in the DB to authentic menu item names
OLD_NAME_TO_AUTHENTIC = {
    "Surya Special Hyderabadi Chicken Dum Biryani": "Hyderabadi Chicken Dum Biryani",
    "Chicken Fry Piece Biryani (Andhra Special)": "Hyderabadi Chicken Fry Piece Biryani",
    "Special Mutton Dum Biryani": "Hyderabadi Mutton Dum Biryani",
    "Kaju Paneer Biryani": "Kaju Paneer Biryani",
    "Surya Special Veg Dum Biryani": "Veg Biryani",
    "Egg Dum Biryani": "Egg Biryani",
    "Punjabi Chicken Curry (Chef Special)": "Punjab Chicken(Bone)",
    "Butter Chicken (Murgh Makhani)": "Butter Chicken (Boneless)",
    "Kadai Chicken": "Kadai Chicken(Boneless)",
    "Andhra Chicken Curry (Guntur Spiced)": "Andhra Chicken(Boneless)",
    "Paneer Butter Masala": "Paneer Butter masala",
    "Kadai Paneer": "Kadai Paneer",
    "Kaju Tomato Curry": "Tomato curry",
    "Dal Tadka (Desi Ghee)": "Dal Tadka",
    "Mushroom Masala": "Mushroom Masala",
    "Tandoori Chicken (Full / Half)": "Tandoori Chicken",
    "Chicken Tikka (6 Pcs)": "Tandoori Chicken Tikka(Boneless)",
    "Tangdi Kebab (3 Pcs)": "Tangdi Kabab",
    "Paneer Tikka (6 Pcs)": "Paneer pepper roast",
    "Chicken Lollipop (Saucy / Dry)": "Chicken Lollipop (Bone) (6 Pieces)",
    "Chilli Chicken": "Chilli Chicken (Boneless)",
    "Dragon Chicken": "Dragon Chicken (Boneless)",
    "Apollo Fish": "Apollo Fish",
    "Guntur Chicken Dry": "Red Hot Chicken",
    "Crispy Corn Pepper Salt": "Baby Corn Crispy",
    "Veg Manchurian (Dry)": "Veg manchurian",
    "Chilli Paneer (Dry)": "Paneer chilli",
    "Gobi 65": "Gobi 65",
    "Butter Naan": "Butter Naan",
    "Garlic Butter Naan": "Garlic Naan",
    "Tandoori Roti (Butter)": "Tandoori Roti (Butter)",
    "Tandoori Roti (Plain)": "Tandoori Roti (Plain)",
    "Rumali Roti": "Rumali Roti",
    "Surya Special Chicken Fried Rice": "Surya Special Chicken Fried Rice",
    "Schezwan Chicken Fried Rice": "Schezwan Chicken Fried Rice",
    "Veg Fried Rice": "Veg Fried Rice",
    "Chicken Hakka Noodles": "Chicken Hakka Noodles",
    "Veg Hakka Noodles": "Veg Hakka Noodles",
    "Chicken Manchow Soup": "Chicken Manchow Soup",
    "Sweet Corn Chicken Soup": "Sweet Corn Chicken Soup",
    "Cream of Tomato Soup": "Cream of Tomato Soup",
    "Curd Rice (Bagala Bath)": "Curd Rice (Bagala Bath)",
    "Jeera Rice": "Jeera Rice",
    "Fresh Lime Soda (Sweet / Salt)": "Fresh Lime Soda (Sweet / Salt)",
    "Sweet Lassi (Chilled)": "Sweet Lassi (Chilled)",
    "Gulab Jamun with Vanilla Ice Cream (2 Pcs)": "Gulab Jamun with Vanilla Ice Cream (2 Pcs)",
    "Apricot Delight (Surya Special)": "Apricot Delight (Surya Special)",
    "Thums Up / Soft Drinks (750ml)": "Thums Up / Soft Drinks (750ml)",
}


def sync_menu():
    print("=" * 70)
    print("SURYA FAMILY RESTAURANT — MENU DATABASE SYNCHRONIZATION")
    print(f"Connecting to database: {DB_PATH}")
    print("=" * 70)

    if not os.path.exists(DB_PATH):
        raise FileNotFoundError(f"Database file not found at: {DB_PATH}")

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    # 1. Verify / Sync Categories
    print("\n[STEP 1] Synchronizing Categories...")
    for cat in CATEGORIES:
        c.execute("SELECT id FROM categories WHERE id = ?", (cat["id"],))
        row = c.fetchone()
        if row:
            c.execute(
                """
                UPDATE categories
                SET name = ?, name_te = ?, sort_order = ?, is_active = ?
                WHERE id = ?
                """,
                (cat["name"], cat.get("name_te"), cat["sort_order"], 1 if cat.get("is_active", True) else 0, cat["id"]),
            )
        else:
            c.execute(
                """
                INSERT INTO categories (id, outlet_id, name, name_te, sort_order, is_active, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (cat["id"], 1, cat["name"], cat.get("name_te"), cat["sort_order"], 1, datetime.datetime.utcnow().isoformat()),
            )
    print(f"  Synced {len(CATEGORIES)} categories successfully.")

    # 2. Fetch existing menu items
    print("\n[STEP 2] Inspecting existing menu items in database...")
    c.execute("SELECT id, name, price_paise FROM menu_items WHERE outlet_id = 1")
    existing_items = c.fetchall()
    existing_by_name = {row["name"]: row["id"] for row in existing_items}
    existing_by_id = {row["id"]: row["name"] for row in existing_items}
    print(f"  Found {len(existing_items)} existing dishes in database.")

    # Map target items to existing DB ids
    # target_name -> db_id
    matched_target_to_db = {}

    for db_name, db_id in existing_by_name.items():
        if db_name in OLD_NAME_TO_AUTHENTIC:
            target_name = OLD_NAME_TO_AUTHENTIC[db_name]
            matched_target_to_db[target_name] = db_id
        else:
            # Check exact match with any item in ITEMS
            for item in ITEMS:
                if item["name"].lower() == db_name.lower():
                    matched_target_to_db[item["name"]] = db_id
                    break

    # 3. Synchronize Items & Variants
    print("\n[STEP 3] Updating existing dishes and inserting missing dishes...")
    updated_items_count = 0
    inserted_items_count = 0
    total_variants_synced = 0
    total_addons_synced = 0

    now_iso = datetime.datetime.utcnow().isoformat()

    for item in ITEMS:
        target_name = item["name"]
        cat_id = item["cat"]
        name_te = item.get("name_te")
        desc = item.get("desc")
        price_paise = item["price_paise"]
        veg = 1 if item["veg"] else 0
        img = item.get("img")
        is_special = 1 if item.get("is_special") else 0
        variants_data = item.get("variants", [])
        addons_data = item.get("addons", [])
        has_vars = 1 if len(variants_data) > 0 else 0

        # Check if item exists in DB
        db_id = matched_target_to_db.get(target_name)

        if db_id is not None:
            # UPDATE existing dish
            c.execute(
                """
                UPDATE menu_items
                SET category_id = ?,
                    name = ?,
                    name_te = ?,
                    description = ?,
                    price_paise = ?,
                    image_url = ?,
                    is_veg = ?,
                    is_available = 1,
                    has_variants = ?,
                    is_special = ?
                WHERE id = ?
                """,
                (cat_id, target_name, name_te, desc, price_paise, img, veg, has_vars, is_special, db_id),
            )
            item_id = db_id
            updated_items_count += 1
        else:
            # INSERT new dish
            c.execute(
                """
                INSERT INTO menu_items (
                    outlet_id, category_id, name, name_te, description,
                    price_paise, image_url, is_veg, is_available,
                    has_variants, track_stock, stock_qty, low_stock_threshold,
                    is_special, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 0, 100, 10, ?, ?)
                """,
                (1, cat_id, target_name, name_te, desc, price_paise, img, veg, has_vars, is_special, now_iso),
            )
            item_id = c.lastrowid
            inserted_items_count += 1

        # Synchronize Variants for this item
        # Delete existing variants for clean sync
        c.execute("DELETE FROM menu_item_variants WHERE item_id = ?", (item_id,))
        if variants_data:
            for v in variants_data:
                c.execute(
                    """
                    INSERT INTO menu_item_variants (
                        item_id, name, name_te, price_paise, is_default, is_available, created_at
                    ) VALUES (?, ?, ?, ?, ?, 1, ?)
                    """,
                    (
                        item_id,
                        v["name"],
                        v.get("name_te"),
                        v["price_paise"],
                        1 if v.get("is_default", False) else 0,
                        now_iso,
                    ),
                )
                total_variants_synced += 1

        # Synchronize Addons for this item
        c.execute("DELETE FROM menu_item_addons WHERE item_id = ?", (item_id,))
        if addons_data:
            for a in addons_data:
                c.execute(
                    """
                    INSERT INTO menu_item_addons (
                        item_id, name, name_te, price_paise, is_available, created_at
                    ) VALUES (?, ?, ?, ?, 1, ?)
                    """,
                    (
                        item_id,
                        a["name"],
                        a.get("name_te"),
                        a["price_paise"],
                        now_iso,
                    ),
                )
                total_addons_synced += 1

    conn.commit()

    print("\n" + "=" * 70)
    print("DATABASE SYNCHRONIZATION RESULTS")
    print("=" * 70)
    print(f"  Dishes updated in place : {updated_items_count}")
    print(f"  Dishes newly inserted   : {inserted_items_count}")
    print(f"  Total dishes in catalog : {len(ITEMS)}")
    print(f"  Portion variants synced : {total_variants_synced}")
    print(f"  Addons synced           : {total_addons_synced}")

    # 4. Verification queries
    c.execute("SELECT count(*) FROM menu_items WHERE outlet_id = 1")
    total_db_items = c.fetchone()[0]

    c.execute("SELECT count(*) FROM menu_item_variants")
    total_db_variants = c.fetchone()[0]

    c.execute("SELECT count(*) FROM menu_items WHERE price_paise % 100 != 0")
    paise_check_fail = c.fetchone()[0]

    print(f"\n[VERIFICATION]")
    print(f"  Total menu items in DB: {total_db_items}")
    print(f"  Total variants in DB  : {total_db_variants}")
    print(f"  Paise integrity check : {'PASSED (All price_paise = Rs * 100)' if paise_check_fail == 0 else 'FAILED'}")

    # Sample check of key physical menu dishes
    print("\n[SAMPLE CHECK OF PHYSICAL MENU DISHES]")
    sample_queries = [
        "Hyderabadi Chicken Dum Biryani",
        "Hyderabadi Mutton Dum Biryani",
        "Tandoori Chicken",
        "Apollo Fish",
        "Chilli Chicken (Boneless)",
        "Butter Chicken (Boneless)",
        "Dal Fry",
        "Special veg curry (SPECIAL)",
        "Butter Naan",
    ]
    for q in sample_queries:
        c.execute(
            """
            SELECT id, name, price_paise / 100 as price_rs, has_variants, is_veg
            FROM menu_items
            WHERE name = ?
            """,
            (q,),
        )
        row = c.fetchone()
        if row:
            print(f"  ✓ {row['name']} -> Rs {row['price_rs']} (Paise: {row['price_rs']*100}), veg={bool(row['is_veg'])}, variants={bool(row['has_variants'])}")
            if row['has_variants']:
                c.execute("SELECT name, price_paise / 100 as v_rs, is_default FROM menu_item_variants WHERE item_id = ?", (row['id'],))
                for v in c.fetchall():
                    print(f"      • {v['name']}: Rs {v['v_rs']} {'(default)' if v['is_default'] else ''}")
        else:
            print(f"  ✗ MISSING: {q}")

    conn.close()
    print("\nSync completed successfully!")


if __name__ == "__main__":
    sync_menu()

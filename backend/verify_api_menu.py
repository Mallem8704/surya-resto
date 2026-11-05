# -*- coding: utf-8 -*-
import urllib.request
import json
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

url = "http://127.0.0.1:8000/api/menu"
try:
    with urllib.request.urlopen(url) as req:
        data = json.loads(req.read().decode("utf-8"))
        print(f"HTTP Status: {req.status}")
        print(f"Total menu items returned by API: {len(data)}")

        # Check items by category
        cat_counts = {}
        for item in data:
            cat_counts[item["category_id"]] = cat_counts.get(item["category_id"], 0) + 1

        print("\nItems per category ID in API response:")
        for cat_id, cnt in sorted(cat_counts.items()):
            print(f"  Category {cat_id}: {cnt} items")

        # Verify sample items from physical menu
        samples = [
            ("Hyderabadi Chicken Dum Biryani", 220),
            ("Hyderabadi Chicken Fry Piece Biryani", 240),
            ("Chitti Muthyalu Mutton Dum Biryani", 340),
            ("Tandoori Chicken", 250),
            ("Apollo Fish", 260),
            ("Chicken 555 (Boneless)", 260),
            ("Chicken Lollipop (Bone) (6 Pieces)", 270),
            ("Dragon Chicken (Boneless)", 290),
            ("Mutton 65", 320),
            ("Mutton Ghee Roast Special", 380),
            ("Dum Ka Mutton", 370),
            ("Egg 65", 160),
            ("Butter Chicken (Boneless)", 250),
            ("Dum ka chicken(Bone)", 290),
            ("Paneer chilli", 230),
            ("Dal Fry", 130),
            ("Special veg curry (SPECIAL)", 260),
            ("Butter Naan", 40),
            ("Garlic Naan", 50),
        ]

        print("\nSample physical menu items verification in API response:")
        item_map = {item["name"]: item for item in data}
        all_passed = True
        for name, expected_rs in samples:
            if name in item_map:
                it = item_map[name]
                actual_rs = it["price_paise"] // 100
                v_info = ""
                if it.get("variants"):
                    v_info = " | Variants: " + ", ".join(f"{v['name']}: Rs {v['price_paise']//100}" for v in it["variants"])
                match_str = "MATCH" if actual_rs == expected_rs else f"MISMATCH (Expected {expected_rs})"
                if actual_rs != expected_rs:
                    all_passed = False
                print(f"  [{match_str}] {it['name']}: Rs {actual_rs} (price_paise: {it['price_paise']}){v_info}")
            else:
                print(f"  [MISSING] {name}")
                all_passed = False

        print(f"\nOverall sample check: {'ALL PASSED 100%' if all_passed else 'SOME FAILED'}")

except Exception as e:
    print(f"Error fetching API: {e}")

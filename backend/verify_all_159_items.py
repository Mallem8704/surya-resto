# -*- coding: utf-8 -*-
"""
Verification script: Checks all 159 items from sheets 1-8 against GET /api/menu
"""
import urllib.request
import json
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

# Exact transcription of 159 items and their expected prices (Full/default price in Rs)
PHYSICAL_MENU = [
    # SHEET 1
    ("Hyderabadi Chicken Dum Biryani", 220, {"Single": 150, "Full": 220, "Family Pack": 520}),
    ("Hyderabadi Chicken Fry Piece Biryani", 240, {"Full": 240, "Family Pack": 550}),
    ("Special Chicken Biryani(Boneless)", 260, {"Full": 260, "Family Pack(Boneless)": 600}),
    ("Hyderabadi Mutton Dum Biryani", 320, {"Full": 320, "Family Pack": 700}),
    ("Hyderabadi Mutton Fry Piece Biryani", 340, {"Full": 340, "Family Pack": 700}),
    ("Chitti Muthyalu Chicken Dum Biryani", 240, {"Full": 240, "Family Pack": 560}),
    ("Chitti Muthyalu Special Chicken Biryani(Boneless)", 280, {"Full": 280, "Family Pack": 660}),
    ("Chitti Muthyalu Mutton Dum Biryani", 340, {"Full": 340, "Family Pack": 740}),
    ("Kamju Biryani", 280, None),
    ("Fish Biryani(Boneless)", 270, None),
    ("Prawns Biryani", 320, None),
    ("Egg Biryani", 170, None),
    ("Mughlai Biryani(Boneless)", 270, None),
    ("Lollipop Biryani(3 Piece)", 290, None),
    ("Joint Piece Biryani", 300, None),
    ("Dilkush Biryani", 300, None),
    # SHEET 2
    ("Veg Biryani", 170, None),
    ("Veg Pulao", 190, None),
    ("Paneer Biryani", 250, None),
    ("Mushroom Biryani", 230, None),
    ("Kaju Biryani", 270, None),
    ("Biryani Rice", 120, None),
    ("Kaju Paneer Biryani", 290, None),
    ("Tandoori Chicken", 250, {"Half": 250, "Full": 480}),
    ("Tandoori Chicken Tikka(Boneless)", 330, None),
    ("Tangdi Kabab", 180, {"Half(2 Piece)": 180, "Full(4 Piece)": 350}),
    ("Fish Tikka", 300, None),
    ("Malai Chicken Tikka", 350, None),
    ("Apollo Fish", 260, None),
    ("Fish Pepper Roast", 260, None),
    ("Fish Chilli", 250, None),
    ("Tiger Fish", 260, None),
    ("Coriander Fish", 270, None),
    ("Fish Curry(boneless)", 270, None),
    # SHEET 3
    ("Chilli Chicken (Boneless)", 240, None),
    ("Chicken 65 (Boneless)", 240, None),
    ("Chicken 85 (Boneless)", 250, None),
    ("Chicken 99 (Boneless)", 250, None),
    ("Chicken 555 (Boneless)", 260, None),
    ("Kaju Chicken (Boneless)", 260, None),
    ("Coriander Chicken (Boneless)", 260, None),
    ("Chicken Pepper Roast (Boneless)", 240, None),
    ("Chicken Kabab (Bone)", 200, None),
    ("Chicken Majestic (Boneless)", 260, None),
    ("Chicken Lollipop (Bone) (6 Pieces)", 270, None),
    ("Chicken Lollipop(Bone) (Juice) (6 Pieces)", 270, None),
    ("Schezwan Chicken (Boneless)", 260, None),
    ("Lemon Chicken (Boneless)", 260, None),
    ("Thumbs Up Chicken (Bone)", 310, None),
    ("Red Hot Chicken", 260, None),
    ("Chicken Manchuria", 250, None),
    ("Garlic Chicken", 270, None),
    ("Basket Chicken (Boneless)", 290, None),
    ("Dragon Chicken (Boneless)", 290, None),
    ("Chicken Abu Dhabi (Boneless)", 300, None),
    ("Stick Chicken", 300, None),
    ("Chicken Mangolian", 300, None),
    ("Chicken Ghee Roast", 300, None),
    ("Chicken Maharaja", 300, None),
    # SHEET 4
    ("Mutton 65", 320, None),
    ("Mutton Chilli", 320, None),
    ("Mutton Roast", 350, None),
    ("Garlic Mutton", 350, None),
    ("Mutton Fry", 350, None),
    ("Mutton Kali Mirchi Fry", 350, None),
    ("Mutton Keema Balls", 380, None),
    ("Mutton Ghee Roast Special", 380, None),
    ("Kamju Pepper Roast", 270, None),
    ("Kamju 65", 270, None),
    ("Kamju Chilli", 260, None),
    ("Kamju Fry", 270, None),
    ("Kamju Curry", 270, None),
    ("Prawns Pepper Roast", 320, None),
    ("Prawns chilli", 310, None),
    ("Prawns 65", 320, None),
    ("Loose Prawns", 330, None),
    # SHEET 5
    ("Andhra Mutton", 350, None),
    ("Kadai Mutton", 350, None),
    ("Mutton Keema Curry", 350, None),
    ("Mutton Kolhapuri", 350, None),
    ("Dum Ka Mutton", 370, None),
    ("Mutton Rogan Josh", 350, None),
    ("Hyderabad Mutton Curry", 350, None),
    ("Rayalaseema Mutton Curry", 350, None),
    ("Guntur Mutton Curry", 350, None),
    ("Egg 65", 160, None),
    ("Egg Manchurian", 170, None),
    ("Egg Chilli", 160, None),
    ("Egg Omlette", 120, None),
    ("Egg Pepper Roast", 170, None),
    ("Egg Bhurji", 160, None),
    ("Egg Fry", 170, None),
    ("Egg Curry", 160, None),
    ("Boiled Egg", 20, None),
    # SHEET 6
    ("Chicken Curry(Bone)", 220, None),
    ("Chicken Curry(Boneless)", 240, None),
    ("Punjab Chicken(Bone)", 220, None),
    ("Butter Chicken (Boneless)", 250, None),
    ("Chicken Fry(Semi Gravy)", 220, None),
    ("Kadai Chicken(Boneless)", 240, None),
    ("Chicken Kolhapuri(Bone)", 220, None),
    ("Methi Chicken(Boneless)", 240, None),
    ("Andhra Chicken(Boneless)", 250, None),
    ("Chicken Mughalai(Bone)", 250, None),
    ("Hyderabad Chicken Curry(Boneless)", 250, None),
    ("Chicken Patiala(Boneless)", 250, None),
    ("Chicken Rayalaseema (Boneless)", 250, None),
    ("Chicken Masala (Bone)", 220, None),
    ("Chicken Chetpat", 250, None),
    ("Chicken Afghan", 300, None),
    ("Dum ka chicken(Bone)", 290, None),
    ("Chicken shahjahani", 240, None),
    ("Chicken Tiranga", 240, None),
    # SHEET 7
    ("Gobi Chilli", 150, None),
    ("Gobi 65", 160, None),
    ("Gobi Munchurian", 160, None),
    ("Mushroom Chilli", 200, None),
    ("Mushroom 65", 210, None),
    ("Mushroom Munchurian", 210, None),
    ("Mushroom Pepper Roast", 210, None),
    ("Baby Corn Chilli", 180, None),
    ("Baby Corn 65", 190, None),
    ("Baby Corn Munchrian", 190, None),
    ("Baby Corn Crispy", 210, None),
    ("Paneer pepper roast", 240, None),
    ("Paneer chilli", 230, None),
    ("Paneer 65", 240, None),
    ("Paneer Manchurian", 240, None),
    ("Veg Bullets", 220, None),
    ("Veg crispy", 200, None),
    ("Veg manchurian", 200, None),
    ("Masala Papad", 60, None),
    ("Roasted Papad", 50, None),
    ("Paneer Majestic", 260, None),
    ("Veg cutlet", 230, None),
    ("Veg Malasiya", 240, None),
    ("Veg hara bhara kabab", 260, None),
    # SHEET 8
    ("Dal Fry", 130, None),
    ("Dal Tadka", 150, None),
    ("Mixed Vegetable curry", 170, None),
    ("Kadai Veg", 180, None),
    ("Veg Chatpata", 180, None),
    ("Veg Kolhapuri", 180, None),
    ("Shahi Paneer", 250, None),
    ("Palak Paneer", 240, None),
    ("Kadai Paneer", 250, None),
    ("Paneer Methi Chaman", 250, None),
    ("Kaju Curry", 260, None),
    ("Mushroom Masala", 220, None),
    ("Kadai mushroom", 220, None),
    ("Baby corn masala", 200, None),
    ("Capsicum Paneer masala", 180, None),
    ("Tomato curry", 140, None),
    ("Plain Palak", 160, None),
    ("Paneer Butter masala", 230, None),
    ("Kaju Paneer", 250, None),
    ("Capsikam Kaju masala", 250, None),
    ("Special veg curry (SPECIAL)", 260, None),
    ("Veg Chandini (SPECIAL)", 260, None),
]

url = "http://127.0.0.1:8000/api/menu"
with urllib.request.urlopen(url) as req:
    data = json.loads(req.read().decode("utf-8"))

item_map = {it["name"]: it for it in data}

passed = 0
failed = 0
errors = []

for idx, (name, expected_price, expected_variants) in enumerate(PHYSICAL_MENU, 1):
    if name not in item_map:
        failed += 1
        errors.append(f"#{idx} MISSING: {name}")
        continue
    it = item_map[name]
    actual_price = it["price_paise"] // 100
    if actual_price != expected_price:
        failed += 1
        errors.append(f"#{idx} PRICE MISMATCH for {name}: Expected Rs {expected_price}, got Rs {actual_price}")
        continue

    # Check variants if applicable
    if expected_variants:
        actual_variants = {v["name"]: v["price_paise"] // 100 for v in it.get("variants", [])}
        for vname, vprice in expected_variants.items():
            if vname not in actual_variants:
                failed += 1
                errors.append(f"#{idx} VARIANT MISSING for {name}: {vname}")
                break
            elif actual_variants[vname] != vprice:
                failed += 1
                errors.append(f"#{idx} VARIANT PRICE MISMATCH for {name} ({vname}): Expected Rs {vprice}, got Rs {actual_variants[vname]}")
                break
        else:
            passed += 1
    else:
        passed += 1

print(f"Total Physical Menu Items Verified: {len(PHYSICAL_MENU)}")
print(f"Passed: {passed}")
print(f"Failed: {failed}")

if errors:
    print("\nErrors:")
    for err in errors:
        print("  -", err)
else:
    print("\nCONGRATULATIONS: 100% OF ALL 159 PHYSICAL MENU ITEMS MATCH PERFECTLY!")

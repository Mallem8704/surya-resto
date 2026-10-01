import json
import re
import sys

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

with open("scratch/pinterest_expanded_index.json", "r", encoding="utf-8") as f:
    pins = json.load(f)

# The 48 dishes from Surya Restaurant menu
menu_dishes = [
    (1, "Hyderabadi Chicken Dum Biryani", "hyderabadi_chicken_dum_biryani.jpg", ["hyderabadi chicken dum biryani", "hyderabadi biryani", "chicken dum biryani"]),
    (2, "Andhra Chicken Fry Piece Biryani", "chicken_fry_piece_biryani.jpg", ["chicken fry biryani", "fry piece biryani", "chicken biryani"]),
    (3, "Special Mutton Dum Biryani", "special_mutton_dum_biryani.jpg", ["mutton biryani", "gosht biryani", "lamb biryani"]),
    (4, "Kaju Paneer Biryani", "kaju_paneer_biryani.jpg", ["kaju paneer biryani", "paneer biryani"]),
    (5, "Surya Special Veg Dum Biryani", "veg_dum_biryani.jpg", ["veg dum biryani", "vegetable dum biryani", "veg biryani"]),
    (6, "Egg Dum Biryani", "egg_dum_biryani.jpg", ["egg dum biryani", "egg biryani", "anda biryani"]),
    (7, "Punjabi Chicken Curry", "punjabi_chicken_curry.jpg", ["punjabi chicken curry", "tariwala chicken", "chicken curry"]),
    (8, "Butter Chicken (Murgh Makhani)", "butter_chicken_makhani.jpg", ["butter chicken", "murgh makhani"]),
    (9, "Kadai Chicken", "kadai_chicken.jpg", ["kadai chicken", "karahi chicken"]),
    (10, "Andhra Chicken Curry", "andhra_chicken_curry.jpg", ["andhra chicken curry", "andhra chicken", "kodi kura"]),
    (11, "Paneer Butter Masala", "paneer_butter_masala.jpg", ["paneer butter masala", "paneer makhani"]),
    (12, "Kadai Paneer", "kadai_paneer.jpg", ["kadai paneer", "karahi paneer"]),
    (13, "Kaju Tomato Curry", "kaju_tomato_curry.jpg", ["kaju curry", "kaju masala", "cashew curry"]),
    (14, "Dal Tadka (Desi Ghee)", "dal_tadka.jpg", ["dal tadka", "yellow dal tadka", "restaurant style dal tadka"]),
    (15, "Mushroom Masala", "mushroom_masala.jpg", ["mushroom masala", "mushroom curry", "kadai mushroom"]),
    (16, "Tandoori Chicken", "tandoori_chicken.jpg", ["tandoori chicken"]),
    (17, "Chicken Tikka", "chicken_tikka.jpg", ["chicken tikka"]),
    (18, "Tangdi Kebab", "tangdi_kebab.jpg", ["tangdi kebab", "tangri kebab", "chicken drumsticks", "tandoori drumsticks"]),
    (19, "Paneer Tikka", "paneer_tikka.jpg", ["paneer tikka", "tandoori paneer tikka"]),
    (20, "Chicken Lollipop", "chicken_lollipop.jpg", ["chicken lollipop", "lollipop chicken"]),
    (21, "Chilli Chicken", "chilly_chicken_dry.jpg", ["chilli chicken", "chili chicken", "indo chinese chilli chicken"]),
    (22, "Dragon Chicken", "dragon_chicken.jpg", ["dragon chicken", "crispy honey chicken", "crispy chicken"]),
    (23, "Apollo Fish", "apollo_fish.jpg", ["apollo fish", "fish fry", "amritsari fish"]),
    (24, "Guntur Chicken Dry", "guntur_chicken_dry.jpg", ["chicken sukka", "chicken roast", "chicken chukka", "chicken fry"]),
    (25, "Crispy Corn Pepper Salt", "crispy_corn.jpg", ["crispy corn", "crispy corn pepper salt", "corn pepper salt"]),
    (26, "Veg Manchurian Dry", "veg_manchurian.jpg", ["veg manchurian", "vegetable manchurian"]),
    (27, "Chilli Paneer Dry", "chilly_paneer.jpg", ["chilli paneer", "chili paneer"]),
    (28, "Gobi 65", "gobi_65.jpg", ["gobi 65", "cauliflower 65", "crispy gobi"]),
    (29, "Butter Naan", "butter_naan.jpg", ["butter naan", "naan bread", "tandoori naan"]),
    (30, "Garlic Butter Naan", "garlic_butter_naan.jpg", ["garlic naan", "garlic butter naan"]),
    (31, "Tandoori Roti Plain", "tandoori_roti_plain.jpg", ["tandoori roti", "roti"]),
    (32, "Tandoori Roti Butter", "tandoori_roti_butter.jpg", ["butter roti", "tandoori roti"]),
    (33, "Rumali Roti", "rumali_roti.jpg", ["rumali roti", "roomali roti", "soft roti"]),
    (34, "Chicken Fried Rice", "chicken_fried_rice.jpg", ["chicken fried rice"]),
    (35, "Schezwan Chicken Fried Rice", "schezwan_chicken_fried_rice.jpg", ["schezwan fried rice", "szechuan fried rice", "schezwan rice"]),
    (36, "Veg Fried Rice", "veg_fried_rice.jpg", ["veg fried rice", "vegetable fried rice"]),
    (37, "Chicken Hakka Noodles", "chicken_hakka_noodles.jpg", ["chicken hakka noodles", "chicken noodles"]),
    (38, "Veg Hakka Noodles", "veg_hakka_noodles.jpg", ["veg hakka noodles", "vegetable hakka noodles", "hakka noodles"]),
    (39, "Chicken Manchow Soup", "chicken_manchow_soup.jpg", ["chicken manchow soup", "manchow soup"]),
    (40, "Sweet Corn Chicken Soup", "chicken_sweet_corn_soup.jpg", ["chicken sweet corn soup", "sweet corn soup", "corn soup"]),
    (41, "Cream of Tomato Soup", "cream_of_tomato_soup.jpg", ["cream of tomato soup", "tomato soup"]),
    (42, "Curd Rice (Bagala Bath)", "curd_rice_bagala_bath.jpg", ["curd rice", "thayir sadam", "daddojanam"]),
    (43, "Jeera Rice", "jeera_rice.jpg", ["jeera rice", "cumin rice"]),
    (44, "Fresh Lime Soda", "fresh_lime_soda.jpg", ["fresh lime soda", "nimbu soda", "lemon soda", "lime soda"]),
    (45, "Sweet Lassi", "sweet_lassi.jpg", ["sweet lassi", "punjabi lassi", "mango lassi", "lassi"]),
    (46, "Gulab Jamun with Ice Cream", "gulab_jamun_icecream.jpg", ["gulab jamun", "gulab jamun with ice cream"]),
    (47, "Apricot Delight", "apricot_delight.jpg", ["khubani ka meetha", "qubani ka meetha", "apricot dessert", "apricot halwa"]),
    (48, "Thums Up", "thums_up_beverage.jpg", ["masala thums up", "thums up", "coca cola", "cold drink", "soda"])
]

results = []

for did, name, fname, search_terms in menu_dishes:
    matched_pin = None
    matched_term = None
    
    # Priority matching: check title first, then desc
    for term in search_terms:
        pattern = r'\b' + re.escape(term) + r'\b'
        for pin in pins:
            title = pin["title"].lower()
            if re.search(pattern, title, re.IGNORECASE):
                matched_pin = pin
                matched_term = f"Title: {term}"
                break
        if matched_pin:
            break
            
    if not matched_pin:
        # Check description
        for term in search_terms:
            pattern = r'\b' + re.escape(term) + r'\b'
            for pin in pins:
                desc = pin["desc"].lower()
                if re.search(pattern, desc, re.IGNORECASE):
                    matched_pin = pin
                    matched_term = f"Desc: {term}"
                    break
            if matched_pin:
                break
                
    if matched_pin:
        results.append({
            "id": did,
            "name": name,
            "filename": fname,
            "creator": matched_pin["creator"],
            "title": matched_pin["title"],
            "url": matched_pin["img_1200"],
            "match": matched_term
        })
        print(f"[{did:2d}] MATCH: {name:30s} -> {matched_pin['creator']} ({matched_term})")
        print(f"     Title: {matched_pin['title'][:70]}")
        print(f"     URL:   {matched_pin['img_1200']}")
    else:
        print(f"[{did:2d}] NO MATCH: {name}")

print(f"\nTotal matched: {len(results)} / {len(menu_dishes)}")
with open("scratch/matched_pinterest_dishes.json", "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2, ensure_ascii=False)

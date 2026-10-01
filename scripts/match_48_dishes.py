import json
import re
import sys

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

with open("scratch/pinterest_pin_index.json", "r", encoding="utf-8") as f:
    pins = json.load(f)

# List of 48 dishes from suryaMenuData
dishes = [
    (1, "Hyderabadi Chicken Dum Biryani", ["hyderabadi", "chicken", "biryani"]),
    (2, "Andhra Chicken Fry Piece Biryani", ["fry", "chicken", "biryani"]),
    (3, "Special Mutton Dum Biryani", ["mutton", "biryani"]),
    (4, "Kaju Paneer Biryani", ["paneer", "biryani"]),
    (5, "Surya Special Veg Dum Biryani", ["veg", "vegetable", "biryani"]),
    (6, "Egg Dum Biryani", ["egg", "biryani"]),
    (7, "Punjabi Chicken Curry", ["punjabi", "chicken", "curry"]),
    (8, "Butter Chicken (Murgh Makhani)", ["butter chicken", "makhani"]),
    (9, "Kadai Chicken", ["kadai chicken", "karahi chicken"]),
    (10, "Andhra Chicken Curry", ["andhra", "chicken", "curry"]),
    (11, "Paneer Butter Masala", ["paneer", "butter", "masala"]),
    (12, "Kadai Paneer", ["kadai paneer", "karahi paneer"]),
    (13, "Kaju Tomato Curry", ["kaju", "tomato", "curry"]),
    (14, "Dal Tadka", ["dal tadka", "yellow dal"]),
    (15, "Mushroom Masala", ["mushroom", "masala"]),
    (16, "Tandoori Chicken", ["tandoori chicken"]),
    (17, "Chicken Tikka", ["chicken tikka"]),
    (18, "Tangdi Kebab", ["tangdi", "drumstick", "kebab"]),
    (19, "Paneer Tikka", ["paneer tikka"]),
    (20, "Chicken Lollipop", ["chicken lollipop", "lollipop"]),
    (21, "Chilli Chicken", ["chilli chicken", "chili chicken"]),
    (22, "Dragon Chicken", ["dragon chicken", "crispy chicken"]),
    (23, "Apollo Fish", ["fish", "fry"]),
    (24, "Guntur Chicken Dry", ["chicken fry", "sukka"]),
    (25, "Crispy Corn Pepper Salt", ["crispy corn", "corn"]),
    (26, "Veg Manchurian Dry", ["manchurian"]),
    (27, "Chilli Paneer Dry", ["chilli paneer", "chili paneer"]),
    (28, "Gobi 65", ["gobi 65", "cauliflower"]),
    (29, "Butter Naan", ["butter naan", "naan"]),
    (30, "Garlic Butter Naan", ["garlic naan", "garlic butter naan"]),
    (31, "Tandoori Roti Plain", ["tandoori roti", "roti"]),
    (32, "Tandoori Roti Butter", ["butter roti", "tandoori roti"]),
    (33, "Rumali Roti", ["rumali roti", "chapati"]),
    (34, "Chicken Fried Rice", ["chicken fried rice"]),
    (35, "Schezwan Chicken Fried Rice", ["schezwan", "fried rice"]),
    (36, "Veg Fried Rice", ["veg fried rice", "fried rice"]),
    (37, "Chicken Hakka Noodles", ["chicken", "noodles"]),
    (38, "Veg Hakka Noodles", ["hakka noodles", "noodles"]),
    (39, "Chicken Manchow Soup", ["manchow", "chicken soup"]),
    (40, "Sweet Corn Chicken Soup", ["corn", "soup"]),
    (41, "Cream of Tomato Soup", ["tomato soup"]),
    (42, "Curd Rice", ["curd rice"]),
    (43, "Jeera Rice", ["jeera rice"]),
    (44, "Fresh Lime Soda", ["lime", "soda", "lemonade"]),
    (45, "Sweet Lassi", ["lassi"]),
    (46, "Gulab Jamun with Ice Cream", ["gulab jamun"]),
    (47, "Apricot Delight", ["khubani", "apricot", "halwa"]),
    (48, "Thums Up", ["beverage", "drink", "cola"])
]

matched = 0
for did, name, kws in dishes:
    best_p = None
    best_score = 0
    for p in pins:
        text = (p["title"] + " " + p["desc"]).lower()
        score = sum(1 for kw in kws if kw in text)
        if score > best_score:
            best_score = score
            best_p = p
    if best_score > 0 and best_p:
        matched += 1
        print(f"[{did:2d}] {name} (Score {best_score}):")
        print(f"     Title: {best_p['title'][:60]}")
        print(f"     Img:   {best_p['img_orig']}")
    else:
        print(f"[{did:2d}] {name}: NO MATCH IN FEED INDEX")

print(f"\nTotal matched in feed index: {matched} / {len(dishes)}")

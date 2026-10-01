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

print(f"Loaded {len(pins)} Pinterest pins.")

def find_best_pin(keywords, exclude=None):
    if exclude is None:
        exclude = []
    best_score = 0
    best_p = None
    for p in pins:
        text = (p["title"] + " " + p["desc"]).lower()
        if any(e in text for e in exclude):
            continue
        score = 0
        for kw in keywords:
            if kw.lower() in text:
                score += 1
        if score > best_score:
            best_score = score
            best_p = p
    return best_p, best_score

# Test 10 Categories
categories = [
    ("cat_biryani", ["biryani", "dum biryani", "hyderabadi"], ["soup"]),
    ("cat_curries", ["butter chicken", "curry", "makhani", "paneer"], ["soup", "salad"]),
    ("cat_tandoori", ["tandoori chicken", "tikka", "kebab"], ["curry", "gravy"]),
    ("cat_nonveg_starters", ["chicken lollipop", "chilli chicken", "wings", "crispy chicken"], []),
    ("cat_veg_starters", ["paneer tikka", "crispy", "snack", "appetizer", "pakora"], ["chicken", "mutton"]),
    ("cat_breads", ["garlic naan", "butter naan", "naan", "tandoori roti"], ["curry"]),
    ("cat_chinese", ["fried rice", "noodles", "indo-chinese", "schezwan"], []),
    ("cat_soups", ["soup", "shorba", "tomato soup", "manchow"], []),
    ("cat_south_rice", ["rice", "pulao", "jeera rice", "curd rice"], ["noodles"]),
    ("cat_desserts", ["dessert", "sweet", "gulab jamun", "kheer", "halwa"], ["curry", "chicken"])
]

print("\n--- CATEGORY MATCHES ---")
for cat_id, kws, exc in categories:
    pin, score = find_best_pin(kws, exc)
    if pin:
        print(f"[{cat_id}] (Score {score}) {pin['title'][:60]} | Source: {pin['source']}")
        print(f"  URL: {pin['img_orig']}")
    else:
        print(f"[{cat_id}] NO MATCH")

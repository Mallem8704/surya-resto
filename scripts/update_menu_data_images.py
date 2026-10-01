"""
Updates image_url for all 48 dishes in:
1. frontend/lib/suryaMenuData.ts
2. frontend/lib/dishImages.ts
3. backend/app/surya_data.py
"""

import re
import os
import sys
sys.path.insert(0, os.path.abspath("."))

from scripts.download_all_48_recipes import DISHES

dish_map = {d["id"]: f"/dishes/{d['file']}" for d in DISHES}
name_to_file = {d["name"].lower().strip(): f"/dishes/{d['file']}" for d in DISHES}

# 1. Update frontend/lib/suryaMenuData.ts
ts_path = "frontend/lib/suryaMenuData.ts"
with open(ts_path, "r", encoding="utf-8") as f:
    ts_content = f.read()

for dish in DISHES:
    dish_id = dish["id"]
    new_img = f"/dishes/{dish['file']}"
    # Match object with id: dish_id, and replace its image_url: "..."
    # Pattern: id: dish_id, ... image_url: "..."
    pattern = rf'(id:\s*{dish_id},\s*category_id:\s*\d+,[\s\S]*?image_url:\s*")[^"]+(")'
    ts_content = re.sub(pattern, rf'\g<1>{new_img}\g<2>', ts_content)

with open(ts_path, "w", encoding="utf-8") as f:
    f.write(ts_content)
print(f"[OK] Updated {ts_path} with 48 distinct recipe images!")

# 2. Update backend/app/surya_data.py
py_path = "backend/app/surya_data.py"
with open(py_path, "r", encoding="utf-8") as f:
    py_content = f.read()

for dish in DISHES:
    dish_id = dish["id"]
    new_img = f"/dishes/{dish['file']}"
    pattern = rf'("id":\s*{dish_id},\s*"category_id":\s*\d+,[\s\S]*?"image_url":\s*")[^"]+(")'
    py_content = re.sub(pattern, rf'\g<1>{new_img}\g<2>', py_content)

with open(py_path, "w", encoding="utf-8") as f:
    f.write(py_content)
print(f"[OK] Updated {py_path} with 48 distinct recipe images!")

# 3. Update frontend/lib/dishImages.ts
dish_images_path = "frontend/lib/dishImages.ts"
with open(dish_images_path, "r", encoding="utf-8") as f:
    di_content = f.read()

# Build comprehensive DISH_IMAGE_MAP
map_entries = []
for d in DISHES:
    clean_name = d["name"].lower()
    # Also add simplified aliases
    simplified = clean_name.replace("surya special ", "").replace(" (chef special)", "").replace(" (guntur spiced)", "").replace(" (desi ghee)", "").replace(" (full / half)", "").replace(" (6 pcs)", "").replace(" (3 pcs)", "").replace(" (saucy / dry)", "").replace(" (dry)", "").replace(" (butter)", "").replace(" (plain)", "").replace(" (bagala bath)", "").replace(" (sweet / salt)", "").replace(" (chilled)", "").replace(" (2 pcs)", "").replace(" (750ml)", "").replace(" (andhra special)", "").strip()
    file_path = f"/dishes/{d['file']}"
    map_entries.append(f'    "{clean_name}": "{file_path}",')
    if simplified and simplified != clean_name:
        map_entries.append(f'    "{simplified}": "{file_path}",')

# Custom aliases
extra_aliases = {
    "chicken biryani": "/dishes/hyderabadi_chicken_dum_biryani.jpg",
    "mutton biryani": "/dishes/special_mutton_dum_biryani.jpg",
    "veg biryani": "/dishes/veg_dum_biryani.jpg",
    "chicken curry": "/dishes/punjabi_chicken_curry.jpg",
    "paneer butter masala": "/dishes/paneer_butter_masala.jpg",
    "dal tadka": "/dishes/dal_tadka.jpg",
    "naan": "/dishes/butter_naan.jpg",
    "butter naan": "/dishes/butter_naan.jpg",
    "garlic naan": "/dishes/garlic_butter_naan.jpg",
    "tandoori chicken": "/dishes/tandoori_chicken.jpg",
    "chicken tikka": "/dishes/chicken_tikka.jpg",
    "tangdi kebab": "/dishes/tangdi_kebab.jpg",
    "chicken lollipop": "/dishes/chicken_lollipop.jpg",
    "fried rice": "/dishes/chicken_fried_rice.jpg",
    "noodles": "/dishes/chicken_hakka_noodles.jpg",
    "manchow soup": "/dishes/chicken_manchow_soup.jpg",
    "curd rice": "/dishes/curd_rice_bagala_bath.jpg",
    "jeera rice": "/dishes/jeera_rice.jpg",
    "lassi": "/dishes/sweet_lassi.jpg",
    "gulab jamun": "/dishes/gulab_jamun_icecream.jpg",
    "apricot delight": "/dishes/apricot_delight.jpg",
    "thums up": "/dishes/thums_up_beverage.jpg",
}
for k, v in extra_aliases.items():
    map_entries.append(f'    "{k}": "{v}",')

new_map_str = "export const DISH_IMAGE_MAP: Record<string, string> = {\n" + "\n".join(map_entries) + "\n};\n"

# Replace DISH_IMAGE_MAP in dishImages.ts
di_content = re.sub(r'export const DISH_IMAGE_MAP: Record<string, string> = \{[\s\S]*?\};', new_map_str, di_content)

with open(dish_images_path, "w", encoding="utf-8") as f:
    f.write(di_content)
print(f"[OK] Updated {dish_images_path}!")

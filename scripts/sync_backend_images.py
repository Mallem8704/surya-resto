import re

# Load frontend items
with open("frontend/lib/suryaMenuData.ts", "r", encoding="utf-8") as f:
    fe_content = f.read()

fe_matches = re.findall(r'id:\s*(\d+),\s*category_id:\s*(\d+),\s*name:\s*"([^"]+)",.*?image_url:\s*"([^"]+)"', fe_content, re.DOTALL)
fe_map = {name: img for _, _, name, img in fe_matches}

# Load backend surya_data.py
with open("backend/app/surya_data.py", "r", encoding="utf-8") as f:
    be_content = f.read()

lines = be_content.splitlines()
new_lines = []
current_name = None

for line in lines:
    name_m = re.search(r'"name":\s*"([^"]+)"', line)
    if name_m and '"cat"' not in line: # could be item or variant/addon
        # If it's a dish name in fe_map
        candidate = name_m.group(1)
        if candidate in fe_map:
            current_name = candidate
            
    img_m = re.search(r'"img":\s*"([^"]+)"', line)
    if img_m and current_name and current_name in fe_map:
        new_img = fe_map[current_name]
        line = re.sub(r'"img":\s*"[^"]+"', f'"img": "{new_img}"', line)
        current_name = None  # reset after replacing for this item
        
    new_lines.append(line)

updated_content = "\n".join(new_lines) + "\n"

with open("backend/app/surya_data.py", "w", encoding="utf-8") as f:
    f.write(updated_content)

print("Updated backend/app/surya_data.py correctly!")

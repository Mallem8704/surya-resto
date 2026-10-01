import os
import re

with open('frontend/lib/suryaMenuData.ts', 'r', encoding='utf-8') as f:
    ts_data = f.read()

items = re.findall(r'id:\s*(\d+),\s*category_id:\s*(\d+),\s*name:\s*"([^"]+)",.*?image_url:\s*"([^"]+)"', ts_data, re.DOTALL)

print(f"Total items in suryaMenuData.ts: {len(items)}")
missing = []
for iid, cid, name, img in items:
    path = os.path.join('frontend/public', img.lstrip('/'))
    exists = os.path.exists(path)
    size = os.path.getsize(path) if exists else 0
    status = f"EXISTS ({size} B)" if exists else "MISSING"
    print(f"[{iid:2s}] {name:40s} -> {img} [{status}]")
    if not exists:
        missing.append((iid, name, img))

print(f"\nMissing: {len(missing)}")
if missing:
    for m in missing:
        print("  MISSING:", m)

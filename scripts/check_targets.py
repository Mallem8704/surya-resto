import json
import re

with open("scratch/pinterest_expanded_index.json", "r", encoding="utf-8") as f:
    pins = json.load(f)

for target, pat in [
    ("Egg Dum Biryani", r"egg.*biryani|anda.*biryani"),
    ("Kadai Chicken", r"kadai.*chicken|karahi.*chicken"),
    ("Andhra Chicken Curry", r"andhra.*chicken|kodi.*kura"),
    ("Kaju Tomato Curry", r"kaju.*curry|kaju.*masala|kaju.*butter"),
    ("Rumali Roti", r"rumali|roomali"),
    ("Tangdi Kebab", r"tangdi|tangri"),
    ("Apollo Fish", r"apollo.*fish"),
    ("Dragon Chicken", r"dragon.*chicken"),
    ("Crispy Corn", r"crispy.*corn|corn.*crispy"),
    ("Gobi 65", r"gobi.*65|cauliflower.*65")
]:
    print(f"=== {target} ===")
    matches = [p for p in pins if re.search(pat, p["title"] + " " + p["desc"], re.IGNORECASE)]
    print(f"Count: {len(matches)}")
    for m in matches[:3]:
        print(f"  [{m['creator']}] {m['title'][:70]}")
        print(f"       Img: {m['img_1200']}")

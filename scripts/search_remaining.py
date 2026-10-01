import json
import re

with open("scratch/pinterest_expanded_index.json", "r", encoding="utf-8") as f:
    pins = json.load(f)

targets = [
    ("Egg Dum Biryani", r"egg.*biryani|anda.*biryani"),
    ("Kadai Chicken", r"kadai.*chicken|karahi.*chicken"),
    ("Andhra Chicken Curry", r"andhra.*chicken|kodi.*kura|chicken.*curry"),
    ("Kaju Tomato Curry", r"kaju.*curry|kaju.*masala|cashew.*curry|tomato.*curry"),
    ("Tangdi Kebab", r"tangdi|tangri|kebab|chicken.*drumstick"),
    ("Dragon Chicken", r"dragon.*chicken|crispy.*chicken|honey.*chicken"),
    ("Apollo Fish", r"apollo.*fish|fish.*fry|fish.*tikka|crispy.*fish"),
    ("Guntur Chicken Dry", r"guntur.*chicken|chicken.*roast|chicken.*fry|chicken.*sukka"),
    ("Crispy Corn Pepper Salt", r"crispy.*corn|corn.*pepper|corn.*fry"),
    ("Gobi 65", r"gobi.*65|cauliflower.*65|crispy.*gobi"),
    ("Rumali Roti", r"rumali|roomali|roti"),
    ("Schezwan Chicken Fried Rice", r"schezwan.*rice|schezwan.*chicken|szechuan.*rice"),
    ("Curd Rice", r"curd.*rice|thayir.*sadam|daddojanam"),
    ("Jeera Rice", r"jeera.*rice|cumin.*rice"),
    ("Fresh Lime Soda", r"lime.*soda|lemon.*soda|nimbu.*soda|limeade|lemonade"),
    ("Apricot Delight", r"khubani|qubani|apricot"),
    ("Thums Up / Drink", r"thums.*up|cold.*drink|masala.*soda|beverage")
]

for name, pattern in targets:
    print(f"\n=== Searching for: {name} ===")
    matches = []
    for p in pins:
        text = f"{p['title']} {p['desc']}"
        if re.search(pattern, text, re.IGNORECASE):
            matches.append(p)
    print(f"Found {len(matches)} potential matches:")
    for m in matches[:4]:
        print(f"  [{m['creator']}] {m['title'][:60]}")
        print(f"       Img: {m['img_1200']}")

import urllib.request
import re
import json
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
}

with open("scratch/valid_feeds.txt", "r", encoding="utf-8") as f:
    lines = [line.strip().split("\t") for line in f if line.strip()]

print(f"Loading {len(lines)} board feeds...")

def fetch_feed(item):
    c, b, url = item
    req = urllib.request.Request(url, headers=headers)
    pins = []
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            content = resp.read()
            root = ET.fromstring(content)
            channel = root.find("channel")
            if channel is not None:
                for it in channel.findall("item"):
                    title = it.findtext("title", "")
                    desc = it.findtext("description", "")
                    link = it.findtext("link", "")
                    
                    # Extract image URL
                    img_match = re.search(r'src=[\'"]([^\'"]+i\.pinimg\.com[^\'"]+)[\'"]', desc)
                    if not img_match:
                        encl = it.find("enclosure")
                        if encl is not None and "i.pinimg.com" in encl.get("url", ""):
                            img_match = encl.get("url")
                    
                    if img_match:
                        raw_img = img_match.group(1) if hasattr(img_match, "group") else img_match
                        # Generate 1200x CDN URL
                        img_1200 = re.sub(r'/[0-9]+x/', '/1200x/', raw_img)
                        img_orig = re.sub(r'/[0-9]+x/', '/originals/', raw_img)
                        pins.append({
                            "creator": c,
                            "board": b,
                            "title": title.strip(),
                            "desc": re.sub(r'<[^>]+>', ' ', desc).strip(),
                            "link": link.strip(),
                            "img_1200": img_1200,
                            "img_orig": img_orig
                        })
    except Exception as e:
        # print(f"Error {c}/{b}: {e}")
        pass
    return pins

all_pins = []
seen_imgs = set()

with ThreadPoolExecutor(max_workers=25) as pool:
    results = pool.map(fetch_feed, lines)
    for pin_list in results:
        for p in pin_list:
            if p["img_1200"] not in seen_imgs:
                seen_imgs.add(p["img_1200"])
                all_pins.append(p)

print(f"Total unique pins indexed across all 83 feeds: {len(all_pins)}")

with open("scratch/pinterest_expanded_index.json", "w", encoding="utf-8") as f:
    json.dump(all_pins, f, indent=2, ensure_ascii=False)

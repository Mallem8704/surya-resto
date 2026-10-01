import urllib.request
import re
import json
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor

BOARDS = [
    # cubesnjuliennes (farrukh aziz ansari)
    ("cubesnjuliennes", "chicken-recipes"),
    ("cubesnjuliennes", "biryani-recipes"),
    ("cubesnjuliennes", "mutton-recipes"),
    ("cubesnjuliennes", "curry-recipes"),
    ("cubesnjuliennes", "indian-sweets-desserts"),
    ("cubesnjuliennes", "appetizers-snacks"),
    ("cubesnjuliennes", "rice-recipes"),
    ("cubesnjuliennes", "breads"),
    ("cubesnjuliennes", "paneer-recipes"),
    ("cubesnjuliennes", "vegetarian-recipes"),
    ("cubesnjuliennes", "soups"),
    ("cubesnjuliennes", None),
    
    # cookwithmanali (manali singh)
    ("cookwithmanali", "paneer-recipes"),
    ("cookwithmanali", "indian-curries"),
    ("cookwithmanali", "indian-appetizers"),
    ("cookwithmanali", "dal-recipes"),
    ("cookwithmanali", "indian-breads"),
    ("cookwithmanali", "indian-desserts"),
    ("cookwithmanali", "indo-chinese"),
    ("cookwithmanali", "rice-biryani"),
    ("cookwithmanali", "beverages-drinks"),
    ("cookwithmanali", "snacks-starters"),
    ("cookwithmanali", "chaat-recipes"),
    ("cookwithmanali", "soup-recipes"),
    ("cookwithmanali", None),
    
    # whiskaffair (neha mathur)
    ("whiskaffair", "biryani-pulao-recipes"),
    ("whiskaffair", "chicken-recipes"),
    ("whiskaffair", "mutton-recipes"),
    ("whiskaffair", "paneer-recipes"),
    ("whiskaffair", "curry-recipes"),
    ("whiskaffair", "indian-sweets-desserts"),
    ("whiskaffair", "beverages-drinks"),
    ("whiskaffair", "indo-chinese-recipes"),
    ("whiskaffair", "breads-naan-paratha"),
    ("whiskaffair", "soups"),
    ("whiskaffair", "dal-kadhi"),
    ("whiskaffair", "rice-recipes"),
    ("whiskaffair", "starters-appetizers"),
    ("whiskaffair", None),

    # teaforturmeric (izzah cheema)
    ("teaforturmeric", "pakistani-indian-dishes"),
    ("teaforturmeric", "chicken-recipes"),
    ("teaforturmeric", "rice-biryani"),
    ("teaforturmeric", "curry-recipes"),
    ("teaforturmeric", "beef-mutton-recipes"),
    ("teaforturmeric", "vegetarian-recipes"),
    ("teaforturmeric", "desserts"),
    ("teaforturmeric", None),

    # ministryofcurry (shweta garg)
    ("ministryofcurry", "air-fryer-recipes"),
    ("ministryofcurry", "chicken-recipes"),
    ("ministryofcurry", "curries"),
    ("ministryofcurry", "appetizers-starters"),
    ("ministryofcurry", "rice-dishes"),
    ("ministryofcurry", "breads"),
    ("ministryofcurry", "desserts"),
    ("ministryofcurry", "paneer-recipes"),
    ("ministryofcurry", "seafood-recipes"),
    ("ministryofcurry", None),

    # pipingpotcurry (madhurima chowdhury)
    ("pipingpotcurry", "chicken-recipes"),
    ("pipingpotcurry", "curry-recipes"),
    ("pipingpotcurry", "biryani-pulao-rice"),
    ("pipingpotcurry", "appetizers-finger-foods"),
    ("pipingpotcurry", "desserts-sweets"),
    ("pipingpotcurry", "paneer-recipes"),
    ("pipingpotcurry", "dal-lentils"),
    ("pipingpotcurry", "beverages"),
    ("pipingpotcurry", None),

    # sinfullyspicy (tanvi srivastava)
    ("sinfullyspicy", "chicken-recipes"),
    ("sinfullyspicy", "indian-food-recipes"),
    ("sinfullyspicy", "appetizers"),
    ("sinfullyspicy", "desserts"),
    ("sinfullyspicy", None),

    # myheartbeets (ashley thomas)
    ("myheartbeets", "indian-food"),
    ("myheartbeets", "instant-pot-indian"),
    ("myheartbeets", None),

    # currytrail (jyothi rajesh)
    ("currytrail", "indian-recipes"),
    ("currytrail", "curry-recipes"),
    ("currytrail", "chicken-recipes"),
    ("currytrail", "biryani-recipes"),
    ("currytrail", "desserts"),
    ("currytrail", None),

    # archanaskitchen (archana doshi)
    ("archanaskitchen", "indian-curry-recipes"),
    ("archanaskitchen", "biryani-pulao-recipes"),
    ("archanaskitchen", "south-indian-recipes"),
    ("archanaskitchen", "appetizers-starters"),
    ("archanaskitchen", None),
]

def fetch_feed(target):
    u, b = target
    url = f"https://www.pinterest.com/{u}/{b}.rss" if b else f"https://www.pinterest.com/{u}/feed.rss"
    pins = []
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
        xml_data = urllib.request.urlopen(req, timeout=5).read()
        root = ET.fromstring(xml_data)
        items = root.findall('.//item')
        for item in items:
            title = item.find('title').text if item.find('title') is not None else ''
            link = item.find('link').text if item.find('link') is not None else ''
            desc = item.find('description').text if item.find('description') is not None else ''
            img_matches = re.findall(r'src="([^"]+)"', desc)
            if img_matches:
                img_236 = img_matches[0]
                img_orig = re.sub(r'/(?:236x|474x|564x|736x)/', '/originals/', img_236)
                img_1200 = re.sub(r'/(?:236x|474x|564x|736x)/', '/1200x/', img_236)
                img_736 = re.sub(r'/(?:236x|474x|564x|736x)/', '/736x/', img_236)
                pins.append({
                    "title": title.strip(),
                    "link": link.strip(),
                    "desc": desc.strip(),
                    "img_orig": img_orig,
                    "img_1200": img_1200,
                    "img_736": img_736,
                    "source": f"{u}/{b}"
                })
        print(f"[OK] {u}/{b or 'feed'}: {len(pins)} pins", flush=True)
    except Exception:
        pass
    return pins

with ThreadPoolExecutor(max_workers=20) as executor:
    results = list(executor.map(fetch_feed, BOARDS))

all_pins = [p for sublist in results for p in sublist]
unique_pins = {p["link"]: p for p in all_pins}

print(f"\nTotal unique Pinterest pins collected: {len(unique_pins)}", flush=True)
with open("scratch/pinterest_pin_index.json", "w", encoding="utf-8") as f:
    json.dump(list(unique_pins.values()), f, indent=2, ensure_ascii=False)
print("Saved to scratch/pinterest_pin_index.json", flush=True)

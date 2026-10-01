import urllib.request
from concurrent.futures import ThreadPoolExecutor

creators = [
    "cubesnjuliennes", "cookwithmanali", "whiskaffair", "teaforturmeric",
    "ministryofcurry", "pipingpotcurry", "sinfullyspicy", "swasthisrecipes",
    "swasthis", "vegrecipesofindia", "hebbarskitchen", "spiceupthecurry",
    "archanaskitchen", "carveyourcraving", "funfoodfrolic", "myheartbeets",
    "rachnacooks", "flavourstreat", "simpleindianmeals", "sharmispassions"
]

board_slugs = [
    "feed.rss",
    "chicken-recipes.rss", "biryani-recipes.rss", "mutton-recipes.rss",
    "paneer-recipes.rss", "curry-recipes.rss", "indian-curries.rss",
    "appetizers-snacks.rss", "snacks-starters.rss", "indian-appetizers.rss",
    "rice-recipes.rss", "rice-biryani.rss", "indo-chinese.rss", "indo-chinese-recipes.rss",
    "chinese-recipes.rss", "soups.rss", "soup-recipes.rss", "breads.rss",
    "indian-breads.rss", "breads-naan-paratha.rss", "beverages-drinks.rss",
    "drinks-beverages.rss", "indian-sweets-desserts.rss", "indian-desserts.rss",
    "desserts.rss", "dal-recipes.rss", "dal-kadhi.rss", "non-veg-recipes.rss",
    "south-indian-recipes.rss", "andhra-recipes.rss", "street-food.rss",
    "tandoori-recipes.rss", "kebab-recipes.rss", "fish-seafood-recipes.rss",
    "vegetarian-recipes.rss", "egg-recipes.rss"
]

tasks = []
for c in creators:
    for b in board_slugs:
        url = f"https://www.pinterest.com/{c}/{b}"
        tasks.append((c, b, url))

print(f"Checking {len(tasks)} potential board feeds...")

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

def check_feed(task):
    c, b, url = task
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            if resp.status == 200:
                return (c, b, url, True)
    except Exception:
        pass
    return (c, b, url, False)

valid_feeds = []
with ThreadPoolExecutor(max_workers=30) as pool:
    for res in pool.map(check_feed, tasks):
        if res[3]:
            valid_feeds.append(res)
            print(f"[FOUND] {res[0]} / {res[1]}")

print(f"\nTotal valid feeds found: {len(valid_feeds)}")
with open("scratch/valid_feeds.txt", "w", encoding="utf-8") as f:
    for c, b, url, _ in valid_feeds:
        f.write(f"{c}\t{b}\t{url}\n")

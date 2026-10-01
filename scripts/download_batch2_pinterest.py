import os
import sys
import urllib.request
from PIL import Image, ImageOps
from io import BytesIO

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
}

BATCH2_PINTEREST_MAP = [
    ("egg_dum_biryani.jpg", "https://i.pinimg.com/1200x/42/5d/f1/425df1cde239f6bd60cc8304a6775292.jpg"),
    ("kadai_chicken.jpg", "https://i.pinimg.com/1200x/3f/90/4e/3f904e4c5f1cb2ad812958560fb42427.jpg"),
    ("chilly_chicken_dry.jpg", "https://i.pinimg.com/1200x/39/b2/1a/39b21ad6f0dbc92709ce92f9d9d245e2.jpg"),
    ("chilly_paneer.jpg", "https://i.pinimg.com/1200x/46/b4/48/46b448794661347e5e5298cd02caa2a6.jpg"),
    ("chilli_paneer.jpg", "https://i.pinimg.com/1200x/46/b4/48/46b448794661347e5e5298cd02caa2a6.jpg"),
    ("mushroom_masala.jpg", "https://i.pinimg.com/1200x/58/e3/c3/58e3c3d3989c8c9dad0bea59251d94a0.jpg"),
    ("chicken_hakka_noodles.jpg", "https://i.pinimg.com/1200x/2a/d5/e7/2ad5e78413c4459b2d571dec4da8945d.jpg"),
    ("veg_hakka_noodles.jpg", "https://i.pinimg.com/1200x/6c/9c/ec/6c9cec132d662944bc05cb0bf317a2e6.jpg"),
    ("veg_fried_rice.jpg", "https://i.pinimg.com/1200x/cd/11/11/cd1111dee4b8795ae613c75da4bb980e.jpg"),
    ("chicken_manchow_soup.jpg", "https://i.pinimg.com/1200x/3c/18/05/3c180580028d6575a434c754c9a8812a.jpg"),
    ("chicken_sweet_corn_soup.jpg", "https://i.pinimg.com/1200x/ce/e5/6a/cee56a03e6048f9a2d306a57a38b70c5.jpg"),
    ("cream_of_tomato_soup.jpg", "https://i.pinimg.com/1200x/4c/81/f8/4c81f86e6a9598d1f8c2479ed10ec47d.jpg"),
    ("sweet_lassi.jpg", "https://i.pinimg.com/1200x/3a/5e/a7/3a5ea7c4e38742d146f5caf1b6aeecbf.jpg"),
    ("jeera_rice.jpg", "https://i.pinimg.com/1200x/71/39/f4/7139f4786811e0af35484f080553e047.jpg"),
    ("fresh_lime_soda.jpg", "https://i.pinimg.com/1200x/24/4c/b8/244cb8bf9bb9fedfb6866b6f3059e236.jpg"),
    ("gulab_jamun_icecream.jpg", "https://i.pinimg.com/1200x/fc/71/e1/fc71e1415255a1647793212776624342.jpg"),
    ("gulab_jamun_ice_cream.jpg", "https://i.pinimg.com/1200x/fc/71/e1/fc71e1415255a1647793212776624342.jpg"),
]

output_dir = os.path.abspath("frontend/public/dishes")
os.makedirs(output_dir, exist_ok=True)

success = 0
for fname, url in BATCH2_PINTEREST_MAP:
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = resp.read()
            img = Image.open(BytesIO(data))
            if img.mode != 'RGB':
                img = img.convert('RGB')
            fitted = ImageOps.fit(img, (800, 600), centering=(0.5, 0.45))
            target_path = os.path.join(output_dir, fname)
            fitted.save(target_path, "JPEG", quality=92, optimize=True)
            print(f"[OK] {fname} ({os.path.getsize(target_path)} B) <- {url}")
            success += 1
    except Exception as e:
        print(f"[ERROR] {fname}: {e}")

print(f"\nBatch 2 complete: {success}/{len(BATCH2_PINTEREST_MAP)} Pinterest dishes ingested.")

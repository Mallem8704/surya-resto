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

DISH_PINTEREST_MAP = [
    ("hyderabadi_chicken_dum_biryani.jpg", "https://i.pinimg.com/1200x/ae/fb/7f/aefb7f9cd87a3202160e69a2298de80e.jpg"),
    ("special_mutton_dum_biryani.jpg", "https://i.pinimg.com/1200x/e2/8e/f8/e28ef8a4a244962589ce0ee5c4b1cdfd.jpg"),
    ("veg_dum_biryani.jpg", "https://i.pinimg.com/1200x/07/c8/4d/07c84d7f1a2028174cde92236fe45d5b.jpg"),
    ("butter_chicken.jpg", "https://i.pinimg.com/1200x/43/6f/39/436f3900c9ad8a8e025203e10e7f2af5.jpg"),
    ("butter_chicken_makhani.jpg", "https://i.pinimg.com/1200x/43/6f/39/436f3900c9ad8a8e025203e10e7f2af5.jpg"),
    ("paneer_butter_masala.jpg", "https://i.pinimg.com/1200x/0d/a8/92/0da8922b83852e4fb9076aec7ab37352.jpg"),
    ("kadai_paneer.jpg", "https://i.pinimg.com/1200x/69/a2/7c/69a27c75452ffe5e73b93af4e1330cd4.jpg"),
    ("tandoori_chicken.jpg", "https://i.pinimg.com/1200x/6d/27/0c/6d270c5961d575b31e79488869e9f363.jpg"),
    ("chicken_tikka.jpg", "https://i.pinimg.com/1200x/59/bd/7a/59bd7aa7f644d7419ccb68ec65a56a4e.jpg"),
    ("paneer_tikka.jpg", "https://i.pinimg.com/1200x/07/0b/ea/070bea78b0aa0f352df7e156d72ecedb.jpg"),
    ("chicken_lollipop.jpg", "https://i.pinimg.com/1200x/85/31/61/85316121011a29a882a0d9e4cd2ab4cc.jpg"),
    ("chilli_paneer.jpg", "https://i.pinimg.com/1200x/46/b4/48/46b448794661347e5e5298cd02caa2a6.jpg"),
    ("butter_naan.jpg", "https://i.pinimg.com/1200x/9a/ef/36/9aef362a125cecc977f0eb57060d7016.jpg"),
    ("garlic_butter_naan.jpg", "https://i.pinimg.com/1200x/36/ee/5a/36ee5ac9a3783bf7ed95b2f924ff921b.jpg"),
    ("garlic_naan.jpg", "https://i.pinimg.com/1200x/36/ee/5a/36ee5ac9a3783bf7ed95b2f924ff921b.jpg"),
    ("tandoori_roti_plain.jpg", "https://i.pinimg.com/1200x/6b/8b/67/6b8b67988a0f70d2c83fb3c686d427b2.jpg"),
    ("tandoori_roti_butter.jpg", "https://i.pinimg.com/1200x/6b/8b/67/6b8b67988a0f70d2c83fb3c686d427b2.jpg"),
    ("chicken_fried_rice.jpg", "https://i.pinimg.com/1200x/17/99/65/1799657be20e31006787afb7041143fd.jpg"),
    ("veg_hakka_noodles.jpg", "https://i.pinimg.com/1200x/3a/df/a2/3adfa2b672e512fb103a6bfde19db4b2.jpg"),
    ("veg_manchurian.jpg", "https://i.pinimg.com/1200x/64/46/e4/6446e41c8d1fe63cb10afcce85a2878d.jpg"),
    ("gulab_jamun_ice_cream.jpg", "https://i.pinimg.com/1200x/fc/71/e1/fc71e1415255a1647793212776624342.jpg"),
    ("dal_tadka.jpg", "https://i.pinimg.com/1200x/5d/10/c7/5d10c7dcc3ccfb6781e74343c7b571eb.jpg"),
]

output_dir = os.path.abspath("frontend/public/dishes")
os.makedirs(output_dir, exist_ok=True)

success = 0
for fname, url in DISH_PINTEREST_MAP:
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

print(f"\nDone: {success}/{len(DISH_PINTEREST_MAP)} dish images saved with Pinterest high-res photography.")

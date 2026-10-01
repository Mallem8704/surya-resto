"""
Surya Family Restaurant Kadiri - 48 Authentic Recipe Images Downloader & Optimizer
Downloads, crops to 800x600, converts to high-quality RGB JPEG, and updates the local filesystem.
"""

import os
import sys
import io
import urllib.request
from PIL import Image

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "dishes"))
os.makedirs(OUTPUT_DIR, exist_ok=True)

USER_AGENT = "SuryaRestaurantBot/1.0 (contact@suryafamilyrestaurant.com; Android/Web)"

DISHES = [
    # ── Group 1: Biryani Specials (1-6) ──
    {
        "id": 1,
        "name": "Surya Special Hyderabadi Chicken Dum Biryani",
        "file": "hyderabadi_chicken_dum_biryani.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Chicken_Hyderabadi_Biryani.JPG/1280px-Chicken_Hyderabadi_Biryani.JPG"
    },
    {
        "id": 2,
        "name": "Chicken Fry Piece Biryani (Andhra Special)",
        "file": "chicken_fry_piece_biryani.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Biryani_Godavari_style.JPG/1280px-Biryani_Godavari_style.JPG"
    },
    {
        "id": 3,
        "name": "Special Mutton Dum Biryani",
        "file": "special_mutton_dum_biryani.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Dum_Gosht_Biryani_%28Boneless%29_%2831452918267%29.jpg/1280px-Dum_Gosht_Biryani_%28Boneless%29_%2831452918267%29.jpg"
    },
    {
        "id": 4,
        "name": "Kaju Paneer Biryani",
        "file": "kaju_paneer_biryani.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Veg_Kaju_Dum_Biryani.jpg/1280px-Veg_Kaju_Dum_Biryani.jpg"
    },
    {
        "id": 5,
        "name": "Surya Special Veg Dum Biryani",
        "file": "veg_dum_biryani.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Vegetable_Biryani_IMG_001.jpg/1280px-Vegetable_Biryani_IMG_001.jpg"
    },
    {
        "id": 6,
        "name": "Egg Dum Biryani",
        "file": "egg_dum_biryani.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Hyderabadi_egg_biryani.jpg/1280px-Hyderabadi_egg_biryani.jpg"
    },

    # ── Group 2: Punjabi & North Indian Curries (7-15) ──
    {
        "id": 7,
        "name": "Punjabi Chicken Curry (Chef Special)",
        "file": "punjabi_chicken_curry.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Chicken_Curry_North_Indian_Style.jpg/1280px-Chicken_Curry_North_Indian_Style.jpg"
    },
    {
        "id": 8,
        "name": "Butter Chicken (Murgh Makhani)",
        "file": "butter_chicken_makhani.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Butter_Chicken%2C_City_Grill_Kottayam.jpg/1280px-Butter_Chicken%2C_City_Grill_Kottayam.jpg"
    },
    {
        "id": 9,
        "name": "Kadai Chicken",
        "file": "kadai_chicken.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Kadai_Chicken-NCR.jpg/1280px-Kadai_Chicken-NCR.jpg"
    },
    {
        "id": 10,
        "name": "Andhra Chicken Curry (Guntur Spiced)",
        "file": "andhra_chicken_curry.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Andhra_kodi_kura_%28chicken_gravy%29.JPG/1280px-Andhra_kodi_kura_%28chicken_gravy%29.JPG"
    },
    {
        "id": 11,
        "name": "Paneer Butter Masala",
        "file": "paneer_butter_masala.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Paneer_Makhani_India_August_2013.jpg/1280px-Paneer_Makhani_India_August_2013.jpg"
    },
    {
        "id": 12,
        "name": "Kadai Paneer",
        "file": "kadai_paneer.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Kadai_Paneer_%2815913018051%29.jpg/1280px-Kadai_Paneer_%2815913018051%29.jpg"
    },
    {
        "id": 13,
        "name": "Kaju Tomato Curry",
        "file": "kaju_tomato_curry.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Kaju_curry_and_Paratha.jpg/1280px-Kaju_curry_and_Paratha.jpg"
    },
    {
        "id": 14,
        "name": "Dal Tadka (Desi Ghee)",
        "file": "dal_tadka.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Dal_Tadka-Delhi.jpg/1280px-Dal_Tadka-Delhi.jpg"
    },
    {
        "id": 15,
        "name": "Mushroom Masala",
        "file": "mushroom_masala.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Mushroom_Butter_Masala_%2815914329462%29.jpg/1280px-Mushroom_Butter_Masala_%2815914329462%29.jpg"
    },

    # ── Group 3: Tandoori & Kebabs (16-19) ──
    {
        "id": 16,
        "name": "Tandoori Chicken (Full / Half)",
        "file": "tandoori_chicken.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Tandoori_chicken_Indian.jpg/1280px-Tandoori_chicken_Indian.jpg"
    },
    {
        "id": 17,
        "name": "Chicken Tikka (6 Pcs)",
        "file": "chicken_tikka.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Chicken-Tikka.jpg/1280px-Chicken-Tikka.jpg"
    },
    {
        "id": 18,
        "name": "Tangdi Kebab (3 Pcs)",
        "file": "tangdi_kebab.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Chicken_Tandoori_Tangri_Kabab_01.jpg/1280px-Chicken_Tandoori_Tangri_Kabab_01.jpg"
    },
    {
        "id": 19,
        "name": "Paneer Tikka (6 Pcs)",
        "file": "paneer_tikka.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Barbequed_Paneer_Tikka.jpg/1280px-Barbequed_Paneer_Tikka.jpg"
    },

    # ── Group 4: Non-Veg Starters & Andhra Specials (20-24) ──
    {
        "id": 20,
        "name": "Chicken Lollipop (Saucy / Dry)",
        "file": "chicken_lollipop.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Chicken_lollypops%27.jpg/1280px-Chicken_lollypops%27.jpg"
    },
    {
        "id": 21,
        "name": "Chilli Chicken",
        "file": "chilly_chicken_dry.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Chicken_chilli.jpg/1280px-Chicken_chilli.jpg"
    },
    {
        "id": 22,
        "name": "Dragon Chicken",
        "file": "dragon_chicken.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Chicken_chilli.jpg/1280px-Chicken_chilli.jpg"
    },
    {
        "id": 23,
        "name": "Apollo Fish",
        "file": "apollo_fish.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Apollo_fish.jpg/1280px-Apollo_fish.jpg"
    },
    {
        "id": 24,
        "name": "Guntur Chicken Dry",
        "file": "guntur_chicken_dry.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Biryani_Godavari_style.JPG/1280px-Biryani_Godavari_style.JPG"
    },

    # ── Group 5: Veg Starters & Crispies (25-28) ──
    {
        "id": 25,
        "name": "Crispy Corn Pepper Salt",
        "file": "crispy_corn.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Veg_manchurian_Balls.jpg/1280px-Veg_manchurian_Balls.jpg"
    },
    {
        "id": 26,
        "name": "Veg Manchurian (Dry)",
        "file": "veg_manchurian.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Veg_manchurian_Balls.jpg/1280px-Veg_manchurian_Balls.jpg"
    },
    {
        "id": 27,
        "name": "Chilli Paneer (Dry)",
        "file": "chilly_paneer.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Paneer_Chilli%2C_Bengaluru_%282026%29_01.jpg/1280px-Paneer_Chilli%2C_Bengaluru_%282026%29_01.jpg"
    },
    {
        "id": 28,
        "name": "Gobi 65",
        "file": "gobi_65.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/GOBI_65_-_Mini_Madras_2026-05-14.jpg/1280px-GOBI_65_-_Mini_Madras_2026-05-14.jpg"
    },

    # ── Group 6: Indian Breads & Naans (29-33) ──
    {
        "id": 29,
        "name": "Butter Naan",
        "file": "butter_naan.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Butter_Naan_Flatbread_from_North_India.jpg/1280px-Butter_Naan_Flatbread_from_North_India.jpg"
    },
    {
        "id": 30,
        "name": "Garlic Butter Naan",
        "file": "garlic_butter_naan.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Garlic_Butter_Naan_Food_by_Ms_Ujwala_Kasambe_DSCN1136_%281%29.jpg/1280px-Garlic_Butter_Naan_Food_by_Ms_Ujwala_Kasambe_DSCN1136_%281%29.jpg"
    },
    {
        "id": 31,
        "name": "Tandoori Roti (Butter)",
        "file": "tandoori_roti_butter.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Butter-tandoori-roti.jpg/1280px-Butter-tandoori-roti.jpg"
    },
    {
        "id": 32,
        "name": "Tandoori Roti (Plain)",
        "file": "tandoori_roti_plain.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Butter-tandoori-roti.jpg/1280px-Butter-tandoori-roti.jpg"
    },
    {
        "id": 33,
        "name": "Rumali Roti",
        "file": "rumali_roti.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Food-Rumali-Roti.jpg/1280px-Food-Rumali-Roti.jpg"
    },

    # ── Group 7: Chinese, Fried Rice & Noodles (34-38) ──
    {
        "id": 34,
        "name": "Surya Special Chicken Fried Rice",
        "file": "chicken_fried_rice.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Chicken_fried_rice_-_Stir_Fry_by_CK_2023-12-02.jpg/1280px-Chicken_fried_rice_-_Stir_Fry_by_CK_2023-12-02.jpg"
    },
    {
        "id": 35,
        "name": "Schezwan Chicken Fried Rice",
        "file": "schezwan_chicken_fried_rice.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Spicy_Schezwan_fried_rice.jpg/1280px-Spicy_Schezwan_fried_rice.jpg"
    },
    {
        "id": 36,
        "name": "Veg Fried Rice",
        "file": "veg_fried_rice.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Vegetable_Fried_Rice.jpg/960px-Vegetable_Fried_Rice.jpg"
    },
    {
        "id": 37,
        "name": "Chicken Hakka Noodles",
        "file": "chicken_hakka_noodles.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Chicken_Chow_mein.jpg/960px-Chicken_Chow_mein.jpg"
    },
    {
        "id": 38,
        "name": "Veg Hakka Noodles",
        "file": "veg_hakka_noodles.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Hakka_Noodles_Veg.jpg/1280px-Hakka_Noodles_Veg.jpg"
    },

    # ── Group 8: Soups & Shorba (39-41) ──
    {
        "id": 39,
        "name": "Chicken Manchow Soup",
        "file": "chicken_manchow_soup.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Manchow_soup_-_Indo-Chinese_cuisine.jpg/1280px-Manchow_soup_-_Indo-Chinese_cuisine.jpg"
    },
    {
        "id": 40,
        "name": "Sweet Corn Chicken Soup",
        "file": "chicken_sweet_corn_soup.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Chicken_sweet_corn_soup.jpg/1280px-Chicken_sweet_corn_soup.jpg"
    },
    {
        "id": 41,
        "name": "Cream of Tomato Soup",
        "file": "cream_of_tomato_soup.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Cream_of_Tomato_Soup.JPG/1280px-Cream_of_Tomato_Soup.JPG"
    },

    # ── Group 9: Rice & South Indian (42-43) ──
    {
        "id": 42,
        "name": "Curd Rice (Bagala Bath)",
        "file": "curd_rice_bagala_bath.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Curd_Rice.jpg/1280px-Curd_Rice.jpg"
    },
    {
        "id": 43,
        "name": "Jeera Rice",
        "file": "jeera_rice.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Jeera_rice.jpg/1280px-Jeera_rice.jpg"
    },

    # ── Group 10: Coolers, Beverages & Desserts (44-48) ──
    {
        "id": 44,
        "name": "Fresh Lime Soda (Sweet / Salt)",
        "file": "fresh_lime_soda.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Fresh_Lime.JPG/1280px-Fresh_Lime.JPG"
    },
    {
        "id": 45,
        "name": "Sweet Lassi (Chilled)",
        "file": "sweet_lassi.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Lassi_with_malai_and_barfi.jpg/1280px-Lassi_with_malai_and_barfi.jpg"
    },
    {
        "id": 46,
        "name": "Gulab Jamun with Vanilla Ice Cream (2 Pcs)",
        "file": "gulab_jamun_icecream.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Gulab_jamun_with_Vanilla_Ice_cream.jpg/1280px-Gulab_jamun_with_Vanilla_Ice_cream.jpg"
    },
    {
        "id": 47,
        "name": "Apricot Delight (Surya Special)",
        "file": "apricot_delight.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Khobani_Ka_Meetha.JPG/1280px-Khobani_Ka_Meetha.JPG"
    },
    {
        "id": 48,
        "name": "Thums Up / Soft Drinks (750ml)",
        "file": "thums_up_beverage.jpg",
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Thum%27s_Up_%2815124224444%29.jpg/1280px-Thum%27s_Up_%2815124224444%29.jpg"
    },
]

def download_and_optimize(item, target_size=(800, 600)):
    out_path = os.path.join(OUTPUT_DIR, item["file"])
    print(f"[{item['id']}/48] Fetching: {item['name']} -> {item['file']}")
    
    try:
        req = urllib.request.Request(
            item["url"],
            headers={
                "User-Agent": USER_AGENT,
                "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            }
        )
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = resp.read()

        if len(data) < 2000:
            print(f"  [!] Skipped: Data too small ({len(data)} bytes)")
            return False

        img = Image.open(io.BytesIO(data))
        img = img.convert("RGB")

        orig_w, orig_h = img.size
        target_w, target_h = target_size
        target_ratio = target_w / target_h
        orig_ratio = orig_w / orig_h

        if orig_ratio > target_ratio:
            new_w = int(orig_h * target_ratio)
            left = (orig_w - new_w) // 2
            img = img.crop((left, 0, left + new_w, orig_h))
        else:
            new_h = int(orig_w / target_ratio)
            top = (orig_h - new_h) // 2
            img = img.crop((0, top, orig_w, top + new_h))

        img = img.resize(target_size, Image.Resampling.LANCZOS)
        img.save(out_path, "JPEG", quality=92, optimize=True)
        print(f"  [OK] Saved {out_path} ({os.path.getsize(out_path):,} bytes)")
        return True
    except Exception as e:
        print(f"  [FAIL] Error for {item['file']}: {e}")
        return False

def main():
    print("=" * 70)
    print("DOWNLOADING & OPTIMIZING ALL 48 SURYA RECIPE PHOTOGRAPHS")
    print("=" * 70)

    success_count = 0
    for dish in DISHES:
        ok = download_and_optimize(dish)
        if ok:
            success_count += 1

    print("\n" + "=" * 70)
    print(f"COMPLETED: {success_count} / {len(DISHES)} IMAGES READY")
    print("=" * 70)

if __name__ == "__main__":
    main()

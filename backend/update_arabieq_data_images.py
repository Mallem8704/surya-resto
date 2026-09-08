import re

file_path = r"c:\Users\malle\OneDrive\Desktop\cafe saas appliction\backend\app\arabieq_data.py"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

DISH_IMAGE_MAPPING = {
    "Punugulu": "/dishes/punugulu.jpg",
    "Onion Pakoda": "/dishes/onion_pakoda.jpg",
    "Palak Pakoda": "/dishes/palak_pakoda.jpg",
    "Mirchi Bajji (4 Pcs)": "/dishes/mirchi_bajji.jpg",
    "Masala Vada (Dal Vada)": "/dishes/masala_vada.jpg",
    "Nellore Vada (4 Pcs)": "/dishes/nellore_vada.jpg",
    "Kesari Bath (Sheera)": "/dishes/kesari_bath.jpg",
    "Gulab Jamun (2 Pcs)": "/dishes/gulab_jamun.jpg",
    "Kala Jamun": "/dishes/kala_jamun.jpg",
    "Double Ka Meetha": "/dishes/double_ka_meetha.jpg",
    "Gajar Ka Halwa": "/dishes/gajar_ka_halwa.jpg",
    "Kaddu Ka Kheer": "/dishes/kaddu_ka_kheer.jpg",
    "Qubani Ka Meetha": "/dishes/qubani_ka_meetha.jpg",
    "Veg Sweet Corn Soup": "/dishes/veg_sweet_corn_soup.jpg",
    "Veg Manchow Soup": "/dishes/veg_manchow_soup.jpg",
    "Veg Hot & Sour Soup": "/dishes/veg_hot_sour_soup.jpg",
    "Chicken Sweet Corn Soup": "/dishes/chicken_sweet_corn_soup.jpg",
    "Chicken Manchow Soup": "/dishes/chicken_manchow_soup.jpg",
    "Chicken Hot & Sour Soup": "/dishes/chicken_hot_sour_soup.jpg",
    "Mutton Miriyala Soup": "/dishes/mutton_miriyala_soup.jpg",
    "Mutton Maraq Soup": "/dishes/mutton_maraq_soup.jpg",
    "Mutton Shorba Soup": "/dishes/mutton_shorba_soup.jpg",
    "Fresh Green Salad": "/dishes/fresh_green_salad.jpg",
    "Masala Papad": "/dishes/masala_papad.jpg",
    "Veg Manchurian Dry": "/dishes/veg_manchurian.jpg",
    "Paneer 65": "/dishes/paneer_65.jpg",
    "Mushroom 65": "/dishes/mushroom_65.jpg",
    "Gobi 65": "/dishes/gobi_65.jpg",
    "Gobi Manchurian Dry": "/dishes/gobi_manchurian.jpg",
    "Chilly Chicken Dry": "/dishes/chilly_chicken_dry.jpg",
    "Chicken 65": "/dishes/chicken_65.jpg",
    "Chicken Majestic": "/dishes/chicken_majestic.jpg",
    "Chicken Lollipop (6 Pcs)": "/dishes/chicken_lollipop.jpg",
    "Chicken Drumstick (3 Pcs)": "/dishes/chicken_drumstick.jpg",
    "Dragon Chicken": "/dishes/dragon_chicken.jpg",
    "Kung Pao Chicken": "/dishes/kung_pao_chicken.jpg",
    "Arabeiq Special Chicken Starter": "/dishes/arabieq_special_chicken_starter.jpg",
    "Khandani Chicken": "/dishes/khandani_chicken.jpg",
    "Dubai Chicken Starter": "/dishes/dubai_chicken_starter.jpg",
    "Mutton 65": "/dishes/mutton_65.jpg",
    "Fish Finger (8 Pcs)": "/dishes/fish_finger.jpg",
    "Apollo Fish": "/dishes/apollo_fish.jpg",
}

for name, img in DISH_IMAGE_MAPPING.items():
    # Replace `"name": "Punugulu", ..., "img": "..."`
    pattern = rf'("name":\s*"{re.escape(name)}"[^}}]+?"img":\s*")[^"]+(")'
    content = re.sub(pattern, rf'\g<1>{img}\g<2>', content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated arabieq_data.py with exact dish image paths!")

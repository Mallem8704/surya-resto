import os
import sys

backend_dir = r"c:\Users\malle\OneDrive\Desktop\cafe saas appliction\backend"
sys.path.insert(0, backend_dir)

from app.database import SessionLocal
from app.models import MenuItem, Category

DISH_IMAGE_MAPPING = {
    "punugulu": "/dishes/punugulu.jpg",
    "onion pakoda": "/dishes/onion_pakoda.jpg",
    "palak pakoda": "/dishes/palak_pakoda.jpg",
    "mirchi bajji": "/dishes/mirchi_bajji.jpg",
    "masala vada": "/dishes/masala_vada.jpg",
    "nellore vada": "/dishes/nellore_vada.jpg",
    "kesari bath": "/dishes/kesari_bath.jpg",
    "gulab jamun": "/dishes/gulab_jamun.jpg",
    "kala jamun": "/dishes/kala_jamun.jpg",
    "double ka meetha": "/dishes/double_ka_meetha.jpg",
    "gajar ka halwa": "/dishes/gajar_ka_halwa.jpg",
    "kaddu ka kheer": "/dishes/kaddu_ka_kheer.jpg",
    "qubani ka meetha": "/dishes/qubani_ka_meetha.jpg",
    "veg sweet corn soup": "/dishes/veg_sweet_corn_soup.jpg",
    "veg manchow soup": "/dishes/veg_manchow_soup.jpg",
    "veg hot & sour soup": "/dishes/veg_hot_sour_soup.jpg",
    "veg hot and sour soup": "/dishes/veg_hot_sour_soup.jpg",
    "fresh green salad": "/dishes/fresh_green_salad.jpg",
    "masala papad": "/dishes/masala_papad.jpg",
    "curd": "/dishes/curd.jpg",
    "veg spring rolls": "/dishes/veg_spring_rolls.jpg",
    "veg manchurian": "/dishes/veg_manchurian.jpg",
    "chilly gobi": "/dishes/chilly_gobi.jpg",
    "chilli gobi": "/dishes/chilly_gobi.jpg",
    "gobi 65": "/dishes/gobi_65.jpg",
    "gobi manchurian": "/dishes/gobi_manchurian.jpg",
    "mushroom 65": "/dishes/mushroom_65.jpg",
    "paneer 65": "/dishes/paneer_65.jpg",
    "chilly paneer": "/dishes/chilly_paneer.jpg",
    "chilli paneer": "/dishes/chilly_paneer.jpg",
    "babycorn 65": "/dishes/babycorn_65.jpg",
    "baby corn 65": "/dishes/babycorn_65.jpg",
    "chicken sweet corn soup": "/dishes/chicken_sweet_corn_soup.jpg",
    "chicken manchow soup": "/dishes/chicken_manchow_soup.jpg",
    "chicken hot & sour soup": "/dishes/chicken_hot_sour_soup.jpg",
    "chicken hot and sour soup": "/dishes/chicken_hot_sour_soup.jpg",
    "mutton miriyala soup": "/dishes/mutton_miriyala_soup.jpg",
    "mutton maraq soup": "/dishes/mutton_maraq_soup.jpg",
    "mutton shorba soup": "/dishes/mutton_shorba_soup.jpg",
    "chilly chicken dry": "/dishes/chilly_chicken_dry.jpg",
    "chilli chicken dry": "/dishes/chilly_chicken_dry.jpg",
    "chilly chicken": "/dishes/chilly_chicken_dry.jpg",
    "chicken 65": "/dishes/chicken_65.jpg",
    "chicken majestic": "/dishes/chicken_majestic.jpg",
    "chicken lollipop": "/dishes/chicken_lollipop.jpg",
    "chicken drumstick": "/dishes/chicken_drumstick.jpg",
    "dragon chicken": "/dishes/dragon_chicken.jpg",
    "kung pao chicken": "/dishes/kung_pao_chicken.jpg",
    "arabieq special chicken starter": "/dishes/arabieq_special_chicken_starter.jpg",
    "khandani chicken": "/dishes/khandani_chicken.jpg",
    "dubai chicken starter": "/dishes/dubai_chicken_starter.jpg",
    "mutton 65": "/dishes/mutton_65.jpg",
    "mutton pepper fry": "/dishes/mutton_pepper_fry.jpg",
    "mutton kheema balls": "/dishes/mutton_kheema_balls.jpg",
    "mutton chops": "/dishes/mutton_chops.jpg",
    "mutton sukka": "/dishes/mutton_sukka.jpg",
    "mutton boti fry": "/dishes/mutton_boti_fry.jpg",
    "fish finger": "/dishes/fish_finger.jpg",
    "apollo fish": "/dishes/apollo_fish.jpg",
}

def update_db():
    db = SessionLocal()
    try:
        items = db.query(MenuItem).all()
        updated_count = 0
        for it in items:
            name_lower = it.name.lower().strip()
            # Try direct match or substring
            matched_img = None
            for key, img_path in DISH_IMAGE_MAPPING.items():
                if key in name_lower or name_lower in key:
                    matched_img = img_path
                    break
            
            if matched_img:
                it.image_url = matched_img
                updated_count += 1
                print(f"Updated '{it.name}' -> {matched_img}")
        
        db.commit()
        print(f"\nSuccessfully updated {updated_count} dishes in local database!")
    finally:
        db.close()

if __name__ == "__main__":
    update_db()

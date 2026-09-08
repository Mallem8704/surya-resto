import os
from PIL import Image

img1_path = r"C:\Users\malle\.gemini\antigravity\brain\55bdb936-a0e2-4908-8aab-9de65f03c74e\.user_uploaded\media_1788288734349.jpg"
img2_path = r"C:\Users\malle\.gemini\antigravity\brain\55bdb936-a0e2-4908-8aab-9de65f03c74e/.user_uploaded/media_1788288893761.jpg"

im1 = Image.open(img1_path)
im2 = Image.open(img2_path)

out_dir = r"c:\Users\malle\OneDrive\Desktop\cafe saas appliction\frontend\public\dishes"
uploads_dir = r"c:\Users\malle\OneDrive\Desktop\cafe saas appliction\backend\uploads"
os.makedirs(out_dir, exist_ok=True)
os.makedirs(uploads_dir, exist_ok=True)

# Let's define the precise boxes for each row and column in Image 1:
# Image 1 (682 x 1024)
# Row 1 (Snacks 5 items): y: [52, 138]
# Col 1: [5, 130], Col 2: [136, 262], Col 3: [268, 400], Col 4: [415, 545], Col 5: [555, 678]

# Row 2 (Sweets 5 items): y: [232, 318]
# Col 1: [5, 130], Col 2: [142, 265], Col 3: [280, 400], Col 4: [418, 545], Col 5: [550, 678]

# Row 3 (Sweets 3 items): y: [405, 492]
# Col 1: [5, 135], Col 2: [145, 275], Col 3: [280, 410]

# Row 4 (Veg Soups & Salads 6 items): y: [618, 698]
# Col 1: [5, 110], Col 2: [116, 220], Col 3: [225, 325], Col 4: [332, 440], Col 5: [450, 570], Col 6: [580, 678]

# Row 5 (Veg Starters 9 items): y: [820, 893]
# Col 1: [5, 75], Col 2: [77, 150], Col 3: [152, 225], Col 4: [227, 300], Col 5: [302, 375], Col 6: [377, 450], Col 7: [452, 525], Col 8: [527, 600], Col 9: [602, 678]

crops_img1 = [
    # Row 1
    ("punugulu", (5, 52, 130, 138)),
    ("onion_pakoda", (136, 52, 262, 138)),
    ("palak_pakoda", (268, 52, 400, 138)),
    ("mirchi_bajji", (415, 52, 550, 138)),
    ("masala_vada", (555, 52, 678, 138)),
    # Row 2
    ("nellore_vada", (5, 232, 130, 318)),
    ("kesari_bath", (142, 232, 265, 318)),
    ("gulab_jamun", (280, 232, 400, 318)),
    ("kala_jamun", (418, 232, 545, 318)),
    ("double_ka_meetha", (550, 232, 678, 318)),
    # Row 3
    ("gajar_ka_halwa", (5, 405, 135, 492)),
    ("kaddu_ka_kheer", (145, 405, 275, 492)),
    ("qubani_ka_meetha", (280, 405, 410, 492)),
    # Row 4 (Soups & Salads)
    ("veg_sweet_corn_soup", (5, 618, 110, 698)),
    ("veg_manchow_soup", (116, 618, 220, 698)),
    ("veg_hot_sour_soup", (225, 618, 325, 698)),
    ("fresh_green_salad", (332, 618, 440, 698)),
    ("masala_papad", (450, 618, 570, 698)),
    ("curd", (580, 618, 678, 698)),
    # Row 5 (Veg Starters)
    ("veg_spring_rolls", (5, 820, 75, 893)),
    ("veg_manchurian", (77, 820, 150, 893)),
    ("chilly_gobi", (152, 820, 225, 893)),
    ("gobi_65", (227, 820, 300, 893)),
    ("gobi_manchurian", (302, 820, 375, 893)),
    ("mushroom_65", (377, 820, 450, 893)),
    ("paneer_65", (452, 820, 525, 893)),
    ("chilly_paneer", (527, 820, 600, 893)),
    ("babycorn_65", (602, 820, 678, 893)),
]

for name, box in crops_img1:
    cropped = im1.crop(box)
    target_f1 = os.path.join(out_dir, f"{name}.jpg")
    target_f2 = os.path.join(uploads_dir, f"{name}.jpg")
    cropped.save(target_f1, quality=95)
    cropped.save(target_f2, quality=95)
    print(f"Saved {name}.jpg ({cropped.size})")

# Image 2 (682 x 1024)
# Row 1 (Non-Veg Soups 3 items): y: [55, 185], Col 1: [16, 228], Col 2: [240, 448], Col 3: [460, 668]
# Row 2 (Mutton Soups 3 items): y: [280, 408], Col 1: [16, 228], Col 2: [240, 448], Col 3: [460, 668]
# Row 3 (Non-Veg Starters 6 items): y: [545, 630]
# Col 1: [10, 118], Col 2: [122, 230], Col 3: [234, 342], Col 4: [346, 454], Col 5: [458, 566], Col 6: [570, 676]
# Row 4 (Non-Veg Starters 6 items): y: [705, 785]
# Col 1: [10, 118], Col 2: [122, 230], Col 3: [234, 342], Col 4: [346, 454], Col 5: [458, 566], Col 6: [570, 676]
# Row 5 (Non-Veg Starters 6 items): y: [855, 935]
# Col 1: [10, 118], Col 2: [122, 230], Col 3: [234, 342], Col 4: [346, 454], Col 5: [458, 566], Col 6: [570, 676]

crops_img2 = [
    # Row 1
    ("chicken_sweet_corn_soup", (16, 55, 228, 185)),
    ("chicken_manchow_soup", (240, 55, 448, 185)),
    ("chicken_hot_sour_soup", (460, 55, 668, 185)),
    # Row 2
    ("mutton_miriyala_soup", (16, 280, 228, 408)),
    ("mutton_maraq_soup", (240, 280, 448, 408)),
    ("mutton_shorba_soup", (460, 280, 668, 408)),
    # Row 3 (Starters)
    ("chilly_chicken_dry", (10, 545, 118, 630)),
    ("chicken_65", (122, 545, 230, 630)),
    ("chicken_majestic", (234, 545, 342, 630)),
    ("chicken_lollipop", (346, 545, 454, 630)),
    ("chicken_drumstick", (458, 545, 566, 630)),
    ("dragon_chicken", (570, 545, 676, 630)),
    # Row 4 (Starters)
    ("kung_pao_chicken", (10, 705, 118, 785)),
    ("arabieq_special_chicken_starter", (122, 705, 230, 785)),
    ("khandani_chicken", (234, 705, 342, 785)),
    ("dubai_chicken_starter", (346, 705, 454, 785)),
    ("mutton_65", (458, 705, 566, 785)),
    ("mutton_pepper_fry", (570, 705, 676, 785)),
    # Row 5 (Starters)
    ("mutton_kheema_balls", (10, 855, 118, 935)),
    ("mutton_chops", (122, 855, 230, 935)),
    ("mutton_sukka", (234, 855, 342, 935)),
    ("mutton_boti_fry", (346, 855, 454, 935)),
    ("fish_finger", (458, 855, 566, 935)),
    ("apollo_fish", (570, 855, 676, 935)),
]

for name, box in crops_img2:
    cropped = im2.crop(box)
    target_f1 = os.path.join(out_dir, f"{name}.jpg")
    target_f2 = os.path.join(uploads_dir, f"{name}.jpg")
    cropped.save(target_f1, quality=95)
    cropped.save(target_f2, quality=95)
    print(f"Saved {name}.jpg ({cropped.size})")

print("\nAll 52 dish images cropped and saved successfully!")

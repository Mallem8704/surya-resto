/**
 * Universal Dish Image Resolver for Surya Family Restaurant.
 * Maps exact item names to their distinct cropped high-resolution photographs.
 */

export const DISH_IMAGE_MAP: Record<string, string> = {
    // ── Snacks & Sweets ──
    "punugulu": "/dishes/punugulu.jpg",
    "onion pakoda": "/dishes/onion_pakoda.jpg",
    "palak pakoda": "/dishes/palak_pakoda.jpg",
    "mirchi bajji": "/dishes/mirchi_bajji.jpg",
    "masala vada": "/dishes/masala_vada.jpg",
    "nellore vada": "/dishes/nellore_vada.jpg",
    "kesari bath": "/dishes/kesari_bath.jpg",
    "sheera": "/dishes/kesari_bath.jpg",
    "gulab jamun": "/dishes/gulab_jamun.jpg",
    "kala jamun": "/dishes/kala_jamun.jpg",
    "double ka meetha": "/dishes/double_ka_meetha.jpg",
    "gajar ka halwa": "/dishes/gajar_ka_halwa.jpg",
    "kaddu ka kheer": "/dishes/kaddu_ka_kheer.jpg",
    "kaddu ki kheer": "/dishes/kaddu_ka_kheer.jpg",
    "qubani ka meetha": "/dishes/qubani_ka_meetha.jpg",
    "khubani ka meetha": "/dishes/qubani_ka_meetha.jpg",

    // ── Veg Soups & Salads ──
    "veg sweet corn soup": "/dishes/veg_sweet_corn_soup.jpg",
    "veg manchow soup": "/dishes/veg_manchow_soup.jpg",
    "veg hot & sour soup": "/dishes/veg_hot_sour_soup.jpg",
    "veg hot and sour soup": "/dishes/veg_hot_sour_soup.jpg",
    "fresh green salad": "/dishes/fresh_green_salad.jpg",
    "masala papad": "/dishes/masala_papad.jpg",
    "plain curd": "/dishes/curd.jpg",

    // ── Veg Starters ──
    "veg spring roll": "/dishes/veg_spring_rolls.jpg",
    "veg manchurian": "/dishes/veg_manchurian.jpg",
    "chilly gobi": "/dishes/chilly_gobi.jpg",
    "chilli gobi": "/dishes/chilly_gobi.jpg",
    "gobi 65": "/dishes/gobi_65.jpg",
    "gobi manchurian": "/dishes/gobi_manchurian.jpg",
    "mushroom 65": "/dishes/mushroom_65.jpg",
    "paneer 65": "/dishes/paneer_65.jpg",
    "chilly paneer": "/dishes/chilly_paneer.jpg",
    "paneer chilly": "/dishes/chilly_paneer.jpg",
    "paneer chili": "/dishes/chilly_paneer.jpg",
    "babycorn 65": "/dishes/babycorn_65.jpg",
    "baby corn 65": "/dishes/babycorn_65.jpg",

    // ── Non-Veg Soups ──
    "chicken sweet corn soup": "/dishes/chicken_sweet_corn_soup.jpg",
    "chicken manchow soup": "/dishes/chicken_manchow_soup.jpg",
    "chicken hot & sour soup": "/dishes/chicken_hot_sour_soup.jpg",
    "chicken hot and sour soup": "/dishes/chicken_hot_sour_soup.jpg",
    "mutton miriyala soup": "/dishes/mutton_miriyala_soup.jpg",
    "mutton maraq soup": "/dishes/mutton_maraq_soup.jpg",
    "mutton maraq": "/dishes/mutton_maraq_soup.jpg",
    "mutton shorba soup": "/dishes/mutton_shorba_soup.jpg",
    "mutton shorba": "/dishes/mutton_shorba_soup.jpg",

    // ── Non-Veg Starters ──
    "chilly chicken": "/dishes/chilly_chicken_dry.jpg",
    "chilli chicken": "/dishes/chilly_chicken_dry.jpg",
    "chicken 65": "/dishes/chicken_65.jpg",
    "chicken majestic": "/dishes/chicken_majestic.jpg",
    "chicken lollipop": "/dishes/chicken_lollipop.jpg",
    "chicken drumstick": "/dishes/chicken_drumstick.jpg",
    "dragon chicken": "/dishes/dragon_chicken.jpg",
    "kung pao chicken": "/dishes/kung_pao_chicken.jpg",
    "surya special chicken": "/dishes/arabieq_special_chicken_starter.jpg",
    "arabieq special chicken": "/dishes/arabieq_special_chicken_starter.jpg",
    "arabiq special chicken": "/dishes/arabieq_special_chicken_starter.jpg",
    "khandani chicken": "/dishes/khandani_chicken.jpg",
    "dubai chicken": "/dishes/dubai_chicken_starter.jpg",
    "mutton 65": "/dishes/mutton_65.jpg",
    "mutton pepper fry": "/dishes/mutton_pepper_fry.jpg",
    "mutton kheema balls": "/dishes/mutton_kheema_balls.jpg",
    "mutton chops": "/dishes/mutton_chops.jpg",
    "mutton sukka": "/dishes/mutton_sukka.jpg",
    "mutton boti fry": "/dishes/mutton_boti_fry.jpg",
    "fish finger": "/dishes/fish_finger.jpg",
    "apollo fish": "/dishes/apollo_fish.jpg",
};

export const CATEGORY_DEFAULT_IMAGES: Record<number, string> = {
    1: "/dishes/3d_tiffin.jpg",
    2: "/dishes/3d_dosa.jpg",
    3: "/dishes/3d_snacks.jpg",
    4: "/dishes/3d_veg_starters.jpg",
    5: "/dishes/3d_veg_starters.jpg",
    6: "/dishes/3d_nonveg_starters.jpg",
    7: "/dishes/3d_curries.jpg",
    8: "/dishes/3d_biryani.jpg",
    9: "/dishes/3d_curries.jpg",
    10: "/dishes/3d_mandi.jpg",
    11: "/dishes/3d_beverages.jpg",
};

export function getDishImage(item: { name?: string; image_url?: string | null; category_id?: number }): string {
    const nameLower = (item.name || "").toLowerCase().trim();

    // 1. Direct match by specific dish name key
    for (const [key, path] of Object.entries(DISH_IMAGE_MAP)) {
        if (nameLower.includes(key) || key.includes(nameLower)) {
            return path;
        }
    }

    // 2. Custom or uploaded image from item data (if not a generic multi-dish cluster)
    if (
        item.image_url &&
        !item.image_url.includes("3d_snacks") &&
        !item.image_url.includes("3d_sweets")
    ) {
        return item.image_url;
    }

    // 3. Fallback category image
    return (item.category_id && CATEGORY_DEFAULT_IMAGES[item.category_id]) || "/dishes/3d_biryani.jpg";
}

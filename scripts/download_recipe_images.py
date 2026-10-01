"""
Surya Family Restaurant Kadiri - Recipe Image Ingestion & Optimization Utility
Downloads high-resolution images for authentic recipes, standardizes them to 800x600 RGB JPEGs,
and saves them to frontend/public/dishes/.
"""

import os
import sys
import urllib.request
import urllib.error
from PIL import Image
import io

OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "dishes"))
os.makedirs(OUTPUT_DIR, exist_ok=True)

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

def download_and_optimize_image(url: str, output_filename: str, target_size=(800, 600)) -> bool:
    target_path = os.path.join(OUTPUT_DIR, output_filename)
    print(f"[*] Fetching: {output_filename} from {url}...")
    
    try:
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": USER_AGENT,
                "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            }
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = resp.read()

        if len(data) < 2000:
            print(f"[!] File too small ({len(data)} bytes) for {output_filename}")
            return False

        # Open and inspect with PIL
        img = Image.open(io.BytesIO(data))
        img = img.convert("RGB")

        # Smart crop to target_size (cover)
        orig_w, orig_h = img.size
        target_w, target_h = target_size
        target_ratio = target_w / target_h
        orig_ratio = orig_w / orig_h

        if orig_ratio > target_ratio:
            # Crop width
            new_w = int(orig_h * target_ratio)
            left = (orig_w - new_w) // 2
            img = img.crop((left, 0, left + new_w, orig_h))
        else:
            # Crop height
            new_h = int(orig_w / target_ratio)
            top = (orig_h - new_h) // 2
            img = img.crop((0, top, orig_w, top + new_h))

        img = img.resize(target_size, Image.Resampling.LANCZOS)
        img.save(target_path, "JPEG", quality=92, optimize=True)
        print(f"[OK] Saved: {target_path} ({os.path.getsize(target_path)} bytes)")
        return True

    except Exception as e:
        print(f"[FAIL] {output_filename}: {e}")
        return False

if __name__ == "__main__":
    test_url = "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=1000&auto=format&fit=crop&q=80"
    success = download_and_optimize_image(test_url, "test_biryani.jpg")
    print(f"Test result: {success}")

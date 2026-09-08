import os
import sys
from PIL import Image

img1_path = r"C:\Users\malle\.gemini\antigravity\brain\55bdb936-a0e2-4908-8aab-9de65f03c74e\.user_uploaded\media_1788288734349.jpg"
img2_path = r"C:\Users\malle\.gemini\antigravity\brain\55bdb936-a0e2-4908-8aab-9de65f03c74e/.user_uploaded/media_1788288893761.jpg"

im1 = Image.open(img1_path)
im2 = Image.open(img2_path)

print(f"Image 1 Size: {im1.size}") # width, height
print(f"Image 2 Size: {im2.size}")

import os
import shutil
import subprocess
from PIL import Image

PROJECT_ROOT = r"c:\Users\Lenovo\Desktop\lab\final project\final project bank"
PUBLIC_DIR = os.path.join(PROJECT_ROOT, "public")
DRAFTS_DIR = os.path.join(PROJECT_ROOT, "desktop", "icon_drafts")

master_svg = os.path.join(DRAFTS_DIR, "nafeer_master_icon.svg")
master_png_1024 = os.path.join(DRAFTS_DIR, "nafeer_master_icon_1024.png")

print(f"Loading master image from: {master_png_1024}")
img_master = Image.open(master_png_1024).convert("RGBA")

# 1. Update public/icon.svg
public_svg = os.path.join(PUBLIC_DIR, "icon.svg")
shutil.copyfile(master_svg, public_svg)
print(f"Updated: {public_svg}")

# 2. Generate 512x512 PNGs for public/icon.png and public/app-icon.png
img_512 = img_master.resize((512, 512), Image.Resampling.LANCZOS)

public_app_icon_png = os.path.join(PUBLIC_DIR, "app-icon.png")
public_icon_png = os.path.join(PUBLIC_DIR, "icon.png")

img_512.save(public_app_icon_png, "PNG")
print(f"Updated: {public_app_icon_png}")

img_512.save(public_icon_png, "PNG")
print(f"Updated: {public_icon_png}")

# 3. Generate Multi-Resolution Windows .ico
public_ico = os.path.join(PUBLIC_DIR, "app-icon.ico")
ico_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]

# Save ICO with all resolution frames
img_master.save(public_ico, format="ICO", sizes=ico_sizes)
print(f"Updated multi-resolution ICO: {public_ico} (Sizes: {ico_sizes})")

# Also copy ICO into desktop/ folder for electron if needed
desktop_ico = os.path.join(PROJECT_ROOT, "desktop", "app-icon.ico")
shutil.copyfile(public_ico, desktop_ico)
print(f"Updated: {desktop_ico}")

print("All icon assets generated successfully.")

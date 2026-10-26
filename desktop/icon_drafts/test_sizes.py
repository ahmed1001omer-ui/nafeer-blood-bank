import os
from PIL import Image

drafts_dir = r"c:\Users\Lenovo\Desktop\lab\final project\final project bank\desktop\icon_drafts"

def make_size_preview(src_name, out_name):
    src_path = os.path.join(drafts_dir, src_name)
    im = Image.open(src_path).convert("RGBA")
    
    sizes = [256, 128, 64, 48, 32, 16]
    
    # Create composite preview image on dark and light backgrounds
    w = 800
    h = 420
    preview = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    
    # Top half: Dark background (#0F172A)
    dark_bg = Image.new("RGBA", (w, h // 2), (15, 23, 42, 255))
    preview.paste(dark_bg, (0, 0))
    
    # Bottom half: Light background (#F1F5F9)
    light_bg = Image.new("RGBA", (w, h // 2), (241, 245, 249, 255))
    preview.paste(light_bg, (0, h // 2))
    
    # Paste sizes
    x_positions = [20, 300, 450, 540, 610, 660]
    for s, x in zip(sizes, x_positions):
        resized = im.resize((s, s), Image.Resampling.LANCZOS)
        
        # Paste on dark
        y_dark = (h // 4) - (s // 2)
        preview.alpha_composite(resized, (x, y_dark))
        
        # Paste on light
        y_light = (3 * h // 4) - (s // 2)
        preview.alpha_composite(resized, (x, y_light))
        
    out_path = os.path.join(drafts_dir, out_name)
    preview.save(out_path)
    print(f"Saved size preview: {out_path}")

make_size_preview("concept2_1024.png", "concept2_sizes.png")
make_size_preview("concept_B.png", "concept_B_sizes.png")

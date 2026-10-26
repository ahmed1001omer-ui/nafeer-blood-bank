import os
import subprocess
from PIL import Image

EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
OUTPUT_DIR = r"c:\Users\Lenovo\Desktop\lab\final project\final project bank\desktop\icon_drafts"

svg_content = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="1024" height="1024">
  <defs>
    <!-- Blood Droplet Premium Vivid Medical Gradient -->
    <linearGradient id="dropGradMaster" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF2449" />
      <stop offset="35%" stop-color="#E11D48" />
      <stop offset="100%" stop-color="#991B1B" />
    </linearGradient>

    <!-- Monitor Chassis Dark Navy Gradient -->
    <linearGradient id="chassisGradMaster" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#223048" />
      <stop offset="100%" stop-color="#0F172A" />
    </linearGradient>

    <!-- Deep Midnight Screen Depth -->
    <linearGradient id="screenGradMaster" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#090E1A" />
      <stop offset="100%" stop-color="#04060C" />
    </linearGradient>
  </defs>

  <!-- Modern Monitor Stand Base (Weighted & Rounded) -->
  <rect x="156" y="420" width="200" height="26" rx="13" fill="#152033" stroke="#475569" stroke-width="3" />
  <rect x="188" y="423" width="136" height="4.5" rx="2.2" fill="#38BDF8" opacity="0.9" />

  <!-- Stand Neck -->
  <path d="M 226 348 L 286 348 L 296 422 L 216 422 Z" fill="#1C273C" stroke="#475569" stroke-width="2.5" />

  <!-- Outer Monitor Chassis (Deep Navy with high-contrast Slate Border for all backgrounds) -->
  <rect x="44" y="58" width="424" height="300" rx="28" ry="28" fill="url(#chassisGradMaster)" stroke="#475569" stroke-width="3.5" />

  <!-- Inner Screen Bezel & Recess -->
  <rect x="64" y="78" width="384" height="246" rx="16" ry="16" fill="url(#screenGradMaster)" stroke="#162238" stroke-width="2" />

  <!-- Top Window Header / System Header -->
  <line x1="84" y1="108" x2="428" y2="108" stroke="#1E2D4A" stroke-width="2.5" />
  <circle cx="98" cy="94" r="5" fill="#38BDF8" />
  <circle cx="114" cy="94" r="5" fill="#60A5FA" opacity="0.85" />
  <circle cx="130" cy="94" r="5" fill="#64748B" />

  <!-- Left: Blood Inventory & Management Analytics -->
  <!-- 3 Prominent Data Bars -->
  <rect x="100" y="210" width="24" height="74" rx="6" fill="#38BDF8" />
  <rect x="136" y="170" width="24" height="114" rx="6" fill="#0284C7" />
  <rect x="172" y="136" width="24" height="148" rx="6" fill="#2563EB" />

  <!-- Ascending Analytics Trendline with Glowing Node -->
  <path d="M 100 200 L 144 154 L 180 122 L 214 146" fill="none" stroke="#FFFFFF" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round" />
  <circle cx="214" cy="146" r="6.5" fill="#38BDF8" stroke="#FFFFFF" stroke-width="2.5" />

  <!-- Elegant Vertical Divider Line -->
  <line x1="242" y1="126" x2="242" y2="292" stroke="#1E2D4A" stroke-width="3" stroke-linecap="round" />

  <!-- Right: Medical Blood Droplet (Vibrant Medical Red) -->
  <path d="M 338 118 C 338 118 266 214 266 258 C 266 298 298 324 338 324 C 378 324 410 298 410 258 C 410 214 338 118 338 118 Z" fill="url(#dropGradMaster)" stroke="#B91C1C" stroke-width="2" />

  <!-- Vital Life Pulse Line (Bold High-Contrast Crisp White ECG) -->
  <path d="M 282 258 L 310 258 L 324 220 L 342 294 L 354 240 L 364 258 L 394 258" fill="none" stroke="#FFFFFF" stroke-width="9.5" stroke-linecap="round" stroke-linejoin="round" />

  <!-- Clean Specular Reflection on Droplet -->
  <path d="M 296 226 C 288 240 288 260 293 274" fill="none" stroke="#FFFFFF" stroke-width="5.5" stroke-linecap="round" opacity="0.65" />
</svg>
"""

svg_path = os.path.join(OUTPUT_DIR, "nafeer_master_icon.svg")
with open(svg_path, "w", encoding="utf-8") as f:
    f.write(svg_content.strip())
print(f"Saved SVG: {svg_path}")

# Render to 1024x1024 PNG with transparent background
png_1024_path = os.path.join(OUTPUT_DIR, "nafeer_master_icon_1024.png")
cmd = [
    EDGE_PATH,
    "--headless=new",
    "--disable-gpu",
    "--default-background-color=00000000",
    f"--screenshot={png_1024_path}",
    "--window-size=1024,1024",
    f"file:///{svg_path.replace(os.sep, '/')}"
]
subprocess.run(cmd, check=True)
print(f"Rendered: {png_1024_path}")

# Verify with Pillow
img_master = Image.open(png_1024_path).convert("RGBA")

# Build Size Preview
w, h = 900, 440
preview = Image.new("RGBA", (w, h), (0, 0, 0, 0))
dark_bg = Image.new("RGBA", (w, h // 2), (15, 23, 42, 255))
light_bg = Image.new("RGBA", (w, h // 2), (248, 250, 252, 255))
preview.paste(dark_bg, (0, 0))
preview.paste(light_bg, (0, h // 2))

sizes = [256, 128, 64, 48, 32, 16]
x_pos = [20, 320, 480, 580, 660, 720]

for s, x in zip(sizes, x_pos):
    resized = img_master.resize((s, s), Image.Resampling.LANCZOS)
    preview.alpha_composite(resized, (x, (h // 4) - (s // 2)))
    preview.alpha_composite(resized, (x, (3 * h // 4) - (s // 2)))

preview_path = os.path.join(OUTPUT_DIR, "master_size_preview.png")
preview.save(preview_path)
print(f"Saved preview: {preview_path}")

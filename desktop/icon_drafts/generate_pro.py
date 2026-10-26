import os
import subprocess
from PIL import Image

EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
OUTPUT_DIR = r"c:\Users\Lenovo\Desktop\lab\final project\final project bank\desktop\icon_drafts"

# Refined Design 1: Professional Commercial Split Dashboard (High Contrast & Visible on Dark + Light)
svg_pro1 = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="1024" height="1024">
  <defs>
    <!-- Blood Drop Vivid Gradient -->
    <linearGradient id="dropGradPro1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF2A4D" />
      <stop offset="40%" stop-color="#E11D48" />
      <stop offset="100%" stop-color="#9F1239" />
    </linearGradient>

    <!-- Monitor Chassis Gradient (High contrast Navy) -->
    <linearGradient id="chassisGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#24324D" />
      <stop offset="100%" stop-color="#111B2E" />
    </linearGradient>

    <!-- Screen Depth Gradient -->
    <linearGradient id="screenGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0A101D" />
      <stop offset="100%" stop-color="#050811" />
    </linearGradient>
  </defs>

  <!-- Monitor Stand Base (Rounded, Stable) -->
  <rect x="156" y="420" width="200" height="26" rx="13" fill="#182338" stroke="#334155" stroke-width="2.5" />
  <rect x="190" y="423" width="132" height="4" rx="2" fill="#38BDF8" opacity="0.8" />

  <!-- Stand Neck -->
  <path d="M 226 348 L 286 348 L 296 422 L 216 422 Z" fill="#1E2B45" stroke="#334155" stroke-width="2" />

  <!-- Outer Monitor Chassis (Deep Navy with Slate Border for Dark Mode Pop) -->
  <rect x="44" y="58" width="424" height="300" rx="28" ry="28" fill="url(#chassisGrad1)" stroke="#384C6E" stroke-width="3" />

  <!-- Inner Screen Bezel & Recess -->
  <rect x="64" y="78" width="384" height="246" rx="16" ry="16" fill="url(#screenGrad1)" stroke="#162238" stroke-width="2" />

  <!-- Top Window Header / Management Bar -->
  <line x1="84" y1="108" x2="428" y2="108" stroke="#1E2D4A" stroke-width="2.5" />
  <circle cx="98" cy="94" r="5" fill="#38BDF8" />
  <circle cx="114" cy="94" r="5" fill="#60A5FA" opacity="0.8" />
  <circle cx="130" cy="94" r="5" fill="#475569" />

  <!-- Left: Blood Inventory & Management Analytics -->
  <!-- 3 Prominent Data Bars -->
  <rect x="100" y="210" width="24" height="74" rx="6" fill="#38BDF8" />
  <rect x="136" y="170" width="24" height="114" rx="6" fill="#0284C7" />
  <rect x="172" y="136" width="24" height="148" rx="6" fill="#2563EB" />

  <!-- Ascending Analytics Trendline -->
  <path d="M 100 200 L 144 154 L 180 122 L 214 146" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
  <circle cx="214" cy="146" r="6" fill="#38BDF8" stroke="#FFFFFF" stroke-width="2.5" />

  <!-- Divider Line -->
  <line x1="242" y1="126" x2="242" y2="292" stroke="#1E2D4A" stroke-width="3" stroke-linecap="round" />

  <!-- Right: Blood Droplet (Vibrant Medical Red) -->
  <path d="M 338 120 C 338 120 268 214 268 258 C 268 298 299 324 338 324 C 377 324 408 298 408 258 C 408 214 338 120 338 120 Z" fill="url(#dropGradPro1)" stroke="#B91C1C" stroke-width="2" />

  <!-- Vital Life Pulse Line (Thick Crisp White ECG) -->
  <path d="M 284 258 L 312 258 L 325 222 L 342 292 L 354 242 L 364 258 L 392 258" fill="none" stroke="#FFFFFF" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round" />

  <!-- Subtle Droplet Reflection -->
  <path d="M 298 228 C 290 242 290 260 295 272" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" opacity="0.6" />
</svg>
"""

# Refined Design 2: Centered Hero Drop + Dynamic Hospital Vital Line + Side Analytics
svg_pro2 = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="1024" height="1024">
  <defs>
    <!-- Blood Drop Vivid Gradient -->
    <linearGradient id="dropGradPro2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF2A4D" />
      <stop offset="45%" stop-color="#E11D48" />
      <stop offset="100%" stop-color="#9F1239" />
    </linearGradient>

    <!-- Monitor Chassis Gradient -->
    <linearGradient id="chassisGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#24324D" />
      <stop offset="100%" stop-color="#111B2E" />
    </linearGradient>

    <!-- Screen Depth Gradient -->
    <linearGradient id="screenGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0A101D" />
      <stop offset="100%" stop-color="#050811" />
    </linearGradient>
  </defs>

  <!-- Monitor Stand Base -->
  <rect x="156" y="420" width="200" height="26" rx="13" fill="#182338" stroke="#334155" stroke-width="2.5" />
  <rect x="190" y="423" width="132" height="4" rx="2" fill="#38BDF8" opacity="0.8" />

  <!-- Stand Neck -->
  <path d="M 226 348 L 286 348 L 296 422 L 216 422 Z" fill="#1E2B45" stroke="#334155" stroke-width="2" />

  <!-- Outer Monitor Chassis -->
  <rect x="44" y="58" width="424" height="300" rx="28" ry="28" fill="url(#chassisGrad2)" stroke="#384C6E" stroke-width="3" />

  <!-- Inner Screen Bezel -->
  <rect x="64" y="78" width="384" height="246" rx="16" ry="16" fill="url(#screenGrad2)" stroke="#162238" stroke-width="2" />

  <!-- Top Window Header -->
  <line x1="84" y1="108" x2="428" y2="108" stroke="#1E2D4A" stroke-width="2.5" />
  <circle cx="98" cy="94" r="5" fill="#38BDF8" />
  <circle cx="114" cy="94" r="5" fill="#60A5FA" opacity="0.8" />
  <circle cx="130" cy="94" r="5" fill="#475569" />

  <!-- Left: Management Data Bars -->
  <rect x="94" y="200" width="20" height="66" rx="5" fill="#0284C7" />
  <rect x="122" y="164" width="20" height="102" rx="5" fill="#38BDF8" />
  <rect x="150" y="132" width="20" height="134" rx="5" fill="#60A5FA" />

  <!-- Right: Medical Cross / System Status -->
  <!-- Rounded Medical Cross Emblem -->
  <rect x="364" y="150" width="36" height="12" rx="4" fill="#38BDF8" opacity="0.85" />
  <rect x="376" y="138" width="12" height="36" rx="4" fill="#38BDF8" opacity="0.85" />
  <!-- Additional status bars on right -->
  <rect x="350" y="206" width="64" height="8" rx="4" fill="#1E2D4A" />
  <rect x="366" y="224" width="48" height="8" rx="4" fill="#1E2D4A" />
  <rect x="340" y="242" width="74" height="8" rx="4" fill="#1E2D4A" />

  <!-- Central Prominent Blood Droplet -->
  <path d="M 256 112 C 256 112 186 210 186 256 C 186 298 217 324 256 324 C 295 324 326 298 326 256 C 326 210 256 112 256 112 Z" fill="url(#dropGradPro2)" stroke="#B91C1C" stroke-width="2" />

  <!-- White Lifeline across screen & through drop -->
  <path d="M 64 256 L 168 256 L 178 244 L 186 256" fill="none" stroke="#38BDF8" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.6" />
  <path d="M 186 256 L 216 256 L 232 216 L 252 294 L 270 236 L 282 256 L 326 256" fill="none" stroke="#FFFFFF" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round" />
  <path d="M 326 256 L 334 244 L 344 256 L 448 256" fill="none" stroke="#38BDF8" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.6" />

  <!-- Droplet Specular Reflection -->
  <path d="M 218 222 C 210 238 210 258 215 272" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" opacity="0.6" />
</svg>
"""

with open(os.path.join(OUTPUT_DIR, "pro1.svg"), "w", encoding="utf-8") as f:
    f.write(svg_pro1.strip())
with open(os.path.join(OUTPUT_DIR, "pro2.svg"), "w", encoding="utf-8") as f:
    f.write(svg_pro2.strip())

# Render with Edge headless
for name in ["pro1", "pro2"]:
    svg_p = os.path.join(OUTPUT_DIR, f"{name}.svg")
    png_p = os.path.join(OUTPUT_DIR, f"{name}_1024.png")
    cmd = [
        EDGE_PATH,
        "--headless=new",
        "--disable-gpu",
        "--default-background-color=00000000",
        f"--screenshot={png_p}",
        "--window-size=1024,1024",
        f"file:///{svg_p.replace(os.sep, '/')}"
    ]
    subprocess.run(cmd, check=True)
    print(f"Rendered: {png_p}")

print("Both refined designs rendered successfully.")

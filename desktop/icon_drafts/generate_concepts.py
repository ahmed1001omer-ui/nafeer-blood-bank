import os
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.path import Path
from PIL import Image

OUTPUT_DIR = r"c:\Users\Lenovo\Desktop\lab\final project\final project bank\desktop\icon_drafts"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def create_blood_drop_path(center_x, center_y, width, height):
    """Creates a smooth cubic bezier path for an elegant medical blood droplet."""
    # Top tip
    tip_x, tip_y = center_x, center_y + height * 0.48
    # Bottom round belly
    bottom_y = center_y - height * 0.48
    belly_w = width * 0.5
    waist_y = center_y - height * 0.05
    
    verts = [
        (tip_x, tip_y), # 0: Tip
        # Right curve down
        (tip_x + belly_w * 0.35, tip_y - height * 0.25),
        (tip_x + belly_w, waist_y),
        (tip_x + belly_w, center_y - height * 0.25),
        # Bottom right round
        (tip_x + belly_w, bottom_y),
        (tip_x + belly_w * 0.4, bottom_y),
        (tip_x, bottom_y),
        # Bottom left round
        (tip_x - belly_w * 0.4, bottom_y),
        (tip_x - belly_w, bottom_y),
        (tip_x - belly_w, center_y - height * 0.25),
        # Left curve up
        (tip_x - belly_w, waist_y),
        (tip_x - belly_w * 0.35, tip_y - height * 0.25),
        (tip_x, tip_y), # Close to tip
    ]
    codes = [
        Path.MOVETO,
        Path.CURVE4, Path.CURVE4, Path.CURVE4,
        Path.CURVE4, Path.CURVE4, Path.CURVE4,
        Path.CURVE4, Path.CURVE4, Path.CURVE4,
        Path.CURVE4, Path.CURVE4, Path.CURVE4,
    ]
    return Path(verts, codes)

def render_concept_A(filename):
    """
    Concept A: 'Central Medical Pulse'
    A powerful modern monitor in Deep Navy, with a prominent ruby blood drop 
    and a crisp white ECG pulse running across.
    """
    fig, ax = plt.subplots(figsize=(8, 8), dpi=128)
    fig.patch.set_alpha(0.0)
    ax.patch.set_alpha(0.0)
    ax.set_xlim(0, 512)
    ax.set_ylim(0, 512)
    ax.set_aspect('equal')
    ax.axis('off')

    # Monitor Base
    base = patches.FancyBboxPatch((160, 48), 192, 24, boxstyle="round,pad=0,rounding_size=12",
                                  facecolor="#0B132B", edgecolor="none")
    ax.add_patch(base)

    # Monitor Stand Neck
    neck_verts = [(226, 70), (286, 70), (276, 130), (236, 130)]
    neck = patches.Polygon(neck_verts, closed=True, facecolor="#1C2541", edgecolor="none")
    ax.add_patch(neck)

    # Monitor Outer Frame (Deep Midnight Navy)
    frame = patches.FancyBboxPatch((48, 120), 416, 310, boxstyle="round,pad=0,rounding_size=28",
                                   facecolor="#0F172A", edgecolor="none")
    ax.add_patch(frame)

    # Monitor Inner Screen
    screen = patches.FancyBboxPatch((66, 140), 380, 260, boxstyle="round,pad=0,rounding_size=16",
                                    facecolor="#060913", edgecolor="none")
    ax.add_patch(screen)

    # Top Screen UI Accent (Window dots & subtle header)
    ax.plot([86, 426], [376, 376], color="#1E293B", lw=2)
    for i, (cx, col) in enumerate([(98, "#38BDF8"), (114, "#475569"), (130, "#475569")]):
        dot = patches.Circle((cx, 388), 4.5, facecolor=col, edgecolor="none")
        ax.add_patch(dot)

    # Left Management Analytics (Blood Inventory status)
    # 3 vertical bars
    ax.add_patch(patches.FancyBboxPatch((96, 168), 18, 50, boxstyle="round,pad=0,rounding_size=4", facecolor="#0284C7", edgecolor="none"))
    ax.add_patch(patches.FancyBboxPatch((122, 168), 18, 80, boxstyle="round,pad=0,rounding_size=4", facecolor="#0369A1", edgecolor="none"))
    ax.add_patch(patches.FancyBboxPatch((148, 168), 18, 110, boxstyle="round,pad=0,rounding_size=4", facecolor="#38BDF8", edgecolor="none"))
    
    # Analytics upward trendline
    ax.plot([96, 126, 154, 184], [214, 240, 274, 290], color="#94A3B8", lw=2.5, ls="--")
    ax.add_patch(patches.Circle((184, 290), 4, facecolor="#38BDF8", edgecolor="#FFFFFF", lw=1.5))

    # Right / Side data rows
    for ry in [260, 240, 220, 200, 180]:
        rw = np.random.choice([50, 70, 60, 45, 65])
        ax.add_patch(patches.FancyBboxPatch((350, ry), rw, 6, boxstyle="round,pad=0,rounding_size=3", facecolor="#1E293B", edgecolor="none"))

    # Central Prominent Blood Droplet
    drop_path = create_blood_drop_path(center_x=256, center_y=255, width=146, height=190)
    drop_patch = patches.PathPatch(drop_path, facecolor="#DC2626", edgecolor="#B91C1C", lw=2)
    ax.add_patch(drop_patch)

    # High-Contrast Pure White Pulse Line (Vital Lifeline / ECG)
    # Enters from left screen, peaks inside drop, exits to right screen
    ecg_x = [66, 180, 210, 230, 246, 264, 278, 296, 320, 446]
    ecg_y = [255, 255, 255, 225, 298, 205, 268, 255, 255, 255]
    
    # Outer pulse line (dim cyan)
    ax.plot([66, 185], [255, 255], color="#0284C7", lw=3.5, alpha=0.6)
    ax.plot([325, 446], [255, 255], color="#0284C7", lw=3.5, alpha=0.6)
    
    # Main White ECG inside drop
    ax.plot(ecg_x[1:9], ecg_y[1:9], color="#FFFFFF", lw=6, solid_capstyle='round', solid_joinstyle='round')

    # Droplet Highlight / Specular curve
    hl_path = Path([(222, 230), (216, 255), (218, 280)], [Path.MOVETO, Path.CURVE3, Path.CURVE3])
    ax.add_patch(patches.PathPatch(hl_path, facecolor="none", edgecolor="#FFFFFF", lw=4.5, capstyle='round', alpha=0.55))

    plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
    plt.savefig(filename, transparent=True, dpi=256)
    plt.close()
    print(f"Generated: {filename}")

def render_concept_B(filename):
    """
    Concept B: 'Harmonious Split Dashboard'
    A balanced presentation: Left side features clean management inventory analytics,
    Right side features a bold Ruby blood droplet with lifeline, enclosed in a Deep Navy monitor.
    """
    fig, ax = plt.subplots(figsize=(8, 8), dpi=128)
    fig.patch.set_alpha(0.0)
    ax.patch.set_alpha(0.0)
    ax.set_xlim(0, 512)
    ax.set_ylim(0, 512)
    ax.set_aspect('equal')
    ax.axis('off')

    # Stand Base
    base = patches.FancyBboxPatch((156, 44), 200, 26, boxstyle="round,pad=0,rounding_size=13",
                                  facecolor="#0B132B", edgecolor="none")
    ax.add_patch(base)

    # Stand Neck
    neck_verts = [(224, 68), (288, 68), (278, 126), (234, 126)]
    ax.add_patch(patches.Polygon(neck_verts, closed=True, facecolor="#1E293B", edgecolor="none"))

    # Monitor Chassis
    frame = patches.FancyBboxPatch((46, 116), 420, 316, boxstyle="round,pad=0,rounding_size=28",
                                   facecolor="#0F172A", edgecolor="none")
    ax.add_patch(frame)

    # Screen Display Area
    screen = patches.FancyBboxPatch((66, 138), 380, 264, boxstyle="round,pad=0,rounding_size=16",
                                    facecolor="#090E17", edgecolor="none")
    ax.add_patch(screen)

    # Top Status Bar
    ax.plot([86, 426], [374, 374], color="#1E293B", lw=2)
    ax.add_patch(patches.Circle((98, 386), 4.5, facecolor="#38BDF8", edgecolor="none"))
    ax.add_patch(patches.Circle((114, 386), 4.5, facecolor="#64748B", edgecolor="none"))
    ax.add_patch(patches.Circle((130, 386), 4.5, facecolor="#64748B", edgecolor="none"))

    # Left: Management & Inventory Analytics Charts
    # 3 distinct colored bars representing blood bank stocks
    ax.add_patch(patches.FancyBboxPatch((104, 168), 24, 65, boxstyle="round,pad=0,rounding_size=6", facecolor="#38BDF8", edgecolor="none"))
    ax.add_patch(patches.FancyBboxPatch((138, 168), 24, 105, boxstyle="round,pad=0,rounding_size=6", facecolor="#0284C7", edgecolor="none"))
    ax.add_patch(patches.FancyBboxPatch((172, 168), 24, 145, boxstyle="round,pad=0,rounding_size=6", facecolor="#1D4ED8", edgecolor="none"))

    # Administrative upward curve
    curve_x = [104, 142, 178, 218]
    curve_y = [228, 268, 312, 332]
    ax.plot(curve_x, curve_y, color="#FFFFFF", lw=4.5, solid_capstyle='round')
    ax.add_patch(patches.Circle((218, 332), 6, facecolor="#38BDF8", edgecolor="#FFFFFF", lw=2))

    # Elegant Vertical Divider
    ax.plot([246, 246], [160, 350], color="#1E293B", lw=2.5, solid_capstyle='round')

    # Right: Medical Blood Droplet
    drop_path = create_blood_drop_path(center_x=340, center_y=255, width=136, height=180)
    ax.add_patch(patches.PathPatch(drop_path, facecolor="#DC2626", edgecolor="#B91C1C", lw=2))

    # White ECG Pulse inside the Right Droplet
    ecg_x = [298, 320, 332, 344, 354, 362, 382]
    ecg_y = [255, 255, 288, 218, 272, 255, 255]
    ax.plot(ecg_x, ecg_y, color="#FFFFFF", lw=6, solid_capstyle='round', solid_joinstyle='round')

    # Droplet Specular Reflection
    hl_path = Path([(306, 235), (300, 258), (302, 278)], [Path.MOVETO, Path.CURVE3, Path.CURVE3])
    ax.add_patch(patches.PathPatch(hl_path, facecolor="none", edgecolor="#FFFFFF", lw=4.5, capstyle='round', alpha=0.6))

    plt.subplots_adjust(left=0, right=1, top=1, bottom=0)
    plt.savefig(filename, transparent=True, dpi=256)
    plt.close()
    print(f"Generated: {filename}")

render_concept_A(os.path.join(OUTPUT_DIR, "concept_A.png"))
render_concept_B(os.path.join(OUTPUT_DIR, "concept_B.png"))

import os
from PIL import Image, ImageDraw

def generate_icons():
    base_dir = r"c:\Users\HP\OneDrive\Desktop\Acme HRMS\frontend"
    src_logo_path = os.path.join(base_dir, "public", "pwa-512x512.png")
    res_dir = os.path.join(base_dir, "android", "app", "src", "main", "res")

    print(f"Loading base logo from {src_logo_path}...")
    orig = Image.open(src_logo_path).convert("RGBA")
    w, h = orig.size

    # Floodfill 4 corners with transparency
    logo_transparent_corners = orig.copy()
    ImageDraw.floodfill(logo_transparent_corners, (0, 0), (0, 0, 0, 0), thresh=25)
    ImageDraw.floodfill(logo_transparent_corners, (w - 1, 0), (0, 0, 0, 0), thresh=25)
    ImageDraw.floodfill(logo_transparent_corners, (0, h - 1), (0, 0, 0, 0), thresh=25)
    ImageDraw.floodfill(logo_transparent_corners, (w - 1, h - 1), (0, 0, 0, 0), thresh=25)

    # 1. Generate Mipmap Icons
    mipmap_configs = {
        "mipmap-mdpi": {"icon": 48, "fg": 108},
        "mipmap-hdpi": {"icon": 72, "fg": 162},
        "mipmap-xhdpi": {"icon": 96, "fg": 216},
        "mipmap-xxhdpi": {"icon": 144, "fg": 324},
        "mipmap-xxxhdpi": {"icon": 192, "fg": 432},
    }

    for folder, sizes in mipmap_configs.items():
        folder_path = os.path.join(res_dir, folder)
        os.makedirs(folder_path, exist_ok=True)
        icon_size = sizes["icon"]
        fg_size = sizes["fg"]

        # ic_launcher.png (Squircle icon with transparent corners)
        launcher_img = logo_transparent_corners.resize((icon_size, icon_size), Image.Resampling.LANCZOS)
        launcher_path = os.path.join(folder_path, "ic_launcher.png")
        launcher_img.save(launcher_path, "PNG")

        # ic_launcher_round.png (Circular masked icon)
        round_img = Image.new("RGBA", (icon_size, icon_size), (0, 0, 0, 0))
        mask = Image.new("L", (icon_size * 4, icon_size * 4), 0)
        draw = ImageDraw.Draw(mask)
        draw.ellipse((0, 0, icon_size * 4 - 1, icon_size * 4 - 1), fill=255)
        mask = mask.resize((icon_size, icon_size), Image.Resampling.LANCZOS)

        temp_square = orig.resize((icon_size, icon_size), Image.Resampling.LANCZOS)
        round_img.paste(temp_square, (0, 0))
        round_img.putalpha(mask)
        round_path = os.path.join(folder_path, "ic_launcher_round.png")
        round_img.save(round_path, "PNG")

        # ic_launcher_foreground.png (Adaptive icon foreground, centered at ~70% canvas)
        fg_img = Image.new("RGBA", (fg_size, fg_size), (0, 0, 0, 0))
        logo_fg_size = int(fg_size * 0.72)
        scaled_logo = logo_transparent_corners.resize((logo_fg_size, logo_fg_size), Image.Resampling.LANCZOS)
        offset = (fg_size - logo_fg_size) // 2
        fg_img.paste(scaled_logo, (offset, offset), scaled_logo)
        fg_path = os.path.join(folder_path, "ic_launcher_foreground.png")
        fg_img.save(fg_path, "PNG")

        print(f"Generated {folder}: ic_launcher ({icon_size}x{icon_size}), ic_launcher_round, ic_launcher_foreground ({fg_size}x{fg_size})")

    # 2. Generate Splash Screens
    splash_configs = {
        "drawable": (480, 320),
        "drawable-land-hdpi": (800, 480),
        "drawable-land-mdpi": (480, 320),
        "drawable-land-xhdpi": (1280, 720),
        "drawable-land-xxhdpi": (1600, 960),
        "drawable-land-xxxhdpi": (1920, 1280),
        "drawable-port-hdpi": (480, 800),
        "drawable-port-mdpi": (320, 480),
        "drawable-port-xhdpi": (720, 1280),
        "drawable-port-xxhdpi": (960, 1600),
        "drawable-port-xxxhdpi": (1280, 1920),
    }

    for folder, (sw, sh) in splash_configs.items():
        folder_path = os.path.join(res_dir, folder)
        os.makedirs(folder_path, exist_ok=True)
        splash_img = Image.new("RGB", (sw, sh), (255, 255, 255))

        # Size of logo on splash screen: approx 30% of shorter dimension
        target_logo_dim = max(96, int(min(sw, sh) * 0.35))
        splash_logo = logo_transparent_corners.resize((target_logo_dim, target_logo_dim), Image.Resampling.LANCZOS)
        
        # Center the logo
        offset_x = (sw - target_logo_dim) // 2
        offset_y = (sh - target_logo_dim) // 2
        splash_img.paste(splash_logo, (offset_x, offset_y), splash_logo)

        splash_path = os.path.join(folder_path, "splash.png")
        splash_img.save(splash_path, "PNG")
        print(f"Generated {folder}/splash.png ({sw}x{sh})")

    print("\nAll Android icons and splash images updated successfully with app logo!")

if __name__ == "__main__":
    generate_icons()

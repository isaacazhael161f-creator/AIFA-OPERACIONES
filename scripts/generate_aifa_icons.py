from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageOps, ImageEnhance

ROOT = Path(__file__).resolve().parents[1]
SOURCE_LOGO = ROOT / "images" / "logo_aifa.jpg"
ICON_DIR = ROOT / "images" / "icons"
ICON_DIR.mkdir(parents=True, exist_ok=True)

START_COLOR = (12, 35, 73)  # #0c2349
END_COLOR = (36, 157, 255)  # #249dff


def _lerp(a: int, b: int, t: float) -> int:
    return int(round(a + (b - a) * t))


def _lerp_color(start: tuple[int, int, int], end: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(_lerp(sa, ea, t) for sa, ea in zip(start, end))


def _build_gradient(size: int) -> Image.Image:
    background = Image.new("RGB", (size, size), START_COLOR)
    draw = ImageDraw.Draw(background)
    for y in range(size):
        t = y / (size - 1)
        color = _lerp_color(START_COLOR, END_COLOR, t)
        draw.line([(0, y), (size, y)], fill=color)

    # Add a diagonal glow
    glow = Image.new("L", (size, size), 0)
    glow_draw = ImageDraw.Draw(glow)
    radius = int(size * 0.7)
    glow_draw.ellipse(
        (
            int(-radius * 0.3),
            int(-radius * 0.2),
            int(radius * 0.9),
            int(radius * 0.9),
        ),
        fill=220,
    )
    glow = glow.filter(ImageFilter.GaussianBlur(size // 6))
    tinted = Image.new("RGB", (size, size), (255, 255, 255))
    background = Image.composite(tinted, background, glow)

    return background


def _load_logo(target_size: int) -> Image.Image:
    if not SOURCE_LOGO.exists():
        raise FileNotFoundError(f"Logo source not found: {SOURCE_LOGO}")

    logo = Image.open(SOURCE_LOGO).convert("RGBA")
    # Slightly increase brightness and contrast for clarity on dark backgrounds
    logo = ImageEnhance.Brightness(logo).enhance(1.08)
    logo = ImageEnhance.Color(logo).enhance(1.05)
    logo = ImageOps.contain(logo, (target_size, target_size), Image.LANCZOS)

    # Apply subtle rounded mask to soften edges if the logo is rectangular
    mask = Image.new("L", logo.size, 0)
    mask_draw = ImageDraw.Draw(mask)
    radius = max(4, target_size // 12)
    mask_draw.rounded_rectangle((0, 0, logo.size[0], logo.size[1]), radius=radius, fill=255)
    logo.putalpha(mask)
    return logo


def _compose_icon(size: int) -> Image.Image:
    canvas = _build_gradient(size).convert("RGBA")

    # Inner glass panel
    panel = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    panel_draw = ImageDraw.Draw(panel)
    inset = int(size * 0.08)
    panel_radius = int(size * 0.32)
    panel_draw.rounded_rectangle(
        (inset, inset, size - inset, size - inset),
        radius=panel_radius,
        fill=(255, 255, 255, 48),
        outline=(255, 255, 255, 90),
        width=max(1, size // 120),
    )
    panel = panel.filter(ImageFilter.GaussianBlur(radius=size // 90 or 1))
    canvas = Image.alpha_composite(canvas, panel)

    # Add subtle outer ring for maskable clarity
    ring = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ring_draw = ImageDraw.Draw(ring)
    ring_draw.ellipse(
        (int(size * 0.02), int(size * 0.02), int(size * 0.98), int(size * 0.98)),
        outline=(255, 255, 255, 55),
        width=max(1, size // 140),
    )
    canvas = Image.alpha_composite(canvas, ring)

    logo_size = int(size * 0.58)
    logo = _load_logo(logo_size)

    # Drop shadow
    shadow = Image.new("RGBA", logo.size, (0, 0, 0, 0))
    shadow_mask = Image.new("L", logo.size, 0)
    shadow_draw = ImageDraw.Draw(shadow_mask)
    shadow_draw.rounded_rectangle((0, 0, logo.size[0], logo.size[1]), radius=max(6, logo_size // 10), fill=170)
    shadow.putalpha(shadow_mask)
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=max(6, size // 30)))

    pos = ((size - logo.size[0]) // 2, (size - logo.size[1]) // 2)
    shadow_offset = (pos[0] + max(2, size // 80), pos[1] + max(4, size // 60))

    shadow_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    shadow_layer.paste(shadow, shadow_offset)
    canvas = Image.alpha_composite(canvas, shadow_layer)

    logo_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    logo_layer.paste(logo, pos, mask=logo.getchannel("A"))
    canvas = Image.alpha_composite(canvas, logo_layer)

    # Finish with top sheen
    sheen = Image.new("L", (size, size), 0)
    sheen_draw = ImageDraw.Draw(sheen)
    sheen_draw.pieslice(
        (
            int(-size * 0.4),
            int(-size * 0.55),
            int(size * 1.4),
            int(size * 1.2),
        ),
        start=0,
        end=60,
        fill=110,
    )
    sheen = sheen.filter(ImageFilter.GaussianBlur(radius=size // 8))
    canvas = Image.composite(Image.new("RGBA", (size, size), (255, 255, 255, 40)), canvas, sheen)

    return canvas


def generate_icon_set() -> None:
    for size in (512, 192):
        icon = _compose_icon(size)
        target = ICON_DIR / f"aifa-app-icon-{size}.png"
        icon.save(target, format="PNG")
        print(f"Generated {target.relative_to(ROOT)}")


if __name__ == "__main__":
    generate_icon_set()

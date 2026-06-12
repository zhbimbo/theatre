"""Generate PNG favicons from brand colors (run once after design tweaks)."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ICONS = ROOT / "icons"
BG = (139, 69, 19)
FG = (255, 248, 240)
BORDER = (245, 235, 224, 90)


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in (
        r"C:\Windows\Fonts\georgia.ttf",
        r"C:\Windows\Fonts\times.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
    ):
        p = Path(path)
        if p.exists():
            return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()


def draw_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    radius = max(4, size // 5)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=BG)
    inset = max(2, size // 16)
    draw.rounded_rectangle(
        (inset, inset, size - 1 - inset, size - 1 - inset),
        radius=max(3, radius - 1),
        outline=BORDER,
        width=max(1, size // 32),
    )
    font = load_font(int(size * 0.52))
    letter = "Т"
    bbox = draw.textbbox((0, 0), letter, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((size - tw) / 2 - bbox[0], (size - th) / 2 - bbox[1] - size * 0.02), letter, fill=FG, font=font)
    return img


def main() -> None:
    ICONS.mkdir(exist_ok=True)
    for name, size in (("favicon-32.png", 32), ("apple-touch-icon.png", 180), ("icon-192.png", 192)):
        draw_icon(size).save(ICONS / name, format="PNG")
        print("Written:", ICONS / name)


if __name__ == "__main__":
    main()

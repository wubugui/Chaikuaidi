#!/usr/bin/env python3
"""Process GPT image source sheets into runtime PNG assets.

This script does not draw artwork. It only crops, chroma-keys, resizes, and
writes PNG files from image_gen source images saved under tmp/ai-art.
"""

from __future__ import annotations

import json
import math
import re
from pathlib import Path

from PIL import Image, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
ICON_DIR = ROOT / "public/game-art/icons"
BG_DIR = ROOT / "public/game-art/backgrounds"
CHAR_DIR = ROOT / "public/game-art/characters"
UI_DIR = ROOT / "public/game-art/ui"
SRC = ROOT / "tmp/ai-art"
PYTHON_RE = re.compile(r"export const GAME_ART_RECORDS = (\[[\s\S]*?\]) as const")


def read_records() -> list[dict]:
    text = (ROOT / "src/assets/gameArt.ts").read_text()
    match = PYTHON_RE.search(text)
    if not match:
        raise RuntimeError("Cannot read GAME_ART_RECORDS")
    return json.loads(match.group(1))


def ensure_dirs() -> None:
    for folder in [ICON_DIR, BG_DIR, CHAR_DIR, UI_DIR]:
        folder.mkdir(parents=True, exist_ok=True)


def remove_green(img: Image.Image) -> Image.Image:
    rgba = img.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            # Strong chroma key for the #00ff00 atlas background. This keeps
            # non-background yellows/blues/reds intact and softens green fringe.
            green_score = g - max(r, b)
            if g > 130 and green_score > 55:
                if green_score > 110 and g > 170:
                    pixels[x, y] = (r, g, b, 0)
                else:
                    alpha = max(0, min(255, int((110 - green_score) * 4)))
                    pixels[x, y] = (r, g, b, min(a, alpha))
            elif a > 0 and g > 100 and green_score > 28:
                # Despill edge pixels without making them transparent.
                pixels[x, y] = (r, int((r + b) / 2), b, a)
    return rgba.filter(ImageFilter.UnsharpMask(radius=0.7, percent=80, threshold=3))


def fit_square(img: Image.Image, size: int) -> Image.Image:
    img = ImageOps.contain(img, (size, size), Image.Resampling.LANCZOS)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.alpha_composite(img, ((size - img.width) // 2, (size - img.height) // 2))
    return out


def crop_grid_cell(sheet: Image.Image, index: int, cols: int, rows: int) -> Image.Image:
    col = index % cols
    row = index // cols
    x0 = round(col * sheet.width / cols)
    x1 = round((col + 1) * sheet.width / cols)
    y0 = round(row * sheet.height / rows)
    y1 = round((row + 1) * sheet.height / rows)
    return sheet.crop((x0, y0, x1, y1))


def process_icons(records: list[dict]) -> None:
    for atlas_idx in range(math.ceil(len(records) / 25)):
        source = SRC / "atlases" / f"icons-{atlas_idx + 1:02d}.png"
        if not source.exists():
            raise FileNotFoundError(source)
        sheet = Image.open(source)
        for local_idx, record in enumerate(records[atlas_idx * 25 : (atlas_idx + 1) * 25]):
            cell = crop_grid_cell(sheet, local_idx, 5, 5)
            icon = fit_square(remove_green(cell), 256)
            icon.save(ICON_DIR / record["file"], optimize=True)


def process_backgrounds() -> None:
    names = [
        "stage-1-depot",
        "stage-2-market",
        "stage-3-factory",
        "stage-4-reactor",
        "mission-m-launchpad",
        "mission-m-building",
        "mission-m-bridge",
        "mission-m-gundamfac",
        "mission-m-nuclear",
        "mission-m-station",
        "mission-m-collider",
    ]
    for name in names:
        source = SRC / "backgrounds" / f"{name}.png"
        if not source.exists():
            raise FileNotFoundError(source)
        img = Image.open(source).convert("RGB")
        bg = ImageOps.fit(img, (960, 540), Image.Resampling.LANCZOS, centering=(0.5, 0.52))
        bg.save(BG_DIR / f"{name}.png", optimize=True)


def process_worker_portraits() -> None:
    source = SRC / "characters/worker-sheet.png"
    if not source.exists():
        raise FileNotFoundError(source)
    sheet = Image.open(source)
    names = ["neutral", "angry", "heated", "furious", "demon"]
    for idx, name in enumerate(names):
        cell = crop_grid_cell(sheet, idx, 5, 1)
        portrait = remove_green(cell)
        portrait = ImageOps.contain(portrait, (384, 512), Image.Resampling.LANCZOS)
        out = Image.new("RGBA", (384, 512), (0, 0, 0, 0))
        out.alpha_composite(portrait, ((384 - portrait.width) // 2, 512 - portrait.height))
        out.save(CHAR_DIR / f"worker-{name}.png", optimize=True)


def process_ui() -> None:
    source = SRC / "ui/panel-industrial.png"
    if not source.exists():
        raise FileNotFoundError(source)
    img = Image.open(source).convert("RGB")
    tex = ImageOps.fit(img, (512, 512), Image.Resampling.LANCZOS)
    tex.save(UI_DIR / "panel-industrial.png", optimize=True)


def main() -> None:
    ensure_dirs()
    records = read_records()
    process_icons(records)
    process_backgrounds()
    process_worker_portraits()
    process_ui()
    print(f"Processed {len(records)} AI-generated icon assets plus backgrounds, portraits, and UI texture.")


if __name__ == "__main__":
    main()

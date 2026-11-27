"""Turn the PNGs that tools/shots.js captures into the 1600x1000 WebP product screenshots in site/img/."""
import sys
from pathlib import Path
from PIL import Image

for png in map(Path, sys.argv[1:]):
    out = Path(__file__).resolve().parent.parent / "site" / "img" / (png.stem + ".webp")
    Image.open(png).convert("RGB").resize((1600, 1000), Image.LANCZOS).save(out, "WEBP", quality=82, method=6)
    print(out.name, out.stat().st_size)

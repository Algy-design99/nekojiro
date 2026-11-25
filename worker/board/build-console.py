from pathlib import Path
from shutil import copyfile

root = Path(__file__).resolve().parents[2]
sources = root / "_admin-ui"
target = Path(__file__).with_name("console-assets") / "secured"
target.mkdir(parents=True, exist_ok=True)
for file in ("index.html", "style.css", "admin.js", "research-editor.js"):
    copyfile(sources / file, target / file)
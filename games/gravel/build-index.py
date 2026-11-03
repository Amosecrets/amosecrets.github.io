import json
import pathlib
 
ROOT = pathlib.Path(__file__).resolve().parent
OUTPUT = ROOT / "stories.json"
 
# .txt files that aren't stories
SKIP_FILES = {"robots.txt", "requirements.txt", "license.txt"}
# folders to ignore (hidden folders like .git are skipped too)
SKIP_DIRS = {"node_modules", "_site", "vendor"}
 
 
def read_text(path: pathlib.Path) -> str:
    try:
        return path.read_text(encoding="utf-8-sig")
    except UnicodeDecodeError:
        return path.read_text(encoding="utf-8", errors="replace")
 
 
def main() -> None:
    stories = []
    for path in sorted(ROOT.rglob("*.txt")):
        rel = path.relative_to(ROOT)
        if path.name.lower() in SKIP_FILES:
            continue
        if any(p.startswith(".") or p in SKIP_DIRS for p in rel.parts[:-1]):
            continue
        stories.append({"path": rel.as_posix(), "text": read_text(path)})
 
    OUTPUT.write_text(json.dumps(stories, ensure_ascii=False), encoding="utf-8")
    print(f"Indexed {len(stories)} stor{'y' if len(stories) == 1 else 'ies'} -> {OUTPUT.name}")
 
 
if __name__ == "__main__":
    main()

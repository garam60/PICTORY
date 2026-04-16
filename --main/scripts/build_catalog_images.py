#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
상품 카탈로그 썸네일: Wikimedia Commons 검색 → 다운로드 → 밝은 배경 제거(누끼)
Google 이미지 대신 Commons(자유 라이선스)에서 모델명으로 매칭합니다.
"""
from __future__ import annotations

import json
import os
import shutil
import sys
import urllib.parse
import urllib.request

UA = {"User-Agent": "PicoryCatalogBot/1.0 (local UX prototype; educational)"}

# product_id -> Commons 검색어 (정확한 기기명 위주)
# id -> list of Commons search queries (첫 결과부터 시도)
SEARCHES: dict[str, list[str]] = {
    "fujifilm-x100vi": ["Fujifilm X100VI camera", "Fujifilm X100VI"],
    "canon-eos-r10": ["Canon EOS R10 camera", "Canon EOS R10"],
    "sony-zv-e10-ii": ["Sony ZV-E10 II", "Sony ZV-E10"],
    "ricoh-gr-iiix": ["Ricoh GR IIIx camera", "Ricoh GR IIIx"],
    "sony-a7c-ii": ["Sony A7C II", "Sony Alpha 7C II", "Sony A7C"],
    "nikon-z-fc": ["Nikon Z fc", "Nikon Zfc"],
    "canon-g7x-mark-iii": ["Canon PowerShot G7 X Mark III", "Canon G7 X Mark III"],
    "dji-osmo-pocket-3": ["DJI Osmo Pocket 3", "Osmo Pocket 3"],
    "sony-a6700": ["Sony Alpha 6700", "Sony A6700"],
    "canon-eos-r50": ["Canon EOS R50", "Canon R50"],
    "fujifilm-x-s20": ["Fujifilm X-S20", "Fujifilm XS20"],
    # canon-eos-r50-v: Commons 전용 샷이 거의 없어 스크립트 끝에서 R50 PNG를 복사
}

# Commons에 특수문자 파일명이 있을 때 우선 시도 (ASCII 안전)
MANUAL_FIRST: dict[str, list[str]] = {
    "sony-a6700": [
        "File:Sony ILCE-6700 19 aug 2023a.jpg",
        "File:Sony ILCE-6700 19 aug 2023b.jpg",
        "File:Sony ILCE-6700 19 aug 2023c.jpg",
    ],
}


def filter_titles_for_product(pid: str, titles: list[str]) -> list[str]:
    """검색 결과 중 모델과 맞는 파일명 우선."""
    if pid == "ricoh-gr-iiix":
        hit = [t for t in titles if "IIIx" in t or "GR IIIx" in t.replace("_", " ")]
        return hit if hit else titles
    if pid == "canon-g7x-mark-iii":
        hit = [t for t in titles if "G7 X" in t and "Mark III" in t and "G5" not in t]
        return hit if hit else titles
    if pid == "dji-osmo-pocket-3":
        hit = [t for t in titles if "Osmo Pocket 3" in t and "Drama" not in t]
        return hit if hit else titles
    return titles


def commons_search(q: str, limit: int = 15) -> list[str]:
    """Returns list of File: titles."""
    params = urllib.parse.urlencode(
        {
            "action": "query",
            "list": "search",
            "srsearch": q,
            "format": "json",
            "srnamespace": "6",
            "srlimit": str(limit),
        }
    )
    url = f"https://commons.wikimedia.org/w/api.php?{params}"
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read().decode("utf-8"))
    hits = data.get("query", {}).get("search", [])
    return [h["title"] for h in hits]


def image_url_from_title(file_title: str, width: int = 900) -> str | None:
    """Scaled JPEG/PNG URL from Commons File title."""
    params = urllib.parse.urlencode(
        {
            "action": "query",
            "titles": file_title,
            "prop": "imageinfo",
            "iiprop": "url",
            "iiurlwidth": str(width),
            "format": "json",
        }
    )
    url = f"https://commons.wikimedia.org/w/api.php?{params}"
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read().decode("utf-8"))
    pages = data.get("query", {}).get("pages", {})
    for _pid, page in pages.items():
        info = (page.get("imageinfo") or [{}])[0]
        u = info.get("thumburl") or info.get("url")
        if u:
            return u
    return None


def download(url: str, dest: str) -> None:
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r, open(dest, "wb") as f:
        f.write(r.read())


def remove_light_background_rgba(path: str, threshold: int = 236) -> None:
    from PIL import Image

    img = Image.open(path).convert("RGBA")
    w, h = img.size
    px = img.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r >= threshold and g >= threshold and b >= threshold:
                px[x, y] = (r, g, b, 0)
            elif max(r, g, b) - min(r, g, b) < 18 and (r + g + b) / 3 >= threshold - 8:
                px[x, y] = (r, g, b, 0)
    img.save(path, "PNG")


def main() -> int:
    try:
        from PIL import Image  # noqa: F401
    except ImportError:
        print("Pillow 필요: pip install Pillow", file=sys.stderr)
        return 1

    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out_dir = os.path.join(root, "images", "cameras")
    os.makedirs(out_dir, exist_ok=True)

    for pid, queries in SEARCHES.items():
        dest = os.path.join(out_dir, f"{pid}.png")
        titles = list(MANUAL_FIRST.get(pid, []))
        for q in queries:
            titles.extend(commons_search(q))
        # 중복 제거, 순서 유지
        seen: set[str] = set()
        uniq: list[str] = []
        for t in titles:
            if t not in seen:
                seen.add(t)
                uniq.append(t)
        titles = uniq

        if not titles:
            print(f"[skip] {pid}: no search results", file=sys.stderr)
            continue

        titles = filter_titles_for_product(pid, titles)

        from PIL import Image

        chosen = None
        ok = False
        for t in titles:
            url = image_url_from_title(t, width=960)
            if not url:
                continue
            tmp = dest + ".tmp.bin"
            try:
                download(url, tmp)
                im = Image.open(tmp)
                im = im.convert("RGBA")
                im.save(dest, "PNG")
                os.remove(tmp)
                chosen = t
                ok = True
                break
            except Exception:
                if os.path.isfile(tmp):
                    os.remove(tmp)
                continue

        if not ok:
            print(f"[skip] {pid}: no usable image", file=sys.stderr)
            continue

        try:
            remove_light_background_rgba(dest)
        except Exception as e:
            print(f"[warn] {pid}: bg remove failed ({e})", file=sys.stderr)

        safe = chosen.encode("ascii", "replace").decode("ascii")
        print(f"[ok] {pid} <- {safe}")

    # R50 V는 Commons 전용 사진이 거의 없어 R50과 동일 바디 이미지를 복제
    r50 = os.path.join(out_dir, "canon-eos-r50.png")
    r50v = os.path.join(out_dir, "canon-eos-r50-v.png")
    if os.path.isfile(r50):
        shutil.copy2(r50, r50v)
        print("[ok] canon-eos-r50-v <- copy from canon-eos-r50 (R50/R50 V same line)")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

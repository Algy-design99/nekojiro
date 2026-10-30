#!/usr/bin/env python3
"""Fetch public RSS feeds server-side and publish a small, dated JSON feed."""
import datetime as dt
import email.utils
import json
import pathlib
import urllib.request
import xml.etree.ElementTree as ET
from html import unescape

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "news" / "latest.json"
JST = dt.timezone(dt.timedelta(hours=9))
SOURCES = [
    ("Google ニュース", "https://news.google.com/rss?hl=ja&gl=JP&ceid=JP:ja"),
    ("NHK", "https://www.nhk.or.jp/rss/news/cat0.xml"),
    ("Yahoo!ニュース", "https://news.yahoo.co.jp/rss/topics/top-picks.xml"),
]
NS = {"atom": "http://www.w3.org/2005/Atom"}
def read_text(node, name):
    element = node.find(name)
    return "".join(element.itertext()).strip() if element is not None else ""
def parse_date(raw):
    if not raw:
        return None
    try:
        return email.utils.parsedate_to_datetime(raw).astimezone(dt.timezone.utc)
    except (TypeError, ValueError):
        try:
            return dt.datetime.fromisoformat(raw.replace("Z", "+00:00")).astimezone(dt.timezone.utc)
        except ValueError:
            return None
def fetch(name, url, now):
    request = urllib.request.Request(url, headers={"User-Agent": "NekojiroNewsBot/1.0 (+https://jig0u.fc2.net/)", "Accept": "application/rss+xml, application/xml, text/xml"})
    with urllib.request.urlopen(request, timeout=22) as response:
        payload = response.read(2_000_000)
    root = ET.fromstring(payload)
    nodes = root.findall(".//item") if root.tag != "{http://www.w3.org/2005/Atom}feed" else root.findall("atom:entry", NS)
    articles = []
    for node in nodes:
        title = unescape(read_text(node, "title") or read_text(node, "atom:title"))
        link = read_text(node, "link")
        if not link:
            el = node.find("atom:link", NS)
            link = el.get("href", "") if el is not None else ""
        published = parse_date(read_text(node, "pubDate") or read_text(node, "atom:published") or read_text(node, "atom:updated"))
        if not title or not link.startswith("https://") or published is None:
            continue
        age = (now - published).total_seconds()
        if age < -900 or age > 36 * 3600:
            continue
        articles.append({"title": title, "url": link, "source": name, "published_at": published.isoformat().replace("+00:00", "Z")})
    return articles
def main():
    now = dt.datetime.now(dt.timezone.utc)
    results, errors = [], []
    for name, url in SOURCES:
        try:
            articles = fetch(name, url, now)
            results.extend(articles)
            print(f"{name}: {len(articles)} recent articles")
        except Exception as exc:
            errors.append(f"{name}: {type(exc).__name__}: {exc}")
            print(errors[-1])
    unique, seen = [], set()
    for item in sorted(results, key=lambda x: x["published_at"], reverse=True):
        key = item["title"].strip().casefold()
        if key not in seen:
            unique.append(item)
            seen.add(key)
    if not unique:
        raise RuntimeError("No fresh articles retrieved; preserving last known valid JSON. " + "; ".join(errors))
    output = {"updated_at": now.isoformat().replace("+00:00", "Z"), "max_age_hours": 36, "count": min(len(unique), 30), "items": unique[:30]}
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {output['count']} articles to {OUTPUT}")
if __name__ == "__main__":
    main()

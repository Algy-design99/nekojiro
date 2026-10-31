#!/usr/bin/env python3
"""Signal-specific domestic and international Japanese news feed."""
import datetime as dt
import email.utils
import json
import pathlib
import time
import urllib.request
import xml.etree.ElementTree as ET
from html import unescape

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "news" / "signal.json"
UTC = dt.timezone.utc
SOURCES = [
 ("jp","NHK","https://www.nhk.or.jp/rss/news/cat0.xml"),
 ("jp","Yahoo!ニュース","https://news.yahoo.co.jp/rss/topics/top-picks.xml"),
 ("jp","Google国内","https://news.google.com/rss?hl=ja&gl=JP&ceid=JP:ja"),
 ("world","Google国際","https://news.google.com/rss/headlines/section/topic/WORLD?hl=ja&gl=JP&ceid=JP:ja"),
 ("world","Google海外","https://news.google.com/rss/search?q=%E5%9B%BD%E9%9A%9B%20OR%20%E4%B8%96%E7%95%8C%20OR%20%E6%B5%B7%E5%A4%96%20when%3A1d&hl=ja&gl=JP&ceid=JP:ja"),
]
NS={"a":"http://www.w3.org/2005/Atom"}
def value(node,tag):
    el=node.find(tag,NS)
    return "".join(el.itertext()).strip() if el is not None else ""
def date(s):
    try: return email.utils.parsedate_to_datetime(s).astimezone(UTC)
    except (ValueError,TypeError):
        try:return dt.datetime.fromisoformat(s.replace("Z","+00:00")).astimezone(UTC)
        except (ValueError,TypeError):return None
def fetch(region,name,url,now):
    req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 (compatible; NekojiroSignal/1.0)","Accept":"application/rss+xml,application/xml,text/xml"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req,timeout=18) as r: raw=r.read(2000000)
            break
        except Exception:
            if attempt==2:raise
            time.sleep(attempt+1)
    root=ET.fromstring(raw)
    nodes=root.findall(".//item") if not root.tag.endswith("}feed") else root.findall("a:entry",NS)
    items=[]
    for n in nodes:
        title=unescape(value(n,"title") or value(n,"a:title"))
        link=value(n,"link")
        if not link:
            a=n.find("a:link",NS)
            if a is not None:link=a.get("href","")
        published=date(value(n,"pubDate") or value(n,"a:published") or value(n,"a:updated"))
        if not title or not link.startswith("https://") or published is None:continue
        age=(now-published).total_seconds()
        if age < -900 or age > 36*3600:continue
        items.append({"title":title,"url":link,"source":name,"published_at":published.isoformat().replace("+00:00","Z"),"region":region})
    return items
def main():
    now=dt.datetime.now(UTC)
    regions={"jp":[],"world":[]}
    errors=[]
    for region,name,url in SOURCES:
        try:
            data=fetch(region,name,url,now)
            regions[region].extend(data)
            print(region,name,len(data))
        except Exception as e:
            errors.append(f"{region}/{name}: {type(e).__name__}: {e}")
            print(errors[-1])
    for region in regions:
        seen=set(); unique=[]
        for item in sorted(regions[region],key=lambda x:x["published_at"],reverse=True):
            key=item["title"].strip().casefold()
            if key not in seen:seen.add(key);unique.append(item)
        regions[region]=unique[:40]
    if not any(regions.values()):
        raise RuntimeError("No fresh articles; preserve existing feed. "+"; ".join(errors))
    payload={"updated_at":now.isoformat().replace("+00:00","Z"),"max_age_hours":36,"counts":{k:len(v) for k,v in regions.items()},"items":regions["jp"]+regions["world"],"errors":errors}
    OUT.parent.mkdir(parents=True,exist_ok=True)
    OUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("wrote",OUT,len(payload["items"]))
if __name__=="__main__":main()

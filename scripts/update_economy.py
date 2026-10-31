#!/usr/bin/env python3
import datetime as dt
import email.utils
import json
import pathlib
import time
import urllib.request
import xml.etree.ElementTree as ET
from html import unescape
from urllib.parse import quote

OUT = pathlib.Path(__file__).resolve().parents[1] / "news" / "economy.json"
BASE = "https://news.google.com/rss"
TAIL = "&hl=ja&gl=JP&ceid=JP:ja"
SOURCES = [
 ("経済全般", BASE+"/headlines/section/topic/BUSINESS?hl=ja&gl=JP&ceid=JP:ja"),
 ("日本経済", BASE+"/search?q="+quote("日本 経済 OR 日銀 OR 物価 OR GDP when:1d")+TAIL),
 ("株式市場", BASE+"/search?q="+quote("日経平均 OR TOPIX OR 米国株 OR NYダウ when:1d")+TAIL),
 ("為替・金融", BASE+"/search?q="+quote("ドル円 OR 為替 OR 金利 OR FRB when:1d")+TAIL),
 ("世界経済", BASE+"/search?q="+quote("世界経済 OR 米国経済 OR 中国経済 OR 欧州経済 when:1d")+TAIL),
 ("暗号資産", BASE+"/search?q="+quote("ビットコイン OR 暗号資産 when:1d")+TAIL),
]
NS={"a":"http://www.w3.org/2005/Atom"}
def val(node,tag):
    e=node.find(tag,NS)
    return "".join(e.itertext()).strip() if e is not None else ""
def parsed(s):
    try:return email.utils.parsedate_to_datetime(s).astimezone(dt.timezone.utc)
    except (ValueError,TypeError):
        try:return dt.datetime.fromisoformat(s.replace("Z","+00:00")).astimezone(dt.timezone.utc)
        except (ValueError,TypeError):return None
def collect(name,url,now):
    req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 (compatible; NekojiroEconomy/1.0)","Accept":"application/rss+xml,application/xml,text/xml"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req,timeout=18) as r:raw=r.read(2000000)
            break
        except Exception:
            if attempt==2:raise
            time.sleep(attempt+1)
    root=ET.fromstring(raw)
    nodes=root.findall("a:entry",NS) if root.tag.endswith("}feed") else root.findall(".//item")
    out=[]
    for n in nodes:
        title=unescape(val(n,"title") or val(n,"a:title"))
        link=val(n,"link")
        if not link:
            a=n.find("a:link",NS)
            if a is not None:link=a.get("href","")
        published=parsed(val(n,"pubDate") or val(n,"a:published") or val(n,"a:updated"))
        if not title or not link.startswith("https://") or published is None:continue
        age=(now-published).total_seconds()
        if age < -900 or age > 36*3600:continue
        out.append({"title":title,"url":link,"source":name,"category":name,"published_at":published.isoformat().replace("+00:00","Z")})
    return out
def main():
    now=dt.datetime.now(dt.timezone.utc)
    results=[];errors=[]
    for name,url in SOURCES:
        try:
            items=collect(name,url,now);results.extend(items)
            print(name,len(items))
        except Exception as e:
            errors.append(f"{name}: {type(e).__name__}: {e}")
            print(errors[-1])
    seen=set();unique=[]
    for item in sorted(results,key=lambda x:x["published_at"],reverse=True):
        key=item["title"].strip().casefold()
        if key not in seen:seen.add(key);unique.append(item)
    if not unique:raise RuntimeError("No fresh economy news; existing data preserved. "+"; ".join(errors))
    payload={"updated_at":now.isoformat().replace("+00:00","Z"),"max_age_hours":36,"count":min(len(unique),60),"items":unique[:60],"errors":errors}
    OUT.parent.mkdir(parents=True,exist_ok=True)
    OUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("Saved",payload["count"])
if __name__=="__main__":main()

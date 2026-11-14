from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import quote
import json,gzip,re,html,datetime

ROOT=Path('.')
SITES={'work':'しごとの整理室','living':'間と日々','food':'匙とひと息','travel':'まちの余白','craft':'手のあと'}
VOID={'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}
class Parts(HTMLParser):
 def __init__(self,s):
  super().__init__(convert_charrefs=False);self.s=s;self.lines=[0]+[m.end()for m in re.finditer('\n',s)];self.stack=[];self.nodes=[];self.feed(s)
 def pos(self):a,b=self.getpos();return self.lines[a-1]+b
 def handle_starttag(self,t,a):
  if t not in VOID:self.stack.append((t,dict(a),self.pos(),self.pos()+len(self.get_starttag_text())))
 def handle_startendtag(self,t,a):pass
 def handle_endtag(self,t):
  for i in range(len(self.stack)-1,-1,-1):
   if self.stack[i][0]==t:
    for tag,attrs,start,inner in self.stack[i:]:self.nodes.append({'tag':tag,'attrs':attrs,'start':start,'inner':inner,'endinner':self.pos(),'end':self.pos()+len(t)+3})
    self.stack=self.stack[:i];break
 def find(self,name,value):return min((x for x in self.nodes if value in x['attrs'].get(name,'').split()),key=lambda x:x['start'])
 def inside(self,node):return self.s[node['inner']:node['endinner']]
 def replace(self,node,value):return self.s[:node['inner']]+value+self.s[node['endinner']:]
def save(path,data):
 path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
def plain(s):return html.unescape(re.sub('<[^>]*>','',s))
def bootstrap():
 marker=ROOT/'content/.initialized'
 if marker.exists():return
 catalog=json.loads((ROOT/'board/catalog.json').read_text(encoding='utf-8'))
 save(ROOT/'content/board-categories.json',catalog['categories'])
 for item in json.loads(gzip.decompress((ROOT/'board/threads.json.gz').read_bytes())):
  doc={k:item[k]for k in ['title','body','category','category_name','comments']};doc.update(site='board',id=str(item['id']),status='published',revision=0,createdAt=None,updatedAt=None,legacyDate=next((x.get('date','')for x in catalog['threads']if x['id']==item['id']),''))
  save(ROOT/'content/board'/f'{item["id"]}.json',doc)
 for site in SITES:
  templates=ROOT/'content/templates';templates.mkdir(parents=True,exist_ok=True)
  (templates/(site+'-index.html')).write_text((ROOT/site/'index.html').read_text(encoding='utf-8'),encoding='utf-8')
  (templates/(site+'-article.html')).write_text((ROOT/site/'article-1.html').read_text(encoding='utf-8'),encoding='utf-8')
  for n in range(1,4):
   p=ROOT/site/f'article-{n}.html';s=p.read_text(encoding='utf-8');parts=Parts(s);article=parts.find('class','article');body=parts.find('class','article-body');article_html=parts.inside(article)
   title=plain(re.search(r'<h1[^>]*>([\s\S]*?)</h1>',article_html)[1]);meta=re.search(r'<div class="record-meta">([\s\S]*?)</div>',article_html);category=plain(meta[1]).strip()if meta else ''
   save(ROOT/'content'/site/f'article-{n}.json',{'site':site,'id':f'article-{n}','title':title,'body':parts.inside(body),'category':category,'category_name':category,'status':'published','revision':0,'createdAt':None,'updatedAt':None,'order':n})
 marker.write_text('v1\n',encoding='utf-8')
def docs(site):
 result=[]
 for path in sorted((ROOT/'content'/site).glob('*.json')):
  if path.name=='index.json':continue
  d=json.loads(path.read_text(encoding='utf-8'))
  assert d.get('site')==site and re.fullmatch('[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}',str(d['id'])),path
  if d.get('status')=='published':result.append(d)
 return sorted(result,key=lambda d:(d.get('publishedAt')or d.get('createdAt')or '',-d['order']if 'order'in d else int(d['id'])if str(d['id']).isdigit()else 0),reverse=True)
def summary(d):return {k:v for k,v in d.items()if k not in ['body','comments']}
def render():
 board=docs('board');categories=json.loads((ROOT/'content/board-categories.json').read_text(encoding='utf-8'));counts={}
 for d in board:counts[d['category']]=counts.get(d['category'],0)+1
 for c in categories:c['count']=counts.get(c['id'],0)
 rows=[]
 for d in board:
  rows.append({'id':int(d['id']),'title':d['title'],'category':d['category'],'category_name':d['category_name'],'date':d.get('legacyDate')or (d.get('publishedAt')or '')[5:10].replace('-','/'),'contentPath':f'content/board/{d["id"]}.json','responses':len(re.findall(r'class="[^"\n]*\bres\b',d['body']))})
 save(ROOT/'board/catalog.json',{'categories':categories,'threads':rows})
 save(ROOT/'content/board/index.json',[summary(d)for d in board])
 base='https://algy-design99.github.io/nekojiro/board/'
 items=''.join('<item><title>'+html.escape(d['title'])+'</title><link>'+base+'?thread='+d['id']+'</link><guid>'+base+'?thread='+d['id']+'</guid></item>'for d in board[:50])
 (ROOT/'board/feed.xml').write_text('<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>猫じろう掲示板</title><link>'+base+'</link><description>新着スレッド</description>'+items+'</channel></rss>',encoding='utf-8')

 for site,name in SITES.items():
  articles=docs(site);save(ROOT/'content'/site/'index.json',[summary(d)for d in articles]);template=(ROOT/'content/templates'/(site+'-index.html')).read_text(encoding='utf-8');parts=Parts(template);node=parts.find('class','record-list');cards=[]
  for d in articles:
   title=html.escape(d['title']);category=html.escape(str(d['category']));excerpt=html.escape(plain(d['body'])[:160]);url='./'+d['id']+'.html';cards.append(f'<article class="record-card" data-topic="{category}"><div class="record-meta"><a href="./?tag={quote(str(d["category"]))}#records">{category}</a></div><h2><a href="{url}">{title}</a></h2><p>{excerpt}</p><a class="text-link" href="{url}">読み物をひらく →</a></article>')
   page=(ROOT/'content/templates'/(site+'-article.html')).read_text(encoding='utf-8');pageparts=Parts(page);main=pageparts.find('id','records');body=f'<div class="reading-head"><a href="./#records">← 読み物の一覧へ</a></div><div class="record-list"><article class="article"><div class="record-meta">{category}</div><h1>{title}</h1><div class="article-body">{d["body"]}</div></article></div>';page=pageparts.replace(main,body);page=re.sub(r'<title>[\s\S]*?</title>',lambda m:f'<title>{title}｜{name}</title>',page,count=1);(ROOT/site/(d['id']+'.html')).write_text(page,encoding='utf-8')
  (ROOT/site/'index.html').write_text(parts.replace(node,''.join(cards)),encoding='utf-8')
  live={d['id']+'.html'for d in articles}
  for p in (ROOT/'content'/site).glob('*.json'):
   if p.name=='index.json':continue
   d=json.loads(p.read_text(encoding='utf-8'))
   if d['status']!='published':
    old=ROOT/site/(d['id']+'.html')
    if old.exists():old.unlink()
 save(ROOT/'content/version.json',{'builtAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'boardArticles':len(board),'themeArticles':sum(len(docs(s))for s in SITES)})
if __name__=='__main__':bootstrap();render();print('Published content indexes and static pages rebuilt')

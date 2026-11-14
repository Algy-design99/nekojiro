(function(){
 'use strict';
 if(window.__nekoNewsRecovery)return;window.__nekoNewsRecovery=true;
 var original=window.fetch.bind(window),pending={};
 var root='https://jiromusic-chart-backup.conf-uyy.workers.dev/news/';
 window.fetch=async function(input,options){
  var url;try{url=new URL(typeof input==='string'?input:input.url,location.href);}catch(e){return original(input,options);}
  var match=url.hostname==='raw.githubusercontent.com'&&url.pathname.match(/^\/Algy-design99\/nekojiro\/main\/news\/(latest|signal|economy)\.json$/i);
  if(!match)return original(input,options);
  var response=null;
  try{response=await original(input,options);if(response.ok){var data=await response.clone().json(),stamp=Date.parse(data.updated_at);if(Array.isArray(data.items)&&data.items.length&&Number.isFinite(stamp)&&stamp<=Date.now()+600000&&Date.now()-stamp<=30*60000)return response;}}catch(e){}
  var kind=match[1].toLowerCase();
  try{
   if(!pending[kind])pending[kind]=original(root+kind+'.json',{cache:'no-store',signal:AbortSignal.timeout(9000)}).then(async function(r){if(!r.ok)throw Error('backup HTTP '+r.status);var c=await r.json();if(!Array.isArray(c.items)||!c.items.length||!Number.isFinite(Date.parse(c.updated_at))||Date.parse(c.updated_at)>Date.now()+600000)throw Error('Invalid backup');return c;}).finally(function(){delete pending[kind];});
   var backup=await pending[kind];
   if(!data||Date.parse(backup.updated_at)>Date.parse(data.updated_at)||!Number.isFinite(Date.parse(data.updated_at)))return new Response(JSON.stringify(backup),{status:200,headers:{'Content-Type':'application/json','X-Nekojiro-Feed':'recovery'}});
  }catch(e){}
  if(response)return response;throw Error('ニュース取得に失敗しました');
 };
})();


/* 猫じろう情報局 v1.0：公開RSS/API。ニュースを初期表示。FC2に秘密鍵を置かない。 */
(function(){
'use strict';
var box=document.getElementById('neko-info');if(!box)return;
var moving=document.getElementById('neko-info-moving'),links=document.getElementById('neko-info-links'),tag=document.getElementById('neko-info-tag'),status=document.getElementById('neko-info-status'),source=document.getElementById('neko-info-source');
var active='news',seq=0,cache={},ttl={news:300000,quake:180000,weather:1800000,threads:300000};
var NEWS_STORE='nekojiro-news-last-good-v1';
function savedNews(){
 try{
  var data=JSON.parse(localStorage.getItem(NEWS_STORE)||'null');
  if(!data||!Array.isArray(data.rows)||!data.rows.length)return null;
  var now=Date.now();
  var rows=data.rows.filter(function(r){return r.title&&safeUrl(r.link);});
  return rows.length?{rows:rows,from:'保存済みニュース｜最終取得 '+fmt(data.savedAt),url:'https://news.google.com/home?hl=ja&gl=JP&ceid=JP:ja',saved:true}:null;
 }catch(e){return null;}
}
function keepNews(data){
 try{localStorage.setItem(NEWS_STORE,JSON.stringify({savedAt:data.fetchedAt||data.savedAt||new Date().toISOString(),rows:data.rows}));}catch(e){}
}

var alternateFeeds=['https://www3.nhk.or.jp/rss/news/cat0.xml','https://news.yahoo.co.jp/rss/topics/top-picks.xml'];
function clock(){document.getElementById('neko-info-clock').textContent=new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date())+' JST';}
clock();setInterval(clock,30000);
function safeUrl(v){try{var u=new URL(v,location.href);return /^https?:$/.test(u.protocol)?u.href:null;}catch(e){return null;}}
function req(url,ms){return Promise.race([fetch(url,{cache:'no-store'}).then(function(r){if(!r.ok)throw Error('HTTP '+r.status);return r;}),new Promise(function(_,reject){setTimeout(function(){reject(Error('timeout'));},ms||8000);})]);}
function fmt(t){if(!t)return '';var d=new Date(t);return isNaN(d.getTime())?'':new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(d);}
function parseRSS(s){var x=new DOMParser().parseFromString(s,'application/xml');if(x.querySelector('parsererror'))throw Error('RSS解析不可');return Array.from(x.querySelectorAll('item')).slice(0,8).map(function(n){return {title:(n.querySelector('title')||{}).textContent||'',link:(n.querySelector('link')||{}).textContent||'',date:(n.querySelector('pubDate')||{}).textContent||''};}).filter(function(n){return n.title&&safeUrl(n.link);});}
async function news(){
 // GitHub Actions が生成したJSONだけを読む。RSSへのブラウザ直接接続は行わない。
 var endpoint='https://raw.githubusercontent.com/Algy-design99/nekojiro/main/news/latest.json';
 var response=await req(endpoint+'?t='+Math.floor(Date.now()/300000),10000);
 var data=await response.json();
 if(!data||!Array.isArray(data.items)||!data.updated_at)throw Error('NEWS_BAD_JSON');
 var updated=Date.parse(data.updated_at),now=Date.now();
 if(!Number.isFinite(updated)||updated>now+900000)throw Error('NEWS_BAD_DATE');
 var seen=new Set();
 var rows=data.items.filter(function(item){
  if(!item||!item.title||!safeUrl(item.url))return false;
  var t=Date.parse(item.published_at||'');
  if(!Number.isFinite(t)||t>now+900000||t<now-36*3600000)return false;
  if(seen.has(item.url))return false;
  seen.add(item.url);return true;
 }).sort(function(a,b){return Date.parse(b.published_at)-Date.parse(a.published_at);})
 .slice(0,8).map(function(item){return {title:item.title,link:item.url,date:item.published_at};});
 if(!rows.length)throw Error('NEWS_NO_ITEMS');
 return {rows:rows,from:(now-updated>90*60000?'保存済みニュース':'GitHub自動取得ニュース')+'｜最終取得 '+fmt(data.updated_at),saved:now-updated>90*60000,fetchedAt:data.updated_at,url:'https://news.google.com/home?hl=ja&gl=JP&ceid=JP:ja'};
}
async function quake(){var data=await (await req('https://api.p2pquake.net/v2/history?codes=551&limit=8',8500)).json();var rows=data.map(function(v){var e=v.earthquake||{},h=e.hypocenter||{};var sh=e.maxScale;var scale=sh==null||sh<0?'未確定':sh===45?'5弱':sh===50?'5強':sh===55?'6弱':sh===60?'6強':sh===70?'7':String(sh/10);return {title:'最大震度'+scale+'｜'+(h.name||'震源不明')+(h.magnitude>0?' M'+h.magnitude:'（規模未確定）'),link:'https://www.jma.go.jp/bosai/map.html#contents=earthquake_map',date:e.time||v.time};});if(!rows.length)throw Error('データなし');return {rows:rows,from:'P2P地震情報（気象庁発表情報を再配信）',url:'https://www.p2pquake.net/'};}
async function weather(){/* 気象庁の公開JSON：札幌管区の予報。CORS不可の場合はリンク表示へ切替 */var data=await (await req('https://www.jma.go.jp/bosai/forecast/data/forecast/016000.json',8500)).json();var part=data[0].timeSeries[0],area=part.areas.find(function(x){return x.area&&x.area.name==='石狩地方';})||part.areas[0];var rows=part.timeDefines.slice(0,3).map(function(t,i){return {title:'札幌周辺｜'+(area.weathers&&area.weathers[i]?area.weathers[i].replace(/\s+/g,' ').trim():'予報を見る'),date:t,link:'https://www.jma.go.jp/bosai/forecast/#area_type=offices&area_code=016000'};});return {rows:rows,from:'気象庁・北海道石狩地方の天気予報',url:'https://www.jma.go.jp/bosai/forecast/#area_type=offices&area_code=016000'};}
async function threads(){
 // FC2が出力した最新スレッド一覧を基準にする。2つの表示枠を横断し、日付順に再整列。
 var nodes=Array.from(document.querySelectorAll('.neko-home-recent .thread-row,#neko-more-threads .thread-row'));
 var seen=new Set(),now=new Date();
 var rows=nodes.map(function(node,index){
   var a=node.querySelector(':scope > a[href]');if(!a)return null;
   var title=a.textContent.trim(),link=safeUrl(a.href),dateNode=node.querySelector('.thread-date');
   var stamp=dateNode?dateNode.textContent.match(/(\d{1,2})\s*\/\s*(\d{1,2})/):null;
   var time=0;
   if(stamp){var month=+stamp[1],day=+stamp[2],year=now.getFullYear();time=new Date(year,month-1,day).getTime();if(time>now.getTime()+86400000)time=new Date(year-1,month-1,day).getTime();}
   return {title:title,link:link,date:'',time:time,index:index};
 }).filter(function(r){if(!r||!r.title||!r.link||seen.has(r.link))return false;seen.add(r.link);return true;});
 rows.sort(function(a,b){return b.time-a.time||a.index-b.index;});
 rows=rows.slice(0,12);
 if(!rows.length)throw Error('新着スレッドなし');
 return {rows:rows,from:'猫じろう掲示板・トップの新着一覧',url:'https://jig0u.fc2.net/'};
}
var tickerTimer=null,tickerObserver=null;
function stopTicker(){if(tickerTimer){clearInterval(tickerTimer);tickerTimer=null;}if(tickerObserver){tickerObserver.disconnect();tickerObserver=null;}moving.style.animation='none';box.classList.remove('is-ticker-running');}
function scrollHeadlines(valid){
 moving.replaceChildren();var group=document.createElement('span');group.className='neko-info-marquee-group';
 valid.forEach(function(r){var a=document.createElement('a');a.href=safeUrl(r.link);a.target='_blank';a.rel='noopener noreferrer';a.textContent='◆ '+(fmt(r.date)?'['+fmt(r.date)+'] ':'')+r.title;group.appendChild(a);});
 moving.appendChild(group);var copy=group.cloneNode(true);copy.setAttribute('aria-hidden','true');Array.from(copy.querySelectorAll('a')).forEach(function(a){a.tabIndex=-1});moving.appendChild(copy);
 function measure(){if(!group.isConnected)return;var distance=group.getBoundingClientRect().width;if(!distance)return;moving.style.setProperty('--neko-info-distance',distance+'px');moving.style.setProperty('--neko-info-duration',Math.max(1,distance/82.5)+'s');box.classList.add('is-ticker-running');}
 measure();if(window.ResizeObserver){tickerObserver=new ResizeObserver(measure);tickerObserver.observe(moving.parentElement);}if(document.fonts)document.fonts.ready.then(measure);
 var pause=document.getElementById('neko-info-pause');if(!pause){pause=document.createElement('button');pause.id='neko-info-pause';pause.className='neko-info-pause';pause.type='button';pause.textContent='⏸ 一時停止';pause.setAttribute('aria-pressed','false');pause.onclick=function(){var yes=box.classList.toggle('is-ticker-paused');pause.setAttribute('aria-pressed',String(yes));pause.textContent=yes?'▶ 再開':'⏸ 一時停止';};box.querySelector('.neko-info-tabs').appendChild(pause);}
}
function render(result,kind){
 var valid=result.rows.filter(function(r){return r.title&&safeUrl(r.link);});if(!valid.length)throw Error('表示可能な情報なし');
 stopTicker();tag.textContent={news:'NEWS',quake:'QUAKE',weather:'WEATHER',threads:'BBS'}[kind];
 // 横に切れた長文を延々流す代わりに、1件ずつ切り替え、全件は下のリンク一覧で読めるようにする。
 scrollHeadlines(valid);
 links.replaceChildren();valid.slice(0,8).forEach(function(r){var a=document.createElement('a');a.href=safeUrl(r.link);a.target='_blank';a.rel='noopener noreferrer';a.textContent='› '+r.title;links.appendChild(a);});
 status.textContent=result.from;source.href=result.url;source.textContent='提供元を確認 ↗';
}
function error(kind){stopTicker();var labels={news:'ニュース',quake:'地震情報',weather:'天気予報',threads:'新着スレッド'};tag.textContent='INFO';moving.textContent=kind==='news'?'ニュースを自動取得できませんでした。下のニュース提供元から最新情報をご確認ください。':labels[kind]+'の自動取得ができません。提供元のサイトから最新情報をご確認ください。';moving.style.animation='none';links.replaceChildren();var urls={news:'https://news.google.com/home?hl=ja&gl=JP&ceid=JP:ja',quake:'https://www.jma.go.jp/bosai/map.html#contents=earthquake_map',weather:'https://www.jma.go.jp/bosai/forecast/',threads:'https://jig0u.fc2.net/'};var a=document.createElement('a');a.href=urls[kind];a.target='_blank';a.rel='noopener noreferrer';a.textContent=labels[kind]+'の公式・提供元ページを開く ↗';links.appendChild(a);source.href=urls[kind];source.textContent='提供元を確認 ↗';status.textContent=kind==='news'?'古い記事は速報として表示しません。外部サービスの通信制限や更新遅延が原因の場合があります。':'最新情報を取得できませんでした。提供元のサイトでご確認ください。';}
async function choose(kind){
 var changed=active!==kind;
 active=kind;var token=++seq;
 Array.from(box.querySelectorAll('[data-neko-view]')).forEach(function(b){var yes=b.dataset.nekoView===kind;b.classList.toggle('is-active',yes);b.setAttribute('aria-pressed',yes?'true':'false');});
 var existing=cache[kind]&&cache[kind].data;
 if(kind==='news'&&!existing){existing=savedNews();if(existing)cache.news={at:0,data:existing};}
 if(changed||!moving.textContent.trim()){
  if(existing)render(existing,kind);
  else{
   stopTicker();tag.textContent={news:'NEWS',quake:'QUAKE',weather:'WEATHER',threads:'BBS'}[kind];
   if(kind!=='news'){moving.textContent='情報を取得しています…';status.textContent='情報を確認中…';}
   links.replaceChildren();
  }
 }
 try{
  var c=cache[kind],res=kind!=='threads'&&c&&!c.data.saved&&Date.now()-c.at<ttl[kind]?c.data:await ({news:news,quake:quake,weather:weather,threads:threads}[kind])();
  if(token!==seq)return;
  var prior=cache[kind]&&cache[kind].data;
  if(kind==='news'&&prior&&prior.rows.length&&Date.parse(res.rows[0].date||0)<Date.parse(prior.rows[0].date||0))return;
  if(kind==='news'&&!res.saved)keepNews(res);
  cache[kind]={at:res.saved?0:Date.now(),data:res};
  if(!prior||JSON.stringify(prior.rows)!==JSON.stringify(res.rows)||prior.saved!==res.saved||changed)render(res,kind);else status.textContent=res.from;
 }catch(e){
  if(token!==seq)return;
  var fallback=cache[kind]&&cache[kind].data;
  if(kind==='news'){
   fallback=fallback||savedNews();
   if(fallback){
    if(!cache.news)cache.news={at:0,data:fallback};
    // 通信失敗は表示に反映しない。既存ニュースを維持する。
   }else{
    // 初回かつ取得不能ならニュース欄は空のまま。停止・準備表示は出さない。
   }
  }else if(!fallback){error(kind);}
 }
}

box.querySelectorAll('[data-neko-view]').forEach(function(b){b.addEventListener('click',function(){choose(b.dataset.nekoView);});});
choose('news');setInterval(function(){if(!document.hidden)choose(active);},60000);
})();

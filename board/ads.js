/* 猫じろう広告 V12: 関連広告優先・左右各7件（計14件）最低保証 */
(function(){
'use strict';
var root=document.getElementById('neko-a8');if(!root)return;
var rails=[].slice.call(root.querySelectorAll('.neko-a8-rail'));
var article=document.getElementById('neko-thread');
var content=document.getElementById('neko-original-posts');
var isThread=!!(article&&content)&&new URLSearchParams(location.search).has('thread');
var all=[].slice.call(root.querySelectorAll('.neko-a8-slot'));
var top=all.filter(function(x){return !x.hasAttribute('data-thread-only');});
var extra=all.filter(function(x){return x.hasAttribute('data-thread-only');});
var timer=0,running=false;
function available(x){var end=x.getAttribute('data-end');return (!end||!Number.isFinite(Date.parse(end))||Date.now()<=Date.parse(end))&&!!x.querySelector('.neko-a8-banner-link');}
function loadSelectedAds(x){
 // 選択された枠だけA8バナーと計測画像を読み込む。
 // 元のURL、リンク、計測タグは変更しない。
 x.querySelectorAll('img[data-a8-src]').forEach(function(img){
  img.setAttribute('src',img.getAttribute('data-a8-src'));
  img.removeAttribute('data-a8-src');
 });
}
function setVisible(x,yes){
 x.hidden=!yes;x.style.display=yes?'flex':'none';
 if(yes)loadSelectedAds(x);
}
function actualHeight(x){
 var img=x.querySelector('.neko-a8-banner-link img');
 var rail=x.closest('.neko-a8-rail');
 var w=rail?rail.getBoundingClientRect().width:230;
 var iw=img?(Number(img.getAttribute('width'))||300):300;
 var ih=img?(Number(img.getAttribute('height'))||250):250;
 return Math.ceil(Math.min(iw,Math.max(80,w-12))*ih/iw)+50;
}
function contentLimit(){
 var topY=article.getBoundingClientRect().top+window.scrollY;
 var bottom=Math.max(article.getBoundingClientRect().bottom+window.scrollY,content.getBoundingClientRect().bottom+window.scrollY);
 var posts=content.querySelectorAll('[id^="res"],.res');
 if(posts.length)bottom=Math.max(bottom,posts[posts.length-1].getBoundingClientRect().bottom+window.scrollY);
 return Math.max(0,bottom-topY);
}
function update(){
 if(running)return;running=true;
 try{
  var mobile=matchMedia('(max-width:900px)').matches;
  var limit=isThread?contentLimit():0;
  var used=[35,35],perSide=[0,0],count=0;
  all.forEach(function(x){setVisible(x,false);});
  // スレッド内容に合わせた広告選択。リンクと計測タグは変更しない。
  var subject=isThread ? [
    document.querySelector('.neko-entry-title')?.textContent||'',
    document.querySelector('.thread-toolbar')?.textContent||'',
    (content.textContent||'').slice(0,10000)
  ].join(' ') : '';
  var title=(document.querySelector('.neko-entry-title')?.textContent||'')+' '+(document.querySelector('.thread-toolbar')?.textContent||'');
  var rules=[
    {topic:/黒沼|幻司|怪談|心霊|幽霊|怪異|オカルト|都市伝説|未解決|超常現象/i,ad:/黒沼幻司/i},
    {topic:/株|投資|証券|NISA|為替|FX|金融|経済|相場|CFD/i,ad:/証券|株|FX|CFD|シストレ/i},
    {topic:/PC|パソコン|セキュリティ|ウイルス|ハッカ|VPN|個人情報|不正アクセス|ネット/i,ad:/VPN|Antivirus|セキュリティ|Surfshark|Proton|サーバー|mixhost|お名前/i},
    {topic:/回線|通信|Wi.Fi|光回線|インターネット|プロバイダ|スマホ/i,ad:/光|WiMAX|SIM|回線|BB|nifty|SoftBank|BIGLOBE|GMO/i},
    {topic:/配信|録画|動画|編集|OBS|YouTube|映画|DVD/i,ad:/Bandicam|Bandicut|動画|DVD|ゲオ宅配|Audible/i},
    {topic:/副業|仕事|転職|就職|求人|収入|アンケート/i,ad:/マクロミル|仕事|求人|転職|副業|アイリサーチ|名刺|複合機|プリント革命/i},
    {topic:/ゲーム|アニメ|漫画|キャラクター|グッズ/i,ad:/ゲーム|アニメ|ペンパレ|ゲオ宅配/i},
    {topic:/旅行|観光|ホテル|宿泊|出張|海外|航空券|グランピング|スキー/i,ad:/旅行|ホテル|宿泊|eSIM|Travelist|QEEQ|グランピング|スキー|クルーズ|Oooh|TORA|Simmy|Voye/i},
    {topic:/スポーツ|野球|サッカー|ゴルフ|登山|ダーツ|運動/i,ad:/スポーツデポ|ゼビオ|ゴルフ５|アルペン|ダーツ/i},
    {topic:/競馬|競走馬|馬券/i,ad:/競馬最強/i},
    {topic:/パチスロ|スロット|パチンコ/i,ad:/パチスロわっしょい/i},
    {topic:/料理|食事|食品|調味料|出前|宅配|グルメ/i,ad:/マルトモ|おちゃのこさいさい|白だし|デリズ/i},
    {topic:/服|ファッション|洋服|帽子|白衣|作務衣/i,ad:/TETE HOMME|ビッグエムワン|BITTER|時谷堂|クラシコ|作務衣/i},
    {topic:/防犯|監視カメラ|窃盗|空き巣/i,ad:/防犯カメラ|EMEAO/i},
    {topic:/読書|本|新聞|教育|学習/i,ad:/Audible|読売|新聞/i},
    {topic:/健康|腰痛|肩こり|睡眠|枕|整体/i,ad:/枕|腰ベルト|Cure:Re|メディテクト/i},
    {topic:/占い|運勢|悩み|相談/i,ad:/ココナラ占い|お悩み相談/i},
    {topic:/新聞|子供|学校|教育|勉強/i,ad:/読売|KODOMO|Audible/i},
    {topic:/ラーメン|麺|つけ麺|料理|食事|グルメ/i,ad:/宅麺|デリズ|マルトモ|おちゃのこさいさい|白だし/i},
    {topic:/車|ドライブ|レンタカー/i,ad:/QEEQ/i},
    {topic:/ギフト|贈り物|出産祝い|誕生日/i,ad:/ベルビーベベ|似顔絵/i},
    {topic:/懸賞|プレゼント|ポイント|アンケート/i,ad:/懸賞にゃんダフル|アイリサーチ|マクロミル/i}
  ];
  function score(x){
    var label=x.getAttribute('data-label')||'';
    var n=0;
    rules.forEach(function(r){
      if(r.topic.test(title)&&r.ad.test(label))n+=100;
      else if(r.topic.test(subject)&&r.ad.test(label))n+=15;
    });
    if(x.dataset.network){
      var patterns={economy:/経済|株|投資|証券|金融|為替|相場|NISA|FX/,signal:/ニュース|事件|社会|政治|世界|災害|速報|報道/,music:/音楽|曲|歌|ラジオ|映画|テレビ|ライブ|バンド|録音|配信/,research:/漫画|アニメ|特撮|キャラ|作品|考察|ゲーム/};
      var re=patterns[x.dataset.network];
      n=(re.test(title)?180:0)+(re.test(subject)?25:0);
    }
    if(/光|WiMAX|回線|SIM/i.test(label)&&!/通信|ネット|回線|スマホ|Wi.Fi|光/i.test(subject))n-=10;
    // 地域限定の広告を、無関係な地域のスレッドに優先表示しない。
    if(/九州|中国地方|四国/i.test(label)&&!/九州|中国地方|四国|福岡|広島|岡山|山口|島根|鳥取|香川|愛媛|高知|徳島/i.test(subject))n-=100;
    return n;
  }
  var candidates=(isThread?top.concat(extra):top).filter(available);
  // トップでは4つの系列サイトを必ず表示し、残りは従来の広告から選ぶ。
  if(!isThread){candidates.sort(function(a,b){return Number(!!b.dataset.network)-Number(!!a.dataset.network);});}
  if(isThread){
    candidates=candidates.map(function(x,i){return {x:x,i:i,s:score(x)};})
      .sort(function(a,b){return b.s-a.s||a.i-b.i;})
      .map(function(z){return z.x;});
    var relevant=candidates.filter(function(x){return score(x)>0;});
    // 関連広告を先頭に保ち、不足分は候補全体から補充する。
  }
  // V10: PCでは広告の所属側を固定せず、左右の累積高さで振り分ける。
  // 関連性の高い広告から採用。左右各7件は本文の高さに関係なく確保。
  // モバイルは既存の表示順・最大件数を維持する。
  var selected=[];
  var minimum=isThread?(mobile?14:14):0;
  var cap=isThread?(mobile?14:Math.max(14,Math.min(40,Math.floor(Math.max(0,limit-35)/180)*2))):8;
  candidates.forEach(function(x){
    if(selected.length>=Math.max(cap,minimum))return;
    if(!available(x))return;
    selected.push(x);
  });
  if(!mobile){
    // 左右の数を揃え、画像の縦横比も考慮して合計高さを均等化する。
    // 広告本体（A8リンク・画像・計測タグ）は一切書き換えない。
    var heights=[35,35],counts=[0,0];
    var balanced=[];
    selected.forEach(function(x){
      var h=actualHeight(x)+9;
      var order=heights[0]<=heights[1]?[0,1]:[1,0];
      if(counts[0]!==counts[1])order=counts[0]<counts[1]?[0,1]:[1,0];
      var side=order.find(function(k){return !isThread||counts[k]<7||heights[k]+h<=limit-12;});
      if(side===undefined)return;
      balanced.push({x:x,side:side,h:h});
      heights[side]+=h;counts[side]++;
    });
    // 片側だけ長くならないよう、最後の片側余剰を取り除く（最低各7件は維持）。
    var paired=Math.min(counts[0],counts[1]);
    balanced=balanced.filter(function(z,i){
      var n=balanced.slice(0,i+1).filter(function(v){return v.side===z.side;}).length;
      return n<=paired;
    });
    balanced.forEach(function(z){rails[z.side].appendChild(z.x);setVisible(z.x,true);count++;});
  }else{
    selected.forEach(function(x){setVisible(x,true);count++;});
  }
  rails.forEach(function(r){r.hidden=!r.querySelector('.neko-a8-slot:not([hidden])');});
  root.hidden=count===0;
   // 広告レールは上端に固定。中央寄せで生じていた上部の空白をなくす。
   // スマートフォンでは従来のフロー配置を維持する。
   rails.forEach(function(r){r.style.top='';});
 }finally{running=false;}
}
function schedule(){clearTimeout(timer);timer=setTimeout(update,120);}
window.addEventListener('load',schedule);window.addEventListener('resize',schedule);
if(isThread){
 if(window.ResizeObserver){var ro=new ResizeObserver(schedule);ro.observe(content);}
 content.querySelectorAll('img').forEach(function(i){i.addEventListener('load',schedule);i.addEventListener('error',schedule);});
}
update();
})();
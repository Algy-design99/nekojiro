(function setupBoardFolders(){
 const NEKO_BOARD_CATALOG={"生活":["生活全般板","生活サロン板","家庭板","一人暮らし板","掃除全般板","育児板","既婚女性板","既婚男性板","冠婚葬祭板","通販・買い物板","家具板","DIY板","お風呂・銭湯板","美容板","化粧板","ファッション板","身体・健康板","ダイエット板","料理板"],"雑談・ネタ":["ほのぼの板","夢・独り言板","なんでもあり板","独身男性板","独身女性限定板","モテない男性板","モテない女性板","孤独な男性板","カップル板","恋愛サロン板","純情恋愛板","失恋板","人生相談板","お笑い小咄板","電波・お花畑板","バカニュース板","ガイドライン板","AAサロン板","顔文字板","モナー板","ラウンジ板","ニュー速VIP板","天国板","シベリア超速報板"],"文化・学問":["オカルト板","民俗・神話学板","哲学板","心理学板","文学板","詩・ポエム板","歴史板","日本史板","世界史板","考古学板","言語学板","地理・人類学板","社会学板","数学板","物理板","化学板","生物板","天文・気象板","教育学板","芸術デザイン板","美術鑑賞板"],"学校・仕事":["大学生活板","大学受験板","学歴板","専門学校板","教育・先生板","アルバイト板","就職板","転職板","公務員板","リーマン板","派遣業界板","資格全般板","経営学板","税金経理会計板","店舗運営板"],"PC・ネット":["自作PC板","パソコン一般板","PC初心者板","ノートPC板","ハードウェア板","ソフトウェア板","Windows板","Linux板","Mac板","プログラマー板","プログラム板","Web制作板","ネットワーク板","セキュリティ板","インターネット板","プロバイダー板","携帯・PHS板","携帯機種板","携帯コンテンツ板","ブログ板","ネットサービス板"],"ゲーム":["家庭用ゲーム板","家ゲーRPG板","ゲームサロン板","ゲーム速報板","レトロゲーム板","レトロ32bit以上板","ゲーム音楽板","ゲーム業界、ハードウェア板","携帯ゲーソフト板","携帯ゲーRPG板","アーケード板","格闘ゲーム板","シューティング板","音ゲー板","ネトゲ実況板","ネトゲ質問板","大規模MMO板","小規模MMO板","PCゲーム板","同人ゲーム板","将棋・チェス板","囲碁・オセロ板","クイズ雑学板"],"漫画・アニメ・特撮":["漫画板","漫画サロン板","懐かし漫画板","少年漫画板","週刊少年漫画板","少女漫画板","アニメ板","アニメ２板","アニメサロン板","懐かしアニメ昭和板","懐かしアニメ平成板","声優総合板","声優個人板","特撮！板","同人板","ライトノベル板","SF・FT・ホラー板"],"音楽・映画・テレビ":["音楽一般板","邦楽板","邦楽サロン板","邦楽男性ソロ板","邦楽女性ソロ板","邦楽グループ板","洋楽板","クラシック板","ジャズ板","HR・HM板","パンク板","インディーズ板","楽器・作曲板","カラオケ板","映画一般・8mm板","映画作品・人板","懐かし邦画板","懐かし洋画板","テレビ番組板","懐かしテレビ板","テレビドラマ板","懐かしドラマ板","お笑い芸人板","芸能板","ラジオ番組板"],"趣味・旅行・乗り物":["趣味一般板","写真撮影板","カメラ板","デジカメ板","文房具板","時計・小物板","模型・プラモ板","鉄道総合板","鉄道路線・車両板","バス・バス路線板","車板","車種・メーカー板","バイク板","自転車板","航空・船舶板","国内旅行板","海外旅行板","登山キャンプ板","釣り板","園芸板","ペット大好き板","犬猫大好き板","アクアリウム板"],"食文化":["食べ物板","料理板","レシピ板","グルメ外食板","Ｂ級グルメ板","ラーメン板","そば・うどん板","カレー板","お菓子板","パン板","お茶・珈琲板","ソフトドリンク板","酒・Bar板","居酒屋板"],"スポーツ":["スポーツサロン板","プロ野球板","野球総合板","高校野球板","国内サッカー板","海外サッカー板","日本代表蹴球板","バスケット板","テニス板","卓球板","陸上競技板","水泳板","相撲板","プロレス板","格闘技板","ボクシング板","武道・武芸板","スキースノボ板","ゴルフ板","オリンピック板"],"ニュース・社会":["ニュース速報板","ニュース速報+板","芸スポ速報+板","ビジネスnews+板","科学ニュース+板","ニュース議論板","懐かしニュース板","交通情報板","社会・世評板","政治板","経済板","株式板","市況1板","市況2板","金融板","法律勉強相談板","警察板","消防救急防災板","環境・電力板","地方自治知事板"],"地域":["北海道板","東北板","東京板","多摩板","神奈川板","関東板","北陸・甲信越板","東海板","近畿板","大阪板","中国板","四国板","九州板","沖縄板"]};
 var exactGroup=new Map();
 Object.entries(NEKO_BOARD_CATALOG).forEach(function(pair){pair[1].forEach(function(name){if(!exactGroup.has(name))exactGroup.set(name,pair[0]);});});
 // V6.9: 旧FC2カテゴリ名・略称を既存13分類に固定対応させる。
 // 名前が未知の場合は推測せず未分類へ残す。
 const NEKO_LEGACY_ALIASES={
  '科学・技術':'文化・学問','経済':'ニュース・社会','IT・ネット':'PC・ネット',
  'スポーツ':'スポーツ','政治':'ニュース・社会','社会':'ニュース・社会',
  'ゲーム':'ゲーム','災害':'ニュース・社会','地域':'地域',
  '事件':'ニュース・社会','掲示板史':'文化・学問','雑談':'雑談・ネタ',
  'オカルト':'文化・学問','生活':'生活','運営・隔離':'雑談・ネタ',
  'ニュース速報':'ニュース・社会'
 };
 function normalize(s){return (s||'').normalize('NFKC').replace(/[\s\u3000]+/g,'').trim();}
 const normalizedGroup=new Map();
 exactGroup.forEach(function(group,name){normalizedGroup.set(normalize(name),group);});
 Object.entries(NEKO_LEGACY_ALIASES).forEach(function(pair){normalizedGroup.set(normalize(pair[0]),pair[1]);});
 function build(dir){
  if(dir.dataset.nekoFoldersReady)return;
  var original=dir.querySelector('.thread-list');if(!original)return;
  var rows=Array.from(original.querySelectorAll(':scope > .thread-row'));
  if(!rows.length)return;
  dir.dataset.nekoFoldersReady='1';
  var tools=document.createElement('div');tools.className='neko-board-tools';
  var search=document.createElement('input');search.type='search';search.placeholder='板名を検索';search.setAttribute('aria-label','板名を検索');
  var openAll=document.createElement('button');openAll.type='button';openAll.textContent='すべて開く';
  var closeAll=document.createElement('button');closeAll.type='button';closeAll.textContent='すべて閉じる';
  tools.append(search,openAll,closeAll);original.before(tools);
  var buckets=Object.keys(NEKO_BOARD_CATALOG).map(function(name){return {name:name,rows:[]};});
  buckets.push({name:'未分類（新規・名称不一致）',rows:[]});
  rows.forEach(function(row){
   var a=row.querySelector('a');var name=normalize(a&&a.textContent);
   var group=normalizedGroup.get(name);
   var bucket=buckets.find(function(b){return b.name===group;})||buckets[buckets.length-1];
   bucket.rows.push(row);
  });
  original.classList.add('neko-folder-list');
  buckets.filter(b=>b.rows.length).forEach(b=>{
   var details=document.createElement('details');details.className='neko-board-folder';
   var summary=document.createElement('summary');summary.textContent=b.name+' （'+b.rows.length+'板）';
   var body=document.createElement('div');body.className='neko-board-folder-body';
   b.rows.forEach(row=>body.appendChild(row));details.append(summary,body);original.appendChild(details);
  });
  var folders=Array.from(original.querySelectorAll('.neko-board-folder'));
  openAll.addEventListener('click',()=>folders.forEach(d=>d.open=true));
  closeAll.addEventListener('click',()=>{search.value='';folders.forEach(d=>{d.open=false;d.hidden=false;d.querySelectorAll('.thread-row').forEach(r=>r.hidden=false);});});
  search.addEventListener('input',()=>{
   var q=normalize(search.value).toLowerCase();
   folders.forEach(d=>{
    var groupHit=normalize(d.querySelector('summary').textContent).toLowerCase().includes(q);
    var visible=0;
    d.querySelectorAll('.thread-row').forEach(r=>{
     var hit=!q||groupHit||normalize(r.querySelector('a')?.textContent).toLowerCase().includes(q);
     r.hidden=!hit;if(hit)visible++;
    });
    d.hidden=!!q&&!visible;
    if(q&&visible)d.open=true;
   });
  });
 }
 document.querySelectorAll('.board-directory').forEach(build);
})();
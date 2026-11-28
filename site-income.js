(function () {
 'use strict';
 const source = document.currentScript;
 if (!source) return;
 const base = new URL('.', source.src);
 const site = source.dataset.site;
 const analyticsOnly = source.hasAttribute('data-analytics-only');
 const id = 'G-JJ59JV8FLB';
 const fc2 = /\.fc2\.(net|com)$/.test(location.hostname);
 const parameters = new URLSearchParams(location.search);
 const ref = parameters.get('ref');
 const boardSource = ['fc2-board','github-board'].includes(ref) ? ref : '';
 const origin = boardSource || (fc2 ? 'fc2-' + site : 'github-' + site);
 const hasSiteLinks = !analyticsOnly || ['dougubako','rekishiita'].includes(site);
 const route = parameters.get('via');
 const medium = parameters.get('utm_medium');
 const sourceName = parameters.get('utm_source');
 const campaign = parameters.get('utm_campaign');
 const social = medium === 'social' && sourceName === 'x' && ['profile','article','guide'].includes(campaign);
 const via = ['board-home','board-thread','buying-guide'].includes(route) ? route : '';
 const boardPage = (url) => {
  const fc2Thread = /\.fc2\.(net|com)$/.test(url.hostname) &&
    url.pathname.match(/^\/blog-entry-(\d+)\.html$/);
  const githubBoard = url.origin === base.origin && url.pathname === new URL('board/', base).pathname;
  const thread = githubBoard ? url.searchParams.get('thread') : '';
  const board = githubBoard ? url.searchParams.get('board') : '';
  const suffix = /^\d+$/.test(thread || '') ? '?thread=' + thread :
    /^\d+$/.test(board || '') ? '?board=' + board :
    githubBoard && url.searchParams.get('archive') === '1' ? '?archive=1' : '';
  return {
   url: url.origin + url.pathname + suffix,
   threadId: fc2Thread ? fc2Thread[1] : suffix.startsWith('?thread=') ? thread : ''
  };
 };
 const currentPage = boardPage(new URL(location.href));
 if (navigator.globalPrivacyControl !== true && navigator.doNotTrack !== '1') {
  window.dataLayer = window.dataLayer || [];
  const tag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag = tag;
  tag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
  tag('js',new Date());
  let pageReferrer = '';
  try { if (document.referrer) pageReferrer = new URL(document.referrer).origin; } catch {}
  tag('config',id,{send_page_view:analyticsOnly,allow_google_signals:false,allow_ad_personalization_signals:false,
   ...(analyticsOnly ? {content_group:site,page_location:currentPage.url,page_referrer:pageReferrer} : {}),
   ...(social ? {campaign_source:sourceName,campaign_medium:medium,campaign_name:campaign} : {})});
  const context = {site_section:site,entry_source:social ? 'x-'+campaign : origin,entry_route:via,page_location:currentPage.url,page_referrer:pageReferrer,
   ...(site === 'board' && currentPage.threadId ? {source_thread_id:currentPage.threadId} : {})};
  const pendingClickKey = 'nekojiro-pending-thread-click';
  try {
   const saved = JSON.parse(sessionStorage.getItem(pendingClickKey));
   sessionStorage.removeItem(pendingClickKey);
   if (saved?.event?.link_url === currentPage.url && Date.now() - saved.at < 30000) {
    tag('event','thread_link_click',saved.event);
   }
  } catch {}
  if (!analyticsOnly) tag('event','page_view',context);
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
  document.head.append(script);
  if (site === 'board' && currentPage.threadId && 'IntersectionObserver' in window) {
   const body = document.getElementById('neko-original-posts');
   const comments = document.getElementById('neko-comments');
   const seen = new Set();
   let lastReply;
   const record = (event) => {
    if (seen.has(event)) return;
    seen.add(event);
    tag('event',event,context);
   };
   const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
     if (!entry.isIntersecting) continue;
     if (entry.target === lastReply) record('thread_last_reply_reached');
     if (entry.target === comments) record('thread_comments_reached');
     observer.unobserve(entry.target);
    }
   });
   const observeLastReply = () => {
    if (!body || seen.has('thread_last_reply_reached')) return;
    const replies = body.querySelectorAll('.res,[id^="res"]');
    const next = replies[replies.length - 1];
    if (!next || next === lastReply) return;
    if (lastReply) observer.unobserve(lastReply);
    lastReply = next;
    observer.observe(lastReply);
   };
   if (body) {
    observeLastReply();
    if (!lastReply) {
     const updates = new MutationObserver(() => {
      observeLastReply();
      if (lastReply) updates.disconnect();
     });
     updates.observe(body,{childList:true,subtree:true});
    }
   }
   if (comments) {
    observer.observe(comments);
    comments.addEventListener('focusin',event => {
     if (event.target.matches('textarea')) record('thread_comment_input_start');
    });
   }
  }
  if (!hasSiteLinks) return;
  document.addEventListener('click',event => {
   const a = event.target.closest?.('a[href]');
   if (!a) return;
   const target = new URL(a.href, location.href);
   if (currentPage.threadId && site === 'board' && /^https?:$/.test(target.protocol)) {
    const destination = boardPage(target);
    if (destination.url !== currentPage.url) {
     const clickData = {
      ...context,
      link_url:destination.url,link_domain:target.hostname,
      outbound:target.origin !== location.origin
     };
     const nextPageUsesTag = target.origin === location.origin &&
       (fc2 || target.pathname === new URL('board/', base).pathname);
     const ordinaryClick = !event.defaultPrevented && event.button === 0 &&
       !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey &&
       (!a.target || a.target === '_self') && !a.hasAttribute('download');
     let sendFromNextPage = false;
     if (nextPageUsesTag && ordinaryClick) {
      try {
       sessionStorage.setItem(pendingClickKey,JSON.stringify({at:Date.now(),event:clickData}));
       sendFromNextPage = true;
      } catch {}
     }
     if (!sendFromNextPage) tag('event','thread_link_click',clickData);
    }
   }
   const host = a.hostname.toLowerCase();
   const partner = /(^|\.)amazon\.co\.jp$|^(?:amzn\.to|link\.amazon)$/.test(host) ? 'amazon'
      : /(^|\.)a8\.net$/.test(host) ? 'a8' : host === 'coconala.com' ? 'coconala' : '';
   if (partner) tag('event','affiliate_click',{...context,partner});
   else if (a.closest('[data-neko-route],.board-guides') || a.classList.contains('cta') && site==='buying-guide') {
    tag('event','guide_click',{...context,destination:a.pathname});
   }
  });
 }
 if (!hasSiteLinks) return;
 if (site === 'buying-guide' && boardSource) {
  for (const link of document.querySelectorAll('.cta[href]')) {
   const target = new URL(link.href);
   if (target.origin !== location.origin || !target.pathname.startsWith(new URL('research/',base).pathname)) continue;
   target.searchParams.set('ref',boardSource);
   target.searchParams.set('via','buying-guide');
   link.href = target.href;
  }
 }
 const routes = {
  article:[['買う前の比較ガイド','research/buying-guide.html'],['調査記事の制作相談','portfolio/#writing']],
  rekishiita:[['定期預金6.08％の背景を調査室で読む','research/archives/14981596.html'],['調査記事・記事制作のご相談','portfolio/#writing']],
  music:[['配信・録画機材の選び方','research/buying-guide.html#capture'],['音楽サイトの制作事例','portfolio/case-studies.html#music']],
  portfolio:[['制作の依頼・相談','https://coconala.com/services/4528114'],['猫じろう調査室の比較ガイド','research/buying-guide.html']],
  research:[['用途から探す・買う前の比較ガイド','research/buying-guide.html']],
  work:[['制作事例を見る','portfolio/'],['制作の依頼・相談','https://coconala.com/services/4528114']],
  food:[['手作り豆腐の仕組みと道具','research/archives/managed-1795609330614.html'],['お茶の歴史を読む','research/archives/15930697.html']],
  living:[['通販の価格と販売店を比較する','research/buying-guide.html#shopping']],
  travel:[['旅行・地域の記事を探す','research/'],['地域の記事制作のご相談','portfolio/#writing']],
  craft:[['制作事例を見る','portfolio/'],['道具を買う前の比較ガイド','research/buying-guide.html']],
  dougubako:[['配信・録画機材の選び方','research/buying-guide.html#capture'],['制作の依頼・相談','https://coconala.com/services/4528114']],
  kuronuma:[['黒沼幻司の関連スレッドを探す','board/?q=黒沼幻司'],['創作サイトの制作実績・ご相談','portfolio/']],
  home:[['用途から探す・買う前の比較ガイド','research/buying-guide.html'],['制作実績と依頼窓口','portfolio/']],
  sites:[['買う前の比較ガイド','research/buying-guide.html'],['制作実績と依頼窓口','portfolio/']],
  news:[['猫じろう情報局を見る','signal/'],['ニュースサイトの制作事例','portfolio/case-studies.html#signal']]
 };
 if (!routes[site] || document.querySelector('[data-neko-route]')) return;
 const section = document.createElement('nav');
 section.dataset.nekoRoute = '';
 section.setAttribute('aria-label','関連記事と制作実績');
 const heading = document.createElement('h2');
 heading.textContent = '関連記事・制作実績';
 const list = document.createElement('ul');
 for (const [label,path] of routes[site]) {
  const url = new URL(path,base);
  if (boardSource && path === 'research/buying-guide.html') {
   url.searchParams.set('ref',boardSource);
   if (via) url.searchParams.set('via',via);
  }
  const a = document.createElement('a');
  const item = document.createElement('li');
  a.href = url.href;
  a.textContent = label;
  if (url.hostname === 'coconala.com') a.textContent += '（外部サービス）';
  item.append(a);
  list.append(item);
 }
 const disclosure = document.createElement('small');
 disclosure.textContent = 'リンク先の記事やサービスには広告・アフィリエイトリンクを含む場合があります。';
 section.append(heading,list,disclosure);
 section.style.cssText='box-sizing:border-box;max-width:1000px;margin:24px auto;padding:14px 18px;border:1px solid #aabbb7;border-radius:8px;background:#f4f8f6;color:#203b32;font:15px/1.6 system-ui,sans-serif';
 heading.style.cssText='font-size:17px;margin:0 0 6px;color:inherit';
 list.style.cssText='padding-left:1.3em;margin:0 0 6px';
 section.querySelectorAll('a').forEach(a=>a.style.color='#164d67');
 if (site === 'portfolio' && document.getElementById('works')) {
  const works = document.getElementById('works');
  const scope = document.getElementById('scope');
  const approach = document.getElementById('approach');
  const profile = document.getElementById('profile');
  const hero = document.querySelector('main .hero');
  if (hero && scope && works) {
   hero.after(scope,works);
   const previewData = [
    {key:'market', id:'economy', label:'株価', name:'TSUKASA MARKET DESK', question:'値動きとニュースを一度に見る', text:'価格、チャート、ヒートマップを同じ画面に。気になる動きがあれば、その場でニュースを開けます。'},
    {key:'news', id:'signal', label:'ニュース', name:'TSUKASA SIGNAL', question:'ニュース・天気・地震を行き来する', text:'国内外のニュース、天気、地震を分けて配置。位置の分かる情報は地図からも見られます。'},
    {key:'music', id:'music', label:'音楽', name:'TSUKASA MUSIC', question:'ランキングから次の一曲を探す', text:'聴かれている曲を一覧で見渡し、気になった曲から視聴先へ進めます。'}
   ];
   const panel = hero.querySelector('.intro-panel');
   const items = previewData.map(project => ({
    ...project, image: document.querySelector('#work-'+project.key+' .project-shot img')
   })).filter(project => project.image);
   if (panel && items.length) {
    hero.classList.add('portfolio-preview-hero');
    const styles = document.createElement('style');
    styles.textContent = [
     '.portfolio-preview-hero{gap:clamp(20px,4vw,55px)!important;padding:clamp(24px,5vw,62px) 0 30px!important;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr)!important}',
     '.portfolio-preview-hero h1{line-height:1.22!important;margin-bottom:12px!important}',
     '.portfolio-preview-hero .hero-link{margin-top:16px!important}',
     '.portfolio-preview{min-width:0;border-radius:18px;background:#142a26;color:#f4f8f6;padding:14px;box-shadow:0 14px 32px rgba(20,42,38,.18)}',
     '.portfolio-preview h2{font-size:15px;margin:0 0 10px;color:#fff}',
     '.portfolio-preview-buttons{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:10px}',
     '.portfolio-preview button{min-height:40px;padding:5px 12px;border:1px solid #78978d;border-radius:7px;background:transparent;color:#fff;font:inherit;cursor:pointer}',
     '.portfolio-preview button[aria-pressed=true]{background:#def0df;color:#16342b;font-weight:700}',
     '.portfolio-preview a:focus-visible,.portfolio-preview button:focus-visible{outline:2px solid #ffc861;outline-offset:2px}',
     '.portfolio-preview figure{margin:0;background:#0d1c19;border-radius:9px;overflow:hidden}',
     '.portfolio-preview img{display:block;width:100%;aspect-ratio:16/8;object-fit:cover;object-position:top}',
     '.portfolio-preview h3{font-size:18px;margin:10px 0 4px;color:#fff}',
     '.portfolio-preview p{font-size:13px;margin:0 0 10px;color:#e2eee8}',
     '.portfolio-preview-links{display:flex;gap:7px;flex-wrap:wrap}',
     '.portfolio-preview-links a{display:inline-flex;align-items:center;min-height:41px;padding:4px 10px;border-radius:6px;background:#ecf5ef;color:#18332a;font-weight:700;text-decoration:none}',
     '.portfolio-preview-links a:hover{text-decoration:underline}',
     '@media(max-width:740px){.portfolio-preview-hero{grid-template-columns:minmax(0,1fr)!important}.portfolio-preview img{aspect-ratio:16/9}}'
    ].join('');
    document.head.append(styles);
    hero.querySelector('#hero-title').textContent='作ったサイトを、触って見る。';
    hero.querySelector('.hero-lead').textContent='ニュースを追う、相場を見る、次の一曲を探す。実際に使える画面から、作れるものを確かめてください。';
    panel.className='portfolio-preview';
    panel.dataset.nekoRoute='';
    panel.setAttribute('aria-label','サイトのプレビュー');
    const title=document.createElement('h2');
    title.textContent='見たい画面を選ぶ';
    const buttons=document.createElement('div');
    buttons.className='portfolio-preview-buttons';
    const figure=document.createElement('figure');
    const image=document.createElement('img');
    figure.append(image);
    const caption=document.createElement('div');
    caption.setAttribute('aria-live','polite');
    const name=document.createElement('h3');
    const description=document.createElement('p');
    caption.append(name,description);
    const links=document.createElement('div');
    links.className='portfolio-preview-links';
    const open=document.createElement('a');
    open.textContent='公開サイトを開く';
    const details=document.createElement('a');
    details.textContent='制作事例を読む';
    links.append(open,details);
    panel.replaceChildren(title,buttons,figure,caption,links);
    function select(item) {
     for(const b of buttons.children)b.setAttribute('aria-pressed',String(b.value===item.id));
     image.src=item.image.getAttribute('src');
     image.alt=item.name+'の公開画面';
     name.textContent=item.question;
     description.textContent=item.text;
     open.href=new URL(item.id+'/',base).href;
     details.href=new URL('portfolio/case-studies.html#'+item.id,base).href;
    }
    for(const item of items){
     const button=document.createElement('button');
     button.type='button';
     button.value=item.id;
     button.textContent=item.label;
     button.addEventListener('click',()=>select(item));
     buttons.append(button);
    }
    select(items[0]);
   }

   if (approach && profile) profile.before(approach);
   document.querySelectorAll('main .section-head h2 > span, main .scope-no, main .hero .eyebrow').forEach(item=>item.hidden=true);
   const menu=document.querySelector('nav[aria-label="ページ内メニュー"]');
   if(menu)menu.replaceChildren(...[['できること','#scope'],['制作実績','#works'],['記事制作','#writing'],['プロフィール','#profile'],['依頼・相談','https://coconala.com/services/4528114']].map(([label,href])=>{
    const link=document.createElement('a');link.textContent=label;link.href=href;return link;
   }));
   const cta=document.createElement('a');
   cta.href='https://coconala.com/services/4528114';
   cta.textContent='依頼・相談';
   cta.className='hero-link';
   cta.style.marginInlineStart='12px';
   hero.querySelector('a[href="#works"]')?.after(cta);
   for(const [project,fragment] of [['market','economy'],['news','signal'],['music','music']]){
    const card=document.getElementById('work-'+project);
    if(!card)continue;
    const live = new URL(fragment+'/',base).href;
    for(const link of card.querySelectorAll('a[href*="/portfolio/'+project+'/"]'))link.href=live;
    const primary = [...card.querySelectorAll('a')].find(link=>link.href===live&&!link.classList.contains('project-shot'));
    const details = document.createElement('a');
    details.href=new URL('portfolio/case-studies.html#'+fragment,base).href;
    details.textContent='制作事例を見る';
    details.style.marginInlineStart='10px';
    if(primary)primary.after(details);
    else card.append(details);
   }
   disclosure.hidden=true;
   scope.after(section);
   heading.textContent='制作のご相談';
   section.setAttribute('aria-label','制作のご相談');
   list.lastElementChild?.remove();
   section.style.margin='0 0 22px';
   return;
  }
 }
 if (site === 'music') {
  const main = document.querySelector('main');
  if (main) {
   heading.textContent = '配信の道具・このサイトの制作事例';
   section.setAttribute('aria-label',heading.textContent);
   section.style.cssText+=';max-width:none;margin:12px auto;width:min(96%,1280px)';
   list.style.cssText='display:flex;gap:8px 18px;flex-wrap:wrap;list-style:none;padding:0;margin:0 0 4px';
   main.before(section);
   return;
  }
 }
 const footer = [...document.querySelectorAll('footer')].find(e=>e.parentElement===document.body || e.getAttribute('role')==='contentinfo');
 if (footer) footer.before(section);
 else document.body.append(section);
})();

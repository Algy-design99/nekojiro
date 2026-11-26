(function () {
 'use strict';
 const source = document.currentScript;
 if (!source) return;
 const base = new URL('.', source.src);
 const site = source.dataset.site;
 const id = 'G-JJ59JV8FLB';
 const fc2 = /\.fc2\.(net|com)$/.test(location.hostname);
 const ref = new URLSearchParams(location.search).get('ref');
 const origin = ['fc2-board','github-board'].includes(ref) ? ref : (fc2 ? 'fc2-' + site : 'github-' + site);
 const route = new URLSearchParams(location.search).get('via');
 const via = ['board-home','board-thread','buying-guide'].includes(route) ? route : '';
 if (navigator.globalPrivacyControl !== true && navigator.doNotTrack !== '1') {
  window.dataLayer = window.dataLayer || [];
  const tag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag = tag;
  tag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
  tag('js',new Date());
  tag('config',id,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false});
  let pageReferrer = '';
  try { if (document.referrer) pageReferrer = new URL(document.referrer).origin; } catch {}
  const context = {site_section:site,entry_source:origin,entry_route:via,page_location:location.origin+location.pathname,page_referrer:pageReferrer};
  tag('event','page_view',context);
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
  document.head.append(script);
  document.addEventListener('click',event => {
   const a = event.target.closest?.('a[href]');
   if (!a) return;
   const host = a.hostname.toLowerCase();
   const partner = /(^|\.)amazon\.co\.jp$|^(?:amzn\.to|link\.amazon)$/.test(host) ? 'amazon'
      : /(^|\.)a8\.net$/.test(host) ? 'a8' : host === 'coconala.com' ? 'coconala' : '';
   if (partner) tag('event','affiliate_click',{...context,partner});
   else if (a.closest('[data-neko-route],.board-guides') || a.classList.contains('cta') && site==='buying-guide') {
    tag('event','guide_click',{...context,destination:a.pathname});
   }
  }, true);
 }
 const routes = {
  music:[['配信・録画機材の選び方','research/buying-guide.html#capture'],['音楽サイトの制作事例','portfolio/case-studies.html#music']],
  signal:[['ニュースサイトの制作事例','portfolio/case-studies.html#signal'],['通販で偽ショップを見分ける','research/archives/15881328.html']],
  economy:[['株価サイトの制作事例','portfolio/case-studies.html#economy'],['関連する経済記事を読む','research/archives/15051355.html']],
  portfolio:[['制作の依頼・相談','https://coconala.com/services/4528114'],['猫じろう調査室の比較ガイド','research/buying-guide.html']],
  research:[['用途から探す・買う前の比較ガイド','research/buying-guide.html']],
  work:[['制作事例を見る','portfolio/'],['制作の依頼・相談','https://coconala.com/services/4528114']],
  food:[['手作り豆腐の仕組みと道具','research/archives/managed-1795609330614.html'],['お茶の歴史を読む','research/archives/15930697.html']],
  living:[['通販の価格と販売店を比較する','research/buying-guide.html#shopping']],
  travel:[['旅行・地域の記事を探す','research/']],
  craft:[['制作事例を見る','portfolio/'],['道具を買う前の比較ガイド','research/buying-guide.html']],
  dougubako:[['配信・録画機材の選び方','research/buying-guide.html#capture'],['制作の依頼・相談','https://coconala.com/services/4528114']],
  kuronuma:[['黒沼幻司の関連スレッドを探す','board/?q=黒沼幻司']],
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
  const a = document.createElement('a');
  const item = document.createElement('li');
  a.href = url.href;
  a.textContent = label;
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
    const old=card?.querySelector('a[href*="/portfolio/'+project+'/"]');
    if(old){old.href=new URL('portfolio/case-studies.html#'+fragment,base).href;old.textContent='制作事例を見る';}
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
 if (['signal','economy','music'].includes(site)) {
  const main = document.querySelector('main');
  if (main) {
   heading.textContent = site==='music'?'配信の道具・このサイトの制作事例':'関連記事・このサイトの制作事例';
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

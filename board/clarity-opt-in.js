'use strict';

(() => {
 const url = new URL(location.href);
 if (!url.pathname.endsWith('/board/') || url.search || url.hash ||
     navigator.globalPrivacyControl === true || navigator.doNotTrack === '1') return;

 const home = document.getElementById('board-home');
 if (!home) return;

 const section = document.createElement('section');
 section.setAttribute('aria-label', '操作計測');
 section.style.cssText = 'margin:12px 0;padding:10px;border:1px solid #cad3db';

 const description = document.createElement('p');
 description.textContent = 'このページのクリックやスクロールを、画面改善のためMicrosoft Clarityで計測できます。計測を許可すると解析用Cookieを使用します。';
 const privacy = document.createElement('a');
 privacy.href = 'https://privacy.microsoft.com/ja-jp/privacystatement';
 privacy.textContent = 'Microsoftのプライバシー情報';
 const control = document.createElement('button');
 control.type = 'button';
 control.textContent = 'このページの操作計測を許可する';
 const status = document.createElement('span');
 status.setAttribute('role', 'status');
 section.append(description, privacy, document.createElement('br'), control, status);
 home.append(section);

 control.addEventListener('click', () => {
  control.disabled = true;
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.clarity.ms/tag/zkr7ignkmg';
  script.addEventListener('load', () => { status.textContent = ' 操作計測を開始しました。'; });
  script.addEventListener('error', () => {
   control.disabled = false;
   status.textContent = ' 操作計測を開始できませんでした。';
  });
  window.clarity = window.clarity || function () {
   (window.clarity.q = window.clarity.q || []).push(arguments);
  };
  window.clarity('consentv2', {ad_Storage:'denied', analytics_Storage:'granted'});
  document.head.append(script);
 });
})();

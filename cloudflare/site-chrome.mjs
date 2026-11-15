const chromeStyle=`
.cb-skip-link{position:fixed;inset-inline-start:18px;top:-80px;z-index:20000;background:#123f55;color:#fff;padding:10px 18px;border-radius:9px}.cb-skip-link:focus{top:12px}
body .cb-site-header{height:auto;min-height:88px;display:flex;gap:18px;align-items:center;justify-content:space-between;padding:18px 0;border-bottom:1px solid #c8dee980;flex-wrap:wrap;background:transparent}
body .cb-site-header .cb-header-title{display:flex;align-items:center;gap:12px;min-width:0}
body .cb-header-title img{display:block;flex-shrink:0;width:56px;height:40px;object-fit:contain}
body .cb-header-title strong{display:block;color:#15465e;font-size:16px;line-height:1.7}
body .cb-header-title small{display:block;color:#668394;font-size:10px;line-height:1.8}
body .cb-site-header nav.cb-header-nav{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0;padding:0}
body .cb-site-header .cb-header-nav a{display:inline-flex;align-items:center;min-height:40px;padding:7px 12px;border-radius:10px;color:#365f74;font-size:11px;line-height:1.8;text-decoration:none;background:#ffffff69;border:1px solid #d5e5ed80}
body .cb-site-header .cb-header-nav a:hover{background:#e8f3f8;color:#124a64}
body .cb-app-header .badge{margin-inline-start:auto}
body .cb-site-footer{display:block;margin:38px 0 0;padding:26px 28px 16px;border:1px solid #d3e3ec;border-radius:20px;background:linear-gradient(120deg,#f5fafdec,#eaf3f8eb);color:#476e82;font:12px Vazir,Tahoma,sans-serif;line-height:2;box-shadow:0 7px 23px #17465c04}
body .cb-footer-main{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:36px;align-items:start}
body .cb-footer-brand{display:flex;align-items:center;gap:10px;font-size:18px;font-weight:bold;color:#17455c;width:fit-content;text-decoration:none}
body .cb-footer-brand img{display:block;width:63px;height:42px;object-fit:contain}
body .cb-site-footer p{max-width:430px;margin:10px 0 0;color:#607f91;font-size:11px;line-height:2}
body .cb-footer-links>strong{display:block;font-size:12px;color:#2f5b71;margin-bottom:9px}
body .cb-site-footer nav{display:flex;gap:8px 18px;flex-wrap:wrap;margin:0;padding:0}
body .cb-site-footer nav a{color:#416d83;text-decoration:none;min-height:35px;display:inline-flex;align-items:center;font-size:11px}
body .cb-site-footer nav a:hover{text-decoration:underline;text-underline-offset:4px;color:#134b65}
body .cb-footer-bottom{display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;border-top:1px solid #d7e5ed;margin-top:21px;padding-top:13px;color:#718b9b;font-size:10px}
body .cb-site-footer a:focus-visible,body .cb-site-header a:focus-visible{outline:3px solid #5eabc7;outline-offset:3px}
@media(max-width:760px){body .cb-site-header{min-height:75px;padding:13px 0;gap:10px}body .cb-site-header nav.cb-header-nav{gap:6px}body .cb-site-header .cb-header-nav a{padding:6px 9px;font-size:10px;min-height:36px}body .cb-header-title img{width:46px;height:34px}body .cb-site-footer{padding:21px 19px 15px;border-radius:16px;margin-top:27px}body .cb-footer-main{grid-template-columns:1fr;gap:20px}body .cb-footer-bottom{margin-top:16px}body .cb-app-header .cb-header-nav{order:4;width:100%}body .cb-app-header .badge{font-size:10px}}
`;
const headerLinks='<nav class="cb-header-nav" aria-label="لینک‌های بالای سایت"><a href="/ui?view=site-guide">آموزش سایت</a><a href="#cb-site-about">دربارهٔ ما</a></nav>';
export function decorateSiteChrome(content){
 // Embedded account dashboards belong to the outer workspace header/footer.
 if(content.includes('<base target="_top">')||content.includes('id="cb-site-about"'))return content;
 const workspace=content.includes('class="app"');
 if(workspace){
  content=content.replace('<main><header>','<main id="cb-main-content"><header class="cb-site-header cb-app-header">');
  const intro='<div><strong>محیط آموزش شما</strong><br><small>کنجکاو بمانید؛ در ارتباط بمانید.</small></div>';
  content=content.replace(/(<aside\b[^>]*>)\s*<a class="logo"[^>]*>[\s\S]*?<\/a>/,'$1');
  content=content.replace(intro,'<div class="cb-header-title"><img src="/project-logo.webp" width="56" height="40" alt=""><div><strong>پل بالینی</strong><small>محیط یادگیری و همراهی بالینی</small></div></div>'+headerLinks);
 }else{
  // Auth tabs remain inside the form; do not add a second login/signup navigation.
  content=content.replace(/<header class="top">([\s\S]*?)<\/header>/,'<header class="top cb-site-header">$1'+headerLinks+'</header>');
  content=content.replace('<div class="auth-layout">','<div id="cb-main-content" class="auth-layout">');
 }
 const year=new Intl.DateTimeFormat('fa-IR',{year:'numeric',timeZone:'Asia/Tehran'}).format(new Date());
 const footer='<footer class="cb-site-footer" aria-label="پاورقی پل بالینی"><div class="cb-footer-main"><div id="cb-site-about"><p>فضایی برای آموزش و همراهی بالینی دانشجویان پزشکی؛ برای دنبال‌کردن جلسات، تمرین‌های آموزشی و بازخورد منتور.</p></div><div class="cb-footer-links"><strong>دسترسی سریع</strong><nav aria-label="لینک‌های پایین سایت"><a href="/ui?view=overview">داشبورد</a><a href="/ui?view=sessions">جلسات من</a><a href="/ui?view=backpack">کوله‌پشتی بحران</a></nav></div></div><div class="cb-footer-bottom"><span>© '+year+' تمامی حقوق محفوظ است.</span><span>آموزش · تمرین · بازخورد</span></div></footer>';
 content=content.replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/,footer);
 return content.replace('</head>','<style id="cb-site-chrome">'+chromeStyle+'</style></head>').replace('<body>','<body><a class="cb-skip-link" href="#cb-main-content">پرش به محتوا</a>');
}


// Native, dependency-free motion. Server data remains the source of truth.
export const motionCSS=String.raw`
.cb-glass-bridge{display:block;width:100%;max-width:400px;height:auto;overflow:visible;transform:translate3d(var(--bridge-x,0px),var(--bridge-y,0px),0);transition:transform .6s cubic-bezier(.2,.7,.2,1)}
.cb-bridge-light{stroke-dasharray:65 700;animation:cbBridgeLight 9s linear infinite}
@keyframes cbBridgeLight{to{stroke-dashoffset:-765}}
body #overview .hero .visual{background:none;isolation:isolate}body #overview .hero .visual .float{z-index:1}
body aside>.logo .project-brand-mark,body .cb-footer-brand img{display:none!important}
body .cb-header-title img{width:48px;height:35px}body #virtual-patient .vp-hero-seal{display:none}
body aside nav button .cb-feature-icon{transform-origin:50% 70%;will-change:auto}
body #virtual-patient .pv-room>svg{transition:transform .45s cubic-bezier(.2,.7,.2,1);transform-origin:50% 60%}
body #virtual-patient .vp-brief{transition:box-shadow .3s,border-color .3s}
body #virtual-patient .vp-brief>button{transition:background .25s,box-shadow .25s,transform .25s;min-height:46px}
body #virtual-patient .vp-brief:focus-within{border-color:#7daec4;box-shadow:0 12px 32px #214e6814}
body #virtual-patient .vp-brief>button:focus-visible{box-shadow:0 0 0 5px #71b5d22b}
body .cb-wallet-coin{display:inline-grid;place-items:center;width:24px;height:24px;border:3px double #b18a43;border-radius:50%;background:linear-gradient(135deg,#fff3cf,#e8c47b);color:#806028;flex-shrink:0;font-size:11px;line-height:1}
body .cb-earned-message{position:fixed;z-index:10001;inset-inline-end:24px;top:110px;max-width:calc(100vw - 40px);background:#fff8e7;border:1px solid #e1c88e;border-radius:14px;padding:13px 20px;color:#72501b;box-shadow:0 12px 36px #254d651a;font-size:13px;pointer-events:none}
body #growth-coins .gc-levels{display:flex;flex-wrap:nowrap;gap:0;overflow-x:auto;padding:18px 3px 10px;isolation:isolate}
body #growth-coins .gc-levels>span{position:relative;flex:1;min-width:90px;border:0;background:none;text-align:center;padding:32px 5px 7px;font-size:10px;color:#7a8c98;line-height:1.9}
body #growth-coins .gc-levels>span:before{content:'';position:absolute;top:9px;left:calc(50% - 8px);height:16px;width:16px;border-radius:50%;background:#dce7ee;border:3px solid #fff;box-shadow:0 0 0 1px #dce7ee;z-index:1;transition:background .5s,box-shadow .5s}
body #growth-coins .gc-levels>span:after{content:'';position:absolute;top:16px;right:-50%;width:100%;height:2px;background:#dce7ee;z-index:-1;transform-origin:right;transition:background .6s}
body #growth-coins .gc-levels>span:first-child:after{display:none}
body #growth-coins .gc-levels>span.reached{color:#245d73;font-weight:700;background:none}
body #growth-coins .gc-levels>span.reached:before{background:#5aa6bb;box-shadow:0 0 0 1px #5aa6bb,0 0 0 5px #5aa6bb12}
body #growth-coins .gc-levels>span.reached:after{background:#5aa6bb;animation:cbPathConnect .65s ease both}
@keyframes cbPathConnect{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@media(hover:hover) and (pointer:fine){body #virtual-patient .vp-layout:has(.vp-brief):hover .pv-room>svg{transform:scale(1.025)}body #virtual-patient .vp-brief:hover{border-color:#7daec4;box-shadow:0 12px 32px #214e6814}body #virtual-patient .vp-brief:hover>button{transform:translateY(-2px);background:#327493;box-shadow:0 7px 18px #214d6526}}
@media(max-width:760px){body #overview .hero .visual{display:grid;min-height:205px;height:205px}body .cb-glass-bridge{max-width:300px;max-height:205px}body #overview .hero .visual .float{display:none}body .cb-earned-message{top:20px;inset-inline-end:20px}}
@media(prefers-reduced-motion:reduce){.cb-bridge-light{animation:none!important;stroke-dasharray:none;opacity:.35}.cb-glass-bridge{transform:none!important;transition:none!important}body #virtual-patient .pv-room>svg,body #virtual-patient .vp-brief>button{transform:none!important;transition:none!important}body #growth-coins .gc-levels>span:after{animation:none!important}body .growth-wallet-chip.received{animation:none!important}}
`;
export const bridgeArtwork=`<svg class="cb-glass-bridge" viewBox="0 0 440 300" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="cbGlass" x1="65" y1="60" x2="355" y2="250" gradientUnits="userSpaceOnUse"><stop stop-color="#d5f5ff" stop-opacity=".55"/><stop offset=".5" stop-color="#8dc6dd" stop-opacity=".12"/><stop offset="1" stop-color="#e9faff" stop-opacity=".4"/></linearGradient><linearGradient id="cbDeck" x2="1" y2="1"><stop stop-color="#dff7ff" stop-opacity=".7"/><stop offset="1" stop-color="#7fb4d7" stop-opacity=".15"/></linearGradient><radialGradient id="cbHalo"><stop stop-color="#80c6e5" stop-opacity=".18"/><stop offset="1" stop-color="#80c6e5" stop-opacity="0"/></radialGradient></defs><ellipse cx="220" cy="150" rx="200" ry="145" fill="url(#cbHalo)"/><ellipse cx="220" cy="255" rx="165" ry="12" fill="#082e43" opacity=".18"/><path d="M55 225Q100 55 220 55T385 225L368 232Q318 78 220 78T72 232Z" fill="url(#cbGlass)" stroke="#c7efff" stroke-opacity=".4"/><path d="M66 229Q114 68 220 68T376 229" stroke="#b9e9fb" stroke-opacity=".28" stroke-width="2"/><path class="cb-bridge-light" d="M66 229Q114 68 220 68T376 229" stroke="#e4faff" stroke-width="3" stroke-linecap="round"/><path d="M110 142V228M155 91V228M200 71V228M245 71V228M290 91V228M335 142V228" stroke="#c5e9fa" stroke-opacity=".27" stroke-width="2"/><path d="M44 228H396L380 242H60Z" fill="url(#cbDeck)" stroke="#c5e9fa" stroke-opacity=".4"/><path d="M70 250H369" stroke="#c5e9fa" stroke-opacity=".2" stroke-linecap="round"/><circle cx="200" cy="71" r="3" fill="#d7f4ff"/><circle cx="290" cy="91" r="3" fill="#d7f4ff"/></svg>`;
function initializeMotion(){
 if(window.cbMotionReady)return;window.cbMotionReady=true;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),fine=matchMedia('(hover: hover) and (pointer: fine)');
 const play=(el,frames,options)=>{if(!el||reduced.matches||!el.animate)return;el.getAnimations().forEach(a=>a.cancel());return el.animate(frames,options)};
 const bridge=document.querySelector('.cb-glass-bridge'),hero=bridge?.closest('.hero');
 if(hero){let pending=0;hero.addEventListener('pointermove',e=>{if(reduced.matches||!fine.matches)return;cancelAnimationFrame(pending);pending=requestAnimationFrame(()=>{const r=hero.getBoundingClientRect();bridge.style.setProperty('--bridge-x',((e.clientX-r.left)/r.width-.5)*10+'px');bridge.style.setProperty('--bridge-y',((e.clientY-r.top)/r.height-.5)*7+'px')})});hero.addEventListener('pointerleave',()=>{cancelAnimationFrame(pending);bridge.style.setProperty('--bridge-x','0px');bridge.style.setProperty('--bridge-y','0px')});const sync=()=>{bridge.querySelectorAll('.cb-bridge-light').forEach(el=>el.style.animationPlayState=document.hidden||!hero.closest('.view')?.classList.contains('active')?'paused':'running')};document.addEventListener('visibilitychange',sync);new MutationObserver(sync).observe(hero.closest('.view')||hero,{attributes:true,attributeFilter:['class']});sync()}
 document.addEventListener('click',e=>{const button=e.target.closest('aside nav button[data-view]');if(!button)return;const icon=button.querySelector('.cb-feature-icon,span');const id=button.dataset.view;const frames=id==='growth-coins'?[{transform:'rotateY(0deg)'},{transform:'rotateY(360deg)'}]:id==='virtual-patient'?[{transform:'scale(1)'},{transform:'scale(1.15)',offset:.4},{transform:'scale(1)'}]:id==='sessions'?[{transform:'rotate(0deg)'},{transform:'rotate(-10deg)'},{transform:'rotate(7deg)'},{transform:'rotate(0deg)'}]:[{transform:'translateY(0)'},{transform:'translateY(-4px)'},{transform:'translateY(0)'}];play(icon,frames,{duration:420,easing:'ease-out'})});
 let previous=null,numberFrame=0,noteTimer=0;const coins=new Set();
 document.addEventListener('cb:wallet-rendered',e=>{const d=e.detail;if(!Number.isFinite(d?.earned)||!Number.isFinite(d?.balance))return;const old=previous;previous={...d};const chip=document.querySelector('#growthHeaderChip'),badge=chip?.querySelector('span');if(badge&&!badge.classList.contains('cb-wallet-coin')){badge.classList.add('cb-wallet-coin');badge.textContent='✦'}
 const gained=old&&old.user===d.user?d.earned-old.earned:0;cancelAnimationFrame(numberFrame);coins.forEach(a=>a.cancel());coins.clear();const targets=[document.querySelector('#growthHeaderBalance'),document.querySelector('#growth-coins .gc-stat.primary strong')].filter(Boolean);targets.forEach(el=>el.textContent=d.balance.toLocaleString('fa-IR'));
 if(gained<=0)return;const icons=[badge,document.querySelector('.growth-coin-art')];icons.forEach(el=>{const a=play(el,[{transform:'perspective(300px) rotateY(0deg) scale(1)'},{transform:'perspective(300px) rotateY(180deg) scale(1.12)',offset:.5},{transform:'perspective(300px) rotateY(360deg) scale(1)'}],{duration:850,easing:'ease-in-out'});if(a)coins.add(a)});
 const start=performance.now();if(!reduced.matches&&d.balance>old.balance){const tick=now=>{const p=Math.min(1,(now-start)/750),n=Math.round(old.balance+(d.balance-old.balance)*(1-Math.pow(1-p,3)));targets.forEach(el=>{if(el.isConnected)el.textContent=n.toLocaleString('fa-IR')});if(p<1)numberFrame=requestAnimationFrame(tick)};numberFrame=requestAnimationFrame(tick)}
 document.querySelector('.cb-earned-message')?.remove();const note=document.createElement('div');note.className='cb-earned-message';note.setAttribute('role','status');note.textContent='+'+gained.toLocaleString('fa-IR')+' سکهٔ رشد دریافت کردی';document.body.append(note);play(note,[{opacity:0,transform:'translateY(-8px)'},{opacity:1,transform:'translateY(0)'}],{duration:250});clearTimeout(noteTimer);noteTimer=setTimeout(()=>note.remove(),3200);
 });
 // The existing renderer reports real server balances, including the first load.
 if(typeof growthData!=='undefined'&&growthData&&typeof serverUser!=='undefined'&&serverUser?.role==='student')document.dispatchEvent(new CustomEvent('cb:wallet-rendered',{detail:{user:serverUser.id,balance:growthData.balance,earned:growthData.earned}}));
}
export const motionScript='('+initializeMotion.toString()+')();';
export function decorateMotion(html){
 if(html.includes('id="cb-motion"')||!html.includes('class="app"'))return html;
 html=html.replace(/<svg\b(?=[^>]*class=["'][^"']*\bcb-bridge-hero-art\b[^"']*["'])[^>]*>[\s\S]*?<\/svg>/g,bridgeArtwork);
 html=html.replace(/(<a class="logo"[^>]*>)<span class="mark project-brand-mark">[\s\S]*?<\/span>/g,'$1').replace(/(<a class="cb-footer-brand"[^>]*>)<img[^>]*>/g,'$1');
 return html.replace('</head>','<style id="cb-motion">'+motionCSS+'</style></head>').replace('</body>','<script>'+motionScript+'</script></body>');
}

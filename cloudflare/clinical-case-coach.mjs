// Learning support layered over the existing clinical case wizard.
export const caseCoachScript=String.raw`(()=>{
function init(){
 if(typeof renderWizard!=='function'||typeof wizardChoose!=='function'||window.cbCaseCoach)return;
 window.cbCaseCoach=true;
 const keys=['exam','test','diagnosis','treat','follow'],labels=['معاینه','بررسی‌ها','تشخیص','درمان','پیگیری'];
 const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const originalRender=renderWizard,originalChoose=wizardChoose,originalComplete=wizardComplete;
 function data(){return wizardState.coach||(wizardState.coach={confidence:{},reasons:{},updated:null});}
 function persist(){data().updated=Date.now();try{wizardSave();return true}catch{const e=document.getElementById('cb-coach-status');if(e)e.textContent='ذخیره در این مرورگر ممکن نشد؛ پیش از خروج یادداشت را کپی کنید.';return false}}
 function decorate(){
 const host=document.querySelector('#caseDetail .step-content');if(!host||!currentCase||!wizardState)return;
 const state=data(),step=wizardState.step,key=keys[step-1];
 if(key){
 const answered=wizardState.answers[key]!==undefined;
 const box=document.createElement('section');box.className='cb-case-coach';
 box.innerHTML='<div class="cb-coach-kicker">ایستگاه تصمیم '+step.toLocaleString('fa-IR')+' از ۵</div><h3>چقدر به تصمیمت مطمئنی؟</h3><p>پیش از انتخاب پاسخ ثبت کن؛ بعد از پاسخ، اطمینان اولیه حفظ می‌شود.</p><div class="cb-confidence" role="group" aria-label="میزان اطمینان">'+['کم؛ نیاز به کمک دارم','متوسط؛ بین گزینه‌ها مرددم','زیاد؛ دلیل روشنی دارم'].map((t,i)=>'<button type="button" data-confidence="'+i+'" aria-pressed="'+(state.confidence[key]===i)+'" '+(answered?'disabled':'')+'>'+t+'</button>').join('')+'</div><label for="cb-case-reason">کدام یافته انتخابت را پشتیبانی می‌کند؟</label><textarea id="cb-case-reason" rows="2" maxlength="1500" placeholder="یک یافتهٔ کلیدی و دلیل تصمیم؛ بدون مشخصات بیمار واقعی"></textarea><small id="cb-coach-status" role="status">یادداشت آموزشی فقط در همین مرورگر ذخیره می‌شود.</small>';
 host.prepend(box);box.querySelector('textarea').value=state.reasons[key]||'';
 box.querySelector('textarea').addEventListener('input',e=>{state.reasons[key]=e.target.value;persist()});
 box.querySelectorAll('[data-confidence]').forEach(b=>b.onclick=()=>{state.confidence[key]=Number(b.dataset.confidence);persist();box.querySelectorAll('[data-confidence]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});
 if(answered){const result=document.createElement('p');result.className='cb-coach-insight';const correct=wizardState.answers[key]===wizardCorrect(key);result.textContent=!correct&&state.confidence[key]===2?'نکتهٔ مرور: این تصمیم با اطمینان بالا ثبت شد، اما با پاسخ مرجع همسو نبود. یافته‌ای را که نادیده گرفتی در یادداشتت بنویس.':correct&&state.confidence[key]===0?'پاسخ درست با اطمینان کم: استدلال مرجع را مرور کن تا انتخابت قابل توضیح‌تر شود.':'پس از خواندن بازخورد، یک جمله دربارهٔ دلیل انتخاب یا تغییر تصمیمت بنویس.';box.append(result)}
 }
 if(step===6){
 const panel=document.createElement('section');panel.className='cb-case-coach';
 const missed=keys.filter(k=>wizardState.answers[k]!==wizardCorrect(k));
 const overconfident=missed.filter(k=>state.confidence[k]===2);
 panel.innerHTML='<div class="cb-coach-kicker">گزارش شخصی یادگیری</div><h3>'+(!missed.length?'استدلالت را تثبیت کن':'اولویت مرور بعدی تو')+'</h3><p>'+(!missed.length?'تمام تصمیم‌ها با پاسخ مرجع همسو بودند. در تلاش بعدی، پیش از دیدن گزینه‌ها پاسخ خودت را بساز.':missed.map(k=>labels[keys.indexOf(k)]).join('، '))+'</p>'+(overconfident.length?'<p class="cb-coach-insight">مرور با اولویت بالاتر: '+overconfident.map(k=>labels[keys.indexOf(k)]).join('، ')+'؛ پاسخ متفاوت با مرجع، همراه اطمینان بالا.</p>':'')+'<div class="cb-coach-review">'+keys.map((k,i)=>'<details><summary>'+labels[i]+' · '+(wizardState.answers[k]===wizardCorrect(k)?'همسو با مرجع':'نیازمند مرور')+'</summary><p><b>اطمینان اولیه:</b> '+(['کم','متوسط','زیاد'][state.confidence[k]]||'ثبت نشده')+'</p><p><b>استدلال شما:</b> '+safe(state.reasons[k]||'یادداشتی ثبت نشده')+'</p><button type="button" data-review="'+(i+1)+'">مرور این مرحله</button></details>').join('')+'</div><p>پیشنهاد تمرین: فردا موارد نیازمند مرور را بازبینی کن و یک هفتهٔ بعد کیس را دوباره حل کن.</p><button type="button" id="cb-case-copy">کپی گزارش برای گفت‌وگو با منتور</button><small id="cb-coach-status" role="status"></small>';
 host.prepend(panel);panel.querySelectorAll('[data-review]').forEach(b=>b.onclick=()=>{wizardState.step=Number(b.dataset.review);persist();renderWizard()});
 panel.querySelector('#cb-case-copy').onclick=async()=>{const report=['گزارش آموزشی کیس: '+currentCase.title,...keys.map((k,i)=>labels[i]+': '+(wizardState.answers[k]===wizardCorrect(k)?'همسو با مرجع':'نیازمند مرور')+' | اطمینان: '+(['کم','متوسط','زیاد'][state.confidence[k]]||'ثبت نشده')+'\nاستدلال: '+(state.reasons[k]||'ثبت نشده')),'پرسش برای منتور: '+currentCase.mentor].join('\n\n');try{await navigator.clipboard.writeText(report);panel.querySelector('#cb-coach-status').textContent='گزارش کپی شد؛ خودت می‌توانی آن را به اشتراک بگذاری.'}catch{const area=document.createElement('textarea');area.value=report;area.setAttribute('aria-label','گزارش قابل کپی');panel.append(area);area.select();panel.querySelector('#cb-coach-status').textContent='گزارش را از کادر انتخاب‌شده کپی کن.'}};
 }
 }
 renderWizard=function(){originalRender();decorate()};
 wizardChoose=function(key,index){if(!Number.isInteger(data().confidence[key])){const s=document.getElementById('cb-coach-status');if(s)s.textContent='ابتدا میزان اطمینان را انتخاب کن.';document.querySelector('[data-confidence]')?.focus();return}originalChoose(key,index)};
 wizardComplete=function(){if(!keys.every(k=>wizardState.answers[k]!==undefined)){notify('برای ثبت پایان، هر پنج تصمیم را پاسخ بده.');return}originalComplete()};
 if(typeof wizardState!=='undefined'&&wizardState&&typeof currentCase!=='undefined'&&currentCase)decorate();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();`;
const css=`#caseDetail .cb-case-coach{margin:0 0 22px;padding:22px;background:#eff6fa;border:1px solid #c7dfe9;border-radius:16px;color:#173e56}#caseDetail .cb-case-coach h3{font-size:18px;margin:8px 0}#caseDetail .cb-case-coach p{font-size:13px;line-height:2}#caseDetail .cb-coach-kicker{font-size:11px;color:#42748a}#caseDetail .cb-confidence{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}#caseDetail .cb-confidence button{background:#fff;color:#254e65;border:1px solid #b5cdd9;border-radius:12px;padding:10px 14px;font:inherit;font-size:12px}#caseDetail .cb-confidence button[aria-pressed=true]{background:#164f6b;color:#fff;border-color:#164f6b}#caseDetail .cb-confidence button:disabled{opacity:.8;cursor:default}#caseDetail .cb-case-coach label{display:block;font-size:12px;margin:14px 0 6px}#caseDetail .cb-case-coach textarea{width:100%;padding:12px;border:1px solid #b5cdd9;border-radius:10px;background:#fff;color:#173e56;font:inherit;resize:vertical}#caseDetail .cb-case-coach small{display:block;font-size:11px;margin-top:8px}#caseDetail .cb-coach-insight{border-right:3px solid #b7894e;padding:10px 14px;background:#fff7e9;border-radius:8px}#caseDetail .cb-coach-review details{padding:12px 0;border-bottom:1px solid #c7dfe9}#caseDetail .cb-coach-review summary{cursor:pointer;font-size:13px}#caseDetail .cb-case-coach button:focus-visible{outline:3px solid #5098ba;outline-offset:3px}@media(max-width:600px){#caseDetail .cb-case-coach{padding:15px}#caseDetail .cb-confidence{display:grid;grid-template-columns:1fr}}`;
export function decorateCaseCoach(html){if(!html.includes('function renderWizard(')||html.includes('id="cb-case-coach-script"'))return html;return html.replace('</body>','<style>'+css+'</style><script id="cb-case-coach-script">'+caseCoachScript+'</script></body>')}

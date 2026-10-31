/* Educational branching simulation. All numbers and timing are authored fiction, not a physiological model. */
const VirtualPatientEngine=(()=>{
const catalog={
 assess:{label:'ارزیابی اولیه و پایش',group:'ارزیابی',minutes:1,cost:0},
 history:{label:'شرح‌حال هدفمند',group:'ارزیابی',minutes:2,cost:0},
 exam:{label:'معاینهٔ تنفسی',group:'ارزیابی',minutes:2,cost:0},
 oxygen:{label:'حمایت اکسیژنی با پایش',group:'اقدام',minutes:1,cost:0},
 senior:{label:'فراخوان پزشک ارشد',group:'اقدام',minutes:1,cost:0},
 xray:{label:'رادیوگرافی قفسهٔ سینه',group:'بررسی',minutes:5,cost:3},
 labs:{label:'شمارش خون، اوره و الکترولیت',group:'بررسی',minutes:5,cost:2},
 ct:{label:'سی‌تی قفسهٔ سینه در گام اول',group:'بررسی',minutes:10,cost:8},
 diagnosis:{label:'پنومونی؛ تشخیص کاری',group:'تصمیم',minutes:1,cost:0},
 antibiotic:{label:'درمان آنتی‌بیوتیکی با نظر ارشد',group:'اقدام',minutes:1,cost:0},
 reassess:{label:'ارزیابی مجدد و تحویل ساختاریافته',group:'تصمیم',minutes:2,cost:0},
 wait:{label:'انتظار بدون اقدام تازه · ۵ دقیقه',group:'تصمیم',minutes:5,cost:0},
 discharge:{label:'ترخیص با پیگیری سرپایی',group:'تصمیم',minutes:1,cost:0}
};
function initial(){return {version:1,started:false,ended:false,reason:'',minute:0,cost:0,used:[],vitals:{spo2:88,hr:116,rr:30,sbp:104,dbp:66,temp:38.6},history:[{minute:0,spo2:88,hr:116}],events:[],findings:[],last:'پیش از شروع، شرح سناریو را بخوانید.',level:'neutral',diagnosis:false}}
function act(previous,id){if(!catalog[id]||!previous.started||previous.ended)return previous;const s=JSON.parse(JSON.stringify(previous)),a=catalog[id];if(s.used.includes(id)&&!['wait','reassess'].includes(id))return previous;
 const has=x=>s.used.includes(x);let feedback='',level='neutral',finding='';
 if(id==='antibiotic'&&(!has('senior')||!has('xray'))){s.last='در این سناریو، ابتدا از ارشد کمک بگیرید و تشخیص کاری را با ارزیابی و تصویربرداری بررسی کنید. حمایت تنفسی را برای آزمایش به تأخیر نیندازید.';s.level='warn';return s}
 if(id==='diagnosis'&&!has('xray')){s.last='پنومونی یکی از احتمال‌هاست. پیش از ثبت تشخیص کاری، شواهد تصویربرداری و بالینی را کنار هم بگذارید.';s.level='warn';return s}
 const priorMinute=s.minute;s.minute+=a.minutes;s.cost+=a.cost;
 if(!has('oxygen')&&id!=='oxygen'){s.vitals.spo2=Math.max(82,s.vitals.spo2-Math.ceil(a.minutes/3));s.vitals.hr=Math.min(138,s.vitals.hr+Math.ceil(a.minutes/2));s.vitals.rr=Math.min(38,s.vitals.rr+Math.floor(a.minutes/3))}
 if(!has(id))s.used.push(id);
 switch(id){
 case 'assess':feedback='افت اشباع اکسیژن و تنفس تند، اولویت رسیدگی را بالا می‌برند. پایش کافی نیست؛ ارزیابی فوری و کمک ارشد را دنبال کنید.';finding='هوشیار و مضطرب؛ صحبت در جمله‌های کوتاه. علائم حیاتی فعلی روی مانیتور دیده می‌شوند.';break;
 case 'history':feedback='شرح‌حال، احتمال عفونت تنفسی را تقویت می‌کند؛ هم‌زمان، علل دیگر تنگی نفس باید در ذهن بمانند.';finding='مرد ۵۶ساله؛ سه روز تب و سرفهٔ خلط‌دار، تنگی نفس رو به افزایش و درد پلورتیک راست. سابقهٔ شناخته‌شدهٔ احتباس CO₂ یا حساسیت دارویی ندارد. اطلاعات همه فرضی‌اند.';break;
 case 'exam':feedback='یافتهٔ کانونی با شرح‌حال سازگار است؛ هیچ یافته‌ای به‌تنهایی تشخیص قطعی نمی‌دهد.';finding='کراکل قاعدهٔ ریهٔ راست، افزایش کار تنفسی و پوست گرم؛ ورم یک‌طرفهٔ پا گزارش نمی‌شود. معاینه سایر علل را قطعی رد نمی‌کند.';break;
 case 'oxygen':s.vitals.spo2=94;s.vitals.hr=Math.max(106,s.vitals.hr-6);s.vitals.rr=Math.max(26,s.vitals.rr-3);feedback='در مسیر فرضی این سناریو، اکسیژناسیون بهتر شد. اکسیژن درمان علت عفونت نیست؛ هدف و وسیله باید با نظر تیم و شرایط بیمار تنظیم و بازبینی شوند.';level='good';break;
 case 'senior':feedback='کمک ارشد درخواست شد. افت اکسیژن نیاز به ارزیابی فوری دارد؛ تیم، شدت بیماری و نیاز به بررسی سپسیس یا حمایت بیشتر را ارزیابی می‌کند.';level='good';finding='ارشد: «حمایت تنفسی، پایش و ارزیابی شدت را ادامه دهید؛ آزمایش نباید رسیدگی فوری را عقب بیندازد.»';break;
 case 'xray':feedback=has('oxygen')?'تصویربرداری پس از شروع حمایت انجام شد؛ یافتهٔ کانونی به تشخیص کاری کمک می‌کند.':'تصویربرداری مفید است، اما در این مسیر، رسیدگی به افت اکسیژن به تعویق افتاد.';level=has('oxygen')?'good':'warn';finding='گزارش فرضی رادیوگرافی: کدورت کانونی لوب تحتانی راست، سازگار با پنومونی در زمینهٔ بالینی مناسب؛ افیوژن قابل توجه گزارش نشده است.';break;
 case 'labs':feedback='این بررسی‌ها اطلاعات شدت و وضعیت زمینه‌ای را تکمیل می‌کنند؛ شمارش خون به‌تنهایی عامل عفونت را تعیین نمی‌کند.';finding='نتایج فرضی: WBC=15.2×10⁹/L؛ اوره=8.1 mmol/L؛ سدیم=136 mmol/L؛ کراتینین=1.0 mg/dL. این داده‌ها جای ارزیابی کامل شدت را نمی‌گیرند.';break;
 case 'ct':feedback='برای این کیس و اطلاعات فعلی، سی‌تی گام اولِ کم‌ارزشی بود: زمان و هزینهٔ فرضی بیشتری مصرف شد، بدون تغییر تصمیم اولیه. در موقعیت‌های دیگر ممکن است اندیکاسیون داشته باشد.';level='warn';finding='گزارش فرضی سی‌تی: کنسولیدیشن قاعدهٔ راست؛ در این سناریو اطلاعات تصمیم‌ساز اضافه‌ای نسبت به رادیوگرافی حاصل نشد.';break;
 case 'diagnosis':s.diagnosis=true;feedback='پنومونی تشخیص کاری مناسبی برای داده‌های این سناریوست؛ در صورت ناسازگاری سیر، تشخیص‌های جایگزین را بازبینی کنید.';level='good';break;
 case 'antibiotic':feedback='شروع درمان با نظر ارشد ثبت شد. انتخاب دارو به شدت، حساسیت، عملکرد کلیه، سابقه و پروتکل محلی وابسته است. این شبیه‌ساز دارو یا دوز تجویز نمی‌کند و بهبود فوری عفونت نشان نمی‌دهد.';level='good';break;
 case 'reassess':if(has('oxygen')&&has('senior')&&has('antibiotic')){s.ended=true;s.reason='تحویل به تیم و ادامهٔ پایش';feedback='حمایت اولیه، کمک ارشد و شروع درمان ثبت شد. بیمار هنوز نیازمند پایش و ارزیابی تیم است؛ پایان تمرین به معنای بهبود یا آمادگی ترخیص نیست.';level='good'}else{feedback='چرخهٔ رسیدگی کامل نیست. افت اکسیژن، نیاز به ارشد و برنامهٔ درمان را پیش از تحویل نهایی بازبینی کنید.';level='warn'}break;
 case 'wait':feedback=has('oxygen')?'زمان گذشت؛ اکسیژناسیون حمایت می‌شود، اما انتظار به‌تنهایی جای درمان علت و بازبینی تیم را نمی‌گیرد.':'بدون حمایت، در شاخهٔ فرضی سناریو اکسیژناسیون بدتر شد؛ رسیدگی فوری را در اولویت قرار دهید.';level='warn';break;
 case 'discharge':s.ended=true;s.reason='تصمیم نیازمند بازنگری: ترخیص بیمار ناپایدار';feedback='با افت اکسیژن، تنفس تند و نیاز به حمایت، این بیمار برای ترخیص معمول مناسب نیست. تمرین متوقف شد تا تصمیم و علائم ناپایداری را مرور کنید.';level='danger';break;
 }
 if(finding)s.findings.push({id,label:a.label,text:finding});
 s.events.push({id,minute:s.minute,startedAt:priorMinute,label:a.label,text:feedback,level});s.history.push({minute:s.minute,spo2:s.vitals.spo2,hr:s.vitals.hr});
 if(!s.ended&&s.minute>=30){s.ended=true;s.reason='پایان بازهٔ آموزشی ۳۰دقیقه‌ای';feedback+=' بازهٔ تمرین تمام شد؛ گزارش تصمیم‌ها را مرور کنید.'}
 s.last=feedback;s.level=level;return s}
function report(s){const essential=['assess','oxygen','senior','history','exam','xray','diagnosis','antibiotic','reassess'];const completed=essential.filter(id=>s.used.includes(id));const earlyOxygen=s.events.find(e=>e.id==='oxygen');return {completed:completed.length,total:essential.length,missing:essential.filter(id=>!s.used.includes(id)).map(id=>catalog[id].label),earlySupport:!!earlyOxygen&&earlyOxygen.startedAt<=5,unnecessaryCT:s.used.includes('ct'),unsafeDischarge:s.used.includes('discharge')}}
return {catalog,initial,act,report};
})();

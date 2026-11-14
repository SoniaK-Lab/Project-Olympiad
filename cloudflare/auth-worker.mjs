import { authPage, dashboardPage } from './pages.mjs';
const MAX_AGE=604800, PENDING_AGE=900;
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const html=content=>new Response(content,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Content-Security-Policy':"frame-ancestors 'none'; base-uri 'self'; form-action 'self'"}});
const redirect=location=>new Response(null,{status:303,headers:{Location:location,'Cache-Control':'no-store'}});
const hex=bytes=>Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,'0')).join('');
const random=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
const digest=async value=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
const fail=(status,message)=>{throw Object.assign(new Error(message),{status})};
export function nationalCode(value){
 if(typeof value!=='string')fail(400,'کد ملی ۱۰ رقمی را وارد کنید.');
 const code=value.trim().replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776)).replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632));
 if(!/^\d{10}$/.test(code)||/^(\d)\1{9}$/.test(code))fail(400,'کد ملی معتبر نیست.');
 const sum=[...code.slice(0,9)].reduce((a,c,i)=>a+Number(c)*(10-i),0)%11;
 if(Number(code[9])!==(sum<2?sum:11-sum))fail(400,'کد ملی معتبر نیست.');return code;
}
async function passwordHash(password,salt){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:100000,hash:'SHA-256'},key,256));}
function equal(a,b){let d=a.length^b.length;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^(b.charCodeAt(i)||0);return d===0;}
const cookieName=(request,pending=false)=>`${new URL(request.url).protocol==='https:'?'__Host-':''}cb_${pending?'pending':'session'}`;
function token(request,pending=false){const cookies=(request.headers.get('cookie')||'').split(';').map(s=>s.trim());for(const name of [cookieName(request,pending),pending?'cb_pending':'cb_session']){const value=cookies.find(s=>s.startsWith(name+'='))?.slice(name.length+1);if(/^[a-f0-9]{64}$/.test(value||''))return value;}return null;}
function cookie(request,value,age=MAX_AGE,pending=false){return `${cookieName(request,pending)}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${new URL(request.url).protocol==='https:'?'; Secure':''}`;}
async function limited(db,key,max){const bucket=Math.floor(Date.now()/900000);await db.prepare('INSERT INTO cb_auth_limits(key,bucket,count) VALUES(?,?,1) ON CONFLICT(key,bucket) DO UPDATE SET count=count+1').bind(await digest(key),bucket).run();const r=await db.prepare('SELECT count FROM cb_auth_limits WHERE key=? AND bucket=?').bind(await digest(key),bucket).first();if(r.count>max)fail(429,'تعداد تلاش‌ها زیاد است؛ ۱۵ دقیقه بعد دوباره امتحان کنید.');}
async function readBody(request){if(request.headers.get('origin')!==new URL(request.url).origin)fail(403,'مبدأ درخواست مجاز نیست.');if(!request.headers.get('content-type')?.includes('application/json'))fail(415,'درخواست باید JSON باشد.');const raw=await request.text();if(raw.length>4096)fail(413,'اطلاعات فرم بیش از حد طولانی است.');let data;try{data=JSON.parse(raw)}catch{fail(400,'اطلاعات فرم معتبر نیست.')}if(!data||typeof data!=='object'||Array.isArray(data))fail(400,'اطلاعات فرم معتبر نیست.');return data;}
async function session(request,db){const value=token(request);if(!value)return null;return db.prepare('SELECT a.id AS account_id,a.identity,a.email,a.name,a.national_id,a.verified_at,m.id AS member_id,m.role,m.mentor_id,m.name AS member_name FROM cb_sessions s JOIN cb_accounts a ON a.id=s.account_id JOIN members m ON m.identity=a.identity WHERE s.token_hash=? AND s.expires>? AND a.verified_at IS NOT NULL').bind(await digest(value),Date.now()).first();}
async function startSession(request,db,accountId,response){const value=random();await db.prepare('INSERT INTO cb_sessions(token_hash,account_id,expires) VALUES(?,?,?)').bind(await digest(value),accountId,Date.now()+MAX_AGE*1000).run();response.headers.append('Set-Cookie',cookie(request,value));response.headers.append('Set-Cookie',cookie(request,'',0,true));return response;}
async function pending(request,db){const value=token(request,true);if(!value)return null;return db.prepare('SELECT * FROM cb_pending_signups WHERE token_hash=? AND expires>? AND used=0').bind(await digest(value),Date.now()).first();}
async function signup(request,env){
 const data=await readBody(request),db=env.DB;await limited(db,'signup:ip:'+(request.headers.get('CF-Connecting-IP')||'local'),10);
 await db.batch([db.prepare('DELETE FROM cb_pending_signups WHERE expires<?').bind(Date.now()),db.prepare('DELETE FROM cb_auth_limits WHERE bucket<?').bind(Math.floor(Date.now()/900000)-2)]);
 const role=data.role??'student';if(!['student','mentor'].includes(role))fail(400,'نقش معتبر انتخاب کنید: دانشجو یا منتور.');
 const nationalId=nationalCode(data.nationalId),email=typeof data.email==='string'?data.email.trim().toLowerCase():'';
 if(email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email))fail(400,'ایمیل معتبر وارد کنید.');
 const password=data.password;if(typeof password!=='string'||password.length<8||password.length>128)fail(400,'رمز عبور باید بین ۸ تا ۱۲۸ نویسه باشد.');if(password!==data.confirmPassword)fail(400,'رمز عبور و تکرار آن یکسان نیستند.');
 await limited(db,'signup:email:'+email,5);
 if(await db.prepare('SELECT id FROM cb_accounts WHERE national_id=? OR (email=? AND national_id IS NOT NULL)').bind(nationalId,email).first())fail(409,'برای این کد ملی یا ایمیل قبلاً حساب ساخته شده است؛ وارد شوید.');
 const value=random(),salt=random(),hash=await passwordHash(password,salt);
 await db.prepare('INSERT INTO cb_pending_signups(token_hash,national_id,email,password_hash,salt,expires,used,role) VALUES(?,?,?,?,?,?,0,?)').bind(await digest(value),nationalId,email,hash,salt,Date.now()+PENDING_AGE*1000,role).run();
 const result=json({ok:true,verificationRequired:true,redirect:'/verify-email'},202);result.headers.append('Set-Cookie',cookie(request,value,PENDING_AGE,true));return result;
}
async function login(request,env){const data=await readBody(request),db=env.DB;await limited(db,'login:ip:'+(request.headers.get('CF-Connecting-IP')||'local'),40);const code=nationalCode(data.nationalId);await limited(db,'login:account:'+code,10);if(typeof data.password!=='string'||data.password.length<8||data.password.length>128)fail(401,'کد ملی یا رمز عبور اشتباه است.');const a=await db.prepare('SELECT * FROM cb_accounts WHERE national_id=?').bind(code).first();const hash=await passwordHash(data.password,a?.salt||'clinical-bridge-dummy-salt');if(!a||!equal(hash,a.password_hash))fail(401,'کد ملی یا رمز عبور اشتباه است.');if(!a.verified_at)fail(403,'ابتدا ایمیل حساب را تأیید کنید.');return startSession(request,db,a.id,json({ok:true,redirect:'/dashboard'}));}
async function accessCallback(request,env,runtime){
 const assertion=request.headers.get('Cf-Access-Jwt-Assertion');if(!assertion)fail(401,'تأیید ایمیل انجام نشد؛ دوباره از دکمهٔ تأیید استفاده کنید.');
 let user;try{user=await runtime.verifyAccessToken(assertion,env)}catch{fail(401,'تأیید ایمیل معتبر نیست یا منقضی شده است.');}
 const db=env.DB,signup=await pending(request,db),email=user.email.toLowerCase(),now=new Date().toISOString();
 if(signup){
  if(email!==signup.email)return html(authPage('verify',{email:signup.email,error:'ایمیل تأییدشده با ایمیل فرم یکسان نیست. از حساب Cloudflare خارج شوید و همان ایمیل ثبت‌شده را تأیید کنید.',mismatch:true}));
  const claim=await db.prepare('UPDATE cb_pending_signups SET used=1 WHERE token_hash=? AND used=0 AND expires>? RETURNING token_hash').bind(signup.token_hash,Date.now()).first();if(!claim)fail(409,'درخواست تأیید قبلاً استفاده شده یا منقضی شده است.');
  let account=await db.prepare('SELECT * FROM cb_accounts WHERE email=?').bind(email).first();
  if(account?.national_id)fail(409,'برای این ایمیل قبلاً حساب ساخته شده است؛ از ورود استفاده کنید.');
  let member=await db.prepare('SELECT * FROM members WHERE lower(email)=?').bind(email).first();
  const identity=member?.identity||account?.identity||user.userId;
  const statements=[];
  if(!member){member={id:crypto.randomUUID(),identity,name:email.split('@')[0]};statements.push(db.prepare("INSERT INTO members(id,identity,email,name,role,created) VALUES(?,?,?,?,?,?)").bind(member.id,identity,email,member.name,signup.role==='mentor'?'mentor':'student',now));}
  else if(!member.identity)statements.push(db.prepare('UPDATE members SET identity=? WHERE id=? AND identity IS NULL').bind(identity,member.id));
  if(account)statements.push(db.prepare('UPDATE cb_accounts SET national_id=?,password_hash=?,salt=?,verified_at=?,identity=? WHERE id=? AND national_id IS NULL').bind(signup.national_id,signup.password_hash,signup.salt,now,identity,account.id));
  else{account={id:crypto.randomUUID()};statements.push(db.prepare('INSERT INTO cb_accounts(id,identity,email,name,password_hash,salt,created,national_id,verified_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(account.id,identity,email,member.name,signup.password_hash,signup.salt,now,signup.national_id,now));}
  try{await db.batch(statements)}catch(e){if(String(e).includes('UNIQUE constraint'))fail(409,'برای این کد ملی یا ایمیل حساب ساخته شده است؛ وارد شوید.');throw e;}
  return startSession(request,db,account.id,redirect('/dashboard'));
 }
 // Existing members retain their role; a bare Access login cannot enroll a new member.
 const member=await db.prepare('SELECT * FROM members WHERE lower(email)=?').bind(email).first();
 if(!member)return redirect('/signup?notice=register');
 let account=await db.prepare('SELECT * FROM cb_accounts WHERE email=?').bind(email).first();
 const identity=member.identity||user.userId;
 if(!member.identity)await db.prepare('UPDATE members SET identity=? WHERE id=? AND identity IS NULL').bind(identity,member.id).run();
 if(!account){const salt=random();account={id:crypto.randomUUID()};await db.prepare('INSERT INTO cb_accounts(id,identity,email,name,password_hash,salt,created,verified_at) VALUES(?,?,?,?,?,?,?,?)').bind(account.id,identity,email,member.name,await passwordHash(random(),salt),salt,now,now).run();}
 else await db.prepare('UPDATE cb_accounts SET verified_at=? WHERE id=?').bind(now,account.id).run();
 return startSession(request,db,account.id,redirect('/dashboard'));
}
async function dashboard(member,db){
 const role=member.role,scope=role==='admin'?'1=1':role==='mentor'?'mentor_id=?':'student_id=?';
 const select=(query,...args)=>db.prepare(query).bind(...(role==='admin'?[]:[member.member_id]),...args);
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
 const part=key=>parts.find(p=>p.type===key).value;
 const today=part('year')+'-'+part('month')+'-'+part('day'),time=part('hour')+':'+part('minute');
 const future="(date>? OR (date=? AND time>=?))";
 const [s,a,sessionCounts,assignmentCounts,mentor]=await Promise.all([
  select('SELECT id,date,time,goal,confirmed FROM sessions WHERE '+scope+' AND '+future+' ORDER BY date,time LIMIT 4',today,today,time).all(),
  select('SELECT id,title,status FROM assignments WHERE '+scope+' ORDER BY updated DESC LIMIT 4').all(),
  db.prepare('SELECT count(*) AS total,sum(CASE WHEN '+future+' THEN 1 ELSE 0 END) AS upcoming FROM sessions WHERE '+scope).bind(today,today,time,...(role==='admin'?[]:[member.member_id])).first(),
  select("SELECT count(*) AS total,sum(CASE WHEN status<>'approved' THEN 1 ELSE 0 END) AS pending FROM assignments WHERE "+scope).first(),
  member.mentor_id?db.prepare('SELECT name FROM members WHERE id=?').bind(member.mentor_id).first():null
 ]);
 const count=role==='admin'?await db.prepare('SELECT count(*) AS n FROM members').first():role==='mentor'?await db.prepare("SELECT count(*) AS n FROM members WHERE mentor_id=? AND role='student'").bind(member.member_id).first():null;
 return {profile:{name:member.member_name,email:member.email,role,emailVerified:true,nationalIdSet:!!member.national_id,mentor:mentor?.name||null},stats:{sessions:sessionCounts.total,upcoming:sessionCounts.upcoming||0,assignments:assignmentCounts.total,pending:assignmentCounts.pending||0,members:count?.n??null},upcoming:s.results,assignments:a.results};
}
export function createWorker(runtime){return {async fetch(request,env,ctx){const url=new URL(request.url),path=url.pathname;try{
 if(path==='/healthz')return json({service:'clinical-bridge',hosting:'cloudflare',authentication:'national-id-password',emailVerification:'cloudflare-access-otp',database:!!env.DB});
 if(Object.hasOwn(runtime.assets,path))return runtime.fetchAsset(request);
 if(path==='/api/local-auth/signup'&&request.method==='POST')return await signup(request,env);
 if(path==='/api/local-auth/login'&&request.method==='POST')return await login(request,env);
 if(['/logout','/api/local-auth/logout','/api/auth/logout'].includes(path)&&request.method==='POST'){
  if(request.headers.get('origin')!==url.origin)fail(403,'مبدأ درخواست مجاز نیست.');const value=token(request);if(value)await env.DB.prepare('DELETE FROM cb_sessions WHERE token_hash=?').bind(await digest(value)).run();
  const out=json({ok:true,redirect:'/login'});out.headers.append('Set-Cookie',cookie(request,'',0));out.headers.append('Set-Cookie','cb_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');out.headers.append('Set-Cookie',cookie(request,'',0,true));return out;
 }
 if(path==='/logout'&&request.method==='GET')return html(authPage('logout'));
 if(path==='/access-login')return await accessCallback(request,env,runtime);
 if(path==='/verify-email'){const p=await pending(request,env.DB);return p?html(authPage('verify',{email:p.email})):html(authPage('signup',{error:'درخواست تأیید منقضی شده است؛ دوباره ثبت‌نام کنید.'}));}
 if(['/', '/login','/signup'].includes(path)){
  const member=await session(request,env.DB);if(member&&path!=='/signup')return redirect('/dashboard');return html(authPage(path==='/signup'?'signup':path==='/login'?'login':'home'));
 }
 const member=await session(request,env.DB);if(!member)return path.startsWith('/api/')?json({error:'برای ادامه وارد حساب شوید.'},401):redirect('/login');
 if(path==='/dashboard')return html(dashboardPage());
 if(path==='/api/dashboard'&&request.method==='GET')return json(await dashboard(member,env.DB));
 // The established clinical backend runs with a server-created identity, never client-supplied headers.
 const headers=new Headers(request.headers);for(const key of [...headers.keys()])if(key.startsWith('oai-authenticated-'))headers.delete(key);
 const identity={userId:member.identity,email:member.email,displayName:member.member_name,fullName:member.member_name};
 const result=await runtime.identityContext.run(identity,()=>runtime.appHandler.fetch(new Request(request,{headers}),{...env,ASSETS:{fetch:runtime.fetchAsset}},ctx));
 if(path==='/ui'&&result.headers.get('content-type')?.includes('text/html')){
  const script=`<script>document.addEventListener('click',async e=>{const a=e.target.closest('a[href^="/logout"]');if(!a)return;e.preventDefault();const r=await fetch('/api/local-auth/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});if(r.ok)location.assign('/login')});const dashboardLink=document.createElement('a');dashboardLink.href='/dashboard';dashboardLink.textContent='داشبورد ←';dashboardLink.style.cssText='display:inline-block;margin:12px;color:#356a91;font:12px Vazir,Tahoma,sans-serif';document.querySelector('aside')?.append(dashboardLink);const view=new URL(location.href).searchParams.get('view');if(view){let tries=0;const timer=setInterval(()=>{if(typeof serverReady!=='undefined'&&serverReady&&typeof navigate==='function'){clearInterval(timer);const id=view==='backpack'?'crisis-backpack':view;if(document.getElementById(id))navigate(id)}else if(++tries>100)clearInterval(timer)},100)}</script>`;
  const content=(await result.text()).replace('</body>',script+'</body>');const out=new Headers(result.headers);out.delete('content-length');return new Response(content,{status:result.status,headers:out});
 }return result;
 }catch(e){return json({error:e.status?e.message:'ارتباط با سامانه برقرار نشد؛ دوباره تلاش کنید.'},e.status||500)}}};}

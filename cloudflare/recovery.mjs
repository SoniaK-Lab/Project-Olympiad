import { recoveryPage } from './pages.mjs';

export function createRecovery({json,html,redirect,fail,readBody,limited,normalizeCode,nationalCode,passwordHash,random,digest}){
 const age=900;
 const name=request=>(new URL(request.url).protocol==='https:'?'__Host-':'')+'cb_recovery';
 const cookie=(request,value,maxAge=age)=>`${name(request)}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${new URL(request.url).protocol==='https:'?'; Secure':''}`;
 const token=request=>{const value=(request.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(name(request)+'='))?.slice(name(request).length+1);return /^[a-f0-9]{64}$/.test(value||'')?value:null};
 async function get(request,db){const value=token(request);return value?db.prepare('SELECT * FROM cb_password_resets WHERE token_hash=? AND expires>?').bind(await digest(value),Date.now()).first():null}
 async function account(row,env){if(!row?.account_id)return null;const a=await env.DB.prepare('SELECT a.*,m.role AS member_role FROM cb_accounts a JOIN members m ON m.identity=a.identity WHERE a.id=? AND a.national_id=? AND lower(a.email)=? AND a.password_hash=? AND a.verified_at IS NOT NULL').bind(row.account_id,row.national_id,row.email,row.credential_hash).first();return a&&(row.national_id!==env.ADMIN_LOGIN_CODE||a.member_role==='admin')?a:null}
 const clearCookie=(request,response)=>response.headers.append('Set-Cookie',cookie(request,'',0));
 async function start(request,env){
  const data=await readBody(request),db=env.DB;
  await limited(db,'recovery:ip:'+(request.headers.get('CF-Connecting-IP')||'local'),10);
  const raw=normalizeCode(data.nationalId),alias=typeof env.ADMIN_LOGIN_CODE==='string'&&raw===env.ADMIN_LOGIN_CODE;
  const code=alias?raw:nationalCode(data.nationalId),email=typeof data.email==='string'?data.email.trim().toLowerCase():'';
  if(email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email))fail(400,'ایمیل معتبر وارد کنید.');
  await limited(db,'recovery:account:'+code+':'+email,5);
  await db.prepare('DELETE FROM cb_password_resets WHERE expires<?').bind(Date.now()).run();
  const a=await db.prepare('SELECT a.id,a.password_hash,m.role FROM cb_accounts a JOIN members m ON m.identity=a.identity WHERE a.national_id=? AND lower(a.email)=? AND a.verified_at IS NOT NULL').bind(code,email).first();
  const eligible=a&&(!alias||a.role==='admin'),value=random();
  // Dummy challenges keep responses identical for unknown or blocked accounts.
  await db.prepare('INSERT INTO cb_password_resets(token_hash,account_id,national_id,email,credential_hash,expires) VALUES(?,?,?,?,?,?)').bind(await digest(value),eligible?a.id:null,code,email,eligible?a.password_hash:null,Date.now()+age*1000).run();
  const out=json({ok:true,redirect:'/forgot-password/verify'},202);out.headers.append('Set-Cookie',cookie(request,value));out.headers.append('Set-Cookie',`${new URL(request.url).protocol==='https:'?'__Host-':''}cb_pending=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${new URL(request.url).protocol==='https:'?'; Secure':''}`);return out;
 }
 async function verify(request,env,runtime){
  const row=await get(request,env.DB);if(!row)return redirect('/forgot-password?expired=1');
  if(row.verified_at)return redirect('/reset-password');
  const assertion=request.headers.get('Cf-Access-Jwt-Assertion');let user;
  try{if(!assertion)throw Error();user=await runtime.verifyAccessToken(assertion,env)}catch{fail(401,'تأیید ایمیل معتبر نیست یا منقضی شده است.');}
  const a=await account(row,env);
  if(!a||typeof user?.email!=='string'||user.email.toLowerCase()!==row.email)return html(recoveryPage('verify',{error:'بازیابی تأیید نشد. ایمیل باید همان ایمیل ثبت‌شده برای این کد ملی باشد.',mismatch:true}));
  const grant=random(),now=Date.now(),expires=Math.min(row.expires,now+600000);
  const claimed=await env.DB.prepare('UPDATE cb_password_resets SET token_hash=?,verified_at=?,expires=? WHERE token_hash=? AND verified_at IS NULL AND expires>? RETURNING account_id').bind(await digest(grant),now,expires,row.token_hash,now).first();
  if(!claimed)fail(409,'درخواست تأیید استفاده شده یا منقضی شده است.');
  const out=redirect('/reset-password');out.headers.append('Set-Cookie',cookie(request,grant,Math.max(1,Math.floor((expires-now)/1000))));return out;
 }
 async function finish(request,env){
  const data=await readBody(request),db=env.DB,row=await get(request,db);
  await limited(db,'recovery:finish:ip:'+(request.headers.get('CF-Connecting-IP')||'local'),15);
  if(!row?.verified_at||!await account(row,env))fail(400,'درخواست بازیابی معتبر نیست؛ بازیابی رمز را دوباره شروع کنید.');
  const password=data.password;if(typeof password!=='string'||password.length<8||password.length>128)fail(400,'رمز عبور باید بین ۸ تا ۱۲۸ نویسه باشد.');if(password!==data.confirmPassword)fail(400,'رمز عبور و تکرار آن یکسان نیستند.');
  const salt=random(),hash=await passwordHash(password,salt),now=Date.now();
  // Conditional update and revocations execute in one D1 transaction; racing replays cannot change the password twice.
  const changed=await db.batch([
   db.prepare('UPDATE cb_accounts SET password_hash=?,salt=? WHERE id=? AND password_hash=? AND national_id=? AND lower(email)=? AND verified_at IS NOT NULL AND EXISTS(SELECT 1 FROM cb_password_resets WHERE token_hash=? AND account_id=? AND verified_at IS NOT NULL AND expires>?)').bind(hash,salt,row.account_id,row.credential_hash,row.national_id,row.email,row.token_hash,row.account_id,now),
   db.prepare('DELETE FROM cb_sessions WHERE account_id=? AND EXISTS(SELECT 1 FROM cb_accounts WHERE id=? AND password_hash=?)').bind(row.account_id,row.account_id,hash),
   db.prepare('DELETE FROM cb_password_resets WHERE account_id=? AND EXISTS(SELECT 1 FROM cb_accounts WHERE id=? AND password_hash=?)').bind(row.account_id,row.account_id,hash)
  ]);
  if(changed[0].meta.changes!==1)fail(409,'درخواست بازیابی استفاده شده یا منقضی شده است.');
  const out=json({ok:true,redirect:'/login?reset=success'});clearCookie(request,out);return out;
 }
 return {start,verify,finish,get,hasCookie:request=>!!token(request),clearCookie};
}

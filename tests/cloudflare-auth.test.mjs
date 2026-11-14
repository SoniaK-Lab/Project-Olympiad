import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createWorker,nationalCode} from '../cloudflare/auth-worker.mjs';
import {authPage,dashboardPage,recoveryPage} from '../cloudflare/pages.mjs';
import assert from 'node:assert/strict';
import {Script} from 'node:vm';
const sql=new DatabaseSync(':memory:');
for(const f of ['0000_tiny_dracula','0001_tired_mimic','0002_unusual_sunspot','0003_third_maestro'])sql.exec(readFileSync('drizzle/'+f+'.sql','utf8').replaceAll('--> statement-breakpoint',''));
sql.exec(`CREATE TABLE cb_accounts(id TEXT PRIMARY KEY,identity TEXT UNIQUE NOT NULL,email TEXT UNIQUE NOT NULL COLLATE NOCASE,name TEXT NOT NULL,password_hash TEXT NOT NULL,salt TEXT NOT NULL,created TEXT NOT NULL);CREATE TABLE cb_sessions(token_hash TEXT PRIMARY KEY,account_id TEXT NOT NULL REFERENCES cb_accounts(id),expires INTEGER NOT NULL);CREATE TABLE cb_auth_limits(key TEXT,bucket INTEGER,count INTEGER,PRIMARY KEY(key,bucket));`);
sql.exec(readFileSync('cloudflare/migrations/0001_national_email_auth.sql','utf8'));
sql.exec(readFileSync('cloudflare/migrations/0002_signup_roles.sql','utf8'));
sql.exec(readFileSync('cloudflare/migrations/0003_password_recovery.sql','utf8'));
const DB={prepare(query){let params=[];return {bind(...p){params=p;return this},async first(){return sql.prepare(query).get(...params)||null},async all(){return {results:sql.prepare(query).all(...params)}},async run(){return {meta:{changes:Number(sql.prepare(query).run(...params).changes)}}}}},async batch(statements){sql.exec('BEGIN');try{const result=[];for(const s of statements)result.push(await s.run());sql.exec('COMMIT');return result}catch(e){sql.exec('ROLLBACK');throw e}}};
let verifiedEmail='learner@example.test',cookie='',contextIdentity=null,passedHeaders=null;
const worker=createWorker({assets:{},fetchAsset:async()=>new Response('asset'),verifyAccessToken:async assertion=>{if(assertion!=='valid-signed-otp')throw Error('bad token');return {email:verifiedEmail,userId:'cf-access:'+verifiedEmail}},identityContext:{run:async(identity,fn)=>{contextIdentity=identity;return fn()}},appHandler:{fetch:async r=>{passedHeaders=r.headers;return new Response('<html><body><aside></aside><main>Clinical workspace</main></body></html>',{headers:{'Content-Type':'text/html'}})}}});
const env={DB};const ctx={waitUntil(){}};
async function req(path,method='GET',data,extra={}){return worker.fetch(new Request('https://test.local'+path,{method,headers:{cookie,origin:'https://test.local','content-type':'application/json',...extra},body:method==='POST'?JSON.stringify(data??{}):undefined}),env,ctx)}
const cookies=r=>r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
const code=n=>{const s=String(n).padStart(9,'0'),v=[...s].reduce((a,c,i)=>a+Number(c)*(10-i),0)%11;return s+(v<2?v:11-v)};
const password='test-password-123',id=code(12345678),ownerId=code(12345679);
assert.equal(nationalCode(id.replace(/\d/g,c=>'۰۱۲۳۴۵۶۷۸۹'[Number(c)])),id);assert.throws(()=>nationalCode('1111111111'));
let r=await req('/api/dashboard');assert.equal(r.status,401);
r=await req('/api/local-auth/signup','POST',{nationalId:id,email:verifiedEmail,password,confirmPassword:'wrong'});assert.equal(r.status,400);
r=await req('/api/local-auth/signup','POST',{nationalId:id,email:verifiedEmail,password,confirmPassword:password},{origin:'https://evil.test'});assert.equal(r.status,403);
r=await req('/api/local-auth/signup','POST',{nationalId:id,email:verifiedEmail,password,confirmPassword:password,role:'admin'});assert.equal(r.status,400);
r=await req('/api/local-auth/signup','POST',{nationalId:id,email:verifiedEmail,password,confirmPassword:password,role:'student'});assert.equal(r.status,202);assert.equal((await r.json()).verificationRequired,true);cookie=cookies(r);assert.match(r.headers.get('set-cookie'),/HttpOnly/);assert.match(r.headers.get('set-cookie'),/Secure/);
assert.equal(sql.prepare('SELECT count(*) AS n FROM members').get().n,0);assert.equal(sql.prepare('SELECT count(*) AS n FROM cb_accounts').get().n,0);assert.notEqual(sql.prepare('SELECT password_hash FROM cb_pending_signups').get().password_hash,password);
r=await req('/dashboard');assert.equal(r.status,303);assert.equal(r.headers.get('location'),'/login');
r=await req('/access-login','GET',null,{'Cf-Access-Jwt-Assertion':'forged'});assert.equal(r.status,401);
verifiedEmail='other@example.test';r=await req('/access-login','GET',null,{'Cf-Access-Jwt-Assertion':'valid-signed-otp'});assert.equal(r.status,200);assert.match(await r.text(),/یکسان نیست/);assert.equal(sql.prepare('SELECT count(*) AS n FROM cb_accounts').get().n,0);
verifiedEmail='learner@example.test';r=await req('/access-login','GET',null,{'Cf-Access-Jwt-Assertion':'valid-signed-otp'});assert.equal(r.status,303);assert.equal(r.headers.get('location'),'/dashboard');cookie=cookies(r);
assert.equal(sql.prepare('SELECT role FROM members').get().role,'student');assert.ok(sql.prepare('SELECT verified_at FROM cb_accounts').get().verified_at);
r=await req('/api/dashboard');assert.equal(r.status,200);let summary=await r.json();assert.equal(summary.profile.emailVerified,true);assert.equal(summary.stats.sessions,0);assert.equal(summary.profile.mentor,null);
r=await req('/dashboard');assert.equal(r.status,303);assert.equal(r.headers.get('location'),'/ui?view=overview');
r=await req('/dashboard?embedded=1');assert.equal(r.status,200);assert.match(r.headers.get('Content-Security-Policy'),/frame-ancestors 'self'/);const embedded=await r.text();assert.match(embedded,/<base target="_top">/);assert.match(embedded,/bridge-dashboard-height/);
r=await req('/ui?view=sessions','GET',null,{'oai-authenticated-user-id':'forged-admin'});assert.equal(r.status,200);assert.equal(passedHeaders.get('oai-authenticated-user-id'),null);assert.equal(contextIdentity.email,'learner@example.test');assert.match(await r.text(),/داشبورد/);
r=await req('/api/local-auth/logout','POST');assert.equal(r.status,200);r=await req('/api/dashboard');assert.equal(r.status,401);cookie='';
r=await req('/api/local-auth/login','POST',{nationalId:id,password:'wrong password'});assert.equal(r.status,401);
r=await req('/api/local-auth/login','POST',{nationalId:id,password});assert.equal(r.status,200);cookie=cookies(r);assert.equal((await req('/api/dashboard')).status,200);
// Email identity proof cannot start a login, even for an existing account.
r=await req('/access-login','GET',null,{'Cf-Access-Jwt-Assertion':'valid-signed-otp'});assert.equal(r.status,403);
assert.ok(!authPage('login').includes('/access-login'));
// Previously issued sessions stop working as soon as their account has no national ID.
const currentAccount=sql.prepare('SELECT id FROM cb_accounts WHERE national_id=?').get(id).id;
for(const missing of [null,'','   ']){sql.prepare('UPDATE cb_accounts SET national_id=? WHERE id=?').run(missing,currentAccount);assert.equal((await req('/api/dashboard')).status,401);assert.equal((await req('/ui')).headers.get('location'),'/login');assert.equal((await req('/dashboard?embedded=1')).headers.get('location'),'/login');}
sql.prepare('UPDATE cb_accounts SET national_id=? WHERE id=?').run(id,currentAccount);assert.equal((await req('/api/dashboard')).status,200);
sql.prepare('UPDATE cb_accounts SET verified_at=NULL WHERE national_id=?').run(id);r=await req('/api/local-auth/login','POST',{nationalId:id,password});assert.equal(r.status,403);assert.equal((await req('/api/dashboard')).status,401);sql.prepare('UPDATE cb_accounts SET verified_at=?').run('now');cookie='';
// Existing administrators migrate by proved email and keep their member id and role.
sql.prepare("INSERT INTO members(id,identity,email,name,role,created) VALUES('owner','existing-owner','owner@example.test','Owner','admin','now')").run();verifiedEmail='owner@example.test';
r=await req('/api/local-auth/signup','POST',{nationalId:ownerId,email:verifiedEmail,password,confirmPassword:password});assert.equal(r.status,202);cookie=cookies(r);r=await req('/access-login','GET',null,{'Cf-Access-Jwt-Assertion':'valid-signed-otp'});assert.equal(r.status,303);cookie=cookies(r);summary=await(await req('/api/dashboard')).json();assert.equal(summary.profile.role,'admin');assert.equal(sql.prepare("SELECT identity FROM members WHERE id='owner'").get().identity,'existing-owner');
// Data from another student is omitted even if the caller asks for an admin view.
const student=sql.prepare("SELECT id FROM members WHERE role='student'").get().id;
sql.prepare("INSERT INTO members(id,email,name,role,created) VALUES('mentor','mentor@example.test','Mentor','mentor','now'),('other','other@example.test','Other','student','now')").run();
sql.prepare("INSERT INTO sessions(id,mentor_id,student_id,date,time,goal,created) VALUES('mine','mentor',?,'2099-01-01','12:00','My session','now'),('theirs','mentor','other','2099-01-01','13:00','Private other session','now')").run(student);
cookie='';r=await req('/api/local-auth/login','POST',{nationalId:id,password});cookie=cookies(r);summary=await(await req('/api/dashboard','GET',null,{'X-Bridge-View-As':'owner'})).json();assert.equal(summary.stats.sessions,1);assert.equal(summary.upcoming[0].id,'mine');
// Expired pending registrations cannot create accounts, even with a verified different email.
cookie='';verifiedEmail='new@example.test';r=await req('/api/local-auth/signup','POST',{nationalId:code(12345680),email:verifiedEmail,password,confirmPassword:password});cookie=cookies(r);sql.prepare('UPDATE cb_pending_signups SET expires=0').run();r=await req('/access-login','GET',null,{'Cf-Access-Jwt-Assertion':'valid-signed-otp'});assert.equal(r.status,403);assert.equal(sql.prepare('SELECT id FROM cb_accounts WHERE email=?').get(verifiedEmail),undefined);
// The selected mentor role is stored before verification and applied only to a new verified member.
cookie='';verifiedEmail='new-mentor@example.test';r=await req('/api/local-auth/signup','POST',{nationalId:code(12345681),email:verifiedEmail,password,confirmPassword:password,role:'mentor'});assert.equal(r.status,202);cookie=cookies(r);assert.equal(sql.prepare('SELECT role FROM cb_pending_signups WHERE email=?').get(verifiedEmail).role,'mentor');assert.equal(sql.prepare('SELECT id FROM members WHERE email=?').get(verifiedEmail),undefined);
r=await req('/access-login','GET',null,{'Cf-Access-Jwt-Assertion':'valid-signed-otp'});assert.equal(r.status,303);cookie=cookies(r);summary=await(await req('/api/dashboard')).json();assert.equal(summary.profile.role,'mentor');assert.equal(summary.stats.members,0);assert.equal(summary.stats.sessions,0);
assert.match(authPage('signup'),/name="role"/);assert.match(authPage('signup'),/value="student"/);assert.match(authPage('signup'),/value="mentor"/);
// An operator-configured alias can only log into an already provisioned administrator.
cookie='';env.ADMIN_LOGIN_CODE='1111111111';
sql.prepare('UPDATE cb_accounts SET national_id=? WHERE email=?').run(env.ADMIN_LOGIN_CODE,'owner@example.test');
r=await req('/api/local-auth/login','POST',{nationalId:'۱۱۱۱۱۱۱۱۱۱',password});assert.equal(r.status,200);cookie=cookies(r);assert.equal((await(await req('/api/dashboard')).json()).profile.role,'admin');cookie='';
r=await req('/api/local-auth/login','POST',{nationalId:env.ADMIN_LOGIN_CODE,password:'wrong password'});assert.equal(r.status,401);
sql.prepare("UPDATE members SET role='mentor' WHERE id='owner'").run();r=await req('/api/local-auth/login','POST',{nationalId:env.ADMIN_LOGIN_CODE,password});assert.equal(r.status,401);sql.prepare("UPDATE members SET role='admin' WHERE id='owner'").run();
delete env.ADMIN_LOGIN_CODE;r=await req('/api/local-auth/login','POST',{nationalId:'1111111111',password});assert.equal(r.status,400);
r=await req('/api/local-auth/signup','POST',{nationalId:'1111111111',email:'alias-claim@example.test',password,confirmPassword:password});assert.equal(r.status,400);
sql.prepare('UPDATE cb_accounts SET national_id=? WHERE email=?').run(ownerId,'owner@example.test');
// Recovery cannot disclose the email, bypass identity proof, revive blocked accounts, or reuse a grant.
cookie='';verifiedEmail='learner@example.test';
r=await req('/api/local-auth/login','POST',{nationalId:id,password});assert.equal(r.status,200);const previousSession=cookies(r);
r=await req('/api/local-auth/forgot-password','POST',{nationalId:id,email:verifiedEmail},{origin:'https://evil.test'});assert.equal(r.status,403);
cookie='';r=await req('/api/local-auth/forgot-password','POST',{nationalId:code(33333334),email:'unknown@example.test'});assert.equal(r.status,202);const unknownResponse=await r.json();assert.ok(!JSON.stringify(unknownResponse).includes('unknown@example.test'));cookie=cookies(r);r=await req('/access-login','GET',null,{'Cf-Access-Jwt-Assertion':'valid-signed-otp'});assert.equal(r.status,200);assert.match(await r.text(),/بازیابی تأیید نشد/);assert.equal((await req('/reset-password')).status,303);
// Expired challenges never permit selecting a new password.
cookie='';r=await req('/api/local-auth/forgot-password','POST',{nationalId:id,email:verifiedEmail});cookie=cookies(r);sql.prepare('UPDATE cb_password_resets SET expires=0').run();assert.equal((await req('/access-login','GET',null,{'Cf-Access-Jwt-Assertion':'valid-signed-otp'})).headers.get('location'),'/forgot-password?expired=1');
// A correct request still cannot reset without a matching signed email.
cookie='';r=await req('/api/local-auth/forgot-password','POST',{nationalId:id,email:verifiedEmail});assert.deepEqual(await r.json(),unknownResponse);cookie=cookies(r);const challengeCookie=cookie;
assert.equal((await req('/api/local-auth/reset-password','POST',{password:'recovered-test-password',confirmPassword:'recovered-test-password'})).status,400);
assert.equal((await req('/access-login','GET',null,{'Cf-Access-Jwt-Assertion':'forged'})).status,401);
verifiedEmail='other@example.test';r=await req('/access-login','GET',null,{'Cf-Access-Jwt-Assertion':'valid-signed-otp'});assert.equal(r.status,200);assert.match(await r.text(),/بازیابی تأیید نشد/);
verifiedEmail='learner@example.test';r=await req('/access-login','GET',null,{'Cf-Access-Jwt-Assertion':'valid-signed-otp'});assert.equal(r.headers.get('location'),'/reset-password');cookie=cookies(r);const grantCookie=cookie;assert.notEqual(grantCookie,challengeCookie);
assert.equal((await req('/api/local-auth/reset-password','POST',{password:'recovered-test-password',confirmPassword:'wrong'})).status,400);
r=await req('/api/local-auth/reset-password','POST',{password:'recovered-test-password',confirmPassword:'recovered-test-password'});assert.equal(r.status,200);assert.equal(sql.prepare('SELECT count(*) AS n FROM cb_password_resets WHERE account_id=?').get(currentAccount).n,0);
cookie=previousSession;assert.equal((await req('/api/dashboard')).status,401);
cookie=grantCookie;assert.equal((await req('/api/local-auth/reset-password','POST',{password:'replay-test-password',confirmPassword:'replay-test-password'})).status,400);
cookie=challengeCookie;assert.equal((await req('/reset-password')).status,303);
cookie='';assert.equal((await req('/api/local-auth/login','POST',{nationalId:id,password})).status,401);
r=await req('/api/local-auth/login','POST',{nationalId:id,password:'recovered-test-password'});assert.equal(r.status,200);cookie=cookies(r);assert.equal((await(await req('/api/dashboard')).json()).profile.role,'student');
// Removing a code also blocks recovery; knowing the email cannot restore access.
sql.prepare('UPDATE cb_accounts SET national_id=NULL WHERE id=?').run(currentAccount);cookie='';r=await req('/api/local-auth/forgot-password','POST',{nationalId:id,email:verifiedEmail});cookie=cookies(r);r=await req('/access-login','GET',null,{'Cf-Access-Jwt-Assertion':'valid-signed-otp'});assert.match(await r.text(),/بازیابی تأیید نشد/);sql.prepare('UPDATE cb_accounts SET national_id=? WHERE id=?').run(id,currentAccount);
// Operator-provisioned administrators can recover with the same proof without losing their role.
cookie='';env.ADMIN_LOGIN_CODE='1111111111';verifiedEmail='owner@example.test';sql.prepare('UPDATE cb_accounts SET national_id=? WHERE email=?').run(env.ADMIN_LOGIN_CODE,verifiedEmail);
r=await req('/api/local-auth/forgot-password','POST',{nationalId:env.ADMIN_LOGIN_CODE,email:verifiedEmail});assert.equal(r.status,202);cookie=cookies(r);r=await req('/access-login','GET',null,{'Cf-Access-Jwt-Assertion':'valid-signed-otp'});assert.equal(r.status,303);cookie=cookies(r);assert.equal((await req('/api/local-auth/reset-password','POST',{password:'recovered-admin-password',confirmPassword:'recovered-admin-password'})).status,200);cookie='';r=await req('/api/local-auth/login','POST',{nationalId:env.ADMIN_LOGIN_CODE,password:'recovered-admin-password'});assert.equal(r.status,200);cookie=cookies(r);assert.equal((await(await req('/api/dashboard')).json()).profile.role,'admin');delete env.ADMIN_LOGIN_CODE;
assert.match(authPage('login'),/href="\/forgot-password"/);
for(const mode of ['forgot','verify','reset'])for(const script of recoveryPage(mode).matchAll(/<script>([\s\S]*?)<\/script>/g))new Script(script[1]);
cookie='';
for(let i=0;i<11;i++)r=await req('/api/local-auth/login','POST',{nationalId:code(98765432),password});assert.equal(r.status,429);
for(const html of [authPage('login'),authPage('signup'),authPage('verify',{email:'<script>unsafe</script>@test.local'}),authPage('logout'),dashboardPage()])for(const script of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new Script(script[1]);
assert.ok(!authPage('verify',{email:'<script>unsafe</script>@test.local'}).includes('<script>unsafe</script>'));
console.log('PASS: verified one-time recovery, expiry, anti-enumeration, session revocation, disabled legacy recovery, admin-only configured alias, national-ID-only access, legacy-session blocking, disabled email login, pending-only signup, matching verified email, signed-identity boundary, expiration, national login, cookie revocation, verified student/mentor signup, admin-role rejection, role-preserving migration, dashboard isolation, forged headers, CSRF and throttling');

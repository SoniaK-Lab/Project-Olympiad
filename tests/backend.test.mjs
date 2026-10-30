import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
const sql=new DatabaseSync(':memory:');sql.exec(readFileSync('drizzle/0000_tiny_dracula.sql','utf8').replaceAll('--> statement-breakpoint',''));
const DB={prepare(query){
 let params=[];
 return {
  bind(...p){params=p;return this},
  async first(){return sql.prepare(query).get(...params)||null},
  async all(){return {results:sql.prepare(query).all(...params)}},
  async run(){return {meta:{changes:Number(sql.prepare(query).run(...params).changes)}}}
 };
}};
let identity=null;
function moduleFrom(path,imports){const exports={};const code=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;vm.runInNewContext(code,{exports,require:n=>{if(!(n in imports))throw new Error('Unexpected import '+n);return imports[n]},Response,Request,URL,crypto:webcrypto,console,Date});return exports}
const bridge=moduleFrom('lib/bridge.ts',{'cloudflare:workers':{env:{DB}},'../app/chatgpt-auth':{getChatGPTUser:async()=>identity}});
const api=moduleFrom('app/api/bridge/[...path]/route.ts',{'../../../../lib/bridge':bridge});
const login=(id,email)=>identity={userId:id,email,displayName:id};
async function request(path,method='GET',body,origin='https://test.local',viewAs=null){const response=await api[method](new Request('https://test.local/api/bridge/'+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...(viewAs?{'X-Bridge-View-As':viewAs}:{})},body:body?JSON.stringify(body):undefined}));return {status:response.status,data:await response.json()}}
assert.equal((await request('me')).status,401);
login('owner','owner@example.test');assert.equal((await request('me')).data.user.role,'admin');
const create=async(email,role,mentorId)=>{const r=await request('members','POST',{email,role,mentorId,name:email});assert.equal(r.status,201,JSON.stringify(r));return r.data.id};
const mentor=await create('mentor@example.test','mentor');const mentor2=await create('mentor2@example.test','mentor');const student=await create('student@example.test','student',mentor);const other=await create('other@example.test','student',mentor2);
assert.equal((await request('members','POST',{email:'evil@example.test',name:'evil',role:'admin'})).status,400);
assert.equal((await request('members','POST',{},'https://evil.test')).status,403);
login('mentor-id','mentor@example.test');assert.equal((await request('me')).data.user.id,mentor);
let r=await request('sessions','POST',{studentId:student,date:'2026-11-20',time:'14:00',goal:'Clinical reasoning'});assert.equal(r.status,201);const sid=r.data.id;
assert.equal((await request('sessions','POST',{studentId:other,date:'2026-11-20',time:'14:00',goal:'x'})).status,403);
login('student-id','student@example.test');assert.equal((await request('sessions','POST',{studentId:student})).status,403);
assert.equal((await request('sessions')).data.sessions.length,1);
assert.equal((await request('sessions/'+sid+'/attendance','POST',{version:1})).status,200);
assert.equal((await request('sessions/'+sid,'DELETE',{version:1})).status,403);
login('other-id','other@example.test');assert.equal((await request('sessions')).data.sessions.length,0);assert.equal((await request('sessions/'+sid+'/attendance','POST',{version:1})).status,403);
login('mentor-id','mentor@example.test');assert.equal((await request('sessions/'+sid,'PATCH',{version:1,date:'2026-11-21',time:'14:00',goal:'New goal'})).status,200);
login('student-id','student@example.test');r=await request('sessions');assert.equal(r.data.sessions[0].confirmed,0);assert.equal((await request('sessions/'+sid+'/attendance','POST',{version:1})).status,409);assert.equal((await request('sessions/'+sid+'/attendance','POST',{version:2})).status,200);
assert.equal((await request('progress','PUT',{data:{note:'test'},version:0})).status,200);assert.equal((await request('progress','PUT',{data:{note:'stale'},version:0})).status,409);
login('other-id','other@example.test');assert.equal((await request('progress')).data.data,null);
login('unlisted','unlisted@example.test');assert.equal((await request('me')).status,403);
login('owner','owner@example.test');
assert.equal((await request('admin-views')).data.members.length,4);
const preview=await request('me','GET',undefined,'https://test.local',student);
assert.equal(preview.data.user.role,'student');assert.equal(preview.data.isAdmin,true);
assert.equal((await request('sessions','POST',{studentId:student},'https://test.local',student)).status,403);
assert.equal((await request('me','GET',undefined,'https://test.local',mentor)).data.user.role,'mentor');
assert.equal((await request('me','GET',undefined,'https://test.local','missing-id')).status,404);
login('student-id','student@example.test');
assert.equal((await request('me','GET',undefined,'https://test.local',mentor)).status,403);
assert.equal((await request('admin-views')).status,403);
login('owner','owner@example.test');
assert.equal((await request('admin-demo-users','POST',{})).status,200);
assert.equal((await request('admin-demo-users','POST',{})).status,200);
assert.equal((await request('admin-views')).data.members.length,10);
assert.equal((await request('me','GET',undefined,'https://test.local','demo-mentor-maryam')).data.user.role,'mentor');
assert.equal((await request('me','GET',undefined,'https://test.local','demo-student-sara')).data.user.role,'student');
login('student-id','student@example.test');assert.equal((await request('admin-demo-users','POST',{})).status,403);
console.log('PASS: admin role views, effective-role restrictions and rejection of non-admin impersonation');
console.log('PASS: authentication, bootstrap, enrollment, role permissions, student/mentor isolation, CSRF, attendance invalidation, stale writes, private progress');

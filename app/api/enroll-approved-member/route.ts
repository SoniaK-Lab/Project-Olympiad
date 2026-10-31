import {database,response} from '../../../lib/bridge';
export const dynamic='force-dynamic';
const digest=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(b=>b.toString(16).padStart(2,'0')).join('');
// Owner-authorized enrollment, bound to one exact payload and a short-lived secret.
// The raw setup key is never persisted. No existing member is modified.
export async function POST(req:Request){
 if(Date.now()>1793415083258||await digest(req.headers.get('X-Enrollment-Key')||'')!=='d820cde2ab5be788da3ab06e99531797454728d05db89e50b584bf41e3878305')return response({error:'دسترسی مجاز نیست'},403);
 const raw=await req.text();if(raw.length>1000||await digest(raw)!=='bfcc573e83edfa5ecdd825f170fcd292caf013e8cbef43969cb2f24a181f6179')return response({error:'درخواست مجاز نیست'},403);
 const data=JSON.parse(raw),db=database();
 const admin=await db.prepare("SELECT id FROM members WHERE role='admin' LIMIT 1").first();if(!admin)return response({error:'مدیر تعریف نشده است'},409);
 const existing=await db.prepare('SELECT id,role FROM members WHERE email=?').bind(data.email).first<{id:string;role:string}>();
 if(existing)return existing.role==='student'?response({id:existing.id,role:'student',registered:true}):response({error:'ایمیل به نقش دیگری تعلق دارد'},409);
 const id=crypto.randomUUID();
 await db.prepare("INSERT INTO members(id,email,name,role,mentor_id,created) VALUES(?,?,?,'student',NULL,?)").bind(id,data.email,data.name,new Date().toISOString()).run();
 return response({id,role:'student',registered:true,mentorAssigned:false},201);
}


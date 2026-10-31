import {database,response} from '../../../lib/bridge';
export const dynamic='force-dynamic';
const digest=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(b=>b.toString(16).padStart(2,'0')).join('');
// Owner-authorized enrollment: one exact payload, short-lived secret, no persisted raw key.
export async function POST(req:Request){
 if(Date.now()>1793415335228||await digest(req.headers.get('X-Enrollment-Key')||'')!=='a7be94e61b59334887413f919068ace6a26cfcd06df523dab2554f5fca186527')return response({error:'دسترسی مجاز نیست'},403);
 const raw=await req.text();if(raw.length>1000||await digest(raw)!=='7650924be4906d09758eefe6fede38f381133c2a3a477fc0067727d879ac2522')return response({error:'درخواست مجاز نیست'},403);
 const data=JSON.parse(raw),db=database();
 const admin=await db.prepare("SELECT id FROM members WHERE role='admin' LIMIT 1").first();if(!admin)return response({error:'مدیر تعریف نشده است'},409);
 const mentee=await db.prepare("SELECT id,mentor_id FROM members WHERE email=? AND role='student'").bind(data.menteeEmail).first<{id:string;mentor_id:string|null}>();
 if(!mentee)return response({error:'منتی پیدا نشد'},404);
 const existing=await db.prepare('SELECT id,role FROM members WHERE email=?').bind(data.email).first<{id:string;role:string}>();
 if(existing&&existing.role!=='mentor')return response({error:'ایمیل به نقش دیگری تعلق دارد'},409);
 const id=existing?.id||crypto.randomUUID();
 if(mentee.mentor_id&&mentee.mentor_id!==id)return response({error:'منتی قبلاً به منتور دیگری متصل است'},409);
 const results=await db.batch([
 db.prepare("INSERT OR IGNORE INTO members(id,email,name,role,mentor_id,created) VALUES(?,?,?,'mentor',NULL,?)").bind(id,data.email,data.name,new Date().toISOString()),
 db.prepare("UPDATE members SET mentor_id=? WHERE id=? AND role='student' AND (mentor_id IS NULL OR mentor_id=?)").bind(id,mentee.id,id)
 ]);
 if(!results[1].meta.changes)return response({error:'رابطهٔ منتور هم‌زمان تغییر کرد'},409);
 return response({id,role:'mentor',registered:true,menteeId:mentee.id,assigned:true},existing?200:201);
}


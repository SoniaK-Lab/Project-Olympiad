import {database,response} from '../../../lib/bridge';
export const dynamic='force-dynamic';
const digest=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(b=>b.toString(16).padStart(2,'0')).join('');
// Owner-authorized immediate session: exact payload and expiring secret.
export async function POST(req:Request){
 if(Date.now()>1793415702734||await digest(req.headers.get('X-Enrollment-Key')||'')!=='34866b717bca5f4b256bd1b0ce386fc3866fd6371316da36ce296b380e6f31f4')return response({error:'دسترسی مجاز نیست'},403);
 const raw=await req.text();if(raw.length>1000||await digest(raw)!=='b9e13673d699c8634855b50eaac64e208216a4c8b366dd846602f807854454d4')return response({error:'درخواست مجاز نیست'},403);
 const data=JSON.parse(raw),db=database();
 const mentor=await db.prepare("SELECT id FROM members WHERE email=? AND role='mentor'").bind(data.mentorEmail).first<{id:string}>();
 const mentee=await db.prepare("SELECT id,mentor_id FROM members WHERE email=? AND role='student'").bind(data.menteeEmail).first<{id:string;mentor_id:string|null}>();
 if(!mentor||!mentee||mentee.mentor_id!==mentor.id)return response({error:'رابطهٔ منتور و منتی معتبر نیست'},409);
 const now=new Date(),parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tehran',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
 const p=(type:string)=>parts.find(x=>x.type===type)!.value,date=p('year')+'-'+p('month')+'-'+p('day'),time=p('hour')+':'+p('minute');
 await db.prepare("INSERT OR IGNORE INTO sessions(id,mentor_id,student_id,date,time,goal,created) VALUES(?,?,?,?,?,?,?)").bind(data.sessionId,mentor.id,mentee.id,date,time,data.goal,now.toISOString()).run();
 const session=await db.prepare('SELECT id,date,time,goal FROM sessions WHERE id=?').bind(data.sessionId).first();
 return response({registered:true,session,timezone:'Asia/Tehran',durationMinutes:30});
}


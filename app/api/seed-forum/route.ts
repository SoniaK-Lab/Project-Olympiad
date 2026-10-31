import {database,response} from '../../../lib/bridge';
export const dynamic='force-dynamic';
const digest=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(b=>b.toString(16).padStart(2,'0')).join('');
// One exact, owner-approved sample set; expiring key. Only fictional demo students may be authors.
export async function POST(req:Request){
 if(Date.now()>1793418098695||await digest(req.headers.get('X-Enrollment-Key')||'')!=='db08ee5a87fa20358625f65167b590a4fbf41d62685a84f2a5dec17399a106f3')return response({error:'دسترسی مجاز نیست'},403);
 const raw=await req.text();if(raw.length>65536||await digest(raw)!=='cdfc3b1517f4e37d42ae19324b6c4de45cc918728fd8c37d9253408546cc93dd')return response({error:'درخواست مجاز نیست'},403);
 const data=JSON.parse(raw),db=database(),now=new Date().toISOString();
 const actor=await db.prepare("SELECT id FROM members WHERE id=? AND role='admin'").bind(data.actorId).first();if(!actor)return response({error:'مدیر معتبر نیست'},403);
 const authorIds=new Set<string>();for(const t of data.topics){authorIds.add(t.authorId);for(const p of t.replies)authorIds.add(p.authorId)}
 for(const id of authorIds){const author=await db.prepare("SELECT id FROM members WHERE id=? AND role='student' AND email LIKE '%@demo.invalid'").bind(id).first();if(!author)return response({error:'نویسندهٔ نمونه معتبر نیست'},409)}
 const statements=[];for(const t of data.topics){
 statements.push(db.prepare('INSERT OR IGNORE INTO forum_topics(id,author_id,actor_id,title,body,category,created,updated) VALUES(?,?,?,?,?,?,?,?)').bind(t.id,t.authorId,data.actorId,t.title,t.body,t.category,now,now));
 for(const p of t.replies)statements.push(db.prepare('INSERT OR IGNORE INTO forum_posts(id,topic_id,author_id,actor_id,body,created) VALUES(?,?,?,?,?,?)').bind(p.id,t.id,p.authorId,data.actorId,p.body,now));
 }
 const result=await db.batch(statements);return response({sampleTopics:data.topics.length,sampleReplies:data.topics.reduce((n:number,t:any)=>n+t.replies.length,0),created:result.reduce((n:number,r:any)=>n+Number(r.meta.changes),0)});
}

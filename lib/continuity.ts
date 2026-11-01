import {database,HttpError,body,text,response,Member} from './bridge';
const kinds=['sbar','skill','pulse','message','board'];
const skillIds=['handover','assessment','teamwork','resources'];
function uuid(v:unknown){const s=text(v,36,36);if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s))throw new HttpError(400,'شناسهٔ ثبت معتبر نیست');return s}
function integer(v:unknown,min:number,max:number){if(!Number.isInteger(v)||Number(v)<min||Number(v)>max)throw new HttpError(400,'عدد نامعتبر است');return Number(v)}
async function pair(me:Member,id:unknown){const db=database();const sid=me.role==='student'?me.id:text(id);const s=await db.prepare("SELECT id,name,mentor_id FROM members WHERE id=? AND role='student'").bind(sid).first<any>();if(!s||!s.mentor_id||(me.role==='mentor'&&s.mentor_id!==me.id))throw new HttpError(403,'فقط منتی مرتبط با این منتور مجاز است');return s}
function scope(me:Member,kind:string){if(kind==='pulse'){if(me.role!=='student')throw new HttpError(403,'نبض شخصی فقط برای خود منتی قابل مشاهده است');return {sql:'e.owner_id=?',args:[me.id]}}
if(kind==='message'&&me.role==='admin')throw new HttpError(403,'برای پیام خصوصی ابتدا نقش مجاز را انتخاب کنید');
if(kind==='board')return me.role==='admin'?{sql:'1=1',args:[]}:{sql:'e.mentor_id=?',args:[me.role==='mentor'?me.id:me.mentor_id||'']};
return me.role==='admin'?{sql:'1=1',args:[]}:me.role==='student'?{sql:'e.student_id=? AND e.mentor_id=?',args:[me.id,me.mentor_id||'']}:{sql:"e.mentor_id=? AND EXISTS(SELECT 1 FROM members s WHERE s.id=e.student_id AND s.mentor_id=? AND s.role='student')",args:[me.id,me.id]}}
async function accessible(id:string,me:Member){const e=await database().prepare('SELECT * FROM continuity_entries WHERE id=?').bind(id).first<any>();if(!e)throw new HttpError(404,'ثبت پیدا نشد');const s=e.kind==='pulse'&&me.role==='mentor'?{sql:"e.mentor_id=? AND EXISTS(SELECT 1 FROM members s WHERE s.id=e.student_id AND s.mentor_id=?) AND json_extract(e.data,'$.contact')=1",args:[me.id,me.id]}:scope(me,e.kind);const allowed=await database().prepare('SELECT e.id FROM continuity_entries e WHERE e.id=? AND '+s.sql).bind(id,...s.args).first();if(!allowed)throw new HttpError(403,'به این ثبت دسترسی ندارید');return e}
export async function continuityRoute(req:Request,path:string[],me:Member,actor:Member){const db=database(),method=req.method,url=new URL(req.url);
if(path[1]==='report'&&method==='GET'){
 if(me.role==='student')throw new HttpError(403,'گزارش برای منتور و مدیر است');
 const students=(await (me.role==='mentor'?db.prepare("SELECT id,name,mentor_id FROM members WHERE role='student' AND mentor_id=?").bind(me.id):db.prepare("SELECT id,name,mentor_id FROM members WHERE role='student' ORDER BY name")).all()).results as any[];
 const rows=[];for(const s of students){const counts=await db.prepare("SELECT SUM(CASE WHEN kind='sbar' THEN 1 ELSE 0 END) AS sbar,SUM(CASE WHEN kind='skill' THEN 1 ELSE 0 END) AS skills,COUNT(DISTINCT substr(created,1,10)) AS active_days FROM continuity_entries WHERE student_id=? AND mentor_id=? AND kind IN ('sbar','skill')").bind(s.id,s.mentor_id).first<any>();const replies=await db.prepare("SELECT COUNT(*) AS replied,AVG((julianday(first_reply)-julianday(created))*24) AS average_hours,SUM(CASE WHEN (julianday(first_reply)-julianday(created))*24<=24 THEN 1 ELSE 0 END) AS within24 FROM (SELECT e.created,MIN(r.created) AS first_reply FROM continuity_entries e JOIN continuity_replies r ON r.entry_id=e.id AND r.owner_id=e.mentor_id WHERE e.kind='sbar' AND e.student_id=? AND e.mentor_id=? GROUP BY e.id)").bind(s.id,s.mentor_id).first<any>();rows.push({id:s.id,name:s.name,sbar:counts.sbar||0,skills:counts.skills||0,activeDays:counts.active_days||0,replied:replies.replied||0,averageHours:replies.average_hours===null?null:Math.max(0,replies.average_hours),within24:replies.within24||0})}
 return response({students:rows,exportAllowed:rows.length>=5,generatedAt:new Date().toISOString()});
}
if(path[1]==='support'&&method==='GET'){
 if(me.role!=='mentor')throw new HttpError(403,'درخواست حمایت فقط برای منتور مربوطه است');
 const rows=(await db.prepare("SELECT e.id,e.student_id,s.name,e.created FROM continuity_entries e JOIN members s ON s.id=e.student_id AND s.mentor_id=e.mentor_id WHERE e.kind='pulse' AND e.mentor_id=? AND json_extract(e.data,'$.contact')=1 AND NOT EXISTS(SELECT 1 FROM continuity_replies r WHERE r.entry_id=e.id) ORDER BY e.created DESC LIMIT 50").bind(me.id).all()).results;
 return response({requests:rows});
}
if(path[1]==='reads'){
 if(me.role==='admin')throw new HttpError(403,'نقش پیام‌رسان را انتخاب کنید');
 const b=method==='POST'?await body(req):Object.fromEntries(url.searchParams);const s=await pair(me,b.studentId);
 if(method==='POST'){const now=new Date().toISOString();await db.prepare('INSERT INTO continuity_reads(id,member_id,student_id,seen_at) VALUES(?,?,?,?) ON CONFLICT(member_id,student_id) DO UPDATE SET seen_at=excluded.seen_at').bind(crypto.randomUUID(),me.id,s.id,now).run();return response({ok:true})}
 if(method==='GET'){const peer=me.role==='student'?s.mentor_id:s.id;const read=await db.prepare('SELECT seen_at FROM continuity_reads WHERE member_id=? AND student_id=?').bind(peer,s.id).first<any>();return response({seenAt:read?.seen_at||null})}
}
if(path[1]==='reply'&&method==='POST'){
 const b=await body(req),id=uuid(b.id),e=await accessible(text(b.entryId),me);
 if(e.kind==='pulse'){if(me.role!=='mentor'||e.mentor_id!==me.id||!JSON.parse(e.data).contact)throw new HttpError(403,'فقط درخواست حمایتِ با رضایت قابل پیگیری است')}
 else if(!['sbar','skill'].includes(e.kind)||me.role==='admin')throw new HttpError(403,'برای بازخورد نقش منتور یا منتی را انتخاب کنید');
 let level=null;if(b.level!==undefined&&b.level!==null){if(e.kind!=='skill'||me.role!=='mentor')throw new HttpError(403,'سطح را فقط منتور ثبت می‌کند');level=integer(b.level,1,4)}
 const content=text(b.text,1,2000),existing=await db.prepare('SELECT owner_id,entry_id FROM continuity_replies WHERE id=?').bind(id).first<any>();if(existing){if(existing.owner_id!==me.id||existing.entry_id!==e.id)throw new HttpError(409,'شناسه تکراری است');return response({id,duplicate:true})}
 await db.prepare('INSERT OR IGNORE INTO continuity_replies(id,entry_id,owner_id,actor_id,body,level,created) VALUES(?,?,?,?,?,?,?)').bind(id,e.id,me.id,actor.id,content,level,new Date().toISOString()).run();return response({id},201);
}
if(path[1]==='entries'&&method==='GET'){
 const kind=url.searchParams.get('kind')||'sbar';if(!kinds.includes(kind))throw new HttpError(400,'نوع ثبت معتبر نیست');const sc=scope(me,kind),sid=url.searchParams.get('studentId');let filter='',args:any[]=[...sc.args];if(sid){await pair(me,sid);filter=' AND e.student_id=?';args.push(me.role==='student'?me.id:sid)}
 const offset=integer(Number(url.searchParams.get('offset')||0),0,10000);
 const rows=(await db.prepare('SELECT e.*,m.name AS owner_name FROM continuity_entries e JOIN members m ON m.id=e.owner_id WHERE e.kind=? AND '+sc.sql+filter+' ORDER BY e.created DESC,e.id DESC LIMIT 31 OFFSET ?').bind(kind,...args,offset).all()).results as any[];
 const entries=[];for(const e of rows.slice(0,30)){const replies=kind==='sbar'||kind==='skill'?(await db.prepare('SELECT r.id,r.owner_id,r.body,r.level,r.created,m.name AS owner_name FROM continuity_replies r JOIN members m ON m.id=r.owner_id WHERE r.entry_id=? ORDER BY r.created,r.id LIMIT 50').bind(e.id).all()).results:[];entries.push({...e,data:JSON.parse(e.data),replies,actor_id:undefined})}return response({entries,more:rows.length>30});
}
if(path[1]==='entries'&&method==='POST'){
 const b=await body(req),id=uuid(b.id),kind=b.kind;if(!kinds.includes(kind))throw new HttpError(400,'نوع ثبت معتبر نیست');let studentId:string|null=null,mentorId:string,data:any={};const d=b.data||{};
 if(kind==='board'){if(me.role==='student')throw new HttpError(403,'تابلو را منتور مدیریت می‌کند');mentorId=me.role==='mentor'?me.id:text(b.mentorId);const m=await db.prepare("SELECT id FROM members WHERE id=? AND role='mentor'").bind(mentorId).first();if(!m)throw new HttpError(400,'منتور معتبر انتخاب کنید');data={title:text(d.title,2,140),text:text(d.text,2,4000)}}
 else{if(me.role==='admin')throw new HttpError(403,'ابتدا نقش مجاز را انتخاب کنید');const s=await pair(me,b.studentId);studentId=s.id;mentorId=s.mentor_id;
 if(kind!=='message'&&me.role!=='student')throw new HttpError(403,'ثبت فقط برای منتی است');
 if(kind==='sbar'){if(d.deidentified!==true)throw new HttpError(400,'حذف اطلاعات هویتی را تأیید کنید');data={title:text(d.title,2,140),s:text(d.s,5,2000),b:text(d.b,5,2000),a:text(d.a,5,2000),r:text(d.r,5,2000),urgent:d.urgent===true,deidentified:true}}
 if(kind==='skill'){if(!skillIds.includes(d.skill))throw new HttpError(400,'مهارت معتبر نیست');if(!Array.isArray(d.steps)||d.steps.length!==4||!d.steps.every((v:unknown)=>typeof v==='boolean'))throw new HttpError(400,'چک‌لیست معتبر نیست');data={skill:d.skill,steps:d.steps,supervisor:text(d.supervisor,2,100),confidence:integer(d.confidence,1,5),note:text(d.note,0,1000)}}
 if(kind==='pulse'){if(!Array.isArray(d.scores)||d.scores.length!==5)throw new HttpError(400,'پنج پاسخ لازم است');data={scores:d.scores.map((v:unknown)=>integer(v,1,5)),contact:d.contact===true,reflection:text(d.reflection,0,2000)}}
 if(kind==='message'){if(d.deidentified!==true)throw new HttpError(400,'حذف اطلاعات هویتی را تأیید کنید');data={text:text(d.text,1,4000),deidentified:true}}
 }
 const existing=await db.prepare('SELECT owner_id,kind FROM continuity_entries WHERE id=?').bind(id).first<any>();if(existing){if(existing.owner_id!==me.id||existing.kind!==kind)throw new HttpError(409,'شناسه تکراری است');return response({id,duplicate:true})}
 await db.prepare('INSERT OR IGNORE INTO continuity_entries(id,owner_id,student_id,mentor_id,kind,data,actor_id,created) VALUES(?,?,?,?,?,?,?,?)').bind(id,me.id,studentId,mentorId!,kind,JSON.stringify(data),actor.id,new Date().toISOString()).run();return response({id},201);
}
throw new HttpError(404,'مسیر تداوم آموزش پیدا نشد');
}

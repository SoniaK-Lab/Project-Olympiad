import {database,HttpError,body,text,response,Member} from './bridge';
const categories=['گفت‌وگوی عمومی','داخلی','جراحی','کودکان','کیس و استدلال','روش مطالعه'];
function offset(req:Request){const n=Number(new URL(req.url).searchParams.get('offset')||0);if(!Number.isSafeInteger(n)||n<0||n>10000)throw new HttpError(400,'صفحه نامعتبر است');return n}
async function throttle(memberId:string){const since=new Date(Date.now()-600000).toISOString();const count=await database().prepare('SELECT (SELECT COUNT(*) FROM forum_topics WHERE author_id=? AND created>?)+(SELECT COUNT(*) FROM forum_posts WHERE author_id=? AND created>?) AS n').bind(memberId,since,memberId,since).first<{n:number}>();if((count?.n||0)>=30)throw new HttpError(429,'کمی صبر کنید؛ تعداد پیام‌ها در ده دقیقه زیاد شده است')}
export async function forumRoute(req:Request,path:string[],me:Member,actor:Member){
 if(!['student','admin'].includes(me.role))throw new HttpError(403,'فروم برای منتی‌ها و مدیر ناظر است');
 const db=database(),method=req.method,admin=me.role==='admin',now=new Date().toISOString();
 if(path.length===1){
  if(method==='GET'){
   const url=new URL(req.url),q=(url.searchParams.get('q')||'').trim().slice(0,100),category=url.searchParams.get('category')||'',filter=url.searchParams.get('filter')||'',off=offset(req);
   let where='t.deleted=0';const args:any[]=[];
   if(q){where+=' AND (t.title LIKE ? ESCAPE \'\\\' OR t.body LIKE ? ESCAPE \'\\\')';const like='%'+q.replace(/[\\%_]/g,'\\$&')+'%';args.push(like,like)}
   if(category){if(!categories.includes(category))throw new HttpError(400,'دسته‌بندی نامعتبر است');where+=' AND t.category=?';args.push(category)}
   if(filter==='mine'){where+=' AND t.author_id=?';args.push(me.id)}else if(filter==='unanswered')where+=' AND NOT EXISTS (SELECT 1 FROM forum_posts z WHERE z.topic_id=t.id AND z.deleted=0)';else if(filter&&filter!=='all')throw new HttpError(400,'فیلتر نامعتبر است');
   const rows=(await db.prepare(`SELECT t.id,t.title,t.category,t.author_id,t.created,t.updated,t.pinned,t.locked,t.version,m.name AS author_name,substr(t.body,1,180) AS excerpt,(SELECT COUNT(*) FROM forum_posts p WHERE p.topic_id=t.id AND p.deleted=0) AS reply_count FROM forum_topics t JOIN members m ON m.id=t.author_id WHERE ${where} ORDER BY t.pinned DESC,t.updated DESC,t.id DESC LIMIT 21 OFFSET ?`).bind(...args,off).all()).results;
   return response({topics:rows.slice(0,20).map((t:any)=>({...t,isMine:t.author_id===me.id})),nextOffset:rows.length>20?off+20:null,categories});
  }
  if(method==='POST'){
   if(!['student'].includes(me.role))throw new HttpError(403,'مدیر در این بخش ناظر است؛ برای بحث از نقش منتی استفاده کنید');
   const b=await body(req),title=text(b.title,5,140),content=text(b.body,10,6000),category=text(b.category);if(!categories.includes(category))throw new HttpError(400,'دسته‌بندی نامعتبر است');await throttle(me.id);const id=crypto.randomUUID();
   await db.prepare('INSERT INTO forum_topics(id,author_id,actor_id,title,body,category,created,updated) VALUES(?,?,?,?,?,?,?,?)').bind(id,me.id,actor.id,title,content,category,now,now).run();return response({id},201);
  }
 }
 const topic=await db.prepare('SELECT t.*,m.name AS author_name FROM forum_topics t JOIN members m ON m.id=t.author_id WHERE t.id=? AND t.deleted=0').bind(path[1]||'').first<any>();if(!topic)throw new HttpError(404,'بحث پیدا نشد یا حذف شده است');
 if(path.length===2&&method==='GET'){
  const off=offset(req);const rows=(await db.prepare('SELECT p.id,p.topic_id,p.author_id,CASE WHEN p.deleted=0 THEN p.body ELSE \'\' END AS body,p.deleted,p.created,m.name AS author_name,(SELECT COUNT(*) FROM forum_votes v WHERE v.post_id=p.id) AS likes,EXISTS(SELECT 1 FROM forum_votes v WHERE v.post_id=p.id AND v.member_id=?) AS liked FROM forum_posts p JOIN members m ON m.id=p.author_id WHERE p.topic_id=? ORDER BY p.created,p.id LIMIT 51 OFFSET ?').bind(me.id,topic.id,off).all()).results;
  return response({topic:{...topic,isMine:topic.author_id===me.id},posts:rows.slice(0,50).map((p:any)=>({...p,isMine:p.author_id===me.id})),nextOffset:rows.length>50?off+50:null});
 }
 if(path.length===2&&method==='PATCH'){
  if(!admin)throw new HttpError(403,'مدیریت بحث فقط با مدیر است');const b=await body(req);if(!Number.isInteger(b.version)||typeof b.locked!=='boolean'||typeof b.pinned!=='boolean')throw new HttpError(400,'تغییر نامعتبر است');
  const r=await db.prepare('UPDATE forum_topics SET locked=?,pinned=?,version=version+1 WHERE id=? AND version=? AND deleted=0').bind(Number(b.locked),Number(b.pinned),topic.id,b.version).run();if(!r.meta.changes)throw new HttpError(409,'بحث هم‌زمان تغییر کرده؛ تازه‌سازی کنید');return response({ok:true});
 }
 if(path.length===2&&method==='DELETE'){
  if(!admin&&topic.author_id!==me.id)throw new HttpError(403,'حذف این بحث مجاز نیست');await db.prepare('UPDATE forum_topics SET deleted=1,version=version+1 WHERE id=?').bind(topic.id).run();return response({ok:true});
 }
 if(path[2]==='posts'&&path.length===3&&method==='POST'){
  if(me.role!=='student')throw new HttpError(403,'ارسال پاسخ ویژهٔ منتی‌هاست');const b=await body(req),content=text(b.body,2,6000);await throttle(me.id);const id=crypto.randomUUID();
  const result=await db.batch([db.prepare('INSERT INTO forum_posts(id,topic_id,author_id,actor_id,body,created) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM forum_topics WHERE id=? AND locked=0 AND deleted=0)').bind(id,topic.id,me.id,actor.id,content,now,topic.id),db.prepare('UPDATE forum_topics SET updated=? WHERE id=? AND EXISTS(SELECT 1 FROM forum_posts WHERE id=?)').bind(now,topic.id,id)]);
  if(!result[0].meta.changes)throw new HttpError(409,'بحث بسته شده؛ پاسخ ثبت نشد');return response({id},201);
 }
 if(path[2]==='posts'&&path[3]){
  const post=await db.prepare('SELECT * FROM forum_posts WHERE id=? AND topic_id=? AND deleted=0').bind(path[3],topic.id).first<any>();if(!post)throw new HttpError(404,'پاسخ پیدا نشد');
  if(path.length===4&&method==='DELETE'){if(!admin&&post.author_id!==me.id)throw new HttpError(403,'حذف پاسخ دیگری مجاز نیست');await db.prepare('UPDATE forum_posts SET deleted=1 WHERE id=?').bind(post.id).run();return response({ok:true})}
  if(path[4]==='vote'&&method==='PUT'){
   if(me.role!=='student'||post.author_id===me.id)throw new HttpError(403,'فقط پاسخ دیگر منتی‌ها را می‌توانید مفید علامت بزنید');const b=await body(req);if(typeof b.liked!=='boolean')throw new HttpError(400,'رأی نامعتبر است');const id=post.id+':'+me.id;
   if(b.liked)await db.prepare('INSERT OR IGNORE INTO forum_votes(id,post_id,member_id,created) VALUES(?,?,?,?)').bind(id,post.id,me.id,now).run();else await db.prepare('DELETE FROM forum_votes WHERE id=?').bind(id).run();return response({ok:true});
  }
 }
 throw new HttpError(404,'مسیر فروم پیدا نشد');
}

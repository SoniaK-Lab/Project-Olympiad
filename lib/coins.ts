import {database,HttpError,body,response,Member} from './bridge';
export const coinCatalog=[{sku:'frame-rose',title:'قاب شکوفه',description:'قاب صورتی برای آواتار پنل شما',price:30,kind:'frame'},{sku:'monitor-sky',title:'مانیتور آسمان',description:'رنگ آبی روشن‌تر برای مانیتور بیمار مجازی',price:60,kind:'monitor'},{sku:'journal-cream',title:'دفتر گرم',description:'پس‌زمینهٔ کرم برای یادداشت خصوصی جلسه',price:40,kind:'journal'}];
const rules=[{id:'assignment-approved',label:'تکلیف تأییدشدهٔ منتور',amount:20},{id:'assignment-revision',label:'اصلاح و ارسال دوباره، پس از تأیید نهایی',amount:15}];
// Verified assignment events are the only source of rewards. Browser progress, clicks and votes cannot mint coins.
export async function syncCoins(memberId:string){const db=database(),now=new Date().toISOString();
 await db.batch([
 db.prepare('INSERT OR IGNORE INTO coin_wallets(member_id,updated) VALUES(?,?)').bind(memberId,now),
 db.prepare("INSERT OR IGNORE INTO coin_ledger(id,member_id,amount,source_key,label,created) SELECT ?||':approved:'||a.id,?,20,'approved:'||a.id,'تأیید تکلیف: '||a.title,MIN(e.created) FROM assignments a JOIN assignment_events e ON e.assignment_id=a.id AND e.kind='approved' WHERE a.student_id=? AND a.status='approved' GROUP BY a.id").bind(memberId,memberId,memberId),
 db.prepare("INSERT OR IGNORE INTO coin_ledger(id,member_id,amount,source_key,label,created) SELECT ?||':revision:'||a.id,?,15,'revision:'||a.id,'رشد پس از اصلاح: '||a.title,MIN(p.created) FROM assignments a JOIN assignment_events r ON r.assignment_id=a.id AND r.kind='revision' JOIN assignment_events s ON s.assignment_id=a.id AND s.kind='submitted' AND s.rowid>r.rowid JOIN assignment_events p ON p.assignment_id=a.id AND p.kind='approved' AND p.rowid>s.rowid WHERE a.student_id=? AND a.status='approved' GROUP BY a.id").bind(memberId,memberId,memberId),
 db.prepare('UPDATE coin_wallets SET balance=(SELECT COALESCE(SUM(amount),0) FROM coin_ledger WHERE member_id=?),earned=(SELECT COALESCE(SUM(CASE WHEN amount>0 THEN amount ELSE 0 END),0) FROM coin_ledger WHERE member_id=?),updated=? WHERE member_id=?').bind(memberId,memberId,now,memberId)
 ]);
}
async function wallet(memberId:string){const db=database();const account=await db.prepare('SELECT balance,earned FROM coin_wallets WHERE member_id=?').bind(memberId).first<any>();const inventory=(await db.prepare('SELECT sku,equipped,created FROM coin_inventory WHERE member_id=? ORDER BY created').bind(memberId).all()).results;const ledger=(await db.prepare('SELECT id,amount,label,created FROM coin_ledger WHERE member_id=? ORDER BY created DESC,id DESC LIMIT 40').bind(memberId).all()).results;return {balance:account?.balance||0,earned:account?.earned||0,spent:(account?.earned||0)-(account?.balance||0),inventory,ledger,catalog:coinCatalog,rules}}
export async function coinRoute(req:Request,path:string[],me:Member,actor:Member){const db=database();
 if(path[1]==='report'&&req.method==='GET'){
  if(!['admin','mentor'].includes(me.role))throw new HttpError(403,'گزارش سکه فقط برای مدیر و منتور است');
  const query="SELECT id,name FROM members WHERE role='student'"+(me.role==='mentor'?' AND mentor_id=?':'')+' ORDER BY name';const rows=(await (me.role==='mentor'?db.prepare(query).bind(me.id):db.prepare(query)).all()).results;
  const students=[];for(const row of rows as any[]){await syncCoins(row.id);const w=await db.prepare('SELECT balance,earned FROM coin_wallets WHERE member_id=?').bind(row.id).first<any>();students.push({id:row.id,name:row.name,balance:w.balance,earned:w.earned,spent:w.earned-w.balance})}return response({students,rules});
 }
 if(me.role!=='student')throw new HttpError(403,'کیف سکه و خرید جایزه ویژهٔ منتی‌هاست');
 if(req.method==='GET'&&path.length===1){await syncCoins(me.id);return response(await wallet(me.id))}
 if(req.method!=='POST'&&req.method!=='PUT')throw new HttpError(405,'روش مجاز نیست');const b=await body(req),item=coinCatalog.find(p=>p.sku===b.sku);if(!item)throw new HttpError(400,'جایزه معتبر نیست');
 if(path[1]==='equip'&&req.method==='PUT'){
  if(typeof b.enabled!=='boolean')throw new HttpError(400,'وضعیت نامعتبر است');const r=await db.prepare('UPDATE coin_inventory SET equipped=? WHERE member_id=? AND sku=?').bind(Number(b.enabled),me.id,item.sku).run();if(!r.meta.changes)throw new HttpError(403,'ابتدا این جایزه را دریافت کنید');return response({ok:true,...await wallet(me.id)});
 }
 if(path[1]==='purchase'&&req.method==='POST'){
  await syncCoins(me.id);const owned=await db.prepare('SELECT id FROM coin_inventory WHERE member_id=? AND sku=?').bind(me.id,item.sku).first();if(owned)return response({ok:true,alreadyOwned:true,...await wallet(me.id)});
  const action=crypto.randomUUID(),now=new Date().toISOString(),inventoryId=me.id+':'+item.sku;
  const result=await db.batch([
   db.prepare('UPDATE coin_wallets SET balance=balance-?,last_action_id=?,updated=? WHERE member_id=? AND balance>=? AND NOT EXISTS(SELECT 1 FROM coin_inventory WHERE member_id=? AND sku=?)').bind(item.price,action,now,me.id,item.price,me.id,item.sku),
   db.prepare('INSERT INTO coin_inventory(id,member_id,sku,actor_id,created) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM coin_wallets WHERE member_id=? AND last_action_id=?)').bind(inventoryId,me.id,item.sku,actor.id,now,me.id,action),
   db.prepare('INSERT INTO coin_ledger(id,member_id,amount,source_key,label,created) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM coin_wallets WHERE member_id=? AND last_action_id=?)').bind(action,me.id,-item.price,'purchase:'+item.sku,'دریافت جایزه: '+item.title,now,me.id,action)
  ]);
  if(!result[0].meta.changes){const existing=await db.prepare('SELECT id FROM coin_inventory WHERE member_id=? AND sku=?').bind(me.id,item.sku).first();if(existing)return response({ok:true,alreadyOwned:true,...await wallet(me.id)});throw new HttpError(409,'سکهٔ کافی نداری؛ موجودی را تازه‌سازی کن')}
  return response({ok:true,...await wallet(me.id)});
 }
 throw new HttpError(404,'مسیر سکه پیدا نشد');
}

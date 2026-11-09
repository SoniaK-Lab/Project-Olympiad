import { env } from 'cloudflare:workers';
import {database,HttpError,body,text,response,Member} from './bridge';
const LEASE=45000,TTL=300000;
const TURN_CREDENTIAL_SECONDS = 7200;

async function callIceServers(memberId: string, now: number): Promise<RTCIceServer[]> {
 const servers: RTCIceServer[] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
 const urls = env.BRIDGE_TURN_URLS?.split(',').map(url => url.trim()).filter(Boolean) ?? [];
 const secret = env.BRIDGE_TURN_SHARED_SECRET;
 if (!secret || !urls.length || urls.some(url => !/^turns?:[^\s]+$/i.test(url))) return servers;

 const username = `${Math.floor(now / 1000) + TURN_CREDENTIAL_SECONDS}:${memberId}`;
 const encoder = new TextEncoder();
 const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
 const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(username));
 const credential = btoa(String.fromCharCode(...new Uint8Array(signature)));
 servers.push({ urls, username, credential });
 return servers;
}
// Only the assigned participants may exchange temporary WebRTC negotiation data.
// Media travels between browsers and is never stored here.
export async function callRoute(req:Request,path:string[],me:Member){
 const db=database(),session=await db.prepare('SELECT * FROM sessions WHERE id=?').bind(path[1]||'').first<any>();
 if(!session)throw new HttpError(404,'جلسه پیدا نشد');
 if(me.id!==session.mentor_id&&me.id!==session.student_id)throw new HttpError(403,'تماس فقط برای منتور و منتی همین جلسه مجاز است');
 const peerId=me.id===session.mentor_id?session.student_id:session.mentor_id;
 const b=req.method==='GET'?null:await body(req),url=new URL(req.url),client=text(b?.client||url.searchParams.get('client'),10,80),now=Date.now(),slot=session.id+':'+me.id;
 if(!/^[a-zA-Z0-9-]+$/.test(client))throw new HttpError(400,'شناسهٔ اتصال نامعتبر است');
 if(req.method==='POST'&&path[2]==='join'){
  const iceServers=await callIceServers(me.id,now);
  await db.prepare('DELETE FROM call_signals WHERE created<?').bind(now-TTL).run();
  const result=await db.prepare('INSERT INTO call_peers(id,session_id,member_id,client,updated) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET client=excluded.client,updated=excluded.updated WHERE call_peers.client=excluded.client OR call_peers.updated<?').bind(slot,session.id,me.id,client,now,now-LEASE).run();
  if(!result.meta.changes)throw new HttpError(409,'این حساب در پنجرهٔ دیگری وارد تماس است؛ از آن خارج شوید یا ۴۵ ثانیه صبر کنید');
  return response({ok:true,initiator:me.id===session.mentor_id,iceServers});
 }
 if(req.method==='POST'&&path[2]==='leave'){
  await db.prepare('DELETE FROM call_peers WHERE id=? AND client=?').bind(slot,client).run();
  await db.prepare('DELETE FROM call_signals WHERE session_id=? AND (sender_client=? OR recipient_client=?)').bind(session.id,client,client).run();return response({ok:true});
 }
 const lease=await db.prepare('UPDATE call_peers SET updated=? WHERE id=? AND client=? AND updated>=?').bind(now,slot,client,now-LEASE).run();
 if(!lease.meta.changes)throw new HttpError(409,'اتصال منقضی شده؛ دوباره وارد تماس شوید');
 const peer=await db.prepare('SELECT client FROM call_peers WHERE session_id=? AND member_id=? AND updated>=?').bind(session.id,peerId,now-LEASE).first<{client:string}>();
 if(req.method==='GET'){
  const after=Number(url.searchParams.get('after')||0);if(!Number.isSafeInteger(after)||after<0)throw new HttpError(400,'نشانگر نامعتبر است');
  const messages=peer?(await db.prepare('SELECT id,payload,sender_client FROM call_signals WHERE session_id=? AND recipient_id=? AND recipient_client=? AND sender_client=? AND id>? AND created>=? ORDER BY id LIMIT 100').bind(session.id,me.id,client,peer.client,after,now-TTL).all()).results:[];
  return response({peerClient:peer?.client||null,messages:messages.map((m:any)=>({id:m.id,from:m.sender_client,signal:JSON.parse(m.payload)}))});
 }
 if(req.method==='POST'&&path[2]==='signal'){
  if(!peer||b.targetClient!==peer.client)throw new HttpError(409,'طرف مقابل از تماس خارج شده است');
  const signal=b.signal;if(!signal||!['offer','answer','candidate'].includes(signal.type))throw new HttpError(400,'پیام اتصال نامعتبر است');
  if(['offer','answer'].includes(signal.type)&&(typeof signal.sdp!=='string'||signal.sdp.length>48000||!signal.sdp.startsWith('v=0')))throw new HttpError(400,'توصیف تماس نامعتبر است');
  if(signal.type==='offer'&&me.id!==session.mentor_id||signal.type==='answer'&&me.id!==session.student_id)throw new HttpError(403,'آغاز تماس با منتور است');
  if(signal.type==='candidate'&&(!signal.candidate||typeof signal.candidate.candidate!=='string'||signal.candidate.candidate.length>3000))throw new HttpError(400,'مسیر اتصال نامعتبر است');
  const count=await db.prepare('SELECT COUNT(*) AS n FROM call_signals WHERE session_id=? AND sender_client=? AND created>?').bind(session.id,client,now-60000).first<{n:number}>();if((count?.n||0)>200)throw new HttpError(429,'تعداد پیام اتصال بیش از حد است');
  const payload=JSON.stringify(signal);if(payload.length>50000)throw new HttpError(413,'پیام اتصال بیش از حد بزرگ است');
  await db.prepare('INSERT INTO call_signals(session_id,sender_id,sender_client,recipient_id,recipient_client,payload,created) VALUES(?,?,?,?,?,?,?)').bind(session.id,me.id,client,peerId,peer.client,payload,now).run();return response({ok:true});
 }
 throw new HttpError(404,'مسیر تماس پیدا نشد');
}

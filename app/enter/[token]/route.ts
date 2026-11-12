import { database, memberByAccessKey } from '../../../lib/bridge';
import { accessCookie, hashAccessKey, isAccessKey } from '../../access-cookie';
export const dynamic='force-dynamic';
const baseHeaders={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'};
const invalid=()=>new Response('<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>لینک نامعتبر</title><body style="font:16px sans-serif;max-width:32rem;margin:4rem auto;padding:0 1rem"><h1>این لینک ورود معتبر نیست</h1><p>ممکن است لغو یا با لینک تازه‌ای جایگزین شده باشد. از مدیر بخواهید لینک جدید برایتان بفرستد.</p></body></html>',{status:403,headers:{...baseHeaders,'Content-Type':'text/html; charset=utf-8'}});
export async function GET(req:Request){
 const key=decodeURIComponent(new URL(req.url).pathname.split('/')[2]||'');
 if(!isAccessKey(key)||!await memberByAccessKey(key))return invalid();
 await database().prepare('UPDATE access_links SET last_used=? WHERE token_hash=?').bind(new Date().toISOString(),await hashAccessKey(key)).run();
 return new Response(null,{status:302,headers:{...baseHeaders,Location:'/',...{'Set-Cookie':accessCookie(key)}}});
}

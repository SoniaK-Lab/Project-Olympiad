import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../app/chatgpt-auth';
export class HttpError extends Error{constructor(public status:number,message:string){super(message)}}
export type Member={id:string;identity:string|null;email:string;name:string;role:'admin'|'mentor'|'student';mentor_id:string|null};
export function database(){if(!env.DB)throw new HttpError(503,'پایگاه داده در دسترس نیست');return env.DB}
export async function currentMember(){const user=await getChatGPTUser();if(!user)throw new HttpError(401,'ابتدا وارد حساب ChatGPT شوید');const db=database();const email=user.email.toLowerCase();
// Initial bootstrap is safe only while the Site remains owner-private; publication preserves that boundary.
await db.prepare("INSERT INTO members(id,identity,email,name,role,created) SELECT ?,?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM members)").bind(crypto.randomUUID(),user.userId,email,user.displayName.slice(0,100),'admin',new Date().toISOString()).run();
let member=await db.prepare('SELECT * FROM members WHERE identity=?').bind(user.userId).first<Member>();
if(!member){await db.prepare('UPDATE members SET identity=? WHERE email=? AND identity IS NULL').bind(user.userId,email).run();member=await db.prepare('SELECT * FROM members WHERE identity=?').bind(user.userId).first<Member>()}
if(!member)throw new HttpError(403,'حساب شما هنوز توسط مدیر مجاز نشده است');return member}
export function csrf(req:Request){const origin=req.headers.get('origin');if(!origin||origin!==new URL(req.url).origin)throw new HttpError(403,'مبدأ درخواست مجاز نیست');if(!req.headers.get('content-type')?.includes('application/json'))throw new HttpError(415,'درخواست باید JSON باشد')}
export async function body(req:Request){const raw=await req.text();if(raw.length>100000)throw new HttpError(413,'درخواست بیش از حد بزرگ است');try{return JSON.parse(raw)}catch{throw new HttpError(400,'JSON نامعتبر است')}}
export function text(value:unknown,min=1,max=200){if(typeof value!=='string'||value.trim().length<min||value.trim().length>max)throw new HttpError(400,'مقدار ورودی نامعتبر است');return value.trim()}
export function response(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})}

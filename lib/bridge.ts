import { env } from 'cloudflare:workers';
import { passwordMember } from './password-auth';
export class HttpError extends Error{constructor(public status:number,message:string){super(message)}}
export type Member={id:string;identity:string|null;email:string;name:string;role:'admin'|'mentor'|'student';mentor_id:string|null};
export function database(){if(!env.DB)throw new HttpError(503,'پایگاه داده در دسترس نیست');return env.DB}
export async function currentMember(){const member=await passwordMember();if(!member)throw new HttpError(401,'با کد ملی و رمز عبور وارد شوید');return member as Member}
export function csrf(req:Request){const origin=req.headers.get('origin');if(!origin||origin!==new URL(req.url).origin)throw new HttpError(403,'مبدأ درخواست مجاز نیست');if(!req.headers.get('content-type')?.includes('application/json'))throw new HttpError(415,'درخواست باید JSON باشد')}
export async function body(req:Request){const raw=await req.text();if(raw.length>100000)throw new HttpError(413,'درخواست بیش از حد بزرگ است');try{return JSON.parse(raw)}catch{throw new HttpError(400,'JSON نامعتبر است')}}
export function text(value:unknown,min=1,max=200){if(typeof value!=='string'||value.trim().length<min||value.trim().length>max)throw new HttpError(400,'مقدار ورودی نامعتبر است');return value.trim()}
export function response(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})}

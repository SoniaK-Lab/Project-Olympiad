import { getChatGPTUser } from '../chatgpt-auth';
import { html } from '../../source-ui/document';
export const dynamic='force-dynamic';
export async function GET(req:Request){if(!await getChatGPTUser()){const u=new URL(req.url);return new Response(null,{status:303,headers:{Location:'/login?return_to='+encodeURIComponent('/ui'+u.search),'Cache-Control':'no-store'}})}return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})}

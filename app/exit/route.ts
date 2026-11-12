import { accessCookie } from '../access-cookie';
export const dynamic='force-dynamic';
export async function GET(){return new Response(null,{status:302,headers:{'Cache-Control':'no-store','Set-Cookie':accessCookie(null),Location:'/'}})}

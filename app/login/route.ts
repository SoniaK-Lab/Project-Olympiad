import { loginPage } from '../../source-ui/login-page';
export const dynamic='force-dynamic';
export async function GET(){return new Response(loginPage,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'}})}

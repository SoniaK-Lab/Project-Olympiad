import {getChatGPTUser,chatGPTSignInPath,chatGPTSignOutPath} from '../chatgpt-auth';
import {currentMember,HttpError} from '../../lib/bridge';
import {loginDestination,escapeLogin} from '../../lib/login';
import {loginPage} from '../../source-ui/login-page';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const target=loginDestination(new URL(req.url).searchParams.get('return_to'));
 const user=await getChatGPTUser();let name='',role='',denied=false,failed=false;
 if(user){try{const member=await currentMember();name=member.name;role=member.role}catch(e){denied=e instanceof HttpError&&e.status===403;failed=!denied;name=user.displayName}}
 const retry='/login?return_to='+encodeURIComponent(target);
 const href=failed?retry:denied?chatGPTSignOutPath(retry):user?target:chatGPTSignInPath(target);
 const label=failed?'تلاش دوباره':denied?'ورود با حساب دیگر':user?'ادامه به پنل من':'ورود با حساب ChatGPT';
 const roleText=({admin:'مدیر',mentor:'منتور',student:'منتی'} as Record<string,string>)[role]||'';
 const account=user?`<div class="login-account"><span class="login-account-avatar" aria-hidden="true">${escapeLogin(name.slice(0,2))}</span><div><strong>${escapeLogin(name)}</strong><span>${roleText?'حساب '+roleText+' · آمادهٔ ورود':denied?'حساب شما هنوز در فهرست کاربران مجاز نیست.':'بررسی دسترسی انجام نشد.'}</span></div></div>`:'';
 const message=failed?'ارتباط با سامانه برقرار نشد؛ دوباره تلاش کنید.':denied?'از مدیر بخواهید همین ایمیل حساب ChatGPT را در سایت ثبت و دسترسی آن را فعال کند.':user?'خوش آمدی؛ پنل متناسب با نقش ثبت‌شدهٔ تو باز می‌شود.':'با همان حسابی وارد شو که مدیر برایت فعال کرده است.';
 const content=loginPage.replace('{{ACCOUNT}}',account).replace('{{MESSAGE}}',escapeLogin(message)).replaceAll('{{HREF}}',escapeLogin(href)).replace('{{LABEL}}',label);
 return new Response(content,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'}});
}

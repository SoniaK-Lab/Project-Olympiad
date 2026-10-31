// Authentication always returns to the local dashboard; never an external URL.
export function loginDestination(value:unknown):string{
 if(typeof value!=='string'||value.length>2000||!value.startsWith('/')||value.startsWith('//'))return '/ui';
 try{const url=new URL(value,'https://bridge.local');if(url.origin!=='https://bridge.local'||url.pathname!=='/ui')return '/ui';return '/ui'+url.search}catch{return '/ui'}
}
export function escapeLogin(value:string):string{return value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))}

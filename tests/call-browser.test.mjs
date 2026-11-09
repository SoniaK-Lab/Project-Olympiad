import {setTimeout as delay} from 'node:timers/promises';
import {chromium} from 'playwright';
const origin='http://127.0.0.1:5174';
for(let i=0;i<45;i++){
 try{if((await fetch(origin,{signal:AbortSignal.timeout(1000)})).ok)break}catch{}
 if(i===44)throw Error('Local server did not start');
 await delay(1000);
}
const browser=await chromium.launch({executablePath:process.env.BRIDGE_TEST_CHROMIUM_PATH,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--allow-loopback-in-peer-connection','--disable-features=WebRtcHideLocalIpsWithMdns']});
try{
 const signIn=origin+'/signin-with-chatgpt?return_to=%2Fui';
 const admin=await browser.newPage();
 await admin.goto(signIn);
 await admin.locator('#serverGate').waitFor({state:'hidden'});
 const members=await admin.evaluate(async()=>{
  const {id:mentor}=await api('members','POST',{name:'منتور آزمون',email:'mentor-call@example.test',role:'mentor'});
  const {id:student}=await api('members','POST',{name:'دانشجوی آزمون',email:'student-call@example.test',role:'student',mentorId:mentor});
  await api('sessions','POST',{mentorId:mentor,studentId:student,date:'2030-01-18',time:'01:00',goal:'آزمون تماس'});
  return [mentor,student];
 });
 const peers=await Promise.all(members.map(async member=>{
  const peer=await browser.newPage({permissions:['camera','microphone']});
  await peer.addInitScript(id=>{if(location.protocol==='http:')sessionStorage.setItem('bridgeAdminView',id)},member);
  await peer.goto(signIn);
  await peer.locator('#serverGate').waitFor({state:'hidden'});
  await peer.getByRole('button',{name:'جلسات من'}).click();
  await peer.locator('#allSessions .room-launch').click();
  await peer.locator('#roomCamera').click();
  await peer.waitForFunction(()=>document.querySelector('#roomCamera').getAttribute('aria-pressed')==='true');
  return peer;
 }));
 await Promise.all(peers.map(peer=>peer.locator('#roomJoinCall').click()));
 let reports;
 for(let i=0;i<35;i++){
  reports=await Promise.all(peers.map(peer=>peer.evaluate(async()=>{
   const pc=liveCall?.pc;
   const status=document.querySelector('#roomConnectionState')?.textContent;
   if(!pc)return {role:serverUser.role,status};
   const stats=await pc.getStats();
   const rows=[...stats.values()];
   const pair=rows.find(row=>row.type==='transport'&&row.selectedCandidatePairId);
   const selected=pair&&stats.get(pair.selectedCandidatePairId);
   return {role:serverUser.role,status,gather:pc.iceGatheringState,ice:pc.iceConnectionState,state:pc.connectionState,transport:selected&&stats.get(selected.localCandidateId)?.candidateType,media:rows.filter(row=>row.type==='inbound-rtp').map(row=>({kind:row.kind,packets:row.packetsReceived,frames:row.framesDecoded}))};
  })));
  if(reports.every(r=>r.state==='connected'&&r.media.some(x=>x.kind==='audio'&&x.packets>5)&&r.media.some(x=>x.kind==='video'&&x.packets>5&&x.frames>0)))break;
  if(i===34){console.log(JSON.stringify(reports,null,2));throw Error('No two-way audio and decoded video');}
  await delay(1000);
 }
 console.log(JSON.stringify(reports,null,2));
 const left=peers[0].waitForResponse(r=>r.url().endsWith('/leave')&&r.ok());
 await peers[0].getByRole('button',{name:'بازگشت به جلسات'}).click();
 await left;
 await peers[1].waitForFunction(()=>liveCall?.peer===null);
 console.log('PASS: two-way audio and decoded video; leave signaled to the other peer');
}finally{await browser.close()}

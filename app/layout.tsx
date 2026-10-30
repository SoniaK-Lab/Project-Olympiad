import type { Metadata } from 'next';
export const metadata:Metadata={title:'پل بالینی | آموزش پزشکی',description:'منتورینگ، جلسات و تمرین بالینی'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="fa" dir="rtl"><body style={{margin:0}}>{children}</body></html>}

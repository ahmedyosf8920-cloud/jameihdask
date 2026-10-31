// يخزن ملفات الواجهة فقط؛ لا يخزن اتصالات Supabase أبدًا (الإصدار 33: يعمل بدون إنترنت)
const C='jkh-v33';
const SHELL=['./','index.html','config.js','jkh-offline.js','jkh-look.js','jkh-docs.js','jkh-v30.js','manifest.webmanifest','logo.jpg','icon-192.png','icon-512.png','version.txt','verify.html'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>Promise.all(SHELL.map(u=>c.add(new Request(u,{cache:'reload'})).catch(()=>{})))))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
 const r=e.request,u=new URL(r.url);
 if(r.method!=='GET'||u.origin!==location.origin)return;
 if(u.pathname.endsWith('/version.txt')){return}               // فحص الإصدار دائمًا من الشبكة
 e.respondWith(fetch(r).then(res=>{if(res.ok){const c=res.clone();caches.open(C).then(x=>x.put(r,c))}return res})
  .catch(async()=>{
   const m=await caches.match(r)||await caches.match(r,{ignoreSearch:true});
   if(m)return m;
   if(r.mode==='navigate')return (await caches.match('index.html'))||(await caches.match('./'))||Response.error();
   return Response.error()}));
});

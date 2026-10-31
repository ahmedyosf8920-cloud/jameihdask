/* جمعية الخير للجميع — العمل بدون إنترنت (الإصدار 33)
   - نسخة محلية من البيانات (IndexedDB) لكل مستخدم على هذا الجهاز.
   - أي تعديل يُحفظ محليًا أولًا ثم يُرسل؛ عند انقطاع الإنترنت يبقى في الانتظار ويُرسل تلقائيًا عند عودته (مع دمج تعديلات الآخرين).
   - دخول بدون إنترنت لمن سبق دخوله على هذا الجهاز (تحقق بـ PBKDF2 محلي، صلاحية 30 يومًا).
   - تخزين مكتبات CDN محليًا لتعمل الواجهة عند البدء بدون إنترنت.  */
(function(){
'use strict';
var LIBS=[
 ['jkh_lib_sb','https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js',function(){return window.supabase&&window.supabase.createClient}],
 ['jkh_lib_xlsx','https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',function(){return window.XLSX}]
];
var OFFLINE_LOGIN_DAYS=30;

/* ---------- مكتبات CDN: استخدم النسخة المخزنة إن فشل التحميل ---------- */
LIBS.forEach(function(l){
 try{
  if(!l[2]()){var t=localStorage.getItem(l[0]);if(t){var s=document.createElement('script');s.textContent=t;document.head.appendChild(s)}}
 }catch(e){}
});
window.addEventListener('load',function(){
 setTimeout(function(){LIBS.forEach(function(l){
  try{if(l[2]()&&!localStorage.getItem(l[0])&&navigator.onLine){fetch(l[1]).then(function(r){return r.ok?r.text():null}).then(function(t){if(t&&t.length>1000){try{localStorage.setItem(l[0],t)}catch(e){}}}).catch(function(){})}}catch(e){}
 })},3000);
});

/* ---------- IndexedDB بسيط ---------- */
var DB=null;
function db(){return DB||(DB=new Promise(function(ok,no){try{var r=indexedDB.open('jkh_off',1);r.onupgradeneeded=function(){r.result.createObjectStore('kv')};r.onsuccess=function(){ok(r.result)};r.onerror=function(){no(r.error)}}catch(e){no(e)}}))}
function tx(mode,f){return db().then(function(d){return new Promise(function(ok,no){var t=d.transaction('kv',mode),q=f(t.objectStore('kv'));t.oncomplete=function(){ok(q&&q.result)};t.onerror=t.onabort=function(){no(t.error)}})}).catch(function(){return undefined})}
function get(k){return tx('readonly',function(s){return s.get(k)})}
function set(k,v){return tx('readwrite',function(s){return s.put(v,k)})}
function del(k){return tx('readwrite',function(s){return s.delete(k)})}
function clearAll(){return tx('readwrite',function(s){return s.clear()})}

function curUser(){var c=window.__inboxCred;return c&&c.u?String(c.u).trim().toLowerCase():''}
function uk(){return curUser()}

/* ---------- كشف انقطاع الشبكة ---------- */
function isNet(e){
 if(!navigator.onLine)return true;
 var m=String((e&&(e.message||e.details||e.name))||e||'');
 return /failed to fetch|networkerror|network request failed|load failed|fetch failed|err_internet|err_network|err_name_not_resolved|timeout|timed out|aborted/i.test(m);
}
function isAuth(e){return /غير مصرح|انتهت الجلسة|JWT|not authorized/i.test(String((e&&e.message)||e||''))}

/* ---------- الشريط العلوي للحالة ---------- */
var S={offline:false,hasPending:false},bar=null,T=null;
function show(text,bg,auto){
 if(!document.body)return;
 if(!bar){bar=document.createElement('div');bar.id='jkhOffBar';bar.setAttribute('role','status');
  bar.style.cssText='position:fixed;bottom:72px;left:50%;transform:translateX(-50%);z-index:9996;padding:8px 16px;border-radius:99px;font-size:13px;color:#fff;box-shadow:0 4px 14px #0004;direction:rtl;max-width:92vw;text-align:center;font-family:inherit';
  var st=document.createElement('style');st.textContent='@media print{#jkhOffBar{display:none!important}}';document.head.appendChild(st);document.body.appendChild(bar)}
 bar.style.background=bg;bar.textContent=text;bar.style.display='block';clearTimeout(T);if(auto)T=setTimeout(function(){bar.style.display='none'},auto);
}
function offline(hasPending){S.offline=true;S.hasPending=!!hasPending;
 show('🔴 لا يوجد اتصال بالإنترنت — تعمل على نسخة الجهاز'+(hasPending?' · تغييراتك محفوظة وستُرسل تلقائيًا عند عودة الإنترنت':''),'#b3261e');}
function online(afterSave){
 if(S.offline){S.offline=false;S.hasPending=false;show('✓ عاد الاتصال — تمت المزامنة','#18864b',4000)}
}
function needLogin(){
 S.offline=true;show('⚠️ انتهت صلاحية الجلسة — سجّل الدخول لإكمال المزامنة (بياناتك محفوظة على الجهاز)','#b26a00');
 setTimeout(function(){try{if(typeof logout==='function')logout()}catch(e){}},400);
}

/* شريط حفظ التغييرات: لا تُظهر "تم الحفظ السحابي" أثناء الانقطاع */
(function(){var n=0;var iv=setInterval(function(){
 if(typeof window.__chip==='function'&&!window.__chip.__off){var o=window.__chip;var w=function(st){if(S.offline&&(st==='saved'||st==='saving'||st==='error'||st==='merged'))return;return o.apply(this,arguments)};w.__off=1;window.__chip=w;clearInterval(iv)}
 if(++n>100)clearInterval(iv)},300)})();

/* ---------- الدخول بدون إنترنت ---------- */
function b64e(u8){var s='';for(var i=0;i<u8.length;i++)s+=String.fromCharCode(u8[i]);return btoa(s)}
function b64d(s){var b=atob(s),u=new Uint8Array(b.length);for(var i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u}
function pbk(p,saltB64){
 return crypto.subtle.importKey('raw',new TextEncoder().encode(p),'PBKDF2',false,['deriveBits']).then(function(k){
  return crypto.subtle.deriveBits({name:'PBKDF2',salt:b64d(saltB64),iterations:150000,hash:'SHA-256'},k,256)}).then(function(b){return b64e(new Uint8Array(b))});
}
function remember(u,p,user,cred){
 try{if(!window.crypto||!crypto.subtle)return Promise.resolve();
  var salt=b64e(crypto.getRandomValues(new Uint8Array(16)));
  return pbk(p,salt).then(function(h){return set('cred:'+String(u).trim().toLowerCase(),{salt:salt,hash:h,user:user,cred:cred||null,at:Date.now()})}).catch(function(){});
 }catch(e){return Promise.resolve()}
}
function offlineLogin(u,p){
 try{if(!window.crypto||!crypto.subtle)return Promise.resolve(null);
  var key='cred:'+String(u).trim().toLowerCase();
  return get(key).then(function(rec){
   if(!rec)return {ok:false,reason:'none'};
   if(Date.now()-rec.at>OFFLINE_LOGIN_DAYS*86400000)return {ok:false,reason:'expired'};
   return pbk(p,rec.salt).then(function(h){return h===rec.hash?{ok:true,user:rec.user,cred:rec.cred}:{ok:false,reason:'bad'}});
  }).catch(function(){return null});
 }catch(e){return Promise.resolve(null)}
}

/* ---------- المزامنة التلقائية ---------- */
function tick(){
 if(!uk()||!navigator.onLine)return;
 get('pending:'+uk()).then(function(p){
  if(p&&p.payload){ try{S.offline=true;show('🔄 جارٍ إرسال التغييرات المحفوظة…','#176bb4');if(typeof window.save==='function')window.save()}catch(e){} }
  else if(S.offline){ try{if(typeof loadCentral==='function')loadCentral().then(function(){online()},function(){})}catch(e){} }
 });
}
setInterval(tick,15000);
window.addEventListener('online',function(){setTimeout(tick,1500)});
window.addEventListener('offline',function(){if(uk())get('pending:'+uk()).then(function(p){offline(!!(p&&p.payload))})});

/* ---------- حالة للوحة الإعدادات ---------- */
function statusText(){
 var u=uk();if(!u)return Promise.resolve('سجّل الدخول أولًا.');
 return Promise.all([get('pending:'+u),get('cache:'+u)]).then(function(r){
  var t=navigator.onLine?'🟢 متصل. ':'🔴 غير متصل. ';
  t+=r[0]&&r[0].payload?'يوجد تغييرات محفوظة بانتظار المزامنة.':'لا توجد تغييرات معلّقة.';
  if(r[1]&&r[1].at)t+=' آخر نسخة محلية: '+new Date(r[1].at).toLocaleString('ar-EG')+'.';
  return t});
}
function wipe(){
 return get('pending:'+uk()).then(function(p){
  var msg=p&&p.payload?'⚠️ يوجد تغييرات لم تُرسل بعد وسيتم فقدها نهائيًا!\nهل تريد مسح بيانات العمل بدون إنترنت من هذا الجهاز؟':'مسح النسخة المحلية وبيانات الدخول بدون إنترنت من هذا الجهاز؟';
  if(!confirm(msg))return false;return clearAll().then(function(){return true})});
}

window.JKHOff={get:get,set:set,del:del,uk:uk,isNet:isNet,isAuth:isAuth,offline:offline,online:online,needLogin:needLogin,remember:remember,offlineLogin:offlineLogin,statusText:statusText,wipe:wipe,tick:tick};
})();

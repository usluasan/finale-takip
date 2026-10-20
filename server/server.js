// Finale Takibi sunucusu — bağımlılık yok, Node 22.5+ (yerleşik SQLite)
'use strict';
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const {DatabaseSync}=require('node:sqlite');
const PORT=+process.env.PORT||8080;
const DATA=process.env.DATA_DIR||path.join(__dirname,'..','veri');
const APP_KEY=process.env.APP_KEY||'';      // herkesin kullandığı giriş anahtarı
const ADMIN_KEY=process.env.ADMIN_KEY||'';  // uygulama sahibi (parolasız giriş) anahtarı
const WEB=path.resolve(process.env.WEB_DIR||path.join(__dirname,'..','web'));
const TRUST_PROXY=process.env.TRUST_PROXY==='1';           // yalnızca ters vekil (NPM/gateway) arkasında 1 yapın
const COOKIE_PATH=process.env.COOKIE_PATH||'/';           // alt yolda yayında örn. /finale/
const OTURUM_GUN=30;                                      // oturum çerezi ömrü (gün)
const DENEME_SINIRI=10, DENEME_PENCERE=15*60*1000;       // 15 dakikada 10 hatalı anahtar -> 15 dakika engel
if(!APP_KEY){console.error('HATA: APP_KEY ortam değişkeni tanımlı değil. Örnek: APP_KEY=gizli-bir-anahtar node server.js');process.exit(1)}
// Zayıf ya da yer tutucu anahtarla açılmayı engelle (yerel denemede ALLOW_WEAK_KEYS=1 ile atlanabilir)
const zayif=k=>k.length<16||/BURAYA/i.test(k);
if(process.env.ALLOW_WEAK_KEYS!=='1'&&(zayif(APP_KEY)||(ADMIN_KEY&&zayif(ADMIN_KEY)))){console.error('HATA: APP_KEY/ADMIN_KEY en az 16 karakter olmalı ve yer tutucu ("BURAYA-...") olmamalı. Örnek üretim: openssl rand -hex 24');process.exit(1)}
if(ADMIN_KEY&&ADMIN_KEY===APP_KEY){console.error('HATA: ADMIN_KEY, APP_KEY ile aynı olamaz.');process.exit(1)}
fs.mkdirSync(path.join(DATA,'blobs'),{recursive:true});
const db=new DatabaseSync(path.join(DATA,'finale.db'));
db.exec('PRAGMA journal_mode=WAL;CREATE TABLE IF NOT EXISTS docs(col TEXT NOT NULL,id TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(col,id));CREATE TABLE IF NOT EXISTS blobs(id TEXT PRIMARY KEY,type TEXT,name TEXT,size INTEGER);CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,lvl INTEGER NOT NULL,exp INTEGER NOT NULL)');
const q={list:db.prepare('SELECT id,data FROM docs WHERE col=?'),get:db.prepare('SELECT data FROM docs WHERE col=? AND id=?'),put:db.prepare('INSERT INTO docs(col,id,data) VALUES(?,?,?) ON CONFLICT(col,id) DO UPDATE SET data=excluded.data'),del:db.prepare('DELETE FROM docs WHERE col=? AND id=?'),bput:db.prepare('INSERT INTO blobs(id,type,name,size) VALUES(?,?,?,?)'),bget:db.prepare('SELECT type,name FROM blobs WHERE id=?'),
  sput:db.prepare('INSERT INTO sessions(token,lvl,exp) VALUES(?,?,?)'),sget:db.prepare('SELECT lvl FROM sessions WHERE token=? AND exp>?'),sdel:db.prepare('DELETE FROM sessions WHERE token=?'),sclean:db.prepare('DELETE FROM sessions WHERE exp<=?')};
const tsEq=(a,b)=>{const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&crypto.timingSafeEqual(x,y)};
const keyLevel=k=>ADMIN_KEY&&tsEq(k,ADMIN_KEY)?2:tsEq(k,APP_KEY)?1:0;
// Çerezde anahtarın kendisi değil, rastgele oturum kodu tutulur; çıkışta ve süre dolunca geçersiz olur
const cookieTok=r=>{const m=/(?:^|;\s*)fsess=([A-Za-z0-9_-]{32,64})(?:;|$)/.exec(r.headers.cookie||'');return m?m[1]:''};
const sessLevel=t=>{if(!t)return 0;const r=q.sget.get(t,Date.now());return r?r.lvl:0};
const secure=r=>(r.headers['x-forwarded-proto']==='https'&&TRUST_PROXY)?'; Secure':'';
// Hatalı anahtar denemesi sınırı (IP başına, bellekte)
const deneme=new Map();
const ipOf=r=>{if(TRUST_PROXY){const x=r.headers['x-real-ip']||String(r.headers['x-forwarded-for']||'').split(',')[0].trim();if(x)return x}return r.socket.remoteAddress||'?'};
const engelli=ip=>{const d=deneme.get(ip);return !!d&&d.n>=DENEME_SINIRI&&Date.now()-d.t<DENEME_PENCERE};
const hatali=ip=>{const now=Date.now(),d=deneme.get(ip);if(!d||now-d.t>=DENEME_PENCERE)deneme.set(ip,{n:1,t:now});else d.n++};
setInterval(()=>{const now=Date.now();for(const [k,d] of deneme)if(now-d.t>=DENEME_PENCERE)deneme.delete(k);q.sclean.run(now)},10*60*1000).unref();
const level=r=>{const h=r.headers['x-key'];if(h!==undefined){const ip=ipOf(r);if(engelli(ip))return -1;const lv=keyLevel(String(h));if(!lv)hatali(ip);return lv}return sessLevel(cookieTok(r))};
const rid=()=>crypto.randomBytes(15).toString('base64url').slice(0,20);
const clients=new Set();
function emit(col){const m='data: '+JSON.stringify({col})+'\n\n';for(const c of clients)try{c.write(m)}catch(e){}}
const MIME={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.wasm':'application/wasm','.txt':'text/plain; charset=utf-8','.ico':'image/x-icon'};
// Tarayıcıda kod çalıştırabilecek yüklenmiş dosya türleri görüntülenmez, indirilir (aynı alan adındaki diğer uygulamaları korur)
const tehlikeliTur=t=>/html|xml|svg|javascript|ecmascript/i.test(t||'');
function body(r,max){return new Promise((ok,no)=>{const a=[];let n=0;r.on('data',c=>{n+=c.length;if(n>max){no(new Error('big'));r.destroy();return}a.push(c)});r.on('end',()=>ok(Buffer.concat(a)));r.on('error',no)})}
const J=(s,c,o)=>{s.writeHead(c,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});s.end(JSON.stringify(o))};
const okName=s=>/^[A-Za-z0-9_\-.~:@+]{1,200}$/.test(s)&&s!=='.'&&s!=='..';
http.createServer(async(req,res)=>{
  try{
    res.setHeader('x-content-type-options','nosniff');
    const u=new URL(req.url,'http://x'),p=u.pathname;
    if(p==='/saglik')return J(res,200,{ok:1});
    if(p==='/api/login'&&req.method==='POST'){const ip=ipOf(req);if(engelli(ip))return J(res,429,{error:'cok_deneme'});
      const b=JSON.parse((await body(req,4096)).toString()||'{}');const lv=keyLevel(String(b.key||''));if(!lv){hatali(ip);return J(res,401,{error:'bad_key'})}
      deneme.delete(ip);const t=crypto.randomBytes(32).toString('base64url');q.sput.run(t,lv,Date.now()+OTURUM_GUN*864e5);
      res.setHeader('set-cookie','fsess='+t+'; Path='+COOKIE_PATH+'; Max-Age='+(OTURUM_GUN*86400)+'; SameSite=Strict; HttpOnly'+secure(req));return J(res,200,{ok:1,owner:lv===2})}
    if(p==='/api/logout'){const t=cookieTok(req);if(t)q.sdel.run(t);res.setHeader('set-cookie','fsess=; Path='+COOKIE_PATH+'; Max-Age=0; SameSite=Strict; HttpOnly'+secure(req));return J(res,200,{ok:1})}
    if(p.startsWith('/api/')||p.startsWith('/_blob/')){
      const lv=level(req);if(lv<0)return J(res,429,{error:'cok_deneme'});if(!lv)return J(res,401,{error:'auth'});
      if(p==='/api/whoami')return J(res,200,{ok:1,owner:lv===2});
      if(p==='/api/events'){res.writeHead(200,{'content-type':'text/event-stream','cache-control':'no-store',connection:'keep-alive','x-accel-buffering':'no'});res.write('retry: 3000\n\n');clients.add(res);const t=setInterval(()=>{try{res.write(': ping\n\n')}catch(e){}},25000);req.on('close',()=>{clearInterval(t);clients.delete(res)});return}
      let m;
      if(m=/^\/api\/c\/([^/]+)$/.exec(p)){const col=decodeURIComponent(m[1]);if(!okName(col))return J(res,400,{error:'name'});
        if(req.method==='GET')return J(res,200,q.list.all(col).map(r=>({id:r.id,data:JSON.parse(r.data)})));
        if(req.method==='POST'){const d=JSON.parse((await body(req,8e6)).toString());const id=rid();q.put.run(col,id,JSON.stringify(d));emit(col);return J(res,200,{id})}}
      if(m=/^\/api\/d\/([^/]+)\/([^/]+)$/.exec(p)){const col=decodeURIComponent(m[1]),id=decodeURIComponent(m[2]);if(!okName(col)||!okName(id))return J(res,400,{error:'name'});
        if(req.method==='GET'){const r=q.get.get(col,id);return J(res,200,r?{exists:true,data:JSON.parse(r.data)}:{exists:false})}
        if(req.method==='PUT'){const d=JSON.parse((await body(req,8e6)).toString());q.put.run(col,id,JSON.stringify(d));emit(col);return J(res,200,{ok:1})}
        if(req.method==='PATCH'){const r=q.get.get(col,id),cur=r?JSON.parse(r.data):{},d=JSON.parse((await body(req,8e6)).toString());q.put.run(col,id,JSON.stringify(Object.assign(cur,d)));emit(col);return J(res,200,{ok:1})}
        if(req.method==='DELETE'){q.del.run(col,id);emit(col);return J(res,200,{ok:1})}}
      if(p==='/api/blob'&&req.method==='POST'){const b=await body(req,30e6),id=rid();fs.writeFileSync(path.join(DATA,'blobs',id),b);q.bput.run(id,String(req.headers['x-type']||'application/octet-stream').slice(0,100),decodeURIComponent(String(req.headers['x-name']||'')).slice(0,200),b.length);return J(res,200,{id})}
      if(m=/^\/_blob\/([A-Za-z0-9_-]{8,64})$/.exec(p)){const r=q.bget.get(m[1]);if(!r){res.writeHead(404);return res.end()}
        const h={'content-type':r.type||'application/octet-stream','cache-control':'private, max-age=3600'};
        if(tehlikeliTur(r.type)){h['content-type']='application/octet-stream';h['content-disposition']='attachment';h['content-security-policy']='sandbox'}
        res.writeHead(200,h);return fs.createReadStream(path.join(DATA,'blobs',m[1])).pipe(res)}
      return J(res,404,{error:'yok'});
    }
    // statik dosyalar
    let f=path.normalize(path.join(WEB,p==='/'?'index.html':decodeURIComponent(p)));
    if(f!==WEB&&!f.startsWith(WEB+path.sep)){res.writeHead(403);return res.end()}
    if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end('yok')}
    res.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream','cache-control':'no-cache'});fs.createReadStream(f).pipe(res);
  }catch(e){try{J(res,500,{error:String(e&&e.message||e)})}catch(_){}}
}).listen(PORT,()=>console.log('Finale sunucusu: http://localhost:'+PORT+'  (veri: '+DATA+')'));

// Finale Takibi sunucusu — bağımlılık yok, Node 22.5+ (yerleşik SQLite)
'use strict';
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const {DatabaseSync}=require('node:sqlite');
const sifre=require('./sifre');
const PORT=+process.env.PORT||8080;
const DATA=process.env.DATA_DIR||path.join(__dirname,'..','veri');
const ADMIN_KEY=process.env.ADMIN_KEY||'';  // yalnızca acil durum/yönetim betikleri için (x-key başlığı); ekranda giriş yolu yok
const WEB=path.resolve(process.env.WEB_DIR||path.join(__dirname,'..','web'));
const TRUST_PROXY=process.env.TRUST_PROXY==='1';           // yalnızca ters vekil (NPM/gateway) arkasında 1 yapın
const COOKIE_PATH=process.env.COOKIE_PATH||'/';           // alt yolda yayında örn. /finale/
const OTURUM_GUN=30;                                      // oturum çerezi ömrü (gün)
const DENEME_SINIRI=10, DENEME_PENCERE=15*60*1000;       // 15 dakikada 10 hatalı giriş -> 15 dakika engel
// Giriş artık kullanıcı adı + şifreyle (v0.5.0). APP_KEY kullanılmıyor; tanımlıysa yok sayılır.
if(process.env.APP_KEY)console.warn('UYARI: APP_KEY artık kullanılmıyor (giriş kullanıcı adı + şifreyle); ortam dosyasından kaldırabilirsiniz.');
// Zayıf ya da yer tutucu yönetim anahtarıyla açılmayı engelle (yerel denemede ALLOW_WEAK_KEYS=1 ile atlanabilir)
const zayif=k=>k.length<16||/BURAYA/i.test(k);
if(process.env.ALLOW_WEAK_KEYS!=='1'&&ADMIN_KEY&&zayif(ADMIN_KEY)){console.error('HATA: ADMIN_KEY en az 16 karakter olmalı ve yer tutucu ("BURAYA-...") olmamalı. Örnek üretim: openssl rand -hex 24');process.exit(1)}
fs.mkdirSync(path.join(DATA,'blobs'),{recursive:true});
const db=new DatabaseSync(path.join(DATA,'finale.db'));
db.exec('PRAGMA journal_mode=WAL;CREATE TABLE IF NOT EXISTS docs(col TEXT NOT NULL,id TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(col,id));CREATE TABLE IF NOT EXISTS blobs(id TEXT PRIMARY KEY,type TEXT,name TEXT,size INTEGER);CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,lvl INTEGER NOT NULL,exp INTEGER NOT NULL)');
// v0.5.0: oturum bir kullanıcıya bağlıdır; anahtarla açılmış eski oturumlar silinir
if(!db.prepare("SELECT 1 FROM pragma_table_info('sessions') WHERE name='uid'").get())db.exec('ALTER TABLE sessions ADD COLUMN uid TEXT');
db.exec('DELETE FROM sessions WHERE uid IS NULL');
const q={list:db.prepare('SELECT id,data FROM docs WHERE col=?'),get:db.prepare('SELECT data FROM docs WHERE col=? AND id=?'),put:db.prepare('INSERT INTO docs(col,id,data) VALUES(?,?,?) ON CONFLICT(col,id) DO UPDATE SET data=excluded.data'),del:db.prepare('DELETE FROM docs WHERE col=? AND id=?'),bput:db.prepare('INSERT INTO blobs(id,type,name,size) VALUES(?,?,?,?)'),bget:db.prepare('SELECT type,name FROM blobs WHERE id=?'),
  sput:db.prepare('INSERT INTO sessions(token,lvl,exp,uid) VALUES(?,?,?,?)'),sget:db.prepare('SELECT lvl,uid FROM sessions WHERE token=? AND exp>?'),sdel:db.prepare('DELETE FROM sessions WHERE token=?'),sdelUid:db.prepare('DELETE FROM sessions WHERE uid=? AND token<>?'),sclean:db.prepare('DELETE FROM sessions WHERE exp<=?')};
const tsEq=(a,b)=>{const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&crypto.timingSafeEqual(x,y)};
// Kullanıcı kayıtları: şifre özeti ve tuzu sunucudan hiçbir zaman dışarı çıkmaz
const GIZLI=['pinHash','salt'];
const temizle=(col,d)=>{if(col!=='appusers'||!d||typeof d!=='object')return d;const c=Object.assign({},d);for(const k of GIZLI)delete c[k];return c};
const kullanici=id=>{const r=id&&q.get.get('appusers',id);if(!r)return null;const u=JSON.parse(r.data);return (u.active===0||u.active===false)?null:Object.assign(u,{id})};
const kullaniciAdla=ad=>{const n=sifre.adNorm(ad);if(!n)return null;for(const r of q.list.all('appusers')){const u=JSON.parse(r.data);if(u.active!==0&&u.active!==false&&sifre.adNorm(u.name)===n)return Object.assign(u,{id:r.id})}return null};
// Çerezde rastgele oturum kodu tutulur; çıkışta, süre dolunca ya da kullanıcı pasifleşince geçersiz olur
const cookieTok=r=>{const m=/(?:^|;\s*)fsess=([A-Za-z0-9_-]{32,64})(?:;|$)/.exec(r.headers.cookie||'');return m?m[1]:''};
const oturum=t=>{if(!t)return null;const r=q.sget.get(t,Date.now());if(!r)return null;const u=kullanici(r.uid);return u?{lvl:r.lvl,u}:null};
const secure=r=>(r.headers['x-forwarded-proto']==='https'&&TRUST_PROXY)?'; Secure':'';
const cerez=(req,t,yas)=>'fsess='+t+'; Path='+COOKIE_PATH+'; Max-Age='+yas+'; SameSite=Strict; HttpOnly'+secure(req);
// Hatalı giriş denemesi sınırı (IP başına, bellekte)
const deneme=new Map();
const ipOf=r=>{if(TRUST_PROXY){const x=r.headers['x-real-ip']||String(r.headers['x-forwarded-for']||'').split(',')[0].trim();if(x)return x}return r.socket.remoteAddress||'?'};
const engelli=ip=>{const d=deneme.get(ip);return !!d&&d.n>=DENEME_SINIRI&&Date.now()-d.t<DENEME_PENCERE};
const hatali=ip=>{const now=Date.now(),d=deneme.get(ip);if(!d||now-d.t>=DENEME_PENCERE)deneme.set(ip,{n:1,t:now});else d.n++};
setInterval(()=>{const now=Date.now();for(const [k,d] of deneme)if(now-d.t>=DENEME_PENCERE)deneme.delete(k);q.sclean.run(now)},10*60*1000).unref();
// Erişim: x-key (yalnız ADMIN_KEY, acil durum) ya da kullanıcı oturumu. {lvl:-1} = engelli, null = yok
const erisim=r=>{const h=r.headers['x-key'];if(h!==undefined){const ip=ipOf(r);if(engelli(ip))return {lvl:-1};if(ADMIN_KEY&&tsEq(String(h),ADMIN_KEY))return {lvl:2,u:null};hatali(ip);return null}return oturum(cookieTok(r))};
const rid=()=>crypto.randomBytes(15).toString('base64url').slice(0,20);
const clients=new Set();
function emit(col){const m='data: '+JSON.stringify({col})+'\n\n';for(const c of clients)try{c.write(m)}catch(e){}}
const MIME={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.wasm':'application/wasm','.txt':'text/plain; charset=utf-8','.ico':'image/x-icon'};
// Tarayıcıda kod çalıştırabilecek yüklenmiş dosya türleri görüntülenmez, indirilir (aynı alan adındaki diğer uygulamaları korur)
const tehlikeliTur=t=>/html|xml|svg|javascript|ecmascript/i.test(t||'');
function body(r,max){return new Promise((ok,no)=>{const a=[];let n=0;r.on('data',c=>{n+=c.length;if(n>max){no(new Error('big'));r.destroy();return}a.push(c)});r.on('end',()=>ok(Buffer.concat(a)));r.on('error',no)})}
const J=(s,c,o)=>{s.writeHead(c,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});s.end(JSON.stringify(o))};
const okName=s=>/^[A-Za-z0-9_\-.~:@+]{1,200}$/.test(s)&&s!=='.'&&s!=='..';
const kim=u=>u?{id:u.id,name:u.name,mustChange:u.mustChange?1:0}:null;
http.createServer(async(req,res)=>{
  try{
    res.setHeader('x-content-type-options','nosniff');
    const u=new URL(req.url,'http://x'),p=u.pathname;
    if(p==='/saglik')return J(res,200,{ok:1});
    // Giriş: kullanıcı adı + şifre (uygulamadaki kullanıcılar). Eski anahtar girişi kaldırıldı.
    if(p==='/api/login'&&req.method==='POST'){const ip=ipOf(req);if(engelli(ip))return J(res,429,{error:'cok_deneme'});
      const b=JSON.parse((await body(req,4096)).toString()||'{}');
      if(b.key!==undefined&&b.name===undefined)return J(res,400,{error:'kullanici_adi_gerekli'});
      const ad=String(b.name||''),pw=String(b.password||'');
      const k=ad&&pw?kullaniciAdla(ad):null;const sonuc=k?sifre.dogrula(k,pw):sifre.bosDogrula(pw||'x');
      if(!sonuc.ok){hatali(ip);return J(res,401,{error:'hatali_giris'})}
      deneme.delete(ip);
      if(sonuc.eski){const d=JSON.parse(q.get.get('appusers',k.id).data);d.pinHash=sifre.ozetle(pw);delete d.salt;q.put.run('appusers',k.id,JSON.stringify(d))}  // eski özet scrypt'e yükseltilir
      const t=crypto.randomBytes(32).toString('base64url');q.sput.run(t,1,Date.now()+OTURUM_GUN*864e5,k.id);
      res.setHeader('set-cookie',cerez(req,t,OTURUM_GUN*86400));return J(res,200,{ok:1,owner:false,user:kim(k)})}
    if(p==='/api/logout'){const t=cookieTok(req);if(t)q.sdel.run(t);res.setHeader('set-cookie',cerez(req,'',0));return J(res,200,{ok:1})}
    if(p.startsWith('/api/')||p.startsWith('/_blob/')){
      const e=erisim(req);if(e&&e.lvl<0)return J(res,429,{error:'cok_deneme'});if(!e)return J(res,401,{error:'auth'});
      if(p==='/api/whoami')return J(res,200,{ok:1,owner:e.lvl===2,user:kim(e.u)});
      // Kendi şifresini değiştirme: eski şifre sunucuda doğrulanır, yeni özet sunucuda üretilir
      if(p==='/api/password'&&req.method==='POST'){if(!e.u)return J(res,400,{error:'kullanici_oturumu_gerekli'});
        const b=JSON.parse((await body(req,4096)).toString()||'{}'),eski=String(b.old||''),yeni=String(b.new||'');
        const d=JSON.parse(q.get.get('appusers',e.u.id).data);
        if(!sifre.dogrula(d,eski).ok){const ip=ipOf(req);hatali(ip);return J(res,403,{error:'eski_sifre_hatali'})}
        if(yeni.length<sifre.EN_AZ)return J(res,400,{error:'sifre_kisa',min:sifre.EN_AZ});
        d.pinHash=sifre.ozetle(yeni);delete d.salt;d.mustChange=0;d.resetReq=0;q.put.run('appusers',e.u.id,JSON.stringify(d));
        q.sdelUid.run(e.u.id,cookieTok(req));emit('appusers');return J(res,200,{ok:1})}  // diğer cihazlardaki oturumlar kapanır
      if(p==='/api/events'){res.writeHead(200,{'content-type':'text/event-stream','cache-control':'no-store',connection:'keep-alive','x-accel-buffering':'no'});res.write('retry: 3000\n\n');clients.add(res);const t=setInterval(()=>{try{res.write(': ping\n\n')}catch(e){}},25000);req.on('close',()=>{clearInterval(t);clients.delete(res)});return}
      let m;
      if(m=/^\/api\/c\/([^/]+)$/.exec(p)){const col=decodeURIComponent(m[1]);if(!okName(col))return J(res,400,{error:'name'});
        if(req.method==='GET')return J(res,200,q.list.all(col).map(r=>({id:r.id,data:temizle(col,JSON.parse(r.data))})));
        if(req.method==='POST'){const d=JSON.parse((await body(req,8e6)).toString());const id=rid();q.put.run(col,id,JSON.stringify(d));emit(col);return J(res,200,{id})}}
      if(m=/^\/api\/d\/([^/]+)\/([^/]+)$/.exec(p)){const col=decodeURIComponent(m[1]),id=decodeURIComponent(m[2]);if(!okName(col)||!okName(id))return J(res,400,{error:'name'});
        if(req.method==='GET'){const r=q.get.get(col,id);return J(res,200,r?{exists:true,data:temizle(col,JSON.parse(r.data))}:{exists:false})}
        if(req.method==='PUT'){const d=JSON.parse((await body(req,8e6)).toString());
          if(col==='appusers'){const r=q.get.get(col,id),cur=r?JSON.parse(r.data):{};for(const k of GIZLI)if(d[k]===undefined&&cur[k]!==undefined)d[k]=cur[k]}  // istemci özeti bilmez; korunur
          q.put.run(col,id,JSON.stringify(d));emit(col);return J(res,200,{ok:1})}
        if(req.method==='PATCH'){const r=q.get.get(col,id),cur=r?JSON.parse(r.data):{},d=JSON.parse((await body(req,8e6)).toString());
          q.put.run(col,id,JSON.stringify(Object.assign(cur,d)));
          if(col==='appusers'&&(d.pinHash!==undefined||d.active===0||d.active===false))q.sdelUid.run(id,cookieTok(req));  // şifresi sıfırlanan/pasifleşen kullanıcının oturumları kapanır
          emit(col);return J(res,200,{ok:1})}
        if(req.method==='DELETE'){q.del.run(col,id);if(col==='appusers')q.sdelUid.run(id,'');emit(col);return J(res,200,{ok:1})}}
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

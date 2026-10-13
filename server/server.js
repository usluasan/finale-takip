// Finale Takibi sunucusu — bağımlılık yok, Node 22.5+ (yerleşik SQLite)
'use strict';
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const {DatabaseSync}=require('node:sqlite');
const PORT=+process.env.PORT||8080;
const DATA=process.env.DATA_DIR||path.join(__dirname,'..','veri');
const APP_KEY=process.env.APP_KEY||'';      // herkesin kullandığı giriş anahtarı
const ADMIN_KEY=process.env.ADMIN_KEY||'';  // uygulama sahibi (parolasız giriş) anahtarı
const WEB=process.env.WEB_DIR||path.join(__dirname,'..','web');
if(!APP_KEY){console.error('HATA: APP_KEY ortam değişkeni tanımlı değil. Örnek: APP_KEY=gizli-bir-anahtar node server.js');process.exit(1)}
fs.mkdirSync(path.join(DATA,'blobs'),{recursive:true});
const db=new DatabaseSync(path.join(DATA,'finale.db'));
db.exec('PRAGMA journal_mode=WAL;CREATE TABLE IF NOT EXISTS docs(col TEXT NOT NULL,id TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(col,id));CREATE TABLE IF NOT EXISTS blobs(id TEXT PRIMARY KEY,type TEXT,name TEXT,size INTEGER)');
const q={list:db.prepare('SELECT id,data FROM docs WHERE col=?'),get:db.prepare('SELECT data FROM docs WHERE col=? AND id=?'),put:db.prepare('INSERT INTO docs(col,id,data) VALUES(?,?,?) ON CONFLICT(col,id) DO UPDATE SET data=excluded.data'),del:db.prepare('DELETE FROM docs WHERE col=? AND id=?'),bput:db.prepare('INSERT INTO blobs(id,type,name,size) VALUES(?,?,?,?)'),bget:db.prepare('SELECT type,name FROM blobs WHERE id=?')};
const tsEq=(a,b)=>{const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&crypto.timingSafeEqual(x,y)};
const cookieKey=r=>{const m=/(?:^|;\s*)fkey=([^;]*)/.exec(r.headers.cookie||'');return m?decodeURIComponent(m[1]):''};
const level=r=>{const k=cookieKey(r)||r.headers['x-key']||'';if(ADMIN_KEY&&tsEq(k,ADMIN_KEY))return 2;if(tsEq(k,APP_KEY))return 1;return 0};
const rid=()=>crypto.randomBytes(15).toString('base64url').slice(0,20);
const clients=new Set();
function emit(col){const m='data: '+JSON.stringify({col})+'\n\n';for(const c of clients)try{c.write(m)}catch(e){}}
const MIME={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.wasm':'application/wasm','.txt':'text/plain; charset=utf-8','.ico':'image/x-icon'};
function body(r,max){return new Promise((ok,no)=>{const a=[];let n=0;r.on('data',c=>{n+=c.length;if(n>max){no(new Error('big'));r.destroy();return}a.push(c)});r.on('end',()=>ok(Buffer.concat(a)));r.on('error',no)})}
const J=(s,c,o)=>{s.writeHead(c,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});s.end(JSON.stringify(o))};
const okName=s=>/^[A-Za-z0-9_\-.~:@+]{1,200}$/.test(s)&&s!=='.'&&s!=='..';
http.createServer(async(req,res)=>{
  try{
    const u=new URL(req.url,'http://x'),p=u.pathname;
    if(p==='/api/login'&&req.method==='POST'){const b=JSON.parse((await body(req,4096)).toString()||'{}');const k=String(b.key||'');const lv=ADMIN_KEY&&tsEq(k,ADMIN_KEY)?2:tsEq(k,APP_KEY)?1:0;if(!lv)return J(res,401,{error:'bad_key'});
      res.setHeader('set-cookie','fkey='+encodeURIComponent(k)+'; Path=/; Max-Age=31536000; SameSite=Strict; HttpOnly'+(req.headers['x-forwarded-proto']==='https'?'; Secure':''));return J(res,200,{ok:1,owner:lv===2})}
    if(p==='/api/logout'){res.setHeader('set-cookie','fkey=; Path=/; Max-Age=0');return J(res,200,{ok:1})}
    if(p.startsWith('/api/')||p.startsWith('/_blob/')){
      const lv=level(req);if(!lv)return J(res,401,{error:'auth'});
      if(p==='/api/whoami')return J(res,200,{ok:1,owner:lv===2});
      if(p==='/api/events'){res.writeHead(200,{'content-type':'text/event-stream','cache-control':'no-store',connection:'keep-alive','x-accel-buffering':'no'});res.write('retry: 3000\n\n');clients.add(res);const t=setInterval(()=>{try{res.write(': ping\n\n')}catch(e){}},25000);req.on('close',()=>{clearInterval(t);clients.delete(res)});return}
      let m;
      if(m=/^\/api\/c\/([^/]+)$/.exec(p)){const col=decodeURIComponent(m[1]);if(!okName(col))return J(res,400,{error:'name'});
        if(req.method==='GET')return J(res,200,q.list.all(col).map(r=>({id:r.id,data:JSON.parse(r.data)})));
        if(req.method==='POST'){const d=JSON.parse((await body(req,8e6)).toString());const id=rid();q.put.run(col,id,JSON.stringify(d));emit(col);return J(res,200,{id})}}
      if(m=/^\/api\/d\/([^/]+)\/([^/]+)$/.exec(p)){const col=decodeURIComponent(m[1]),id=decodeURIComponent(m[2]);if(!okName(col)||!okName(id))return J(res,400,{error:'name'});
        if(req.method==='GET'){const r=q.get.get(col,id);return J(res,200,r?{exists:true,data:JSON.parse(r.data)}:{exists:false})}
        if(req.method==='PUT'){q.put.run(col,id,(await body(req,8e6)).toString());emit(col);return J(res,200,{ok:1})}
        if(req.method==='PATCH'){const r=q.get.get(col,id),cur=r?JSON.parse(r.data):{},d=JSON.parse((await body(req,8e6)).toString());q.put.run(col,id,JSON.stringify(Object.assign(cur,d)));emit(col);return J(res,200,{ok:1})}
        if(req.method==='DELETE'){q.del.run(col,id);emit(col);return J(res,200,{ok:1})}}
      if(p==='/api/blob'&&req.method==='POST'){const b=await body(req,30e6),id=rid();fs.writeFileSync(path.join(DATA,'blobs',id),b);q.bput.run(id,String(req.headers['x-type']||'application/octet-stream').slice(0,100),decodeURIComponent(String(req.headers['x-name']||'')).slice(0,200),b.length);return J(res,200,{id})}
      if(m=/^\/_blob\/([A-Za-z0-9_-]{8,64})$/.exec(p)){const r=q.bget.get(m[1]);if(!r){res.writeHead(404);return res.end()}res.writeHead(200,{'content-type':r.type||'application/octet-stream','cache-control':'private, max-age=3600'});return fs.createReadStream(path.join(DATA,'blobs',m[1])).pipe(res)}
      return J(res,404,{error:'yok'});
    }
    // statik dosyalar
    let f=path.normalize(path.join(WEB,p==='/'?'index.html':decodeURIComponent(p)));
    if(!f.startsWith(path.resolve(WEB))){res.writeHead(403);return res.end()}
    if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);return res.end('yok')}
    res.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream','cache-control':'no-cache'});fs.createReadStream(f).pipe(res);
  }catch(e){try{J(res,500,{error:String(e&&e.message||e)})}catch(_){}}
}).listen(PORT,()=>console.log('Finale sunucusu: http://localhost:'+PORT+'  (veri: '+DATA+')'));

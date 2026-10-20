// Acil durum ve ilk kurulum için kullanıcı aracı (sunucuda, konteyner içinde çalışır).
//   node server/kullanici.js liste
//   node server/kullanici.js sifre <kullanıcı adı>        şifreyi sıfırlar (ekranda görünmeden iki kez sorar)
//   node server/kullanici.js ekle <kullanıcı adı> [rol]    yeni kullanıcı (varsayılan rol: yonetici)
// Sunucuda örnek: sudo docker exec -it finale-takip-finale-takip-1 node server/kullanici.js sifre huslu
'use strict';
const path=require('path'),readline=require('readline'),crypto=require('crypto');
const {DatabaseSync}=require('node:sqlite');
const sifre=require('./sifre');
const DATA=process.env.DATA_DIR||path.join(__dirname,'..','veri');
const db=new DatabaseSync(path.join(DATA,'finale.db'));
const liste=()=>db.prepare("SELECT id,data FROM docs WHERE col='appusers'").all().map(r=>Object.assign(JSON.parse(r.data),{id:r.id}));
const bul=ad=>liste().find(u=>sifre.adNorm(u.name)===sifre.adNorm(ad));

function gizliSor(soru){return new Promise(ok=>{
  if(!process.stdin.isTTY){console.error('HATA: şifre klavyeden girilmeli; "docker exec -it" ile çalıştırın.');process.exit(1)}
  const rl=readline.createInterface({input:process.stdin,output:process.stdout,terminal:true});
  rl._writeToOutput=s=>{if(s.startsWith(soru))process.stdout.write(soru)};  // yazılanlar ekrana basılmaz
  rl.question(soru,c=>{rl.close();process.stdout.write('\n');ok(c)})})}
async function yeniSifre(){const a=await gizliSor('Yeni şifre (en az '+sifre.EN_AZ+' karakter): ');if(a.length<sifre.EN_AZ){console.error('HATA: şifre en az '+sifre.EN_AZ+' karakter olmalı.');process.exit(1)}
  const b=await gizliSor('Yeni şifre (tekrar): ');if(a!==b){console.error('HATA: şifreler aynı değil.');process.exit(1)}return a}
function kaydet(id,d){db.prepare("INSERT INTO docs(col,id,data) VALUES('appusers',?,?) ON CONFLICT(col,id) DO UPDATE SET data=excluded.data").run(id,JSON.stringify(d));
  try{db.prepare('DELETE FROM sessions WHERE uid=?').run(id)}catch(e){}}  // açık oturumları kapat

(async()=>{
  const [komut,ad,rol]=process.argv.slice(2);
  if(komut==='liste'){for(const u of liste())console.log((u.active===0?'(pasif) ':'')+u.name+' · rol: '+u.role+(u.email?' · '+u.email:''));return}
  if(komut==='sifre'&&ad){const u=bul(ad);if(!u){console.error('HATA: "'+ad+'" adlı kullanıcı yok. Liste: node server/kullanici.js liste');process.exit(1)}
    const s=await yeniSifre();const d=Object.assign({},u);delete d.id;delete d.salt;d.pinHash=sifre.ozetle(s);d.mustChange=0;d.resetReq=0;d.active=1;kaydet(u.id,d);
    console.log('Tamam: "'+u.name+'" şifresi değiştirildi, açık oturumları kapatıldı.');return}
  if(komut==='ekle'&&ad){if(bul(ad)){console.error('HATA: bu adla kullanıcı zaten var.');process.exit(1)}
    const s=await yeniSifre();const id=crypto.randomBytes(15).toString('base64url').slice(0,20);
    kaydet(id,{name:ad,role:rol||'yonetici',active:1,created:Date.now(),partyId:'',lead:'',email:'',pinHash:sifre.ozetle(s),mustChange:0});
    console.log('Tamam: "'+ad+'" eklendi (rol: '+(rol||'yonetici')+').');return}
  console.log('Kullanım:\n  node server/kullanici.js liste\n  node server/kullanici.js sifre <kullanıcı adı>\n  node server/kullanici.js ekle <kullanıcı adı> [rol]');
})();

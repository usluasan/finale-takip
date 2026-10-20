// Kullanıcı şifresi özetleme ve doğrulama (sunucu ve kullanici.js ortak kullanır)
'use strict';
const crypto=require('crypto');
const SCRYPT={N:16384,r:8,p:1,maxmem:64*1024*1024};
const EN_AZ=8;   // yeni ve değiştirilen şifrelerde en az uzunluk

// Yeni biçim: "scrypt$<tuz>$<özet>" (base64url). Sunucu dışında hiçbir yere gönderilmez.
function ozetle(sifre){const tuz=crypto.randomBytes(16);const h=crypto.scryptSync(String(sifre),tuz,32,SCRYPT);return 'scrypt$'+tuz.toString('base64url')+'$'+h.toString('base64url')}

// Eski biçimler (sayfanın kendi ürettiği): sha256(tuz+":"+şifre) hex ya da tarayıcıda SHA-256 yoksa "x"+djb2
function eskiOzet(tuz,sifre){return crypto.createHash('sha256').update(String(tuz||'')+':'+String(sifre)).digest('hex')}
function djb2(tuz,sifre){let h=5381;const s=String(tuz||'')+':'+String(sifre);for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))>>>0;return 'x'+h.toString(16)}
const esit=(a,b)=>{const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&crypto.timingSafeEqual(x,y)};

// u: appusers belgesi ({salt, pinHash}). Doğruysa true; eskiYeni: eski biçimse yeni biçime yükseltilmeli
function dogrula(u,sifre){
  const ph=String((u&&u.pinHash)||'');
  if(ph.startsWith('scrypt$')){const [,t,h]=ph.split('$');try{const z=crypto.scryptSync(String(sifre),Buffer.from(t,'base64url'),32,SCRYPT);return {ok:esit(z.toString('base64url'),h),eski:false}}catch(e){return {ok:false,eski:false}}}
  if(!ph)return {ok:false,eski:false};
  const ok=ph.startsWith('x')?esit(djb2(u.salt,sifre),ph):esit(eskiOzet(u.salt,sifre),ph);
  return {ok,eski:ok};
}
// Kullanıcı bulunamadığında da aynı sürede cevap vermek için (ad tahmini zorlaşsın)
function bosDogrula(sifre){crypto.scryptSync(String(sifre),Buffer.alloc(16),32,SCRYPT);return {ok:false,eski:false}}

// Kullanıcı adı karşılaştırması: büyük/küçük harf ve i/ı/İ/I farkı gözetilmez, yalnız harf/rakam
const adNorm=s=>String(s||'').toLocaleUpperCase('tr-TR').replace(/İ/g,'I').replace(/[^A-Z0-9ÇĞÖŞÜ]/g,'');

module.exports={ozetle,dogrula,bosDogrula,adNorm,EN_AZ};

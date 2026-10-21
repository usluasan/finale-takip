// CV'yi Finale formatına çevirme (v0.7.0):
//  1) ayikla(): yüklenen CV'nin içeriği Claude API ile Finale şablonunun alanlarına ayrılır (yapılandırılmış JSON)
//  2) pdfUret(): onaylanan alanlar Finale şablonunda (logo, proje tabloları, adres altlığı) PDF'e basılır
// Yapay zekâ için sunucu ortamında ANTHROPIC_API_KEY gerekir; PDF için Chromium (Docker imajında kurulu).
'use strict';
const fs=require('fs'),path=require('path'),os=require('os');
const {execFile}=require('child_process');

const MODEL='claude-opus-5-5';
const LOGO=path.join(__dirname,'..','web','cv','finale-logo.png');

// Yapay zekânın dolduracağı alanlar. Şema dışı alan üretilmez; CV'de olmayan alan boş kalır.
const METIN={type:'string'};
const SEMA={type:'object',additionalProperties:false,
  required:['ad','unvan','telefon','eposta','profil','ozet','projeler','kisisel'],
  properties:{
    ad:METIN,unvan:METIN,telefon:METIN,eposta:METIN,profil:METIN,
    ozet:{type:'array',items:METIN},
    projeler:{type:'array',items:{type:'object',additionalProperties:false,
      required:['musteri','sure','sektor','proje','gorev','sorumluluklar'],
      properties:{musteri:METIN,sure:METIN,sektor:METIN,proje:METIN,gorev:METIN,sorumluluklar:METIN}}},
    kisisel:{type:'array',items:{type:'object',additionalProperties:false,required:['baslik','deger'],
      properties:{baslik:METIN,deger:METIN}}}}};

const SISTEM=`Sen Finale Yazılım Danışmanlık'ın insan kaynakları asistanısın. Sana bir danışmanın özgeçmişi (CV) verilecek.
Görevin CV'deki bilgileri şirketin standart CV şablonunun alanlarına aktarmak:
- ad: kişinin adı soyadı. unvan: CV'deki unvanı (ör. "SAP FI Danışmanı").
- telefon, eposta: CV'de kişiye ait olanlar.
- profil: CV'deki profil/özet paragrafı.
- ozet: "SAP deneyimleri özeti" türündeki maddeler; her madde ayrı öğe.
- projeler: her proje/müşteri deneyimi ayrı öğe, CV'deki sırayla. musteri = müşteri/firma, sure = devam süresi (ör. "2019 – 2024", "Ocak 2026 – Devam ediyor"), sektor, proje = proje adı/tanımı, gorev = projedeki rolü, sorumluluklar = sorumluluklar (birden fazla satırsa satır sonlarıyla).
- kisisel: eğitim, uyruk, şehir, yabancı dil, sertifikalar gibi başlık-değer çiftleri.
Kurallar:
- Yalnızca CV'de yazanı aktar; hiçbir bilgi uydurma veya tahmin etme. CV'de olmayan alan boş metin ya da boş liste kalır.
- Metni anlamını değiştirmeden aktar; kısaltma veya yorum ekleme. Belirgin yazım hatalarını düzeltebilirsin.
- CV'de kişinin çalıştığı şirketin adresi, santral telefonu, sayfa numarası, logo yazısı gibi kalıp metinler varsa alma.
- TC kimlik numarası, doğum tarihi, medeni hal, ev adresi gibi hassas kişisel verileri alma.
- CV Türkçe değilse alan değerlerini Türkçeye çevir; firma ve ürün adlarını çevirme.`;

let istemci=null;
function claude(){
  if(!process.env.ANTHROPIC_API_KEY){const e=new Error('anahtar_yok');e.kod='anahtar_yok';throw e}
  if(!istemci){const Anthropic=require('@anthropic-ai/sdk');istemci=new (Anthropic.default||Anthropic)()}
  return istemci;
}

// girdi: {tur:'pdf'|'gorsel'|'metin', mime, veri (base64), metin}
async function ayikla(girdi){
  const c=claude(),Anthropic=require('@anthropic-ai/sdk');
  let blok;
  if(girdi.tur==='pdf')blok={type:'document',source:{type:'base64',media_type:'application/pdf',data:String(girdi.veri||'')}};
  else if(girdi.tur==='gorsel'){const mt=String(girdi.mime||'');if(!/^image\/(png|jpeg|gif|webp)$/.test(mt)){const e=new Error('gorsel_turu');e.kod='gorsel_turu';throw e}
    blok={type:'image',source:{type:'base64',media_type:mt,data:String(girdi.veri||'')}}}
  else{const m=String(girdi.metin||'').trim();if(!m){const e=new Error('bos_metin');e.kod='bos_metin';throw e}blok={type:'text',text:'<cv>\n'+m+'\n</cv>'}}
  let yanit;
  try{
    yanit=await c.beta.messages.create({
      model:MODEL,max_tokens:16000,
      betas:['server-side-fallback-2026-07-01'],fallbacks:'default',   // güvenlik sınıflandırıcısı reddederse önerilen modelde yeniden dener
      output_config:{effort:'medium',format:{type:'json_schema',schema:SEMA}},
      system:SISTEM,
      messages:[{role:'user',content:[blok,{type:'text',text:'Bu CV\'yi şablon alanlarına aktar.'}]}]});
  }catch(e){
    if(e instanceof Anthropic.AuthenticationError){const x=new Error('anahtar_gecersiz');x.kod='anahtar_gecersiz';throw x}
    if(e instanceof Anthropic.RateLimitError){const x=new Error('yogun');x.kod='yogun';throw x}
    if(e instanceof Anthropic.BadRequestError){const x=new Error('istek_hatali: '+e.message);x.kod='istek_hatali';throw x}
    if(e instanceof Anthropic.APIConnectionError){const x=new Error('baglanti');x.kod='baglanti';throw x}
    if(e instanceof Anthropic.APIError){const x=new Error('api_hatasi '+e.status);x.kod='api_hatasi';throw x}
    throw e;
  }
  if(yanit.stop_reason==='refusal'){const e=new Error('reddedildi');e.kod='reddedildi';throw e}
  if(yanit.stop_reason==='max_tokens'){const e=new Error('cok_uzun');e.kod='cok_uzun';throw e}
  const metin=(yanit.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('');
  let veri;try{veri=JSON.parse(metin)}catch(e){const x=new Error('cozumlenemedi');x.kod='cozumlenemedi';throw x}
  return {veri:temiz(veri),kullanim:yanit.usage?{girdi:yanit.usage.input_tokens,cikti:yanit.usage.output_tokens}:null,model:yanit.model};
}

// İstemciden gelen alanları sınırla (PDF'e yalnızca beklenen metinler girer)
const s=(v,n)=>String(v==null?'':v).slice(0,n||4000);
function temiz(v){v=v||{};return {ad:s(v.ad,200),unvan:s(v.unvan,200),telefon:s(v.telefon,80),eposta:s(v.eposta,200),profil:s(v.profil,8000),
  ozet:(Array.isArray(v.ozet)?v.ozet:[]).slice(0,40).map(x=>s(x,1000)).filter(x=>x.trim()),
  projeler:(Array.isArray(v.projeler)?v.projeler:[]).slice(0,200).map(p=>({musteri:s(p&&p.musteri,300),sure:s(p&&p.sure,100),sektor:s(p&&p.sektor,150),proje:s(p&&p.proje,500),gorev:s(p&&p.gorev,300),sorumluluklar:s(p&&p.sorumluluklar,4000)}))
    .filter(p=>Object.values(p).some(x=>x.trim())),
  kisisel:(Array.isArray(v.kisisel)?v.kisisel:[]).slice(0,40).map(k=>({baslik:s(k&&k.baslik,100),deger:s(k&&k.deger,1000)})).filter(k=>k.baslik.trim()||k.deger.trim())}}

const E=x=>String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const SATIR=[['musteri','Müşteri'],['sure','Devam süresi'],['sektor','Sektör'],['proje','Proje tanımı'],['gorev','Projedeki görevi'],['sorumluluklar','Sorumluluklar']];
const ADRES='<div class="k">FİNALE YAZILIM DANIŞMANLIK</div><div>Cevizli Mah. Bağdat Cad. Ofistanbul Plaza No:538 D:50</div><div>Maltepe/İstanbul</div>';

// Finale CV şablonu (Hasan Uslu CV'sinin düzeni): her sayfada logo ve adres altlığı, projeler ayrı tablolarda
function sablon(v){
  const proje=p=>'<table class="kayit">'+SATIR.map(([k,b])=>'<tr'+(k==='sorumluluklar'?' class="s"':'')+'><td class="k">'+b+'</td><td>'+(k==='musteri'?'<b>'+E(p[k])+'</b>':E(p[k]).replace(/\n/g,'<br>'))+'</td></tr>').join('')+'</table>';
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><style>
@page{size:A4;margin:0}
html,body{margin:0;padding:0}
body{font-family:Arial,"Liberation Sans",Helvetica,sans-serif;color:#000;font-size:10.5pt}
table.sayfa{width:100%;border-collapse:collapse}
table.sayfa>thead td{height:118pt;vertical-align:top;padding:0}
table.sayfa>tfoot td{height:132pt;vertical-align:bottom;padding:0}
.logo{display:block;margin:52pt 0 0 86pt;width:210pt}
.alt{text-align:center;font-size:11pt;line-height:12.6pt;padding-bottom:78pt}
.alt .k{font-size:9.5pt}.alt .m{font-family:"Times New Roman","Liberation Serif",Times,serif;font-size:11.5pt}
.ic{padding:0 86pt}
.kapak{text-align:center;margin-top:4pt}
.kapak .ad{font-weight:bold;font-size:11pt;margin:0}
.kapak .un{font-weight:bold;font-size:11pt;margin:2pt 0 26pt}
.kapak .k{font-size:9.5pt;line-height:12.6pt}
.kapak .ad2{font-size:11pt;line-height:12.6pt}
.kapak .il{font-size:9pt;margin-top:8pt;line-height:16pt}
h2{font-size:10.5pt;font-weight:bold;margin:30pt -24pt 0;padding-bottom:3pt;border-bottom:1pt solid #000}
.profil{font-size:9pt;line-height:12.5pt;text-align:justify;margin:18pt 0 0;white-space:pre-line}
ul.oz{font-size:10.5pt;line-height:14pt;margin:14pt 0 0;padding-left:16pt}
.b3{font-family:Verdana,"DejaVu Sans",Arial,sans-serif;font-size:10.5pt;margin:30pt 0 18pt}
table.kayit{width:100%;border-collapse:collapse;margin:0 0 22pt;break-inside:avoid;page-break-inside:avoid}
table.kayit td{padding:1.6pt 3.5pt 2pt;border-bottom:.5pt dashed #555;vertical-align:top;line-height:1.25}
table.kayit tr:first-child td{border-top:1pt solid #000}
table.kayit td.k{width:126pt}
table.kayit tr.s td{padding-bottom:10pt}
table.kayit tr.s td.k{vertical-align:middle}
table.kis{width:100%;border-collapse:collapse;margin-top:14pt;break-inside:avoid}
table.kis td{padding:2pt 3.5pt;border-bottom:.5pt dashed #555}
table.kis td.k{width:126pt}
.yeni{break-before:page}
</style></head><body><table class="sayfa"><thead><tr><td><img class="logo" src="logo.png" alt="Finale"></td></tr></thead>
<tfoot><tr><td><div class="alt">${ADRES}<div class="m">E-Mail:info@finale.com.tr</div></div></td></tr></tfoot>
<tbody><tr><td><div class="ic">
<div class="kapak"><p class="ad">${E(v.ad)}</p><p class="un">${E(v.unvan)}</p><div class="k">FİNALE YAZILIM DANIŞMANLIK</div><div class="ad2">Cevizli Mah. Bağdat Cad. Ofistanbul Plaza No:538 D:50<br>Maltepe/İstanbul</div>
<div class="il">${v.telefon?'T: '+E(v.telefon)+'<br>':''}${v.eposta?'E: '+E(v.eposta):''}</div></div>
${v.profil?'<h2>Profil</h2><p class="profil">'+E(v.profil)+'</p>':''}
${v.ozet.length?'<h2>SAP Deneyimleri – Özet</h2><ul class="oz">'+v.ozet.map(o=>'<li>'+E(o)+'</li>').join('')+'</ul>':''}
${v.projeler.length?'<div class="yeni"></div><div class="b3">SAP Proje Deneyimleri</div>'+v.projeler.map(proje).join(''):''}
${v.kisisel.length?'<h2 style="margin-left:0;margin-right:0">Kişisel Bilgiler</h2><table class="kis">'+v.kisisel.map(k=>'<tr><td class="k">'+E(k.baslik)+'</td><td>'+E(k.deger)+'</td></tr>').join('')+'</table>':''}
</div></td></tr></tbody></table></body></html>`;
}

function chromeYolu(){
  const adaylar=[process.env.CHROME_PATH,'/usr/bin/chromium-browser','/usr/bin/chromium','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
  return adaylar.find(p=>{try{fs.accessSync(p,fs.constants.X_OK);return true}catch(e){return false}})||'';
}

// Onaylanan alanlardan PDF üretir; PDF baytlarını döndürür
function pdfUret(veri){return new Promise((ok,no)=>{
  const chrome=chromeYolu();if(!chrome){const e=new Error('chrome_yok');e.kod='chrome_yok';return no(e)}
  const d=fs.mkdtempSync(path.join(os.tmpdir(),'finale-cv-'));
  const temizle=()=>{try{fs.rmSync(d,{recursive:true,force:true})}catch(e){}};
  try{fs.copyFileSync(LOGO,path.join(d,'logo.png'));fs.writeFileSync(path.join(d,'cv.html'),sablon(temiz(veri)))}catch(e){temizle();return no(e)}
  // Şablon yalnızca kaçışlanmış metin içerir; tarayıcı ağ erişimi olmadan yerel dosyayı basar
  execFile(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-pdf-header-footer','--no-first-run',
    '--user-data-dir='+path.join(d,'profil'),'--print-to-pdf='+path.join(d,'cv.pdf'),'file://'+path.join(d,'cv.html')],{timeout:90000},err=>{
    let pdf=null;try{pdf=fs.readFileSync(path.join(d,'cv.pdf'))}catch(e){}
    temizle();
    if(!pdf||pdf.length<500||pdf.slice(0,5).toString()!=='%PDF-'){const e=new Error('pdf_uretilemedi'+(err?': '+err.message:''));e.kod='pdf_uretilemedi';return no(e)}
    ok(pdf)})})}

const durum=()=>({ai:!!process.env.ANTHROPIC_API_KEY,pdf:!!chromeYolu(),model:MODEL});
module.exports={ayikla,pdfUret,durum,sablon,temiz};

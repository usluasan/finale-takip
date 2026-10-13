// claude.use('db'|'assets'|'downloads'|'user') uyumluluk katmanı: uygulama kodu değişmeden kendi sunucuna bağlanır.
(function(){
  var subs={},es=null;
  function api(m,u,b,h){return fetch(u,{method:m,headers:Object.assign(b!==undefined&&!(b instanceof Blob)?{'content-type':'application/json'}:{},h||{}),body:b===undefined?undefined:(b instanceof Blob?b:JSON.stringify(b)),credentials:'same-origin'}).then(function(r){if(r.status===401){var e=new Error('auth');e.code='auth';throw e}if(!r.ok)throw new Error('http '+r.status);return r.json()})}
  var frz=function(o){var c=JSON.parse(JSON.stringify(o));return Object.freeze(c)};
  function connect(){if(es)return;es=new EventSource('/api/events');es.onmessage=function(ev){var c;try{c=JSON.parse(ev.data).col}catch(e){return}(subs[c]||[]).forEach(function(f){f()})};}
  function sub(col,f){(subs[col]=subs[col]||[]).push(f);connect();f()}
  var db={
    collection:function(c){return{
      add:function(d){return api('POST','/api/c/'+encodeURIComponent(c),d)},
      onSnapshot:function(ok,err){sub(c,function(){api('GET','/api/c/'+encodeURIComponent(c)).then(function(L){var docs=L.map(function(r){return{id:r.id,data:function(){return frz(r.data)}}});ok({docs:docs,size:docs.length,empty:!docs.length,forEach:function(f){docs.forEach(f)}})}).catch(function(e){if(err)err(e)})})}}},
    doc:function(path){var i=path.indexOf('/'),c=path.slice(0,i),id=path.slice(i+1),u='/api/d/'+encodeURIComponent(c)+'/'+encodeURIComponent(id);return{
      set:function(d){return api('PUT',u,d)},update:function(d){return api('PATCH',u,d)},delete:function(){return api('DELETE',u)},
      get:function(){return api('GET',u).then(function(r){return{exists:r.exists,id:id,data:function(){return r.exists?frz(r.data):undefined}}})},
      onSnapshot:function(ok,err){sub(c,function(){api('GET',u).then(function(r){ok({exists:r.exists,id:id,data:function(){return r.exists?frz(r.data):undefined}})}).catch(function(e){if(err)err(e)})})}}}
  };
  var assets={upload:function(f,o){var type=(o&&o.type)||f.type||'application/octet-stream';return api('POST','/api/blob',f instanceof Blob?f:new Blob([f]),{'x-type':type,'x-name':encodeURIComponent(f.name||'')})}};
  var downloads={save:function(o){var u=URL.createObjectURL(o.data),a=document.createElement('a');a.href=u;a.download=o.filename||'dosya';document.body.appendChild(a);a.click();setTimeout(function(){a.remove();URL.revokeObjectURL(u)},4000);return Promise.resolve()}};
  var owner=false;
  var user={isOwner:function(){return Promise.resolve(owner)}};
  var ready=null;
  function login(){return new Promise(function(ok){
    function ask(msg){
      var w=document.createElement('div');w.id='fk_gate';w.style.cssText='position:fixed;inset:0;z-index:99999;background:#0a3f37;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;padding:16px';
      w.innerHTML='<form style="background:#fff;border-radius:14px;padding:26px;width:min(92vw,380px);display:flex;flex-direction:column;gap:12px"><h2 style="margin:0;color:#0d6b5b">Finale Takibi</h2><div style="color:#b5481a;min-height:18px;font-size:13px">'+(msg||'')+'</div><input type="password" autocomplete="current-password" placeholder="Sunucu giriş anahtarı" style="padding:11px;border:1px solid #ccd;border-radius:8px;font-size:16px"><button style="padding:11px;border:0;border-radius:8px;background:#0d6b5b;color:#fff;font-size:15px;font-weight:600;cursor:pointer">Bağlan</button></form>';
      document.body.appendChild(w);var inp=w.querySelector('input');inp.focus();
      w.querySelector('form').onsubmit=function(e){e.preventDefault();api('POST','/api/login',{key:inp.value}).then(function(r){owner=!!r.owner;w.remove();ok()}).catch(function(){w.remove();ask('Anahtar hatalı')})}}
    api('GET','/api/whoami').then(function(r){owner=!!r.owner;ok()}).catch(function(){if(document.body)ask();else document.addEventListener('DOMContentLoaded',function(){ask()})})})}
  window.claude={use:function(n){if(!ready)ready=login();return ready.then(function(){if(n==='db')return db;if(n==='assets')return assets;if(n==='downloads')return downloads;if(n==='user')return user;throw new Error('desteklenmiyor: '+n)})}};
  window.__finaleStandalone=true;
})();

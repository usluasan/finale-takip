// Eski (claude.ai) verisini içe aktarır: node import.js <klasör>   (klasör/<koleksiyon>/<belge>.json)
const fs=require('fs'),path=require('path');const {DatabaseSync}=require('node:sqlite');
const DATA=process.env.DATA_DIR||path.join(__dirname,'..','veri');fs.mkdirSync(path.join(DATA,'blobs'),{recursive:true});
const db=new DatabaseSync(path.join(DATA,'finale.db'));
db.exec('CREATE TABLE IF NOT EXISTS docs(col TEXT NOT NULL,id TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(col,id));CREATE TABLE IF NOT EXISTS blobs(id TEXT PRIMARY KEY,type TEXT,name TEXT,size INTEGER)');
const put=db.prepare('INSERT INTO docs(col,id,data) VALUES(?,?,?) ON CONFLICT(col,id) DO UPDATE SET data=excluded.data');
const dir=process.argv[2];if(!dir){console.log('kullanım: node import.js <klasör>');process.exit(1)}
let n=0;for(const c of fs.readdirSync(dir)){const cd=path.join(dir,c);if(!fs.statSync(cd).isDirectory())continue;
  for(const f of fs.readdirSync(cd)){if(!f.endsWith('.json'))continue;put.run(c,f.slice(0,-5),fs.readFileSync(path.join(cd,f),'utf8'));n++}}
console.log(n+' belge içe aktarıldı → '+DATA);

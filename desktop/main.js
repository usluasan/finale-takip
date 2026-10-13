const {app,BrowserWindow,Menu,ipcMain,shell}=require('electron');
const fs=require('fs'),path=require('path');
const cfgFile=()=>path.join(app.getPath('userData'),'config.json');
const readCfg=()=>{try{return JSON.parse(fs.readFileSync(cfgFile(),'utf8'))}catch(e){return {}}};
const writeCfg=o=>fs.writeFileSync(cfgFile(),JSON.stringify(o));
let win;
function open(){
  const c=readCfg();
  if(c.url)win.loadURL(c.url).catch(()=>win.loadFile(path.join(__dirname,'setup.html'),{query:{err:'1'}}));
  else win.loadFile(path.join(__dirname,'setup.html'));
}
function create(){
  win=new BrowserWindow({width:1360,height:900,minWidth:420,minHeight:600,title:'Finale Takibi',backgroundColor:'#0a3f37',autoHideMenuBar:true,
    webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}});
  win.webContents.setWindowOpenHandler(({url})=>{if(/^blob:|^about:/.test(url))return {action:'allow'};shell.openExternal(url);return {action:'deny'}});
  win.webContents.session.on('will-download',()=>{});
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {label:'Uygulama',submenu:[{label:'Yenile',accelerator:'CmdOrCtrl+R',click:()=>win.reload()},{label:'Sunucu adresini değiştir',click:()=>win.loadFile(path.join(__dirname,'setup.html'))},{type:'separator'},{role:'quit',label:'Çıkış'}]},
    {label:'Düzen',submenu:[{role:'undo'},{role:'redo'},{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'}]},
    {label:'Görünüm',submenu:[{role:'zoomIn'},{role:'zoomOut'},{role:'resetZoom'},{role:'togglefullscreen'}]}]));
  open();
}
ipcMain.handle('getUrl',()=>readCfg().url||'');
ipcMain.handle('setUrl',(e,u)=>{u=String(u||'').trim();if(!/^https?:\/\//i.test(u))u='http://'+u;writeCfg({url:u.replace(/\/+$/,'')});open();return true});
app.whenReady().then(create);
app.on('window-all-closed',()=>app.quit());

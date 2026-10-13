const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('finaleDesktop',{getUrl:()=>ipcRenderer.invoke('getUrl'),setUrl:u=>ipcRenderer.invoke('setUrl',u)});

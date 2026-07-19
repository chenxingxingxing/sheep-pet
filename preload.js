const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('petAPI', {
  quit: () => ipcRenderer.send('pet-quit'),
  resize: (size) => ipcRenderer.send('pet-resize', size),
  mouseEvents: (enabled) => ipcRenderer.send('pet-mouse-events', enabled),
  listOutfits: () => ipcRenderer.invoke('list-outfits'),
  moveBy: (d) => ipcRenderer.send('pet-move-by', d),
});

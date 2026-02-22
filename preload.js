const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // future secure APIs here
});
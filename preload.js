const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    runCode: (payload) => ipcRenderer.invoke('execute-code', payload),
    sendStdin: (text) => ipcRenderer.send('send-stdin', text),
    onTerminalOut: (callback) => ipcRenderer.on('terminal-out', (event, data) => callback(data)),
    onTerminalErr: (callback) => ipcRenderer.on('terminal-err', (event, data) => callback(data)),
    callAI: (payload) => ipcRenderer.invoke('call-ai', payload),
    onAIStatus: (callback) => ipcRenderer.on('ai-status', (event, data) => callback(data))
});

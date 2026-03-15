const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Window controls
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
  },

  // Subjects
  subjects: {
    getAll: () => ipcRenderer.invoke('subjects:getAll'),
    create: (data) => ipcRenderer.invoke('subjects:create', data),
    update: (data) => ipcRenderer.invoke('subjects:update', data),
    delete: (id) => ipcRenderer.invoke('subjects:delete', id),
    getNotes: (id) => ipcRenderer.invoke('subjects:getNotes', id),
    saveNotes: (data) => ipcRenderer.invoke('subjects:saveNotes', data),
  },

  // Weekly plan
  plan: {
    getAll: () => ipcRenderer.invoke('plan:getAll'),
    set: (data) => ipcRenderer.invoke('plan:set', data),
    remove: (data) => ipcRenderer.invoke('plan:remove', data),
  },

  // Sessions
  sessions: {
    create: (data) => ipcRenderer.invoke('sessions:create', data),
    getBySubject: (id) => ipcRenderer.invoke('sessions:getBySubject', id),
    getStats: () => ipcRenderer.invoke('sessions:getStats'),
    getWeeklyStats: () => ipcRenderer.invoke('sessions:getWeeklyStats'),
    getMonthlyStats: () => ipcRenderer.invoke('sessions:getMonthlyStats'),
    getRecentSessions: () => ipcRenderer.invoke('sessions:getRecentSessions'),
  },
});

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Database = require('./database');

let mainWindow;
let db;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#f8f8f6',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    icon: path.join(__dirname, '../../resources/icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Open DevTools in development
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

app.whenReady().then(() => {
  db = new Database();
  db.initialize();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─── Window Controls
ipcMain.on('window:minimize', () => mainWindow.minimize());
ipcMain.on('window:maximize', () => {
  mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
});
ipcMain.on('window:close', () => mainWindow.close());

// ─── Subjects
ipcMain.handle('subjects:getAll', () => db.getAllSubjects());
ipcMain.handle('subjects:create', (_, data) => db.createSubject(data));
ipcMain.handle('subjects:update', (_, data) => db.updateSubject(data));
ipcMain.handle('subjects:delete', (_, id) => db.deleteSubject(id));
ipcMain.handle('subjects:getNotes', (_, id) => db.getSubjectNotes(id));
ipcMain.handle('subjects:saveNotes', (_, data) => db.saveSubjectNotes(data));

// ─── Weekly Plan
ipcMain.handle('plan:getAll', () => db.getWeeklyPlan());
ipcMain.handle('plan:set', (_, data) => db.setWeeklyPlan(data));
ipcMain.handle('plan:remove', (_, data) => db.removeWeeklyPlan(data));

// ─── Study Sessions
ipcMain.handle('sessions:create', (_, data) => db.createSession(data));
ipcMain.handle('sessions:getBySubject', (_, subjectId) => db.getSessionsBySubject(subjectId));
ipcMain.handle('sessions:getStats', () => db.getStats());
ipcMain.handle('sessions:getWeeklyStats', () => db.getWeeklyStats());
ipcMain.handle('sessions:getMonthlyStats', () => db.getMonthlyStats());
ipcMain.handle('sessions:getRecentSessions', () => db.getRecentSessions());

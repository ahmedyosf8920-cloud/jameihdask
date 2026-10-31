// جمعية الخير للجميع — تطبيق ويندوز (Electron). يفتح ملفات web المضمّنة؛ يعمل بدون إنترنت بنفس منطق الواجهة.
const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');

if (!app.requestSingleInstanceLock()) { app.quit(); }

let win;
function create() {
  Menu.setApplicationMenu(null);
  win = new BrowserWindow({
    width: 1360, height: 860, minWidth: 900, minHeight: 600,
    title: 'جمعية الخير للجميع', autoHideMenuBar: true,
    icon: path.join(__dirname, 'web', 'icon-512.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false }
  });
  win.loadFile(path.join(__dirname, 'web', 'index.html'));
  // نوافذ الطباعة/المعاينة الفارغة تُفتح داخل التطبيق، وأي رابط خارجي (واتساب وغيره) يُفتح في المتصفح
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (!url || url === 'about:blank') return { action: 'allow' };
    if (/^https?:|^whatsapp:|^mailto:|^tel:/i.test(url)) { shell.openExternal(url); return { action: 'deny' }; }
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file:')) { e.preventDefault(); if (/^https?:|^whatsapp:/i.test(url)) shell.openExternal(url); }
  });
}
app.whenReady().then(create);
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.on('window-all-closed', () => app.quit());

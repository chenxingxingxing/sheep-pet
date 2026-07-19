const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');

let win = null;
const MARGIN = 14; // 距屏幕右下角的间距

// 开机自动启动（登录时打开）
try {
  app.setLoginItemSettings({ openAtLogin: true, openAsHidden: false });
} catch (e) {}

function anchorBottomRight(width, height) {
  const bounds = win ? win.getBounds() : { x: 0, y: 0 };
  const display = screen.getDisplayMatching(bounds).workArea;
  const x = display.x + display.width - width - MARGIN;
  const y = display.y + display.height - height - MARGIN;
  return { x: Math.round(x), y: Math.round(y), width, height };
}

function createWindow() {
  const collapsed = 66; // 平常缩起来时的窗口大小（很小）
  win = new BrowserWindow({
    width: collapsed,
    height: collapsed,
    transparent: true,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    hasShadow: false,
    fullscreenable: false,
    skipTaskbar: true,
    focusable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  });
  win.setBounds(anchorBottomRight(collapsed, collapsed));
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.loadFile('index.html');
}

// 读取「衣柜」文件夹里的所有图片，返回文件名列表
ipcMain.handle('list-outfits', () => {
  const dir = path.join(__dirname, 'outfits');
  try {
    return fs
      .readdirSync(dir)
      .filter(f => /\.(png|webp|gif|jpe?g)$/i.test(f) && !f.startsWith('.'))
      .sort();
  } catch (e) {
    return [];
  }
});

ipcMain.on('pet-quit', () => app.quit());

// 渲染层告诉主进程：现在需要多大窗口（保持右下角不动，向左上生长）
ipcMain.on('pet-resize', (event, size) => {
  if (!win || !size) return;
  const w = Math.max(60, Math.min(360, Math.round(size.width || 66)));
  const h = Math.max(60, Math.min(420, Math.round(size.height || 66)));
  const b = win.getBounds();
  const display = screen.getDisplayMatching(b).workArea;
  let x = b.x + b.width - w;
  let y = b.y + b.height - h;
  x = Math.max(display.x, Math.min(x, display.x + display.width - w));
  y = Math.max(display.y, Math.min(y, display.y + display.height - h));
  win.setBounds({ x, y, width: w, height: h });
});

// 拖动小羊 → 移动窗口
ipcMain.on('pet-move-by', (event, d) => {
  if (!win || !d) return;
  const b = win.getBounds();
  const area = screen.getDisplayMatching(b).workArea;
  let x = b.x + Math.round(d.dx || 0);
  let y = b.y + Math.round(d.dy || 0);
  x = Math.max(area.x, Math.min(x, area.x + area.width - b.width));
  y = Math.max(area.y, Math.min(y, area.y + area.height - b.height));
  win.setPosition(x, y);
});

// 透明区域点击穿透（不挡住下面的窗口）
ipcMain.on('pet-mouse-events', (event, enabled) => {
  if (!win) return;
  win.setIgnoreMouseEvents(!enabled, { forward: true });
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

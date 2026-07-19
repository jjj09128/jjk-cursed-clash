const { app, BrowserWindow, Menu, globalShortcut } = require('electron');
const path = require('path');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 800,
    minHeight: 450,
    title: '咒术回战：咒力交织',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    backgroundColor: '#0a0015',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    autoHideMenuBar: true,
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // 开发模式打开 DevTools
    if (process.argv.includes('--dev')) {
      mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 设置菜单
  const menuTemplate = [
    {
      label: '游戏',
      submenu: [
        {
          label: '重新开始',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow.webContents.executeJavaScript('window.restartGame && window.restartGame()');
          }
        },
        {
          label: '返回菜单',
          accelerator: 'CmdOrCtrl+M',
          click: () => {
            mainWindow.webContents.executeJavaScript(
              'document.getElementById("menu-screen").classList.remove("hidden");' +
              'document.getElementById("fight-screen").classList.add("hidden");' +
              'document.getElementById("result-screen").classList.add("hidden");'
            );
          }
        },
        { type: 'separator' },
        {
          label: '全屏',
          accelerator: 'F11',
          click: () => {
            mainWindow.setFullScreen(!mainWindow.isFullScreen());
          }
        },
        { type: 'separator' },
        { label: '退出', role: 'quit' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { label: '开发者工具', role: 'toggleDevTools' },
        { label: '重新加载', role: 'reload' },
        { type: 'separator' },
        { label: '放大', role: 'zoomIn' },
        { label: '缩小', role: 'zoomOut' },
        { label: '重置缩放', role: 'resetZoom' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    return { action: 'deny' };
  });
});
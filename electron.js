'use strict';

const electron = require('electron');
const path = require('path');
const log = require('./src/services/log');
const sqlInit = require('./src/services/sql_init');
const cls = require('./src/services/cls');
const url = require("url");
const port = require('./src/services/port');
const env = require('./src/services/env');
const appIconService = require('./src/services/app_icon');
const windowStateKeeper = require('electron-window-state');
const contextMenu = require('electron-context-menu');

const app = electron.app;
const globalShortcut = electron.globalShortcut;

// Adds debug features like hotkeys for triggering dev tools and reload
require('electron-debug')();

appIconService.installLocalAppIcon();

// Prevent window being garbage collected
let mainWindow;

require('electron-dl')({ saveAs: true });

contextMenu({
    menu: (actions, params, browserWindow) => [
        actions.cut(),
        actions.copy(),
        actions.copyLink(),
        actions.paste(),
        {
            label: 'Search DuckDuckGo for “{selection}”',
            // Only show it when right-clicking text
            visible: params.selectionText.trim().length > 0,
            click: () => {
                const {shell} = require('electron');

                shell.openExternal(`https://duckduckgo.com?q=${encodeURIComponent(params.selectionText)}`);
            }
        },
        actions.inspect()
    ]
});

function onClosed() {
    // Dereference the window
    // For multiple windows store them in an array
    mainWindow = null;
}

async function createMainWindow() {
    await sqlInit.dbConnection;

    // if schema doesn't exist -> setup process
    // if schema exists, then we need to wait until the migration process is finished
    if (await sqlInit.schemaExists()) {
        await sqlInit.dbReady;
    }

    const mainWindowState = windowStateKeeper({
        // default window width & height so it's usable on 1600 * 900 display (including some extra panels etc.)
        defaultWidth: 1200,
        defaultHeight: 800
    });
    // 创建浏览器窗口。
    const win = new electron.BrowserWindow({
        x: mainWindowState.x,
        y: mainWindowState.y,
        width: mainWindowState.width,
        height: mainWindowState.height,
        title: 'Trilium 笔记',
        webPreferences: {
            nodeIntegration: true
        },
        icon: path.join(__dirname, 'images/app-icons/png/256x256' + (env.isDev() ? '-dev' : '') + '.png')
    });

    mainWindowState.manage(win);

    win.setMenuBarVisibility(false);
    win.loadURL('http://127.0.0.1:' + await port);
    win.on('closed', onClosed);

    win.webContents.on('new-window', (e, url) => {
        if (url !== win.webContents.getURL()) {
            e.preventDefault();
            require('electron').shell.openExternal(url);
        }
    });

    // 防止拖放
    win.webContents.on('will-navigate', (ev, targetUrl) => {
        const parsedUrl = url.parse(targetUrl);

        // 允许来自设置和迁移页面的内部重定向
        if (!['localhost', '127.0.0.1'].includes(parsedUrl.hostname) || (parsedUrl.path && parsedUrl.path !== '/')) {
            ev.preventDefault();
        }
    });

    return win;
}
// 当全部窗口关闭时退出。
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // 在macOS上，当单击dock图标并且没有其他窗口打开时，
    // 通常在应用程序中重新创建一个窗口。
    if (!mainWindow) {
        mainWindow = createMainWindow();
    }
});
// Electron 会在初始化后并准备
// 创建浏览器窗口时，调用这个函数。
// 部分 API 在 ready 事件触发后才能使用。
app.on('ready', async () => {
    app.setAppUserModelId('com.github.zadam.trilium');

    mainWindow = await createMainWindow();

    const result = globalShortcut.register('CommandOrControl+Alt+P', cls.wrap(async () => {
        // window may be hidden / not in focus
        mainWindow.focus();

        mainWindow.webContents.send('create-day-sub-note');
    }));

    if (!result) {
        log.error("Could not register global shortcut CTRL+ALT+P");
    }
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});

require('./src/www');

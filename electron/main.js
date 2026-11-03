const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

let mainWindow;
let nextProcess;

function startNextServer() {
  const nextBin = require.resolve('next/dist/bin/next');
  nextProcess = spawn(process.execPath, [nextBin, 'start', '-H', '127.0.0.1', '-p', '3000'], {
    cwd: app.getAppPath(),
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', NODE_ENV: 'production' },
    stdio: 'inherit',
  });

  nextProcess.on('error', (error) => {
    console.error('Next server failed to start:', error);
  });

  nextProcess.on('exit', (code) => {
    console.log('Next server exited with code:', code);
  });
}

async function waitForNextServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch('http://127.0.0.1:3000');
      if (response.ok) {
        return;
      }
    } catch {}

    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'القرآن الكريم',
    backgroundColor: '#0b1020',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  waitForNextServer().then(() => mainWindow?.loadURL('http://127.0.0.1:3000'));
}

app.whenReady().then(() => {
  startNextServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (nextProcess && !nextProcess.killed) {
    nextProcess.kill('SIGTERM');
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

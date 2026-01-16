const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { writeToExcel, readTopScores } = require("./public/js/excelWriter");

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    icon: path.join(__dirname, "public/background/favicon.ico"),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadFile("public/templates/index.html");
}

// IPC handler to save Excel
ipcMain.handle("save-excel", async (_, data) => {
  try {
    await writeToExcel(data);
    return true;
  } catch (err) {
    console.error("Excel save error:", err);
    return false;
  }
});
// IPC handler to read top scores
ipcMain.handle("get-top-scores", async () => {
  try {
    return readTopScores(10);
  } catch (err) {
    console.error("Read score error:", err);
    return [];
  }
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

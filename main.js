const { app, BrowserWindow, ipcMain, globalShortcut } = require("electron");
const path = require("path");
const fs = require("fs");
const { writeToExcel, readTopScores } = require("./public/js/excelWriter");

let mainWindow = null;
let settingsWindow = null;

// Path to the global.css file that holds all the :root variables
const cssPath = path.join(__dirname, "public", "css", "global.css");

// Folder where uploaded fonts live — matches the '../fonts/...' paths
// used inside global.css's @font-face rules
const fontDir = path.join(__dirname, "public", "fonts");

// Folder where background images live
const backgroundDir = path.join(__dirname, "public", "background");

// Fixed set of background image slots used across the app's CSS.
// Each slot has a FIXED filename — uploads always overwrite the same
// name/extension so hardcoded CSS url() paths never break.
const BACKGROUND_SLOTS = [
  "index-portrait.jpg",
  "index-landscape.jpg",
  "game-portrait.jpg",
  "game-landscape.jpg",
  "form-portrait.jpg",
  "form-landscape.jpg",
  "score-portrait.jpg",
  "score-landscap.jpg",
  "setting-portrait.jpg",
  "setting-landscape.jpg",
  "front.png",
  "sorry.jpg",
  "winner.jpg",
];

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    icon: path.join(__dirname, "public/background/favicon.ico"),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile("public/templates/index.html");

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 600,
    height: 850,
    icon: path.join(__dirname, "public/background/favicon.ico"),
    autoHideMenuBar: true,
    title: "Settings",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  settingsWindow.loadFile("public/templates/settings.html");

  settingsWindow.webContents.on("did-finish-load", () => {
    sendFontsToSettings();
    sendBackgroundsToSettings();
  });

  settingsWindow.on("closed", () => {
    settingsWindow = null;
  });
}

function notifyWindows(channel, payload) {
  [mainWindow, settingsWindow]
    .filter((win) => win && !win.isDestroyed())
    .forEach((win) => win.webContents.send(channel, payload));
}

/* =====================
   CSS ROOT VARIABLES
===================== */

// Reads every "--name: value;" pair out of global.css's :root block
function readCssVariables() {
  if (!fs.existsSync(cssPath)) return {};

  const css = fs.readFileSync(cssPath, "utf8");
  const vars = {};
  const regex = /(--[\w-]+)\s*:\s*([^;]+);/g;
  let match;

  while ((match = regex.exec(css)) !== null) {
    vars[match[1]] = match[2].trim();
  }

  return vars;
}

// Writes updated variable values back into global.css, in place
function updateCssVariables(updatedVars) {
  if (!fs.existsSync(cssPath)) return;

  let cssContent = fs.readFileSync(cssPath, "utf8");

  for (const [varName, value] of Object.entries(updatedVars)) {
    const regex = new RegExp(`${varName}\\s*:\\s*[^;]+;`, "i");

    if (regex.test(cssContent)) {
      cssContent = cssContent.replace(regex, `${varName}: ${value};`);
    } else {
      cssContent = cssContent.replace(":root {", `:root {\n  ${varName}: ${value};`);
    }
  }

  fs.writeFileSync(cssPath, cssContent, "utf8");
}

/* =====================
   FONT UPLOAD MACHINERY
===================== */

function getFontFormat(fileName) {
  const ext = path.extname(fileName).toLowerCase();

  if (ext === ".ttf") return "truetype";
  if (ext === ".otf") return "opentype";
  if (ext === ".woff") return "woff";
  if (ext === ".woff2") return "woff2";

  return null;
}

// Family name is derived straight from the filename (minus extension),
// so it always matches what's written into the generated @font-face rule
function getFontFamilyFromFile(fileName) {
  return path.basename(fileName, path.extname(fileName));
}

function getFontFiles() {
  ensureDir(fontDir);

  return fs
    .readdirSync(fontDir)
    .filter((file) =>
      [".ttf", ".otf", ".woff", ".woff2"].includes(path.extname(file).toLowerCase())
    )
    .sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
    );
}

// Builds one @font-face block per uploaded font file
function buildFontFaceCss() {
  return getFontFiles()
    .map((file) => {
      const family = getFontFamilyFromFile(file);
      const format = getFontFormat(file);

      return `@font-face {
  font-family: '${family}';
  src: url('../fonts/${file}') format('${format}');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}`;
    })
    .join("\n\n");
}

// Regenerates the auto-managed @font-face block inside global.css.
// Everything between the markers is replaced; markers are created
// automatically the first time this runs if they don't exist yet.
function syncFontFacesToGlobalCss() {
  if (!fs.existsSync(cssPath)) return;

  let cssContent = fs.readFileSync(cssPath, "utf8");
  const fontFaceBlock = buildFontFaceCss();

  const startMarker = "/* FONT_FACE_START */";
  const endMarker = "/* FONT_FACE_END */";
  const regex = /\/\* FONT_FACE_START \*\/[\s\S]*?\/\* FONT_FACE_END \*\//;
  const replacement = `${startMarker}\n${fontFaceBlock}\n${endMarker}`;

  if (regex.test(cssContent)) {
    cssContent = cssContent.replace(regex, replacement);
  } else {
    cssContent = `${replacement}\n\n${cssContent}`;
  }

  fs.writeFileSync(cssPath, cssContent, "utf8");
}

function sendFontsToSettings() {
  const fonts = getFontFiles().map((file) => ({
    file,
    family: getFontFamilyFromFile(file),
  }));

  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send("fonts-list", fonts);
  }
}

/* =====================
   BACKGROUND IMAGE MACHINERY
===================== */

function getBackgroundSlots() {
  ensureDir(backgroundDir);

  return BACKGROUND_SLOTS.map((file) => {
    const filePath = path.join(backgroundDir, file);
    const exists = fs.existsSync(filePath);

    return {
      file,
      exists,
      // mtime used as a cache-busting query param so the renderer's
      // <img> tag reloads after a same-named file gets replaced
      mtime: exists ? fs.statSync(filePath).mtimeMs : 0,
    };
  });
}

function sendBackgroundsToSettings() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send("backgrounds-list", getBackgroundSlots());
  }
}

/* =====================
   IPC HANDLERS
===================== */

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

// Open the settings window (also triggered by the F2 shortcut)
ipcMain.on("open-settings", () => {
  createSettingsWindow();
});

// Send the current CSS variables to whichever window asked
ipcMain.on("get-css-variables", (event) => {
  event.sender.send("css-variables", readCssVariables());
});

// Receive edited variables from the settings window, write them, and
// tell every open window to refresh its stylesheet
ipcMain.on("update-settings", (event, data) => {
  if (!data?.variables) return;

  updateCssVariables(data.variables);
  notifyWindows("reload-styles");
});

// Send the list of uploaded fonts
ipcMain.on("get-fonts", () => {
  sendFontsToSettings();
});

// Save a newly uploaded font file, regenerate @font-face rules, refresh
ipcMain.on("upload-font", (event, data) => {
  try {
    ensureDir(fontDir);
    const destPath = path.join(fontDir, path.basename(data.name));
    fs.writeFileSync(destPath, Buffer.from(data.buffer));

    syncFontFacesToGlobalCss();
    notifyWindows("reload-styles");
    sendFontsToSettings();
  } catch (error) {
    console.error("Upload font error:", error);
  }
});

// Delete an uploaded font file, regenerate @font-face rules, refresh
ipcMain.on("delete-font", (event, fileName) => {
  try {
    const filePath = path.join(fontDir, path.basename(fileName));

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    syncFontFacesToGlobalCss();
    notifyWindows("reload-styles");
    sendFontsToSettings();
  } catch (error) {
    console.error("Delete font error:", error);
  }
});

// Send the list of background image slots
ipcMain.on("get-backgrounds", () => {
  sendBackgroundsToSettings();
});

// Save a newly uploaded background image into its fixed slot.
// Old file (if any) is deleted first, then the new bytes are written
// under the SAME slot filename — format/name never changes.
ipcMain.on("upload-background", (event, { slot, buffer }) => {
  try {
    if (!BACKGROUND_SLOTS.includes(slot)) {
      console.error("Rejected upload-background: unknown slot", slot);
      return;
    }

    ensureDir(backgroundDir);
    const destPath = path.join(backgroundDir, slot);

    if (fs.existsSync(destPath)) {
      fs.unlinkSync(destPath);
    }

    fs.writeFileSync(destPath, Buffer.from(buffer));

    notifyWindows("reload-styles");
    sendBackgroundsToSettings();
  } catch (error) {
    console.error("Upload background error:", error);
  }
});

// Delete a background image slot's current file
ipcMain.on("delete-background", (event, slot) => {
  try {
    if (!BACKGROUND_SLOTS.includes(slot)) {
      console.error("Rejected delete-background: unknown slot", slot);
      return;
    }

    const filePath = path.join(backgroundDir, slot);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    notifyWindows("reload-styles");
    sendBackgroundsToSettings();
  } catch (error) {
    console.error("Delete background error:", error);
  }
});

app.whenReady().then(() => {
  ensureDir(fontDir);
  ensureDir(backgroundDir);
  syncFontFacesToGlobalCss(); // pick up any fonts already sitting in public/fonts

  createWindow();

  // Press F2 anywhere in the app to open the settings window
  globalShortcut.register("F2", () => {
    createSettingsWindow();
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
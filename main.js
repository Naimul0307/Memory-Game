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

// Folder where page images live (dynamic list, any filename)
const imagesDir = path.join(__dirname, "public", "images");

// Folder where xml files live (dynamic list, any filename)
const xmlDir = path.join(__dirname, "public", "xml");

// Folder where audio files live (fixed slots, see AUDIO_SLOTS below)
const audioDir = path.join(__dirname, "public", "audio");

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

// Fixed set of audio slots used by the game logic — same idea as
// BACKGROUND_SLOTS. Uploads always overwrite the same filename so
// hardcoded audio paths elsewhere in the app never break.
const AUDIO_SLOTS = [
  "beep.mp3",
  "flipcard.mp3",
  "no-match-audio.mp3",
  "match-audio.mp3",
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
    sendImagesToSettings();
    sendXmlToSettings();
    sendAudioToSettings();
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

  notifyWindows("fonts-list", fonts);
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
  notifyWindows("backgrounds-list", getBackgroundSlots());
}

/* =====================
   PAGE IMAGES MACHINERY
   Dynamic list (like fonts) — any filename allowed, multiple images.
===================== */

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"];

function getImageFiles() {
  ensureDir(imagesDir);

  return fs
    .readdirSync(imagesDir)
    .filter((file) => IMAGE_EXTENSIONS.includes(path.extname(file).toLowerCase()))
    .sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
    );
}

function sendImagesToSettings() {
  const images = getImageFiles().map((file) => {
    const filePath = path.join(imagesDir, file);
    return { file, mtime: fs.statSync(filePath).mtimeMs };
  });

  notifyWindows("images-list", images);
}

/* =====================
   XML FILES MACHINERY
   Dynamic list (like fonts) — any filename allowed, multiple files.
===================== */

function getXmlFiles() {
  ensureDir(xmlDir);

  return fs
    .readdirSync(xmlDir)
    .filter((file) => path.extname(file).toLowerCase() === ".xml")
    .sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
    );
}

function sendXmlToSettings() {
  notifyWindows("xml-list", getXmlFiles());
}

/* =====================
   AUDIO FILES MACHINERY
   Fixed slots (like backgrounds) — filenames must match AUDIO_SLOTS.
===================== */

function getAudioSlots() {
  ensureDir(audioDir);

  return AUDIO_SLOTS.map((file) => {
    const filePath = path.join(audioDir, file);
    const exists = fs.existsSync(filePath);

    return {
      file,
      exists,
      mtime: exists ? fs.statSync(filePath).mtimeMs : 0,
    };
  });
}

function sendAudioToSettings() {
  notifyWindows("audio-list", getAudioSlots());
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
// push the fresh values to every open window so they apply instantly
// (no full page reload needed — see public/js/liveTheme.js)
ipcMain.on("update-settings", (event, data) => {
  if (!data?.variables) return;

  updateCssVariables(data.variables);
  notifyWindows("css-variables", readCssVariables());
  notifyWindows("reload-styles"); // kept so the Settings window still shows "Saved and applied!"
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

// Send the list of page images
ipcMain.on("get-images", () => {
  sendImagesToSettings();
});

// Save a newly uploaded page image (any filename, multiple allowed)
ipcMain.on("upload-image", (event, data) => {
  try {
    ensureDir(imagesDir);
    const destPath = path.join(imagesDir, path.basename(data.name));
    fs.writeFileSync(destPath, Buffer.from(data.buffer));

    notifyWindows("reload-styles");
    sendImagesToSettings();
  } catch (error) {
    console.error("Upload image error:", error);
  }
});

// Delete a page image by filename
ipcMain.on("delete-image", (event, fileName) => {
  try {
    const filePath = path.join(imagesDir, path.basename(fileName));

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    notifyWindows("reload-styles");
    sendImagesToSettings();
  } catch (error) {
    console.error("Delete image error:", error);
  }
});

// Send the list of xml files
ipcMain.on("get-xml", () => {
  sendXmlToSettings();
});

// Save a newly uploaded xml file (any filename, multiple allowed)
ipcMain.on("upload-xml", (event, data) => {
  try {
    ensureDir(xmlDir);
    const destPath = path.join(xmlDir, path.basename(data.name));
    fs.writeFileSync(destPath, Buffer.from(data.buffer));

    sendXmlToSettings();
  } catch (error) {
    console.error("Upload xml error:", error);
  }
});

// Delete an xml file by filename
ipcMain.on("delete-xml", (event, fileName) => {
  try {
    const filePath = path.join(xmlDir, path.basename(fileName));

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    sendXmlToSettings();
  } catch (error) {
    console.error("Delete xml error:", error);
  }
});

// Send the list of audio slots
ipcMain.on("get-audio", () => {
  sendAudioToSettings();
});

// Save a newly uploaded audio file into its fixed slot.
// Old file (if any) is deleted first, then the new bytes are written
// under the SAME slot filename — format/name never changes.
ipcMain.on("upload-audio", (event, { slot, buffer }) => {
  try {
    if (!AUDIO_SLOTS.includes(slot)) {
      console.error("Rejected upload-audio: unknown slot", slot);
      return;
    }

    ensureDir(audioDir);
    const destPath = path.join(audioDir, slot);

    if (fs.existsSync(destPath)) {
      fs.unlinkSync(destPath);
    }

    fs.writeFileSync(destPath, Buffer.from(buffer));

    notifyWindows("reload-styles");
    sendAudioToSettings();
  } catch (error) {
    console.error("Upload audio error:", error);
  }
});

// Delete an audio slot's current file
ipcMain.on("delete-audio", (event, slot) => {
  try {
    if (!AUDIO_SLOTS.includes(slot)) {
      console.error("Rejected delete-audio: unknown slot", slot);
      return;
    }

    const filePath = path.join(audioDir, slot);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    notifyWindows("reload-styles");
    sendAudioToSettings();
  } catch (error) {
    console.error("Delete audio error:", error);
  }
});

app.whenReady().then(() => {
  ensureDir(fontDir);
  ensureDir(backgroundDir);
  ensureDir(imagesDir);
  ensureDir(xmlDir);
  ensureDir(audioDir);
  syncFontFacesToGlobalCss(); // pick up any fonts already sitting in public/fonts

  createWindow();

  // Press F2 anywhere in the app to open the settings window
  globalShortcut.register("F2", () => {
    createSettingsWindow();
  });
});

// Path to a small JSON file for game settings (separate from global.css)
const configPath = path.join(__dirname, "public", "config.json");

const DEFAULT_CONFIG = {
  timeLimit: 60,
};

function readConfig() {
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf8");
    return { ...DEFAULT_CONFIG };
  }
  try {
    const raw = fs.readFileSync(configPath, "utf8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch (err) {
    console.error("Config read error:", err);
    return { ...DEFAULT_CONFIG };
  }
}

function writeConfig(updatedFields) {
  const merged = { ...readConfig(), ...updatedFields };
  fs.writeFileSync(configPath, JSON.stringify(merged, null, 2), "utf8");
  return merged;
}

// Send current config (used by both game.js and settings.js)
ipcMain.handle("get-config", async () => {
  return readConfig();
});

// Save updated config fields (merges, doesn't overwrite the whole file)
ipcMain.handle("update-config", async (_, data) => {
  const merged = writeConfig(data);
  notifyWindows("config-updated", merged);
  return merged;
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
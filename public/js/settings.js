const { ipcRenderer } = require("electron");

const settingsList = document.getElementById("settingsList");
const colorGrid = document.getElementById("colorGrid");
const bgGrid = document.getElementById("bgGrid");
const bgUploader = document.getElementById("bgUploader");
const imgGrid = document.getElementById("imgGrid");
const imageUploader = document.getElementById("imageUploader");
const xmlGrid = document.getElementById("xmlGrid");
const xmlUploader = document.getElementById("xmlUploader");
const audioGrid = document.getElementById("audioGrid");
const audioUploader = document.getElementById("audioUploader");
const saveBtn = document.getElementById("saveBtn");
const statusEl = document.getElementById("status");
const fontUploader = document.getElementById("fontUploader");
const fontGrid = document.getElementById("fontGrid");
const timeLimitInput = document.getElementById("timeLimitInput");

let variablesState = {};
let currentFonts = [];
let currentBackgroundSlots = [];
let currentAudioSlots = [];
let fontBaseSelectEl = null;

async function loadConfig() {
  try {
    const config = await ipcRenderer.invoke("get-config");
    if (timeLimitInput) timeLimitInput.value = config.timeLimit;
  } catch (err) {
    console.error("Config load error:", err);
  }
}

loadConfig();

function isHexColor(value = "") {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

function isRgbaColor(value = "") {
  return /^rgba?\(/i.test(value.trim());
}

function stripQuotes(value = "") {
  return value.trim().replace(/^['"]|['"]$/g, "");
}

function getUniqueFonts(fonts = []) {
  return fonts.filter(
    (font, index, arr) => index === arr.findIndex((f) => f.family === font.family)
  );
}

function showStatus(message, duration = 4000) {
  statusEl.textContent = message;
  setTimeout(() => (statusEl.textContent = ""), duration);
}

/* =====================
   ROOT VARIABLE CONTROLS
   (non-color vars → settingsList rows,
    color vars → colorGrid cards)
===================== */

function renderSettings(vars) {
  variablesState = { ...vars };
  settingsList.innerHTML = "";
  colorGrid.innerHTML = "";
  fontBaseSelectEl = null;

  const colorEntries = [];
  const otherEntries = [];

  Object.entries(vars).forEach(([varName, value]) => {
    if (varName !== "--font-base" && (isHexColor(value) || isRgbaColor(value))) {
      colorEntries.push([varName, value]);
    } else {
      otherEntries.push([varName, value]);
    }
  });

  otherEntries.forEach(([varName, value]) => renderOtherRow(varName, value));

  if (colorEntries.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-note";
    empty.textContent = "No color variables found in global.css.";
    colorGrid.appendChild(empty);
  } else {
    colorEntries.forEach(([varName, value]) => renderColorCard(varName, value));
  }
}

function renderOtherRow(varName, value) {
  const row = document.createElement("div");
  row.className = "setting-row";

  const label = document.createElement("label");
  label.textContent = varName.replace(/^--/, "");
  row.appendChild(label);

  settingsList.appendChild(row);

  if (varName === "--font-base") {
    const select = document.createElement("select");
    select.addEventListener("change", () => {
      variablesState["--font-base"] = select.value;
    });
    row.appendChild(select);
    fontBaseSelectEl = select;
    populateFontSelect(currentFonts, value);
  } else {
    const input = document.createElement("input");
    input.type = "text";
    input.value = value;
    input.addEventListener("input", () => {
      variablesState[varName] = input.value;
    });
    row.appendChild(input);
  }
}

function renderColorCard(varName, value) {
  const item = document.createElement("div");
  item.className = "color-item";

  const swatchId = `picker-${varName.replace(/[^a-z0-9-]/gi, "")}`;
  const swatch = document.createElement("div");
  swatch.className = "swatch";
  swatch.id = swatchId;
  swatch.style.background = value;
  item.appendChild(swatch);

  const name = document.createElement("div");
  name.className = "color-name";
  name.textContent = varName.replace(/^--/, "");
  item.appendChild(name);

  const valueLabel = document.createElement("div");
  valueLabel.className = "color-value";
  valueLabel.textContent = value;
  item.appendChild(valueLabel);

  colorGrid.appendChild(item);

  const pickr = Pickr.create({
    el: `#${swatchId}`,
    theme: "classic",
    default: value,
    components: {
      preview: true,
      opacity: true,
      hue: true,
      interaction: {
        input: true,
        save: true,
      },
    },
  });

  pickr.on("save", (color) => {
    const newValue = isHexColor(value)
      ? color.toHEXA().toString()
      : color.toRGBA().toString();
    variablesState[varName] = newValue;
    swatch.style.background = newValue;
    valueLabel.textContent = newValue;
    pickr.hide();
  });
}

/* =====================
   FONT SELECT (for --font-base)
===================== */

function populateFontSelect(fonts, currentValue) {
  if (!fontBaseSelectEl) return;

  const uniqueFonts = getUniqueFonts(fonts);
  const currentFamily = stripQuotes(currentValue || variablesState["--font-base"] || "");

  fontBaseSelectEl.innerHTML = "";

  if (uniqueFonts.length === 0) {
    const opt = document.createElement("option");
    opt.value = currentValue || "";
    opt.textContent = currentFamily ? `${currentFamily} (no fonts uploaded yet)` : "No fonts uploaded";
    fontBaseSelectEl.appendChild(opt);
    return;
  }

  uniqueFonts.forEach((font) => {
    const opt = document.createElement("option");
    opt.value = `'${font.family}'`;
    opt.textContent = font.family;
    opt.style.fontFamily = `'${font.family}'`;
    fontBaseSelectEl.appendChild(opt);
  });

  const matched = uniqueFonts.find((font) => font.family === currentFamily);
  fontBaseSelectEl.value = matched ? `'${matched.family}'` : `'${uniqueFonts[0].family}'`;
  variablesState["--font-base"] = fontBaseSelectEl.value;
}

/* =====================
   FONT UPLOAD GRID
===================== */

function renderFontGrid(fonts) {
  fontGrid.innerHTML = "";

  const uniqueFonts = getUniqueFonts(fonts);

  if (uniqueFonts.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-note";
    empty.textContent = "No fonts uploaded yet — add .ttf, .otf, .woff, or .woff2 files above.";
    fontGrid.appendChild(empty);
    return;
  }

  uniqueFonts.forEach((font) => {
    const item = document.createElement("div");
    item.className = "font-item";

    const preview = document.createElement("div");
    preview.className = "thumb";
    preview.style.fontFamily = `'${font.family}', sans-serif`;
    preview.textContent = "Abc 123";

    const fileName = document.createElement("div");
    fileName.className = "file-name";
    fileName.textContent = font.file;

    const del = document.createElement("button");
    del.className = "delete-btn";
    del.textContent = "Delete";
    del.addEventListener("click", () => {
      ipcRenderer.send("delete-font", font.file);
    });

    item.appendChild(preview);
    item.appendChild(fileName);
    item.appendChild(del);

    fontGrid.appendChild(item);
  });
}

/* =====================
   BACKGROUND IMAGE GRID
   Fixed slots (from main.js BACKGROUND_SLOTS). Upload happens via the
   single shared #bgUploader input above the grid — the uploaded
   file's name must match an existing slot filename exactly; main.js
   validates this and overwrites that slot in place. The grid itself
   only shows a thumbnail + delete button per slot.
===================== */

function renderBackgroundGrid(slots) {
  currentBackgroundSlots = Array.isArray(slots) ? slots : [];
  bgGrid.innerHTML = "";

  if (currentBackgroundSlots.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-note";
    empty.textContent = "No background slots configured.";
    bgGrid.appendChild(empty);
    return;
  }

  currentBackgroundSlots.forEach((slot) => {
    const item = document.createElement("div");
    item.className = "bg-item";

    const thumb = document.createElement("div");
    thumb.className = "bg-thumb";

    if (slot.exists) {
      const img = document.createElement("img");
      img.src = `../background/${slot.file}?t=${slot.mtime}`;
      img.alt = slot.file;
      thumb.appendChild(img);
    } else {
      const missing = document.createElement("span");
      missing.textContent = "No image";
      thumb.appendChild(missing);
    }

    const fileName = document.createElement("div");
    fileName.className = "file-name";
    fileName.textContent = slot.file;

    const del = document.createElement("button");
    del.className = "delete-btn";
    del.textContent = "Delete";
    del.disabled = !slot.exists;
    del.addEventListener("click", () => {
      ipcRenderer.send("delete-background", slot.file);
    });

    item.appendChild(thumb);
    item.appendChild(fileName);
    item.appendChild(del);

    bgGrid.appendChild(item);
  });
}

if (bgUploader) {
  bgUploader.addEventListener("change", (e) => {
    const validNames = currentBackgroundSlots.map((s) => s.file);
    const rejected = [];

    Array.from(e.target.files).forEach((file) => {
      if (!validNames.includes(file.name)) {
        rejected.push(file.name);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        ipcRenderer.send("upload-background", {
          slot: file.name,
          buffer: reader.result,
        });
      };
      reader.readAsArrayBuffer(file);
    });

    if (rejected.length > 0) {
      showStatus(`Skipped (name must match an existing slot): ${rejected.join(", ")}`);
    }

    e.target.value = "";
  });
}

/* =====================
   PAGE IMAGES GRID
   Dynamic list (like fonts) — any filename, multiple images allowed.
   Uploads go straight into public/images without a fixed slot name.
===================== */

function renderImageGrid(images) {
  imgGrid.innerHTML = "";

  if (!images || images.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-note";
    empty.textContent = "No page images uploaded yet.";
    imgGrid.appendChild(empty);
    return;
  }

  images.forEach((image) => {
    const item = document.createElement("div");
    item.className = "bg-item";

    const thumb = document.createElement("div");
    thumb.className = "bg-thumb";

    const img = document.createElement("img");
    img.src = `../images/${image.file}?t=${image.mtime}`;
    img.alt = image.file;
    thumb.appendChild(img);

    const fileName = document.createElement("div");
    fileName.className = "file-name";
    fileName.textContent = image.file;

    const del = document.createElement("button");
    del.className = "delete-btn";
    del.textContent = "Delete";
    del.addEventListener("click", () => {
      ipcRenderer.send("delete-image", image.file);
    });

    item.appendChild(thumb);
    item.appendChild(fileName);
    item.appendChild(del);

    imgGrid.appendChild(item);
  });
}

if (imageUploader) {
  imageUploader.addEventListener("change", (e) => {
    Array.from(e.target.files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        ipcRenderer.send("upload-image", {
          name: file.name,
          buffer: reader.result,
        });
      };
      reader.readAsArrayBuffer(file);
    });

    e.target.value = "";
  });
}

/* =====================
   XML FILES GRID
   Dynamic list (like fonts) — any filename, multiple files allowed.
===================== */

function renderXmlGrid(files) {
  xmlGrid.innerHTML = "";

  if (!files || files.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-note";
    empty.textContent = "No XML files uploaded yet.";
    xmlGrid.appendChild(empty);
    return;
  }

  files.forEach((fileName) => {
    const item = document.createElement("div");
    item.className = "font-item";

    const preview = document.createElement("div");
    preview.className = "thumb";
    preview.textContent = "XML";

    const nameEl = document.createElement("div");
    nameEl.className = "file-name";
    nameEl.textContent = fileName;

    const del = document.createElement("button");
    del.className = "delete-btn";
    del.textContent = "Delete";
    del.addEventListener("click", () => {
      ipcRenderer.send("delete-xml", fileName);
    });

    item.appendChild(preview);
    item.appendChild(nameEl);
    item.appendChild(del);

    xmlGrid.appendChild(item);
  });
}

if (xmlUploader) {
  xmlUploader.addEventListener("change", (e) => {
    const rejected = [];

    Array.from(e.target.files).forEach((file) => {
      if (!file.name.toLowerCase().endsWith(".xml")) {
        rejected.push(file.name);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        ipcRenderer.send("upload-xml", {
          name: file.name,
          buffer: reader.result,
        });
      };
      reader.readAsArrayBuffer(file);
    });

    if (rejected.length > 0) {
      showStatus(`Skipped (not .xml): ${rejected.join(", ")}`);
    }

    e.target.value = "";
  });
}

/* =====================
   AUDIO FILES GRID
   Fixed slots (from main.js AUDIO_SLOTS) — same pattern as
   backgrounds. Upload happens via the single shared #audioUploader
   input above the grid — the uploaded file's name must match an
   existing slot filename exactly; main.js validates this and
   overwrites that slot in place.
===================== */

function renderAudioGrid(slots) {
  currentAudioSlots = Array.isArray(slots) ? slots : [];
  audioGrid.innerHTML = "";

  if (currentAudioSlots.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-note";
    empty.textContent = "No audio slots configured.";
    audioGrid.appendChild(empty);
    return;
  }

  currentAudioSlots.forEach((slot) => {
    const item = document.createElement("div");
    item.className = "bg-item";

    const thumb = document.createElement("div");
    thumb.className = "bg-thumb";

    if (slot.exists) {
      const audio = document.createElement("audio");
      audio.controls = true;
      audio.src = `../audio/${slot.file}?t=${slot.mtime}`;
      thumb.appendChild(audio);
    } else {
      const missing = document.createElement("span");
      missing.textContent = "No audio";
      thumb.appendChild(missing);
    }

    const fileName = document.createElement("div");
    fileName.className = "file-name";
    fileName.textContent = slot.file;

    const del = document.createElement("button");
    del.className = "delete-btn";
    del.textContent = "Delete";
    del.disabled = !slot.exists;
    del.addEventListener("click", () => {
      ipcRenderer.send("delete-audio", slot.file);
    });

    item.appendChild(thumb);
    item.appendChild(fileName);
    item.appendChild(del);

    audioGrid.appendChild(item);
  });
}

if (audioUploader) {
  audioUploader.addEventListener("change", (e) => {
    const validNames = currentAudioSlots.map((s) => s.file);
    const rejected = [];

    Array.from(e.target.files).forEach((file) => {
      if (!validNames.includes(file.name)) {
        rejected.push(file.name);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        ipcRenderer.send("upload-audio", {
          slot: file.name,
          buffer: reader.result,
        });
      };
      reader.readAsArrayBuffer(file);
    });

    if (rejected.length > 0) {
      showStatus(`Skipped (name must match an existing slot): ${rejected.join(", ")}`);
    }

    e.target.value = "";
  });
}

/* =====================
   IPC WIRING
===================== */

ipcRenderer.on("css-variables", (event, vars) => {
  renderSettings(vars);
});

ipcRenderer.on("fonts-list", (event, fonts) => {
  currentFonts = Array.isArray(fonts) ? fonts : [];
  renderFontGrid(currentFonts);
  populateFontSelect(currentFonts);
});

ipcRenderer.on("backgrounds-list", (event, slots) => {
  renderBackgroundGrid(slots);
});

ipcRenderer.on("images-list", (event, images) => {
  renderImageGrid(images);
});

ipcRenderer.on("xml-list", (event, files) => {
  renderXmlGrid(files);
});

ipcRenderer.on("audio-list", (event, slots) => {
  renderAudioGrid(slots);
});

ipcRenderer.on("reload-styles", () => {
  showStatus("Saved and applied!", 2000);
});

if (fontUploader) {
  fontUploader.addEventListener("change", (e) => {
    Array.from(e.target.files).forEach((file) => {
      const reader = new FileReader();

      reader.onload = () => {
        ipcRenderer.send("upload-font", {
          name: file.name,
          buffer: reader.result,
        });
      };

      reader.readAsArrayBuffer(file);
    });

    e.target.value = "";
  });
}

saveBtn.addEventListener("click", async () => {
  ipcRenderer.send("update-settings", { variables: variablesState });

  if (timeLimitInput) {
    const timeLimit = parseInt(timeLimitInput.value, 10);
    await ipcRenderer.invoke("update-config", {
      timeLimit: Number.isFinite(timeLimit) && timeLimit > 0 ? timeLimit : 60,
    });
  }

  showStatus("Saved and applied!", 2000);
});

ipcRenderer.send("get-css-variables");
ipcRenderer.send("get-fonts");
ipcRenderer.send("get-backgrounds");
ipcRenderer.send("get-images");
ipcRenderer.send("get-xml");
ipcRenderer.send("get-audio");
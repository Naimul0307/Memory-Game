const { ipcRenderer } = require("electron");

const settingsList = document.getElementById("settingsList");
const colorGrid = document.getElementById("colorGrid");
const bgGrid = document.getElementById("bgGrid");
const bgUploader = document.getElementById("bgUploader");
const saveBtn = document.getElementById("saveBtn");
const statusEl = document.getElementById("status");
const fontUploader = document.getElementById("fontUploader");
const fontGrid = document.getElementById("fontGrid");

let variablesState = {};
let currentFonts = [];
let currentBackgroundSlots = [];
let fontBaseSelectEl = null;

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
      statusEl.textContent = `Skipped (name must match an existing slot): ${rejected.join(", ")}`;
      setTimeout(() => (statusEl.textContent = ""), 4000);
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

ipcRenderer.on("reload-styles", () => {
  statusEl.textContent = "Saved and applied!";
  setTimeout(() => (statusEl.textContent = ""), 2000);
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

saveBtn.addEventListener("click", () => {
  ipcRenderer.send("update-settings", { variables: variablesState });
});

ipcRenderer.send("get-css-variables");
ipcRenderer.send("get-fonts");
ipcRenderer.send("get-backgrounds");
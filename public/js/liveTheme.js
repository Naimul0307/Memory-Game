// public/js/liveTheme.js
//
// Include this on every window that should reflect Settings changes
// live (index.html, game.html, form.html, score.html, etc). It never
// reloads the page — it patches CSS variables and swaps cache-busted
// asset URLs directly.
//
// Setup required on each page:
//   1. <script src="../js/liveTheme.js"></script> before </body>
//   2. <body data-page="index">  (use "game" / "form" / "score" / "settings"
//      to match which BACKGROUND_SLOTS pair belongs to that page)
//
// If a page has no data-page attribute, only CSS variables + font
// refresh are applied (background swapping is skipped for it).

(function () {
  const { ipcRenderer } = require("electron");

  const PAGE_BACKGROUND_SLOTS = {
    index: { portrait: "index-portrait.jpg", landscape: "index-landscape.jpg" },
    game: { portrait: "game-portrait.jpg", landscape: "game-landscape.jpg" },
    form: { portrait: "form-portrait.jpg", landscape: "form-landscape.jpg" },
    score: { portrait: "score-portrait.jpg", landscape: "score-landscap.jpg" },
    settings: { portrait: "setting-portrait.jpg", landscape: "setting-landscape.jpg" },
  };

  const pageKey = document.body.dataset.page;
  let backgroundSlots = [];

  // ---- CSS variables: applied straight onto :root, instantly, no reload ----
  function applyCssVariables(vars) {
    const root = document.documentElement;
    Object.entries(vars || {}).forEach(([name, value]) => {
      root.style.setProperty(name, value);
    });
  }

  // ---- Background image: fixed filename per slot, so we cache-bust ----
  // by setting it as an inline style (highest specificity, always wins
  // over the page's own CSS) with a ?t=mtime query param.
  function applyBackground() {
    if (!pageKey || !PAGE_BACKGROUND_SLOTS[pageKey]) return;

    const isPortrait = window.matchMedia("(orientation: portrait)").matches;
    const wantedFile = isPortrait
      ? PAGE_BACKGROUND_SLOTS[pageKey].portrait
      : PAGE_BACKGROUND_SLOTS[pageKey].landscape;

    const slot = backgroundSlots.find((s) => s.file === wantedFile);
    if (!slot || !slot.exists) return;

    document.body.style.backgroundImage = `url('../background/${slot.file}?t=${slot.mtime}')`;
    document.body.style.backgroundRepeat = "no-repeat";
    document.body.style.backgroundPosition = "center center";
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundAttachment = "fixed";
  }

  // ---- Fonts: global.css's @font-face block changes on disk, so we
  // swap the <link> tag for a copy with a cache-busting query string.
  // This re-parses the stylesheet (picking up new/removed @font-face
  // rules) without navigating the page. ----
  function refreshGlobalStylesheet() {
    const link = document.querySelector('link[href*="global.css"]');
    if (!link) return;

    const url = new URL(link.href, window.location.href);
    url.searchParams.set("v", Date.now());

    const clone = link.cloneNode();
    clone.href = url.toString();
    clone.addEventListener("load", () => link.remove());
    link.parentNode.insertBefore(clone, link.nextSibling);
  }

  ipcRenderer.on("css-variables", (event, vars) => applyCssVariables(vars));

  ipcRenderer.on("backgrounds-list", (event, slots) => {
    backgroundSlots = Array.isArray(slots) ? slots : [];
    applyBackground();
  });

  ipcRenderer.on("fonts-list", () => refreshGlobalStylesheet());

  // Sent after any save/upload/delete in Settings — just re-pull
  // current state, no page reload.
  ipcRenderer.on("reload-styles", () => {
    ipcRenderer.send("get-css-variables");
    ipcRenderer.send("get-backgrounds");
    ipcRenderer.send("get-fonts");
  });

  window.addEventListener("resize", applyBackground);

  ipcRenderer.send("get-css-variables");
  ipcRenderer.send("get-backgrounds");
  ipcRenderer.send("get-fonts");
})();
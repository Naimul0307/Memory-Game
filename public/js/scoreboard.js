const { ipcRenderer } = require("electron");

document.addEventListener("DOMContentLoaded", async () => {
  const scores = await ipcRenderer.invoke("get-top-scores");
  const tbody = document.querySelector("#scoreTable tbody");
  const homeBtn = document.getElementById("homeBtn");

  if (!scores.length) {
    tbody.innerHTML = `<tr><td colspan="5">No scores found</td></tr>`;
  } else {
    scores.forEach((s, i) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${i + 1}</td>
        <td>${s.name}</td>
        <td>${s.time}</td>
        <td>${s.moves}</td>
      `;
      tbody.appendChild(row);
    });
  }

  // 🔁 Auto redirect after 10 seconds
  setTimeout(() => {
    window.location.href = "index.html";
  }, 10000);

  // 🔘 Manual button redirect
  homeBtn.addEventListener("click", () => {
    window.location.href = "index.html";
  });
});

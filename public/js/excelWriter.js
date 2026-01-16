const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const filePath = path.join(__dirname, "../data/gameData.xlsx");

async function writeToExcel(data) {
  // Ensure folder exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  let workbook;
  let worksheet;
  let jsonData = [];

  // Load existing Excel if exists
  if (fs.existsSync(filePath)) {
    workbook = XLSX.readFile(filePath);
    worksheet = workbook.Sheets[workbook.SheetNames[0]];
    jsonData = XLSX.utils.sheet_to_json(worksheet);
  } else {
    workbook = XLSX.utils.book_new();
  }

  // Add new player/game data
  jsonData.push(data);

  // Convert JSON to worksheet
  worksheet = XLSX.utils.json_to_sheet(jsonData);

  // Replace Sheet1 if it exists
  if (workbook.SheetNames.includes("Sheet1")) {
    workbook.Sheets["Sheet1"] = worksheet;
  } else {
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  }

  XLSX.writeFile(workbook, filePath);
  console.log("Excel saved:", data);
}

module.exports = { writeToExcel };

function readTopScores(limit = 10) {
  if (!fs.existsSync(filePath)) return [];

  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  let data = XLSX.utils.sheet_to_json(sheet);

  // Remove failed games
  data = data.filter(d => d.time && d.time !== "00:00");

  // Sort: time ASC, moves ASC
  data.sort((a, b) => {
    const toSec = t => {
      const [m, s] = t.split(":").map(Number);
      return m * 60 + s;
    };

    const tDiff = toSec(a.time) - toSec(b.time);
    if (tDiff === 0) return a.moves - b.moves;
    return tDiff;
  });

  return data.slice(0, limit);
}

module.exports = { writeToExcel, readTopScores };

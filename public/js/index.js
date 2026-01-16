document.addEventListener("DOMContentLoaded", function () {

  // Start button click
  document.getElementById("startBtn").addEventListener("click", function (e) {
    e.stopPropagation(); // prevent body click
    window.location.href = "form.html";
  });

  // OPTIONAL: click anywhere else
  document.body.addEventListener("click", function () {
    window.location.href = "form.html";
  });

  // Show top score from localStorage
  const history = JSON.parse(localStorage.getItem("gameHistory")) || [];
  const validGames = history.filter(g => g.time && g.time !== "00:00");

  if (validGames.length) {
    validGames.sort((a, b) => {
      const [aMin, aSec] = a.time.split(":").map(Number);
      const [bMin, bSec] = b.time.split(":").map(Number);
      const aTotal = aMin * 60 + aSec;
      const bTotal = bMin * 60 + bSec;
      return aTotal === bTotal ? a.moves - b.moves : aTotal - bTotal;
    });

    const best = validGames[0];
    document.getElementById("topScoreText").textContent =
      `🏆 Best Player: ${best.user}   |   Time: ${best.time}   |   Moves: ${best.moves}`;
  } else {
    document.getElementById("topScoreText").textContent =
      "🏆 No top score yet!";
  }
});

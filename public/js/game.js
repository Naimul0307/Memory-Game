const { ipcRenderer } = require("electron");

let moves = 0;
let interval = null;
let timeLimit = 60;
let countdownTime = timeLimit;

const userName = localStorage.getItem("fileName") || "Guest";
const email = localStorage.getItem("email") || "";
const phone = localStorage.getItem("phone") || "";

const deck = document.getElementById("deck");
const stars = document.querySelector(".stars");
const elTimer = document.querySelector(".timer");

document.getElementById("userName").textContent = userName;

// AUDIO
const matchAudio = new Audio("../audio/match-audio.mp3");
const noMatchAudio = new Audio("../audio/no-match-audio.mp3");
const beepAudio = new Audio("../audio/beep.mp3");
const flipAudio = new Audio("../audio/flipcard.mp3");
const shuffleAudio = new Audio("../audio/flipcard.mp3");

// CARDS
let cards = [];
let openCards = [];
let matchedCards = [];

function loadCardsFromXML() {
  fetch("../xml/gifts.xml")
    .then((res) => res.text())
    .then((str) => new DOMParser().parseFromString(str, "text/xml"))
    .then((data) => {
      const gifts = data.getElementsByTagName("gift");
      let tempCards = [];
      for (let i = 0; i < gifts.length; i++) tempCards.push(gifts[i].textContent);
      cards = [...tempCards, ...tempCards];
      shuffleCards();
    })
    .catch(console.error);
}

function shuffle(array) {
  let currentIndex = array.length;
  while (currentIndex !== 0) {
    let randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

function shuffleCards() {
  let shuffled = shuffle(cards);
  deck.innerHTML = "";
  shuffled.forEach(
    (val) =>
      (deck.innerHTML += `<li class="card">
        <div class="card-inner">
          <div class="card-front"></div>
          <div class="card-back">
            <img src="${val}" class="card-image">
          </div>
        </div>
      </li>`)
  );

  let allCards = document.querySelectorAll(".card");
  allCards.forEach((c) => c.classList.add("flip"));

  setTimeout(() => {
    allCards.forEach((c) => c.classList.remove("flip"));
    startCountdown();
    shuffleAudio.play();
  }, 5000);
}

function startCountdown() {
  if (!interval) interval = setInterval(timer, 1000);
}

function timer() {
  countdownTime--;
  if (countdownTime < 0) return gameOver();

  let minutes = Math.floor(countdownTime / 60).toString().padStart(2, "0");
  let seconds = (countdownTime % 60).toString().padStart(2, "0");
  document.querySelector(".time-text").textContent = `${minutes}:${seconds}`;

  const styles = getComputedStyle(elTimer);
  const fillColor = styles.getPropertyValue("--timer-fill").trim();
  const bgColor = styles.getPropertyValue("--timer-bg").trim();

  let degrees = (countdownTime / timeLimit) * 360;

  elTimer.style.background = `
    conic-gradient(
      ${fillColor} 0deg ${degrees}deg,
      ${bgColor} ${degrees}deg 360deg
    )
  `;

  if (countdownTime <= 10) {
    elTimer.classList.add("beep");
    beepAudio.play();
  } else {
    elTimer.classList.remove("beep");
  }
}

function moveCount() {
  moves++;
  document.querySelector(".moves").textContent = `Moves:${moves}`;
  starRating();
}

function starRating() {
  let rating = 3;
  if (moves >= 25) rating = 1;
  else if (moves >= 15) rating = 2;

  [...stars.children].forEach((li, idx) => {
    li.children[0].className = idx < rating ? "fa fa-star" : "far fa-star";
  });

  return "★".repeat(rating) + "☆".repeat(3 - rating);
}

deck.addEventListener("click", async function (e) {
  let clickedCard = e.target.closest(".card");
  if (!clickedCard || clickedCard.classList.contains("open") || clickedCard.classList.contains("match") || openCards.length >= 2)
    return;

  openCards.push(clickedCard);
  clickedCard.classList.add("flip", "open");
  flipAudio.play();

  if (openCards.length === 2) {
    deck.style.pointerEvents = "none";
    let [card1, card2] = openCards;

    if (card1.querySelector("img").src === card2.querySelector("img").src) {
      matchedCards.push(card1, card2);
      card1.classList.add("match");
      card2.classList.add("match");
      matchAudio.play();
      openCards = [];

      if (matchedCards.length === cards.length) await gameWin();
      deck.style.pointerEvents = "auto";
    } else {
      setTimeout(() => {
        card1.classList.remove("flip", "open");
        card2.classList.remove("flip", "open");
        openCards = [];
        noMatchAudio.play();
        deck.style.pointerEvents = "auto";
      }, 800);
    }

    moveCount();
  }
});

// SAVE DATA
async function saveGameData(user, email, phone, moves, time, rating) {
  await ipcRenderer.invoke("save-excel", { name: user, email, phone, moves, time, rating, date: new Date().toLocaleString() });

  let history = JSON.parse(localStorage.getItem("gameHistory")) || [];
  history.push({ user, email, phone, moves, time, rating, date: new Date().toLocaleString() });
  localStorage.setItem("gameHistory", JSON.stringify(history));
}

// GAME WIN
async function gameWin() {
  clearInterval(interval);
  let timeTaken = timeLimit - countdownTime;
  let formattedTime = `${Math.floor(timeTaken / 60).toString().padStart(2,"0")}:${(timeTaken % 60).toString().padStart(2,"0")}`;
  let rating = starRating();

  await saveGameData(userName, email, phone, moves, formattedTime, rating);
  window.location.href = "thanks.html";
}

// GAME OVER
async function gameOver() {
  clearInterval(interval);
  countdownTime = 0;
  elTimer.textContent = "00:00";

  await saveGameData(userName, email, phone, moves, "00:00", "null");
  window.location.href = "thanks.html";
}

// BEST SCORE
function getHighestScore() {
  let history = JSON.parse(localStorage.getItem("gameHistory")) || [];
  history = history.filter((g) => g.time !== "00:00");
  if (!history.length) return null;

  history.sort((a, b) => {
    let [aMin, aSec] = a.time.split(":").map(Number);
    let [bMin, bSec] = b.time.split(":").map(Number);
    let aTotal = aMin * 60 + aSec;
    let bTotal = bMin * 60 + bSec;
    if (aTotal === bTotal) return a.moves - b.moves;
    return aTotal - bTotal;
  });
  return history[0];
}

document.addEventListener("DOMContentLoaded", () => {
  loadCardsFromXML();
  const best = getHighestScore();
  const el = document.getElementById("bestScore");
  if (best) {
    el.innerHTML = `<strong>Best Score:</strong> ${best.user} &nbsp;&nbsp; <strong>Time:</strong> ${best.time}`;
  } else {
    el.textContent = "No high scores yet!";
  }
});

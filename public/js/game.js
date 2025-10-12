/* GLOBAL VARIABLES */
const deck = document.getElementById("deck");
const stars = document.querySelector(".stars");
const elTimer = document.querySelector(".timer");
let moves = 0;
let interval = null;
let timeLimit = 60; // Countdown timer in seconds
let countdownTime = timeLimit;
let cards = [];
let openCards = [];
let matchedCards = [];

// Audio
const matchAudio = new Audio('../audio/match-audio.mp3');
const noMatchAudio = new Audio('../audio/no-match-audio.mp3');
const shuffleAudio = new Audio('../audio/flipcard.mp3');
const flipAudio = new Audio('../audio/flipcard.mp3');

// Display username and best score
document.addEventListener('DOMContentLoaded', () => {
  const userNameSpan = document.getElementById('userName');
  userNameSpan.textContent = localStorage.getItem('fileName') || 'Guest';

  displayBestScore();
});

// Load cards from XML
function loadCardsFromXML() {
  fetch("../xml/gifts.xml")
    .then(res => res.text())
    .then(str => new window.DOMParser().parseFromString(str, "text/xml"))
    .then(data => {
      const tempCards = [...data.getElementsByTagName("gift")].map(g => g.textContent);
      cards = [...tempCards, ...tempCards]; // Duplicate for matching
      shuffleCards();
    })
    .catch(err => console.error("Error loading XML:", err));
}

// Shuffle function
function shuffle(array) {
  let currentIndex = array.length, temporaryValue, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }
  return array;
}

// Display shuffled cards
function shuffleCards() {
  const shuffled = shuffle(cards);
  deck.innerHTML = "";
  shuffled.forEach(val => {
    deck.innerHTML += `
      <li class="card">
        <div class="card-inner">
          <div class="card-front"></div>
          <div class="card-back">
            <img src="${val}" class="card-image">
          </div>
        </div>
      </li>
    `;
  });

  const allCards = document.querySelectorAll(".card");
  allCards.forEach(c => c.classList.add("flip"));
  setTimeout(() => {
    allCards.forEach(c => c.classList.remove("flip"));
    shuffleAudio.play();
    startCountdown();
  }, 5000);
}

// Countdown
function startCountdown() {
  if (!interval) interval = setInterval(timer, 1000);
}
function timer() {
  countdownTime--;
  if (countdownTime <= 0) {
    clearInterval(interval);
    interval = null;
    gameOver();
  }
  const minutes = String(Math.floor(countdownTime / 60)).padStart(2, "0");
  const seconds = String(countdownTime % 60).padStart(2, "0");
  elTimer.textContent = `${minutes}:${seconds}`;
}

// Card click handling
deck.addEventListener("click", e => {
  const clickedCard = e.target.closest(".card");
  if (!clickedCard || clickedCard.classList.contains("open") || clickedCard.classList.contains("match") || openCards.length >= 2) return;

  openCards.push(clickedCard);
  clickedCard.classList.add("flip", "open");
  flipAudio.play();

  if (openCards.length === 2) {
    deck.style.pointerEvents = "none";
    const [card1, card2] = openCards;

    if (card1.querySelector("img").src === card2.querySelector("img").src) {
      matchedCards.push(card1, card2);
      card1.classList.add("match");
      card2.classList.add("match");
      matchAudio.play();
      openCards = [];
      if (matchedCards.length === cards.length) gameWin();
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

    moves++;
    document.querySelector(".moves").textContent = `Moves: ${moves}`;
    updateStars();
  }
});

// Stars
function updateStars() {
  let rating = 3;
  if (moves >= 25) rating = 1;
  else if (moves >= 15) rating = 2;

  for (let i = 0; i < stars.children.length; i++) {
    const star = stars.children[i].children[0];
    if (i < rating) star.classList.replace("far", "fa");
    else star.classList.replace("fa", "far");
  }
}

// Game win
function gameWin() {
  clearInterval(interval);
  interval = null;

  const timeTaken = timeLimit - countdownTime;
  const formattedTime = `${String(Math.floor(timeTaken/60)).padStart(2,"0")}:${String(timeTaken%60).padStart(2,"0")}`;
  const ratingStars = stars.children.length - stars.querySelectorAll(".far").length;

  const userName = localStorage.getItem('fileName') || 'Guest';
  const email = localStorage.getItem('email') || '';
  const phone = localStorage.getItem('phone') || '';

  const gameData = { user: userName, email, phone, moves, time: formattedTime, rating: ratingStars };

  if (window.electronAPI && window.electronAPI.saveGameToExcel) {
    window.electronAPI.saveGameToExcel(gameData); // ✅ Save all games including duplicates
  }

  setTimeout(() => window.location.href = "thanks.html", 500);
}

// Game over
function gameOver() {
  clearInterval(interval);
  interval = null;
  countdownTime = 0;
  elTimer.textContent = "00:00";
  setTimeout(() => window.location.href = "thanks.html", 500);
}

// Display best score from Excel
function displayBestScore() {
  if (window.electronAPI && window.electronAPI.getBestScore) {
    const best = window.electronAPI.getBestScore();
    if (best) {
      document.getElementById("bestScore").innerHTML = `
        <strong>Best Score:</strong> ${best.user} | Time: ${best.time} | Moves: ${best.moves}
      `;
    } else {
      document.getElementById("bestScore").textContent = "No high scores yet!";
    }
  } else {
    document.getElementById("bestScore").textContent = "No high scores yet!";
  }
}

// Reset game
function resetGame() {
  matchedCards = [];
  openCards = [];
  moves = 0;
  countdownTime = timeLimit;
  elTimer.textContent = `${Math.floor(countdownTime/60)}:00`;
  shuffleCards();
}

// Start game
window.onload = () => loadCardsFromXML();

/* GLOBAL VARIABLES */

const deck = document.getElementById("deck");
const stars = document.querySelector(".stars");
const elTimer = document.querySelector(".timer");
let card = document.getElementsByClassName("card");
const movesEl = [].slice.call(document.querySelectorAll(".moves"));
let moves = 0;
let interval = null;
let timeLimit = 60; // Countdown timer set to 60 seconds (1 minute)
let countdownTime = timeLimit;
const modal = document.getElementById("modal");
let numMoves = document.querySelector(".numMoves");
let gameTime = document.querySelector(".gameTime");
let finalRating = document.querySelector(".finalRating");

document.addEventListener('DOMContentLoaded', function () {
  const userName = localStorage.getItem('fileName');
  if (userName) {
      document.getElementById('userName').textContent = userName;
  } else {
      document.getElementById('userName').textContent = 'No name saved';
  }
});

// Array to store cards classes
const cards = [
  "images/gift1.jpg",
  "images/gift2.jpg",
  "images/gift3.jpg",
  "images/gift4.jpg",
  "images/gift5.jpg",
  "images/gift6.jpg",
  "images/gift7.jpg",
  "images/gift8.jpg",
  "images/gift1.jpg",
  "images/gift2.jpg",
  "images/gift3.jpg",
  "images/gift4.jpg",
  "images/gift5.jpg",
  "images/gift6.jpg",
  "images/gift7.jpg",
  "images/gift8.jpg",
];

// Shuffle the array of cards
function shuffle(array) {
  let currentIndex = array.length,
    temporaryValue,
    randomIndex;

  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

function shuffleCards() {
  let shuffledCards = shuffle(cards);
  
  // Reset the deck
  deck.innerHTML = "";

  shuffledCards.forEach(function (val) {
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

  // Show all cards with flip animation
  let allCards = document.querySelectorAll(".card");
  allCards.forEach(card => card.classList.add("flip"));

  // After 5 seconds, flip them back and then start the countdown
  setTimeout(function () {
    allCards.forEach(card => card.classList.remove("flip"));
    
    // Start the countdown timer AFTER the flip animation
    startCountdown();
  }, 5000);  // Wait for flip animation to finish before starting countdown
}

// Function to start countdown
function startCountdown() {
  if (!interval) { // Prevent multiple countdowns
    interval = setInterval(function () {
      timer();
    }, 1000);
  }
}

// Start game when page loads
window.onload = function () {
  shuffleCards();
};


/*** GAMEPLAY function ***/
deck.addEventListener("click", function deckClickHandler(e) {
  let clickedCard = e.target.closest(".card");

  if (!clickedCard || clickedCard.classList.contains("open") || clickedCard.classList.contains("match") || openCards.length >= 2) {
    return; // Prevent clicking if already 2 cards are flipped
  }

  openCards.push(clickedCard);
  clickedCard.classList.add("flip", "open");

  if (openCards.length === 2) {
    let card1 = openCards[0];
    let card2 = openCards[1];

    // Temporarily disable clicks while checking
    deck.style.pointerEvents = "none";

    if (card1.querySelector("img").src === card2.querySelector("img").src) {
      matchedCards.push(card1, card2);
      card1.classList.add("match");
      card2.classList.add("match");

      openCards = []; // Reset openCards array

      // Check for win before calling moveCount
      if (matchedCards.length === cards.length) {
        gameWin(); // Call gameWin() when all cards are matched
        return; // Skip the moveCount call after win condition
      }

      // Re-enable clicking immediately
      deck.style.pointerEvents = "auto";
    } else {
      setTimeout(function () {
        card1.classList.remove("flip", "open");
        card2.classList.remove("flip", "open");
        openCards = [];
        
        // Re-enable clicking after animation
        deck.style.pointerEvents = "auto";
      }, 800);
    }

    // Call moveCount function only when not in a winning state
    if (matchedCards.length < cards.length) {
      moveCount();
    }

    starRating();
  }
});

shuffleCards();

// Empty array to extract all HTML card elements individually, by class name
let openCards = [];

// Empty array to store matched cards
let matchedCards = [];

// Empty array to store open cards and check equality afterward
let displayCards = [];

function moveCount() {
  moves++;
  movesEl.map(function (val) {
    val.textContent = moves;
  });
}

function timer() {
  countdownTime--;

  if (countdownTime <= 0) {
    clearInterval(interval); // Stop the timer when it reaches 0
    interval = null;
    gameOver(); // Call game over function when time is up
  }

  let seconds = countdownTime % 60;
  let minutes = Math.floor(countdownTime / 60);

  // Add leading zero for single-digit minutes/seconds
  if (seconds.toString().length == 1) {
    seconds = "0" + seconds;
  }

  if (minutes.toString().length == 1) {
    minutes = "0" + minutes;
  }

  elTimer.innerHTML = `${minutes}:${seconds}`;
}

function starRating() {
  if (moves >= 25) {
    for (let i = stars.children.length; i >= 2; i--) {
      stars.children[i - 1].children[0].classList.replace("fa", "far");
      console.log("3 stars");
    }
  } else if (moves >= 15) {
    for (let i = stars.children.length; i >= 3; i--) {
      stars.children[i - 1].children[0].classList.replace("fa", "far");
      console.log("5 stars");
    }
  }
}

// For of loop to get each element of the array
// Per iteration and give it an Event Listener

function updateModal() {
  starRating();
  modal.classList.add("animation");
  modal.style.opacity = "100";
  modal.classList.add("show");

  numMoves.innerHTML = moves;
  gameTime.innerHTML = `${Math.floor(countdownTime / 60)}:${countdownTime % 60}`;
  finalRating.innerHTML = stars.innerHTML;
  finalRating.classList.add("stars");
}


function gameWin() {
  if (matchedCards.length === cards.length) {
    clearInterval(interval); // Stop the countdown timer
    interval = null;
    updateModal(); // Show the modal with final stats
  }
}

// Game Over function called when time reaches 0
function gameOver() {
  // Stop the timer
  clearInterval(interval);
  interval = null;

  // Update the modal with game over message
  const modalMessage = document.querySelector('.winHeader');
  modalMessage.innerHTML = "Game Over! <br />You ran out of time.";

  // Update the final rating and other game details
  const numMovesElement = document.querySelector(".numMoves");
  const gameTimeElement = document.querySelector(".gameTime");

  numMovesElement.innerHTML = moves;
  gameTimeElement.innerHTML = `${Math.floor(countdownTime / 60)}:${countdownTime % 60}`;

  // Show the modal
  modal.classList.add("animation");
  modal.style.opacity = "100";
  modal.classList.add("show"); // To ensure the modal is visible

  // Optionally, reset game state after a delay
  setTimeout(function() {
    resetGame();  // Reset the game after showing the modal for a while
  }, 5000); // You can adjust the time delay before reset if needed
}

// Reset the game when it's over
function resetGame() {
  // Reset all cards and variables here
  matchedCards = [];
  openCards = [];
  moves = 0;
  countdownTime = timeLimit; // Reset countdown timer to the initial time limit
  elTimer.innerHTML = `${Math.floor(countdownTime / 60)}:00`; // Reset timer display
  shuffleCards();
}
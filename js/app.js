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

// Call the shuffle function upon the array of cards and store the value
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

  // After 3 seconds, flip them back
  setTimeout(function () {
    allCards.forEach(card => card.classList.remove("flip"));
  }, 5000);
}



/*** GAMEPLAY function ***/
// If clicked target <=1 and contains class 'card', start timer and add class 'show', 'open'
// If open cards = 2 and match class, add class 'match'
// On click, trigger moveCount(), starRating() and gameWin()
// Set timeout to close non-matched cards
deck.addEventListener("click", function deckClickHandler(e) {
  let clickedCard = e.target.closest(".card"); // Ensure the card element is selected

  // Start the timer when the first card is clicked
  if (clickedCard && !interval) {
    interval = setInterval(function () {
      timer();
    }, 1000);
  }

  // If the clicked element is a card and it's not already open or matched
  if (
    clickedCard &&
    openCards.length < 2 &&
    !clickedCard.classList.contains("open") &&
    !clickedCard.classList.contains("match")
  ) {
    openCards.push(clickedCard);
    clickedCard.classList.add("flip", "open"); // Flip the card
  }

  // Once two cards are open, check for a match
  if (openCards.length === 2) {
    let card1 = openCards[0];
    let card2 = openCards[1];

    // Compare the src of the images inside both cards to check for a match
    if (card1.querySelector("img").src === card2.querySelector("img").src) {
      // If the cards match, add the match class
      matchedCards.push(card1, card2);
      matchedCards.forEach(function (currentVal) {
        currentVal.classList.add("match");
      });
    }

    // Call moveCount and other game logic functions
    moveCount();
    starRating();
    gameWin();

    // Flip the cards back if they do not match
    setTimeout(function () {
      openCards.forEach(function (currentVal) {
        if (!currentVal.classList.contains("match")) {
          currentVal.classList.remove("flip", "open");
        }
      });
      openCards = []; // Reset openCards array
    }, 800); // Delay before flipping back
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
  if (matchedCards.length == cards.length) {
    clearInterval(interval);
    interval = null;
    updateModal();
    console.log(modal); // Debug
  }
}

// Game Over function called when time reaches 0
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
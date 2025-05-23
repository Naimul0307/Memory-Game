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
let numMoves = document.querySelector(".numMoves");
let gameTime = document.querySelector(".gameTime");
let finalRating = document.querySelector(".finalRating");
const userName = localStorage.getItem('fileName');
const email = localStorage.getItem('email');
const phone = localStorage.getItem('phone');

let cards = []; // ✅ Declare `cards` as a global empty array
// Create audio objects for match and no match
let matchAudio = new Audio('../audio/match-audio.mp3');  // Replace with your match audio file
let noMatchAudio = new Audio('../audio/no-match-audio.mp3');  // Replace with your no match audio file
let shuffleAudio = new Audio('../audio/flipcard.mp3'); 
let flipAudio = new Audio('../audio/flipcard.mp3');


document.addEventListener('DOMContentLoaded', function () {
  const userName = localStorage.getItem('fileName');
  if (userName) {
      document.getElementById('userName').textContent = userName;
  } else {
      document.getElementById('userName').textContent = 'No name saved';
  }
});

// Array to store cards classes
function loadCardsFromXML() {
  fetch("../xml/gifts.xml")
    .then(response => response.text())
    .then(str => new window.DOMParser().parseFromString(str, "text/xml"))
    .then(data => {
      const cardElements = data.getElementsByTagName("gift");
      const tempCards = [];

      for (let i = 0; i < cardElements.length; i++) {
        let imageSrc = cardElements[i].textContent;  // Get the image path directly
        tempCards.push(imageSrc);
      }

      // Duplicate cards for matching game
      cards = [...tempCards, ...tempCards]; // ✅ Now `cards` is properly updated

      // Shuffle cards before displaying them
      shuffleCards();
    })
    .catch(error => console.error("Error loading XML file:", error));
}

// Shuffle the array of cards

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

function shuffleCards() {
  let shuffledCards = shuffle(cards);

  shuffleAudio.play(); // Play the audio

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
    shuffleAudio.play();
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
  loadCardsFromXML(); // Load and shuffle cards dynamically
};

/*** GAMEPLAY function ***/
deck.addEventListener("click", function deckClickHandler(e) {
  let clickedCard = e.target.closest(".card");

  if (!clickedCard || clickedCard.classList.contains("open") || clickedCard.classList.contains("match") || openCards.length >= 2) {
    return; // Prevent clicking if already 2 cards are flipped
  }

  openCards.push(clickedCard);
  clickedCard.classList.add("flip", "open");

  // Play the flip audio when the card is flipped
  flipAudio.play();

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

      // Play the match audio
      matchAudio.play();

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

        // Play the no match audio
        noMatchAudio.play();

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
  moves++;  // Increment the moves count
  document.querySelector(".moves").textContent = `Moves: ${moves}`;  
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
  let rating = "☆☆☆"; // Default rating

  if (moves >= 25) {
    for (let i = stars.children.length; i >= 2; i--) {
      stars.children[i - 1].children[0].classList.replace("fa", "far");
    }
    rating = "☆";
  } else if (moves >= 15) {
    for (let i = stars.children.length; i >= 3; i--) {
      stars.children[i - 1].children[0].classList.replace("fa", "far");
    }
    rating = "☆☆";
  }

  return rating;
}

// Function to handle game win scenario
function gameWin() {
  if (matchedCards.length === cards.length) {
    clearInterval(interval); // Stop the countdown timer
    interval = null;

    // Calculate time taken
    let timeTaken = timeLimit - countdownTime; // Total time spent
    let minutes = Math.floor(timeTaken / 60);
    let seconds = timeTaken % 60;

    // Format time taken
    let formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    // Get the actual rating
    const rating = starRating();

    // Save the game win data
    const userName = localStorage.getItem('fileName') || 'Guest';
    const email = localStorage.getItem('email') || '';
    const phone = localStorage.getItem('phone') || '';
    saveGameData(userName,email,phone, moves, formattedTime, rating);

    // Redirect to the thanks.html page after saving game data
    window.location.href = "thanks.html"; // This line redirects to thanks.html
  }
}

function gameOver() {
  // Stop the timer
  clearInterval(interval);
  interval = null;

  // Ensure the timer displays 00:00
  countdownTime = 0;
  elTimer.innerHTML = "00:00";

  // Get user data
  const userName = localStorage.getItem('fileName') || 'Guest';
  const email = localStorage.getItem('email') || '';
  const phone = localStorage.getItem('phone') || '';

  // Default values
  const defaultTime = "00:00";
  const defaultRating = "null";
  const movesValue = moves ? moves : 0; 

  // Retrieve existing game history or initialize an empty array
  let gameHistory = JSON.parse(localStorage.getItem("gameHistory")) || [];

  // Append new game-over data
  gameHistory.push({
    user: userName,
    email: email,
    phone: phone,
    moves: movesValue,
    time: defaultTime,
    rating: defaultRating,
    date: new Date().toLocaleString() // Save date & time of the game
  });

  // Save back to localStorage
  localStorage.setItem("gameHistory", JSON.stringify(gameHistory));

   // Redirect to the thanks.html page after saving game data
   window.location.href = "thanks.html"; // This line redirects to thanks.html
}

function saveGameData(user, email, phone, moves, displayedTime, ratingStars) {
  let gameHistory = JSON.parse(localStorage.getItem("gameHistory")) || [];

  gameHistory.push({
    user: user,
    email: email,
    phone: phone,
    moves: moves,
    time: displayedTime,
    rating: ratingStars,
    date: new Date().toLocaleString()
  });

  localStorage.setItem("gameHistory", JSON.stringify(gameHistory));
}

// Function to retrieve and display game history (optional)
function getGameHistory() {
  let gameHistory = JSON.parse(localStorage.getItem("gameHistory")) || [];
  console.log("Game History:", gameHistory);
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

function getHighestScore() {
  let gameHistory = JSON.parse(localStorage.getItem("gameHistory")) || [];

  // Filter out games with "00:00" time
  gameHistory = gameHistory.filter(game => game.time !== "00:00");

  if (gameHistory.length === 0) {
    console.log("No valid game history found.");
    return null;
  }

  // Sort by time first, then by moves if times are the same
  gameHistory.sort((a, b) => {
    let [aMin, aSec] = a.time.split(":").map(Number);
    let [bMin, bSec] = b.time.split(":").map(Number);
    let aTotalSeconds = aMin * 60 + aSec;
    let bTotalSeconds = bMin * 60 + bSec;
    
    // Sort by time in ascending order, then by moves if times are equal
    if (aTotalSeconds === bTotalSeconds) {
      return a.moves - b.moves; // Sort by moves in ascending order
    }
    return aTotalSeconds - bTotalSeconds; // Sort by time in ascending order
  });

  let bestGame = gameHistory[0]; // The first item is now the best score
  return bestGame;
}

document.addEventListener("DOMContentLoaded", function () {
  const bestGame = getHighestScore();

  if (bestGame) {
      document.getElementById("bestScore").innerHTML = `
          <strong>Best Score:</strong> ${bestGame.user} Time: ${bestGame.time}
      `;
  } else {
      document.getElementById("bestScore").textContent = "No high scores yet!";
  }
});

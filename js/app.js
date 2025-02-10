/* GLOBAL VARIABLES */

const deck = document.getElementById("deck");
const stars = document.querySelector(".stars");
const elTimer = document.querySelector(".timer");
let card = document.getElementsByClassName("card");
const movesEl = [].slice.call(document.querySelectorAll(".moves"));
let moves = 0;
let interval = null;
let time = 0;
const modal = document.getElementById("modal");
let numMoves = document.querySelector(".numMoves");
let gameTime = document.querySelector(".gameTime");
let finalRating = document.querySelector(".finalRating");


// array to store cards classes
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
  "images/gift8.jpg"
];



// shuffle the array of cards
function shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;

    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}


// call the shuffle function upon the array of cards and store the value
function shuffleCards() {
  let shuffledCards = shuffle(cards);

  // Reset the deck
  deck.innerHTML = '';

  shuffledCards.forEach(function (val) {
    deck.innerHTML += `
      <li class="card">
        <img src="${val}" class="card-image" style="display: none;">
      </li>
    `;
  });
}


/*** GAMEPLAY function ***/
//if clicked target <=1 and contains class 'card', start timer and add class 'show', 'open'
//if open cards = 2 and match class, add class 'match'
//on click, trigger moveCount(), starRating() and gameWin()
//set timeout to close non-matched cards
deck.addEventListener('click', function deckClickHandler(e) {

  // Start the timer when the first card is clicked
  if (e.target.classList.contains('card') && !interval) {
    interval = setInterval(function() { 
      timer();
    }, 1000);
  }

  // If the clicked element is a card and it's not already open or matched
  if (e.target.classList.contains('card') && (openCards.length <= 1) && !e.target.classList.contains('open') && !e.target.classList.contains('match')) {
    openCards.push(e.target);
  }

  // Flip the card by showing its image
  openCards.forEach(function(currentVal) {
    currentVal.classList.add('show'); // Make the card image visible
    currentVal.classList.add('open');
    currentVal.children[0].style.display = 'block'; // Ensure image is displayed
  });

  // Once two cards are open, check for a match
  if (openCards.length == 2) {
    // Compare the src of the images inside both cards to check for a match
    if (openCards[0].children[0].src === openCards[1].children[0].src) {
      // If the cards match, add the match class
      matchedCards.push(openCards[0]);
      matchedCards.push(openCards[1]);
      matchedCards.forEach(function(currentVal) {
        currentVal.classList.add('match');
        currentVal.children[0].style.display = 'block'; // Ensure the image remains visible for matched cards
      });
    }

    // Call moveCount and other game logic functions
    moveCount();
    starRating();
    gameWin();

    const oldCards = openCards;
    setTimeout(function() {
      oldCards.forEach(function(currentVal) {
        if (!currentVal.classList.contains('match')) {
          // If the card is not matched, hide its image
          currentVal.classList.remove('open');
          currentVal.classList.remove('show');
          currentVal.children[0].style.display = 'none'; // Hide image again if not matched
        }
      });
    }, 400);

    // Empty openCards array after the timeout
    openCards = [];
  }
});


shuffleCards();


// empty array to extract all HTML card elements individually, by class name
let openCards = [];


//empty array to store matched cards
let matchedCards = [];


// empty array to store open cards and check equality afterwards
let displayCards = [];



function moveCount() {
  moves++;
  movesEl.map(function(val){
    val.textContent = moves;
  });
}


function timer() {
  time++;
  seconds = time % 60;
  minutes = Math.floor(time / 60);

  if (seconds.toString().length == 1) {
    seconds = '0' + seconds;    
  } else {
    seconds = seconds;
  }

  if (minutes.toString().length == 1) {
    minutes = '0' + minutes;    
  } else {
    minutes = minutes;
  }

  elTimer.innerHTML = `${minutes}:${seconds}`;

}


function starRating() {
  if (moves >= 25) {
      for (let i = stars.children.length; i >= 2; i--) {
        stars.children[i-1].children[0].classList.replace('fa', 'far');
      console.log('3 stars');
      }
  } else if (moves >= 15) {
      for (let i = stars.children.length; i >= 3; i--) {
          stars.children[i-1].children[0].classList.replace('fa', 'far');
        console.log('5 stars');
        }
  }
}


function starReset() {
  for (let star of stars.children) {
   star.children[0].classList.replace('far', 'fa');
  }
}


//remove 'match' class and empty array of matchedCards
function restartGame () {
  shuffleCards();
  matchedCards.map(function(currentVal) {
    currentVal.classList.remove('match');
  });
  matchedCards = [];
  clearInterval(interval);
  interval = null;
  time = 0;
  moves = 0;
  starReset();
    movesEl.map(function(val){
      val.textContent = moves;
    });
  elTimer.innerHTML = "00:00";
  modal.classList.remove('animation');
  modal.style.opacity = "0";
  console.log(modal); //debug
}


// for of loop to get each element of the array
// per iteration and give it an Event Listener
// for each element that contains the class restart.

function updateModal() {
  starRating();
  modal.classList.add('animation');
  modal.style.opacity = "100";
  numMoves.innerHTML = moves;
  gameTime.innerHTML = `${minutes}:${seconds}`;
  finalRating.innerHTML = stars.innerHTML;
  finalRating.classList.add('stars');
  console.log(moves); //debug
}

  

function gameWin() {
  if (matchedCards.length == cards.length) {
    clearInterval(interval);
    interval = null;
    updateModal();
    console.log(modal); //debug
  }
}

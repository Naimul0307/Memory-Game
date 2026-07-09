        document.addEventListener("DOMContentLoaded", function () {
            let gameHistory = JSON.parse(localStorage.getItem("gameHistory")) || [];
            let gameData = gameHistory.length > 0 ? gameHistory[gameHistory.length - 1] : null;
        
            if (gameData) {
                console.log("Retrieved Game Data:", gameData);
        
                const gameTime = gameData.time || "00:00";
                console.log("Game Time:", gameTime);
        
                const timeInSeconds = gameTime.split(":").reduce((acc, time) => (60 * acc) + +time, 0);
        
                if (timeInSeconds <= 0) {
                    document.getElementById("modal-timeup").style.display = "flex";
                } else {
                    document.getElementById("modal-win").style.display = "flex";
                }
        
                setTimeout(() => {
                    window.location.href = "scoreboard.html";
                }, 5000);
            } else {
                console.log("No game data found in localStorage.");
            }
        });
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('fileForm').addEventListener('submit', function(e) {
        e.preventDefault();

        // Name input exists
        const nameInput = document.getElementById('fileName');
        const nameValue = nameInput ? nameInput.value.trim() || "Guest" : "Guest";

        // Email input may not exist
        const emailInput = document.getElementById('email');
        const emailValue = emailInput ? emailInput.value.trim() || "example@example.com" : "example@example.com";

        // Phone input may not exist
        const phoneInput = document.getElementById('phone');
        const phoneValue = phoneInput ? phoneInput.value.trim() || "000-000-0000" : "000-000-0000";

        // Save to localStorage
        localStorage.setItem('fileName', nameValue);
        localStorage.setItem('email', emailValue);
        localStorage.setItem('phone', phoneValue);

        // Go to game page
        window.location.href = 'game.html';
    });
});

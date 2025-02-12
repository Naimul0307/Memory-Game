document.getElementById("fileName").addEventListener("submit", function (event) {
    event.preventDefault(); // Prevent form from submitting the default way
  
    // Retrieve form data
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const phone = document.getElementById("phone").value;
  
    // Save data in local storage
    const userData = { name, email, phone };
    localStorage.setItem("userData", JSON.stringify(userData));
  
    // Redirect to index.html
    window.location.href = "game.html";
  });
  
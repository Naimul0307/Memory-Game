    document.getElementById('fileForm').addEventListener('submit', function(e){
      e.preventDefault();
      localStorage.setItem('fileName', document.getElementById('fileName').value);
      localStorage.setItem('email', document.getElementById('email').value);
      localStorage.setItem('phone', document.getElementById('phone').value);

      window.location.href = 'game.html';
    });
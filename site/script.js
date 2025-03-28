document.addEventListener("DOMContentLoaded", function () {
  const menuToggle = document.querySelector(".menu-toggle");
  const menu = document.querySelector(".menu");

  // Toggle menu on button click
  menuToggle.addEventListener("click", function (event) {
    menu.classList.toggle("active");
    event.stopPropagation(); // Prevents the event from bubbling to the document
  });

  // Close menu when clicking outside of it
  document.addEventListener("click", function (event) {
    if (!menu.contains(event.target) && !menuToggle.contains(event.target)) {
      menu.classList.remove("active");
    }
  });
});

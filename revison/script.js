document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;

  if (page === "form") {
    setupFormSubmission();
  }

  if (page === "review") {
    loadReviews();
  }
});

// ---------- FORM PAGE LOGIC ----------
function setupFormSubmission() {
  const scriptURL =
    "https://script.google.com/macros/s/AKfycbxJZUhKCnkQI9MBehUf9U5DM5jJiaSB_245EEOzizPdc0xDLDYcfr6rFDAV2w7DnvkI/exec";
  const form = document.forms["submit-to-google-sheet"];
  const submitBtn = form.querySelector('button[type="submit"]');
  const resetBtn = form.querySelector('button[type="reset"]'); // Reset button

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    // Disable the submit button and show loading text
    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Submitting...";

    const formData = new FormData(form);

    fetch(scriptURL, { method: "POST", body: formData })
      .then((response) => {
        swal("Done", "Submitted Successfully.", "success").then(() => {
          // Reset form fields
          resetBtn.click(); // Triggers form reset

          // Restore the submit button
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;

          // Ask user if they want to see reviews
          swal({
            title: "Wanna see what others wrote?",
            text: "You can check out reviews and opinions!",
            icon: "info",
            buttons: ["Nope", "Yes!"],
          }).then((willGo) => {
            if (willGo) {
              window.location.href = "review.html";
            }
          });
        });
      })
      .catch((error) => {
        swal("Error", "Something went wrong. Please try again!", "error");
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      });
  });
}

// ---------- REVIEW PAGE LOGIC ----------
function loadReviews() {
  // Toggle between dark and light mode
  const toggleBtn = document.getElementById("toggleModeBtn");
  const body = document.body;

  function updateToggleButtonText() {
    if (body.classList.contains("light-mode")) {
      toggleBtn.textContent = "Switch to Dark Mode";
    } else {
      toggleBtn.textContent = "Switch to Light Mode";
    }
  }

  toggleBtn.addEventListener("click", () => {
    body.classList.toggle("light-mode");
    updateToggleButtonText();
  });

  updateToggleButtonText();

  // List of abusive words (expand as needed)
  let abusiveWords = [];

  fetch("abusiveWords.json")
    .then((response) => response.json())
    .then((data) => {
      abusiveWords = data.words;
      console.log("Loaded abusive words:", abusiveWords);
      // Now you can use `abusiveWords` in your filtering logic
    })
    .catch((error) => {
      console.error("Failed to load abusive words:", error);
    });

  // Escape HTML utility (same as your existing)
  function escapeHTML(str) {
    return String(str).replace(
      /[&<>"']/g,
      (m) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        }[m])
    );
  }

  // Replace abusive words with blurred clickable spans
  function censorAbusiveWords(text) {
    // Sort words by length desc to avoid partial replacement issues
    abusiveWords.sort((a, b) => b.length - a.length);

    abusiveWords.forEach((word) => {
      // Create regex with word boundaries and case-insensitive
      const pattern = new RegExp(`\\b${word.replace(/\*/g, "\\*")}\\b`, "gi");

      text = text.replace(pattern, (matched) => {
        return `<span class="blurred-word" tabindex="0" role="button" aria-label="Abusive word blurred. Click to confirm age.">${matched}</span>`;
      });
    });

    return text;
  }

  // Function to create star rating (your existing)
  function createStarRating(starCount = 4) {
    return "★".repeat(starCount) + "☆".repeat(5 - starCount);
  }

  // Function to get initials (your existing)
  function getInitials(name) {
    if (!name) return "U";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  async function fetchReviews() {
    const container = document.getElementById("reviews");
    container.classList.add("loading");
    container.innerHTML = `
                <div class="loader" role="status" aria-label="Loading">
                  <div></div><div></div><div></div>
                </div>
              `;

    try {
      const res = await fetch(
        "https://script.google.com/macros/s/AKfycbw2XDytgN0lkgSTdBIZlPTY_rn-jX2WExMJI5DPyjw3avYF9O8yRtAwRHIKMex8xPaE/exec"
      );
      const { data } = await res.json();

      container.classList.remove("loading");
      container.innerHTML = ""; // Clear loader

      const emptyContainer = document.getElementById("no-reviews");

      if (!data || data.length === 0) {
        if (emptyContainer) {
          emptyContainer.innerHTML = `
          <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
            <path d="M32 4C17.664 4 6 14.745 6 28c0 6.21 3.414 11.86 8.925 15.75L12 56l12.376-7.038A25.196 25.196 0 0 0 32 52c14.336 0 26-10.745 26-24S46.336 4 32 4zM22 26a4 4 0 1 1 8 0 4 4 0 0 1-8 0zm10 0a4 4 0 1 1 8 0 4 4 0 0 1-8 0z"/>
          </svg>
          <div>No reviews yet.</div>
         `;
          emptyContainer.style.display = "flex";
        }
        container.style.display = "none";
        return;
      }

      if (emptyContainer) emptyContainer.remove();
      container.style.display = "grid";

      data.reverse().forEach((item) => {
        if (!item.name || !item.message) return;

        const card = document.createElement("div");
        card.className = "card";

        const stars = createStarRating(item.rating || 4);
        const date = item.timestamp ? new Date(item.timestamp) : new Date();
        const vuHeight = Math.min(Math.max(parseInt(item.chutiya), 0), 100);
        const formattedDate = date.toLocaleString();

        // Escape message, then replace abusive words with blurred spans
        let safeMessage = escapeHTML(item.message);
        safeMessage = censorAbusiveWords(safeMessage);

        card.innerHTML = `
            <div class="message">${safeMessage}</div>
            <div class="stars">${stars}</div>
            <div class="profile">
                <div class="avatar">${getInitials(escapeHTML(item.name))}</div>
                <div class="info">
                <div class="name">${escapeHTML(item.name)}</div>
                <div class="email">${escapeHTML(item.email || "")}</div>
                </div>
                <div class="vu-meter" aria-label="L Gen C level: ${vuHeight}">
                <div class="vu-fill" style="height: ${vuHeight}%;"></div>
                </div>
            </div>
            <div class="timestamp">${formattedDate}</div>
            `;

        container.appendChild(card);
      });

      // 🔥 Force cleanup on every refresh
      sessionStorage.removeItem("isAdultConfirmed");
      localStorage.removeItem("isAdultConfirmed");

      // Always blur words initially
      document.querySelectorAll(".blurred-word").forEach((span) => {
        span.style.filter = "blur(5px)";
        span.style.borderBottom = "1px dotted red";
        span.style.cursor = "pointer";
        span.setAttribute("tabindex", "0");
        span.setAttribute("role", "button");
        span.setAttribute("aria-label", "Censored content, click to reveal");
      });

      // Ask once per session
      document.querySelectorAll(".blurred-word").forEach((span) => {
        span.addEventListener("click", () => {
          swal({
            title: "Are you 18 or older?",
            text: "This content may be sensitive.",
            icon: "warning",
            buttons: ["No", "Yes"],
            dangerMode: true,
          }).then((isAdult) => {
            if (isAdult) {
              sessionStorage.setItem("isAdultConfirmed", "yes");
              revealAllCensored();
            }
          });
        });
      });

      // Reveal function
      function revealAllCensored() {
        document.querySelectorAll(".blurred-word").forEach((span) => {
          span.style.filter = "none";
          span.style.borderBottom = "none";
          span.style.cursor = "default";
          span.removeAttribute("tabindex");
          span.removeAttribute("role");
          span.removeAttribute("aria-label");
        });
      }
    } catch (err) {
      container.classList.remove("loading");
      container.innerText = "Failed to load reviews.";
      console.error(err);
    }
  }

  // Initial call to load reviews
  fetchReviews();
}

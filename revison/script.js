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
  const toggleBtn = document.getElementById("darkModeToggle");

  function applyDarkMode(isDark) {
    if (isDark) {
      document.body.classList.add("dark-mode");
      toggleBtn.textContent = "☀️"; // Sun icon
    } else {
      document.body.classList.remove("dark-mode");
      toggleBtn.textContent = "🌙"; // Moon icon
    }
  }

  // On page load, read localStorage and apply
  const darkModeStored = localStorage.getItem("darkMode");
  const isDarkMode = darkModeStored === "true";
  applyDarkMode(isDarkMode);

  // On button click, toggle mode and save preference
  toggleBtn.addEventListener("click", () => {
    const darkModeActive = document.body.classList.toggle("dark-mode");
    localStorage.setItem("darkMode", darkModeActive);
    applyDarkMode(darkModeActive);
  });

  const scriptURL =
    "https://script.google.com/macros/s/AKfycbzCpWSGGbWDis_dDF6xGkcmXsiiAAlFvGUynFcUINEGa6_4Y1zIw091GZenkzkuRu_7/exec";
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
    abusiveWords.sort((a, b) => b.length - a.length);

    // Normalize: just lowercase & trim, keep unicode letters intact
    const normalize = (str) => str.toLowerCase().trim();

    const words = text.split(/\s+/);

    let censoredText = text;

    const matches = [];

    abusiveWords.forEach((abuse) => {
      const abuseNorm = normalize(abuse);
      if (!abuseNorm) return;

      const abuseWords = abuseNorm.split(/\s+/);
      const abuseLen = abuseWords.length;

      // Sliding window of abuseLen words over input text words
      for (let i = 0; i <= words.length - abuseLen; i++) {
        const windowWords = words.slice(i, i + abuseLen);
        const windowPhrase = windowWords.join(" ");
        const windowNorm = normalize(windowPhrase);

        const dist = levenshtein(windowNorm, abuseNorm);
        const maxLen = Math.max(windowNorm.length, abuseNorm.length);
        const similarity = 1 - dist / maxLen;

        if (similarity >= 0.85) {
          // Use Unicode-aware regex for word boundaries
          // \p{L} matches any kind of letter from any language
          // So we use a lookbehind/lookahead for non-letter or start/end of string
          const escapedWindow = windowPhrase.replace(
            /[-\/\\^$*+?.()|[\]{}]/g,
            "\\$&"
          );

          // Construct pattern: ensure match is not part of longer word by checking letters around
          const pattern = new RegExp(
            `(?<!\\p{L})${escapedWindow}(?!\\p{L})`,
            "giu"
          );

          matches.push({ phrase: windowPhrase, regex: pattern, similarity });
        }
      }
    });

    matches.forEach(({ phrase, regex }) => {
      censoredText = censoredText.replace(
        regex,
        (matched) =>
          `<span class="blurred-word" tabindex="0" role="button" aria-label="Abusive word blurred. Click to confirm age.">${matched}</span>`
      );
    });

    return censoredText;

    function levenshtein(a, b) {
      const matrix = [];
      for (let i = 0; i <= b.length; i++) matrix[i] = [i];
      for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

      for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
          if (b[i - 1] === a[j - 1]) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
          }
        }
      }
      return matrix[b.length][a.length];
    }
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
        "https://script.google.com/macros/s/AKfycbzCpWSGGbWDis_dDF6xGkcmXsiiAAlFvGUynFcUINEGa6_4Y1zIw091GZenkzkuRu_7/exec"
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
        // Determine gender class
        const genderText = (item.gender || "").trim().toLowerCase();
        const isRGBGender = ["lesbian", "gay", "bi"].includes(genderText);
        const genderClass = isRGBGender ? "gender rgb" : "gender";
        const countryMap = {
          AFG: "Afghanistan",
          ALB: "Albania",
          DZA: "Algeria",
          AND: "Andorra",
          AGO: "Angola",
          ARG: "Argentina",
          ARM: "Armenia",
          AUS: "Australia",
          AUT: "Austria",
          AZE: "Azerbaijan",
          BGD: "Bangladesh",
          BLR: "Belarus",
          BEL: "Belgium",
          BRA: "Brazil",
          CAN: "Canada",
          CHN: "China",
          COL: "Colombia",
          EGY: "Egypt",
          FRA: "France",
          DEU: "Germany",
          GRC: "Greece",
          HKG: "Hong Kong",
          IND: "India",
          IDN: "Indonesia",
          IRN: "Iran",
          IRQ: "Iraq",
          IRL: "Ireland",
          ISR: "Israel",
          ITA: "Italy",
          JPN: "Japan",
          KEN: "Kenya",
          MEX: "Mexico",
          NLD: "Netherlands",
          NZL: "New Zealand",
          NGA: "Nigeria",
          NOR: "Norway",
          PAK: "Pakistan",
          POL: "Poland",
          PRT: "Portugal",
          RUS: "Russia",
          SAU: "Saudi Arabia",
          SGP: "Singapore",
          ZAF: "South Africa",
          KOR: "South Korea",
          ESP: "Spain",
          SWE: "Sweden",
          CHE: "Switzerland",
          THA: "Thailand",
          TUR: "Turkey",
          UKR: "Ukraine",
          GBR: "United Kingdom",
          USA: "United States",
          VNM: "Vietnam",
        };

        function copyComputedStylesDeep(sourceElem, targetElem) {
          if (!sourceElem || !targetElem) return;

          const computedStyle = window.getComputedStyle(sourceElem);
          for (let key of computedStyle) {
            try {
              targetElem.style.setProperty(
                key,
                computedStyle.getPropertyValue(key),
                computedStyle.getPropertyPriority(key)
              );
            } catch (e) {}
          }

          const sourceChildren = sourceElem.children;
          const targetChildren = targetElem.children;

          for (let i = 0; i < sourceChildren.length; i++) {
            copyComputedStylesDeep(sourceChildren[i], targetChildren[i]);
          }
        }

        document.querySelectorAll(".card").forEach((card) => {
          card.style.cursor = "pointer";

          card.addEventListener("click", (event) => {
            const isBigScreen = window.innerWidth >= 768;
            const isMouseDevice = window.matchMedia("(pointer: fine)").matches;

            // 🛑 Skip if device is mobile or touch-based
            if (!isBigScreen || !isMouseDevice) return;

            // 🛑 Skip if click was directly on .blurred-word or inside it
            if (event.target.closest(".blurred-word")) return;

            // 🛑 Skip if overlay already exists
            if (document.querySelector(".modal-overlay")) return;

            // ✅ Proceed with zoom
            const overlay = document.createElement("div");
            overlay.classList.add("modal-overlay");

            const zoomContainer = document.createElement("div");
            zoomContainer.classList.add("modal-zoomed-card");

            const clonedCard = card.cloneNode(true);
            zoomContainer.appendChild(clonedCard);

            copyComputedStylesDeep(card, clonedCard);

            const closeBtn = document.createElement("button");
            closeBtn.classList.add("modal-close-btn");
            closeBtn.setAttribute("aria-label", "Close zoomed card");
            closeBtn.innerHTML = "&times;";
            zoomContainer.appendChild(closeBtn);

            overlay.appendChild(zoomContainer);
            document.body.appendChild(overlay);
            document.body.style.overflow = "hidden";

            function closeModal() {
              overlay.remove();
              document.body.style.overflow = "";
            }

            overlay.addEventListener("click", (e) => {
              if (e.target === overlay) closeModal();
            });

            closeBtn.addEventListener("click", closeModal);
            window.addEventListener("keydown", (e) => {
              if (e.key === "Escape") closeModal();
            });
          });
        });

        const fullCountry = countryMap[item.country] || item.country;
        const countryCode = item.country || "UNK"; // fallback to UNK = Unknown
        card.innerHTML = `
            <div class="message">${safeMessage}</div>
            <div class="stars">${stars}</div>
            <div class="profile">
                <div class="avatar">${getInitials(escapeHTML(item.name))}</div>
                <div class="info">
                <div class="name">${escapeHTML(item.name)}</div>
                
                <div class="email">${escapeHTML(item.email || "")}</div>
                <div class="country flag-${countryCode}">${escapeHTML(
          fullCountry
        )}</div>

                <div class="${genderClass}">${escapeHTML(
          item.gender || ""
        )}</div>

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
          // Check if already confirmed
          if (sessionStorage.getItem("isAdultConfirmed") === "yes") {
            // Already confirmed, reveal immediately (if not already)
            revealAllCensored();
            return; // Skip popup
          }

          // Else ask popup
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

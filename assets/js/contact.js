/* ============================================================
   contact.js: enquiry form validation and submission (Web3Forms)
   ============================================================ */

(function () {
  "use strict";

  const form = document.getElementById("contactForm");
  if (!form) return;

  const result = document.getElementById("formResult");
  const submitButton = form.querySelector("button[type='submit']");
  const eventFields = document.getElementById("eventFields");
  const typeSelect = document.getElementById("topic");

  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

  const TOPICS = {
    wedding: "Dance: wedding lesson or first dance",
    event: "Dance: ballroom or social dance event",
    school: "Dance: school, college or club workshop",
    private: "Dance: private or group lessons",
    maths: "Tutoring: Mathematics",
    physics: "Tutoring: Physics",
    gis: "GIS or research collaboration",
    trek: "Trekking or mountain enquiry"
  };

  const DISPOSABLE_DOMAINS = [
    "mailinator.com", "guerrillamail.com", "guerrillamail.net", "10minutemail.com",
    "tempmail.com", "temp-mail.org", "yopmail.com", "trashmail.com", "sharklasers.com",
    "getnada.com", "dispostable.com", "throwawaymail.com", "maildrop.cc", "fakeinbox.com"
  ];

  const COMMON_TYPOS = {
    "gmial.com": "gmail.com", "gmal.com": "gmail.com", "gamil.com": "gmail.com",
    "gmail.con": "gmail.com", "gmail.co": "gmail.com", "hotmial.com": "hotmail.com",
    "hotmail.con": "hotmail.com", "yaho.com": "yahoo.com", "yahooo.com": "yahoo.com",
    "outlok.com": "outlook.com", "outlook.con": "outlook.com"
  };

  /* ---------- Preselect topic from ?topic= ---------- */
  const requested = new URLSearchParams(window.location.search).get("topic");
  if (requested && TOPICS[requested]) typeSelect.value = TOPICS[requested];

  /* ---------- Show event details for dance enquiries ---------- */
  function toggleEventFields() {
    eventFields.hidden = typeSelect.value.indexOf("Dance:") !== 0;
  }
  typeSelect.addEventListener("change", toggleEventFields);
  toggleEventFields();

  /* ---------- Field helpers ---------- */
  function setError(id, message) {
    const field = document.getElementById(id).closest(".field");
    const error = field.querySelector(".field-error");
    field.classList.toggle("has-error", Boolean(message));
    if (error) error.textContent = message || "";
    return !message;
  }

  function validateEmail() {
    const value = document.getElementById("email").value.trim().toLowerCase();

    if (!EMAIL_PATTERN.test(value)) {
      return setError("email", "Please enter a valid email address, such as name@example.com.");
    }

    const domain = value.split("@")[1];

    if (COMMON_TYPOS[domain]) {
      return setError("email", "Did you mean " + value.split("@")[0] + "@" + COMMON_TYPOS[domain] + "?");
    }

    if (DISPOSABLE_DOMAINS.indexOf(domain) !== -1) {
      return setError("email", "Please use a permanent email address so I can reply to you.");
    }

    return setError("email", "");
  }

  function validateAll() {
    const name = document.getElementById("name").value.trim();
    const message = document.getElementById("message").value.trim();

    return [
      setError("name", name.length < 2 ? "Please tell me your name." : ""),
      validateEmail(),
      setError("topic", typeSelect.value ? "" : "Please choose what your enquiry is about."),
      setError("message", message.length < 15 ? "Please write at least a couple of sentences." : "")
    ].every(Boolean);
  }

  ["name", "email", "message"].forEach(function (id) {
    document.getElementById(id).addEventListener("blur", validateAll);
  });

  function say(text, state) {
    result.textContent = text;
    result.className = "form-result" + (state ? " is-" + state : "");
  }

  /* ---------- Submit ---------- */
  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    say("", "");

    if (!validateAll()) {
      say("Please correct the highlighted fields.", "error");
      const first = form.querySelector(".has-error input, .has-error select, .has-error textarea");
      if (first) first.focus();
      return;
    }

    const last = Number(localStorage.getItem("lastEnquiry") || 0);
    if (Date.now() - last < 30000) {
      say("Your last message was sent moments ago. Please wait a little before sending another.", "error");
      return;
    }

    const captcha = form.querySelector("textarea[name='h-captcha-response']");
    if (captcha && !captcha.value) {
      say("Please tick the verification box before sending.", "error");
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Sending…";
    say("Sending your message…", "");

    try {
      const payload = Object.fromEntries(new FormData(form));
      payload.subject = "Website enquiry: " + payload.topic;

      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.success !== false) {
        localStorage.setItem("lastEnquiry", String(Date.now()));
        form.reset();
        toggleEventFields();
        if (window.hcaptcha) window.hcaptcha.reset();
        say("Thank you. Your message has been sent, and I'll reply as soon as I can.", "ok");
      } else {
        say(data.message || "Your message could not be sent. Please try again.", "error");
      }
    } catch (error) {
      console.error(error);
      say("Something went wrong while sending. Please check your connection and try again.", "error");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Send message";
    }
  });
})();

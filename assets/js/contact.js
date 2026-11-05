/* ============================================================
   contact.js: enquiry form (Web3Forms)
   - The main topic decides which follow-up question appears:
       Tutoring -> Subject (Mathematics, Physics, GIS)
       Dance    -> Type of event or function, plus event details
   - Hidden follow-ups are disabled, so they are never sent.
   ============================================================ */

(function () {
  "use strict";

  const form = document.getElementById("contactForm");
  if (!form) return;

  const $ = function (id) { return document.getElementById(id); };

  const result = $("formResult");
  const submitButton = form.querySelector("button[type='submit']");
  const topicSelect = $("topic");
  const tutoringField = $("tutoringField");
  const tutoringSelect = $("tutoringSubject");
  const danceField = $("danceTypeField");
  const danceSelect = $("danceType");
  const eventFields = $("eventFields");

  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

  /* Main topics (must match the option text in contact.html) */
  const TOPIC = {
    research: "Research and GIS collaboration",
    tutoring: "Tutoring",
    dance: "Dance (Balboa) lessons",
    trek: "Trekking and mountain guidance"
  };

  /* Links elsewhere on the site use ?topic=... to pre-fill the form */
  const PREFILL = {
    wedding: { topic: TOPIC.dance, dance: "Wedding (lesson or first dance)" },
    event: { topic: TOPIC.dance, dance: "Ballroom or social dance event" },
    school: { topic: TOPIC.dance, dance: "School, college or club workshop" },
    private: { topic: TOPIC.dance, dance: "Private or group lessons" },
    maths: { topic: TOPIC.tutoring, tutoring: "Mathematics" },
    physics: { topic: TOPIC.tutoring, tutoring: "Physics" },
    gis: { topic: TOPIC.research },
    trek: { topic: TOPIC.trek }
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

  /* ---------- Follow-up questions ---------- */
  function setGroup(wrapper, select, visible) {
    wrapper.hidden = !visible;
    select.disabled = !visible;
    if (!visible) select.value = "";
  }

  function syncFollowUps() {
    const topic = topicSelect.value;
    const isDance = topic === TOPIC.dance;

    setGroup(tutoringField, tutoringSelect, topic === TOPIC.tutoring);
    setGroup(danceField, danceSelect, isDance);

    eventFields.hidden = !isDance;
    eventFields.disabled = !isDance;

    if (topic !== TOPIC.tutoring) setError("tutoringSubject", "");
    if (!isDance) setError("danceType", "");
  }

  /* ---------- Field helpers ---------- */
  function setError(id, message) {
    const field = $(id).closest(".field");
    const error = field.querySelector(".field-error");
    field.classList.toggle("has-error", Boolean(message));
    if (error) error.textContent = message || "";
    return !message;
  }

  function validateEmail() {
    const value = $("email").value.trim().toLowerCase();

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
    const name = $("name").value.trim();
    const message = $("message").value.trim();
    const topic = topicSelect.value;

    return [
      setError("name", name.length < 2 ? "Please tell me your name." : ""),
      validateEmail(),
      setError("topic", topic ? "" : "Please choose what your enquiry is about."),
      setError("tutoringSubject", topic === TOPIC.tutoring && !tutoringSelect.value ? "Please choose a subject." : ""),
      setError("danceType", topic === TOPIC.dance && !danceSelect.value ? "Please choose the type of event or function." : ""),
      setError("message", message.length < 15 ? "Please write at least a couple of sentences." : "")
    ].every(Boolean);
  }

  function say(text, state) {
    result.textContent = text;
    result.className = "form-result" + (state ? " is-" + state : "");
  }

  /* ---------- Start-up: pre-fill from ?topic= ---------- */
  const requested = PREFILL[new URLSearchParams(window.location.search).get("topic")];

  if (requested) {
    topicSelect.value = requested.topic;
    syncFollowUps();
    if (requested.dance) danceSelect.value = requested.dance;
    if (requested.tutoring) tutoringSelect.value = requested.tutoring;
  } else {
    syncFollowUps();
  }

  topicSelect.addEventListener("change", syncFollowUps);

  ["name", "email", "message"].forEach(function (id) {
    $(id).addEventListener("blur", validateAll);
  });

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
      const detail = payload.tutoring_subject || payload.dance_type || "";

      payload.subject = "Website enquiry: " + payload.topic + (detail ? " - " + detail : "");

      Object.keys(payload).forEach(function (key) {
        if (payload[key] === "") delete payload[key];
      });

      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.success !== false) {
        localStorage.setItem("lastEnquiry", String(Date.now()));
        form.reset();
        syncFollowUps();
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

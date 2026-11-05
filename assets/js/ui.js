/* ============================================================
   ui.js: interface behaviour (navigation, scroll effects, reveals)
   ============================================================ */

(function () {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let revealObserver = null;

  /* ---------- Scroll-reveal ---------- */
  function observeReveals(scope) {
    const items = (scope || document).querySelectorAll(".reveal:not(.is-visible)");

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      items.forEach(function (item) { item.classList.add("is-visible"); });
      return;
    }

    if (!revealObserver) {
      revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });
    }

    items.forEach(function (item) { revealObserver.observe(item); });
  }

  /* ---------- Mobile navigation ---------- */
  function closeNav() {
    const nav = document.getElementById("primary-nav");
    const toggle = document.querySelector(".menu-toggle");
    if (!nav || !toggle) return;
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.textContent = "Menu";
  }

  document.addEventListener("click", function (event) {
    const toggle = event.target.closest(".menu-toggle");

    if (toggle) {
      const nav = document.getElementById("primary-nav");
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.textContent = open ? "Close" : "Menu";
      return;
    }

    if (event.target.closest("#primary-nav a")) closeNav();

    if (event.target.closest(".to-top")) {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeNav();
  });

  /* ---------- Header border and back-to-top button ---------- */
  function onScroll() {
    const header = document.querySelector(".site-header");
    const toTop = document.querySelector(".to-top");
    const y = window.scrollY;

    if (header) header.classList.toggle("is-scrolled", y > 8);
    if (toTop) toTop.classList.toggle("is-shown", y > 700);
  }

  document.addEventListener("DOMContentLoaded", function () {
    const button = document.createElement("button");
    button.className = "to-top";
    button.type = "button";
    button.setAttribute("aria-label", "Back to top");
    button.innerHTML = "&uarr;";
    document.body.appendChild(button);

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    observeReveals();
  });

  window.UI = { observe: observeReveals, onScroll: onScroll };
})();

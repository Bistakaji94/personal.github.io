/* ============================================================
   content.js: loads the editable content files and builds the pages.
   Every piece of text, every image and every link comes from
   /content/*.json, which the website editor (/admin/) changes.

   Visibility: content/visibility.json hides whole pages or sections,
   and any list item with "hidden": true is skipped.
   ============================================================ */

(function () {
  "use strict";

  /* ---------- Configuration ---------- */
  const PLACEHOLDER =
    "https://commons.wikimedia.org/wiki/Special:FilePath/Himalayas,_Ama_Dablam,_Nepal.jpg?width=1200";

  const CONTENT_FILES = [
    "site", "home", "about", "research", "posts",
    "videos", "gallery", "tutoring", "dance", "visibility"
  ];

  /* Pages that can be hidden from the editor. Home and Contact always show. */
  const NAV_ITEMS = [
    { key: "about", href: "about.html", label: "About" },
    { key: "research", href: "research.html", label: "Research" },
    { key: "tutoring", href: "tutoring.html", label: "Tutoring" },
    { key: "dance", href: "dance.html", label: "Dance" },
    { key: "blog", href: "blog.html", label: "Field Notes" },
    { key: "vlogs", href: "vlogs.html", label: "Vlogs" },
    { key: "gallery", href: "gallery.html", label: "Gallery" }
  ];

  const CATEGORY_LABELS = {
    gis: "GIS and remote sensing",
    hydrology: "Hydrology",
    hazards: "Mountain hazards",
    trekking: "Trekking",
    research: "Research",
    landscape: "Landscape",
    dance: "Dance",
    teaching: "Teaching"
  };

  let siteData = null;

  /* ---------- Small helpers ---------- */
  const $ = function (selector, scope) { return (scope || document).querySelector(selector); };
  const $$ = function (selector, scope) { return Array.from((scope || document).querySelectorAll(selector)); };

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function safeUrl(value) {
    if (!value) return "";
    const v = String(value).trim();
    if (/^(https?:|mailto:|tel:)/i.test(v)) return v;
    if (/^[\w\-./%~() ,]+$/.test(v) && !/^javascript:/i.test(v)) return v;
    return "";
  }

  /* Images saved by the editor look like "/images/photo.jpg".
     Removing the leading slash makes them work on a project site
     (user.github.io/repo/) and on a normal site alike. */
  function image(value) {
    let url = safeUrl(value);
    if (url.charAt(0) === "/" && url.charAt(1) !== "/") url = url.slice(1);
    return url || PLACEHOLDER;
  }

  function get(object, path) {
    return String(path).split(".").reduce(function (node, key) {
      return node && node[key] !== undefined ? node[key] : undefined;
    }, object);
  }

  function paragraphs(text) {
    return String(text || "")
      .split(/\n{2,}/)
      .map(function (p) { return p.trim(); })
      .filter(Boolean)
      .map(function (p) { return "<p>" + esc(p).replace(/\n/g, "<br>") + "</p>"; })
      .join("");
  }

  function formatDate(value) {
    const date = new Date(value);
    if (isNaN(date)) return value || "";
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  }

  function categoryLabel(key) {
    return CATEGORY_LABELS[key] || (key ? key.charAt(0).toUpperCase() + key.slice(1) : "");
  }

  function arrow() { return '<span class="arrow" aria-hidden="true">&rarr;</span>'; }

  function mount(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
    return el;
  }

  /* Fill a list. If it ends up empty, either show a message (pages)
     or hide the whole section it belongs to (home page strips). */
  function mountList(id, items, renderItem, emptyText) {
    const html = items.map(renderItem).join("");
    const el = mount(id, html || (emptyText ? '<p class="empty">' + esc(emptyText) + "</p>" : ""));

    if (!html && !emptyText && el && el.closest) {
      const section = el.closest("[data-section]");
      if (section) section.hidden = true;
    }
    return html;
  }

  function hideSectionOf(id) {
    const el = document.getElementById(id);
    const section = el && el.closest ? el.closest("[data-section]") : null;
    if (section) section.hidden = true;
  }

  /* ---------- Visibility ---------- */
  function isHiddenItem(item) { return Boolean(item) && item.hidden === true; }
  function shown(list) { return (Array.isArray(list) ? list : []).filter(function (i) { return !isHiddenItem(i); }); }

  function hiddenPageKeys(visibility) {
    const pages = (visibility && visibility.pages) || {};
    return NAV_ITEMS.filter(function (i) { return pages[i.key] === false; }).map(function (i) { return i.key; });
  }

  function applyItemVisibility(d) {
    function fix(object, key) { if (object && Array.isArray(object[key])) object[key] = shown(object[key]); }

    fix(d.home, "currently"); fix(d.home, "pillars");
    fix(d.about, "principles"); fix(d.about, "timeline");
    fix(d.tutoring, "subjects"); fix(d.tutoring, "approach"); fix(d.tutoring, "formats");
    fix(d.dance, "audiences"); fix(d.dance, "formats"); fix(d.dance, "process"); fix(d.dance, "faq");

    d.research = shown(d.research);
    d.posts = shown(d.posts);
    d.videos = shown(d.videos);
    d.gallery = shown(d.gallery).map(function (album) {
      return Object.assign({}, album, { images: shown(album.images) });
    });
  }

  function applySectionVisibility(visibility, hiddenKeys) {
    const sections = (visibility && visibility.sections) || {};

    $$("[data-section]").forEach(function (section) {
      const required = section.dataset.pageLink;
      if (sections[section.dataset.section] === false || (required && hiddenKeys.indexOf(required) !== -1)) {
        section.hidden = true;
      }
    });
  }

  function hideLinksToHiddenPages(hiddenKeys) {
    if (!hiddenKeys.length) return;

    const hiddenFiles = NAV_ITEMS
      .filter(function (i) { return hiddenKeys.indexOf(i.key) !== -1; })
      .map(function (i) { return i.href; });

    $$("main a[href]").forEach(function (link) {
      const target = (link.getAttribute("href") || "").split("?")[0].split("#")[0];
      if (hiddenFiles.indexOf(target) === -1) return;

      const row = link.closest(".pillar");
      (row || link).hidden = true;
    });
  }

  function showUnavailable(kind, visibility) {
    const main = document.getElementById("main");
    if (!main) return;

    const maintenance = (visibility && visibility.maintenance) || {};
    const isMaintenance = kind === "maintenance";
    const title = isMaintenance ? (maintenance.title || "Coming soon") : "This page isn't available yet";
    const message = isMaintenance
      ? (maintenance.message || "I'm putting the finishing touches on this website. Please check back soon.")
      : "I'm still working on this page. Please check back soon.";

    main.innerHTML =
      '<section class="page-head"><div class="wrap">' +
        '<p class="label">' + (isMaintenance ? "Coming soon" : "Not available yet") + "</p>" +
        "<h1>" + esc(title) + "</h1>" +
        '<p class="lede">' + esc(message) + "</p>" +
        '<div class="actions">' +
          (isMaintenance ? "" : '<a class="btn btn-solid" href="index.html">Back to the home page</a>') +
          '<a class="btn ' + (isMaintenance ? "btn-solid" : "btn-ghost") + '" href="contact.html">Get in touch</a>' +
        "</div>" +
      "</div></section>";

    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex";
    if (document.head) document.head.appendChild(robots);
    document.title = title;
  }

  /* ---------- Shared header and footer ---------- */
  function buildHeader(page, hiddenKeys, maintenance) {
    const links = maintenance ? "" : NAV_ITEMS
      .filter(function (item) { return hiddenKeys.indexOf(item.key) === -1; })
      .map(function (item) {
        const current = item.key === page ? ' aria-current="page"' : "";
        return '<li><a href="' + item.href + '"' + current + ">" + item.label + "</a></li>";
      }).join("");

    const contactCurrent = page === "contact" ? ' aria-current="page"' : "";

    return '' +
      '<a class="skip-link" href="#main">Skip to content</a>' +
      '<header class="site-header">' +
        '<div class="wrap header-inner">' +
          '<a class="wordmark" href="index.html" aria-label="Home">' +
            '<span class="wordmark-name" data-text="site.name">Ratna Bahadur Bista</span>' +
            '<span class="wordmark-coords" data-text="site.coordinates">27.66° N · 85.32° E</span>' +
          "</a>" +
          (maintenance ? "" : '<button class="menu-toggle" type="button" aria-expanded="false" aria-controls="primary-nav">Menu</button>') +
          '<nav class="primary-nav" id="primary-nav" aria-label="Primary">' +
            (links ? "<ul>" + links + "</ul>" : "") +
            '<a class="nav-cta" href="contact.html"' + contactCurrent + ">Get in touch</a>" +
          "</nav>" +
        "</div>" +
      "</header>";
  }

  function buildFooter(hiddenKeys, maintenance) {
    const pages = maintenance ? "" : NAV_ITEMS
      .filter(function (item) { return hiddenKeys.indexOf(item.key) === -1; })
      .map(function (item) { return '<li><a href="' + item.href + '">' + item.label + "</a></li>"; })
      .join("");

    return '' +
      '<footer class="site-footer">' +
        '<div class="wrap">' +
          '<div class="footer-grid">' +
            "<div>" +
              '<h2 data-text="site.name">Ratna Bahadur Bista</h2>' +
              '<p data-text="site.tagline">I map mountains, teach mathematics, and dance Balboa.</p>' +
              '<p class="caption" data-nickname hidden>Also known online as <span data-text="site.nickname">BistaKaji</span>.</p>' +
            "</div>" +
            "<div>" +
              '<p class="label">Pages</p>' +
              "<ul>" + pages + '<li><a href="contact.html">Contact</a></li></ul>' +
            "</div>" +
            "<div>" +
              '<p class="label">Elsewhere</p>' +
              "<ul>" +
                '<li><a data-href="site.github" hidden rel="noopener" target="_blank">GitHub</a></li>' +
                '<li><a data-href="site.linkedin" hidden rel="noopener" target="_blank">LinkedIn</a></li>' +
                '<li><a data-href="site.youtube" hidden rel="noopener" target="_blank">YouTube</a></li>' +
                '<li><a data-href="site.instagram" hidden rel="noopener" target="_blank">Instagram</a></li>' +
                '<li><a data-href="site.researchgate" hidden rel="noopener" target="_blank">ResearchGate</a></li>' +
              "</ul>" +
            "</div>" +
            "<div>" +
              '<p class="label">Contact</p>' +
              "<ul>" +
                '<li><a data-mailto="site.email" href="#">email</a></li>' +
                '<li><a data-tel="site.phone" href="#" hidden>phone</a></li>' +
                '<li data-text="site.location">Patan, Nepal</li>' +
              "</ul>" +
            "</div>" +
          "</div>" +
          '<div class="footer-note">' +
            '<p data-text="site.footerNote"></p>' +
            '<p>&copy; <span id="year"></span> <span data-text="site.name">Ratna Bahadur Bista</span>.</p>' +
          "</div>" +
        "</div>" +
      "</footer>";
  }

  function mountChrome(page, hiddenKeys, maintenance) {
    const header = document.getElementById("site-header");
    const footer = document.getElementById("site-footer");
    if (header) header.innerHTML = buildHeader(page, hiddenKeys, maintenance);
    if (footer) footer.innerHTML = buildFooter(hiddenKeys, maintenance);
    if (window.UI) window.UI.onScroll();
  }

  /* ---------- Data binding (text, images, links) ---------- */
  function bind(data) {
    $$("[data-text]").forEach(function (el) {
      const value = get(data, el.dataset.text);
      if (value !== undefined && value !== "") el.textContent = value;
    });

    $$("[data-paras]").forEach(function (el) {
      const value = get(data, el.dataset.paras);
      if (Array.isArray(value)) el.innerHTML = value.map(paragraphs).join("");
      else if (value) el.innerHTML = paragraphs(value);
    });

    $$("[data-img]").forEach(function (el) {
      el.src = image(get(data, el.dataset.img));
      if (el.dataset.alt) el.alt = get(data, el.dataset.alt) || "";
    });

    $$("[data-href]").forEach(function (el) {
      const url = safeUrl(get(data, el.dataset.href));
      el.hidden = !url;
      if (url) el.href = url;
      const item = el.closest("li");
      if (item) item.hidden = !url;
    });

    $$("[data-mailto]").forEach(function (el) {
      const email = get(data, el.dataset.mailto);
      if (email) { el.href = "mailto:" + email; el.textContent = email; }
    });

    $$("[data-tel]").forEach(function (el) {
      const phone = get(data, el.dataset.tel);
      el.hidden = !phone;
      const item = el.closest("li");
      if (item) item.hidden = !phone;
      if (phone) { el.href = "tel:" + phone.replace(/[^\d+]/g, ""); el.textContent = phone; }
    });

    const year = document.getElementById("year");
    if (year) year.textContent = new Date().getFullYear();
  }

  /* ---------- Home page ---------- */
  function renderHome(data) {
    const home = data.home || {};

    mountList("currently", home.currently || [], function (item) {
      return '<li class="reveal"><p class="label">' + esc(item.label) + "</p><p>" + esc(item.text) + "</p></li>";
    });

    mountList("pillars", home.pillars || [], function (item) {
      return '<li class="pillar reveal">' +
        '<span class="pillar-number">' + esc(item.number) + "</span>" +
        "<h3>" + esc(item.title) + "</h3>" +
        "<p>" + esc(item.text) + "</p>" +
        '<a class="text-link" href="' + esc(safeUrl(item.link) || "#") + '">' + esc(item.linkLabel || "Read more") + " " + arrow() + "</a>" +
      "</li>";
    });

    mountList("home-research", data.research.slice(0, 2), function (item, index) {
      return researchEntry(item, index, true);
    });

    mountList("home-posts", sortedPosts(data.posts).slice(0, 3), function (post) {
      const excerpt = String(post.body || "").split(/\n{2,}/)[0];
      return '<article class="mini reveal">' +
        '<img src="' + esc(image(post.image)) + '" alt="' + esc(post.imageCaption || post.title) + '" loading="lazy" decoding="async">' +
        '<p class="label">' + esc(categoryLabel(post.category)) + "</p>" +
        "<h3>" + esc(post.title) + "</h3>" +
        "<p>" + esc(excerpt.length > 150 ? excerpt.slice(0, 147) + "…" : excerpt) + "</p>" +
        '<a class="text-link" href="blog.html">Read the note ' + arrow() + "</a>" +
      "</article>";
    });
  }

  /* ---------- About, tutoring and dance ---------- */
  function renderAbout(data) {
    const about = data.about || {};

    mountList("principles", about.principles || [], function (item) {
      return '<div class="principle reveal"><h3>' + esc(item.title) + "</h3><p>" + esc(item.text) + "</p></div>";
    });

    mount("timeline", (about.timeline || []).map(function (item) {
      return '<li class="reveal"><p class="label">' + esc(item.when) + "</p><h3>" + esc(item.title) + "</h3><p>" + esc(item.text) + "</p></li>";
    }).join(""));

    mount("languages", (about.languages || []).map(function (item) { return "<li>" + esc(item) + "</li>"; }).join(""));

    if (!(about.timeline || []).length && !(about.languages || []).length) hideSectionOf("timeline");
  }

  function renderTutoring(data) {
    const t = data.tutoring || {};

    mountList("tutor-subjects", t.subjects || [], function (item) {
      return '<li class="reveal"><h3>' + esc(item.title) + '</h3><p class="label">' + esc(item.levels) + "</p><p>" + esc(item.text) + "</p></li>";
    });

    mountList("tutor-approach", t.approach || [], function (item) {
      return '<li class="reveal"><h3>' + esc(item.title) + "</h3><p>" + esc(item.text) + "</p></li>";
    });

    mountList("tutor-formats", t.formats || [], function (item) {
      return '<li class="reveal"><h3>' + esc(item.title) + "</h3><p>" + esc(item.text) + "</p></li>";
    });
  }

  function renderDance(data) {
    const d = data.dance || {};

    mountList("dance-audiences", d.audiences || [], function (item) {
      const topic = item.topic ? "?topic=" + encodeURIComponent(item.topic) : "";
      return '<li class="reveal"><h3>' + esc(item.title) + "</h3><p>" + esc(item.text) + "</p>" +
        '<a class="text-link" href="contact.html' + topic + '">Enquire ' + arrow() + "</a></li>";
    });

    mount("dance-formats", (d.formats || []).map(function (item) {
      return '<li class="reveal"><h3>' + esc(item.title) + "</h3><p>" + esc(item.text) + "</p></li>";
    }).join(""));

    mount("dance-included", (d.included || []).map(function (item) { return "<li>" + esc(item) + "</li>"; }).join(""));

    if (!(d.formats || []).length && !(d.included || []).length) hideSectionOf("dance-formats");

    mountList("dance-process", d.process || [], function (item) {
      return '<li class="reveal"><h3>' + esc(item.title) + "</h3><p>" + esc(item.text) + "</p></li>";
    });

    mountList("dance-faq", d.faq || [], function (item) {
      return "<details><summary>" + esc(item.question) + "</summary><p>" + esc(item.answer) + "</p></details>";
    });
  }

  /* ---------- Filters ---------- */
  function buildFilters(containerId, items, listSelector) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const categories = Array.from(new Set(items.map(function (i) { return i.category; }).filter(Boolean)));

    if (categories.length < 2) { container.hidden = true; return; }

    container.innerHTML = '<button class="chip is-active" type="button" data-filter="all" aria-pressed="true">All</button>' +
      categories.map(function (c) {
        return '<button class="chip" type="button" data-filter="' + esc(c) + '" aria-pressed="false">' + esc(categoryLabel(c)) + "</button>";
      }).join("");

    container.addEventListener("click", function (event) {
      const chip = event.target.closest(".chip");
      if (!chip) return;

      $$(".chip", container).forEach(function (c) {
        const active = c === chip;
        c.classList.toggle("is-active", active);
        c.setAttribute("aria-pressed", String(active));
      });

      $$(listSelector + " [data-category]").forEach(function (item) {
        item.hidden = chip.dataset.filter !== "all" && item.dataset.category !== chip.dataset.filter;
      });
    });
  }

  /* ---------- Research ---------- */
  function researchEntry(item, index, linkOnly) {
    const action = linkOnly
      ? '<a class="text-link" href="research.html">Read the details ' + arrow() + "</a>"
      : '<button class="text-button" type="button" data-research="' + index + '">Read the details ' + arrow() + "</button>";

    return '<article class="entry reveal" data-category="' + esc(item.category) + '">' +
      '<figure class="entry-media">' +
        '<img src="' + esc(image(item.image)) + '" alt="' + esc(item.imageCaption || item.title) + '" loading="lazy" decoding="async">' +
        (item.imageCaption ? '<figcaption class="caption">' + esc(item.imageCaption) + "</figcaption>" : "") +
      "</figure>" +
      '<div class="entry-body">' +
        '<p class="label">' + esc(categoryLabel(item.category)) + "</p>" +
        "<h3>" + esc(item.title) + "</h3>" +
        "<p>" + esc(item.summary) + "</p>" +
        action +
      "</div>" +
    "</article>";
  }

  let researchItems = [];

  function renderResearch(data) {
    researchItems = data.research;
    mountList("research-list", researchItems, function (item, index) {
      return researchEntry(item, index, false);
    }, "Research projects will appear here soon.");
    buildFilters("research-filters", researchItems, "#research-list");
  }

  function openResearch(index) {
    const item = researchItems[index];
    const dialog = document.getElementById("research-dialog");
    if (!item || !dialog) return;

    mount("research-dialog-body",
      '<img src="' + esc(image(item.image)) + '" alt="' + esc(item.imageCaption || item.title) + '">' +
      (item.imageCaption ? '<p class="caption">' + esc(item.imageCaption) + "</p>" : "") +
      '<p class="label" style="margin-top:1.4rem">' + esc(categoryLabel(item.category)) + "</p>" +
      "<h2>" + esc(item.title) + "</h2>" +
      "<p>" + esc(item.summary) + "</p>" +
      "<dl><dt>Methods</dt><dd>" + esc(item.methods) + "</dd><dt>Outcome</dt><dd>" + esc(item.outcome) + "</dd></dl>"
    );

    document.body.classList.add("dialog-open");
    dialog.showModal();
  }

  /* ---------- Field notes ---------- */
  function sortedPosts(posts) {
    return posts.slice().sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
  }

  function renderPosts(data) {
    const posts = sortedPosts(data.posts);

    mountList("post-list", posts, function (post) {
      return '<article class="note reveal" data-category="' + esc(post.category) + '">' +
        '<div class="note-meta"><p class="label">' + esc(categoryLabel(post.category)) + "</p><time>" + esc(formatDate(post.date)) + "</time></div>" +
        '<div class="note-main"><h3>' + esc(post.title) + "</h3>" + paragraphs(post.body) +
          (post.image
            ? '<figure><img src="' + esc(image(post.image)) + '" alt="' + esc(post.imageCaption || post.title) + '" loading="lazy" decoding="async">' +
              (post.imageCaption ? '<figcaption class="caption">' + esc(post.imageCaption) + "</figcaption>" : "") + "</figure>"
            : "") +
        "</div></article>";
    }, "Field notes will appear here soon.");

    buildFilters("post-filters", posts, "#post-list");
  }

  /* ---------- Videos (play inside the page) ---------- */
  function parseVideo(url) {
    if (!url) return null;

    const yt = String(url).match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/);
    if (yt) {
      return {
        provider: "youtube",
        embed: "https://www.youtube-nocookie.com/embed/" + yt[1] + "?autoplay=1&rel=0",
        thumb: "https://i.ytimg.com/vi/" + yt[1] + "/hqdefault.jpg",
        watch: "https://www.youtube.com/watch?v=" + yt[1]
      };
    }

    const vimeo = String(url).match(/vimeo\.com\/(\d+)/);
    if (vimeo) {
      return {
        provider: "vimeo",
        embed: "https://player.vimeo.com/video/" + vimeo[1] + "?autoplay=1",
        thumb: "",
        watch: "https://vimeo.com/" + vimeo[1]
      };
    }

    return null;
  }

  const PLAY_ICON = '<span class="play-icon"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg></span>';

  function renderVideos(data) {
    mountList("video-list", data.videos, function (video, index) {
      const info = parseVideo(video.url);
      const thumb = safeUrl(video.image) ? image(video.image) : ((info && info.thumb) || PLACEHOLDER);

      const frame = info
        ? '<button type="button" data-video="' + index + '" aria-label="Play video: ' + esc(video.title) + '">' +
            '<img src="' + esc(thumb) + '" alt="' + esc(video.imageCaption || video.title) + '" loading="lazy" decoding="async">' + PLAY_ICON +
          "</button>"
        : '<img src="' + esc(thumb) + '" alt="' + esc(video.imageCaption || video.title) + '" loading="lazy" decoding="async">' +
          '<span class="soon-badge">Video coming soon</span>';

      return '<article class="reveal">' +
        '<div class="video-frame">' + frame + "</div>" +
        '<div class="video-body"><h3>' + esc(video.title) + "</h3><p>" + esc(video.description) + "</p>" +
          (info ? '<a class="text-link" href="' + esc(info.watch) + '" target="_blank" rel="noopener">Open on ' + (info.provider === "vimeo" ? "Vimeo" : "YouTube") + " " + arrow() + "</a>" : "") +
        "</div></article>";
    }, "Videos will appear here soon.");
  }

  function playVideo(button) {
    const video = siteData && siteData.videos[Number(button.dataset.video)];
    const info = video && parseVideo(video.url);
    if (!info) return;

    const iframe = document.createElement("iframe");
    iframe.src = info.embed;
    iframe.title = video.title;
    iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = "strict-origin-when-cross-origin";

    const frame = button.parentElement;
    frame.innerHTML = "";
    frame.appendChild(iframe);
  }

  /* ---------- Gallery and photo viewer ---------- */
  let albums = [];
  let viewer = { album: 0, index: 0 };

  function albumSequence(album) {
    const sequence = [];
    const photos = (album.images || []).filter(function (p) { return p && p.image; });

    if (safeUrl(album.cover) && !photos.some(function (p) { return p.image === album.cover; })) {
      sequence.push({ src: image(album.cover), caption: album.coverCaption || album.title });
    }

    photos.forEach(function (p) { sequence.push({ src: image(p.image), caption: p.caption || album.title }); });
    return sequence;
  }

  function renderGallery(data) {
    albums = data.gallery.map(function (album) { return { data: album, sequence: albumSequence(album) }; });

    mountList("gallery-list", albums, function (entry, albumIndex) {
      const album = entry.data;
      const photos = (album.images || []).filter(function (p) { return p && p.image; });
      const coverIsExtra = safeUrl(album.cover) && !photos.some(function (p) { return p.image === album.cover; });
      const offset = coverIsExtra ? 1 : 0;

      const cover = safeUrl(album.cover)
        ? '<figure class="album-cover"><button type="button" data-album="' + albumIndex + '" data-photo="0" aria-label="Open photo viewer">' +
            '<img src="' + esc(image(album.cover)) + '" alt="' + esc(album.coverCaption || album.title) + '" loading="lazy" decoding="async"></button>' +
            (album.coverCaption ? '<figcaption class="caption">' + esc(album.coverCaption) + "</figcaption>" : "") + "</figure>"
        : "";

      const grid = photos.map(function (photo, i) {
        return '<figure class="photo"><button type="button" data-album="' + albumIndex + '" data-photo="' + (i + offset) + '" aria-label="View larger: ' + esc(photo.caption || "photo") + '">' +
          '<img src="' + esc(image(photo.image)) + '" alt="' + esc(photo.caption || album.title) + '" loading="lazy" decoding="async"></button>' +
          (photo.caption ? '<figcaption class="caption">' + esc(photo.caption) + "</figcaption>" : "") + "</figure>";
      }).join("");

      return '<section class="album reveal">' +
        '<div class="album-head"><div><p class="label">' + entry.sequence.length + (entry.sequence.length === 1 ? " photo" : " photos") + "</p>" +
        "<h2>" + esc(album.title) + "</h2>" + (album.description ? "<p>" + esc(album.description) + "</p>" : "") + "</div></div>" +
        cover + '<div class="photo-grid">' + grid + "</div></section>";
    }, "Photo albums will appear here soon.");
  }

  function updateViewer() {
    const sequence = albums[viewer.album].sequence;
    const photo = sequence[viewer.index];
    const img = document.getElementById("lb-img");

    img.src = photo.src;
    img.alt = photo.caption || "";
    document.getElementById("lb-caption").textContent = photo.caption || "";
    document.getElementById("lb-count").textContent = (viewer.index + 1) + " / " + sequence.length;

    const single = sequence.length < 2;
    $$("[data-lb='prev'], [data-lb='next']").forEach(function (b) { b.hidden = single; });

    [1, -1].forEach(function (step) {
      const neighbour = sequence[(viewer.index + step + sequence.length) % sequence.length];
      if (neighbour) { const preload = new Image(); preload.src = neighbour.src; }
    });
  }

  function stepViewer(step) {
    const length = albums[viewer.album].sequence.length;
    viewer.index = (viewer.index + step + length) % length;
    updateViewer();
  }

  function openViewer(albumIndex, photoIndex) {
    const dialog = document.getElementById("lightbox");
    if (!dialog || !albums[albumIndex] || !albums[albumIndex].sequence.length) return;
    viewer = { album: albumIndex, index: photoIndex };
    updateViewer();
    document.body.classList.add("dialog-open");
    dialog.showModal();
  }

  function setupViewer() {
    const dialog = document.getElementById("lightbox");
    if (!dialog) return;

    dialog.addEventListener("click", function (event) {
      const control = event.target.closest("[data-lb]");
      if (control) {
        const action = control.dataset.lb;
        if (action === "close") dialog.close();
        if (action === "next") stepViewer(1);
        if (action === "prev") stepViewer(-1);
        return;
      }
      if (event.target === dialog) dialog.close();
    });

    dialog.addEventListener("keydown", function (event) {
      if (event.key === "ArrowRight") { event.preventDefault(); stepViewer(1); }
      if (event.key === "ArrowLeft") { event.preventDefault(); stepViewer(-1); }
    });

    let startX = null;
    dialog.addEventListener("pointerdown", function (event) { startX = event.clientX; });
    dialog.addEventListener("pointerup", function (event) {
      if (startX === null) return;
      const distance = event.clientX - startX;
      startX = null;
      if (Math.abs(distance) > 60) stepViewer(distance < 0 ? 1 : -1);
    });
  }

  /* ---------- Page router ---------- */
  function render(page, data) {
    if (page === "home") renderHome(data);
    if (page === "about") renderAbout(data);
    if (page === "research") renderResearch(data);
    if (page === "blog") renderPosts(data);
    if (page === "vlogs") renderVideos(data);
    if (page === "gallery") { renderGallery(data); setupViewer(); }
    if (page === "tutoring") renderTutoring(data);
    if (page === "dance") renderDance(data);
  }

  /* ---------- Loading ---------- */
  async function loadContent() {
    const entries = await Promise.all(CONTENT_FILES.map(async function (name) {
      try {
        const response = await fetch("content/" + name + ".json", { cache: "no-cache" });
        if (!response.ok) throw new Error(response.status);
        return [name, await response.json()];
      } catch (error) {
        console.warn("Could not load content/" + name + ".json", error);
        return [name, {}];
      }
    }));

    const raw = Object.fromEntries(entries);

    const data = {
      site: raw.site,
      home: raw.home,
      about: raw.about,
      tutoring: raw.tutoring,
      dance: raw.dance,
      visibility: raw.visibility,
      research: raw.research.items || [],
      posts: raw.posts.items || [],
      videos: raw.videos.items || [],
      gallery: raw.gallery.items || []
    };

    applyItemVisibility(data);
    return data;
  }

  function start() {
    const page = document.body.dataset.page;

    /* Show the header and footer straight away; refine once content loads. */
    mountChrome(page, [], false);

    document.addEventListener("click", function (event) {
      const research = event.target.closest("[data-research]");
      if (research) openResearch(Number(research.dataset.research));

      const photo = event.target.closest("[data-album][data-photo]");
      if (photo) openViewer(Number(photo.dataset.album), Number(photo.dataset.photo));

      const video = event.target.closest("[data-video]");
      if (video) playVideo(video);

      if (event.target.tagName === "DIALOG" && event.target.classList.contains("dialog")) event.target.close();
      const closer = event.target.closest("[data-close-dialog]");
      if (closer) closer.closest("dialog").close();
    });

    $$("dialog").forEach(function (dialog) {
      dialog.addEventListener("close", function () { document.body.classList.remove("dialog-open"); });
    });

    loadContent().then(function (data) {
      siteData = data;

      const visibility = data.visibility || {};
      const hiddenKeys = hiddenPageKeys(visibility);
      const maintenance = Boolean(visibility.maintenance && visibility.maintenance.enabled === true) && page !== "contact";
      const blocked = maintenance || hiddenKeys.indexOf(page) !== -1;

      mountChrome(page, hiddenKeys, maintenance);
      bind(data);

      if (blocked) {
        showUnavailable(maintenance ? "maintenance" : "page", visibility);
        document.dispatchEvent(new CustomEvent("content:ready", { detail: data }));
        return;
      }

      render(page, data);
      applySectionVisibility(visibility, hiddenKeys);
      hideLinksToHiddenPages(hiddenKeys);
      bind(data);

      if (window.UI) window.UI.observe();
      document.dispatchEvent(new CustomEvent("content:ready", { detail: data }));
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();

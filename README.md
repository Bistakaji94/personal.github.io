# Ratna Bahadur Bista: personal website (final package)

A fast, static website for GitHub Pages with a built-in visual editor.
No build step, no frameworks.

## What is inside

    index.html, about.html, research.html, tutoring.html, dance.html,
    blog.html, vlogs.html, gallery.html, contact.html, 404.html
    assets/css/fonts.css          THE ONE FILE for fonts (see below)
    assets/css/style.css          all other styling
    assets/js/content.js          builds pages from the content files
    assets/js/ui.js               menu, scroll effects, animations
    assets/js/contact.js          enquiry form validation and sending
    assets/img/                   contour artwork and favicon
    content/*.json                ALL editable text, images, links, visibility
    admin/                        the website editor (Sveltia CMS)
    images/                       photographs you upload through the editor

## Changing the font (one file)

Open assets/css/fonts.css. It contains four ready-made presets. Exactly
one is active (currently DM Serif Display + DM Sans). To switch, put
comment marks around the active preset and remove the comment marks from
the one you want. Commit. Every page updates. No other file needs editing.
Any other Google Font can be added the same way.

## Hiding things until they are ready

In the editor (/admin/), the first section, "0. Show or hide pages and
sections", has switches for:

- every page except Home and Contact (the menu link disappears too)
- every major section on the Home, About, Tutoring and Dance pages
- a whole-site "coming soon" mode (everything except Contact)

Every list item (a research project, a note, a video, an album, a single
photo, a FAQ answer, a timeline entry and so on) also has a
"Hide this on the website" switch. Nothing is deleted.

Important: hiding is cosmetic. Hidden content is still stored in the
site's public files. Do not use it for anything confidential. For private
drafts, use Save without Publish: drafts stay on a separate branch.

## Uploading to GitHub (no GitHub Desktop)

1. Extract the zip.
2. In the repository choose Add file > Upload files.
3. Upload in batches, committing after each:
   a) all .html files and README.md
   b) the "assets" folder
   c) the "content" folder
   d) the "admin" folder
   e) the "images" folder
4. Settings > Pages > Deploy from a branch > main > / (root).

## Editor settings to check

admin/config.yml is set for the test repository Bistakaji94/personal.github.io.
When you move to a repository named exactly Bistakaji94.github.io, change
the two lines described at the top of that file (repo and site_url).

Signing in: use a fine-grained GitHub token for the repository with
Contents (read and write) and Pull requests (read and write).

"Save" stores a draft and does not change the live site. "Publish" updates
it. To publish every save immediately, delete the publish_mode line in
admin/config.yml.

## Contact form

The Web3Forms key is already in contact.html. In the Web3Forms dashboard,
enable hCaptcha for the form.

## Previewing on your own computer

Pages load their content with fetch(), so double-clicking index.html shows
an empty site. Preview with a tiny local server:

    cd website-final
    python -m http.server 8000

then visit http://localhost:8000.

## Before going live

Replace the placeholder email in "1. Personal information", upload your
own photographs, and review the dance FAQ and "what to expect" text so it
matches what you actually offer. When you have a final domain, add
robots.txt and sitemap.xml for that address.

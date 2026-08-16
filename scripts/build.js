#!/usr/bin/env node
/*
 * Builds the whole website from the files in /content.
 * Netlify runs this on every change; you can run it yourself with `npm run build`.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CONTENT = path.join(ROOT, 'content');
const OUT = path.join(ROOT, 'site');

/* ─────────────────────────────────────────────────────────── helpers */

const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

/* Anything the editor saved in a shape the pages cannot use is collected here
   and printed at the end of the build, so a problem is never silent. */
const warnings = new Set();
const warn = (msg) => warnings.add(msg);

/* Two entries with the same position used to be ordered by whatever order the
   file system happened to hand back, which differs between computers. Falling
   back to the file name makes every build produce the same page. */
const readDir = (dir) =>
  fs.existsSync(path.join(CONTENT, dir))
    ? fs.readdirSync(path.join(CONTENT, dir))
        .filter((f) => f.endsWith('.json'))
        .map((f) => ({ slug: f.replace(/\.json$/, ''), ...read(path.join(CONTENT, dir, f)) }))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.slug.localeCompare(b.slug))
    : [];

const e = (s) =>
  String(s ?? '')
    // an & that already starts an entity (&amp; &nbsp; &#39;) is left alone,
    // so text saved with entities in it is not escaped a second time
    .replace(/&(?!(?:[a-zA-Z][a-zA-Z0-9]{1,9}|#\d{1,6}|#x[0-9a-fA-F]{1,6});)/g, '&amp;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

/** Attributes come back escaped from e(); put them back as typed. */
const unattr0 = null;

/** Headings may contain <em …> for the italic half — allow just that tag. */
const eHeading = (s) =>
  e(s).replace(/&lt;(\/?)em((?:(?!&gt;).)*?)&gt;/g,
    (m, close, attrs) => `<${close}em${unattr(attrs)}>`);

/** Body copy may contain simple inline tags the client typed on purpose. */
const unattr = (a) =>
  String(a).replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&');

const eRich = (s) =>
  e(s).replace(/&lt;(\/?)(strong|em|b|i|br|a|span)((?:(?!&gt;).)*?)&gt;/g,
    (m, close, tag, attrs) => `<${close}${tag}${unattr(attrs)}>`);

/** An image path from the CMS is "/images/x.jpg"; pages want "images/x.jpg". */
const img = (p) => String(p ?? '').replace(/^\/+/, '');

/*
 * A photo in a list can arrive in two shapes, depending on how the editor
 * saved it: a bare path ("/images/x.jpg") or an object ({image, alt}).
 * Read both, so a photo added from the editor is never dropped.
 *
 * The editor itself only writes the object shape. A bare path means the file
 * still holds data from before the photo lists gained a description field —
 * the editor cannot save such a file at all, so say so loudly.
 */
const photoSrc = (it) =>
  typeof it === 'string' ? it : (it && (it.image || it.src)) || '';
const photoAlt = (it) =>
  (it && typeof it === 'object' && (it.alt || '')) || '';

const checkPhotos = (where, items) => {
  (items || []).forEach((it, i) => {
    if (typeof it === 'string') {
      warn(`${where}[${i}] is a bare path — the editor cannot save this entry. ` +
        `Change it to { "image": "${it}", "alt": "" }.`);
    } else if (!photoSrc(it)) {
      warn(`${where}[${i}] has no picture and will be skipped.`);
    }
  });
};

const write = (name, html) => {
  fs.writeFileSync(path.join(OUT, name), html);
  return name;
};

/* ────────────────────────────────────────────────────────── fragments */

const CROWN_KING = 'M3 8l3.5 3L12 5l5.5 6L21 8l-1.5 10h-15L3 8z';
const CROWN_QUEEN = 'M5 19h14M4 8l4 4 4-7 4 7 4-4-1.5 11h-13L4 8z';

const ICONS = {
  heart: '<path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z"/>',
  home: '<path d="M3 11l9-8 9 8M5 10v10h14V10"/>',
  food: '<path d="M5 11V4h4v7M9 4h2a4 4 0 0 1 0 8H9M5 11h4M7 12v8"/>',
  news: '<path d="M4 5h16v14H4zM8 9h8M8 13h8M8 17h5"/>',
  basket: '<path d="M5 8h14l-1.5 11h-11L5 8zM8 8V6a4 4 0 0 1 8 0v2"/>',
  tree: '<path d="M12 3v18M5 12l7-7 7 7M5 18l7-7 7 7"/>',
  roof: '<rect x="4" y="9" width="16" height="11" rx="1"/><path d="M4 9l8-5 8 5"/>',
  cat: '<path d="M4 3l2.5 4M20 3l-2.5 4"/><path d="M6 6c-1 3.5-1 6 0 8.5C7.3 17.5 9.4 19 12 19s4.7-1.5 6-4.5c1-2.5 1-5 0-8.5"/>',
  paw: '<circle cx="8" cy="8" r="2"/><circle cx="16" cy="8" r="2"/><circle cx="5" cy="13" r="2"/><circle cx="19" cy="13" r="2"/><path d="M12 13c-3 0-5 2-5 4.5S9 21 12 21s5-1 5-3.5S15 13 12 13z"/>',
  star: '<path d="M12 3l2.7 6 6.3.6-4.8 4.2 1.5 6.2L12 16.8 6.3 20l1.5-6.2L3 9.6 9.3 9z"/>',
  kitchen: '<path d="M7 2v8a2 2 0 0 0 4 0V2M9 2v20M17 2c-1.5 0-2.5 2-2.5 5s1 4 2.5 4v11"/>',
  play: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/>',
};

const iconInner = (name) => ICONS[name] || ICONS.heart;

const secIcon = (name, cls = 'ic') =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
  `stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${iconInner(name)}</svg>`;

const shead = (icon, title, tag = '') =>
  `<div class="shead reveal">\n      ${secIcon(icon)}\n      <h2>${eHeading(title)}</h2>\n` +
  `      <div class="ln"></div>\n` +
  (tag ? `      <span class="tag">${e(tag)}</span>\n` : '') + `    </div>`;

const nav = (active) => {
  const items = [
    ['index.html', 'Home'],
    ['kittens.html', 'Kittens – plans'],
    ['our-cats.html', 'Our cats'],
    ['our-area.html', 'Our area'],
    ['blog.html', 'Blog'],
  ];
  const li = items
    .map(([href, label]) =>
      `<li><a${href === active ? ' class="active"' : ''} href="${href}">${label}</a></li>`)
    .join('');
  return `<nav id="nav"><div class="nav-inner"><a class="brand" href="index.html">` +
    `<img class="brand-logo" src="images/logo-small.webp" alt="Simons Cattery"></a>` +
    `<button class="nav-toggle" aria-label="Menu" aria-expanded="false">` +
    `<span></span><span></span><span></span></button>` +
    `<ul class="nav-links">${li}</ul></div></nav>`;
};

const footer = (c) =>
  `<footer><div class="foot-inner"><img class="foot-logo" src="images/logo.webp" alt="Simons Cattery">` +
  `<h3>${e(c.heading)}</h3><p class="loc">${e(c.location)}</p><div class="contacts">` +
  `<a href="mailto:${e(c.email)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
  `stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" ` +
  `height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>${e(c.email)}</a>` +
  `<a href="${e(c.facebook)}" target="_blank" rel="noopener">` +
  `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H7v3h3v6h3v-6h3l1-3h-4v-2c0-.6.4-1 1-1z"/>` +
  `</svg>Facebook</a></div><p class="copyright">${eRich(c.copyright)}</p></div></footer>`;

const toTop =
  `<button class="to-top" aria-label="Back to top"><svg viewBox="0 0 24 24" fill="none" ` +
  `stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">` +
  `<path d="M12 19V5M5 12l7-7 7 7"/></svg></button>`;

const head = (title, extra = '', navActive = null) =>
  `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n` +
  `<meta name="viewport" content="width=device-width, initial-scale=1.0">\n` +
  `<title>${title}</title>\n` +
  `<link rel="stylesheet" href="style.css">\n` +
  `<link rel="icon" href="images/cropped-logo-192x192.png">${extra}\n</head>\n<body>\n` +
  (navActive ? nav(navActive) + '\n' : '');

const tail = (c) => footer(c) + '\n' + toTop + '\n<script src="app.js"></script>\n</body>\n</html>\n';

const gallery = (cols, images, fallbackAlt = '') => {
  if (!images || !images.length) return '';
  const t = images
    .filter((im) => photoSrc(im))
    .map((im) => `\n      <img loading="lazy" src="${e(img(photoSrc(im)))}" ` +
      `alt="${e(photoAlt(im) || fallbackAlt)}">`)
    .join('');
  if (!t) return '';
  const c = /^g[123]$/.test(cols || '') ? cols : 'g3';
  return `<div class="gallery ${c} reveal">${t}\n    </div>`;
};

/* ────────────────────────────────────────────────────────────── cats */

/* The championship badges, in one place so the card and the page agree.
   `none`, empty and missing all mean "no badge". */
const BADGES = {
  champion: { label: 'Champion', crown: true, card: '', page: 'gold' },
  grand_champion: { label: 'Grand Champion', crown: true, card: 'gc', page: 'gold gc' },
  neutered: { label: 'Neutered', crown: false, card: 'neu', page: 'clay' },
};

const badgeFor = (cat) => {
  const key = cat.badge || 'none';
  if (key === 'none') return null;
  if (!BADGES[key]) {
    warn(`${cat.slug}: unknown championship badge "${key}" — no badge is shown. ` +
      `Known values: ${Object.keys(BADGES).join(', ')}.`);
    return null;
  }
  return BADGES[key];
};

const crownSvg = (group) =>
  `<svg viewBox="0 0 24 24" fill="currentColor"><path d="${
    group === 'king' ? CROWN_KING : CROWN_QUEEN}"/></svg>`;

const catCard = (cat) => {
  const group = cat.group || 'queen';
  const href = cat.has_page ? `cat-${cat.slug}.html` : (group === 'king' ? 'kings.html' : 'queens.html');
  const b = badgeFor(cat);
  const badge = b
    ? `<span class="badge${b.card ? ' ' + b.card : ''}">${b.crown ? crownSvg(group) : ''}${b.label}</span>`
    : '';
  const cardName = (cat.card_name || cat.name).trim();
  const alt = cardName.replace(/\n/g, ' ');
  return `<a class="card reveal" href="${href}"><div class="frame"><div class="ph">` +
    `<img loading="lazy" src="${e(img(cat.card_photo || cat.photo))}" alt="${e(alt)}">` +
    `</div><div class="veil"></div><div class="corner"></div>${badge}</div>` +
    `<div class="cmeta"><div class="nm">${e(cardName).replace(/\n/g, '<br>')}</div>` +
    `<div class="role">${group === 'king' ? 'King' : 'Queen'}</div></div></a>`;
};

const SWITCH_CSS =
  '\n<style>\n' +
  '.switch{display:flex;justify-content:center;margin:4px auto 34px;border:1px solid var(--line);\n' +
  ' border-radius:40px;overflow:hidden;width:max-content;background:var(--card);box-shadow:var(--shadow-sm)}\n' +
  '.switch a{padding:12px 34px;text-decoration:none;font-size:.74rem;letter-spacing:2px;text-transform:uppercase;\n' +
  ' color:var(--ink-soft);transition:all .3s}\n' +
  '.switch a.on{background:var(--sage-deep);color:#fffdf7}\n' +
  '.switch a:not(.on):hover{color:var(--sage-deep)}\n</style>';

const gridPage = (cats, group, contact) => {
  const isKing = group === 'king';
  const title = isKing ? 'Kings' : 'Queens';
  const cards = cats
    .filter((c) => (c.group || 'queen') === group && c.show_on_card !== false)
    .map(catCard).join('');
  const sw = `<div class="switch reveal">` +
    `<a class="${isKing ? 'on' : ''}" href="kings.html">Kings</a>` +
    `<a class="${isKing ? '' : 'on'}" href="queens.html">Queens</a></div>`;
  return head(`${title} — Simons Cattery`, SWITCH_CSS, 'our-cats.html') +
    `<header class="phead wrap" style="padding-bottom:10px">\n` +
    `  <a class="backlink" href="our-cats.html">&larr; All our cats</a>\n` +
    `  <p class="kick">Our family</p>\n` +
    `  <h1>Our <em>${title}</em></h1>\n` +
    `  <div class="leaf" style="margin-top:16px"></div>\n</header>\n` +
    `<main class="wrap">\n  ${sw}\n  <div class="grid">${cards}</div>\n</main>\n` + tail(contact);
};

const VIDEO_CSS =
  '\n<style>\n' +
  '.vidwrap{max-width:420px;margin:0 auto;border-radius:8px;overflow:hidden;\n' +
  ' border:1px solid var(--line-soft);box-shadow:var(--shadow-lg);background:#000}\n' +
  '.vidwrap video{width:100%;display:block}\n</style>';

/* The <source> type has to match the actual file. Saying "video/mp4" about a
   film straight off an iPhone (.MOV) is what made Harriette's video refuse to
   play in some browsers. Only formats every browser understands are safe. */
const VIDEO_TYPES = {
  mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', ogv: 'video/ogg', ogg: 'video/ogg',
  mov: 'video/quicktime', qt: 'video/quicktime', avi: 'video/x-msvideo', mkv: 'video/x-matroska',
};
const WEB_SAFE_VIDEO = new Set(['mp4', 'm4v', 'webm']);

const videoType = (file, who) => {
  const ext = String(file ?? '').split('.').pop().toLowerCase();
  if (!WEB_SAFE_VIDEO.has(ext)) {
    warn(`${who}: the video "${file}" is a .${ext} file. Convert it to MP4 — ` +
      `not every browser can play this format.`);
  }
  // No type at all is better than a wrong one: the browser then sniffs the file.
  return VIDEO_TYPES[ext] ? ` type="${VIDEO_TYPES[ext]}"` : '';
};

/** Table values: plain text, a bare URL, or "Label|target". */
const rowValue = (v) => {
  v = String(v ?? '').trim();
  if (/^https?:\/\/\S+$/i.test(v)) {
    // a bare & in an address must be written &amp; in HTML
    const href = v.replace(/&(?!(?:[a-zA-Z][a-zA-Z0-9]{1,9}|#\d{1,6});)/g, '&amp;');
    return `<a href="${href}" target="_blank" rel="noopener">View on PawPeds &nearr;</a>`;
  }
  if (v.includes('|')) {
    const [left, url] = v.split('|').map((x) => x.trim());
    const ext = /^https?:\/\//i.test(url) ? ' target="_blank" rel="noopener"' : '';
    // "Claudia Mixner – Magaskawee|http://…" keeps the words before the link
    // outside it; the last dash-separated piece becomes the link text
    const cut = left.lastIndexOf(' – ');
    const before = cut > -1 ? e(left.slice(0, cut + 3)) : '';
    const label = cut > -1 ? left.slice(cut + 3) : left;
    const href2 = url.replace(/&(?!(?:[a-zA-Z][a-zA-Z0-9]{1,9}|#\d{1,6});)/g, '&amp;');
    return `${before}<a href="${href2}"${ext}>${e(label)}</a>`;
  }
  return eRich(v);
};

const catPage = (cat, contact) => {
  const group = cat.group || 'queen';
  const role = group === 'king' ? 'King' : 'Queen';
  let badges = `<span class="tagbadge">${role}</span>`;
  const b = badgeFor(cat);
  if (b) {
    badges += `<span class="tagbadge ${b.page}">` +
      (b.crown ? `<svg viewBox="0 0 24 24" fill="currentColor"><path d="${CROWN_KING}"/></svg>` : '') +
      `${b.label}</span>`;
  }

  const rows = (cat.rows || [])
    .filter((r) => String(r.label ?? '').trim() && String(r.value ?? '').trim())
    .map((r) => `<div class="row"><div class="k">${e(r.label)}</div><div class="v">${rowValue(r.value)}</div></div>`)
    .join('');
  const sheet = rows ? `<div class="sheet">${rows}</div>` : '';

  const award = String(cat.award ?? '').trim()
    ? `<div class="award reveal"><svg viewBox="0 0 24 24" fill="currentColor">` +
      `<circle cx="12" cy="8" r="6"/><path d="M8.5 13.5 7 22l5-3 5 3-1.5-8.5"/></svg>` +
      `<p>${eRich(cat.award)}</p></div>`
    : '';

  const bio = String(cat.bio ?? '')
    .split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
    .map((p) => `<p class="bio">${eRich(p)}</p>`).join('');

  /* Titles & awards — appears only when the cat has any */
  let titles = '';
  const tList = (cat.titles || []).filter((t) => String(t.title ?? '').trim());
  if (cat.has_titles && (tList.length || (cat.title_photos || []).length)) {
    const rosette = '<svg viewBox="0 0 24 24" fill="currentColor">' +
      '<circle cx="12" cy="8" r="6"/><path d="M8.5 13.5 7 22l5-3 5 3-1.5-8.5"/></svg>';
    const items = tList.map((t) =>
      `<li>${rosette}<span><b>${eRich(t.title)}</b>` +
      (String(t.detail ?? '').trim() ? `<small>${eRich(t.detail)}</small>` : '') +
      `</span></li>`).join('');
    titles = `\n  <section class="titles">\n` +
      `    <div class="titles-head reveal">${rosette}<h2>${eHeading(cat.titles_heading || 'Titles & awards')}</h2></div>\n` +
      `    <div class="titles-rule reveal"></div>\n` +
      (items ? `    <ul class="titles-list reveal">${items}</ul>\n` : '') +
      (cat.title_photos && cat.title_photos.length
        ? `    ${gallery(cat.title_photos_cols || 'g3', cat.title_photos, cat.name)}\n` : '') +
      `  </section>`;
  }

  let extra = '';
  if (cat.gallery && cat.gallery.length) {
    const cap = String(cat.gallery_caption ?? '').trim();
    extra += `\n  <section style="margin-top:18px">` +
      (cap ? `<p class="cap reveal">${eRich(cap)}</p>` : '') +
      gallery(cat.gallery_cols, cat.gallery, cat.name) + `</section>`;
  }

  let headExtra = '';
  if (cat.video) {
    headExtra = VIDEO_CSS;
    const cap = String(cat.video_caption ?? '').trim();
    extra += `\n  <section style="margin-top:26px">` +
      (cap ? `<p class="cap reveal">${e(cap)}</p>` : '') +
      `<div class="vidwrap reveal"><video controls preload="none" playsinline` +
      (cat.video_poster ? ` poster="${e(img(cat.video_poster))}"` : '') +
      `><source src="${e(img(cat.video))}"${videoType(cat.video, cat.slug)}>` +
      `Your browser does not support the video tag.</video></div></section>`;
  }

  return head(`${e(cat.name)} — Simons Cattery`, headExtra, 'our-cats.html') +
    `<header class="phead wrap" style="padding-bottom:8px">\n` +
    `  <a class="backlink" href="our-cats.html">&larr; All our cats</a>\n` +
    `  <h1>${eHeading(cat.name)}</h1>\n` +
    `  <div class="leaf" style="margin-top:18px"></div>\n</header>\n` +
    `<main class="wrap">\n  <section class="profile">\n` +
    `    <div class="pphoto reveal"><img src="${e(img(cat.photo))}" alt="${e(cat.name)}">` +
    `<div class="corner"></div></div>\n    <div class="reveal">\n` +
    `      <div class="roleline">${badges}</div>\n` +
    (award ? `      ${award}\n` : '') +
    `      ${sheet}\n      ${bio}\n    </div>\n  </section>${titles}${extra}\n</main>\n` + tail(contact);
};

/* ────────────────────────────────────────────────────────── pages */

const postCard = (p) =>
  `\n      <a class="post reveal" href="post-${e(p.slug)}.html">\n` +
  `        <span class="date">${e(p.date)}</span>\n` +
  `        <h3>${e(p.title)}</h3>\n` +
  `        <p>${e(p.excerpt)}</p>\n` +
  `        <span class="arrow">Read more →</span>\n      </a>`;

const homePage = (h, posts, contact) => {
  const btns = (h.buttons || [])
    .map((b, i) =>
      `<a class="btn${b.style === 'ghost' ? ' ghost' : ''}" href="${e(b.link)}"` +
      `${i > 0 ? ' style="margin-left:10px"' : ''}>${e(b.text)}</a>\n    `)
    .join('');

  checkPhotos('home page: small logos', h.badges);
  const badges = (h.badges || [])
    .filter((b) => photoSrc(b))
    .map((b) => `\n    <img src="${e(img(photoSrc(b)))}" alt="${e(photoAlt(b))}"` +
      (b.style ? ` style="${e(b.style)}"` : '') + '>')
    .join('');

  const about = String(h.about_text ?? '')
    .split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
    .map((p) => `      <p>${eRich(p)}</p>\n`).join('');

  const aboutLink = String(h.about_link_url ?? '').trim()
    ? `      <a class="btn ghost" href="${e(h.about_link_url)}" target="_blank" ` +
      `rel="noopener" style="margin-top:8px">${e(h.about_link_text)}</a>\n`
    : '';

  const feats = (h.features || [])
    .map((f) => `\n      <div class="feature reveal">\n        ${secIcon(f.icon, 'fic')}\n` +
      `        <h4>${e(f.title)}</h4>\n        <p>${e(f.text)}</p>\n      </div>`)
    .join('');

  const cards = posts.slice(0, Math.max(1, h.news_count || 3)).map(postCard).join('');

  return head(e(h.title_tag), '', null) +
    nav('index.html') + '\n\n' +
    `<header class="home-hero wrap">\n` +
    `  <p class="kick" style="font-size:.72rem;letter-spacing:8px;text-transform:uppercase;color:var(--clay);opacity:0;animation:rise 1s .1s forwards">${e(h.kick)}</p>\n` +
    `  <h1 style="font-family:'Fraunces',serif;font-weight:500;font-size:clamp(3rem,9vw,6.5rem);line-height:1;letter-spacing:-1px;margin:16px 0 0;opacity:0;animation:rise 1s .25s forwards">${eHeading(h.title)}</h1>\n` +
    `  <p class="lead" style="max-width:600px;margin:22px auto 0;color:var(--ink-soft);font-size:1.1rem;opacity:0;animation:rise 1s .45s forwards">${e(h.lead)}</p>\n` +
    `  <div style="margin-top:30px;opacity:0;animation:rise 1s .55s forwards">\n    ${btns}</div>\n` +
    `  <div class="badge-row">${badges}\n  </div>\n</header>\n\n` +
    `<main class="wrap">\n\n` +
    `  <!-- ABOUT -->\n  <section>\n    ${shead(h.about_icon, h.about_title)}\n` +
    `    <div class="panel prose reveal">\n${about}${aboutLink}    </div>\n  </section>\n\n` +
    `  <!-- FEATURES -->\n  <section>\n    <div class="feature-grid" style="margin-top:48px">${feats}\n    </div>\n  </section>\n\n` +
    `  <!-- NEWS -->\n  <section>\n    ${shead(h.news_icon, h.news_title, h.news_tag)}\n` +
    `    <div class="posts">${cards}\n    </div>\n` +
    `    <div style="text-align:center;margin-top:34px" class="reveal">\n` +
    `      <a class="btn ghost" href="blog.html">${e(h.news_all_text)}</a>\n    </div>\n  </section>\n\n</main>\n` +
    tail(contact);
};

const kittensPage = (k, contact) => {
  const out = (k.litters || []).map((l) => {
    checkPhotos(`kittens page: ${l.title || 'litter'} photos`, l.images);
    const pill = `<span class="pill${l.status_off ? ' off' : ''}">${e(l.status)}</span>`;
    const style = String(l.text_style ?? '').trim() || 'color:var(--ink-soft)';
    const text = String(l.text ?? '').trim()
      ? `\n      <p class="prose" style="${style}">${eRich(l.text)}</p>` : '';
    const meta = String(l.meta ?? '').trim()
      ? `\n      <p class="meta-line">${eRich(l.meta)}</p>` : '';
    return `\n  <section>\n    ${shead(l.icon, l.title)}\n` +
      `    <div class="litter reveal">\n      ${pill}${text}${meta}\n    </div>\n` +
      `    ${gallery(l.cols, l.images, l.title)}\n  </section>\n`;
  }).join('');

  return head(e(k.title_tag), '', 'kittens.html') +
    `<header class="phead wrap">\n  <p class="kick">${e(k.kick)}</p>\n` +
    `  <h1>${eHeading(k.title)}</h1>\n  <p class="lead">${e(k.lead)}</p>\n` +
    `  <div class="leaf"></div>\n</header>\n\n<main class="wrap">\n${out}\n</main>\n` + tail(contact);
};

const areaPage = (a, contact) => {
  const out = (a.sections || []).map((s) => {
    checkPhotos(`our area page: ${s.title || 'section'} photos`, s.images);
    return `\n  <section>\n    ${shead(s.icon, s.title)}\n    ${gallery(s.cols, s.images)}\n  </section>\n`;
  }).join('');
  return head(e(a.title_tag), '', 'our-area.html') +
    `<header class="phead wrap">\n  <p class="kick">${e(a.kick)}</p>\n` +
    `  <h1>${eHeading(a.title)}</h1>\n  <p class="lead">${e(a.lead)}</p>\n` +
    `  <div class="leaf"></div>\n</header>\n\n<main class="wrap">\n\n` +
    `  <section>\n    <div class="panel prose reveal" style="text-align:center">\n` +
    `      <h3>${e(a.intro_title)}</h3>\n` +
    `      <p style="margin:0 auto">${eRich(a.intro_text)}</p>\n    </div>\n  </section>\n` +
    out + `\n</main>\n` + tail(contact);
};

const blogPage = (b, posts, contact) =>
  head(e(b.title_tag), '', 'blog.html') +
  `<header class="phead wrap">\n  <p class="kick">${e(b.kick)}</p>\n` +
  `  <h1>${eHeading(b.title)}</h1>\n  <p class="lead">${e(b.lead)}</p>\n` +
  `  <div class="leaf"></div>\n</header>\n\n<main class="wrap">\n` +
  `  <section style="padding-top:10px">\n    <div class="posts">${posts.map(postCard).join('\n')}\n    </div>\n  </section>\n</main>\n` +
  tail(contact);

const postPage = (p, contact) => {
  const lead = p.image
    ? `    <div class="lead-img reveal"><img src="${e(img(p.image))}" alt=""></div>\n` : '';
  return head(e(p.title_tag || `${p.title} — Simons Cattery`), '', 'blog.html') +
    `<header class="phead wrap" style="padding-bottom:0">\n` +
    `  <a class="backlink" href="blog.html">&larr; All posts</a>\n</header>\n` +
    `<main class="wrap">\n  <article class="article">\n` +
    `    <p class="meta">${e(p.date)}</p>\n    <h1>${e(p.h1 || p.title)}</h1>\n${lead}` +
    `${p.body}\n` +
    `    <p style="text-align:center;margin-top:36px"><a class="btn ghost" href="blog.html">${e(p.back_text)}</a></p>\n` +
    `  </article>\n</main>\n` + tail(contact);
};

const OURCATS = JSON.parse(fs.readFileSync(path.join(CONTENT, 'pages', '_ourcats.json'), 'utf8'));

const ourCatsPage = (cats, contact) => {
  const n = (g) => cats.filter((c) => (c.group || 'queen') === g && c.show_on_card !== false).length;
  const crown = (g) => (g === 'king' ? CROWN_KING : CROWN_QUEEN);
  const pick = (g, label) =>
    `        <a class="choice reveal" href="${g}s.html">\n` +
    `            <img src="images/${e(OURCATS.covers[g + 's'])}" alt="${label}">\n` +
    `            <div class="cveil"></div><div class="corner"></div>\n` +
    `            <div class="clabel"><svg viewBox="0 0 24 24" fill="currentColor">` +
    `<path d="${crown(g)}"/></svg><h2>${label}</h2><span>${n(g)} cats &rarr;</span></div>\n` +
    `        </a>`;
  return head('Our Cats — Simons Cattery',
    '\n<style>' + OURCATS.style + '</style>', 'our-cats.html') +
    `<header class="phead wrap">${OURCATS.header}</header>\n<main class="wrap">\n` +
    `    <div class="choose">\n${pick('king', 'Kings')}\n${pick('queen', 'Queens')}\n    </div>\n</main>\n` +
    tail(contact);
};

/* ─────────────────────────────────────────────────────────── build */

const cats = readDir('cats');
const posts = readDir('posts');

/* Check every cat, including the ones without a page of their own — the editor
   has to be able to open and save those too. */
for (const c of cats) {
  checkPhotos(`${c.slug}: championship photos`, c.title_photos);
  checkPhotos(`${c.slug}: photos`, c.gallery);
}
const P = (n) => read(path.join(CONTENT, 'pages', n + '.json'));
const contact = P('contact');

const written = [];
written.push(write('index.html', homePage(P('home'), posts, contact)));
written.push(write('kittens.html', kittensPage(P('kittens'), contact)));
written.push(write('our-area.html', areaPage(P('area'), contact)));
written.push(write('blog.html', blogPage(P('blog'), posts, contact)));
written.push(write('our-cats.html', ourCatsPage(cats, contact)));
written.push(write('kings.html', gridPage(cats, 'king', contact)));
written.push(write('queens.html', gridPage(cats, 'queen', contact)));

for (const p of posts) written.push(write(`post-${p.slug}.html`, postPage(p, contact)));
for (const c of cats) if (c.has_page) written.push(write(`cat-${c.slug}.html`, catPage(c, contact)));

/* pages that are no longer in the content folder should not linger.
   KEEP_AS_IS are hand-written pages that were never generated — they are
   still linked to, so they must survive a rebuild. */
const KEEP_AS_IS = new Set(['welfare.html']);
const keep = new Set(written);
for (const f of fs.readdirSync(OUT)) {
  if (!/^(cat|post)-.*\.html$/.test(f)) continue;
  if (keep.has(f) || KEEP_AS_IS.has(f)) continue;
  fs.unlinkSync(path.join(OUT, f));
  console.log('  removed', f);
}

/* the two hand-kept pages still need the current footer */
for (const f of ['welfare.html', 'cat-princess.html']) {
  const p = path.join(OUT, f);
  if (!fs.existsSync(p)) continue;
  const html = fs.readFileSync(p, 'utf8').replace(/<footer>[\s\S]*?<\/footer>/, footer(contact));
  fs.writeFileSync(p, html);
}

/* A stamp of this build, so the editor can tell when the new version of the
   website has actually gone live instead of guessing with a timer.
   Netlify sets these; locally we fall back to the clock. */
const stamp =
  process.env.DEPLOY_ID || process.env.COMMIT_REF || `local-${Date.now()}`;
fs.writeFileSync(
  path.join(OUT, 'version.json'),
  JSON.stringify({ deploy: stamp, built: new Date().toISOString() }, null, 2) + '\n',
);

console.log(`Built ${written.length} pages · ${cats.length} cats · ${posts.length} posts`);

if (warnings.size) {
  console.log(`\n⚠  ${warnings.size} thing${warnings.size > 1 ? 's' : ''} to look at:`);
  for (const w of warnings) console.log(`   • ${w}`);
  console.log('');
}

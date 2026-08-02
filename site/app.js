/* Simons Cattery — shared interactions */
(function () {
  'use strict';

  /* ---------- Reveal on scroll ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(function (el, i) {
    el.style.transitionDelay = ((i % 3) * 0.08) + 's';
    io.observe(el);
  });

  /* ---------- Mobile nav ---------- */
  var nav = document.getElementById('nav');
  var toggle = nav && nav.querySelector('.nav-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.querySelectorAll('.nav-links a').forEach(function (a) {
      a.addEventListener('click', function () { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); });
    });
  }

  /* ---------- Header shadow + to-top on scroll ---------- */
  var toTop = document.querySelector('.to-top');
  function onScroll() {
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 12);
    if (toTop) toTop.classList.toggle('show', window.scrollY > 600);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  if (toTop) toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

  /* ---------- Lightbox ---------- */
  // Build groups: each .gallery is a group; standalone .pphoto/.lead-img images are singletons.
  var groups = [];
  document.querySelectorAll('.gallery').forEach(function (g) {
    var imgs = Array.prototype.slice.call(g.querySelectorAll('img'));
    if (imgs.length) groups.push(imgs);
  });
  document.querySelectorAll('.pphoto img, .lead-img img').forEach(function (img) {
    groups.push([img]);
  });
  if (!groups.length) return;

  // map each img -> {group, index}
  var map = new WeakMap();
  groups.forEach(function (imgs) {
    imgs.forEach(function (img, idx) {
      map.set(img, { imgs: imgs, idx: idx });
      img.style.cursor = 'zoom-in';
    });
  });

  // Build lightbox DOM once
  var lb = document.createElement('div');
  lb.className = 'lb';
  lb.innerHTML =
    '<button class="lb-close" aria-label="Close">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
    '<button class="lb-btn lb-prev" aria-label="Previous">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button>' +
    '<button class="lb-btn lb-next" aria-label="Next">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg></button>' +
    '<div class="lb-stage"><img class="lb-img" alt=""><div class="lb-cap"></div><div class="lb-counter"></div></div>';
  document.body.appendChild(lb);

  var lbImg = lb.querySelector('.lb-img');
  var lbCap = lb.querySelector('.lb-cap');
  var lbCount = lb.querySelector('.lb-counter');
  var current = null;  // {imgs, idx}

  function fullSrc(img) {
    // prefer a data-full attr, else strip WordPress size suffix (-123x456) to load original
    if (img.getAttribute('data-full')) return img.getAttribute('data-full');
    return img.src.replace(/-\d+x\d+(?=\.(jpe?g|png|webp|gif)$)/i, '');
  }

  function show(rec) {
    current = rec;
    var img = rec.imgs[rec.idx];
    var thumb = img.currentSrc || img.src;
    lbImg.onerror = function () { lbImg.onerror = null; lbImg.src = thumb; };
    lbImg.src = fullSrc(img);
    lbImg.alt = img.alt || '';
    lbCap.textContent = img.alt || '';
    if (rec.imgs.length > 1) {
      lb.classList.remove('single');
      lbCount.textContent = (rec.idx + 1) + ' / ' + rec.imgs.length;
    } else {
      lb.classList.add('single');
      lbCount.textContent = '';
    }
  }
  function open(rec) {
    show(rec);
    lb.classList.add('open');
    document.body.classList.add('lb-lock');
  }
  function close() {
    lb.classList.remove('open');
    document.body.classList.remove('lb-lock');
    current = null;
  }
  function step(dir) {
    if (!current) return;
    var n = current.imgs.length;
    current.idx = (current.idx + dir + n) % n;
    // graceful fade
    lbImg.style.opacity = 0;
    setTimeout(function () { show(current); lbImg.style.opacity = 1; }, 120);
  }

  document.querySelectorAll('.gallery img, .pphoto img, .lead-img img').forEach(function (img) {
    img.addEventListener('click', function () {
      var rec = map.get(img);
      if (rec) open({ imgs: rec.imgs, idx: rec.idx });
    });
  });

  lb.querySelector('.lb-close').addEventListener('click', close);
  lb.querySelector('.lb-prev').addEventListener('click', function (e) { e.stopPropagation(); step(-1); });
  lb.querySelector('.lb-next').addEventListener('click', function (e) { e.stopPropagation(); step(1); });
  lb.addEventListener('click', function (e) { if (e.target === lb || e.target.classList.contains('lb-stage')) close(); });
  document.addEventListener('keydown', function (e) {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
  });

  // basic swipe on touch
  var sx = 0;
  lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', function (e) {
    var dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
  }, { passive: true });
})();

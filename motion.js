/**
 * motion.js — additive UX/motion layer for the Strategies By Design site.
 *
 * Pure progressive enhancement: it only ADDS classes at runtime. If this file
 * is removed, the site renders exactly as authored. Fully honors
 * prefers-reduced-motion. Designed to run alongside support.js's async render —
 * a MutationObserver re-scans as content (and the fetched header/footer) appear.
 */
(() => {
  if (window.__sbdMotion) return;
  window.__sbdMotion = true;

  const reduce = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Injected styles ───────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = [
    'html{scroll-behavior:smooth}',
    '.sbd-reveal{opacity:0;transform:translateY(22px);' +
      'transition:opacity .8s cubic-bezier(.16,.84,.44,1),transform .8s cubic-bezier(.16,.84,.44,1);' +
      'will-change:opacity,transform}',
    '.sbd-reveal.sbd-in{opacity:1;transform:none}',
    '@keyframes sbdFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}',
    '.sbd-float{animation:sbdFloat 6.5s ease-in-out infinite}',
    'header.sbd-scrolled{box-shadow:0 6px 24px rgba(30,58,95,.10)!important;' +
      'background:rgba(255,255,255,.95)!important}',
    '@media (prefers-reduced-motion: reduce){' +
      'html{scroll-behavior:auto}' +
      '.sbd-reveal{opacity:1!important;transform:none!important;transition:none!important}' +
      '.sbd-float{animation:none!important}}',
  ].join('');
  (document.head || document.documentElement).appendChild(style);

  const seen = new WeakSet();
  let io = null;
  if ('IntersectionObserver' in window && !reduce) {
    io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('sbd-in');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
  }

  // Reveal top-level content blocks. Section-level keeps it safe across the
  // varied page layouts — no per-element tagging of the designer's markup.
  function revealEls() {
    if (reduce) return;
    const fresh = [];
    document.querySelectorAll('section, footer').forEach((el) => {
      if (seen.has(el)) return;
      seen.add(el);
      el.classList.add('sbd-reveal');
      if (io) io.observe(el); else el.classList.add('sbd-in');
      fresh.push(el);
    });
    // Prompt, staggered load-in for anything already above the fold so the
    // first screen animates in rather than waiting on a scroll.
    if (io && fresh.length) {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        let n = 0;
        fresh.forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.top < window.innerHeight * 0.95) {
            el.style.transitionDelay = (n * 80) + 'ms';
            n++;
            el.classList.add('sbd-in');
            io.unobserve(el);
          }
        });
      }));
    }
  }

  function floatSphere() {
    if (reduce) return;
    document.querySelectorAll('img[alt*="sphere" i]').forEach((img) => {
      img.classList.add('sbd-float');
    });
  }

  let headerBound = false;
  function bindHeader() {
    if (headerBound) return;
    const h = document.querySelector('header');
    if (!h) return;
    headerBound = true;
    const onScroll = () => {
      if (window.scrollY > 8) h.classList.add('sbd-scrolled');
      else h.classList.remove('sbd-scrolled');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  let queued = false;
  function run() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      revealEls();
      floatSphere();
      bindHeader();
    });
  }

  run();

  // support.js renders the page asynchronously and fetches the header/footer;
  // re-scan as nodes arrive, then stop watching once things settle.
  const mo = new MutationObserver(run);
  mo.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener('load', () => {
    run();
    // Failsafe: never leave an above-the-fold block stuck hidden.
    setTimeout(() => {
      document.querySelectorAll('.sbd-reveal:not(.sbd-in)').forEach((el) => {
        if (el.getBoundingClientRect().top < window.innerHeight) {
          el.classList.add('sbd-in');
        }
      });
    }, 500);
    setTimeout(() => mo.disconnect(), 4000);
  });
})();

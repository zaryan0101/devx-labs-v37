// v28: intro curtain, pixel-resolving headings, hero column grid + locked stripes, console drawn in lines
// then filled with one request story, page light (night/dawn), panels that play on entry, nav state, menus.
(() => {
  const root = document.documentElement;
  const motion = !root.classList.contains('no-intro');
  // this version is a prototype: every link is a placeholder, so clicking one never navigates or jumps.
  // Buttons, menus, filters, the chat, hovers and scripted jumps (e.g. 'use cases move this') still work.
  document.addEventListener('click', e => { if (e.target.closest('a[href]:not([data-go])')) e.preventDefault(); }, true);
  const clamp = v => Math.max(0, Math.min(1, v));
  const outCubic = p => 1 - Math.pow(1 - p, 3);
  const inOut = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

  // brand stripe palette (branding file, node 604:136)
  const BASE = ['#5b84f5', '#5b84f5', '#7d9cf8', '#b7b2fb'];
  const MIX = ['#b7b2fb', '#f6a3cf', '#ffc39c', '#72d4f4', '#ffcf5c', '#35d6a6', '#fc88ab'];
  function columns(W, r) {
    const pick = a => a[Math.floor(r() * a.length)];
    const cols = [];
    for (let x = 0; x < W;) {
      const narrow = r() < .3;
      const w = narrow ? 8 + r() * 14 : 34 + r() * 60;
      cols.push({ x, w, base: narrow ? pick(MIX) : pick(BASE), acc: pick(MIX), cap: !narrow && r() < .24, capH: .16 + r() * .2, ph: r() * 6.28, k: r() });
      x += w;
    }
    return cols;
  }
  const FRINGE = ['#fc88ab', '#ff7342', '#92e588'];
  // the four devx colours, each with its own tint: [base, tint]
  const DEVX = [['#436bf6', '#e1e7fe'], ['#fc88ab', '#ffecf2'], ['#ff7342', '#ffe9e1'], ['#92e588', '#eefbec']];
  function drawCol(ctx, c, H, h, wash) {
    if (h < 1) return;
    const top = H - h;
    const g = ctx.createLinearGradient(0, top, 0, H);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(.1, `rgba(255,255,255,${wash})`);
    g.addColorStop(.42, c.acc);
    g.addColorStop(1, c.base);
    ctx.fillStyle = g;
    ctx.fillRect(c.x, top, c.w + .6, h);
    if (c.cap) {   // white block riding the column top, with the pink/yellow fringe on its lower edge
      const bh = h * c.capH;
      const fg = ctx.createLinearGradient(c.x, 0, c.x + c.w, 0);
      FRINGE.forEach((f, i) => fg.addColorStop(i / 2, f));
      ctx.fillStyle = fg; ctx.globalAlpha = .75; ctx.fillRect(c.x, top + bh - 2, c.w + .6, 5);
      ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(c.x, top + h * .04, c.w + .6, bh - h * .04);
    }
  }

  // ---------------------------------------------------------------- one column grid: content width / 6 (4 on phones), repeated to the edges
  function gridFor(host) {
    const hr = host.getBoundingClientRect(), wr = host.querySelector('.wrap').getBoundingClientRect();
    const n = innerWidth < 640 ? 4 : 6, cw = wr.width / n;
    if (!(cw > 4)) return { xs: [], cw: 0, left: hr.left };   // not laid out yet (hidden, mid-resize): no grid rather than an endless loop
    let x = wr.left - hr.left; while (x > 0) x -= cw;
    const xs = []; for (; x <= hr.width + 1; x += cw) xs.push(x);
    return { xs, cw, left: hr.left };
  }
  // every grid column becomes a wide and a narrow band, so the stripe seams fall on the grid lines
  // whole: one band per grid column, so every stripe edge is a grid line (the hero)
  // pal: [[base, tint], …] cycled one per grid column, starting at column `p0` (instead of the random pastel mix)
  function gridStripes(xs, cw, rr, capP = .22, whole = false, pal = null, p0 = 0) {
    const pick = a => a[Math.floor(rr() * a.length)], out = [];
    xs.forEach((x0, ci) => {
      const pc = pal && pal[(((ci - p0) % pal.length) + pal.length) % pal.length];
      const hc = rr();
      const parts = whole ? [1] : rr() < .5 ? [.6 + rr() * .18, .1 + rr() * .05] : [.1 + rr() * .05, .6 + rr() * .18];
      if (!whole) parts.push(1 - parts[0] - parts[1]);
      let x = x0;
      parts.forEach(pw => {
        const w = cw * pw, narrow = pw < .2;
        out.push({ x, w, base: pc ? pc[0] : narrow ? pick(MIX) : pick(BASE), acc: pc ? pc[1] : pick(MIX), cap: !narrow && rr() < capP, capH: .12 + rr() * .14, ph: rr() * 6.28, k: rr(), hc, cx: x0 + cw / 2, h: 0 });
        x += w;
      });
    });
    return out;
  }
  function p0For(host, g) {
    const wl = host.querySelector('.wrap').getBoundingClientRect().left - g.left;
    return Math.max(0, g.xs.findIndex(x => Math.abs(x - wl) < 2));
  }
  // paint any [data-stripes] window with devx stripes on its section's grid ("night" = no white wash, for dark grounds)
  function paintStripes(el, seed = 131) {
    const host = el.closest('section, footer'), r = el.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    if (!host || !r.width) return;
    const cv = document.createElement('canvas'), c2 = cv.getContext('2d'); cv.width = r.width * dpr; cv.height = r.height * dpr; c2.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = gridFor(host), cols = gridStripes(g.xs.map(x => x + g.left - r.left), g.cw, rng(seed), .14, true, DEVX, p0For(host, g));
    const night = el.dataset.stripes === 'night', wash = night ? 0 : .7;
    // on a dark ground: no light tint band and no white blocks; each column fades from clear straight into its colour
    if (night) cols.forEach(c => { c.cap = false; c.acc = c.base; });
    cols.forEach(c => drawCol(c2, c, r.height, (.55 + .4 * c.hc + (c.k - .5) * .08) * r.height, wash));
    cv.toBlob(b => { if (!b) return; const u = URL.createObjectURL(b), old = el.dataset.u; el.dataset.u = u; el.style.backgroundImage = `url(${u})`; el.style.backgroundSize = '100% 100%'; if (old) URL.revokeObjectURL(old); });
  }
  function drawLines() {
    document.querySelectorAll('.glines').forEach(gl => {
      const host = gl.parentElement, { xs } = gridFor(host), mid = host.getBoundingClientRect().width / 2;
      gl.innerHTML = xs.filter(x => x > .5).map(x => `<i style="left:${x.toFixed(1)}px;--gd:${(Math.abs(x - mid) / mid * .45).toFixed(2)}s"></i>`).join('');
    });
  }

  // ---------------------------------------------------------------- page light: night for the problem, a stripe dawn hands it back to day
  const nav = document.querySelector('.nav'), foot = document.getElementById('foot');
  const nightSec = document.querySelector('[data-light="night"]'), dawn = document.getElementById('dawn');
  const duskSec = document.querySelector('[data-light="dusk"]');   // the close: night falls as the CTA arrives and stays through the footer
  let dctx, dcols = [], dW = 0, dH = 0, dawnP = -1;
  const dawnSize = () => {
    if (!dawn) return;
    const r = dawn.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    dW = r.width; dH = r.height; dawn.width = dW * dpr; dawn.height = dH * dpr;
    dctx = dawn.getContext('2d'); dctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = gridFor(nightSec), off = g.left - r.left;
    dcols = gridStripes(g.xs.map(x => x + off), g.cw, rng(21), .1, true, DEVX, p0For(nightSec, g));
    dcols.forEach(c => { const u = c.cx / dW; c.h0 = (.5 + .4 * c.hc) * (.92 + .08 * c.k); c.lag = Math.abs(u - .5) * .4 + c.hc * .1; });
    dawnP = -1;
  };
  const drawDawn = p => {
    if (!dctx || Math.abs(p - dawnP) < .002) return; dawnP = p;
    dawn.parentElement.style.setProperty('--dp', p.toFixed(3));   // the field image rises with the same progress
    dctx.clearRect(0, 0, dW, dH);
    // each column is a soft band: it fades in at its top, peaks in its colour, then fades back to paper at its own height,
    // so the dawn never ends on one shared line (the Outcomes field's look)
    const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
    for (const c of dcols) {
      const rise = outCubic(clamp((p - c.lag) / (1 - c.lag * .6)));
      if (rise < .005) continue;
      const end = dH * (.74 + .24 * c.k), top = end - rise * c.h0 * dH * 1.3;
      const g = dctx.createLinearGradient(0, top, 0, end);
      g.addColorStop(0, rgba(c.acc, 0)); g.addColorStop(.38, rgba(c.acc, .7)); g.addColorStop(.66, rgba(c.base, .72)); g.addColorStop(1, rgba(c.base, 0));
      dctx.fillStyle = g; dctx.fillRect(c.x, top, c.w + .6, end - top);
    }
  };
  const plist = document.getElementById('prob-list'), sheet = document.querySelector('.vig.sheet');
  let litP = -2;
  // desktop: the problem nearest mid-screen is on; its rows and every earlier problem's rows stay flagged.
  // Past the list the last state holds, so the tracker never resets while it is still on screen.
  const flagUpTo = best => {
    [...plist.children].forEach((li, i) => li.classList.toggle('on', i === best));
    sheet.classList.toggle('focus', best >= 0);
    sheet.classList.toggle('all', best === plist.children.length - 1);
    sheet.querySelectorAll('.pr[data-p]').forEach(row => row.classList.toggle('lit', +row.dataset.p <= best));
  };
  const lightProblems = vh => {
    if (!plist || !sheet || innerWidth <= 860) return;
    const lis = [...plist.children];
    let best = -1, bd = 1e9;
    lis.forEach((li, i) => {
      const r = li.getBoundingClientRect(), d = Math.abs(r.top + r.height / 2 - vh * .5);
      if (r.bottom > vh * .2 && r.top < vh * .8 && d < bd) { bd = d; best = i; }
    });
    if (best < 0 && lis[lis.length - 1].getBoundingClientRect().bottom < vh * .2) best = lis.length - 1;
    if (best === litP) return; litP = best;
    flagUpTo(best);
  };
  // phones: the list sits under the tracker, so the flags run in on their own once the tracker is in view
  if (plist && sheet && innerWidth <= 860) {
    new IntersectionObserver((es, o) => {
      if (!es[0].isIntersecting) return; o.disconnect();
      [...plist.children].forEach((_, i) => setTimeout(() => flagUpTo(i), motion ? 500 + i * 650 : 0));
      setTimeout(() => plist.querySelectorAll('li').forEach(li => li.classList.add('on')), motion ? 500 + plist.children.length * 650 : 0);
    }, { threshold: .5 }).observe(sheet);
  }
  let navY = scrollY;
  const onScroll = () => {
    const vh = innerHeight;
    lightProblems(vh);
    nav.classList.toggle('scrolled', scrollY > 40);
    // the bar slips away while you read down and comes back the moment you scroll up (never while a menu is open)
    const y = scrollY, dy = y - navY;
    if (y < 160) { nav.classList.remove('away'); navY = y; }
    else if (Math.abs(dy) > 6) { nav.classList.toggle('away', dy > 0 && !document.querySelector('.nav .mega.open')); navY = y; }
    let night = false;
    if (nightSec && dawn) {
      const r = nightSec.getBoundingClientRect(), d = dawn.getBoundingClientRect();
      night = r.top < vh * .55 && d.top + d.height * .62 > vh * .5;
      drawDawn(motion ? clamp((vh - d.top) / (vh * .85)) : 1);
    }
    if (duskSec && duskSec.getBoundingClientRect().top < vh * .6) night = true;   // the close: day falls to night as the CTA arrives (statement included)
    root.classList.toggle('night', night);
    nav.classList.toggle('dark', night || foot.getBoundingClientRect().top < 64);
  };
  dawnSize();
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { dawnSize(); drawLines(); onScroll(); });
  onScroll();

  // ---------------------------------------------------------------- product panels build themselves when they come into view
  const STEPS = {
    gw(v, at) {   // the primary times out and traffic fails over to the fallback
      const [g, c] = v.querySelectorAll('.mdl');
      at(1700, () => { g.classList.remove('on'); g.classList.add('down'); g.querySelector('.sp').textContent = 'timeout'; });
      at(2100, () => { c.classList.add('on'); c.querySelector('.sp').textContent = 'serving'; });
    },
    ops(v, at) {  // build, eval gate, canary
      const dots = v.querySelectorAll('.steps span'), lines = v.querySelectorAll('.steps b'), tag = v.querySelector('.tag.gate');
      at(200, () => dots[0].classList.remove('next'));
      at(450, () => lines[0].classList.remove('next'));
      at(900, () => { dots[1].classList.remove('next'); tag.classList.remove('gate'); tag.classList.add('ok'); tag.textContent = 'Gate passed'; });
      at(1150, () => lines[1].classList.remove('next'));
      at(1400, () => { dots[2].classList.remove('next'); dots[2].classList.add('now'); });
    },
    dev(v, at) {  // pick a template, create the project
      const [rag] = v.querySelectorAll('.tpl > div'), b = v.querySelector('.go .b'), tag = v.querySelector('.tag.st');
      at(800, () => rag.classList.add('on'));
      at(1300, () => b.classList.add('press'));
      at(1480, () => { b.classList.remove('press'); b.textContent = 'Created'; tag.textContent = 'Ready'; tag.classList.add('ok'); });
    },
  };
  const at = motion ? (ms, f) => setTimeout(f, ms) : (ms, f) => f();
  const run = host => {
    host.classList.add('play');
    const v = host.querySelector('.vig'), k = v && v.dataset.k;
    if (k && STEPS[k]) STEPS[k](v, at);
  };
  const pio = new IntersectionObserver(es => es.forEach(en => {
    if (!en.isIntersecting) return;
    const host = en.target; pio.unobserve(host);
    // pieces in the same row start one after another, left to right
    const row = host.matches('.piece') ? [...document.querySelectorAll('.piece[data-k]')].filter(p => Math.abs(p.offsetTop - host.offsetTop) < 4) : [host];
    at(Math.max(0, row.indexOf(host)) * 180, () => run(host));
  }), { threshold: .45 });
  document.querySelectorAll('.cell, .tracker, .piece[data-k], .ucc-art').forEach(el => { if (el.querySelector('.vig')) pio.observe(el); });
  // hovering a piece replays its story from the start
  if (motion) document.querySelectorAll('.piece[data-k]').forEach(host => {
    const v = host.querySelector('.vig'); if (!v) return;   // pieces with a still illustration have nothing to replay
    const orig = v.innerHTML; let last = 0;
    host.addEventListener('mouseenter', () => {
      if (!host.classList.contains('play') || performance.now() - last < 2600) return;
      last = performance.now();
      host.classList.remove('play'); v.innerHTML = orig; void v.offsetWidth;
      requestAnimationFrame(() => run(host));
    });
  });

  // one stripe field behind What we build: drawn once, shown through every piece's window, rows rise from their own horizon
  const piecesEl = document.getElementById('pieces');
  const pieceField = () => {
    if (!piecesEl || piecesEl.querySelector('.art img')) return;   // the pieces now carry their own illustrations
    const sec = piecesEl.closest('section'), pr = piecesEl.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    const arts = [...piecesEl.querySelectorAll('.art')]; if (!arts.length) return;
    const W = pr.width, H = pr.height, cv = document.createElement('canvas'), c2 = cv.getContext('2d');
    cv.width = W * dpr; cv.height = H * dpr; c2.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = gridFor(sec), off = g.left - pr.left;
    const rows = {};
    arts.forEach(el => { const r = el.getBoundingClientRect(), t = Math.round(r.top - pr.top); (rows[t] = rows[t] || []).push(r); });
    Object.keys(rows).forEach((t, ri) => {
      const top = +t, bot = Math.max(...rows[t].map(r => r.bottom - pr.top)), hgt = bot - top;
      const cols = gridStripes(g.xs.map(x => x + off), g.cw, rng(77 + ri * 13), 0, true, DEVX, p0For(sec, g));
      c2.save(); c2.beginPath(); c2.rect(0, top, W, hgt); c2.clip(); c2.translate(0, bot - H);
      cols.forEach(c => drawCol(c2, c, H, (52 + 26 * c.hc) * (hgt > 1 ? 1 : 0), 0));
      c2.restore();
    });
    cv.toBlob(b => {
      if (!b) return;
      const url = URL.createObjectURL(b), old = piecesEl.dataset.field; piecesEl.dataset.field = url;
      const p2 = piecesEl.getBoundingClientRect();   // measure again: the page may have scrolled while the image was encoding
      arts.forEach(el => { const r = el.getBoundingClientRect(); el.style.backgroundImage = `url(${url})`; el.style.backgroundSize = `${W}px ${H}px`; el.style.backgroundPosition = `${-(r.left - p2.left)}px ${-(r.top - p2.top)}px`; });
      if (old) setTimeout(() => URL.revokeObjectURL(old), 1000);
    });
  };
  const paintAll = () => document.querySelectorAll('[data-stripes]').forEach((el, i) => paintStripes(el, 151 + i * 17));
  document.fonts.ready.then(paintAll);
  let psT; addEventListener('resize', () => { clearTimeout(psT); psT = setTimeout(paintAll, 150); });
  let pfT; addEventListener('resize', () => { clearTimeout(pfT); pfT = setTimeout(pieceField, 150); });
  document.fonts.ready.then(pieceField);
  // phones: What we build is a list; tapping a piece opens its panel and what it includes
  document.querySelectorAll('.piece[data-k] .pc-h').forEach(b => b.addEventListener('click', () => {
    if (!matchMedia('(max-width: 640px)').matches) return;
    const p = b.closest('.piece'), on = p.classList.toggle('open');
    b.setAttribute('aria-expanded', on);
    const im = p.querySelector('.art img'); if (on && im) im.loading = 'eager';   // a lazy image inside a closed panel never started loading
  }));

  // ---------------------------------------------------------------- questions: Ask devx (the v26 chat) on the soft devx field window.
  // Suggested questions, typed answers with the sections they come from; free text matches the answers' keywords.
  (() => {
    const art = document.getElementById('faq-art'), kbEl = document.getElementById('kb');
    if (!art || !kbEl) return;
    // v30 (Figma 564:21078): the window is the soft devx field with the hummingbird, laid out in CSS; nothing to paint

    const KB = JSON.parse(kbEl.textContent);
    const log = document.getElementById('chatlog'), sug = document.getElementById('chatsug'), form = document.getElementById('chatin');
    const asked = new Set(); let busy = false;
    const esc = t => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const ARW = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
    const chips = () => {
      const left = KB.filter(e => !asked.has(e.q)).slice(0, 4);
      sug.innerHTML = `<div class="sh2"><span>Suggested questions</span>${KB.length > asked.size ? '<button type="button" class="rand"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c.5 4.5 2 6.5 6.5 7-4.5.5-6 2.5-6.5 7-.5-4.5-2-6.5-6.5-7 4.5-.5 6-2.5 6.5-7z"/></svg><span>Surprise me</span></button>' : ''}</div>`
        + `<div class="qs">${left.map(e => `<button type="button" class="q" data-q="${esc(e.q)}"><span class="qt"><span class="cat">${esc(e.src[0][0])}</span>${esc(e.q)}</span><span class="go">${ARW}</span></button>`).join('')}</div>`;
    };
    const match = text => {
      const STOP = new Set('the and for are you your our can does what how who why when will with this that from have has not but was its get any all into out then than also about there their them they need want'.split(' '));
      const w = text.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(x => x.length > 2 && !STOP.has(x));
      let best = null, bs = 0;
      for (const e of KB) { const hay = (e.k + ' ' + e.q).toLowerCase(); let sc = 0; for (const x of w) if (hay.includes(x)) sc += x.length > 4 ? 2 : 1; if (sc > bs) { bs = sc; best = e; } }
      return bs >= 2 ? best : null;
    };
    const ask = (text, entry) => {
      if (busy) return; busy = true;
      log.innerHTML = '';   // one exchange at a time
      log.insertAdjacentHTML('beforeend', `<div class="msg-q">${esc(text)}</div>`);
      const e = entry || match(text);
      if (e) asked.add(e.q);
      const ans = e ? e.a : 'That one isn’t covered on this page. Book a platform review and a person on the platform team will answer it.';
      const row = document.createElement('div'); row.className = 'msg-a';
      row.innerHTML = `<span class="av"><svg viewBox="0 0 28.74 28.74" aria-hidden="true"><use href="#devx-mark"/></svg></span><div><span class="mstat"><b>devx</b><i class="spin"></i><em>Reading this page</em></span><p></p><div class="src">${e ? e.src.map(([n, h]) => `<a href="#">${esc(n)} ${ARW}</a>`).join('') : `<a href="#cta">Book a platform review ${ARW}</a>`}</div></div>`;
      log.appendChild(row);
      const p = row.querySelector('p'); let i = 0;
      const done = () => {
        p.textContent = ans; row.querySelector('.src').classList.add('on');
        const st = row.querySelector('.mstat'); st.classList.add('done');
        st.querySelector('em').textContent = e ? `Answered from ${e.src.length} section${e.src.length > 1 ? 's' : ''} on this page` : 'Not covered on this page';
        busy = false; chips();
      };
      if (!motion) { done(); return; }
      const step = () => { i += 3; p.innerHTML = esc(ans.slice(0, i)) + '<span class="cur"></span>'; if (i < ans.length) setTimeout(step, 18); else done(); };
      setTimeout(step, 380);
    };
    sug.addEventListener('click', ev => {
      const b = ev.target.closest('button'); if (!b) return;
      if (b.classList.contains('rand')) { const left = KB.filter(e => !asked.has(e.q)); const e = left[Math.random() * left.length | 0]; if (e) ask(e.q, e); }
      else { const e = KB.find(x => x.q === b.dataset.q); if (e) ask(e.q, e); }
    });
    form.addEventListener('submit', ev => { ev.preventDefault(); const v = form.q.value.trim(); if (!v) return; form.q.value = ''; ask(v); });
    chips();
    // open with the most-asked question already answered, so the window is never empty
    new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { o.disconnect(); ask(KB[0].q, KB[0]); } }, { threshold: .3 }).observe(log);
  })();

  // ---------------------------------------------------------------- use cases (Figma 453:1850): a row of cards that runs off the
  // right edge; previous and next move it a card at a time. jumpTo(number) brings the first card that moves it into view.
  const uc2 = document.getElementById('uc2');
  if (uc2) {
    const prev = document.querySelector('.uc-prev'), next = document.querySelector('.uc-next'), cards = [...uc2.querySelectorAll('.ucc')];
    const step = () => cards[0].getBoundingClientRect().width + parseFloat(getComputedStyle(uc2).columnGap || 16);
    const ends = () => { prev.disabled = uc2.scrollLeft < 4; next.disabled = uc2.scrollLeft > uc2.scrollWidth - uc2.clientWidth - 4; };
    prev.addEventListener('click', () => uc2.scrollBy({ left: -step(), behavior: motion ? 'smooth' : 'auto' }));
    next.addEventListener('click', () => uc2.scrollBy({ left: step(), behavior: motion ? 'smooth' : 'auto' }));
    uc2.addEventListener('scroll', ends, { passive: true }); addEventListener('resize', ends); ends();
    uc2.jumpTo = f => {
      const c = cards.find(x => x.dataset.c.split(' ').includes(f)); if (!c) return;
      uc2.scrollTo({ left: c.offsetLeft - cards[0].offsetLeft, behavior: motion ? 'smooth' : 'auto' });
      cards.forEach(x => x.classList.toggle('hl', x.dataset.c.split(' ').includes(f)));
      setTimeout(() => cards.forEach(x => x.classList.remove('hl')), 2400);
    };
  }

  // ---------------------------------------------------------------- outcomes: the report's sparklines draw in one after another;
  // each row's link jumps up to Use cases with that number already filtered
  const report = document.getElementById('report');
  if (report) {
    // the window behind the card: devx stripes on the page grid, rising from the window's bottom edge
    const outArt = document.getElementById('out-art');
    const paintOut = () => {
      const sec = outArt.closest('section'), r = outArt.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
      const cv = document.createElement('canvas'), c2 = cv.getContext('2d'); cv.width = r.width * dpr; cv.height = r.height * dpr; c2.setTransform(dpr, 0, 0, dpr, 0, 0);
      const g = gridFor(sec), cols = gridStripes(g.xs.map(x => x + g.left - r.left), g.cw, rng(131), 0, true, DEVX, p0For(sec, g));
      // softer than the other windows: each column fades from white at the top through its tint into a lightened devx colour,
      // no white blocks or fringes, then a light grain over everything
      const H = r.height, mixW = (hex, k) => { const n = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)); return `rgb(${n.map(v => Math.round(v + (255 - v) * k)).join(',')})`; };
      cols.forEach(c => {
        const start = (.05 + .22 * c.hc) * H, gr = c2.createLinearGradient(0, start, 0, H);
        gr.addColorStop(0, '#ffffff'); gr.addColorStop(.48, c.acc); gr.addColorStop(.86, mixW(c.base, .62)); gr.addColorStop(1, mixW(c.base, .42));
        c2.fillStyle = '#ffffff'; c2.fillRect(c.x, 0, c.w + .6, start + 1);
        c2.fillStyle = gr; c2.fillRect(c.x, start, c.w + .6, H - start);
      });
      const id = c2.getImageData(0, 0, cv.width, cv.height), px = id.data, nr = rng(7);
      for (let q = 0; q < px.length; q += 4) { const d = (nr() - .5) * 14; px[q] += d; px[q + 1] += d; px[q + 2] += d; }
      c2.putImageData(id, 0, 0);
      cv.toBlob(b => { if (!b) return; const u = URL.createObjectURL(b), old = outArt.dataset.u; outArt.dataset.u = u; outArt.style.backgroundImage = `url(${u})`; outArt.style.backgroundSize = '100% 100%'; if (old) URL.revokeObjectURL(old); });
    };
    document.fonts.ready.then(paintOut);
    let poT; addEventListener('resize', () => { clearTimeout(poT); poT = setTimeout(paintOut, 150); });
    // hovering a definition focuses its row in the card
    document.querySelectorAll('.od').forEach(od => {
      const row = report.querySelector(`.rp-r[data-f="${od.dataset.f}"]`);
      od.addEventListener('mouseenter', () => { report.classList.add('focusing'); row.classList.add('focus'); });
      od.addEventListener('mouseleave', () => { report.classList.remove('focusing'); row.classList.remove('focus'); });
    });
    if (!motion) report.classList.add('play');
    else { const rio = new IntersectionObserver(es => { if (es[0].isIntersecting) { report.classList.add('play'); rio.disconnect(); } }, { threshold: .35 }); rio.observe(report); }
    document.querySelectorAll('#outcomes .rp-l[data-filter]').forEach(a => a.addEventListener('click', e => {
      const table = document.getElementById('uc2');
      if (!table) return;
      e.preventDefault();
      table.jumpTo(a.dataset.filter);
      scrollTo({ top: table.getBoundingClientRect().top + scrollY - 150, behavior: motion ? 'smooth' : 'auto' });
    }));
  }

  // ---------------------------------------------------------------- outcomes (v29): four glass cards pick the reading in the panel;
  // like antimetal's Patrol they advance on their own while the section is in view, until someone picks one
  // the Figma field is nine 160px columns: scale it so each one is a grid column (two on phones) and its seams sit on the grid lines
  const field = document.querySelector('.out-bg');
  if (field) {
    const fit = () => {
      const sec = field.parentElement, g = gridFor(sec);
      if (!g.cw) return;
      const r = sec.getBoundingClientRect(), mid = r.width / 2, col = g.cw * (innerWidth < 960 ? 2 : 1);
      field.style.backgroundSize = `${col * 9}px 100%`;
      field.style.backgroundPosition = `${mid - col * 4}px 0`;   // field column 4 starts on the centre line
    };
    fit(); addEventListener('resize', fit); addEventListener('load', fit);
  }
  const patrol = document.querySelector('.out-patrol');
  if (patrol) {
    const tabs = [...patrol.querySelectorAll('.oi')], pans = [...patrol.querySelectorAll('.opn')], DUR = 6000;
    let cur = 0, timer = 0, auto = motion, seen = false;
    const pick = k => {
      cur = k;
      tabs.forEach((t, i) => { t.classList.toggle('on', i === k); t.setAttribute('aria-selected', i === k); });
      pans.forEach((p, i) => { const on = i === k; p.hidden = !on; p.classList.remove('on'); if (on) { void p.offsetWidth; p.classList.add('on'); } });
      if (auto) { patrol.classList.remove('auto'); void patrol.offsetWidth; patrol.classList.add('auto'); clearTimeout(timer); timer = setTimeout(() => pick((cur + 1) % tabs.length), DUR); }
    };
    patrol.style.setProperty('--odur', DUR / 1000 + 's');
    tabs.forEach((t, k) => t.addEventListener('click', () => { auto = false; clearTimeout(timer); patrol.classList.remove('auto'); pick(k); }));
    patrol.addEventListener('keydown', ev => {   // arrow keys move between the four, as tabs should
      const d = ev.key === 'ArrowDown' || ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowUp' || ev.key === 'ArrowLeft' ? -1 : 0;
      if (!d || !ev.target.closest('.oi')) return;
      ev.preventDefault(); auto = false; clearTimeout(timer); patrol.classList.remove('auto');
      const k = (cur + d + tabs.length) % tabs.length; pick(k); tabs[k].focus();
    });
    // the first reading draws when the section arrives; auto-advance pauses while it is out of view
    new IntersectionObserver(es => es.forEach(en => {
      if (en.isIntersecting) { if (!seen) { seen = true; pick(0); } else if (auto) pick(cur); }
      else { clearTimeout(timer); patrol.classList.remove('auto'); }
    }), { threshold: .3 }).observe(patrol);
    pans.forEach(p => p.classList.remove('on'));   // nothing draws until the section is seen
    if (!motion) pick(0);
    // "N use cases move this" filters Use cases and scrolls up to it
    patrol.querySelectorAll('.ol[data-filter]').forEach(a => a.addEventListener('click', e => {
      const table = document.getElementById('uc2');
      if (!table) return;
      e.preventDefault(); table.jumpTo(a.dataset.filter);
      scrollTo({ top: table.getBoundingClientRect().top + scrollY - 150, behavior: motion ? 'smooth' : 'auto' });
    }));
  }

  // ---------------------------------------------------------------- how we work: a "now" marker walks the twelve weeks as you scroll;
  // each phase bar fills as it passes, and the phase's deliverable plays when its bar completes
  const tl = document.getElementById('tl');
  if (tl) {
    const rows = [...tl.querySelectorAll('.tl-row')], nowEl = document.getElementById('tl-now'), nowLb = nowEl.querySelector('em');
    const sE = rows.map(r => [+r.dataset.s, +r.dataset.e]);
    const finish = (r, i) => { if (r.classList.contains('done')) return; r.classList.add('done'); r.querySelector('.tl-bar i').style.setProperty('--f', 1); run(r.querySelector('.tl-doc')); };
    let lastX = -1;
    const update = () => {
      const narrow = innerWidth < 640;
      if (!motion || narrow) {   // phones and reduced motion: each phase completes as it comes into view
        nowEl.style.display = 'none';
        rows.forEach((r, i) => { if (!motion || r.getBoundingClientRect().top < innerHeight * .75) finish(r, i); });
        return;
      }
      nowEl.style.display = '';
      const mid = innerHeight * .55, ys = rows.map(r => r.querySelector('.tl-bar').getBoundingClientRect().top - mid);
      // anchors, each as "how far below the middle it still is" (shrinks as you scroll): the marker leaves week 0 when the
      // first bar is 260px below the middle, and reaches the end of bar k as bar k crosses the middle
      const r = [ys[0] - 260, ...ys], xs = [0, ...sE.map(se => se[1])];
      let x;
      if (r[0] > 0) x = 0;
      else if (r[r.length - 1] <= 0) x = 6;
      else for (let k = 0; k < r.length - 1; k++) if (r[k] <= 0 && 0 <= r[k + 1]) { x = xs[k] + (xs[k + 1] - xs[k]) * (-r[k]) / (r[k + 1] - r[k]); break; }
      x = Math.max(0, Math.min(6, x));
      // the week pill rides down its line, held just under the nav, so the current week stays in view
      const nr = nowEl.getBoundingClientRect();
      nowLb.style.top = `${Math.max(-24, Math.min(nr.height - 26, 84 - nr.top)).toFixed(1)}px`;
      if (Math.abs(x - lastX) < .002) return; lastX = x;
      const W = tl.getBoundingClientRect().width;
      nowEl.style.transform = `translateX(${(x / 6 * W).toFixed(1)}px)`;
      nowLb.textContent = `Week ${Math.min(12, Math.round(x * 2))}${x >= 5.98 ? '+' : ''}`;
      // the pill slides from centred to right-aligned near the end (and left-aligned at the start), so it never leaves the page
      const sh = x < .5 ? -50 * x / .5 : x > 5.5 ? -50 - 50 * (x - 5.5) / .5 : -50;
      nowLb.style.transform = `translate(${sh.toFixed(1)}%, 0)`;
      rows.forEach((r, i) => {
        const [s0, e0] = sE[i], f = clamp((x - s0) / (e0 - s0));
        r.querySelector('.tl-bar i').style.setProperty('--f', f.toFixed(3));
        if (f > .995) finish(r, i);
      });
    };
    addEventListener('scroll', update, { passive: true });   // cheap: a few rects and style writes, guarded by lastX
    addEventListener('resize', () => { lastX = -1; update(); });
    update();
  }

  // menus: one open at a time; click outside or Esc closes
  const btns = [...document.querySelectorAll('[data-menu]')];
  const close = () => btns.forEach(b => { b.setAttribute('aria-expanded', 'false'); document.getElementById(b.dataset.menu).classList.remove('open'); });
  btns.forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const open = b.getAttribute('aria-expanded') === 'true';
    close();
    if (!open) { b.setAttribute('aria-expanded', 'true'); document.getElementById(b.dataset.menu).classList.add('open'); }
  }));
  document.addEventListener('click', e => { if (!e.target.closest('.mega')) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  document.querySelectorAll('.mega a').forEach(a => a.addEventListener('click', close));

  // ---------------------------------------------------------------- headings resolve from square pixels
  const heads = [...document.querySelectorAll('[data-px]')];
  function prep(h) {
    const text = h.textContent.trim();
    h.textContent = '';
    const sr = document.createElement('span'); sr.className = 'sr'; sr.textContent = text;
    const vis = document.createElement('span'); vis.setAttribute('aria-hidden', 'true');
    text.split(' ').forEach((word, wi, all) => {
      const w = document.createElement('span'); w.className = h.dataset.mute && wi >= +h.dataset.mute ? 'w mute' : 'w';
      for (const ch of word) { const c = document.createElement('span'); c.className = 'ch'; c.innerHTML = `<span class="lt">${ch}</span>`; w.append(c); }
      vis.append(w); if (wi < all.length - 1) vis.append(' ');
    });
    h.append(sr, vis); h.classList.add('px');
  }
  function play(h, delay = 0) {
    if (h.dataset.played) return; h.dataset.played = 1;
    const cs = getComputedStyle(h), fs = parseFloat(cs.fontSize);
    const font = `${cs.fontWeight} ${fs}px ${cs.fontFamily}`;
    const cell = Math.max(3, Math.round(fs / 9.5));
    const cv = document.createElement('canvas'), ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.font = font;
    const m = ctx.measureText('Hg'), asc = m.fontBoundingBoxAscent, desc = m.fontBoundingBoxDescent;
    [...h.querySelectorAll('.ch')].forEach((c, i) => {
      const r = c.getBoundingClientRect(), w = Math.ceil(r.width) + 2, hh = Math.ceil(r.height);
      cv.width = w; cv.height = hh;
      ctx.font = font; ctx.fillStyle = ctx.strokeStyle = '#000'; ctx.lineWidth = fs * .022;
      const by = (hh - (asc + desc)) / 2 + asc;
      ctx.fillText(c.textContent, 0, by); ctx.strokeText(c.textContent, 0, by);
      const d = ctx.getImageData(0, 0, w, hh).data;
      let rects = '';
      for (let y = 0; y < hh; y += cell) for (let x = 0; x < w; x += cell) {
        let on = 0, tot = 0;
        for (let yy = y; yy < Math.min(hh, y + cell); yy++) for (let xx = x; xx < Math.min(w, x + cell); xx++) { tot++; if (d[(yy * w + xx) * 4 + 3] > 110) on++; }
        if (on / tot > .36) rects += `<rect x="${x + .5}" y="${y + .5}" width="${cell - 1}" height="${cell - 1}" rx="${cell > 5 ? 1 : 0}" fill="currentColor" style="--rd:${Math.round(Math.random() * 160)}ms"/>`;
      }
      c.insertAdjacentHTML('beforeend', `<svg width="${w}" height="${hh}" viewBox="0 0 ${w} ${hh}">${rects}</svg>`);
      const t0 = delay + i * 22 + Math.random() * 70;
      setTimeout(() => c.classList.add('on'), t0);
      setTimeout(() => c.classList.add('done'), t0 + 360);
    });
  }
  if (motion) {
    heads.forEach(prep);
    const hio = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting && en.target.dataset.px !== 'hero') { play(en.target); hio.unobserve(en.target); } }), { threshold: .6 });
    document.fonts.ready.then(() => heads.forEach(h => hio.observe(h)));
  }

  // reveal
  const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.rv').forEach(el => io.observe(el));

  // ---------------------------------------------------------------- hero: the shared grid draws the lines and places the stripes
  const hero = document.getElementById('top');

  // the stripes: every grid column split into a wide and a narrow band, rising behind the console like a horizon
  const stage = document.querySelector('.stage'), fcv = document.getElementById('field');
  let readyAt = Infinity;
  if (stage && fcv) {
    const fctx = fcv.getContext('2d');
    const ptr = { x: -1e4, y: -1e4, on: 0, want: 0 };
    let W = 0, H = 0, cols = [], running = false, visible = true;
    const size = () => {
      const r = stage.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
      W = r.width; H = r.height; fcv.width = W * dpr; fcv.height = H * dpr; fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const { xs, cw } = gridFor(hero);
      // the column that starts at the content's left edge is blue; then pink, orange, green, repeating
      const wl = hero.querySelector('.wrap').getBoundingClientRect().left - hero.getBoundingClientRect().left;
      const p0 = Math.max(0, xs.findIndex(x => Math.abs(x - wl) < 2));
      cols = gridStripes(xs, cw, rng(3), .1, true, DEVX, p0);
      cols.forEach(c => { c.h0 = Math.min(.99, .76 + c.hc * .2 + (c.k - .5) * .1); });
    };
    hero.addEventListener('pointermove', e => { const r = stage.getBoundingClientRect(); ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; ptr.want = 1; });
    hero.addEventListener('pointerleave', () => { ptr.want = 0; });
    const frame = now => {
      const g = motion ? outCubic(clamp((now - readyAt) / 1600)) : 1;
      ptr.on += (ptr.want - ptr.on) * .06;
      fctx.clearRect(0, 0, W, H);
      for (const c of cols) {
        const dx = c.cx - ptr.x;   // the whole grid column leans together
        const bump = ptr.on * Math.exp(-dx * dx / (2 * 170 * 170));
        const want = g * (c.h0 * (1 - .2 * bump) + (motion ? .015 * Math.sin(now * .0008 + c.ph) : 0));
        c.h += (want - c.h) * (motion ? .07 : 1);
        drawCol(fctx, c, H, Math.min(1, c.h) * H, .7);
      }
      if (ptr.on > .01) {   // pixel spotlight under the cursor, on a fixed grid so the squares never swim
        const R = 120, P = 7;
        for (let gy = Math.floor((ptr.y - R) / P) * P; gy < ptr.y + R; gy += P) for (let gx = Math.floor((ptr.x - R) / P) * P; gx < ptr.x + R; gx += P) {
          const dd = Math.hypot(gx - ptr.x, gy - ptr.y); if (dd > R) continue;
          fctx.fillStyle = `rgba(20,22,46,${(Math.pow(1 - dd / R, 2) * .36 * ptr.on).toFixed(3)})`;
          fctx.fillRect(gx - 1.25, gy - 1.25, 2.5, 2.5);
        }
      }
      if (motion && visible && !document.hidden) requestAnimationFrame(frame); else running = false;
    };
    const start = () => { if (!running) { running = true; requestAnimationFrame(frame); } };
    size(); drawLines();
    addEventListener('resize', () => { size(); start(); });
    new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) start(); }).observe(stage);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
    start();
  }

  if (!(stage && fcv)) drawLines();   // a hero without the stripe stage still needs the page's grid lines

  // ---------------------------------------------------------------- console: drawn as a wireframe over the stripes, then filled in
  const con = document.getElementById('console');
  const wireframe = () => {
    const cr = con.getBoundingClientRect(), R = el => { const r = el.getBoundingClientRect(); return [r.left - cr.left, r.top - cr.top, r.width, r.height]; };
    const parts = [], add = (d, wd) => parts.push(`<path d="${d}" style="--wd:${wd}s"/>`);
    const w = cr.width, h = cr.height, rr = 16;
    add(`M${rr} .5H${w - rr}A${rr - .5} ${rr - .5} 0 0 1 ${w - .5} ${rr}V${h - rr}A${rr - .5} ${rr - .5} 0 0 1 ${w - rr} ${h - .5}H${rr}A${rr - .5} ${rr - .5} 0 0 1 .5 ${h - rr}V${rr}A${rr - .5} ${rr - .5} 0 0 1 ${rr} .5Z`, 0);
    const rail = con.querySelector('.con-rail');
    if (rail && rail.offsetWidth) {
      const [rx, , rw] = R(rail); add(`M${rx + rw} 0V${h}`, .15);
      [...rail.querySelectorAll('a, .who')].filter(el => el.offsetHeight).forEach((a, i) => { const [x, y, , ah] = R(a); add(`M${x + 8} ${y + ah / 2}H${x + 8 + 70 + (i * 37) % 50}`, .3 + i * .04); });
    }
    const [tx, ty, tw, th] = R(con.querySelector('.con-top')); add(`M${tx} ${ty + th + 6}H${tx + tw}`, .25);
    con.querySelectorAll('.msg, .sum > div').forEach((m, i) => { const [x, y, mw, mh] = R(m); add(`M${x + 10} ${y}H${x + mw - 10}Q${x + mw} ${y} ${x + mw} ${y + 10}V${y + mh - 10}Q${x + mw} ${y + mh} ${x + mw - 10} ${y + mh}H${x + 10}Q${x} ${y + mh} ${x} ${y + mh - 10}V${y + 10}Q${x} ${y} ${x + 10} ${y}Z`, .35 + i * .08); });
    const [lx, ly, lw] = R(con.querySelector('.trace'));
    for (let i = 0; i < 5; i++) { const y = ly + 17 + i * 34; add(`M${lx + 9} ${y - 7}a7 7 0 1 0 .01 0M${lx + 30} ${y}H${lx + 30 + 120 + (i * 53) % 90}M${lx + lw - 40} ${y}H${lx + lw}`, .45 + i * .07); }
    // two small circles in the top corners, as on a drafting sheet
    add(`M22 14a4 4 0 1 0 .01 0M${w - 22} 14a4 4 0 1 0 .01 0`, .1);
    con.insertAdjacentHTML('afterbegin', `<svg class="wireframe" viewBox="0 0 ${w} ${h}" aria-hidden="true">${parts.join('')}</svg>`);
    con.querySelectorAll('.wireframe path').forEach(p => p.style.setProperty('--len', Math.ceil(p.getTotalLength() + 2)));
  };

  // one request, told step by step; two scenarios alternate
  const SC = [
    { uc: 0, title: 'Claims assistant · production', who: 'Adjuster', q: 'Summarise claim 48213 and flag anything unusual.',
      steps: [['Authenticated', 'team Claims', '4 ms'], ['Policy check', '2 PII fields redacted', '11 ms'], ['Routed to Gemini', 'primary model', '300 ms', 'timed out at budget'],
        ['Failed over to Claude', 'fallback in policy', '297 ms'], ['Logged and metered', 'team budget 64%', '']],
      a: 'Water damage to the kitchen. The repair estimate is 2.4× the regional median, so I flagged it for review.',
      sum: [['612 ms', 'in budget'], ['$0.004', ''], ['Fallback', '']] },
    { uc: 1, title: 'Service copilot · production', who: 'Customer', q: 'Where is my replacement card?',
      steps: [['Authenticated', 'team Service', '3 ms'], ['Policy check', 'no PII in prompt', '9 ms'], ['Semantic cache hit', 'answered from cache', '26 ms'], ['Logged and metered', 'team budget 41%', '']],
      a: 'It shipped yesterday by courier and should arrive by Thursday.',
      sum: [['38 ms', 'in budget'], ['$0.0001', ''], ['Cache', '']] },
  ];
  const $ = id => document.getElementById(id), wait = ms => new Promise(r => setTimeout(r, ms));
  const type = async (el, text, ms) => { el.classList.add('typing'); el.textContent = ''; for (const ch of text) { el.textContent += ch; await wait(ms); } el.classList.remove('typing'); };
  const li = (st, cls, detail) => `<li class="${cls}"><i class="dot"></i><b>${st[0]}</b><span>${detail}</span><em>${cls === 'run' ? '' : st[2]}</em></li>`;
  const setRail = uc => con.querySelectorAll('.con-rail a[data-uc]').forEach(a => a.classList.toggle('on', +a.dataset.uc === uc));
  const setSum = sc => { const bs = $('c-sum').querySelectorAll('b'); sc.sum.forEach(([v, n], i) => { bs[i].innerHTML = v + (n ? `<em>${n}</em>` : ''); }); };
  const still = sc => {   // the finished frame, for reduced motion and as the resting state
    setRail(sc.uc); $('c-title').textContent = sc.title; $('c-who').textContent = sc.who; $('c-q').textContent = sc.q; $('c-a').textContent = sc.a;
    $('c-trace').innerHTML = sc.steps.map(st => li(st, st[3] ? 'warn' : 'ok', st[3] || st[1])).join('');
    setSum(sc); $('c-sum').classList.add('on');
  };
  // the story loop; a newer run (a provider toggled) cancels the one in progress
  let runId = 0;
  const down = new Set();
  const ORDER = [['Gemini', 'primary model', 300], ['Claude', 'fallback in policy', 297], ['GPT', 'second fallback', 341], ['Llama', 'open-weight, in your VPC', 362]];
  const custom = () => {   // the Claims request, routed around whichever providers are down
    const steps = [['Authenticated', 'team Claims', '4 ms'], ['Policy check', '2 PII fields redacted', '11 ms']];
    const skipped = ORDER.filter(([m]) => down.has(m)).map(([m]) => m), up = ORDER.find(([m]) => !down.has(m));
    if (skipped.length) steps.push([`Skipped ${skipped.join(', ')}`, 'provider down', '0 ms', 'down, routed around']);
    if (up) steps.push([`Routed to ${up[0]}`, up[1], `${up[2]} ms`]);
    else steps.push(['No model available', '', '', 'every provider down, request queued']);
    steps.push(['Logged and metered', 'team budget 64%', '']);
    const lat = 15 + (up ? up[2] : 0);
    return { uc: 0, title: 'Claims assistant · production', who: 'Adjuster', q: 'Summarise claim 48213 and flag anything unusual.', steps,
      a: up ? `Water damage to the kitchen. The repair estimate is 2.4× the regional median, so I flagged it for review. (Answered by ${up[0]}.)`
            : 'Every provider is down, so the request is queued and the on-call engineer has been paged.',
      sum: up ? [[`${lat} ms`, 'in budget'], ['$0.004', ''], [up[0] === 'Gemini' ? 'Primary' : `Fallback`, '']] : [['Queued', ''], ['$0', ''], ['None', '']] };
  };
  const playOne = async (sc, my, fast = false) => {
    const tr = $('c-trace'), live = () => my === runId;
    setRail(sc.uc); $('c-title').textContent = sc.title; $('c-who').textContent = sc.who;
    $('c-a').textContent = ''; tr.innerHTML = ''; $('c-sum').classList.remove('on');
    $('c-story').classList.remove('out');
    if (fast) $('c-q').textContent = sc.q;   // a provider was switched: replay from the routing step, no retyping
    else { $('c-q').textContent = ''; for (const ch of sc.q) { if (!live()) return false; $('c-q').textContent += ch; await wait(22); } await wait(250); }
    for (const [k, st] of sc.steps.entries()) {
      if (!live()) return false;
      if (fast && k < 2) { tr.insertAdjacentHTML('beforeend', li(st, 'ok', st[1])); tr.lastElementChild.style.animation = 'none'; continue; }
      tr.insertAdjacentHTML('beforeend', li(st, 'run', '…'));
      const row = tr.lastElementChild;
      await wait(fast ? (st[3] ? 520 : 300) : (st[3] ? 900 : 380)); if (!live()) return false;
      row.outerHTML = li(st, st[3] ? 'warn' : 'ok', st[3] || st[1]);
      tr.lastElementChild.style.animation = 'none';
      await wait(160);
    }
    for (const ch of sc.a) { if (!live()) return false; $('c-a').textContent += ch; await wait(fast ? 5 : 12); }
    setSum(sc); $('c-sum').classList.add('on');
    await wait(7000); if (!live()) return false;
    $('c-story').classList.add('out'); await wait(450);
    return live();
  };
  const story = async (fast = false) => {
    const my = ++runId;
    for (let n = 0; ; n++) if (!(await playOne(down.size ? custom() : SC[n % SC.length], my, fast && n === 0))) return;
  };
  // the toy: take a provider down and the next request routes around it
  document.querySelectorAll('.prov button').forEach(b => b.addEventListener('click', () => {
    const m = b.dataset.m, on = !down.has(m);
    on ? down.add(m) : down.delete(m); b.setAttribute('aria-pressed', on); b.title = `Switch ${m} ${on ? 'on' : 'off'}`;
    if (!con || !con.classList.contains('filled')) return;
    if (!motion) { still(custom()); return; }
    story(true);
  }));

  // page links are held (placeholders), but chips that name a piece jump to it
  document.querySelectorAll('a[href^="#piece-"]').forEach(a => a.addEventListener('click', () => document.querySelector(a.getAttribute('href'))?.scrollIntoView({ behavior: motion ? 'smooth' : 'auto' })));
  // ---------------------------------------------------------------- hero illustration: scale the frame to its column; the live route moves between the models
  const gwx = document.getElementById('gwx');
  if (gwx) {
    const gc = gwx.querySelector('.gw-c'), rows = [...gwx.querySelectorAll('.gw-dots .row rect')], rts = [...gwx.querySelectorAll('.gw-dots .rt')], cards = [...gwx.querySelectorAll('.gw-m')];
    const fit = () => gc.style.setProperty('--gs', (gwx.getBoundingClientRect().width / (+gc.dataset.w || 1232)).toFixed(4));
    const STOPS = [[145, 119, 214], [251, 136, 171], [255, 117, 78]];   // #9177d6 → #fb88ab → #ff754e, as in the frame
    const at = t => { const k = t < .55 ? 0 : 1, u = k ? (t - .55) / .45 : t / .55, a = STOPS[k], b = STOPS[k + 1]; return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * u)).join(',')})`; };
    let cur = -1;
    const pick = m => {
      if (m === cur) return; cur = m;
      const path = rows.concat([...rts[m].children]);
      gwx.querySelectorAll('.gw-dots rect.on').forEach(r => r.classList.remove('on'));
      path.forEach((r, i) => { r.classList.add('on'); r.style.setProperty('--c', at(i / (path.length - 1))); });
      cards.forEach((c, i) => c.classList.toggle('on', i === m));
    };
    fit(); pick(0);
    addEventListener('resize', fit);
    // an industry page runs the route from its desk tabs (industry.js)
    window.dxRoute = m => { if (m < 0) { cur = -1; gwx.querySelectorAll('.gw-dots rect.on').forEach(r => r.classList.remove('on')); cards.forEach(c => c.classList.remove('on')); } else pick(m); };
    // every few seconds the gateway sends the next request somewhere else; it stays on Claude without motion
    if (motion && !document.getElementById('desks')) { let n = 0; setInterval(() => { if (document.hidden) return; n = (n + 1) % 4; pick(n); }, 3600); }
  }

  // ---------------------------------------------------------------- client stories: a carousel, one client per slide. The left and right
  // buttons (or arrow keys, or a swipe) slide the track; the incoming slide's After card wipes in and its number counts up.
  const sx = document.querySelector('.sx');
  if (sx) {
    const track = document.getElementById('sx-track'), ps = [...track.querySelectorAll('.sx-p')];
    const prev = document.querySelector('#stories .sx-prev'), next = document.querySelector('#stories .sx-next'), num = document.getElementById('sx-n');
    let cur = 0;
    const count = b => {   // the number counts up to itself: "−31%", "82%", "6 weeks"
      const m = b.dataset.n.match(/^(\D*)(\d+)(.*)$/);
      if (!m || !motion) return;
      const to = +m[2], t0 = performance.now();
      const step = t => { const k = Math.min(1, (t - t0) / 1000); b.textContent = m[1] + Math.round(to * (1 - Math.pow(1 - k, 3))) + m[3]; if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    };
    const go = k => {
      k = Math.max(0, Math.min(ps.length - 1, k));
      if (k === cur) return;
      const dir = k > cur ? 1 : -1;
      cur = k;
      track.style.transform = `translateX(${-100 * k}%)`;
      ps.forEach((p, j) => { p.classList.toggle('on', j === k); if (j === k) p.removeAttribute('aria-hidden'); else p.setAttribute('aria-hidden', 'true'); p.inert = j !== k; });
      prev.disabled = k === 0; next.disabled = k === ps.length - 1; num.textContent = k + 1;
      count(ps[k].querySelector('.sx-big b'));
      // the side field flows with the slides: out the way the cards leave, back in from the side the next one comes from
      const fld = document.querySelector('#stories .sf.on > i');
      if (fld && motion) fld.animate([{ transform: 'none', opacity: 1 }, { transform: `translateX(${-dir * 38}vw)`, opacity: 0, offset: .42 },
        { transform: `translateX(${dir * 30}vw)`, opacity: 0, offset: .43 }, { transform: 'none', opacity: 1 }], { duration: 1150, easing: 'ease-in-out' });
    };
    ps.forEach((p, j) => { p.inert = j !== 0; });
    prev.addEventListener('click', () => go(cur - 1));
    next.addEventListener('click', () => go(cur + 1));
    sx.addEventListener('keydown', ev => { const d = ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0; if (d) { ev.preventDefault(); go(cur + d); } });
    let x0 = null;   // a horizontal swipe moves one slide
    sx.addEventListener('pointerdown', ev => { if (ev.pointerType !== 'mouse') x0 = ev.clientX; });
    sx.addEventListener('pointerup', ev => { if (x0 === null) return; const dx = ev.clientX - x0; x0 = null; if (Math.abs(dx) > 48) go(cur + (dx < 0 ? 1 : -1)); });
    if (!motion) sx.classList.add('seen');
    new IntersectionObserver(es => {
      if (es[0].isIntersecting && !sx.classList.contains('seen')) { sx.classList.add('seen'); count(ps[cur].querySelector('.sx-big b')); }
    }, { threshold: .35 }).observe(sx);
  }

  // ---------------------------------------------------------------- the line (v26's big type): letters scramble in through mono glyphs in
  // the devx colours and settle; while it is on screen a letter now and then glitches; when it leaves, it scrambles out
  const scr = document.getElementById('scr');
  if (scr) {
    const lines = scr.dataset.lines.split('|'), G = '$#%&0123456789/<>*', AC = DEVX.map(d => d[0]);
    scr.innerHTML = lines.map((l, li) => [...l].map(c => c === ' ' ? ' ' : `<span class="ch" data-c="${c}" aria-hidden="true">${c}</span>`).join('') + (li < lines.length - 1 ? '<br>' : '')).join('');
    const chs = [...scr.querySelectorAll('.ch')], first = lines[0].replace(/ /g, '').length;
    chs.slice(first, first + 3).forEach(c => c.classList.add('it'));   // "run" in italic
    let timers = [], loop = 0;
    const clear = () => { timers.forEach(clearTimeout); timers = []; clearInterval(loop); loop = 0; };
    const glitch = (c, n, step, end) => {
      const tick = () => {
        if (n-- > 0) { c.textContent = G[Math.random() * G.length | 0]; c.style.setProperty('--gc', AC[Math.random() * 4 | 0]); c.classList.add('gl'); timers.push(setTimeout(tick, step)); }
        else { c.classList.remove('gl'); end(c); }
      };
      tick();
    };
    const settle = c => { c.textContent = c.dataset.c; c.classList.remove('off'); };
    const vanish = c => { c.textContent = c.dataset.c; c.classList.add('off'); };
    const scrIn = () => {
      clear();
      chs.forEach((c, i) => { c.classList.add('off'); timers.push(setTimeout(() => { c.classList.remove('off'); glitch(c, 6 + (Math.random() * 10 | 0), 55, settle); }, i * 35)); });
      loop = setInterval(() => glitch(chs[Math.random() * chs.length | 0], 5, 70, settle), 1400);
    };
    const scrOut = () => {
      clear();
      chs.forEach((c, i) => timers.push(setTimeout(() => glitch(c, 3 + (Math.random() * 5 | 0), 45, vanish), (chs.length - i) * 18)));
    };
    if (motion) {
      chs.forEach(c => c.classList.add('off'));
      let shown = false;
      new IntersectionObserver(es => es.forEach(en => {
        if (en.isIntersecting && !shown) { shown = true; scrIn(); }
        else if (!en.isIntersecting && shown) { shown = false; scrOut(); }
      }), { threshold: .25 }).observe(scr);
    }
  }

  // ---------------------------------------------------------------- side fields: slide in once the section is a fifth into view, then stay
  const sfs = document.querySelectorAll('.sf');
  if (sfs.length) {
    const sfo = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('on'); sfo.unobserve(en.target); } }), { rootMargin: '0px 0px -20% 0px' });
    sfs.forEach(el => sfo.observe(el));
  }

  // ---------------------------------------------------------------- readiness check: five questions, scored in the page
  // The result card fills in as you answer. Once all five are in, the question card becomes "where we would start"
  // with the one primary action, and the result card shows the plan: start with, then, later.
  const rcEl = document.getElementById('rc');
  if (rcEl) {
    const Q = JSON.parse(document.getElementById('check-data').textContent), ans = Q.map(() => null);
    let at = 0, editing = false;
    const el = id => document.getElementById(id);
    const ico = f => { const sv = rcEl.querySelector(`.rc-bars li[data-f="${f}"] svg`); return sv ? sv.outerHTML : ''; };
    const show = () => {
      const q = Q[at], done = ans.every(v => v !== null), finished = done && !editing;
      el('rc-ask').hidden = finished; el('rc-done').hidden = !finished; rcEl.classList.toggle('done', finished);
      el('rc-n').textContent = `Question ${at + 1} of ${Q.length}`;
      el('rc-pb').style.width = `${ans.filter(v => v !== null).length / Q.length * 100}%`;
      el('rc-qt').textContent = q.q;
      const opts = el('rc-opts'); opts.dataset.f = q.f;
      opts.innerHTML = q.o.map((o, v) => `<button type="button" data-v="${v}" class="${ans[at] === v ? 'picked' : ''}" aria-pressed="${ans[at] === v}"><i></i>${o}</button>`).join('');
      el('rc-back').hidden = at === 0;
      score();
    };
    const score = () => {
      const got = ans.filter(v => v !== null), total = got.reduce((t, v) => t + v, 0), done = got.length === Q.length;
      rcEl.classList.toggle('scored', got.length > 0);
      el('rc-score').textContent = got.length ? total : '–';
      el('rc-level').textContent = !got.length ? 'Your score appears as you answer.'
        : !done ? `${Q.length - got.length} question${Q.length - got.length > 1 ? 's' : ''} to go`
        : total <= 3 ? 'Pilot stage' : total <= 7 ? 'Getting there' : 'Ready to scale';
      rcEl.querySelectorAll('.rc-bars li').forEach(li => {
        const idx = Q.map((q, k) => q.f === li.dataset.f && ans[k] !== null ? k : -1).filter(k => k >= 0);
        const v = idx.length ? idx.reduce((t, k) => t + ans[k], 0) / (2 * idx.length) : 0;
        li.querySelector('b').style.setProperty('--v', `${Math.max(idx.length ? 6 : 0, v * 100)}%`);
      });
      // the plan: weakest answers first, as start with, then, later
      const gaps = Q.map((q, k) => [q, ans[k]]).filter(([, v]) => v !== null && v < 2).sort((x, y) => x[1] - y[1]).slice(0, 3);
      el('rc-plan').hidden = !done;
      el('rc-pl').innerHTML = gaps.length ? gaps.map(([q]) => `<li data-f="${q.f}">${ico(q.f)}<b>${q.piece}</b><em>${q.w}</em></li>`).join('')
        : '<li class="none"><b>No big gaps</b><em>Tuning only</em></li>';
      const first = gaps[0] && gaps[0][0];
      el('rc-start').textContent = first ? first.piece : 'A tuning review';
      el('rc-w').textContent = ` · ${first ? first.w : 'two weeks'}`;
      el('rc-why').textContent = first ? first.gap : 'Your platform is mostly in place. We would look for cost and latency to take out.';
    };
    el('rc-opts').addEventListener('click', ev => {
      const b = ev.target.closest('button'); if (!b) return;
      ans[at] = +b.dataset.v; show();
      const next = ans.findIndex(v => v === null);
      if (at < Q.length - 1 || next >= 0) setTimeout(() => { at = next >= 0 ? next : Math.min(at + 1, Q.length - 1); show(); }, motion ? 320 : 0);
      else if (editing) setTimeout(() => { editing = false; show(); }, motion ? 320 : 0);
    });
    el('rc-back').addEventListener('click', () => { if (at > 0) { at--; show(); } });
    el('rc-edit').addEventListener('click', () => { editing = true; at = 0; show(); });
    el('rc-again').addEventListener('click', () => { ans.fill(null); at = 0; editing = false; show(); });
    show();
  }

  // ---------------------------------------------------------------- why a platform: a pinned line scene in four acts
  // Every strand is a polyline of N points. Each act has two states, how it is today and how it is with devx, and runs
  // its own story under its own caption: it settles into "today", holds, then resolves into "with devx" and holds.
  // Each act wears one of the four number colours. Sources, the gateway, the gate and the models sit on grid lines.
  (() => {
    const scene = document.getElementById('scene'), cv = document.getElementById('scene-cv');
    if (!scene || !cv) return;
    const sec = scene.closest('section'), ctx = cv.getContext('2d'), labelsEl = document.getElementById('scene-labels');
    const caps = [...document.querySelectorAll('#scene-caps .cap')], btns = [...scene.querySelectorAll('.actbar button')];
    const N = 48, TEAMS = ['Claims', 'Service', 'Fraud', 'Search'], PER = 14;
    const MODELS = [['Gemini', 'googlegemini.svg'], ['Claude', 'claude.svg'], ['GPT', 'openai.svg'], ['Llama', 'meta.svg']];
    const INK = [20, 22, 46], WARN = [226, 72, 72];
    // gateway = security, pipelines = reliability, FinOps = cost, landing zone = speed (deepened so thin lines still read)
    const ACT = [[226, 96, 146], [52, 170, 94], [246, 108, 58], [67, 107, 246]];
    let W = 0, H = 0, L = {}, strands = [], today = [], devx = [], labels = [], lastA = -1;

    const bez = (a, b, c, d, t) => { const u = 1 - t; return [u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0], u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1]]; };
    const seg = (p0, p3, n, k1 = .45, k2 = .45) => { const dx = p3[0] - p0[0], out = []; for (let i = 0; i < n; i++) out.push(bez(p0, [p0[0] + dx * k1, p0[1]], [p3[0] - dx * k2, p3[1]], p3, i / (n - 1))); return out; };

    const layout = () => {
      const r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
      W = r.width; H = r.height; if (!W) return;
      cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const wr = sec.querySelector('.wrap').getBoundingClientRect(), x0 = wr.left - r.left, ww = wr.width;
      const phone = innerWidth < 640, n = phone ? 4 : 6, cw = ww / n, line = k => x0 + k * cw;
      // the drawing starts under the tallest caption, so text and lines never meet
      const capBot = Math.max(...caps.map(c => c.getBoundingClientRect().bottom)) - r.top;
      const top = Math.max(capBot + (phone ? 64 : 80), H * .3), bot = H - (phone ? 56 : 64);
      L = { x0, ww, cw, top, bot, phone,
        src: phone ? x0 + 34 : line(1), tgt: phone ? line(4) - 4 : line(5),
        G: [line(phone ? 2 : 3), (top + bot) / 2], gate: line(phone ? 3 : 4),
        zone: phone ? [line(2) - 26, x0 + ww + 8] : [line(2), line(6)] };
      const teamY = k => top + (bot - top) * (.08 + k * .28), modelY = k => top + (bot - top) * (.14 + k * .24);
      const rr = rng(41), dot = phone ? 8 : 15;
      strands = [];
      TEAMS.forEach((_, k) => { for (let j = 0; j < PER; j++) {
        const col = j % 3, row = Math.floor(j / 3);
        strands.push({ team: k, j, src: [L.src - col * dot, teamY(k) + (row - 2) * (phone ? 5 : 7)], model: Math.floor(rr() * 4), reject: (k * PER + j) % 5 === 2, off: rr() - .5 });
      } });
      strands.forEach(st => { st.tgt = [L.tgt, modelY(st.model) + st.off * 10]; });
      L.modelY = modelY;

      const S = (pts, c, a) => ({ pts, c, a });
      const through = st => { const g = [L.G[0], L.G[1] + st.off * 3]; return seg(st.src, g, N / 2, .55, .45).concat(seg(g, st.tgt, N / 2, .45, .55)); };
      const stopped = st => { const p = through(st); let cut = p.findIndex(q => q[0] > L.gate); if (cut < 0) cut = N - 1; const s = p[Math.max(0, cut - 1)]; return p.map((q, i) => i < cut ? q : s); };
      const cx0 = phone ? x0 + 8 : line(1), cx1 = phone ? line(4) : line(5);
      const curve = (fall, spread) => Array.from({ length: N }, (_, i) => { const u = i / (N - 1);
        const y = fall ? .26 + .6 * (1 - Math.pow(1 - u, 2.1)) + .025 * Math.sin(u * 8) * (1 - u) : .32 + .035 * Math.sin(u * 9 + spread * 7) + .02 * Math.sin(u * 23);
        return [cx0 + (cx1 - cx0) * u, top + (bot - top) * y + spread * (fall ? 120 - 80 * u : 110)]; });
      L.curve = { cx0, cx1 };
      const spread = i => (strands[i].team - 1.5) / 4 + (strands[i].j / PER - .5) * .09;   // four team bands, each a loose bundle
      today = [
        strands.map(st => S(seg(st.src, st.tgt, N, .38, .38), INK, .24)),                                   // every team wired to every model
        strands.map(st => st.reject ? S(through(st), WARN, .6) : S(through(st), ACT[1], .32)),              // bad releases reach production
        strands.map((st, i) => S(curve(false, spread(i)), ACT[2], st.reject ? 0 : .32)),                      // cost per request never moves
        strands.map(st => S(through(st), ACT[3], st.reject ? 0 : .2)),                                       // waiting on security review
      ];
      devx = [
        strands.map(st => S(through(st), ACT[0], .4)),                                                       // one gateway
        strands.map(st => st.reject ? S(stopped(st), WARN, .6) : S(through(st), ACT[1], .42)),              // the eval gate stops them
        strands.map((st, i) => S(curve(true, spread(i)), ACT[2], st.reject ? 0 : .5)),                      // and it falls
        strands.map(st => S(through(st), ACT[3], st.reject ? 0 : .5)),                                       // inside a landing zone
      ];
      // labels: [text, x, y, align, key, class, logo]
      const tl = k => phone ? [x0, teamY(k) - 24, 'r'] : [L.src - 2 * dot - 16, teamY(k), 'l'];
      const ml = k => phone ? [L.tgt + 5, modelY(k) - 20, 'l'] : [L.tgt + 14, modelY(k), 'r'];
      labels = [];
      TEAMS.forEach((t, k) => { const [x, y, al] = tl(k); labels.push([t, x, y, al, 'nodes', '']); });
      MODELS.forEach(([m, f], k) => { const [x, y, al] = ml(k); labels.push([m, x, y, al, 'nodes', '', f]); });
      labels.push(['AI gateway', L.G[0], L.G[1] - 22, 'c', 'gw', 'big']);
      labels.push(['Eval gate', L.gate, top - 8, 'c', 'gate', 'big']);
      labels.push(['Cost per request', cx0 + 12, top - 26, 'r', 'axes', 'big']);
      labels.push(['Month 1', cx0, bot + 12, 'r', 'axes', 'm']);
      labels.push(['Month 6', cx1, bot + 12, 'l', 'axes', 'm']);
      labels.push([phone ? 'Landing zone' : 'Landing zone · private networking, keys, residency', L.zone[0], top - 34, 'r', 'zone', 'big']);
      labelsEl.innerHTML = labels.map(([t, x, y, al, , cl, f]) => `<span class="${al} ${cl}" style="left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;opacity:0">${f ? `<img src="assets/logos/${f}" alt="">` : ''}${t}</span>`).join('');
      lastA = -1;
    };

    const mix = (x, y, t) => x + (y - x) * t;
    const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${clamp(a).toFixed(3)})`;
    const draw = a => {
      if (!W) return;
      ctx.clearRect(0, 0, W, H);
      const k = Math.min(3, Math.floor(a)), u = a - k;
      // settle into today (from the last act's result), hold, resolve into devx, hold
      const into = clamp(u / .25), dxp = clamp((u - .4) / .45);
      let A, B, t;
      if (u < .4) { A = k ? devx[k - 1] : today[0]; B = today[k]; t = inOut(into); } else { A = today[k]; B = devx[k]; t = inOut(dxp); }
      const fadeIn = inOut(into), fadeOut = 1 - fadeIn;
      const vis = {
        nodes: k === 2 ? fadeOut : k === 3 ? fadeIn : 1,
        gw: k === 0 ? dxp : k === 1 ? 1 : k === 2 ? fadeOut : fadeIn,
        gate: k === 1 ? dxp : k === 2 ? fadeOut : 0,
        axes: k === 2 ? fadeIn : k === 3 ? fadeOut : 0,
        zone: k === 3 ? dxp : 0,
      };
      const col = ACT[k];
      // structure: source dots and model nodes
      if (vis.nodes > .01) {
        ctx.fillStyle = rgba(INK, .55 * vis.nodes);
        strands.forEach(st => { ctx.beginPath(); ctx.arc(st.src[0], st.src[1], 1.6, 0, 6.29); ctx.fill(); });
        ctx.fillStyle = rgba(INK, .8 * vis.nodes);
        for (let m = 0; m < 4; m++) { ctx.beginPath(); ctx.arc(L.tgt, L.modelY(m), 4, 0, 6.29); ctx.fill(); }
      }
      if (vis.gate > .01) { ctx.strokeStyle = rgba(INK, .45 * vis.gate); ctx.lineWidth = 1.5; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(L.gate, L.top + 4); ctx.lineTo(L.gate, L.bot - 4); ctx.stroke(); ctx.setLineDash([]); }
      if (vis.axes > .01) { ctx.strokeStyle = rgba(INK, .18 * vis.axes); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(L.curve.cx0, L.top - 8); ctx.lineTo(L.curve.cx0, L.bot); ctx.lineTo(L.curve.cx1, L.bot); ctx.stroke(); }
      // the strands
      const lw = L.phone ? .7 : .85;
      ctx.lineWidth = lw;
      for (let i = 0; i < strands.length; i++) {
        const sa = A[i], sb = B[i], al = mix(sa.a, sb.a, t); if (al < .01) continue;
        ctx.strokeStyle = rgba([0, 1, 2].map(q => Math.round(mix(sa.c[q], sb.c[q], t))), al);
        ctx.beginPath();
        for (let p = 0; p < N; p++) { const x = mix(sa.pts[p][0], sb.pts[p][0], t), y = mix(sa.pts[p][1], sb.pts[p][1], t); p ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.stroke();
      }
      // the rejected releases get a cross where the gate stopped them
      const xA = k === 1 ? clamp((dxp - .55) / .3) : k === 2 ? fadeOut : 0;
      if (xA > .01) {
        ctx.strokeStyle = rgba(WARN, .9 * xA); ctx.lineWidth = 1.3;
        strands.forEach((st, i) => { if (!st.reject) return; const e = devx[1][i].pts[N - 1], q = 3.5; ctx.beginPath(); ctx.moveTo(e[0] + 6 - q, e[1] - q); ctx.lineTo(e[0] + 6 + q, e[1] + q); ctx.moveTo(e[0] + 6 + q, e[1] - q); ctx.lineTo(e[0] + 6 - q, e[1] + q); ctx.stroke(); });
        ctx.lineWidth = lw;
      }
      // the gateway node, in the act's colour
      if (vis.gw > .01) {
        const gc = k === 2 && u < .25 ? ACT[1] : col;
        ctx.beginPath(); ctx.arc(L.G[0], L.G[1], 7, 0, 6.29); ctx.fillStyle = rgba(gc, vis.gw); ctx.fill();
        ctx.beginPath(); ctx.arc(L.G[0], L.G[1], 13, 0, 6.29); ctx.strokeStyle = rgba(gc, .35 * vis.gw); ctx.lineWidth = 1; ctx.stroke(); ctx.lineWidth = lw;
      }
      // landing zone: a dashed boundary closes around the governed system
      if (vis.zone > .01) {
        const z = inOut(vis.zone), bx = L.zone[0], by = L.top - 16, bw = L.zone[1] - bx, bh = L.bot - L.top + 32;
        ctx.save(); ctx.globalAlpha = z; ctx.strokeStyle = rgba(ACT[3], .7); ctx.lineWidth = 1.2; ctx.setLineDash([6, 6]);
        const s0 = .985 + .015 * z; ctx.translate(bx + bw / 2, by + bh / 2); ctx.scale(s0, s0); ctx.translate(-(bx + bw / 2), -(by + bh / 2));
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx, by, bw, bh, 18) : ctx.rect(bx, by, bw, bh); ctx.stroke(); ctx.restore();
      }
      [...labelsEl.children].forEach((el, i) => { el.style.opacity = clamp(vis[labels[i][4]]).toFixed(2); });
      // captions: the "with devx" line lights as its lines resolve; the act bar shows only the current act
      caps.forEach((c, i) => { c.classList.toggle('on', i === k); c.classList.toggle('lit', i === k && dxp > .02); });
      btns.forEach((b, i) => { b.classList.toggle('on', i === k); b.style.setProperty('--fill', (i === k ? u * 100 : 0).toFixed(1) + '%'); });
    };

    const progress = () => {
      if (!motion) return 4;
      const r = scene.getBoundingClientRect(), span = r.height - innerHeight;
      return 4 * clamp(-r.top / span);
    };
    let queued = false;
    const tick = () => { queued = false; const a = progress(); if (Math.abs(a - lastA) > .001) { lastA = a; draw(Math.min(3.999, a)); } };
    const onS = () => { if (!queued) { queued = true; requestAnimationFrame(tick); } };
    layout(); tick();
    addEventListener('scroll', onS, { passive: true });
    addEventListener('resize', () => { layout(); tick(); });
    document.fonts.ready.then(() => { layout(); tick(); });
    btns.forEach((b, i) => b.addEventListener('click', () => {   // land on the act's resolved state
      const r = scene.getBoundingClientRect(), span = r.height - innerHeight;
      scrollTo({ top: scrollY + r.top + span * (i + .9) / 4, behavior: motion ? 'smooth' : 'auto' });
    }));
    // page links are held; in-page jumps marked data-jump still move
    document.querySelectorAll('[data-jump]').forEach(el => el.addEventListener('click', () => document.querySelector(el.getAttribute('href'))?.scrollIntoView({ behavior: motion ? 'smooth' : 'auto' })));
  })();

  // ---------------------------------------------------------------- every gradient answers the pointer
  // Windows (What we build, Outcomes, Questions, the CTA horizon): a small hue/saturation shift follows the cursor (no light blob),
  // the stripes drift a few pixels with it and the card or birds on top drift against it. The hero and dawn canvases shift colour.
  if (motion && matchMedia('(hover: hover)').matches) {
    const hosts = [...document.querySelectorAll('#out-art, .horizon')];
    hosts.forEach(host => {
      host.classList.add('hv-host');
      host.insertAdjacentHTML('afterbegin', '<i class="hv" aria-hidden="true"></i>');
      let base = null, raf = 0, last = null;
      const baseOf = () => {   // where the painted stripes sit at rest; full-size paintings get a little slack to drift into
        const cs = getComputedStyle(host);
        if (/100% 100%/.test(host.style.backgroundSize) || !host.style.backgroundSize) { host.style.backgroundSize = 'calc(100% + 28px) calc(100% + 20px)'; return [-14, -10]; }
        const m = cs.backgroundPosition.match(/(-?[\d.]+)px (-?[\d.]+)px/); return m ? [+m[1], +m[2]] : [0, 0];
      };
      const apply = () => {
        raf = 0; if (!last) return;
        const r = host.getBoundingClientRect(), x = clamp((last.clientX - r.left) / r.width), y = clamp((last.clientY - r.top) / r.height);
        host.style.setProperty('--mx', (x * 100).toFixed(1) + '%'); host.style.setProperty('--my', (y * 100).toFixed(1) + '%');
        host.style.setProperty('--hue', ((x - .5) * 8).toFixed(1) + 'deg'); host.style.setProperty('--sat', (1.04 + .06 * (1 - y)).toFixed(2));
        host.style.setProperty('--cx', ((x - .5) * -10).toFixed(1) + 'px'); host.style.setProperty('--cy', ((y - .5) * -8).toFixed(1) + 'px');
        if (base) host.style.backgroundPosition = `${(base[0] + (x - .5) * 14).toFixed(1)}px ${(base[1] + (y - .5) * 10).toFixed(1)}px`;
      };
      host.addEventListener('pointerenter', e => { base = baseOf(); host.dataset.bp = base.join(' '); host.style.setProperty('--on', 1); last = e; apply(); });
      host.addEventListener('pointermove', e => { last = e; if (!raf) raf = requestAnimationFrame(apply); });
      host.addEventListener('pointerleave', () => {
        last = null; host.style.setProperty('--on', 0); host.style.setProperty('--hue', '0deg'); host.style.setProperty('--sat', 1);
        host.style.setProperty('--cx', '0px'); host.style.setProperty('--cy', '0px');
        if (base) host.style.backgroundPosition = `${base[0]}px ${base[1]}px`;
      });
    });
    // the hero field and the dawn band: colour follows the pointer; the hero console drifts against it
    const tint = (el, zone, drift) => {
      if (!el || !zone) return;
      zone.addEventListener('pointermove', e => {
        const r = zone.getBoundingClientRect(), x = clamp((e.clientX - r.left) / r.width), y = clamp((e.clientY - r.top) / r.height);
        el.style.filter = `hue-rotate(${((x - .5) * 8).toFixed(1)}deg) saturate(${(1.04 + .06 * (1 - y)).toFixed(2)})`;
        if (drift) drift.style.translate = `${((x - .5) * -10).toFixed(1)}px ${((y - .5) * -6).toFixed(1)}px`;
      });
      zone.addEventListener('pointerleave', () => { el.style.filter = ''; if (drift) drift.style.translate = ''; });
    };
    tint(document.getElementById('field'), document.getElementById('top'), document.getElementById('console'));
    tint(document.getElementById('dawn'), document.querySelector('.dawn'));
  }

  // ---------------------------------------------------------------- intro: devx stripes rise out of the night and wash into paper
  const handover = () => {
    root.classList.add('ready'); readyAt = performance.now() + 250;
    const h1 = document.querySelector('[data-px="hero"]');
    if (h1 && motion) document.fonts.ready.then(() => play(h1, 80));
    if (!con) return;
    if (!motion) { con.classList.add('filled'); still(SC[0]); return; }
    document.fonts.ready.then(() => {
      wireframe();
      setTimeout(() => con.classList.add('draw'), 450);
      setTimeout(() => { con.classList.add('filled'); story(); }, 1900);
    });
  };
  const el = document.getElementById('intro');
  if (!motion || root.classList.contains('seen') || !el) { el && el.remove(); handover(); }
  else {
    try { sessionStorage.setItem('dx-intro', '1'); } catch (e) {}
    const cv = el.querySelector('canvas'), ctx = cv.getContext('2d'), dpr = Math.min(2, devicePixelRatio || 1);
    const W = innerWidth, H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const r = rng(11), hg = gridFor(document.getElementById('top')), cols = gridStripes(hg.xs, hg.cw, rng(3), .1, true, DEVX, p0For(document.getElementById('top'), hg));
    cols.forEach(c => { const u = (c.x + c.w / 2) / W; c.delay = Math.abs(u - .5) * 2 * 380 + r() * 220; c.reach = .8 + .45 * c.k; });
    const T0 = performance.now();
    let handed = false;
    const finish = () => { if (handed) return; handed = true; el.classList.add('out'); handover(); setTimeout(() => el.remove(), 900); };
    el.addEventListener('click', finish);
    setTimeout(finish, 1700);   // failsafe: hand over even if animation frames are throttled
    const frame = now => {
      const t = now - T0;
      ctx.clearRect(0, 0, W, H);
      for (const c of cols) drawCol(ctx, c, H, outCubic(clamp((t - c.delay) / 1050)) * H * c.reach, .55);
      const w = clamp((t - 900) / 650);
      if (w > 0) { ctx.fillStyle = `rgba(255,255,255,${inOut(w)})`; ctx.fillRect(0, 0, W, H); }
      if (t > 1350) finish();
      if (t < 2300 && el.isConnected) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
})();

// ---------------------------------------------------------------- hero desks: pick your desk and watch a case run. The evidence comes in, the agent
// ticks its steps, the route lights to where the case ends. The tab fills while it runs, then hands to the next desk; a click stays on that desk.
(function () {
  const bar = document.getElementById('desks'), dataEl = document.getElementById('desk-data');
  if (!bar || !dataEl) return;
  const DESKS = JSON.parse(dataEl.textContent), tabs = [...bar.querySelectorAll('button')];
  const $ = id => document.getElementById(id);
  const icon = n => document.querySelector(`template[data-ic="${n}"]`).innerHTML;
  const motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const art = $('gwx');
  let cur = 0, timers = [], still = !motion;
  const later = (f, t) => timers.push(setTimeout(f, t));
  const fill = d => {
    $('d-who').textContent = d.who; $('d-ask').textContent = d.ask;
    [...$('d-files').children].forEach((li, k) => { li.querySelector('span').textContent = d.files[k]; });
    [...$('d-steps').children].forEach((li, k) => { li.querySelector('i').innerHTML = icon(d.steps[k][0]); li.querySelector('span').textContent = d.steps[k][1]; });
    $('d-ic').innerHTML = icon(d.end.ic); $('d-t').textContent = d.end.t; $('d-why').textContent = d.end.why; $('d-dec').textContent = d.end.who; $('d-proof').textContent = d.end.proof;
  };
  const run = () => {
    const steps = [...$('d-steps').children];
    timers.forEach(clearTimeout); timers = [];
    if (!motion) { steps.forEach(li => li.classList.add('done')); window.dxRoute && window.dxRoute(0); return; }
    steps.forEach(li => li.classList.remove('done'));
    window.dxRoute && window.dxRoute(-1);
    steps.forEach((li, k) => later(() => li.classList.add('done'), 500 + k * 560));
    later(() => window.dxRoute && window.dxRoute(0), 500 + steps.length * 560);   // the result arrives last: the route lights and it fills in
  };
  const show = k => {
    cur = k;
    tabs.forEach((t, j) => t.setAttribute('aria-selected', j === k ? 'true' : 'false'));
    bar.scrollTo({ left: tabs[k].offsetLeft - (bar.clientWidth - tabs[k].offsetWidth) / 2, behavior: motion ? 'smooth' : 'auto' });   // phones: keep the live tab in view
    art.classList.add('swap');
    setTimeout(() => { fill(DESKS[k]); art.classList.remove('swap'); run(); }, motion ? 240 : 0);
  };
  tabs.forEach((t, k) => t.addEventListener('click', () => { still = true; bar.classList.add('still'); show(k); }));
  bar.addEventListener('keydown', ev => {
    const d = ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return; ev.preventDefault();
    const n = (cur + d + tabs.length) % tabs.length; tabs[n].focus(); still = true; bar.classList.add('still'); show(n);
  });
  bar.addEventListener('animationend', ev => { if (ev.animationName === 'deskfill' && !still) show((cur + 1) % tabs.length); });
  if (still) bar.classList.add('still');
  new IntersectionObserver(es => bar.classList.toggle('run', es[0].isIntersecting), { threshold: .2 }).observe(bar);
  const begin = () => run();
  document.documentElement.classList.contains('ready') || !motion ? begin() : new MutationObserver((_, o) => { if (document.documentElement.classList.contains('ready')) { o.disconnect(); begin(); } }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
})();


// ---------------------------------------------------------------- hero box: the field drifts a little and shifts hue with the pointer
(function () {
  const box = document.getElementById('hx-box'), f = box && box.querySelector('.hx-field');
  if (!f || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  box.addEventListener('pointermove', ev => {
    const r = box.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width - .5, y = (ev.clientY - r.top) / r.height - .5;
    f.style.transform = `translate(${(x * -14).toFixed(1)}px, ${(y * -14).toFixed(1)}px)`;
    f.style.filter = `hue-rotate(${(x * 8).toFixed(1)}deg)`;
  });
  box.addEventListener('pointerleave', () => { f.style.transform = ''; f.style.filter = ''; });
})();

// ---------------------------------------------------------------- our point of view: as the next card slides over, this one settles back a little and its title quietens
(function () {
  const stks = [...document.querySelectorAll('.stk')];
  if (!stks.length || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let queued = false;
  const update = () => {
    queued = false;
    stks.forEach((li, k) => {
      const next = stks[k + 1], card = li.firstElementChild;
      if (!next) return;
      const r = card.getBoundingClientRect(), n = next.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (r.top + r.height - n.top) / r.height));
      card.style.transform = `scale(${(1 - p * .015).toFixed(4)})`;
      li.classList.toggle('under', p > .55);
    });
  };
  const ask = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  addEventListener('scroll', ask, { passive: true });
  addEventListener('resize', ask);
  update();
})();

// ---------------------------------------------------------------- catalogue tabs: one area at a time
(function () {
  const tabs = [...document.querySelectorAll('.x-tabs button')], panes = [...document.querySelectorAll('.x-cat')];
  tabs.forEach((t, k) => t.addEventListener('click', () => {
    tabs.forEach((x, j) => x.setAttribute('aria-selected', j === k ? 'true' : 'false'));
    panes.forEach((p, j) => p.classList.toggle('on', j === k));
  }));
})();

// ---------------------------------------------------------------- why now: one slider, four charts. It glides across once on entry, then it is the visitor's
(function () {
  const box = document.getElementById('why4'), r = document.getElementById('w4-r');
  if (!box || !r) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reads = [...box.querySelectorAll('[data-r]')], ends = [...box.querySelectorAll('.w4-end')];
  const charts = [...box.querySelectorAll('.w4-b')].map(c => [...c.children]), labels = [...box.querySelectorAll('.w4-lg.n3 span')];
  const words = [t => t < .4 ? 'days' : t < .75 ? 'hours' : 'minutes', t => t < .55 ? 'more people' : 'the same team', null, t => t < .5 ? 'paying claims' : 'preventing losses'];
  const lerp = (a, b, t) => a + (b - a) * t;
  const FROM = [[92, 96, 90, 94, 88, 96, 92, 90, 94, 92, 88, 96], [12, 16, 21, 27, 34, 42, 50, 59, 68, 77, 87, 96], [8, 8, 8], [8, 8, 10, 10, 14, 22, 36, 54, 70, 84, 92, 96]];
  const TO = [[16, 12, 14, 10, 13, 11, 14, 10, 12, 10, 13, 11], [12, 13, 15, 16, 18, 19, 21, 22, 24, 25, 26, 28], [90, 90, 90], [92, 96, 84, 70, 52, 34, 22, 14, 10, 8, 8, 8]];
  const AT = [.2, .5, .8];   // the slider position where each of the three regulator checks passes
  const paint = t => {
    box.style.setProperty('--v', t.toFixed(3));
    box.classList.toggle('at0', t < .06); box.classList.toggle('at1', t > .94);
    words.forEach((f, k) => { if (f) reads[k].textContent = f(t); });
    charts.forEach((bars, c) => bars.forEach((b, k) => {
      const m = c === 2 ? Math.min(1, Math.max(0, (t - AT[k] + .12) / .12)) : t;
      b.style.height = lerp(FROM[c][k], TO[c][k], m).toFixed(1) + '%';
    }));
    let on = 0; AT.forEach((a, k) => { const y = t >= a; labels[k].classList.toggle('on', y); on += y; });
    reads[2].textContent = `${on} of 3`;
    ends[0].classList.toggle('on', t < .5); ends[1].classList.toggle('on', t >= .5);
    r.setAttribute('aria-valuetext', t < .5 ? 'Closer to without AI' : 'Closer to with AI');
  };
  let touched = false, raf = 0;
  const take = () => { if (touched) return; touched = true; cancelAnimationFrame(raf); box.classList.add('took'); };
  r.addEventListener('input', () => paint(r.value / 100));
  // press and hold: the handle swells and its arrows spread while it is held
  const hold = on => box.classList.toggle('held', on);
  r.addEventListener('pointerdown', () => hold(true));
  ['pointerup', 'pointercancel'].forEach(ev => addEventListener(ev, () => hold(false)));
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => r.addEventListener(ev, take, { passive: true }));
  paint(0);
  if (reduce) { r.value = 100; paint(1); box.classList.add('took'); return; }
  new IntersectionObserver((es, io) => {
    if (!es[0].isIntersecting) return; io.disconnect();
    if (touched) return;
    const t0 = performance.now(), D = 2600;
    const step = now => {
      if (touched) return;
      const k = Math.min(1, (now - t0) / D), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      r.value = Math.round(e * 100); paint(e);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }, { threshold: .35 }).observe(box);
})();
// ---------------------------------------------------------------- how we work: the timeline plays once it is in view, and can be paused, scrubbed or jumped by clip
(function () {
  const x = document.getElementById('txx');
  if (!x) return;
  const STOPS = JSON.parse(x.dataset.stops), tr = document.getElementById('tx-tr'), rule = document.getElementById('tx-rule'), pp = document.getElementById('tx-pp'), now = document.getElementById('tx-now');
  const clips = [...x.querySelectorAll('.tx-c')], cols = [...document.querySelectorAll('.tx-t')];
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches, DUR = 6000, HOLD = 2200;
  const clamp = v => Math.min(1, Math.max(0, v));
  const label = p => p < STOPS[1] ? 'Day 1' : p < STOPS[2] ? 'Day ' + (2 + Math.min(2, Math.floor((p - STOPS[1]) / (STOPS[2] - STOPS[1]) * 3))) : p < STOPS[3] ? 'Week ' + (2 + Math.min(11, Math.floor((p - STOPS[2]) / (STOPS[3] - STOPS[2]) * 12))) : 'Week 14 onward';
  let p = 0, playing = false, seen = false, inView = false, last = 0, hold = 0;
  const paint = () => {
    tr.style.setProperty('--p', p);
    clips.forEach((c, k) => { const f = clamp((p - STOPS[k]) / (STOPS[k + 1] - STOPS[k])); c.style.setProperty('--f', f); c.classList.toggle('live', f > 0 && f < 1); c.classList.toggle('done', f >= 1 && k < 3); });
    const cur = p >= STOPS[3] ? 3 : p >= STOPS[2] ? 2 : p >= STOPS[1] ? 1 : 0;
    cols.forEach((c, k) => c.classList.toggle('on', k === cur));
    now.textContent = label(p);
    rule.setAttribute('aria-valuenow', Math.round(p * 100));
  };
  const setPlay = on => { playing = on; pp.classList.toggle('paused', !on); pp.setAttribute('aria-label', on ? 'Pause' : 'Play'); last = 0; if (on) requestAnimationFrame(tick); };
  const tick = t => {
    if (!playing) return;
    if (inView && !document.hidden) {
      if (last) {
        if (p >= 1) { hold += t - last; if (hold > HOLD) { hold = 0; p = 0; paint(); } }
        else { p = clamp(p + (t - last) / DUR); paint(); }
      }
      last = t;
    } else last = 0;
    requestAnimationFrame(tick);
  };
  pp.addEventListener('click', () => { if (!playing && p >= 1) p = 0; setPlay(!playing); paint(); });
  clips.forEach((c, k) => c.addEventListener('click', () => { p = STOPS[k]; hold = 0; paint(); }));
  // scrub: press or drag on the ruler; the playhead follows and the clip stays paused where you leave it
  const at = ev => { const r = tr.getBoundingClientRect(); p = clamp((ev.clientX - r.left) / r.width); hold = 0; paint(); };
  rule.addEventListener('pointerdown', ev => { rule.setPointerCapture(ev.pointerId); setPlay(false); at(ev); });
  rule.addEventListener('pointermove', ev => { if (rule.hasPointerCapture(ev.pointerId)) at(ev); });
  rule.addEventListener('keydown', ev => { const d = ev.key === 'ArrowRight' ? .02 : ev.key === 'ArrowLeft' ? -.02 : 0; if (!d) return; ev.preventDefault(); setPlay(false); p = clamp(p + d); paint(); });
  new IntersectionObserver(es => { inView = es[0].isIntersecting; if (inView && !seen && !still) { seen = true; setPlay(true); } }, { threshold: .35 }).observe(x);
  if (still) { p = 1; pp.classList.add('paused'); pp.setAttribute('aria-label', 'Play'); }
  paint();
})();

// ---------------------------------------------------------------- fits on scroll: the panel pins and three stages run off the scroll position, top to bottom.
// 1 your systems arrive in their box. 2 the agents appear and the lines run down into them. 3 the outcome lines run down and your team arrives.
// Phones, short screens and reduced motion get the final state with no pin.
(function () {
  const scene = document.getElementById('fit-scene'), fit = document.getElementById('fit'), pin = document.getElementById('fit-pin');
  if (!scene || !fit || !pin) return;
  const box = document.getElementById('fit-box'), ag = document.getElementById('fit-ag'), end = document.getElementById('fit-end');
  const tiles = [...box.querySelectorAll('li')], steps = [...ag.querySelectorAll('li')], cards = [...end.querySelectorAll('.fit-o')], puck = document.getElementById('fit-puck');
  const masks = [...fit.querySelectorAll('.fit-m')], nIn = tiles.length;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));
  const out = x => 1 - Math.pow(1 - x, 3), lerp = (a, b, k) => a + (b - a) * k;
  const TRAVEL = 1400;
  let on = false, raf = 0;
  const clear = () => {
    [box, ag, end, puck, ...tiles, ...steps, ...cards].forEach(el => { el.style.opacity = ''; el.style.transform = ''; });
    fit.classList.add('fit-live');
    masks.forEach(m => { m.style.strokeDashoffset = ''; });
    pin.style.position = pin.style.top = scene.style.height = '';
  };
  const paint = () => {
    raf = 0;
    if (!on) return;
    const r = scene.getBoundingClientRect(), top = parseFloat(pin.style.top) || 0;
    const t = seg(top - r.top, 0, TRAVEL);
    // 1: the box comes down into place, then its systems one by one
    const a = out(seg(t, 0, .1));
    box.style.opacity = a; box.style.transform = `translateY(${(1 - a) * -18}px)`;
    tiles.forEach((li, k) => { const f = out(seg(t, .03 + k * .022, .1 + k * .022)); li.style.opacity = f; li.style.transform = `translateY(${(1 - f) * -10}px)`; });
    // 2: the ribbons run down and meet, the puck rises as they reach it, then what the agents do
    masks.slice(0, nIn).forEach((m, k) => { m.style.strokeDashoffset = 1 - seg(t, .24 + Math.abs(k - 3) * .012, .42 + Math.abs(k - 3) * .012); });
    const b = out(seg(t, .4, .52));
    ag.style.opacity = b; puck.style.transform = `scale(${lerp(.82, 1, b)})`;
    steps.forEach((li, k) => { li.style.opacity = lerp(.25, 1, seg(t, .5 + k * .035, .56 + k * .035)); });
    // 3: the ribbons run on and split, then your team
    masks.slice(nIn).forEach((m, k) => { m.style.strokeDashoffset = 1 - seg(t, .64, .8); });
    const ea = out(seg(t, .72, .8));
    end.style.opacity = ea; end.style.transform = `translateY(${(1 - ea) * -14}px)`;
    cards.forEach((card, k) => { const f = out(seg(t, .76 + k * .06, .88 + k * .06)); card.style.opacity = f; card.style.transform = `translateY(${(1 - f) * -14}px)`; });
    fit.classList.toggle('fit-live', t > .96);
  };
  const queue = () => { if (!raf) raf = requestAnimationFrame(paint); };
  const setup = () => {
    clear();
    on = !still && innerWidth > 1180 && innerHeight >= fit.offsetHeight + 32;
    scene.classList.toggle('fit-run', on);
    if (!on) return;
    fit.classList.remove('fit-live');
    // the heading pins with the panel; on short screens the pin rides up so the panel stays whole and the heading gives way
    const h = pin.offsetHeight, room = innerHeight - h;
    pin.style.position = 'sticky'; pin.style.top = (room >= 104 ? Math.max(88, room / 2) : room - 16) + 'px';
    scene.style.height = h + TRAVEL + 'px';
    paint();
  };
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', setup);
  setup();
})();

// Case studies (listing + details, versions A and B). Runs after devx-base.js, which owns the nav,
// grid lines, reveals, pixel headings and the dusk close. This file adds: the devx field drawn into panels,
// the story thumbnail, the library (search, filters, card / list), the live call, contents and count-ups.
(() => {
  const D = window.CS_DATA, IC = window.CS_ICONS || {};
  const motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ic = n => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${IC[n] || ''}</svg>`;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const hash = s => [...String(s)].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
  const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  const PAGE = (location.pathname.split('/').pop() || '').replace('.html', '');
  const VER = /-b$/.test(PAGE) ? 'b' : 'a';
  const STORY = { a: 'case-study-a.html', b: 'case-study-b.html' }[VER];

  // ---------------------------------------------------------------- the devx field (the agent cards' art, drawn at any size):
  // the pillar colour above a stepped horizon, a blurred yellow and accent fringe riding each step, grain over all.
  // Below the horizon the panel is white, so words can sit there in ink.
  let uid = 0;
  const GRAIN = [...Array(9).fill(0), ...Array(31).fill(1), ...Array(60).fill(0)].join(' ');
  function field(W, H, pal, seed, o = {}) {
    const r = rng(seed), u = 'cf' + (++uid), [base, acc, warm] = pal;
    const edge = o.edge ?? .74, step = o.step ?? Math.max(70, W / 6.5), s = Math.min(1.9, Math.max(.7, H / 300));
    const blocks = [];
    for (let x = -24; x < W + 24;) { const w = step * (.72 + r() * .56); blocks.push({ x, w, y: H * (edge + (r() - .5) * (o.var ?? .13)) }); x += w; }
    const blur = (o.blur ?? 9) * s;
    const holes = blocks.map(b => `<rect x="${b.x.toFixed(1)}" y="${b.y.toFixed(1)}" width="${(b.w + 2).toFixed(1)}" height="${(H - b.y + 80).toFixed(1)}"/>`).join('');
    const fringe = blocks.map(b => `<rect x="${(b.x + b.w * .06).toFixed(1)}" y="${(b.y - 15 * s).toFixed(1)}" width="${(b.w * .84).toFixed(1)}" height="${(22 * s).toFixed(1)}" fill="${warm}"/><rect x="${(b.x + b.w * .46).toFixed(1)}" y="${(b.y - 21 * s).toFixed(1)}" width="${(b.w * .42).toFixed(1)}" height="${(16 * s).toFixed(1)}" fill="${acc}"/>`).join('');
    const top = o.top ? `<rect x="-40" y="-40" width="${W + 80}" height="${H * o.top + 40}" fill="url(#t${u})"/>` : '';
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><defs>
<filter id="b${u}" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="${blur.toFixed(1)}"/></filter>
<filter id="f${u}" x="-30%" y="-120%" width="160%" height="340%"><feGaussianBlur stdDeviation="${(blur * 1.1).toFixed(1)}"/></filter>
<filter id="n${u}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".78" numOctaves="3" seed="${seed % 9973}" stitchTiles="stitch" result="n"/><feColorMatrix in="n" type="luminanceToAlpha" result="a"/><feComponentTransfer in="a" result="s"><feFuncA type="discrete" tableValues="${GRAIN}"/></feComponentTransfer><feFlood flood-color="#fff" flood-opacity=".1"/><feComposite operator="in" in2="s"/></filter>
<linearGradient id="g${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000"/></linearGradient>
<linearGradient id="t${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>
<mask id="m${u}" maskUnits="userSpaceOnUse" x="-40" y="-40" width="${W + 80}" height="${H + 80}"><rect x="-40" y="-40" width="${W + 80}" height="${H + 80}" fill="#fff"/><g fill="#000" filter="url(#b${u})">${holes}</g><rect x="-40" y="${H - 30 * s}" width="${W + 80}" height="${30 * s}" fill="url(#g${u})"/><rect x="-40" y="${H}" width="${W + 80}" height="60" fill="#000"/>${top}</mask></defs>
<g mask="url(#m${u})"><rect x="-40" y="-40" width="${W + 80}" height="${H + 80}" fill="${base}"/><g filter="url(#f${u})">${fringe}</g><rect width="${W}" height="${H}" filter="url(#n${u})"/></g></svg>`;
  }
  const palOf = el => el.dataset.pal ? el.dataset.pal.split(',') : D.P[el.dataset.p || 'cx'].art;
  function paint(el) {
    const fixed = el.hasAttribute('data-fixed');
    const W = fixed ? 600 : Math.round(el.clientWidth), H = fixed ? 315 : Math.round(el.clientHeight);
    if (!W || !H) return;
    if (!fixed && el._sz && Math.abs(el._sz[0] - W) < 40 && Math.abs(el._sz[1] - H) < 40) return;
    el._sz = [W, H];
    el.innerHTML = field(W, H, palOf(el), +(el.dataset.seed || hash(el.closest('[id]')?.id || W)), {
      edge: el.dataset.edge ? +el.dataset.edge : undefined, step: el.dataset.step ? +el.dataset.step : undefined,
      top: el.dataset.top ? +el.dataset.top : 0, var: el.dataset.var ? +el.dataset.var : undefined });
  }
  const paintAll = (root = document) => root.querySelectorAll('.fx').forEach(paint);
  let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => document.querySelectorAll('.fx:not([data-fixed])').forEach(paint), 160); });

  // ---------------------------------------------------------------- the thumbnail: the pillar's field and one number on glass.
  // One frame for every story, so the library reads as one set. The share image (.og) adds the label, mark and footer.
  const statOf = s => s.stats && s.stats[0];
  function thumb(t, cls = '') {
    const P = D.P[t.p], st = t.stat;
    return `<div class="th ${cls}" style="--pc:${P.c}"><div class="fx" data-fixed data-p="${t.p}" data-seed="${hash(t.key)}"></div>
<div class="th-top"><span>Client story</span><svg viewBox="0 0 139.518 28.7388" aria-label="devx labs"><use href="#devx-logo"/></svg></div>
<div class="th-card glass${st ? '' : ' nov'}">${st ? `<span class="th-v">${esc(st[0])}</span><span class="th-l">${esc(st[1])}</span>` : `<span class="th-v">${esc(t.client)}</span>`}</div>
<div class="th-foot"><span><b>${esc(t.client)}</b> × devx labs</span><span>devxlabs.ai</span></div></div>`;
  }
  const thOf = s => ({ key: s.id, p: s.p, stat: statOf(s), client: s.client });
  const href = s => s.full ? `href="${STORY}" data-go` : 'href="#" data-soon';
  const meta = (client, p, extra = '', pil = true) => `<div class="cl"><span>${esc(client)}</span>${extra}${pil ? `<i></i><span class="pil" style="--pc:${D.P[p].c}">${esc(D.P[p].name)}</span>` : ''}</div>`;
  // the card: the thumbnail, then only who, which pillar and what moved. No box: the words sit on the page
  function card(s, i = 0) {
    return `<article class="cs-card" style="--i:${i}">${thumb(thOf(s))}<div class="cb">${meta(s.client, s.p)}<h3>${esc(s.title)}</h3></div><a class="cover" ${href(s)} aria-label="${esc(s.client)}: ${esc(s.title)}"></a></article>`;
  }
  // list view: words only, one line per story
  function row(s, i = 0) {
    const st = statOf(s);
    return `<div class="cs-row" style="--i:${i}"><b class="c">${esc(s.client)}</b><h3>${esc(s.title)}</h3><span class="pil" style="--pc:${D.P[s.p].c}">${esc(D.P[s.p].name)}</span>
<span class="k">${st ? `<b>${esc(st[0])}</b><span>${esc(st[1])}</span>` : ''}</span>${ic('arrow')}<a class="cover" ${href(s)} aria-label="${esc(s.client)}: ${esc(s.title)}"></a></div>`;
  }
  // version A: a single project is one result. Client, pillar, the number and what it measures; a tile links on only when there is a full story
  const flagOf = s => D.FLAG.find(f => f.client === s.client);
  function tile(s, i = 0) {
    const st = statOf(s), f = flagOf(s);
    const link = f ? `<a class="cover" ${f.href ? `href="${f.href}" data-go` : 'href="#" data-soon'} aria-label="Read the full ${esc(s.client)} story"></a>` : '';
    return `<article class="ot${f ? ' has' : ''}" style="--i:${i}">${meta(s.client, s.p)}${f ? `<span class="more" title="Part of a full client story">${ic('arrow')}</span>` : ''}<b>${esc(st[0])}</b><span class="l">${esc(st[1])}</span>${link}</article>`;
  }
  function trow(s, i = 0) {
    const st = statOf(s), f = flagOf(s);
    return `<div class="cs-row ot-row" style="--i:${i}"><b class="c">${esc(s.client)}</b><span class="k"><b>${esc(st[0])}</b><span>${esc(st[1])}</span></span><span class="pil" style="--pc:${D.P[s.p].c}">${esc(D.P[s.p].name)}</span>
<span class="y">${s.year}</span>${f ? ic('arrow') + `<a class="cover" ${f.href ? `href="${f.href}" data-go` : 'href="#" data-soon'} aria-label="Read the full ${esc(s.client)} story"></a>` : '<span></span>'}</div>`;
  }
  // a featured story, wide: the thumbnail on four columns, the words on two
  function feature(t, i = 0) {
    return `<article class="lb-one" style="--i:${i}">${thumb(t)}<div class="t">${meta(t.client, t.p, t.extra || '', !t.extra)}<h3>${esc(t.title)}</h3>${t.hook ? `<p>${esc(t.hook)}</p>` : ''}<span class="tlink">${t.cta || 'Read the case study'} ${ic('arrow')}</span></div><a class="cover" ${t.href} aria-label="${esc(t.client)}: ${esc(t.title)}"></a></article>`;
  }

  // ---------------------------------------------------------------- the library: pillar tabs, search, one filter menu, cards or list
  function library(root) {
    const mode = root.dataset.lib;            // 'a' = project outcomes (results only), 'b' = every case study
    const page = +root.dataset.page || 9;
    const items = D.S.filter(s => mode === 'b' || statOf(s)).map((s, k) => ({ ...s, k }));
    const st = { q: '', p: '', ind: new Set(), prod: new Set(), part: new Set(), view: store.get('cs-view-' + mode) || 'card', shown: page };
    const $ = s => root.querySelector(s);
    const res = $('.cs-res-wrap'), act = $('.cs-active'), more = $('.cs-more'), q = $('.cs-search input'), sbox = $('.cs-search');
    items.forEach(s => s.w = [s.client, s.title, s.hook, s.did, D.P[s.p].name, s.ind, s.prod, s.region, ...(s.part || [])].join(' ').toLowerCase());
    const FILTERS = { ind: { label: 'Industry', of: s => [s.ind] }, prod: { label: 'Product', of: s => s.prod ? [s.prod] : [] }, part: { label: 'Partner', of: s => s.part || [] } };
    const pass = (s, skip) => {
      if (st.q && !st.q.split(/\s+/).every(w => s.w.includes(w))) return false;
      if (skip !== 'p' && st.p && s.p !== st.p) return false;
      for (const k in FILTERS) if (skip !== k && st[k].size && !FILTERS[k].of(s).some(v => st[k].has(v))) return false;
      return true;
    };
    const reset = () => { st.shown = page; };
    // pillar tabs: words, a colour dot, an underline for the one you are on
    const tabs = $('.cs-tabs');
    tabs.innerHTML = [['', 'All'], ...Object.entries(D.P).map(([k, v]) => [k, v.name])].map(([k, n]) => `<button type="button" role="tab" data-p="${k}" style="--pc:${k ? D.P[k].c : ''}" aria-selected="${k === st.p}"><i></i>${n}</button>`).join('');
    tabs.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; st.p = b.dataset.p; reset(); render(); });
    // one filter menu, grouped: industry, product, partner
    const dd = $('.cs-dd');
    dd.innerHTML = `<button type="button" aria-expanded="false" aria-haspopup="true">${ic('filter')}Filters <b></b></button><div class="cs-menu" role="menu">${Object.entries(FILTERS).map(([k, F]) => {
      const vals = [...new Set(items.flatMap(F.of))].sort((a, b) => k === 'ind' ? D.IND.indexOf(a) - D.IND.indexOf(b) : a.localeCompare(b));
      return `<fieldset data-k="${k}"><legend>${F.label}</legend>${vals.map(v => `<label><input type="checkbox" value="${esc(v)}"> ${esc(v)}</label>`).join('')}</fieldset>`;
    }).join('')}</div>`;
    const ddb = dd.firstElementChild, close = () => { dd.classList.remove('open'); ddb.setAttribute('aria-expanded', 'false'); };
    ddb.addEventListener('click', e => { e.stopPropagation(); const o = !dd.classList.contains('open'); dd.classList.toggle('open', o); ddb.setAttribute('aria-expanded', o); });
    dd.querySelector('.cs-menu').addEventListener('change', e => { const k = e.target.closest('fieldset').dataset.k, v = e.target.value; e.target.checked ? st[k].add(v) : st[k].delete(v); reset(); render(); });
    document.addEventListener('click', e => { if (!e.target.closest('.cs-dd')) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); q.focus(); } });
    // search
    let qt; q.addEventListener('input', () => { sbox.classList.toggle('has', !!q.value); clearTimeout(qt); qt = setTimeout(() => { st.q = q.value.trim().toLowerCase(); reset(); render(); }, 120); });
    const clearQ = () => { q.value = ''; sbox.classList.remove('has'); st.q = ''; };
    $('.cs-search .clr').addEventListener('click', () => { clearQ(); render(); q.focus(); });
    root.querySelectorAll('.cs-view button').forEach(b => b.addEventListener('click', () => { st.view = b.dataset.v; store.set('cs-view-' + mode, st.view); render(); }));
    more.querySelector('button').addEventListener('click', () => { st.shown += page; render(true); });
    const clearAll = () => { st.p = ''; clearQ(); for (const k in FILTERS) st[k].clear(); reset(); render(); };
    act.addEventListener('click', e => {
      const c = e.target.closest('[data-rm]');
      if (c) { const [k, v] = c.dataset.rm.split('|'); if (k === 'p') st.p = ''; else if (k === 'q') clearQ(); else st[k].delete(v); render(); }
      else if (e.target.closest('.clear')) clearAll();
    });
    root.addEventListener('click', e => { if (e.target.closest('[data-reset]')) clearAll(); });

    function render(keep) {
      const list = items.filter(s => pass(s)).sort((a, b) => (b.year - a.year) || a.k - b.k);
      tabs.querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', b.dataset.p === st.p));
      const nSel = Object.keys(FILTERS).reduce((n, k) => n + st[k].size, 0);
      dd.classList.toggle('on', nSel > 0); ddb.querySelector('b').textContent = nSel || '';
      dd.querySelectorAll('fieldset').forEach(fs => { const k = fs.dataset.k; fs.querySelectorAll('label').forEach(l => { const inp = l.querySelector('input'), v = inp.value; inp.checked = st[k].has(v); l.classList.toggle('z', !st[k].has(v) && !items.some(s => pass(s, k) && FILTERS[k].of(s).includes(v))); }); });
      root.querySelectorAll('.cs-view button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === st.view));
      // what is chosen, only once something is
      const chips = [];
      if (st.q) chips.push(['q', '', `“${esc(q.value.trim())}”`]);
      for (const k in FILTERS) st[k].forEach(v => chips.push([k, v, esc(v)]));
      const noun = mode === 'a' ? (list.length === 1 ? 'project' : 'projects') : (list.length === 1 ? 'case study' : 'case studies');
      act.innerHTML = chips.length ? `<span class="cs-count"><b>${list.length}</b> ${noun}</span>${chips.map(([k, v, t]) => `<button type="button" class="chip" data-rm="${k}|${esc(v)}">${t} ${ic('close')}</button>`).join('')}<button type="button" class="clear">Clear all</button>` : '';
      const shown = list.slice(0, st.shown);
      if (!list.length) res.innerHTML = `<div class="cs-empty"><h3>Nothing matches that yet.</h3><p>Try fewer filters, or tell us the number you want to move.</p><button type="button" class="btn light sm" data-reset>Clear all filters</button></div>`;
      else if (mode === 'a') res.innerHTML = st.view === 'card' ? `<div class="ot-grid cs-res">${shown.map(tile).join('')}</div>` : `<div class="cs-rows cs-res">${shown.map(trow).join('')}</div>`;
      else res.innerHTML = st.view === 'card' ? `<div class="cs-grid cs-res">${shown.map(card).join('')}</div>` : `<div class="cs-rows cs-res">${shown.map(row).join('')}</div>`;
      if (keep) res.querySelectorAll('.cs-res > *').forEach((el, i) => { if (i < st.shown - page) el.style.animation = 'none'; else el.style.setProperty('--i', i - (st.shown - page)); });
      more.hidden = list.length <= st.shown;
      paintAll(res);
    }
    render();
  }
  document.querySelectorAll('[data-lib]').forEach(library);

  // ---------------------------------------------------------------- static slots filled from the data: featured stories, related cards
  const byId = id => D.S.find(s => s.id === id);
  document.querySelectorAll('[data-cards]').forEach(el => { el.innerHTML = el.dataset.cards.split(',').map((id, i) => card(byId(id.trim()), i)).join(''); });
  document.querySelectorAll('[data-feat]').forEach(el => { const s = byId(el.dataset.feat); el.innerHTML = feature({ ...thOf(s), title: s.title, hook: s.hook, href: href(s) }); });
  // version A: the flagship partnerships. The first one wide, the rest as cards
  document.querySelectorAll('[data-flags]').forEach(el => {
    const t = f => ({ key: f.client, p: f.p, stat: f.stat, client: f.client, title: f.title, href: f.href ? `href="${f.href}" data-go` : 'href="#" data-soon', extra: `<i></i><span>${f.n} engagements since ${f.since}</span>` });
    const [a, ...rest] = D.FLAG;
    el.innerHTML = feature({ ...t(a), hook: a.lede, cta: 'Read the story' }) + `<div class="fl-two">${rest.map((f, i) => `<article class="cs-card" style="--i:${i + 1}">${thumb(t(f))}<div class="cb">${meta(f.client, f.p, `<i></i><span>${f.n} engagements since ${f.since}</span>`, false)}<h3>${esc(f.title)}</h3></div><a class="cover" ${t(f).href} aria-label="${esc(f.client)}: ${esc(f.title)}"></a></article>`).join('')}</div>`;
  });
  paintAll();
  if (document.fonts) document.fonts.ready.then(() => paintAll());

  // ---------------------------------------------------------------- the live call: the transcript types in, the agent's actions tick, then it starts again
  document.querySelectorAll('.callv').forEach(v => {
    const lines = [...v.querySelectorAll('.ln')], acts = [...v.querySelectorAll('.act')], tm = v.querySelector('.tm');
    const steps = [...lines, ...acts].sort((a, b) => +a.dataset.t - +b.dataset.t);
    let timers = [], running = false, t0 = 0, clock;
    const finish = () => steps.forEach(s => s.classList.add('on'));
    if (!motion) { finish(); return; }
    const run = () => {
      running = true; steps.forEach(s => s.classList.remove('on')); t0 = performance.now();
      steps.forEach(s => timers.push(setTimeout(() => s.classList.add('on'), +s.dataset.t)));
      const end = Math.max(...steps.map(s => +s.dataset.t)) + 4200;
      timers.push(setTimeout(() => { timers = []; run(); }, end));
    };
    const stop = () => { timers.forEach(clearTimeout); timers = []; running = false; finish(); };
    clock = setInterval(() => { if (!tm || !running) return; const s = Math.floor((performance.now() - t0) / 1000) + 4; tm.textContent = `00:${String(s).padStart(2, '0')}`; }, 500);
    new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && !running) run(); else if (!e.isIntersecting && running) stop(); }), { threshold: .35 }).observe(v);
  });

  // ---------------------------------------------------------------- numbers count up to themselves when they arrive ("80%", "−80%", "68.09%")
  const counters = document.querySelectorAll('[data-count]');
  if (motion && counters.length) {
    const cio = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return; cio.unobserve(e.target);
      const el = e.target, txt = el.textContent, m = txt.match(/(\d[\d,]*\.?\d*)/); if (!m) return;
      const end = parseFloat(m[1].replace(/,/g, '')), dec = (m[1].split('.')[1] || '').length, pre = txt.slice(0, m.index), post = txt.slice(m.index + m[1].length);
      const t0 = performance.now(), dur = 1300;
      const tick = now => { const p = Math.min(1, (now - t0) / dur), v = end * (1 - Math.pow(1 - p, 3)); el.textContent = pre + v.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + post; if (p < 1) requestAnimationFrame(tick); else el.textContent = txt; };
      requestAnimationFrame(tick);
    }), { threshold: .6 });
    counters.forEach(c => cio.observe(c));
  }

  // results bars draw when their card arrives
  const bio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); bio.unobserve(e.target); } }), { threshold: .4 });
  document.querySelectorAll('.res > div').forEach(d => bio.observe(d));

  // ---------------------------------------------------------------- contents beside the story: the chapter in view is marked, and reading progress fills
  document.querySelectorAll('.toc, .jump').forEach(nav => {
    const links = [...nav.querySelectorAll('a[href^="#"]')], secs = links.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
    const rd = nav.querySelector('.rd'), art = secs[0]?.parentElement;
    const on = () => {
      const y = innerHeight * .32; let cur = secs[0];
      secs.forEach(s => { if (s.getBoundingClientRect().top < y) cur = s; });
      links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + cur?.id));
      if (rd && art) { const r = art.getBoundingClientRect(), p = Math.min(1, Math.max(0, (innerHeight * .5 - r.top) / r.height)); rd.style.setProperty('--rp', p.toFixed(3)); rd.querySelector('span').textContent = Math.round(p * 100) + '% read'; }
    };
    addEventListener('scroll', on, { passive: true }); on();
  });

  // ---------------------------------------------------------------- big panels answer the pointer: the field drifts a little, the glass the other way
  if (motion && matchMedia('(hover: hover)').matches) document.querySelectorAll('[data-drift]').forEach(p => {
    const art = p.querySelector('.fx'), gl = p.querySelector('.glass'); let raf;
    p.addEventListener('pointermove', e => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => {
      const r = p.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      if (art) art.style.cssText = `transform:translate(${(x * 10).toFixed(1)}px,${(y * 6).toFixed(1)}px) scale(1.03);filter:hue-rotate(${(x * 8).toFixed(1)}deg) saturate(${(1 + Math.abs(x) * .12).toFixed(2)});transition:transform .5s var(--ease),filter .5s`;
      if (gl) gl.style.translate = `${(-x * 8).toFixed(1)}px ${(-y * 5).toFixed(1)}px`;
    }); });
    p.addEventListener('pointerleave', () => { if (art) art.style.transform = ''; if (gl) gl.style.translate = ''; });
  });

  // ---------------------------------------------------------------- prototype aids: a version switcher, and a note on links that are not built yet
  const rev = document.createElement('nav');
  rev.className = 'cs-rev'; rev.setAttribute('aria-label', 'Prototype versions');
  const L = [['case-studies-a', 'A · Listing'], ['case-study-a', 'A · Story'], null, ['case-studies-b', 'B · Listing'], ['case-study-b', 'B · Story']];
  rev.innerHTML = '<span>Prototype</span>' + L.map(l => l ? `<a href="${l[0]}.html" data-go class="${l[0] === PAGE ? 'on' : ''}">${l[1]}</a>` : '<i></i>').join('') + `<button type="button" aria-label="Hide the version switcher">${ic('close')}</button>`;
  rev.querySelector('button').addEventListener('click', () => { rev.classList.toggle('min'); rev.querySelector('button').innerHTML = rev.classList.contains('min') ? ic('layers') : ic('close'); });
  document.body.append(rev);
  const toast = document.createElement('div'); toast.className = 'cs-toast'; toast.setAttribute('role', 'status'); document.body.append(toast);
  let tt; document.addEventListener('click', e => {
    if (!e.target.closest('[data-soon]')) return;
    toast.textContent = 'In this prototype only The Sleep Company story is built. This link is a placeholder.';
    toast.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => toast.classList.remove('on'), 2600);
  });
})();

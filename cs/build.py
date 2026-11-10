#!/usr/bin/env python3
"""Build the case study pages.

The shell (styles, logo sprite, nav, footer, page scripts) is read live from
industry-financial-services.html, so the case study pages always match it.
Each page's own content lives in cs/src/<name>.html and is written to <name>.html at the repo root.

    python3 cs/build.py

A source page starts with a few comment lines:
    <!-- title: Page title -->
    <!-- desc: Meta description -->
    <!-- listing: case-studies-a.html -->   (where the nav's "Case studies" link goes)
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
CS = ROOT / 'cs'
SRC = ROOT / 'industry-financial-services.html'

s = SRC.read_text()


def between(a, b, start=0):
    i = s.index(a, start)
    j = s.index(b, i)
    return s[i:j], j


# ---- shared stylesheet: the page's own CSS, with asset paths made relative to cs/
css, _ = between('<style>', '</style>')
css = css[len('<style>'):]
css = re.sub(r'url\((["\']?)assets/', r'url(\1../assets/', css)
(CS / 'devx-base.css').write_text(css)

# ---- body pieces, in page order
body_start = s.index('<body>') + len('<body>')
nav_start = s.index('<header class="nav">')
top = s[body_start:nav_start]                      # intro class script, intro curtain, svg sprite
nav_end = s.index('<main>')
nav = s[nav_start:nav_end]
foot_start = s.index('<footer id="foot">')
foot_end = s.index('</footer>') + len('</footer>')
footer = s[foot_start:foot_end]

# ---- shared script: the page's main script. Links marked data-go navigate for real;
# every other link stays a placeholder, as in the prototype.
js_start = s.index('<script>', foot_end) + len('<script>')
js_end = s.index('</script>', js_start)
js = s[js_start:js_end]
held = "document.addEventListener('click', e => { if (e.target.closest('a[href]')) e.preventDefault(); }, true);"
assert held in js, 'link holder not found: update build.py'
js = js.replace(held, "document.addEventListener('click', e => { if (e.target.closest('a[href]:not([data-go])')) e.preventDefault(); }, true);")
(CS / 'devx-base.js').write_text(js)

PAGE = """<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="stylesheet" href="cs/devx-base.css">
<link rel="stylesheet" href="cs/cs.css">
</head><body class="{bodyclass}">{top}{nav}<main>
{main}
</main>
{footer}
<script src="cs/icons.js"></script>
<script src="cs/stories.js"></script>
<script src="cs/devx-base.js"></script>
<script src="cs/cs.js"></script>
</body></html>
"""

# ---- icons: one ink, 24px grid, 1.8 stroke, as on the v37 pages. Write {{i:name}} in a source page.
ICONS = {
    'arrow': '<path d="M5 12h14M13 6l6 6-6 6"/>',
    'down': '<path d="M6 9l6 6 6-6"/>',
    'left': '<path d="M15 6l-6 6 6 6"/>',
    'right': '<path d="M9 6l6 6-6 6"/>',
    'search': '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/>',
    'grid': '<rect x="4" y="4" width="7" height="7" rx="1.6"/><rect x="13" y="4" width="7" height="7" rx="1.6"/><rect x="4" y="13" width="7" height="7" rx="1.6"/><rect x="13" y="13" width="7" height="7" rx="1.6"/>',
    'list': '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" stroke-width="2.6"/>',
    'close': '<path d="M6 6l12 12M18 6L6 18"/>',
    'check': '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    'phone': '<path d="M6 3.5h3l1.6 4.2-2 1.4a11 11 0 005.3 5.3l1.4-2 4.2 1.6v3a2 2 0 01-2.1 2A16 16 0 014 5.6a2 2 0 012-2.1z"/>',
    'wave': '<path d="M3 12h1.5M7 8.5v7M11 5v14M15 8v8M19 10.5v3"/>',
    'play': '<path d="M8.5 5.5v13l10-6.5z" fill="currentColor" stroke="none"/>',
    'pause': '<path d="M8 5v14M16 5v14"/>',
    'user': '<circle cx="12" cy="8" r="4"/><path d="M4.5 20a7.5 7.5 0 0115 0"/>',
    'users': '<circle cx="9" cy="8.5" r="3.2"/><path d="M3 19.5a6 6 0 0112 0"/><circle cx="17" cy="9.5" r="2.5"/><path d="M15.6 14.2A4.8 4.8 0 0121 19"/>',
    'headset': '<path d="M4.5 14v-2a7.5 7.5 0 0115 0v2"/><rect x="3" y="13.5" width="4" height="6.5" rx="1.6"/><rect x="17" y="13.5" width="4" height="6.5" rx="1.6"/><path d="M19 20a3 3 0 01-3 2h-2.5"/>',
    'clock': '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    'coins': '<ellipse cx="10" cy="7" rx="6" ry="3"/><path d="M4 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3V7"/><path d="M4 12v5c0 1.7 2.7 3 6 3 1.3 0 2.6-.2 3.6-.6"/><circle cx="17.5" cy="17" r="3.5"/>',
    'truck': '<path d="M3 6.5h11v10H3zM14 10h4.2l2.8 3v3.5h-7"/><circle cx="7" cy="17.5" r="1.7"/><circle cx="17" cy="17.5" r="1.7"/>',
    'return': '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/>',
    'bars': '<rect x="4" y="11" width="4" height="9" rx="1.6"/><rect x="10" y="4" width="4" height="16" rx="1.6"/><rect x="16" y="14" width="4" height="6" rx="1.6"/>',
    'compass': '<circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
    'chip': '<rect x="7" y="7" width="10" height="10" rx="2"/><path d="M10 3.5V7M14 3.5V7M10 17v3.5M14 17v3.5M3.5 10H7M3.5 14H7M17 10h3.5M17 14h3.5"/>',
    'db': '<ellipse cx="12" cy="6" rx="7" ry="2.8"/><path d="M5 6v12c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8V6"/><path d="M5 12c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8"/>',
    'book': '<path d="M5 5.5A2.5 2.5 0 017.5 3H19v15H7.5A2.5 2.5 0 005 20.5z"/><path d="M5 20.5A2.5 2.5 0 017.5 18H19v3H7.5"/>',
    'ticket': '<path d="M4 8.5V6h16v2.5a2.5 2.5 0 000 5V18H4v-4.5a2.5 2.5 0 000-5z"/><path d="M13.5 6v2M13.5 11v2M13.5 16v2"/>',
    'voicemail': '<circle cx="7" cy="12" r="3.5"/><circle cx="17" cy="12" r="3.5"/><path d="M7 15.5h10"/>',
    'cart': '<path d="M3 4h2.5l2.2 11h10.6L20.5 7H7"/><circle cx="9.5" cy="19.5" r="1.4"/><circle cx="17" cy="19.5" r="1.4"/>',
    'store': '<path d="M4 9.5L5.6 4h12.8L20 9.5M4.5 9.5V20h15V9.5M4 9.5h16"/><path d="M9.5 20v-5.5h5V20"/>',
    'pin': '<path d="M12 21s-7-6.1-7-11.2a7 7 0 0114 0C19 14.9 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.5"/>',
    'layers': '<path d="M12 3.5l8.5 4.3-8.5 4.3-8.5-4.3z"/><path d="M3.5 12.2l8.5 4.3 8.5-4.3M3.5 16.4l8.5 4.3 8.5-4.3"/>',
    'spark': '<path d="M12 3.5l2 5.6 5.5 2-5.5 2L12 18.6l-2-5.5L4.5 11l5.5-2z"/>',
    'shield': '<path d="M12 3.5l7 2.6v5.4c0 4.4-3 7.9-7 9-4-1.1-7-4.6-7-9V6.1z"/><path d="M9 12l2 2 4-4"/>',
    'pulse': '<path d="M3 12h4l2.5-6 5 12 2.5-6h4"/>',
    'route': '<circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8.2 18H15a3 3 0 000-6H9a3 3 0 010-6h6.8"/>',
    'file': '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h4"/>',
    'calendar': '<rect x="4" y="5" width="16" height="15" rx="2.2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    'globe': '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.5 5.4 3.5 8.5s-1 5.9-3.5 8.5c-2.5-2.6-3.5-5.4-3.5-8.5s1-5.9 3.5-8.5z"/>',
    'building': '<path d="M5 20.5V5l7-2v17.5M12 8.5h7v12"/><path d="M8 8h1M8 11.5h1M8 15h1M15 12h1M15 15.5h1M3.5 20.5h17"/>',
    'scale': '<path d="M12 4v16M7 20h10M5 7h14"/><path d="M5 7l-2.5 6a3 3 0 005 0zM19 7l-2.5 6a3 3 0 005 0z"/>',
    'link': '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
    'quote': '<path d="M9.5 7.5C6.5 8.4 5 10.6 5 13.6V17h4.5v-4.5H7.3c0-1.8.9-2.9 2.6-3.5zM18.5 7.5c-3 .9-4.5 3.1-4.5 6.1V17h4.5v-4.5h-2.2c0-1.8.9-2.9 2.6-3.5z" fill="currentColor" stroke="none"/>',
    'linkedin': '<path d="M4.5 9h3v11h-3zM6 3.8a1.8 1.8 0 110 3.6 1.8 1.8 0 010-3.6zM10 9h2.9v1.5c.5-.9 1.7-1.8 3.4-1.8 3 0 3.7 2 3.7 4.6V20h-3v-5.7c0-1.3 0-3-1.9-3s-2.1 1.4-2.1 2.9V20H10z" fill="currentColor" stroke="none"/>',
    'filter': '<path d="M4 6.5h16M7 12h10M10 17.5h4"/>',
    'read': '<path d="M3.5 6A2 2 0 015.5 4H10a2 2 0 012 2v14a2 2 0 00-2-2H3.5zM20.5 6a2 2 0 00-2-2H14a2 2 0 00-2 2v14a2 2 0 012-2h6.5z"/>',
}


def icons(html):
    def rep(m):
        name = m.group(1)
        assert name in ICONS, f'unknown icon {name}'
        return f'<svg class="i" viewBox="0 0 24 24" aria-hidden="true">{ICONS[name]}</svg>'
    return re.sub(r'\{\{i:([\w-]+)\}\}', rep, html)


(CS / 'icons.js').write_text('window.CS_ICONS = ' + __import__('json').dumps(ICONS) + ';\n')

for src in sorted((CS / 'src').glob('*.html')):
    text = icons(src.read_text())
    meta = dict(re.findall(r'<!--\s*(\w+):\s*(.*?)\s*-->', text[:600]))
    main = re.sub(r'^(\s*<!--\s*\w+:.*?-->\s*)+', '', text)
    n = nav
    if meta.get('listing'):
        n = n.replace('<a href="#stories">Case studies</a>', f'<a href="{meta["listing"]}" data-go>Case studies</a>')
    out = PAGE.format(title=meta.get('title', 'devx labs'), desc=meta.get('desc', ''),
                      bodyclass=meta.get('body', 'cs'), top=top, nav=n, main=main, footer=footer)
    (ROOT / src.name).write_text(out)
    print('built', src.name)

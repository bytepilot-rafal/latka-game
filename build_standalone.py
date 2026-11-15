#!/usr/bin/env python3
"""Packs the game into ONE html file that runs by double-click (no server needed).

Usage:  python3 build_standalone.py
Output: dist/Przygody-zaginionej-Latki/index.html  (+ CZYTAJ-MNIE.txt and a .zip next to the folder)

Browsers refuse to load separate script files from a double-clicked page, so every module from src/
is embedded as text and turned into an in-memory module when the page opens. Three.js still comes
from the internet (CDN), so the player needs to be online.
"""
import os
import re
import shutil
import time

ROOT = os.path.dirname(os.path.abspath(__file__))
NAME = "Przygody-zaginionej-Latki"
OUT = os.path.join(ROOT, "dist", NAME)
WEB = os.path.join(ROOT, "docs")   # what GitHub Pages serves
ORDER = ["textures", "fx", "dog", "sky", "audio", "world", "main"]  # dependencies first

# Runs first on the hosted page: asks the server (bypassing every cache) which build is current and,
# if this copy is older, reloads under a new address so the browser cannot answer from its cache.
VERSION_CHECK = """<script>
  window.BUILD = '%s';
  if (location.protocol.indexOf('http') === 0) fetch('version.txt?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.text() : ''; }).then(function (v) {
    v = v.trim();
    if (/^[0-9-]+$/.test(v) && v !== window.BUILD && location.search.indexOf('v=' + v) < 0) location.replace(location.pathname + '?v=' + v);
  }).catch(function () {});
</script>
"""

LOADER = """
<script type="module">
  const order = %s, urls = {};
  for (const n of order) {
    let src = document.getElementById('m-' + n).textContent;
    src = src.replace(/from '\\.\\/(\\w+)\\.js'/g, (m, k) => "from '" + urls[k] + "'");
    urls[n] = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
  }
  import(urls.main).catch((e) => { document.getElementById('loading').textContent = 'Błąd: ' + e.message; });
</script>
"""

README = """PRZYGODY ZAGINIONEJ ŁATKI
=========================

Jak zagrać
  1. Rozpakuj folder.
  2. Kliknij dwa razy plik index.html (otworzy się w przeglądarce).
     Najlepiej działa w Chrome, Edge lub Safari na komputerze.
  3. Potrzebny jest internet (gra pobiera silnik 3D przy starcie).
  4. Poczekaj na ekran tytułowy i kliknij "Zacznij przygodę".

Sterowanie
  WASD / strzałki ....... ruch
  Spacja ................ skok
  Shift ................. bieg
  Mysz (przeciągnij),
  Q / E ................. obrót kamery
  Kółko myszy ........... przybliżenie
  H ..................... hau!
  M ..................... muzyka wł./wył.

Cel
  Zanim zajdzie słońce, znajdź pięć reliktów (szukaj kolorowych słupów światła)
  i otwórz Roszczeńskie Wrota. Za nimi czekają szczeniaki!
"""


def main():
    html = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    tag = '<script type="module" src="./src/main.js"></script>'
    assert tag in html, "index.html no longer contains the expected module tag"
    parts = []
    for n in ORDER:
        src = open(os.path.join(ROOT, "src", n + ".js"), encoding="utf-8").read()
        assert "</script" not in src.lower(), n + ".js contains a closing script tag"
        parts.append('<script type="text/plain" id="m-%s">\n%s\n</script>' % (n, src))
    # every src module must be embedded, otherwise an import would silently break
    for f in os.listdir(os.path.join(ROOT, "src")):
        assert not f.endswith(".js") or f[:-3] in ORDER, "src/%s is not in ORDER" % f
    for n in ORDER:
        for dep in re.findall(r"from '\./(\w+)\.js'", open(os.path.join(ROOT, "src", n + ".js"), encoding="utf-8").read()):
            assert ORDER.index(dep) < ORDER.index(n), "%s must come before %s in ORDER" % (dep, n)
    html = html.replace(tag, "\n".join(parts) + LOADER % repr(ORDER))
    build = time.strftime("%Y%m%d-%H%M%S")
    meta = '<meta charset="utf-8">'
    assert meta in html
    html = html.replace(meta, meta + "\n" + VERSION_CHECK % build, 1)
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(OUT)
    open(os.path.join(OUT, "index.html"), "w", encoding="utf-8").write(html)
    open(os.path.join(OUT, "CZYTAJ-MNIE.txt"), "w", encoding="utf-8").write(README)
    zip_base = os.path.join(ROOT, "dist", NAME)
    if os.path.exists(zip_base + ".zip"):
        os.remove(zip_base + ".zip")
    shutil.make_archive(zip_base, "zip", os.path.join(ROOT, "dist"), NAME)
    # the same single file is what gets published (GitHub Pages serves docs/)
    os.makedirs(WEB, exist_ok=True)
    open(os.path.join(WEB, "index.html"), "w", encoding="utf-8").write(html)
    open(os.path.join(WEB, "version.txt"), "w", encoding="utf-8").write(build + "\n")
    open(os.path.join(WEB, ".nojekyll"), "w").close()
    print("OK:", WEB, "build", build)
    print("OK:", OUT, "(%d KB)" % (os.path.getsize(os.path.join(OUT, "index.html")) // 1024))
    print("OK:", zip_base + ".zip")


if __name__ == "__main__":
    main()

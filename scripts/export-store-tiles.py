"""Export Chrome Web Store screenshot tiles (1280x800) from docs/store-tiles.html."""
import base64
import pathlib

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
HTML = ROOT / "docs" / "store-tiles.html"
SHOTS = ROOT / "assets" / "screenshots"
OUT = SHOTS / "store"
OUT.mkdir(exist_ok=True)

TILES = [
    {
        "out": "01-hover-1280x800.png",
        "img": "hover.png",
        "headline": "Understand any web app — just by hovering.",
        "subhead": "Framework, component, library, and the APIs it fires.",
        "layout": "stack",
        "size": 46,
    },
    {
        "out": "02-profile-1280x800.png",
        "img": "profile.png",
        "headline": "The whole page at a glance.",
        "subhead": "Tech stack, where it's hosted, and its live API surface.",
        "layout": "split",
        "size": 48,
    },
    {
        "out": "03-security-1280x800.png",
        "img": "security.png",
        "headline": "See which scripts can read your card field.",
        "subhead": "The client-side exposure a network firewall never shows.",
        "layout": "split",
        "size": 40,
    },
    {
        "out": "04-flow-1280x800.png",
        "img": "flow.png",
        "headline": "See what a click actually triggers.",
        "subhead": "Live flow — API calls, storage writes, outbound requests.",
        "layout": "stack",
        "size": 46,
    },
]

RENDER_JS = """
async ([cfg, imgB64]) => {
  S.mode = 'tile';
  S.headline = cfg.headline;
  S.subhead = cfg.subhead;
  S.layout = cfg.layout;
  S.size = cfg.size;
  S.bg = 'paper';
  S.grid = true;
  const img = new Image();
  await new Promise((res, rej) => {
    img.onload = res; img.onerror = rej;
    img.src = 'data:image/png;base64,' + imgB64;
  });
  S.img = img;
  if (document.fonts && document.fonts.ready) await document.fonts.ready;
  render();
  return document.getElementById('c').toDataURL('image/png');
}
"""

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto(HTML.as_uri())
    page.wait_for_load_state("networkidle")

    for tile in TILES:
        img_b64 = base64.b64encode((SHOTS / tile["img"]).read_bytes()).decode()
        data_url = page.evaluate(RENDER_JS, [tile, img_b64])
        png = base64.b64decode(data_url.split(",", 1)[1])
        (OUT / tile["out"]).write_bytes(png)
        print(f"wrote {tile['out']} ({len(png)} bytes)")

    browser.close()

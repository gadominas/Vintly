#!/usr/bin/env node
// Draws the sample photos the screenshot scenario uses (invented items, no real photos):
//   node docs/site/fixtures.js        → docs/site/fixtures/*.jpg|png
// Three items, two photos each, on a table by a wall: a denim jacket, white sneakers and a terracotta teapot.
// For each photo: the photo (900 × 1200), the mask the image model would draw on its 1024 × 1536 canvas (white item
// on black, placed exactly where Vintly letterboxes the photo), a cleaned version (the item on white) and thumbnails.
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const OUT = path.join(__dirname, 'fixtures');
const ITEMS = {
  jacket: `<g>
    <path d="M300 330 L380 300 Q450 340 520 300 L600 330 L700 520 L640 560 L600 470 L600 900 L300 900 L300 470 L260 560 L200 520 Z" fill="#3E6B9C"/>
    <path d="M380 300 Q450 360 520 300 L500 380 Q450 410 400 380 Z" fill="#2F567F"/>
    <path d="M450 395 L450 900" stroke="#27486B" stroke-width="6"/>
    <path d="M300 640 H600" stroke="#2F567F" stroke-width="5" stroke-dasharray="10 8"/>
    <rect x="330" y="520" width="90" height="70" rx="8" fill="none" stroke="#2F567F" stroke-width="5"/>
    <rect x="480" y="520" width="90" height="70" rx="8" fill="none" stroke="#2F567F" stroke-width="5"/>
    <g fill="#C9A227"><circle cx="465" cy="450" r="8"/><circle cx="465" cy="540" r="8"/><circle cx="465" cy="630" r="8"/><circle cx="465" cy="720" r="8"/><circle cx="465" cy="810" r="8"/></g>
  </g>`,
  sneakers: `<g>
    <path d="M150 760 Q160 650 240 630 L330 600 Q380 640 430 650 L470 700 Q500 760 480 800 L160 800 Q145 790 150 760 Z" fill="#F7F7F5" stroke="#D9D9D4" stroke-width="4"/>
    <path d="M150 790 L480 790 L478 820 L155 820 Z" fill="#C8A26B"/>
    <path d="M250 700 Q330 690 420 740" stroke="#14B8A6" stroke-width="14" fill="none" stroke-linecap="round"/>
    <path d="M430 730 Q440 640 520 620 L610 590 Q660 630 710 640 L750 690 Q780 750 760 790 L440 790 Q425 780 430 730 Z" fill="#F7F7F5" stroke="#D9D9D4" stroke-width="4"/>
    <path d="M430 780 L760 780 L758 810 L435 810 Z" fill="#C8A26B"/>
    <path d="M530 690 Q610 680 700 730" stroke="#14B8A6" stroke-width="14" fill="none" stroke-linecap="round"/>
    <g stroke="#9A9A94" stroke-width="4"><path d="M300 640 L340 660"/><path d="M310 625 L350 645"/><path d="M580 630 L620 650"/><path d="M590 615 L630 635"/></g>
  </g>`,
  teapot: `<g>
    <path d="M610 640 Q700 600 690 700 Q680 780 600 800" stroke="#A6452D" stroke-width="26" fill="none"/>
    <path d="M300 690 L220 600 L200 610 L270 740 Z" fill="#B74E33"/>
    <ellipse cx="450" cy="720" rx="190" ry="160" fill="#C2563A"/>
    <ellipse cx="450" cy="580" rx="110" ry="26" fill="#A6452D"/>
    <circle cx="450" cy="545" r="20" fill="#A6452D"/>
    <rect x="330" y="860" width="240" height="22" rx="8" fill="#A6452D"/>
    <g fill="#F2D3B5"><circle cx="390" cy="700" r="12"/><circle cx="450" cy="680" r="12"/><circle cx="510" cy="700" r="12"/><circle cx="420" cy="760" r="12"/><circle cx="480" cy="760" r="12"/></g>
  </g>`,
};
// Each photo: which item, how it sits (move and scale in the 900 × 1200 frame), and the wall's colour.
const PHOTOS = {
  a1: ['jacket', 'translate(0 20)', '#E9E2D6'], a2: ['jacket', 'translate(90 120) scale(0.8)', '#E4DED3'],
  b1: ['sneakers', 'translate(0 60)', '#DCE3E6'], b2: ['sneakers', 'translate(120 200) scale(0.75)', '#D6DEE2'],
  c1: ['teapot', 'translate(0 0)', '#ECE4D8'], c2: ['teapot', 'translate(110 150) scale(0.78)', '#E6DED1'],
};
const scene = (k) => {
  const [item, tr, wall] = PHOTOS[k];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
    <rect width="900" height="760" fill="${wall}"/><rect x="620" y="80" width="220" height="300" fill="#F7F3EA" stroke="#D2C8B6" stroke-width="10"/>
    <rect y="760" width="900" height="440" fill="#B98B5E"/>${[820, 900, 990, 1090].map((y) => `<path d="M0 ${y} H900" stroke="#A47A50" stroke-width="5"/>`).join('')}
    <circle cx="90" cy="690" r="70" fill="#5C8A5A"/><rect x="55" y="700" width="70" height="70" rx="8" fill="#8C5A3C"/>
    <ellipse cx="450" cy="905" rx="300" ry="26" fill="rgba(0,0,0,.18)"/>
    <g transform="${tr}">${ITEMS[item]}</g></svg>`;
};
// On the image model's 1024 × 1536 canvas the 900 × 1200 photo is scaled by 1024/900 and moved down by 85.33.
const mask = (k) => {
  const [item, tr] = PHOTOS[k];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1536" viewBox="0 0 1024 1536"><style>g *{fill:#fff!important;stroke:#fff!important}</style>
    <rect width="1024" height="1536" fill="#000"/><g transform="translate(0 85.333) scale(1.137778)"><g transform="${tr}">${ITEMS[item]}</g></g></svg>`;
};
const clean = (k) => {
  const [item, tr] = PHOTOS[k];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="120 150 660 880"><rect x="0" y="0" width="900" height="1200" fill="#fff"/><g transform="${tr}">${ITEMS[item]}</g></svg>`;
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const p = await (await b.newContext({ deviceScaleFactor: 1 })).newPage();
  const shot = async (svg, w, h, file, type) => {
    await p.setViewportSize({ width: w, height: h });
    await p.setContent(`<html><body style="margin:0">${svg.replace(/width="\d+" height="\d+"/, `width="${w}" height="${h}"`)}</body></html>`);
    await p.screenshot({ path: path.join(OUT, file), type, quality: type === 'jpeg' ? 86 : undefined, clip: { x: 0, y: 0, width: w, height: h } });
  };
  for (const k of Object.keys(PHOTOS)) {
    await shot(scene(k), 900, 1200, k + '.jpg', 'jpeg');
    await shot(scene(k), 270, 360, k + '-t.jpg', 'jpeg');
    await shot(mask(k), 1024, 1536, k + '-mask.png', 'png');
    await shot(clean(k), 900, 1200, k + '-clean.jpg', 'jpeg');
    await shot(clean(k), 270, 360, k + '-ct.jpg', 'jpeg');
  }
  await b.close();
  console.log('fixtures in ' + path.relative(process.cwd(), OUT));
})();

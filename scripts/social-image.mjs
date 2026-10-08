import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const photo = (await readFile(path.join(root, 'assets/brad-nortman.png'))).toString('base64');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><head><style>
  *{box-sizing:border-box}body{margin:0;width:1200px;height:630px;background:#082c29;color:#fff9ef;font-family:Arial,sans-serif;overflow:hidden}
  .photo{position:absolute;right:0;top:0;width:548px;height:630px;object-fit:cover;object-position:62% center}
  .shade{position:absolute;inset:0;background:linear-gradient(90deg,#082c29 49%,transparent 74%)}
  main{position:absolute;inset:48px auto 45px 58px;width:750px}
  .eyebrow{font-size:17px;letter-spacing:4px;font-weight:700;text-transform:uppercase;color:#b8d8c9}
  h1{font-size:80px;letter-spacing:-4px;line-height:.99;margin:46px 0 20px;font-weight:900}
  h1 span{color:#f2c45a}p{font-size:24px;letter-spacing:-.3px;margin:0;color:#d8e5de}
  footer{position:absolute;bottom:0;display:flex;gap:19px;align-items:center;font-size:18px;font-weight:700}
  .date{background:#f2c45a;color:#082c29;padding:14px 18px;border-radius:5px}
  </style></head><body><img class="photo" src="data:image/png;base64,${photo}" alt=""><div class="shade"></div><main><div class="eyebrow">A Jacksonville get-together</div><h1>Bring Brad<br><span>&amp; the kids.</span></h1><p>Let's get the whole crew to Jacksonville.</p><footer><span class="date">OCTOBER 17, 2026</span><span>Help make the trip happen ↗</span></footer></main></body></html>`);
  await page.locator('.photo').evaluate(image => image.decode());
  await page.screenshot({ path: path.join(root, 'assets/social-preview.png') });
  console.log('Created assets/social-preview.png (1200 × 630)');
} finally { await browser.close(); }

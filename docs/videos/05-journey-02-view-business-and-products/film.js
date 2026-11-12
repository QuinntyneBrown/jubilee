// Journey 2 demo: eight scenes, each three bars (10 s at 72 BPM). Every picture is a screenshot of the
// running Angular app, taken by shots.ts and shown inside a browser, phone or mail frame. Each scene
// draws purely from its local time t (seconds). Positions are px on the 1920x1080 board.
(() => {
  const { SCENE: LEN, lerp, prog, brand, outBack, enter, exit } = window.PITCH;

  const SHOT = (name) => `shots/${name}.png`;
  const H1 = 'font-size:74px;font-weight:700;line-height:1.02;letter-spacing:-0.03em';
  const fadeIn = (S) => `<div class="fill" style="background:var(--ink);z-index:30" ${S.ref((el, t) => { el.style.opacity = 1 - enter(t, 0, 0.5); })}></div>`;
  const fadeOut = (S) => `<div class="fill" style="background:var(--ink);z-index:30" ${S.ref((el, t) => { el.style.opacity = exit(t, LEN - 0.9, 0.8, (p) => p); })}></div>`;

  /** The wordmark: lowercase "jubilee", Archivo 700 at 110% width and -0.03em, rising letter by letter. */
  const wordmark = (S, size, at) => `<span style="display:inline-flex;overflow:hidden;line-height:1;font-family:Archivo,sans-serif;font-weight:700;font-variation-settings:'wdth' 110;font-stretch:110%;letter-spacing:-0.03em;font-size:${size}px;padding-bottom:0.12em">${'jubilee'.split('').map((l, i) => `<span style="display:inline-block" ${S.ref((el, t) => {
    const e = brand(prog(t, at + i * 0.05, 0.35));
    el.style.transform = `translateY(${(1 - e) * 0.9}em)`;
    el.style.opacity = e;
  })}>${l}</span>`).join('')}</span>`;

  /** Slides a frame in from the right. It then holds still, so small text stays sharp and the file small. */
  const arrive = (S, at) => S.ref((el, t) => {
    const p = enter(t, at, 0.6);
    el.style.opacity = p;
    el.style.transform = `translateX(${lerp(90, 0, p)}px)`;
  });
  /** A picture that takes the place of the one under it. */
  const swap = (S, at) => S.ref((el, t) => { el.style.opacity = prog(t, at, 0.35); });
  /** A close-up that pops in. */
  const pop = (S, at) => S.ref((el, t) => {
    const p = prog(t, at, 0.34);
    el.style.opacity = Math.min(1, p * 3);
    el.style.transform = `scale(${lerp(0.82, 1, outBack(p))})`;
  });

  const dots = '<span style="display:flex;gap:9px">' + ['#e0655a', '#e5b23f', '#57b46b'].map((c) => `<span style="display:block;width:14px;height:14px;border-radius:50%;background:${c}"></span>`).join('') + '</span>';

  /** A browser window showing one screenshot, or several that follow one another: [{ name, at }]. */
  const browser = (S, { x, y, w, url, shots, at = 0.5 }) => `<div class="a" style="left:${x}px;top:${y}px;width:${w}px;border-radius:18px;overflow:hidden;background:#fff;box-shadow:0 40px 110px rgb(0 0 0 / 0.55)" ${arrive(S, at)}>
<div style="height:46px;background:#e7e4dc;display:flex;align-items:center;gap:20px;padding:0 20px">${dots}<span class="s" style="flex:1;max-width:560px;height:28px;border-radius:999px;background:#fff;color:#4a505c;font-size:16px;line-height:28px;padding:0 16px;white-space:nowrap;overflow:hidden">${url}</span></div>
<div style="position:relative;width:${w}px;height:${Math.round(w * 800 / 1280)}px;overflow:hidden">${shots.map((s, i) => `<img src="${SHOT(s.name)}" alt="" class="fill cover" style="object-position:50% 0" ${i ? swap(S, s.at) : ''}>`).join('')}</div>
</div>`;

  /** A phone showing one screenshot. */
  const phone = (S, { x, y, w, name, at }) => `<div class="a" style="left:${x}px;top:${y}px;width:${w}px;padding:12px;border-radius:44px;background:#11151d;border:3px solid #343b4a;box-shadow:0 40px 100px rgb(0 0 0 / 0.6)" ${arrive(S, at)}>
<img src="${SHOT(name)}" alt="" style="width:100%;border-radius:32px">
</div>`;

  /** A close-up of one part of the page, in a gold edge. */
  const closeUp = (S, { x, y, w, name, at, zoom = 1 }) => `<div class="a" style="left:${x}px;top:${y}px;width:${w}px;transform-origin:50% 50%;border-radius:18px;border:5px solid var(--gold);overflow:hidden;background:#fff;box-shadow:0 30px 80px rgb(0 0 0 / 0.6)" ${pop(S, at)}>
<img src="${SHOT(name)}" alt="" style="width:${zoom * 100}%;max-width:none">
</div>`;

  /** The words of a scene: the requirement it shows, a headline and one supporting line. */
  const words = (S, { kicker, lines, accent, note, w = 560 }) => `<div class="a" style="left:96px;top:150px;width:${w}px">
<p class="s" style="font-size:24px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--gold)" ${S.rise(0.3)}>${kicker}</p>
<h1 class="d" style="margin-top:22px;${H1}">${lines.map((line, i) => S.words(0.55 + i * 0.28, line, { stagger: 0.06 })).join('<br>')}${accent ? `<br>${S.words(0.55 + lines.length * 0.28, '', { accent, stagger: 0.06 })}` : ''}</h1>
<p class="s" style="margin-top:30px;font-size:30px;line-height:1.4;color:rgb(244 242 236 / 0.78)" ${S.rise(1.7)}>${note}</p>
</div>`;

  const scene = (S, inner, { first = false, last = false } = {}) => `<div class="fill" style="background:radial-gradient(1200px 800px at 78% 30%, #18202e 0%, var(--ink) 70%);color:var(--cream)">
${inner}
${first ? fadeIn(S) : ''}${last ? fadeOut(S) : ''}
</div>`;

  // ── S01 · Title · 0:00–0:10 ─────────────────────────────────────────────────────────────────────────
  const ITEMS = ['“Sold out” on product cards', 'The owner’s sold-out toast', 'Back in stock: told once, in the app and by e-mail', 'The status on a preview'];
  const title = (S) => scene(S, `
<div class="a" style="left:96px;top:120px;display:flex;align-items:flex-start;gap:18px">
${S.drawnMark(84, { draw: (t) => enter(t, 0.2, 0.5), bar: (t) => enter(t, 0.6, 0.3) })}
<div style="margin-top:6px">${wordmark(S, 76, 0.5)}</div></div>
<div class="a" style="left:96px;top:290px;width:880px">
<p class="s" style="font-size:26px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--gold)" ${S.rise(1.0)}>Journey 2 · demo</p>
<h1 class="d" style="margin-top:20px;font-size:90px;font-weight:700;line-height:1;letter-spacing:-0.035em">${S.words(1.3, 'View a business')}<br>${S.words(1.7, 'and its', { accent: 'products' })}</h1>
<ul class="s" style="margin-top:44px;font-size:30px;line-height:1.3">${ITEMS.map((item, i) => `<li style="display:flex;gap:16px;align-items:baseline;margin-top:14px" ${S.rise(3.4 + i * 0.7)}><span style="display:block;flex:none;width:12px;height:12px;border-radius:50%;background:var(--gold)"></span>${item}</li>`).join('')}</ul>
</div>
${browser(S, { x: 1010, y: 210, w: 820, url: 'app.jubilee.to/b/luzandre', shots: [{ name: 'shop-sold-out' }], at: 2.2 })}
`, { first: true });

  // ── S02 · The owner's toast · 0:10–0:20 ─────────────────────────────────────────────────────────────
  const owner = (S) => scene(S, `
${words(S, { kicker: 'My products · L2-036', lines: ['Stock set to 0.'], accent: 'The owner is told.', note: 'A warning toast takes the place of “Product updated”.' })}
${browser(S, { x: 720, y: 130, w: 1110, url: 'app.jubilee.to/my-business/products', shots: [{ name: 'owner-editor' }, { name: 'owner-toast', at: 4.0 }] })}
${closeUp(S, { x: 96, y: 640, w: 760, name: 'owner-toast-detail', at: 5.2 })}
`);

  // ── S03 · Sold out on the card · 0:20–0:30 ──────────────────────────────────────────────────────────
  const shop = (S) => scene(S, `
${words(S, { kicker: 'Shop page · L2-034', lines: ['“Sold out”,'], accent: 'said in words.', note: 'On the card’s tile, read with its name. Never a colour alone.' })}
${browser(S, { x: 720, y: 130, w: 1110, url: 'app.jubilee.to/b/luzandre', shots: [{ name: 'shop-sold-out' }] })}
${phone(S, { x: 1560, y: 330, w: 300, name: 'shop-sold-out-phone', at: 2.6 })}
${closeUp(S, { x: 270, y: 560, w: 330, name: 'shop-sold-out-detail', at: 3.6 })}
`);

  // ── S04 · A member asks · 0:30–0:40 ─────────────────────────────────────────────────────────────────
  const ask = (S) => scene(S, `
${words(S, { kicker: 'Product page · L2-036', lines: ['A member asks'], accent: 'to be told.', note: '“Tell me when it’s back” becomes “We’ll tell you when it’s back”.' })}
${browser(S, { x: 720, y: 130, w: 1110, url: 'app.jubilee.to/b/luzandre/p/gold-cross-stoneware-mug', shots: [{ name: 'product-sold-out' }, { name: 'product-alert-requested', at: 5.4 }] })}
`);

  // ── S05 · Told in the app · 0:40–0:50 ───────────────────────────────────────────────────────────────
  const notice = (S) => scene(S, `
${words(S, { kicker: 'Notifications · L2-036, L2-064', lines: ['Back in stock.'], accent: 'Told once.', note: 'A toast with “View in shop”, and a line in the notification centre.' })}
${browser(S, { x: 720, y: 130, w: 1110, url: 'app.jubilee.to', shots: [{ name: 'notice-toast' }, { name: 'notifications', at: 6.0 }] })}
${closeUp(S, { x: 96, y: 640, w: 760, name: 'notice-toast-detail', at: 2.8 })}
`);

  // ── S06 · And by e-mail · 0:50–1:00 ─────────────────────────────────────────────────────────────────
  const mail = (S) => scene(S, `
${words(S, { kicker: 'E-mail · L2-036, L2-068', lines: ['And one e-mail,'], accent: 'if they want it.', note: 'Under “Request updates”, with a one-click unsubscribe link. Jubilee takes no payment.', w: 700 })}
<div class="a" style="left:1010px;top:150px;width:700px;border-radius:18px;overflow:hidden;background:#fff;box-shadow:0 40px 110px rgb(0 0 0 / 0.55)" ${arrive(S, 0.5)}>
<div class="s" style="height:76px;background:#e7e4dc;color:#0b0e14;padding:12px 24px;font-size:18px;line-height:1.45"><b style="font-weight:600">Gold cross stoneware mug is back in stock</b><br><span style="color:#4a505c">Jubilee · to Joanna</span></div>
<img src="${SHOT('email')}" alt="" style="width:700px">
</div>
`);

  // ── S07 · The preview status · 1:00–1:10 ────────────────────────────────────────────────────────────
  const preview = (S) => scene(S, `
${words(S, { kicker: 'Business page · L2-219', lines: ['A preview'], accent: 'gives its status.', note: 'For the owner, and for the verification team. Members can’t open it.' })}
${browser(S, { x: 720, y: 130, w: 1110, url: 'app.jubilee.to/b/legacy-financial', shots: [{ name: 'preview-owner' }, { name: 'preview-team', at: 5.6 }] })}
${closeUp(S, { x: 96, y: 620, w: 1180, name: 'preview-owner-detail', at: 2.8, zoom: 1.7 })}
${closeUp(S, { x: 96, y: 860, w: 1180, name: 'preview-team-detail', at: 6.2, zoom: 1.7 })}
`);

  // ── S08 · Close · 1:10–1:20 ─────────────────────────────────────────────────────────────────────────
  const MISSION = ['Abiding in Jesus and for love of Him,', 'Jubilee equips Christian business people', 'in Toronto to prosper with purpose', 'and resource His Kingdom.'];
  const close = (S) => scene(S, `
<div class="fill" style="display:flex;flex-direction:column;align-items:center;padding-top:150px">
<div style="display:flex;align-items:flex-start;gap:22px">
${S.drawnMark(150, { draw: (t) => enter(t, 0.1, 0.5), bar: (t) => enter(t, 0.55, 0.3) })}
<div style="margin-top:12px">${wordmark(S, 138, 0.4)}</div></div>
<p class="d" style="margin-top:80px;width:1400px;text-align:center;font-size:56px;font-weight:600;line-height:1.24;letter-spacing:-0.02em">${MISSION.map((line, i) => `<span style="display:block" ${S.rise(1.2 + i * 1.5, { dur: 0.5 })}>${line}</span>`).join('')}</p>
<p class="s" style="margin-top:64px;border-radius:999px;background:var(--gold);color:var(--ink);padding:14px 40px;font-size:30px;font-weight:600" ${S.rise(7.4)}>Journey 2 · View a business and its products · complete</p>
</div>
`, { last: true });

  window.PITCH.film([
    { id: 'title', build: title },
    { id: 'owner', build: owner },
    { id: 'shop', build: shop },
    { id: 'ask', build: ask },
    { id: 'notice', build: notice },
    { id: 'mail', build: mail },
    { id: 'preview', build: preview },
    { id: 'close', build: close },
  ]);
})();

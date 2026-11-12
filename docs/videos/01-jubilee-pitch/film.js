// Meet Jubilee: the nine scenes, ported from the Magic Patterns "Pitch Video" prototype. Each is three
// bars (7.2 s at 100 BPM) and draws purely from its local time t. Positions are px on the 1920x1080
// board; b(n) is beat n of the scene. Change the design in Magic Patterns first, then here.
(() => {
  const { COLOR, SCENE: LEN, b, clamp, lerp, prog, brand, outExpo, inOutCubic, outBack, enter, exit, pulse, beatsBetween, esc } = window.PITCH;

  const PHOTOS = '../../assets/photos/';
  /** Every photo the film uses, from docs/assets/photos. */
  const PHOTO = {
    sunday: PHOTOS + 'sunday.jpg',
    monday: PHOTOS + 'monday.jpg',
    torontoDusk: PHOTOS + 'toronto-dusk.jpg',
    owner: PHOTOS + 'owner.jpg',
    vouch: PHOTOS + 'vouch.jpg',
    // From the app's own catalogue
    tshirt: PHOTOS + 'tshirt.jpg',
    mug: PHOTOS + 'mug.jpg',
    books: PHOTOS + 'books.jpg',
    flowers: PHOTOS + 'flowers.jpg',
    advisor: PHOTOS + 'advisor.jpg',
  };

  // ── S01 · Sunday · 0:00.00–0:07.20 · bars 1–3 ─────────────────────────────────────────────────────
  // Warm photo, slow pull-out. The promise: trust you already have.
  const sunday = (S) => {
    const out = (t) => exit(t, b(11), 0.24);
    return `<div class="fill" style="overflow:hidden;background:var(--ink);color:var(--cream)">
<img src="${PHOTO.sunday}" alt="" class="fill cover" ${S.ref((el, t) => {
      const drain = prog(t, b(10), b(2)); // last bar: the warmth drains toward Monday
      const bump = pulse(t, [b(0), b(4), b(8)], 6); // bar downbeats breathe the exposure
      el.style.opacity = enter(t, 0, 0.3); // up from black on the first piano chord
      el.style.transform = `scale(${lerp(1.09, 1.0, t / 7.2)}) translateX(${lerp(-18, 0, t / 7.2)}px)`;
      el.style.filter = `saturate(${lerp(1.08, 0.25, drain)}) brightness(${lerp(1, 0.7, drain) + bump * 0.05}) sepia(${lerp(0.12, 0, drain)})`;
    })}>
<div class="fill" style="background:rgb(11 14 20 / 0.45)"></div>
<div class="a" style="left:140px;top:176px;max-width:1180px" ${S.ref((el, t) => { el.style.opacity = 1 - out(t); el.style.transform = `translateY(${-out(t) * 30}px)`; })}>
<h1 class="d" style="font-size:156px;font-weight:700;line-height:0.94;letter-spacing:-0.035em">${S.words(b(1), 'On Sunday,')}</h1>
<p class="d" style="margin-top:24px;font-size:84px;font-weight:600;line-height:1.02;letter-spacing:-0.025em">${S.words(b(2.5), 'you know exactly who to')}<span style="position:relative;display:inline-block">${S.words(b(2.5) + 0.25, '', { accent: 'trust.' })}<span class="a" style="bottom:-8px;left:0;height:14px;width:88%;background:var(--gold);transform-origin:left" ${S.ref((el, t) => { el.style.transform = `scaleX(${enter(t, b(4), 0.3)})`; })}></span></span></p>
</div>
<div class="a" style="bottom:120px;left:140px;display:flex;align-items:center;gap:16px" ${S.rise(b(6))}>
<span style="width:12px;height:12px;border-radius:999px;background:var(--gold)"></span>
<span class="s" style="font-size:30px;font-weight:500;letter-spacing:-0.01em;color:rgb(244 242 236 / 0.9)">Sunday · 12:10 pm · after the second service</span>
</div>
</div>`;
  };

  // ── S02 · Monday · 0:07.20–0:14.40 · bars 4–6 ─────────────────────────────────────────────────────
  // Cold grade, a search feed full of strangers that scrolls faster on the hi-hats, then a stop.
  const STRANGERS = [
    { name: 'Plumber Near Me 24/7', stars: 3.1, reviews: 14, ad: true, quote: 'Quoted $90, charged $400' },
    { name: 'AAA Drain Pros', stars: 2.8, reviews: 31, ad: false, quote: 'Never showed up' },
    { name: 'Emergency Plumbing Deals', stars: 4.0, reviews: 6, ad: true, quote: 'Not sure this is real' },
    { name: 'QuickFix Toronto', stars: 3.4, reviews: 22, ad: false, quote: 'Fixed it, then it leaked again' },
    { name: 'Best Plumber GTA', stars: 4.6, reviews: 3, ad: true, quote: 'Who wrote these reviews?' },
    { name: 'Drain Kings Ltd', stars: 2.2, reviews: 48, ad: false, quote: 'Rude on the phone' },
  ];
  const monday = (S) => {
    const freeze = (t) => prog(t, b(8), b(3));
    return `<div class="fill" style="overflow:hidden;background:var(--ink);color:var(--cream)">
<img src="${PHOTO.monday}" alt="" class="fill cover" ${S.ref((el, t) => {
      // Handheld: deterministic sway, a few px
      el.style.transform = `scale(1.06) translate(${Math.sin(t * 1.3) * 5}px, ${Math.cos(t * 0.9) * 4}px)`;
      el.style.filter = `saturate(0.35) brightness(${0.8 - freeze(t) * 0.2}) contrast(1.05) hue-rotate(-8deg)`;
    })}>
<div class="fill" style="background:rgb(11 14 20 / 0.55)"></div>
<div class="a" style="left:140px;top:176px;width:960px"><!-- the two headlines are held on one line: the last word's trailing gap would otherwise wrap them -->
<h1 class="d" style="font-size:156px;font-weight:700;line-height:0.94;letter-spacing:-0.035em;white-space:nowrap">${S.words(b(0.5), 'On Monday,')}</h1>
<p class="d" style="margin-top:24px;font-size:72px;font-weight:600;line-height:1.04;letter-spacing:-0.025em;color:rgb(244 242 236 / 0.85)">${S.words(b(2), 'the pipe bursts.')}</p>
<p class="d" style="margin-top:80px;font-size:112px;font-weight:700;line-height:0.96;letter-spacing:-0.035em;white-space:nowrap">${S.words(b(7), 'Who do you', { accent: 'call?', stagger: 0.06 })}</p>
</div>
<div class="a" style="bottom:120px;left:140px;display:flex;align-items:center;gap:16px" ${S.rise(b(1))}>
<span style="width:12px;height:12px;border-radius:999px;background:rgb(244 242 236 / 0.6)"></span>
<span class="s" style="font-size:30px;font-weight:500;color:rgb(244 242 236 / 0.8)">Monday · 7:52 am</span>
</div>
<div class="a s" style="right:150px;top:110px;height:900px;width:600px;overflow:hidden;border-radius:48px;background:var(--cream);color:var(--ink)" ${S.ref((el, t) => {
      // Rises in on bar 2, pulses on the hi-hat 8ths, freezes and blurs on bar 3
      const feedIn = enter(t, b(3), 0.3);
      const tick = pulse(t, beatsBetween(4, 8, 0.5), 18);
      el.style.opacity = feedIn;
      el.style.transform = `translateY(${(1 - feedIn) * 60}px) rotate(3deg) scale(${1 + tick * 0.006})`;
      el.style.filter = `blur(${freeze(t) * 6}px)`;
    })}>
<div style="position:relative;z-index:1;display:flex;height:96px;align-items:center;gap:16px;border-bottom:1px solid rgb(11 14 20 / 0.1);padding:0 32px;background:var(--cream)">
<div style="height:52px;flex:1;border-radius:999px;background:rgb(11 14 20 / 0.06);padding:0 24px;font-size:24px;line-height:52px;color:rgb(11 14 20 / 0.7)">plumber near me open now</div>
</div>
<div ${S.ref((el, t) => {
      const scrollT = clamp(t - b(4), 0, b(4)); // accelerates through bar 2
      el.style.transform = `translateY(${-(90 * scrollT + 260 * scrollT * scrollT)}px)`;
    })}>${[...STRANGERS, ...STRANGERS, ...STRANGERS].map((r) => `<div style="border-bottom:1px solid rgb(11 14 20 / 0.1);padding:24px 32px">
<div style="display:flex;align-items:center;gap:12px">${r.ad ? '<span style="border-radius:4px;background:rgb(11 14 20 / 0.1);padding:2px 8px;font-size:16px;font-weight:600;color:rgb(11 14 20 / 0.7)">Sponsored</span>' : ''}<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:26px;font-weight:600">${esc(r.name)}</span></div>
<div style="margin-top:8px;display:flex;align-items:center;gap:12px;font-size:20px;color:rgb(11 14 20 / 0.6)"><span style="color:#b7791f">${'★'.repeat(Math.round(r.stars))}${'☆'.repeat(5 - Math.round(r.stars))}</span><span>${r.stars.toFixed(1)} (${r.reviews})</span></div>
<p style="margin-top:8px;font-size:20px;font-style:italic;color:rgb(11 14 20 / 0.55)">“${esc(r.quote)}”</p>
</div>`).join('')}</div>
</div>
${S.wipe((t) => lerp(0, 0.5, prog(t, b(11.5), 0.3)))}
</div>`;
  };

  // ── S03 · Meet Jubilee · 0:14.40–0:21.60 · bars 7–9 · THE DROP ────────────────────────────────────
  // The gold slab from S02 collapses into the logo's crossbar; the J draws under it; the aurora wakes on the kick.
  const MARK = 250, MARK_X = 392, MARK_Y = 190;
  const BAR_RECT = { x: MARK_X + 0.36 * MARK, y: MARK_Y + 0.1975 * MARK, w: 0.48 * MARK, h: 0.145 * MARK };
  const BOROUGHS = [['Etobicoke', 250], ['York', 520], ['Downtown', 1050], ['North York', 800], ['East York', 1340], ['Scarborough', 1630]];
  const meet = (S) => {
    const collapse = (t) => outExpo(prog(t, 0, 0.36));
    return `<div class="fill" style="overflow:hidden;background:var(--ink);color:var(--cream)">
${S.aurora((t) => enter(t, 0.15, 0.3) * (0.85 + pulse(t, beatsBetween(0, 12), 7) * 0.4), { horizon: 0.7 })}
<img src="${PHOTO.torontoDusk}" alt="" class="a cover" style="left:0;right:0;bottom:0;mix-blend-mode:lighten;object-position:50% 70%" ${S.ref((el, t) => {
      el.style.opacity = enter(t, b(2), 0.3) * 0.9;
      el.style.transform = `scale(${lerp(1.04, 1, t / LEN)})`;
    })}>
<div class="a" style="left:${MARK_X}px;top:${MARK_Y}px;display:flex;align-items:flex-start;gap:30px">
${S.drawnMark(MARK, { draw: (t) => enter(t, 0.3, 0.3), bar: (t) => (collapse(t) >= 1 ? 1 : 0) })}
<div style="margin-top:22px">${S.wordmark(230, (t) => prog(t, 0.6, 0.45))}</div>
</div>
<div class="a" style="background:var(--gold)" ${S.ref((el, t) => {
      // The slab becoming the crossbar
      const c = collapse(t);
      el.style.display = c < 1 ? 'block' : 'none';
      el.style.left = `${lerp(0, BAR_RECT.x, c)}px`;
      el.style.top = `${lerp(0, BAR_RECT.y, c)}px`;
      el.style.width = `${lerp(1920, BAR_RECT.w, c)}px`;
      el.style.height = `${lerp(1080, BAR_RECT.h, c)}px`;
    })}></div>
<h2 class="a d" style="left:0;right:0;top:560px;text-align:center;font-size:92px;font-weight:700;line-height:1;letter-spacing:-0.03em">${S.words(b(3.5), 'Toronto’s Christian businesses,')}<br>${S.words(b(5), '', { accent: 'all in one place.', stagger: 0.06 })}</h2>
${BOROUGHS.map(([name, x], i) => `<div class="a" style="left:${x}px;top:840px;display:flex;flex-direction:column;align-items:center" ${S.ref((el, t) => {
      // Pins pop on the 8ths of bar 3
      const s = outBack(prog(t, b(8) + i * 0.3, 0.26));
      el.style.opacity = Math.min(1, s);
      el.style.transform = `translate(-50%, ${(1 - s) * 16}px) scale(${0.96 + 0.04 * s})`;
    })}><span class="s" style="border-radius:999px;background:var(--cream);padding:8px 20px;font-size:24px;line-height:1.5;font-weight:600;color:var(--ink)">${name}</span><span style="height:40px;width:3px;background:var(--gold)"></span><span style="height:16px;width:16px;border-radius:999px;background:var(--gold)"></span></div>`).join('')}
<div class="a" style="left:0;right:0;bottom:0;background:var(--cream)" ${S.ref((el, t) => { el.style.height = `${1080 * enter(t, b(11.5), 0.3, inOutCubic)}px`; })}></div>
</div>`;
  };

  // ── S04 · Why join · 0:21.60–0:28.80 · bars 10–12 ─────────────────────────────────────────────────
  // Cream paper. The seal stamps on "verified"; three reasons arrive on the narration, each drawing its rule.
  const REASONS = [
    { at: b(2.5), title: 'Verified by the Jubilee team.', body: 'Every business is verified by the Jubilee team before it appears. No guessing from star ratings.' },
    { at: b(4.5), title: 'Your money stays in the community.', body: 'Every purchase supports a family that shares your faith and your city.' },
    { at: b(7.5), title: 'Free for members.', body: 'Browse, save and share as much as you like. Find it in seconds, not Sundays.' },
  ];
  const whyJoin = (S) => `<div class="fill" style="overflow:hidden;background:var(--cream);color:var(--ink)">
<div class="a" style="left:140px;top:150px;width:720px">
<h1 class="d" style="font-size:150px;font-weight:700;line-height:0.92;letter-spacing:-0.04em">${S.words(b(0.5), 'Trust,')}<br>${S.words(b(1), '', { accent: 'built in.', accentClass: 'clay' })}</h1>
<div style="margin-top:64px;width:320px;transform-origin:50% 50%" ${S.ref((el, t) => {
    // Drops from 118% and −16°, lands with an overshoot, then thumps
    const stampP = prog(t, b(2), 0.22), stamp = outBack(stampP);
    const thump = pulse(t, [b(2) + 0.2, b(8)], 9);
    el.style.opacity = Math.min(1, stampP * 4);
    el.style.transform = `translate(${thump * 3}px, ${thump * 2}px) scale(${lerp(1.18, 1, stamp) + thump * 0.025}) rotate(${lerp(-16, -6, stamp)}deg)`;
  })}>${S.seal(320, 12)}</div>
</div>
<ul class="a" style="right:140px;top:150px;width:880px">${REASONS.map((r) => `<li style="position:relative;padding:36px 0">
<span class="a" style="left:0;top:0;height:2px;width:100%;background:rgb(11 14 20 / 0.2);transform-origin:left" ${S.ref((el, t) => { el.style.transform = `scaleX(${enter(t, r.at, 0.3)})`; })}></span>
<h3 class="d" style="font-size:50px;font-weight:700;line-height:1.04;letter-spacing:-0.025em">${S.words(r.at + 0.05, r.title, { stagger: 0.035 })}</h3>
<p class="s" style="margin-top:16px;max-width:780px;font-size:28px;line-height:1.4;color:rgb(11 14 20 / 0.7)" ${S.ref((el, t) => {
    const p = enter(t, r.at + 0.25, 0.3);
    el.style.opacity = p;
    el.style.transform = `translateY(${(1 - p) * 18}px)`;
  })}>${r.body}</p>
</li>`).join('')}</ul>
${S.wipe((t) => lerp(0, 0.5, prog(t, b(11.5), 0.3)))}
</div>`;

  // ── S05 · Shop · 0:28.80–0:36.00 · bars 13–15 ─────────────────────────────────────────────────────
  // Deep emerald. Four catalogue products land on their spoken word; bar 3 fills the bag on every beat.
  const PRODUCTS = [
    { word: 'Bibles', at: b(3), name: 'Leather journaling Bible, ESV', shop: 'Christian Bookstores', price: '$64', img: PHOTO.books, x: 980, y: 90, r: -3, drift: 22 },
    { word: 'gifts', at: b(4), name: 'Gold cross stoneware mug', shop: 'Luzandre.com', price: '$24', img: PHOTO.mug, x: 1390, y: 150, r: 2.5, drift: 34 },
    { word: 'apparel', at: b(5), name: 'Faith heavyweight tee', shop: 'Luzandre.com', price: '$34', img: PHOTO.tshirt, x: 1010, y: 520, r: 2, drift: 30 },
    { word: 'flowers', at: b(6), name: 'Seasonal hand-tied bouquet', shop: 'Flower Creations', price: '$65', img: PHOTO.flowers, x: 1420, y: 580, r: -2.5, drift: 18 },
  ];
  const ADDS = [b(8), b(9), b(10), b(11)];
  const shop = (S) => {
    const count = (t) => Math.max(1, ADDS.filter((a) => t >= a).length);
    const shops = (t) => new Set(PRODUCTS.slice(0, count(t)).map((p) => p.shop)).size;
    return `<div class="fill" style="overflow:hidden;background:var(--emerald-deep);color:var(--cream)">
<div class="a" style="left:140px;top:170px;width:760px">
<h1 class="d" style="font-size:118px;font-weight:700;line-height:0.95;letter-spacing:-0.035em">${S.words(b(0.3), 'Shop makers who share your', { accent: 'faith.' })}</h1>
<p class="d" style="margin-top:48px;display:flex;flex-wrap:wrap;gap:8px 20px;font-size:44px;line-height:1.5;font-weight:600;letter-spacing:-0.02em">${PRODUCTS.map((p, i) => `<span ${S.ref((el, t) => {
      const on = enter(t, p.at - 0.05, 0.2);
      el.style.opacity = 0.25 + 0.75 * on;
      el.style.color = on > 0.5 ? COLOR.gold : COLOR.cream;
    })}>${p.word}${i < PRODUCTS.length - 1 ? ' ·' : ''}</span>`).join('')}</p>
</div>
${PRODUCTS.map((p, i) => `<div class="a s" style="left:${p.x}px;width:380px;overflow:hidden;border-radius:28px;background:var(--cream);color:var(--ink);box-shadow:0 30px 60px -20px rgb(0 0 0 / 0.45)" ${S.ref((el, t) => {
      const land = outBack(prog(t, p.at, 0.28));
      el.style.top = `${p.y - (t / LEN) * p.drift}px`;
      el.style.opacity = Math.min(1, prog(t, p.at, 0.12));
      el.style.transform = `translateY(${(1 - land) * 90}px) rotate(${lerp(p.r * 2.4, p.r, land)}deg) scale(${0.96 + 0.04 * Math.min(1, land)})`;
    })}>
<img src="${p.img}" alt="" style="height:230px;width:100%;object-fit:cover">
<div style="padding:20px 28px 28px">
<p style="font-size:18px;line-height:1.5;font-weight:500;color:rgb(11 14 20 / 0.55)">${p.shop}</p>
<p style="margin-top:4px;font-size:24px;font-weight:600;line-height:1.25">${p.name}</p>
<div style="margin-top:16px;display:flex;align-items:center;justify-content:space-between">
<span class="d" style="font-size:34px;line-height:1.5;font-weight:700">${p.price}</span>
<span style="border-radius:999px;padding:8px 16px;font-size:18px;line-height:1.5;font-weight:600" ${S.ref((el, t) => {
      const added = t >= ADDS[i];
      el.style.background = added ? COLOR.ink : COLOR.gold;
      el.style.color = added ? COLOR.cream : COLOR.ink;
      el.style.transform = `scale(${1 + pulse(t, [ADDS[i]], 12) * 0.12})`;
      el.textContent = added ? 'In bag ✓' : 'Add to bag';
    })}></span>
</div></div></div>`).join('')}
<div class="a" style="bottom:110px;left:140px" ${S.rise(b(8))}>
<div style="display:flex;align-items:center;gap:20px;border-radius:999px;background:var(--ink);padding:16px 32px 16px 16px;transform-origin:left center" ${S.ref((el, t) => {
      el.style.opacity = enter(t, b(8), 0.3);
      el.style.transform = `scale(${1 + pulse(t, ADDS, 12) * 0.04})`;
    })}>
<span class="d nums" style="display:flex;height:64px;width:64px;align-items:center;justify-content:center;border-radius:999px;background:var(--gold);font-size:34px;font-weight:700;color:var(--ink)" ${S.ref((el, t) => { el.textContent = count(t); })}></span>
<span class="s" style="font-size:28px;line-height:1.5;font-weight:500"><span ${S.ref((el, t) => { el.textContent = count(t) === 1 ? 'item' : 'items'; })}></span> from <span style="font-weight:600;color:var(--gold)" ${S.ref((el, t) => { el.textContent = `${shops(t)} Toronto ${shops(t) === 1 ? 'shop' : 'shops'}`; })}></span></span>
</div></div>
<div class="a" style="top:0;bottom:0;right:0;background:var(--cream)" ${S.ref((el, t) => { el.style.width = `${1920 * enter(t, b(11.5), 0.3, inOutCubic)}px`; })}></div>
${S.wipe((t) => lerp(0.5, 1, prog(t, 0, 0.3)))}
</div>`;
  };

  // ── S06 · Hire & book · 0:36.00–0:43.20 · bars 16–18 ──────────────────────────────────────────────
  // Cream. Services stream past; a booking card picks a slot on the 8ths, taps, and confirms on the bar-3 downbeat.
  const SERVICES = [
    ['Plumbing & drains', 'Wills & estates', 'Counselling', 'Roofing', 'Financial planning', 'Music lessons'],
    ['Immigration law', 'Real estate', 'IT services', 'Cleaning', 'Insurance', 'Renovation'],
  ];
  const SLOTS = ['9:00', '10:00', '11:30', '1:00', '2:30', '4:00'];
  /** The selection hops on the 8ths of bar 2, landing on 10:00 for the tap. */
  const HOPS = [[b(4), 3], [b(4.5), 5], [b(5), 2], [b(5.5), 0], [b(6), 4], [b(6.5), 1]];
  const TAP = b(7), BOOKED = b(8);
  const hire = (S) => {
    const selected = (t) => [...HOPS].reverse().find(([at]) => t >= at)?.[1];
    const check = (t) => prog(t, BOOKED + 0.12, 0.26);
    return `<div class="fill" style="overflow:hidden;background:var(--cream);color:var(--ink)">
<div class="a" style="left:140px;top:170px;width:860px">
<h1 class="d" style="font-size:104px;font-weight:700;line-height:0.96;letter-spacing:-0.035em">${S.words(b(0.3), 'Hire people your church already', { accent: 'recommends.', accentClass: 'clay', stagger: 0.045 })}</h1>
</div>
<div class="a" style="left:0;top:700px;width:1040px;overflow:hidden" ${S.ref((el, t) => { el.style.opacity = enter(t, b(2), 0.3); })}>
${SERVICES.map((row, r) => `<div style="display:flex;gap:16px;white-space:nowrap;${r ? 'margin-top:20px' : ''}" ${S.ref((el, t) => { el.style.transform = `translateX(${r === 0 ? 140 - t * 70 : -420 + t * 70}px)`; })}>${[...row, ...row].map((s) => `<span class="s" style="border-radius:999px;border:2px solid rgb(11 14 20 / 0.15);padding:14px 28px;font-size:28px;line-height:1.5;font-weight:500;color:rgb(11 14 20 / 0.8)">${esc(s)}</span>`).join('')}</div>`).join('')}
</div>
<div class="a s" style="right:150px;top:120px;height:840px;width:620px;overflow:hidden;border-radius:44px;background:#fff;box-shadow:0 40px 80px -30px rgb(11 14 20 / 0.35), 0 0 0 1px rgb(11 14 20 / 0.1)" ${S.ref((el, t) => {
      const card = enter(t, b(1), 0.3);
      el.style.opacity = card;
      el.style.transform = `translateY(${(1 - card) * 50}px)`;
    })}>
<img src="${PHOTO.advisor}" alt="" style="height:230px;width:100%;object-fit:cover">
<div style="padding:28px 40px 0">
<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:24px">
<div><p class="d" style="font-size:40px;font-weight:700;line-height:1.25;letter-spacing:-0.02em">Legacy Financial</p>
<p style="margin-top:4px;font-size:22px;line-height:1.5;color:rgb(11 14 20 / 0.6)">Trevor Chew, CKA®, CFP®, CLU®</p></div>
${S.seal(84, 20)}
</div>
<div style="margin-top:24px;display:flex;align-items:baseline;justify-content:space-between;border-top:1px solid rgb(11 14 20 / 0.1);padding-top:24px">
<p style="font-size:26px;line-height:1.5;font-weight:600">Discovery meeting</p><p style="font-size:22px;line-height:1.5;color:rgb(11 14 20 / 0.6)">Free · 30 min</p>
</div>
<p style="margin-top:20px;font-size:20px;line-height:1.5;font-weight:500;color:rgb(11 14 20 / 0.55)">Thursday, March 14</p>
<div style="margin-top:12px;display:grid;grid-template-columns:repeat(3,1fr);gap:12px">${SLOTS.map((s, i) => `<div class="nums" style="position:relative;display:flex;height:68px;align-items:center;justify-content:center;border-radius:16px;border:2px solid;font-size:24px;font-weight:600" ${S.ref((el, t) => {
      const on = selected(t) === i;
      el.style.borderColor = on ? COLOR.emerald : 'rgba(11,14,20,0.12)';
      el.style.background = on ? COLOR.emerald : 'transparent';
      el.style.color = on ? COLOR.cream : COLOR.ink;
      el.style.transform = on && i === 1 ? `scale(${t >= TAP && t < TAP + 0.14 ? 0.97 : 1})` : '';
    })}>${s}${i === 1 ? `<span class="fill" style="border-radius:16px;border:4px solid var(--gold)" ${S.ref((el, t) => {
      const ring = prog(t, TAP, 0.3); // the tap: a gold ring expands and fades
      el.style.display = ring > 0 && ring < 1 ? 'block' : 'none';
      el.style.transform = `scale(${0.96 + ring * 0.4})`;
      el.style.opacity = 1 - ring;
    })}></span>` : ''}</div>`).join('')}</div>
<div style="margin-top:24px;display:flex;height:76px;align-items:center;justify-content:center;border-radius:16px;background:var(--ink);font-size:26px;font-weight:600;color:var(--cream)">Book discovery meeting</div>
</div>
<div class="a" style="left:0;right:0;bottom:0;display:flex;height:460px;flex-direction:column;align-items:center;justify-content:center;border-radius:40px 40px 0 0;background:var(--emerald-deep);color:var(--cream)" ${S.ref((el, t) => { el.style.transform = `translateY(${(1 - brand(prog(t, BOOKED, 0.3))) * 100}%)`; })}>
<svg width="120" height="120" viewBox="0 0 120 120" ${S.ref((el, t) => { el.style.transform = `scale(${0.96 + 0.04 * outBack(check(t))})`; })}>
<circle cx="60" cy="60" r="56" fill="${COLOR.gold}" ${S.ref((el, t) => el.setAttribute('opacity', Math.min(1, check(t) * 3)))}/>
<path d="M36 62 L53 78 L86 44" stroke="${COLOR.ink}" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="80" ${S.ref((el, t) => el.setAttribute('stroke-dashoffset', 80 * (1 - check(t))))}/>
</svg>
<p class="d" style="margin-top:24px;font-size:48px;line-height:1.5;font-weight:700;letter-spacing:-0.02em">Booked.</p>
<p style="margin-top:8px;font-size:26px;line-height:1.5;color:rgb(244 242 236 / 0.85)">Thursday · 10:00 am with Trevor</p>
</div>
</div>
${S.wipe((t) => lerp(0, 0.5, prog(t, b(11.5), 0.3)))}
</div>`;
  };

  // ── S07 · Why list · 0:43.20–0:50.40 · bars 19–21 · KEY LIFT ──────────────────────────────────────
  // Ink and a low gold aurora. An owner opens up; her phone lights up on the beats.
  const PINGS = [
    { at: b(4.5), kind: 'Message', text: '“Pastor Ruth said you make custom tees for youth camp?”' },
    { at: b(6), kind: 'New order', text: 'Morning mug, set of two · $42' },
    { at: b(7.5), kind: 'Saved', text: '12 people from Grace Church saved your shop' },
  ];
  const POINTS = [[b(8), 'Customers who already trust you'], [b(9), 'A page that sells for you'], [b(10), 'Free to join. No fees, no cut.']];
  const whyList = (S) => `<div class="fill" style="overflow:hidden;background:var(--ink);color:var(--cream)">
${S.aurora((t) => 0.55 + pulse(t, beatsBetween(0, 12), 7) * 0.25, { horizon: 0.95, colors: [COLOR.ink, COLOR.emeraldDeep, '#3a2a05', COLOR.gold] })}
<div class="a" style="left:140px;top:150px;width:860px">
<h1 class="d" style="font-size:136px;font-weight:700;line-height:0.94;letter-spacing:-0.04em">${S.words(b(0.5), 'Own a business?')}<br>${S.words(b(1.8), '', { accent: 'Be found.', stagger: 0.07 })}</h1>
<p class="s" style="margin-top:32px;font-size:38px;line-height:1.3;color:rgb(244 242 236 / 0.8)">${S.words(b(3), 'Your church family is already looking for you.', { stagger: 0.03 })}</p>
<ul style="margin-top:56px">${POINTS.map(([at, text], i) => `<li style="display:flex;align-items:center;gap:20px;${i ? 'margin-top:20px' : ''}" ${S.ref((el, t) => {
    const on = enter(t, at, 0.3);
    el.style.opacity = on;
    el.style.transform = `translateX(${(1 - on) * -30}px)`;
  })}><span style="height:10px;width:44px;background:var(--gold)"></span><span class="d" style="font-size:38px;line-height:1.5;font-weight:600;letter-spacing:-0.015em">${text}</span></li>`).join('')}</ul>
</div>
<div class="a" style="right:150px;top:100px;height:880px;width:704px;overflow:hidden;border-radius:40px" ${S.ref((el, t) => { el.style.opacity = enter(t, 0.15, 0.3); })}>
<img src="${PHOTO.owner}" alt="" class="cover" style="transform-origin:60% 40%" ${S.ref((el, t) => { el.style.transform = `scale(${lerp(1.0, 1.07, t / LEN)})`; })}>
</div>
<div class="a" style="right:110px;top:540px;width:600px">${PINGS.map((p, i) => `<div class="a s" style="left:0;right:0;top:0;display:flex;align-items:flex-start;gap:20px;border-radius:28px;background:var(--cream);padding:24px;color:var(--ink);box-shadow:0 24px 48px -16px rgb(0 0 0 / 0.55);z-index:${10 + i}" ${S.ref((el, t) => {
    // Lands on the beat; older ones shift up and shrink
    const land = outBack(prog(t, p.at, 0.26));
    const age = Math.max(0, PINGS.filter((q) => t >= q.at).length - 1 - i); // 0 = newest
    el.style.opacity = t >= p.at ? Math.min(1, land) * (age > 1 ? 0.6 : 1) : 0;
    el.style.transform = `translateY(${(1 - land) * 60 - age * 128}px) scale(${(0.96 + 0.04 * Math.min(1, land)) * (1 - age * 0.04)})`;
  })}>
<span style="display:flex;height:60px;width:60px;flex-shrink:0;align-items:center;justify-content:center;border-radius:16px;background:var(--ink)">${S.mark(38, COLOR.cream, COLOR.gold)}</span>
<div style="min-width:0"><p class="clay" style="font-size:20px;line-height:1.5;font-weight:600">${p.kind} · Jubilee</p><p style="margin-top:4px;font-size:24px;font-weight:500;line-height:1.375">${p.text}</p></div>
</div>`).join('')}</div>
${S.wipe((t) => lerp(0.5, 1, prog(t, 0, 0.3)))}
</div>`;

  // ── S08 · How to list · 0:50.40–0:57.60 · bars 22–24 ──────────────────────────────────────────────
  // Cream, hard cut in on the downbeat. A crossbar draws down through three steps; the seal stamps on step 2.
  const STEPS = [
    { at: b(1), title: 'Create your page', body: 'Your products or services, prices and story.' },
    { at: b(3), title: 'Get verified', body: 'The Jubilee team verifies you before you go live.' },
    { at: b(5.5), title: 'Welcome customers', body: 'Members message, book and buy from you directly.' },
  ];
  const NODE_Y = [0, 190, 380];
  const howList = (S) => `<div class="fill" style="overflow:hidden;background:var(--cream);color:var(--ink)">
<div class="a" style="top:0;bottom:0;left:0;width:720px;overflow:hidden">
<img src="${PHOTO.vouch}" alt="" class="cover" style="object-position:40% 50%" ${S.ref((el, t) => { el.style.transform = `scale(${lerp(1.08, 1.0, t / LEN)})`; })}>
<div class="a" style="bottom:80px;left:80px" ${S.ref((el, t) => {
    const stamp = outBack(prog(t, STEPS[1].at + 0.3, 0.22));
    const thump = pulse(t, [STEPS[1].at + 0.5], 9);
    el.style.opacity = Math.min(1, stamp * 3);
    el.style.transform = `translate(${thump * 3}px, ${thump * 2}px) scale(${lerp(1.2, 1, stamp)}) rotate(${lerp(-18, -8, stamp)}deg)`;
  })}>${S.seal(220, 14)}</div>
</div>
<div class="a" style="left:860px;top:120px;width:920px">
<h1 class="d" style="font-size:96px;font-weight:700;line-height:0.98;letter-spacing:-0.035em">${S.words(b(0), 'Three steps to', { accent: 'be found.', accentClass: 'clay' })}</h1>
<div style="position:relative;margin-top:64px;height:510px">
<span class="a" style="left:15px;top:16px;width:10px;height:${NODE_Y[2]}px;background:rgb(11 14 20 / 0.1)"></span>
<span class="a" style="left:15px;top:16px;width:10px;background:var(--gold)" ${S.ref((el, t) => {
    // The line travels node to node, arriving as each step lands
    el.style.height = `${lerp(0, NODE_Y[1], brand(prog(t, STEPS[0].at, STEPS[1].at - STEPS[0].at))) + lerp(0, NODE_Y[2] - NODE_Y[1], brand(prog(t, STEPS[1].at, STEPS[2].at - STEPS[1].at)))}px`;
  })}></span>
${STEPS.map((s, i) => `<div class="a" style="left:0;top:${NODE_Y[i]}px;display:flex;gap:40px">
<span style="margin-top:4px;height:40px;width:40px;flex-shrink:0;border-radius:999px;border-width:6px" ${S.ref((el, t) => {
    const lit = t >= s.at;
    el.style.borderColor = lit ? COLOR.ink : 'rgba(11,14,20,0.2)';
    el.style.background = lit ? COLOR.gold : COLOR.cream;
    el.style.transform = `scale(${lit ? 0.96 + 0.04 * outBack(prog(t, s.at, 0.24)) : 1})`;
  })}></span>
<div ${S.ref((el, t) => {
    const on = Math.min(1, outBack(prog(t, s.at, 0.24)));
    el.style.opacity = on;
    el.style.transform = `translateX(${(1 - on) * 24}px)`;
  })}><p class="d" style="font-size:56px;font-weight:700;line-height:1.02;letter-spacing:-0.025em">${s.title}</p><p class="s" style="margin-top:12px;font-size:30px;line-height:1.35;color:rgb(11 14 20 / 0.7)">${s.body}</p></div>
</div>`).join('')}
</div>
<div style="margin-top:8px;display:flex;align-items:center;gap:32px;transform-origin:left center" ${S.ref((el, t) => {
    const cta = outBack(prog(t, b(8), 0.26));
    el.style.opacity = Math.min(1, cta * 2);
    el.style.transform = `translateY(${(1 - Math.min(1, cta)) * 30}px) scale(${0.96 + 0.04 * Math.min(1, cta)})`;
  })}>
<span class="s" style="border-radius:16px;background:var(--ink);padding:24px 40px;font-size:32px;line-height:1.5;font-weight:600;color:var(--cream)">List your business free</span>
<span class="d" style="font-size:34px;line-height:1.5;font-weight:600;letter-spacing:-0.01em;color:rgb(11 14 20 / 0.7)">jubilee.to/list</span>
</div>
</div>
<div class="a" style="left:0;right:0;top:0;background:var(--ink)" ${S.ref((el, t) => { el.style.height = `${1080 * enter(t, b(11.5), 0.3, inOutCubic)}px`; })}></div>
</div>`;

  // ── S09 · Close · 0:57.60–1:04.80 · bars 25–27 · FINAL HIT ────────────────────────────────────────
  // Confetti cannons on the downbeat, the lockup builds, the line lands, the URL holds. Out to ink on the last beat.
  const HIT = 0.02;
  const close = (S) => `<div class="fill" style="overflow:hidden;background:var(--ink);color:var(--cream)">
${S.aurora((t) => enter(t, 0, 0.3) * (1.05 + pulse(t, beatsBetween(0, 10), 7) * 0.4) * lerp(1, 0.6, prog(t, b(8), b(3))), { horizon: 0.9 })}
${S.confetti([HIT, b(8)], 150)}
<div class="fill" style="display:flex;flex-direction:column;align-items:center;padding-top:200px">
<div style="display:flex;align-items:flex-start;gap:26px">
${S.drawnMark(210, { draw: (t) => enter(t, 0.12, 0.3), bar: (t) => enter(t, HIT, 0.24) })}
<div style="margin-top:18px">${S.wordmark(196, (t) => prog(t, 0.3, 0.45))}</div>
</div>
<h1 class="d" style="margin-top:64px;text-align:center;font-size:104px;font-weight:700;line-height:1;letter-spacing:-0.035em">${S.words(b(2), 'Your community is')}<br>${S.words(b(3), '', { accent: 'open for business.', stagger: 0.06 })}</h1>
<div style="margin-top:64px;display:flex;align-items:center;gap:40px" ${S.ref((el, t) => {
    const url = enter(t, b(4), 0.3);
    el.style.opacity = url;
    el.style.transform = `translateY(${(1 - url) * 24}px)`;
  })}>
<span class="d" style="border-radius:999px;background:var(--gold);padding:20px 48px;font-size:52px;line-height:1.5;font-weight:700;letter-spacing:-0.02em;color:var(--ink)">jubilee.to</span>
<span class="s" style="font-size:30px;font-weight:500;line-height:1.375;color:rgb(244 242 236 / 0.8)">Free for members.<br>List your business free.</span>
</div>
</div>
<div class="fill" style="background:var(--ink)" ${S.ref((el, t) => { el.style.opacity = exit(t, b(11.5), 0.3); })}></div>
</div>`;

  window.PITCH.film([
    { id: 'sunday', build: sunday },
    { id: 'monday', build: monday },
    { id: 'meet', build: meet },
    { id: 'why-join', build: whyJoin },
    { id: 'shop', build: shop },
    { id: 'hire', build: hire },
    { id: 'why-list', build: whyList },
    { id: 'how-list', build: howList },
    { id: 'close', build: close },
  ]);
})();

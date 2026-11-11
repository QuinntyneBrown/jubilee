// The Jubilee plan: ten scenes, each three bars (8 s at 90 BPM), every one led by a full-bleed picture.
// Each draws purely from its local time t (seconds). Positions are px on the 1920x1080 board.
// Photos are docs/assets/photos; the homes and stays scenes are drawn here as SVG in the Jubilee palette.
(() => {
  const { SCENE: LEN, lerp, prog, brand, outBack, enter, exit, inOutCubic, pulse } = window.PITCH;

  const PHOTOS = '../../assets/photos/';
  const PHOTO = {
    torontoDusk: PHOTOS + 'toronto-dusk.jpg',
    vouch: PHOTOS + 'vouch.jpg',
    owner: PHOTOS + 'owner.jpg',
    plumbing: PHOTOS + 'plumbing.jpg',
    roofing: PHOTOS + 'roofing.jpg',
    law: PHOTOS + 'law.jpg',
    flowers: PHOTOS + 'flowers.jpg',
    filmStill: PHOTOS + 'film-still.jpg',
    advisor: PHOTOS + 'advisor.jpg',
    sunday: PHOTOS + 'sunday.jpg',
    mug: PHOTOS + 'mug.jpg',
  };

  /** A photo that fills its box and drifts: zoom z0→z1 and pan dx0→dx1 over the scene. */
  const photo = (S, src, { pos = '50% 50%', z0 = 1.08, z1 = 1, dx0 = 0, dx1 = 0, filter = '' } = {}) =>
    `<img src="${src}" alt="" class="fill cover" style="object-position:${pos}${filter ? `;filter:${filter}` : ''}" ${S.ref((el, t) => {
      const p = t / LEN;
      el.style.transform = `scale(${lerp(z0, z1, p)}) translateX(${lerp(dx0, dx1, p)}px)`;
    })}>`;
  /** A panel that opens upward from its bottom edge. */
  const reveal = (S, at, dur = 0.45) => S.ref((el, t) => {
    const p = enter(t, at, dur);
    el.style.clipPath = `inset(${(1 - p) * 100}% 0 0 0)`;
  });
  /** A pill that pops in. */
  const pop = (S, at) => S.ref((el, t) => {
    const p = prog(t, at, 0.28);
    el.style.opacity = Math.min(1, p * 3);
    el.style.transform = `scale(${lerp(0.7, 1, outBack(p))})`;
  });
  /** Wipes: out (to covering) at the end of a scene, in (from covering) at the start of the next. */
  const wipeOut = (S) => S.wipe((t) => lerp(0, 0.5, prog(t, LEN - 0.32, 0.3)));
  const wipeIn = (S) => S.wipe((t) => (t < 0.001 ? 0.5 : lerp(0.5, 1, prog(t, 0, 0.32))));
  const scrim = (dir, a = 0.75, from = 0, to = 60) => `<div class="fill" style="background:linear-gradient(${dir}, rgb(11 14 20 / ${a}) ${from}%, rgb(11 14 20 / 0) ${to}%)"></div>`;
  const H1 = 'font-size:150px;font-weight:700;line-height:0.94;letter-spacing:-0.035em';
  const fadeIn = (S) => `<div class="fill" style="background:var(--ink)" ${S.ref((el, t) => { el.style.opacity = 1 - enter(t, 0, 0.5); })}></div>`;

  // ── S01 · Toronto · 0:00–0:08 ───────────────────────────────────────────────────────────────────────
  const toronto = (S) => `<div class="fill" style="background:var(--ink);color:var(--cream)">
${photo(S, PHOTO.torontoDusk, { pos: '60% 60%', z0: 1.0, z1: 1.14, dx0: 0, dx1: -40 })}
${scrim('180deg', 0.7, 0, 55)}
<h1 class="a d" style="left:140px;top:150px;${H1}">${S.words(3.2, 'Who can we', { accent: 'trust?', stagger: 0.07 })}</h1>
${fadeIn(S)}
${wipeOut(S)}
</div>`;

  // ── S02 · Vouched for · 0:08–0:16 ───────────────────────────────────────────────────────────────────
  const TILES = [
    { src: PHOTO.owner, x: 960, y: 0, at: 0.5, pos: '50% 30%' },
    { src: PHOTO.plumbing, x: 1440, y: 0, at: 0.8, pos: '50% 50%' },
    { src: PHOTO.roofing, x: 960, y: 540, at: 1.1, pos: '50% 50%' },
    { src: PHOTO.law, x: 1440, y: 540, at: 1.4, pos: '50% 50%' },
  ];
  const vouched = (S) => `<div class="fill" style="background:var(--ink);color:var(--cream)">
<div class="a" style="left:0;top:0;width:960px;height:1080px;overflow:hidden">${photo(S, PHOTO.vouch, { pos: '62% 50%', z0: 1.12, z1: 1.0 })}${scrim('0deg', 0.85, 0, 55)}</div>
${TILES.map((p) => `<div class="a" style="left:${p.x}px;top:${p.y}px;width:480px;height:540px;overflow:hidden;border-left:6px solid var(--ink);border-top:${p.y ? 6 : 0}px solid var(--ink)" ${reveal(S, p.at)}>${photo(S, p.src, { pos: p.pos, z0: 1.15, z1: 1.02 })}</div>`).join('')}
<div class="a" style="left:120px;top:110px;width:300px;transform-origin:50% 50%" ${S.ref((el, t) => {
    const p = prog(t, 3.6, 0.24), s = outBack(p);
    el.style.opacity = Math.min(1, p * 4);
    el.style.transform = `scale(${lerp(1.25, 1, s)}) rotate(${lerp(-18, -6, s)}deg)`;
  })}>${S.seal(300, 10)}</div>
<h1 class="a d" style="left:120px;bottom:120px;font-size:86px;font-weight:700;line-height:0.98;letter-spacing:-0.035em">${S.words(3.0, 'Christian-owned.')}<br>${S.words(4.2, '', { accent: 'Vouched for.' })}</h1>
${wipeIn(S)}
</div>`;

  // ── S03 · Find, message, book · 0:16–0:24 ───────────────────────────────────────────────────────────
  const VERBS = [
    { word: 'Find', src: PHOTO.flowers, at: 0.15, pos: '60% 50%' },
    { word: 'Message', src: PHOTO.filmStill, at: 0.7, pos: '62% 40%' },
    { word: 'Book', src: PHOTO.advisor, at: 1.4, pos: '35% 50%' },
  ];
  const members = (S) => `<div class="fill" style="background:var(--ink);color:var(--cream)">
${VERBS.map((v, i) => `<div class="a" style="left:${i * 640}px;top:0;width:640px;height:1080px;overflow:hidden;${i ? 'border-left:6px solid var(--ink);' : ''}" ${reveal(S, v.at, 0.5)}>
${photo(S, v.src, { pos: v.pos, z0: 1.12, z1: 1.0 })}${scrim('0deg', 0.85, 0, 45)}
<p class="a d" style="left:64px;bottom:250px;font-size:104px;font-weight:700;line-height:1;letter-spacing:-0.035em">${S.words(v.at + 0.25, v.word)}</p></div>`).join('')}
<div class="a" style="left:0;right:0;bottom:110px;display:flex;justify-content:center">
<span class="d" style="border-radius:999px;background:var(--gold);color:var(--ink);padding:18px 52px;font-size:56px;font-weight:700;line-height:1.3;letter-spacing:-0.02em" ${pop(S, 4.6)}>Pay the business directly</span></div>
</div>`;

  // ── S04 · Launch · 0:24–0:32 ────────────────────────────────────────────────────────────────────────
  const launch = (S) => `<div class="fill" style="background:var(--ink);color:var(--cream)">
${photo(S, PHOTO.sunday, { pos: '50% 50%', z0: 1.0, z1: 1.1, dx0: -30, dx1: 30 })}
${scrim('0deg', 0.85, 0, 60)}
<div class="a" style="left:140px;top:120px;display:flex;align-items:center;gap:20px" ${pop(S, 0.5)}>
<span class="d" style="border-radius:999px;background:var(--cream);color:var(--ink);padding:14px 40px;font-size:48px;font-weight:700;line-height:1.3;letter-spacing:-0.02em">Beta · Feb 1</span>
<span class="d" style="border-radius:999px;background:rgb(11 14 20 / 0.7);color:var(--cream);padding:14px 40px;font-size:48px;font-weight:700;line-height:1.3;letter-spacing:-0.02em">200 founding businesses</span></div>
<p class="a d" style="left:140px;bottom:250px;font-size:60px;font-weight:600;letter-spacing:-0.02em" ${S.rise(4.3)}>Public launch</p>
<h1 class="a d nums" style="left:140px;bottom:20px;font-size:210px;font-weight:700;line-height:1;letter-spacing:-0.04em;white-space:nowrap">${S.words(4.7, 'April 6,', { accent: '2027', stagger: 0.08 })}</h1>
${wipeOut(S)}
</div>`;

  // ── S05 · How businesses pay · 0:32–0:40 ────────────────────────────────────────────────────────────
  const TIERS = [
    { name: 'Basic', price: 'Free', per: 'forever', src: PHOTO.mug, at: 0.2, pos: '50% 60%' },
    { name: 'Plus', price: '$29', per: 'a month', src: PHOTO.owner, at: 2.4, pos: '50% 25%' },
    { name: 'Pro', price: '$79', per: 'a month', src: PHOTO.roofing, at: 4.1, pos: '60% 50%' },
  ];
  const tiers = (S) => `<div class="fill" style="background:var(--ink);color:var(--cream)">
${TIERS.map((v, i) => `<div class="a" style="left:${i * 640}px;top:0;width:640px;height:1080px;overflow:hidden;${i ? 'border-left:6px solid var(--ink);' : ''}" ${reveal(S, v.at, 0.5)}>
${photo(S, v.src, { pos: v.pos, z0: 1.12, z1: 1.0 })}${scrim('0deg', 0.88, 0, 55)}
<div class="a" style="left:64px;bottom:96px" ${S.rise(v.at + 0.3)}>
<p class="d" style="font-size:52px;font-weight:600;letter-spacing:-0.02em;color:var(--gold)">${v.name}</p>
<p class="d nums" style="font-size:180px;font-weight:700;line-height:0.95;letter-spacing:-0.045em">${v.price}</p>
<p class="d" style="margin-top:8px;font-size:44px;font-weight:600;letter-spacing:-0.01em;color:rgb(244 242 236 / 0.85)">${v.per}</p></div></div>`).join('')}
<div class="a" style="left:704px;top:110px">
<span class="d" style="display:inline-block;border-radius:999px;background:var(--gold);color:var(--ink);padding:14px 36px;font-size:44px;font-weight:700;line-height:1.3;letter-spacing:-0.02em" ${pop(S, 5.4)}>Founding businesses: Plus free</span></div>
${wipeIn(S)}
</div>`;

  // ── S06 · Homes · 0:40–0:48 · drawn ────────────────────────────────────────────────────────────────
  // Evening street: an apartment block, a Toronto bay-and-gable house and a row of semis; windows light up.
  const windowsOf = (x0, y0, cols, rows, w, h, gx, gy, seed) => {
    const out = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const k = r * cols + c;
      const on = ((k * 37 + seed * 11) % 23) / 23; // when it lights, 0..1 of the first 4 s
      out.push(`<rect x="${x0 + c * (w + gx)}" y="${y0 + r * (h + gy)}" width="${w}" height="${h}" rx="4" fill="#ffb81c" ${S_.ref((el, t) => {
        el.setAttribute('fill-opacity', 0.12 + 0.88 * enter(t, 0.2 + on * 3.6, 0.25));
      })}/>`);
    }
    return out.join('');
  };
  let S_; // the scene builder windowsOf registers on
  const house = (x, y, w, body, roof) => `<g>
<polygon points="${x - 20},${y + 120} ${x + w / 2},${y} ${x + w + 20},${y + 120}" fill="${roof}"/>
<rect x="${x}" y="${y + 118}" width="${w}" height="${1000 - y - 118}" fill="${body}"/>
<rect x="${x + w / 2 - 50}" y="${y + 40}" width="100" height="70" rx="6" fill="#0b0e14" opacity="0.55"/></g>`;
  const homes = (S) => {
    S_ = S;
    return `<div class="fill" style="background:var(--ink);color:var(--cream)">
<svg class="fill" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
<defs><linearGradient id="dusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0e14"/><stop offset="0.55" stop-color="#0e4f5c"/><stop offset="1" stop-color="#3f7f73"/></linearGradient>
<radialGradient id="glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffb81c" stop-opacity="0.45"/><stop offset="1" stop-color="#ffb81c" stop-opacity="0"/></radialGradient></defs>
<rect width="1920" height="1080" fill="url(#dusk)"/>
<g ${S.ref((el, t) => el.setAttribute('transform', `translate(${lerp(0, -40, t / LEN)} 0)`))}>
<circle cx="1830" cy="120" r="46" fill="#f4f2ec" opacity="0.9"/>
<!-- apartment block -->
<rect x="1100" y="250" width="640" height="760" fill="#00623f"/>
<rect x="1080" y="232" width="680" height="30" fill="#0b0e14" opacity="0.5"/>
${windowsOf(1150, 300, 6, 7, 62, 70, 36, 34, 1)}
<!-- bay-and-gable house -->
${house(620, 470, 400, '#b5532e', '#0b0e14')}
<rect x="680" y="640" width="120" height="110" rx="6" fill="#ffb81c" ${S.ref((el, t) => el.setAttribute('fill-opacity', 0.15 + 0.85 * enter(t, 1.0, 0.3)))}/>
<rect x="840" y="640" width="120" height="110" rx="6" fill="#ffb81c" ${S.ref((el, t) => el.setAttribute('fill-opacity', 0.15 + 0.85 * enter(t, 2.2, 0.3)))}/>
<rect x="760" y="820" width="100" height="180" rx="8" fill="#0b0e14"/>
<!-- semis -->
${house(80, 600, 220, '#0e4f5c', '#0b0e14')}${house(340, 600, 220, '#5b5f68', '#0b0e14')}
<rect x="130" y="760" width="110" height="90" rx="6" fill="#ffb81c" ${S.ref((el, t) => el.setAttribute('fill-opacity', 0.15 + 0.85 * enter(t, 1.6, 0.3)))}/>
<rect x="390" y="760" width="110" height="90" rx="6" fill="#ffb81c" ${S.ref((el, t) => el.setAttribute('fill-opacity', 0.15 + 0.85 * enter(t, 2.8, 0.3)))}/>
<circle cx="1290" cy="880" r="280" fill="url(#glow)"/>
</g>
<rect y="1000" width="1920" height="80" fill="#0b0e14"/>
</svg>
<div class="a" style="left:140px;top:110px">
<h1 class="d" style="${H1}">${S.words(0.3, 'Homes')}</h1>
<p class="d" style="margin-top:12px;font-size:64px;font-weight:700;letter-spacing:-0.02em;color:var(--gold)" ${S.rise(0.8)}>Sept 2027</p></div>
${[['Rooms', 700, 380, 2.0], ['Apartments', 1190, 140, 2.55], ['Sublets', 150, 510, 3.15]].map(([w, x, y, at]) => `<span class="a d" style="left:${x}px;top:${y}px;border-radius:999px;background:var(--cream);color:var(--ink);padding:12px 36px;font-size:48px;font-weight:700;line-height:1.3;letter-spacing:-0.02em" ${pop(S, at)}>${w}</span>`).join('')}
<div class="a" style="left:830px;top:0;transform-origin:50% 0" ${S.ref((el, t) => {
      const p = prog(t, 5.2, 0.3);
      const swing = Math.sin((t - 5.2) * 5) * 7 * Math.exp(-(t - 5.2) * 1.4);
      el.style.opacity = Math.min(1, p * 3);
      el.style.transform = `translateY(${(1 - brand(p)) * -340}px) rotate(${t > 5.2 ? swing : 0}deg)`;
    })}>
<svg width="300" height="330" viewBox="0 0 300 330" aria-hidden="true"><path d="M150 0 V110" stroke="#f4f2ec" stroke-width="4"/><circle cx="150" cy="120" r="14" fill="none" stroke="#f4f2ec" stroke-width="6"/>
<path d="M150 150 L270 190 V310 H30 V190 Z" fill="#ffb81c"/><circle cx="150" cy="182" r="11" fill="#0b0e14"/></svg>
<span class="a d nums" style="left:0;width:300px;text-align:center;top:206px;font-size:80px;font-weight:700;letter-spacing:-0.04em;color:var(--ink)">$39</span></div>
${wipeOut(S)}
</div>`;
  };

  // ── S07 · Stays · 0:48–0:56 · drawn ────────────────────────────────────────────────────────────────
  // A guest room at night: the city through the window, a made bed, a lamp, and a suitcase rolling in.
  const SKYLINE = [[0, 300], [70, 230], [130, 330], [210, 190], [270, 260], [350, 150], [380, 150], [420, 280], [500, 220]];
  const stays = (S) => `<div class="fill" style="background:var(--ink);color:var(--ink)">
<svg class="fill" viewBox="0 0 1920 1080" aria-hidden="true">
<defs><linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f2ec"/><stop offset="1" stop-color="#e6dfd1"/></linearGradient>
<linearGradient id="night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0e14"/><stop offset="1" stop-color="#0e4f5c"/></linearGradient>
<radialGradient id="lamp" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffb81c" stop-opacity="0.55"/><stop offset="1" stop-color="#ffb81c" stop-opacity="0"/></radialGradient></defs>
<g ${S.ref((el, t) => el.setAttribute('transform', `translate(960 540) scale(${lerp(1.06, 1, t / LEN)}) translate(-960 -540)`))}>
<rect width="1920" height="1080" fill="url(#wall)"/>
<rect y="880" width="1920" height="200" fill="#a7774f"/><rect y="880" width="1920" height="10" fill="#0b0e14" opacity="0.15"/>
<!-- window -->
<rect x="1130" y="120" width="580" height="500" rx="10" fill="#0b0e14"/>
<rect x="1150" y="140" width="540" height="460" fill="url(#night)"/>
<circle cx="1590" cy="220" r="40" fill="#ffb81c"/>
<g transform="translate(1150 300)">${SKYLINE.map(([x, top], i) => `<rect x="${x}" y="${top}" width="${(SKYLINE[i + 1]?.[0] ?? 540) - x}" height="${300 - top}" fill="#0b0e14"/>`).join('')}
${[[90, 260], [150, 350], [230, 230], [300, 300], [440, 320], [520, 270]].map(([x, y]) => `<rect x="${x - 70}" y="${y - 40}" width="10" height="12" fill="#ffb81c"/>`).join('')}</g>
<rect x="1416" y="140" width="8" height="460" fill="#0b0e14"/><rect x="1150" y="366" width="540" height="8" fill="#0b0e14"/>
<rect x="1110" y="610" width="620" height="22" rx="4" fill="#d9d1c0"/>
<!-- lamp and table -->
<circle cx="190" cy="560" r="230" fill="url(#lamp)" ${S.ref((el, t) => el.setAttribute('opacity', 0.4 + 0.6 * enter(t, 0.6, 0.4)))}/>
<rect x="100" y="700" width="180" height="200" rx="10" fill="#00623f"/>
<rect x="182" y="600" width="12" height="100" fill="#0b0e14"/>
<path d="M120 600 L150 500 L230 500 L260 600 Z" fill="#ffb81c"/>
<!-- bed -->
<rect x="330" y="470" width="740" height="300" rx="28" fill="#00623f"/>
<rect x="330" y="690" width="740" height="200" rx="18" fill="#f4f2ec" stroke="#d9d1c0" stroke-width="4"/>
<rect x="380" y="630" width="250" height="100" rx="40" fill="#ffffff" stroke="#d9d1c0" stroke-width="4"/>
<rect x="770" y="630" width="250" height="100" rx="40" fill="#ffffff" stroke="#d9d1c0" stroke-width="4"/>
<path d="M330 740 H1070 V880 Q1070 905 1045 905 H355 Q330 905 330 880 Z" fill="#00875a"/>
<rect x="330" y="740" width="740" height="26" fill="#ffb81c"/>
<rect x="350" y="905" width="24" height="40" fill="#0b0e14"/><rect x="1026" y="905" width="24" height="40" fill="#0b0e14"/>
</g>
</svg>
<div class="a" style="left:1260px;top:640px" ${S.ref((el, t) => {
    const p = brand(prog(t, 2.2, 0.7));
    el.style.transform = `translateX(${(1 - p) * 760}px)`;
  })}>
<svg width="300" height="380" viewBox="0 0 300 380" aria-hidden="true">
<rect x="110" y="0" width="80" height="70" rx="12" fill="none" stroke="#0b0e14" stroke-width="14"/>
<rect x="20" y="60" width="260" height="280" rx="26" fill="#ffb81c"/>
<rect x="80" y="60" width="16" height="280" fill="#0b0e14" opacity="0.18"/><rect x="204" y="60" width="16" height="280" fill="#0b0e14" opacity="0.18"/>
<circle cx="70" cy="356" r="20" fill="#0b0e14"/><circle cx="230" cy="356" r="20" fill="#0b0e14"/></svg></div>
<div class="a" style="left:140px;top:110px">
<h1 class="d" style="${H1}">${S.words(0.3, 'Stays')}</h1>
<p class="d" style="margin-top:12px;font-size:64px;font-weight:700;letter-spacing:-0.02em;color:var(--emerald-deep)" ${S.rise(0.8)}>May 2028</p></div>
<div class="a" style="left:660px;top:150px;display:flex;gap:16px">${['Nights', 'Months'].map((w, i) => `<span class="d" style="border-radius:999px;background:var(--ink);color:var(--cream);padding:12px 36px;font-size:44px;font-weight:700;line-height:1.3;letter-spacing:-0.02em" ${pop(S, 1.6 + i * 0.5)}>${w}</span>`).join('')}</div>
<div class="a" style="left:1480px;top:120px;width:300px;height:300px;border-radius:999px;background:var(--emerald-deep);color:var(--cream);display:grid;place-items:center;text-align:center" ${S.ref((el, t) => {
    const p = prog(t, 5.6, 0.3);
    el.style.opacity = Math.min(1, p * 3);
    el.style.transform = `scale(${lerp(0.5, 1, outBack(p))}) rotate(${lerp(-20, -6, brand(p))}deg)`;
  })}><span class="d nums" style="font-size:120px;font-weight:700;line-height:1;letter-spacing:-0.04em">11%</span></div>
${wipeIn(S)}
</div>`;

  // ── S08 · Growth · 0:56–1:04 ────────────────────────────────────────────────────────────────────────
  // Revenue as gold towers rising out of the lake in front of the skyline.
  const REVENUE = [['2027', 0.035, '$35k'], ['2028', 0.29, '$0.29M'], ['2029', 0.93, '$0.93M'], ['2030', 1.87, '$1.87M'], ['2031', 3.12, '$3.1M']];
  const growth = (S) => `<div class="fill" style="background:var(--ink);color:var(--cream)">
${photo(S, PHOTO.torontoDusk, { pos: '50% 62%', z0: 1.12, z1: 1.04, filter: 'brightness(0.55) saturate(0.9)' })}
${scrim('180deg', 0.6, 0, 40)}
<p class="a d" style="left:140px;top:110px;font-size:64px;font-weight:700;letter-spacing:-0.02em" ${S.rise(0.2)}>Revenue</p>
${REVENUE.map(([year, v, label], i) => {
    const x = 330 + i * 300, at = 0.5 + i * 0.75, h = Math.max(10, (v / 3.12) * 600), last = i === REVENUE.length - 1;
    return `<div class="a" style="left:${x}px;bottom:150px;width:190px;height:${h}px;background:${last ? 'var(--gold)' : 'rgb(255 184 28 / 0.82)'};border-radius:10px 10px 0 0;transform-origin:50% 100%" ${S.ref((el, t) => { el.style.transform = `scaleY(${brand(prog(t, at, 0.6))})`; })}></div>
<p class="a d nums" style="left:${x - 60}px;width:310px;bottom:${150 + h + 14}px;text-align:center;font-size:${last ? 84 : 52}px;font-weight:700;letter-spacing:-0.03em;line-height:1.1" ${S.rise(at + 0.35)}>${label}</p>
<p class="a d nums" style="left:${x}px;width:190px;bottom:84px;text-align:center;font-size:44px;font-weight:600;letter-spacing:-0.01em;color:rgb(244 242 236 / 0.85)" ${S.rise(at)}>${year}</p>`;
  }).join('')}
<span class="a d" style="left:1180px;bottom:${150 + (1.87 / 3.12) * 600 + 110}px;border-radius:999px;background:var(--cream);color:var(--ink);padding:10px 30px;font-size:40px;font-weight:700;line-height:1.3;letter-spacing:-0.02em;white-space:nowrap;transform-origin:50% 100%" ${pop(S, 4.6)}>Break-even</span>
${wipeOut(S)}
</div>`;

  // ── S09 · Raise and roadmap · 1:04–1:12 ─────────────────────────────────────────────────────────────
  const ROAD = [['Feb 2027', 'Beta'], ['Apr 2027', 'Launch'], ['Sep 2027', 'Homes'], ['May 2028', 'Stays'], ['2029', 'Pay + events'], ['2030', 'Beyond<br>Toronto']];
  const roadmap = (S) => `<div class="fill" style="background:var(--ink);color:var(--cream)">
${photo(S, PHOTO.roofing, { pos: '50% 40%', z0: 1.04, z1: 1.14, dx0: 20, dx1: -20, filter: 'brightness(0.62)' })}
${scrim('0deg', 0.9, 0, 50)}${scrim('180deg', 0.55, 0, 35)}
<div class="a" style="left:140px;top:100px">
<h1 class="d nums" style="font-size:200px;font-weight:700;line-height:0.95;letter-spacing:-0.045em;color:var(--gold)">${S.words(0.3, '$750k')}</h1>
<p class="d" style="font-size:64px;font-weight:700;letter-spacing:-0.02em" ${S.rise(0.8)}>Pre-seed</p></div>
<div class="a" style="left:180px;right:180px;top:788px;height:6px;background:var(--gold);transform-origin:0 50%" ${S.ref((el, t) => { el.style.transform = `scaleX(${inOutCubic(prog(t, 3.4, 3.0))})`; })}></div>
${ROAD.map(([date, label], i) => {
    const x = 180 + i * (1560 / 5), at = 3.4 + i * 0.58;
    return `<div class="a" style="left:${x}px;top:770px;width:0">
<span class="a" style="left:-21px;top:0;width:42px;height:42px;border-radius:999px;background:var(--gold);border:8px solid var(--ink)" ${pop(S, at)}></span>
<div class="a" style="left:${i === 0 ? -21 : i === ROAD.length - 1 ? -280 : -150}px;width:300px;top:70px;text-align:${i === 0 ? 'left' : i === ROAD.length - 1 ? 'right' : 'center'}" ${S.rise(at + 0.1)}>
<p class="d nums" style="font-size:38px;font-weight:700;letter-spacing:-0.01em;color:var(--gold);white-space:nowrap">${date}</p>
<p class="d" style="font-size:40px;font-weight:700;line-height:1.1;letter-spacing:-0.02em;white-space:nowrap">${label}</p></div></div>`;
  }).join('')}
${wipeIn(S)}
</div>`;

  // ── S10 · Close · 1:12–1:20 ─────────────────────────────────────────────────────────────────────────
  // The lockup: the J mark draws and "jubilee" rises (Archivo 700, 110% width, −0.03em), then the date.
  const wordmark = (S, size, at) => `<span style="display:inline-flex;overflow:hidden;line-height:1;font-family:Archivo,sans-serif;font-weight:700;font-variation-settings:'wdth' 110;font-stretch:110%;letter-spacing:-0.03em;font-size:${size}px;padding-bottom:0.12em">${'jubilee'.split('').map((l, i) => `<span style="display:inline-block" ${S.ref((el, t) => {
    const e = brand(prog(t, at + i * 0.05, 0.35));
    el.style.transform = `translateY(${(1 - e) * 0.9}em)`;
    el.style.opacity = e;
  })}>${l}</span>`).join('')}</span>`;
  const close = (S) => `<div class="fill" style="background:var(--ink);color:var(--cream)">
${S.aurora((t) => enter(t, 0, 0.4) * (1.0 + pulse(t, [0, 2.67, 5.33], 4) * 0.3) * lerp(1, 0.6, prog(t, 6, 2)), { horizon: 0.9 })}
<div class="fill" style="display:flex;flex-direction:column;align-items:center;padding-top:300px">
<div style="display:flex;align-items:flex-start;gap:26px">
${S.drawnMark(220, { draw: (t) => enter(t, 0.1, 0.5), bar: (t) => enter(t, 0.55, 0.3) })}
<div style="margin-top:20px">${wordmark(S, 200, 0.4)}</div></div>
<p class="d nums" style="margin-top:90px;border-radius:999px;background:var(--gold);color:var(--ink);padding:20px 60px;font-size:72px;font-weight:700;line-height:1.3;letter-spacing:-0.025em" ${S.rise(1.6)}>April 6, 2027</p>
</div>
<div class="fill" style="background:var(--ink)" ${S.ref((el, t) => { el.style.opacity = exit(t, LEN - 0.9, 0.8, (p) => p); })}></div>
</div>`;

  window.PITCH.film([
    { id: 'toronto', build: toronto },
    { id: 'vouched', build: vouched },
    { id: 'members', build: members },
    { id: 'launch', build: launch },
    { id: 'tiers', build: tiers },
    { id: 'homes', build: homes },
    { id: 'stays', build: stays },
    { id: 'growth', build: growth },
    { id: 'roadmap', build: roadmap },
    { id: 'close', build: close },
  ]);
})();

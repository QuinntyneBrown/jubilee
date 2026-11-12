// Runtime for pitch films. A film is a list of scenes, each exactly three bars long; every pixel is a
// pure function of film time, so the same page plays live (synced to the mixed MP3) and renders frame
// by frame (tools/video-build/build.mjs calls PITCH.seek). The clock, the easing curves and the shared
// pieces (masked words, the J mark, the wordmark, the crossbar wipe, the seal, the aurora shader and
// the confetti) are ported from the Magic Patterns "Pitch Video" source. See docs/videos/README.md.
(() => {
  const body = document.body;
  const query = new URLSearchParams(location.search);
  const RENDER = query.has('render');
  const W = 1920, H = 1080;

  // ── The master clock ──────────────────────────────────────────────────────────────────────────────
  const BPM = +body.dataset.bpm || 100;
  const BEAT = 60 / BPM;
  const BAR = BEAT * 4;
  const SCENE = BAR * 3;
  /** Local beat k (0-based) of a scene, in seconds. */
  const b = (k) => k * BEAT;

  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
  const lerp = (a, c, p) => a + (c - a) * p;
  /** 0→1 progress of t through [at, at + dur]. */
  const prog = (t, at, dur) => clamp((t - at) / dur);

  /** Every entrance. */
  const brand = (p) => 1 - Math.pow(1 - p, 5);
  const outExpo = (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p));
  const inOutCubic = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  /** Exits only. */
  const inQuart = (p) => p * p * p * p;
  /** Small overshoot for stamps and pops (peaks about 6%). */
  const outBack = (p) => 1 + 2.2 * Math.pow(p - 1, 3) + 1.2 * Math.pow(p - 1, 2);
  const enter = (t, at, dur = 0.3, ease = brand) => ease(prog(t, at, dur));
  const exit = (t, at, dur = 0.24, ease = inQuart) => ease(prog(t, at, dur));
  /** A sharp attack on each listed time that decays as e^(−decay·Δt). */
  const pulse = (t, beats, decay = 10) => beats.reduce((acc, at) => (t >= at ? Math.max(acc, Math.exp(-(t - at) * decay)) : acc), 0);
  const beatsBetween = (from, to, every = 1) => {
    const out = [];
    for (let k = from; k < to; k += every) out.push(b(k));
    return out;
  };
  /** Deterministic PRNG, so confetti draws the same on every pass. */
  const seeded = (seed) => {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let r = Math.imul(s ^ (s >>> 15), 1 | s);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  };
  const timecode = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}.${String(Math.floor((t % 1) * 100)).padStart(2, '0')}`;

  const COLOR = { ink: '#0b0e14', cream: '#f4f2ec', gold: '#ffb81c', emerald: '#00875a', emeraldDeep: '#00623f', teal: '#0e4f5c', muted: '#5b5f68' };
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

  // ── Scenes: static markup plus the functions that move it ─────────────────────────────────────────
  // A scene's build(S) returns its HTML. S.ref(fn) marks an element and registers fn(el, t), called on
  // every frame with the scene-local time; the helpers below are built on it.
  function makeScene(root, def, start) {
    const fns = [];
    const S = {
      start,
      ref(fn) { fns.push(fn); return `data-r="${fns.length - 1}"`; },

      /** Masked word rise: 300 ms a word, brand ease, 50 ms stagger. `accent` words follow `text`. */
      words(at, text, { accent = '', accentClass = 'gold', stagger = 0.05, dur = 0.3 } = {}) {
        const list = [...text.split(' ').filter(Boolean).map((w) => [w, '']), ...accent.split(' ').filter(Boolean).map((w) => [w, ' ' + accentClass])];
        return list.map(([w, cls], i) => `<span class="w"><span class="wi${cls}" ${S.ref((el, t) => {
          const p = brand(prog(t, at + i * stagger, dur));
          el.style.transform = `translateY(${(1 - p) * 0.9}em)`;
          el.style.opacity = p;
        })}>${esc(w)}</span></span>`).join('');
      },

      /** Fade and rise for supporting text and UI. Returns the attributes for the element. */
      rise(at, { dur = 0.3, y = 24 } = {}) {
        return S.ref((el, t) => {
          const p = enter(t, at, dur);
          el.style.opacity = p;
          el.style.transform = `translateY(${(1 - p) * y}px)`;
        });
      },

      /** The J mark, drawable: draw(t) strokes the stem and tail, bar(t) extends the crossbar from its centre. */
      drawnMark(size, { draw = () => 1, bar = () => 1, fg = COLOR.cream, accent = COLOR.gold } = {}) {
        const LEN = 137; // stem 52 + arc 62.8 + rise 22
        return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" fill="none" aria-hidden="true" style="overflow:visible">` +
          `<path d="M60 8 V60 A20 20 0 0 1 20 60 V38" stroke="${fg}" stroke-width="14.5" stroke-linecap="butt" stroke-dasharray="${LEN}" ${S.ref((el, t) => el.setAttribute('stroke-dashoffset', LEN * (1 - clamp(draw(t)))))}/>` +
          `<path stroke="${accent}" stroke-width="14.5" stroke-linecap="butt" ${S.ref((el, t) => {
            const half = 24 * clamp(bar(t));
            el.style.display = half > 0 ? '' : 'none';
            el.setAttribute('d', `M${60 - half} 27 H${60 + half}`);
          })}/></svg>`;
      },
      mark(size, fg = COLOR.ink, accent = COLOR.gold) { return S.drawnMark(size, { fg, accent }); },

      /** "jubilee" with a per-letter rise; p(t) is 0→1 for the whole word. */
      wordmark(size, p, color = COLOR.cream) {
        return `<span class="d" style="display:inline-flex;overflow:hidden;line-height:1;font-weight:700;font-size:${size}px;color:${color};letter-spacing:-0.03em;padding-bottom:0.12em">` +
          'jubilee'.split('').map((l, i) => `<span style="display:inline-block" ${S.ref((el, t) => {
            const e = brand(clamp(p(t) * 1.6 - i * 0.09));
            el.style.transform = `translateY(${(1 - e) * 0.9}em)`;
            el.style.opacity = e;
          })}>${l}</span>`).join('') + '</span>';
      },

      /** The crossbar wipe: a gold slab. p(t) 0 = off left, 0.5 = covering, 1 = off right. */
      wipe(p) {
        return `<div class="wipe" ${S.ref((el, t) => {
          const v = p(t);
          el.style.display = v <= 0 || v >= 1 ? 'none' : 'block';
          el.firstChild.style.left = `${-2640 + v * 4800}px`;
        })}><i></i></div>`;
      },

      /** The seal: the J mark in a ring of set text, turning at `spin` degrees a second. */
      seal(size, spin) {
        const id = `seal-${Math.round(start * 10)}-${fns.length}`;
        const text = 'VERIFIED BY THE JUBILEE TEAM · VERIFIED BY THE JUBILEE TEAM · ';
        return `<svg width="${size}" height="${size}" viewBox="0 0 200 200" aria-hidden="true">` +
          `<circle cx="100" cy="100" r="98" fill="${COLOR.ink}"/><circle cx="100" cy="100" r="64" fill="${COLOR.cream}"/>` +
          `<defs><path id="${id}" d="M100 100 m-81 0 a81 81 0 1 1 162 0 a81 81 0 1 1 -162 0"/></defs>` +
          `<g ${S.ref((el, t) => el.setAttribute('transform', `rotate(${t * spin} 100 100)`))}>` +
          `<text font-family="Inter, sans-serif" font-weight="600" font-size="12.4" letter-spacing="1.55" fill="${COLOR.cream}"><textPath href="#${id}">${text}</textPath></text></g>` +
          `<g transform="translate(62 62) scale(0.76)"><path d="M60 8 V60 A20 20 0 0 1 20 60 V38" stroke="${COLOR.ink}" stroke-width="14.5" fill="none"/>` +
          `<path d="M36 27 H84" stroke="${COLOR.gold}" stroke-width="14.5"/></g></svg>`;
      },

      /** The aurora: intensity(t) is 0..1.5; it drifts with film time. */
      aurora(intensity, { horizon = 0.62, colors = [COLOR.ink, COLOR.emerald, COLOR.teal, COLOR.gold] } = {}) {
        let draw = null;
        return `<canvas width="960" height="540" class="fill" style="width:100%;height:100%;background:${colors[0]}" ${S.ref((el, t) => {
          draw ??= aurora(el, horizon, colors);
          draw(start + t, intensity(t));
        })}></canvas>`;
      },

      /** Confetti cannons at each burst time. */
      confetti(bursts, count = 140, seed = 7) {
        return `<canvas width="${W}" height="${H}" class="fill" style="width:100%;height:100%;pointer-events:none" ${S.ref((el, t) => confetti(el.getContext('2d'), t, bursts, count, seed))}></canvas>`;
      },
    };
    root.innerHTML = def.build(S);
    const els = fns.map((_, n) => root.querySelector(`[data-r="${n}"]`));
    return (t) => fns.forEach((fn, n) => fn(els[n], t));
  }

  // WebGL aurora: three layers of domain-warped fbm noise shaped into vertical curtains over ink.
  // Rendered at half resolution and stretched; the softness is the point.
  const FRAG = `
precision highp float;
uniform float uT; uniform float uI; uniform float uH; uniform vec2 uR;
uniform vec3 uC0; uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),u.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x), u.y); }
float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*n(p); p=p*2.03+vec2(1.7,9.2); a*=.5; } return v; }
float curtain(vec2 uv, float off, float speed){
  vec2 q = vec2(uv.x*2.2 + off, uT*speed);
  float w = fbm(q + fbm(q*1.4 + uT*.05));
  float x = uv.x*6. + w*3.5 + off;
  float folds = .5 + .5*sin(x + uT*.35);
  float band = smoothstep(uH+.32, uH-.05, uv.y + w*.18) * smoothstep(uH-.62, uH-.12, uv.y + w*.25);
  return pow(folds, 3.) * band;
}
void main(){
  vec2 uv = gl_FragCoord.xy / uR; uv.y = 1. - uv.y;
  float a = curtain(uv, 0., .06);
  float b = curtain(uv, 3.1, .045) * .8;
  float c = curtain(uv, 7.4, .08) * .55;
  vec3 col = uC0;
  col += uC1 * a * 1.1 * uI;
  col += uC2 * b * 1.2 * uI;
  col += uC3 * pow(c, 1.6) * .9 * uI;
  float grain = (h(gl_FragCoord.xy + uT) - .5) * .025;
  gl_FragColor = vec4(col + grain, 1.);
}`;
  const rgb = (hex) => { const v = parseInt(hex.slice(1), 16); return new Float32Array([((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255]); };
  function aurora(canvas, horizon, colors) {
    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true, premultipliedAlpha: false });
    if (!gl) { errors.push('WebGL is unavailable: the aurora cannot draw'); return () => {}; }
    const shader = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const program = gl.createProgram();
    gl.attachShader(program, shader(gl.VERTEX_SHADER, 'attribute vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }'));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { errors.push('the aurora shader did not link'); return () => {}; }
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.useProgram(program);
    const u = (name) => gl.getUniformLocation(program, name);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.uniform1f(u('uH'), horizon);
    gl.uniform2f(u('uR'), gl.drawingBufferWidth, gl.drawingBufferHeight);
    colors.forEach((hex, i) => gl.uniform3fv(u(`uC${i}`), rgb(hex)));
    const uT = u('uT'), uI = u('uI');
    return (t, intensity) => {
      gl.uniform1f(uT, t);
      gl.uniform1f(uI, intensity);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
  }

  // Canvas confetti, solved in closed form per piece so any frame can be drawn alone:
  // position = origin + v·drag falloff + ½gτ², with spin and flutter from τ. Mostly crossbar-shaped slivers.
  const PALETTE = ['#ffb81c', '#f4f2ec', '#00875a', '#ffd166'];
  function confetti(ctx, t, bursts, count, seed) {
    ctx.clearRect(0, 0, W, H);
    bursts.forEach((at, bi) => {
      const tau = t - at;
      if (tau < 0 || tau > 4) return;
      const rnd = seeded(seed + bi * 101);
      for (let i = 0; i < count; i++) {
        const left = i % 2 === 0;
        const ox = left ? 160 : 1760, oy = 1120;
        const angle = -(Math.PI / 2) + (left ? 1 : -1) * (0.18 + rnd() * 0.5);
        const speed = 1500 + rnd() * 1300;
        const drag = 1.6 + rnd() * 0.8;
        const k = (1 - Math.exp(-drag * tau)) / drag;
        const flutter = Math.sin(tau * (6 + rnd() * 6) + i) * 26 * Math.min(1, tau);
        const x = ox + Math.cos(angle) * speed * k + flutter;
        const y = oy + Math.sin(angle) * speed * k + 0.5 * 900 * tau * tau * 0.55;
        const spin = tau * (4 + rnd() * 8) + rnd() * 6;
        const w = rnd() < 0.7 ? 34 + rnd() * 18 : 16;
        const hgt = w > 20 ? 10 : 16;
        ctx.save();
        ctx.globalAlpha = Math.max(0, tau > 3 ? 1 - (tau - 3) : 1);
        ctx.translate(x, y);
        ctx.rotate(spin);
        ctx.scale(1, Math.cos(spin * 1.7));
        ctx.fillStyle = PALETTE[Math.floor(rnd() * PALETTE.length)];
        ctx.fillRect(-w / 2, -hgt / 2, w, hgt);
        ctx.restore();
      }
    });
  }

  // ── The film ──────────────────────────────────────────────────────────────────────────────────────
  const errors = [];
  const CAPTIONS = window.TIMING?.captions ?? [];
  const stage = document.getElementById('stage');
  const captionBox = document.getElementById('captions');
  const captionText = captionBox.appendChild(document.createElement('span'));
  const guides = document.getElementById('guides');
  let scenes = [];
  let DURATION = 0;

  function render(T) {
    T = clamp(T, 0, DURATION);
    const i = Math.min(scenes.length - 1, Math.floor(T / SCENE));
    const t = T - i * SCENE;
    scenes.forEach((s, k) => { s.el.style.display = k === i ? 'block' : 'none'; });
    scenes[i].update(t);
    const said = CAPTIONS.find((c) => T >= c.start && T < c.end);
    captionText.textContent = said ? said.text : '';
    if (!guides.hidden) {
      const beat = Math.floor(t / BEAT);
      guides.querySelector('.tc').textContent = `S${String(i + 1).padStart(2, '0')} · ${timecode(t)} · film ${timecode(T)} · bar ${Math.floor(t / BAR) + 1}/3 · beat ${(beat % 4) + 1}`;
      [...guides.querySelectorAll('.beats i')].forEach((el, k) => { el.style.background = k === beat ? '#3df5ff' : k % 4 === 0 ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.22)'; });
    }
  }

  const PITCH = window.PITCH = {
    BPM, BEAT, BAR, SCENE, COLOR, b, clamp, lerp, prog, brand, outExpo, inOutCubic, inQuart, outBack, enter, exit, pulse, beatsBetween, esc,
    errors, seek: render, duration: 0, schedule: [], captions: CAPTIONS, ready: null,
    /** Called once by the film's film.js with its scenes, in film order: [{ id, build(S) }]. */
    film(defs) {
      scenes = defs.map((def, i) => {
        const el = stage.appendChild(document.createElement('section'));
        el.id = def.id;
        return { el, update: makeScene(el, def, i * SCENE) };
      });
      DURATION = PITCH.duration = SCENE * scenes.length;
      PITCH.schedule = defs.map((def, i) => ({ id: def.id, start: i * SCENE, end: (i + 1) * SCENE }));
      const images = [...stage.querySelectorAll('img')];
      // Fonts and photos are in before frame 0, so the first frame never draws in a fallback face.
      PITCH.ready = Promise.all([
        ...['700 80px Archivo', '600 80px Archivo', '400 30px Inter', '500 30px Inter', '600 30px Inter'].map((f) => document.fonts.load(f)),
        ...images.map((img) => img.decode().catch(() => errors.push(`image failed to load: ${img.src}`))),
      ]).then(() => document.fonts.ready).then(() => {
        for (const [face, label] of [['700 80px Archivo', 'Archivo'], ['600 30px Inter', 'Inter']]) {
          if (!document.fonts.check(face)) errors.push(`${label} did not load: the film would draw in a fallback face`);
        }
        render(0);
      });
      start();
    },
  };

  function start() {
    const frame = document.getElementById('frame');
    const fit = () => {
      const k = RENDER ? 1 : Math.min(innerWidth / W, innerHeight / H);
      frame.style.transform = `translate(${(innerWidth - W * k) / 2}px, ${(innerHeight - H * k) / 2}px) scale(${k})`;
    };
    addEventListener('resize', fit);
    fit();
    // Captions are part of the film unless <body data-captions="off">; ?captions=0 hides them, ?captions=1 shows them.
    captionBox.hidden = query.get('captions') === '0' || (body.dataset.captions === 'off' && query.get('captions') !== '1');
    guides.hidden = query.get('guides') !== '1';
    guides.innerHTML = `<div class="action"></div><div class="title"></div><div class="tc"></div><div class="beats">${'<i></i>'.repeat(12)}</div>`;
    if (RENDER) { body.classList.add('render'); return; }

    const audio = new Audio(body.dataset.audio);
    let clockStart = null; // fallback clock when the MP3 has not been built yet
    audio.addEventListener('error', () => { audio.failed = true; });
    const now = () => (audio.failed ? (clockStart === null ? 0 : (performance.now() - clockStart) / 1000) : audio.currentTime);
    const playButton = document.getElementById('play');
    const ccButton = document.getElementById('cc');
    const toggle = () => {
      if (audio.failed) { clockStart = clockStart === null || now() >= DURATION ? performance.now() : null; playButton.hidden = clockStart !== null; return; }
      if (audio.paused) { if (audio.ended) audio.currentTime = 0; audio.play(); } else audio.pause();
    };
    audio.addEventListener('play', () => { playButton.hidden = true; });
    audio.addEventListener('pause', () => { playButton.hidden = false; });
    playButton.addEventListener('click', toggle);
    const setCaptions = (on) => { captionBox.hidden = !on; ccButton.setAttribute('aria-pressed', String(on)); };
    setCaptions(!captionBox.hidden);
    ccButton.addEventListener('click', () => setCaptions(captionBox.hidden));
    document.getElementById('restart').addEventListener('click', () => { audio.currentTime = 0; if (audio.failed) clockStart = performance.now(); else audio.play(); playButton.hidden = true; });
    addEventListener('keydown', (e) => {
      if (e.target.closest('button')) return;
      if (e.key === ' ') { e.preventDefault(); toggle(); }
      if (e.key === 'c') setCaptions(captionBox.hidden);
      if (e.key === 'g') guides.hidden = !guides.hidden;
    });
    const start0 = +query.get('t') || 0; // ?t=14.4 opens on that film time, paused
    const loop = () => { render(audio.failed || !audio.paused || audio.currentTime > 0 ? now() : start0); requestAnimationFrame(loop); };
    PITCH.ready.then(loop);
  }
})();

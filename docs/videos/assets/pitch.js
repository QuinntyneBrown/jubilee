// Runtime for animated pitch decks. Everything on screen is a pure function of the clock, so the same
// page plays live (synced to the mixed MP3) and renders frame by frame (tools/video-build/build.mjs
// calls PITCH.seek). See docs/videos/README.md for the attributes a deck may use.
(() => {
  const $ = (s, r = document) => [...r.querySelectorAll(s)];
  const body = document.body;
  const query = new URLSearchParams(location.search);
  const RENDER = query.has('render');
  const INTRO = +body.dataset.intro || 0;
  const OUTRO = +body.dataset.outro || 0;
  const BPM = +body.dataset.bpm || 120;
  const TIMING = window.TIMING;
  const DURATION = INTRO + TIMING.duration + OUTRO;
  const sentences = TIMING.sections.flatMap((s) => s.sentences);
  const W = 1920, H = 1080;

  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const ease = {
    out: (p) => 1 - Math.pow(1 - p, 3),
    expo: (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p)),
    back: (p) => 1 + 3.2 * Math.pow(p - 1, 3) + 2.2 * Math.pow(p - 1, 2),
    bounce: (p) => {
      const n = 7.5625, d = 2.75;
      if (p < 1 / d) return n * p * p;
      if (p < 2 / d) return n * (p -= 1.5 / d) * p + 0.75;
      if (p < 2.5 / d) return n * (p -= 2.25 / d) * p + 0.9375;
      return n * (p -= 2.625 / d) * p + 0.984375;
    },
  };
  const rand = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

  // ── Cues: a section starts when narration reaches the sentence its data-cue begins ────────────────
  const errors = [];
  const sections = $('#stage > section').map((el) => ({ el }));
  sections.forEach((s, i) => {
    const cue = s.el.dataset.cue;
    s.sentence = cue ? sentences.findIndex((x) => x.text.startsWith(cue)) : -1;
    if (cue && s.sentence < 0) errors.push(`cue not found in script.md: "${cue}"`);
    if (!cue && i > 0) errors.push(`section ${i + 1} has no data-cue`);
    s.start = s.sentence < 0 ? 0 : INTRO + sentences[s.sentence].start;
  });
  sections.forEach((s, i) => {
    s.end = i + 1 < sections.length ? sections[i + 1].start : DURATION;
    if (i && s.start <= sections[i - 1].start) errors.push(`cue out of narration order: "${s.el.dataset.cue}"`);
    s.items = $('[data-in], [data-float], [data-beat], [data-drift], [data-count]', s.el).map((el, k) => {
      const d = el.dataset;
      const n = s.sentence + (+d.sentence || 0);
      if (d.sentence && !sentences[n]) errors.push(`data-sentence="${d.sentence}" is past the end of the script`);
      const base = d.sentence && sentences[n] ? INTRO + sentences[n].start : s.start;
      const tilt = (d.tilt || '0,0').split(',').map(Number);
      const drift = (d.drift || '0,0').split(',').map(Number);
      return { el, kind: d.in, t0: base + (+d.at || 0), dur: +d.dur || 0.6, rot: +d.rot || 0, tilt, drift,
        float: +d.float || 0, beat: +d.beat || 0, count: d.count ? +d.count : null, phase: k * 1.7 };
    });
  });

  // ── Background: a sunburst and drifting aurora in a fragment shader ───────────────────────────────
  const glCanvas = document.getElementById('gl');
  const gl = glCanvas.getContext('webgl', { antialias: false, preserveDrawingBuffer: true });
  let uniforms = null;
  if (gl) {
    const compile = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }'));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, `
      precision highp float;
      uniform vec2 res; uniform float time, beat, scene;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 11.; a *= .5; } return v; }
      void main(){
        vec2 uv = (gl_FragCoord.xy - .5 * res) / res.y;
        vec3 ink = vec3(.043, .055, .078), gold = vec3(1., .72, .11), green = vec3(0., .53, .35);
        vec2 c = uv - vec2(.55 * sin(scene * 2.4), -.75);
        float rays = smoothstep(.35, 1., sin(atan(c.y, c.x) * 14. + time * .5) * .5 + .5) * smoothstep(2.2, .2, length(c));
        float a = fbm(uv * 1.4 + vec2(time * .09, -time * .05) + fbm(uv * 2.2 - time * .08));
        float b = fbm(uv * 1.1 + vec2(-time * .06, time * .04) + 23. + scene);
        vec3 col = ink + gold * pow(a, 3.2) * (.6 + .5 * beat) + green * pow(b, 3.) * .55 + gold * rays * (.07 + .09 * beat);
        float dots = smoothstep(.06, .0, length(fract(uv * 9. + vec2(time * .03, 0.)) - .5)) * .09;
        col += gold * dots * smoothstep(.2, 1.1, length(uv));
        col *= 1. - .35 * dot(uv, uv);
        gl_FragColor = vec4(col, 1.);
      }`));
    gl.linkProgram(program);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    uniforms = Object.fromEntries(['res', 'time', 'beat', 'scene'].map((n) => [n, gl.getUniformLocation(program, n)]));
  }

  // ── Foreground: confetti cannons and a gold wipe on every cut, drawn in closed form ───────────────
  const fx = document.getElementById('fx').getContext('2d');
  const COLORS = ['#ffb81c', '#ffc94d', '#f4f2ec', '#5fc49b', '#ffffff'];
  const cuts = sections.slice(1).map((s) => s.start);
  const bursts = cuts.map((t, i) => ({ t, n: 70, seed: i + 1 }));
  const last = sections[sections.length - 1];
  for (let t = last.start + 0.9, i = 0; t < DURATION - 1; t += (60 / BPM) * 4, i++) bursts.push({ t, n: 150, seed: 50 + i });
  bursts.push({ t: 0.25, n: 110, seed: 99 });
  bursts.forEach((b) => {
    const r = rand(b.seed * 7919);
    b.parts = Array.from({ length: b.n }, (_, k) => {
      const left = k % 2 === 0, angle = (left ? -1 : 1) * (0.25 + r() * 0.75), speed = 900 + r() * 1300;
      return { x: left ? -20 : W + 20, y: H + 10, vx: Math.sin(Math.abs(angle)) * speed * (left ? 1 : -1), vy: -Math.cos(angle) * speed,
        w: 12 + r() * 16, h: 8 + r() * 12, spin: (r() - 0.5) * 14, color: COLORS[(r() * COLORS.length) | 0], wob: r() * 6 };
    });
  });

  function drawFx(t) {
    fx.clearRect(0, 0, W, H);
    for (const b of bursts) {
      const dt = t - b.t;
      if (dt < 0 || dt > 2.6) continue;
      const fade = clamp((2.6 - dt) / 0.6);
      for (const p of b.parts) {
        const drag = (1 - Math.exp(-1.6 * dt)) / 1.6;
        const x = p.x + p.vx * drag + Math.sin(dt * 5 + p.wob) * 14;
        const y = p.y + p.vy * drag + 520 * dt * dt;
        fx.save();
        fx.globalAlpha = fade;
        fx.translate(x, y);
        fx.rotate(p.spin * dt);
        fx.scale(1, Math.cos(dt * 9 + p.wob));
        fx.fillStyle = p.color;
        fx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        fx.restore();
      }
    }
    for (const cut of cuts) {
      const p = (t - cut + 0.2) / 0.4;
      if (p <= 0 || p >= 1) continue;
      const x = (-1.75 + p * 3.2) * W;
      fx.save();
      fx.transform(1, 0, -0.35, 1, 0, 0);
      fx.fillStyle = '#0b0e14'; fx.fillRect(x - 60, -10, 1.45 * W + 120, H + 20);
      fx.fillStyle = '#ffb81c'; fx.fillRect(x + 380, -10, 1.45 * W, H + 20);
      fx.restore();
    }
  }

  // ── The frame ─────────────────────────────────────────────────────────────────────────────────────
  const captionBox = document.getElementById('captions');
  const captionText = captionBox.appendChild(document.createElement('span'));

  function render(t) {
    t = clamp(t, 0, DURATION);
    const beatPhase = ((t * BPM) / 60) % 1;
    const beat = Math.exp(-beatPhase * 5);
    let sceneIndex = 0;
    sections.forEach((s, i) => {
      const on = t >= s.start && (t < s.end || i === sections.length - 1);
      s.el.style.display = on ? 'block' : 'none';
      if (!on) return;
      sceneIndex = i;
      for (const it of s.items) {
        const p = clamp((t - it.t0) / it.dur);
        let x = it.drift[0] * (t - s.start), y = it.drift[1] * (t - s.start), scale = 1, opacity = it.kind ? (p > 0 ? 1 : 0) : 1;
        if (it.kind === 'pop') scale = p > 0 ? 0.3 + 0.7 * ease.back(p) : 0;
        else if (it.kind === 'stamp') { scale = 1 + (1 - ease.expo(p)) * 2.6; opacity = clamp(p * 4); }
        else if (it.kind === 'up') { y += (1 - ease.out(p)) * 150; opacity = clamp(p * 2.5); }
        else if (it.kind === 'left') { x -= (1 - ease.out(p)) * 420; opacity = clamp(p * 2.5); }
        else if (it.kind === 'right') { x += (1 - ease.out(p)) * 420; opacity = clamp(p * 2.5); }
        else if (it.kind === 'rise') y += (1 - ease.out(p)) * 1000;
        else if (it.kind === 'drop') y -= (1 - ease.bounce(p)) * 1100;
        if (it.float) y += Math.sin(t * 1.5 + it.phase) * it.float;
        if (it.beat) scale *= 1 + beat * it.beat;
        const sway = it.tilt[0] || it.tilt[1] ? Math.sin(t * 0.8 + it.phase) * 2.5 : 0;
        it.el.style.opacity = opacity;
        it.el.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) rotateX(${it.tilt[0]}deg) rotateY(${(it.tilt[1] + sway).toFixed(2)}deg) rotate(${it.rot}deg) scale(${scale.toFixed(4)})`;
        if (it.count !== null) it.el.textContent = Math.round(it.count * ease.out(clamp((t - it.t0) / 1.1)));
      }
    });
    if (gl) {
      gl.viewport(0, 0, W, H);
      gl.uniform2f(uniforms.res, W, H);
      gl.uniform1f(uniforms.time, t);
      gl.uniform1f(uniforms.beat, beat);
      gl.uniform1f(uniforms.scene, sceneIndex);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    drawFx(t);
    const said = sentences.find((s) => t >= INTRO + s.start && t < INTRO + s.end + 0.1);
    captionText.textContent = said ? said.text : '';
  }

  // ── Playing it ────────────────────────────────────────────────────────────────────────────────────
  const frame = document.getElementById('frame');
  const fit = () => {
    const k = RENDER ? 1 : Math.min(innerWidth / W, innerHeight / H);
    frame.style.transform = `translate(${(innerWidth - W * k) / 2}px, ${(innerHeight - H * k) / 2}px) scale(${k})`;
  };
  addEventListener('resize', fit);
  fit();
  captionBox.hidden = query.get('captions') !== '1'; // captions are off unless asked for

  const ready = Promise.all([document.fonts.ready, ...$('img').map((img) => img.decode().catch(() => errors.push(`image failed to load: ${img.getAttribute('src')}`)))])
    .then(() => document.fonts.load('800 80px Archivo')).then(() => render(0));
  window.PITCH = { ready, errors, duration: DURATION, intro: INTRO, outro: OUTRO, sentences,
    schedule: sections.map((s) => ({ id: s.el.id, start: s.start, end: s.end })), seek: render };
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
  });
  const loop = () => { render(now()); requestAnimationFrame(loop); };
  ready.then(loop);
})();

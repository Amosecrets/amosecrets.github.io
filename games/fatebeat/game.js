(function (root) {
  'use strict';
  var CJK_FALLBACK = '"FB Symbols","FB CJK","PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif';
  var FONT_STACKS = [
    '"Fredoka","ZCOOL KuaiLe",',
    '"Fusion Pixel",',
    '"Cormorant Garamond","ZCOOL XiaoWei",',
    '"Permanent Marker","Zhi Mang Xing",',
    '"Patrick Hand","Long Cang",',
    '"Share Tech Mono","Fusion Pixel",',
    '"Orbitron","ZCOOL QingKe HuangYou",',
    '"Bungee","ZCOOL QingKe HuangYou",',
    '"Creepster","Zhi Mang Xing",',
    '"Josefin Sans","ZCOOL XiaoWei",'
  ].map(function (f) { return f + CJK_FALLBACK; });
  var BLEND = ['source-over', 'lighter', 'multiply', 'screen', 'overlay', 'difference', 'destination-out', 'source-atop',
    'color-dodge', 'hard-light', 'soft-light', 'color', 'luminosity', 'hue'];
  var CAPS = ['butt', 'round', 'square'];
  var JOINS = ['miter', 'round', 'bevel'];
  var ALIGN = ['left', 'center', 'right'];
  var BASELINE = ['alphabetic', 'middle', 'top'];
  function createGame(opts) {
    var canvas = opts.canvas;
    var main = canvas.getContext('2d');
    var ctx = main;
    var audio = opts.audio;
    var memory, u8, u32, f32;
    var decoder = new TextDecoder('utf-8');
    var colors = new Map();
    var layers = {};
    var base = [1, 0, 0];
    var lastFont = '';
    var fontFam = 0;
    var images = {};
    var imgBase = opts.assetBase || '';
    function views() {
      if (!u8 || u8.buffer !== memory.buffer) {
        u8 = new Uint8Array(memory.buffer);
        u32 = new Uint32Array(memory.buffer);
        f32 = new Float32Array(memory.buffer);
      }
    }
    function css(c) {
      c = c >>> 0;
      var s = colors.get(c);
      if (!s) {
        if (colors.size > 20000) colors.clear();
        s = 'rgba(' + (c >>> 24) + ',' + ((c >>> 16) & 255) + ',' + ((c >>> 8) & 255) + ',' + ((c & 255) / 255).toFixed(3) + ')';
        colors.set(c, s);
      }
      return s;
    }
    function str(p, n) {
      views();
      return decoder.decode(u8.subarray(p, p + n));
    }
    function stops(g, pc, ps, n) {
      views();
      for (var i = 0; i < n; i++) g.addColorStop(Math.min(1, Math.max(0, f32[(ps >> 2) + i])), css(u32[(pc >> 2) + i]));
      return g;
    }
    var env = {
      cv_save: function () { ctx.save(); },
      cv_restore: function () { ctx.restore(); lastFont = ''; },
      cv_base: function (s, ox, oy) { base = [s, ox, oy]; },
      cv_reset: function () {
        ctx.setTransform(base[0], 0, 0, base[0], base[1], base[2]);
        ctx.filter = 'none'; ctx.shadowColor = 'rgba(0,0,0,0)'; ctx.shadowBlur = 0; ctx.setLineDash([]); ctx.imageSmoothingEnabled = true;
      },
      cv_translate: function (x, y) { ctx.translate(x, y); },
      cv_rotate: function (a) { ctx.rotate(a); },
      cv_scale: function (x, y) { ctx.scale(x, y); },
      cv_alpha: function (a) { ctx.globalAlpha = a; },
      cv_blend: function (m) { ctx.globalCompositeOperation = BLEND[m] || BLEND[0]; },
      cv_fill_color: function (c) { ctx.fillStyle = css(c); },
      cv_stroke_color: function (c) { ctx.strokeStyle = css(c); },
      cv_fill_lin: function (x0, y0, x1, y1, pc, ps, n) { ctx.fillStyle = stops(ctx.createLinearGradient(x0, y0, x1, y1), pc, ps, n); },
      cv_fill_rad: function (x, y, r0, r1, pc, ps, n) { ctx.fillStyle = stops(ctx.createRadialGradient(x, y, r0, x, y, Math.max(r1, r0 + 0.01)), pc, ps, n); },
      cv_line_width: function (w) { ctx.lineWidth = w; },
      cv_line_style: function (cap, join) { ctx.lineCap = CAPS[cap]; ctx.lineJoin = JOINS[join]; },
      cv_begin: function () { ctx.beginPath(); },
      cv_move: function (x, y) { ctx.moveTo(x, y); },
      cv_line: function (x, y) { ctx.lineTo(x, y); },
      cv_quad: function (cx, cy, x, y) { ctx.quadraticCurveTo(cx, cy, x, y); },
      cv_cubic: function (a, b, c, d, x, y) { ctx.bezierCurveTo(a, b, c, d, x, y); },
      cv_arc: function (x, y, r, a0, a1, ccw) { ctx.arc(x, y, Math.max(0, r), a0, a1, !!ccw); },
      cv_ellipse: function (x, y, rx, ry, rot, a0, a1) { ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot, a0, a1); },
      cv_rect: function (x, y, w, h) { ctx.rect(x, y, w, h); },
      cv_rrect: function (x, y, w, h, r) {
        if (w < 0) { x += w; w = -w; }
        if (h < 0) { y += h; h = -h; }
        r = Math.max(0, Math.min(r, w / 2, h / 2));
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
      },
      cv_close: function () { ctx.closePath(); },
      cv_fill: function () { ctx.fill(); },
      cv_stroke: function () { ctx.stroke(); },
      cv_clip: function () { ctx.clip(); },
      cv_font: function (size, weight) {
        var f = weight + ' ' + size.toFixed(2) + 'px ' + FONT_STACKS[fontFam];
        if (f !== lastFont) { ctx.font = f; lastFont = f; }
      },
      cv_text_align: function (h, v) { ctx.textAlign = ALIGN[h]; ctx.textBaseline = BASELINE[v]; },
      cv_fill_text: function (p, n, x, y) { ctx.fillText(str(p, n), x, y); },
      cv_stroke_text: function (p, n, x, y) { ctx.strokeText(str(p, n), x, y); },
      cv_text_width: function (p, n) { return ctx.measureText(str(p, n)).width; },
      cv_layer_begin: function (id, w, h) {
        var s = base[0];
        var pw = Math.max(1, Math.ceil(w * s)), ph = Math.max(1, Math.ceil(h * s));
        var L = layers[id];
        if (!L || L.width < pw || L.height < ph) L = layers[id] = opts.createCanvas(Math.max(pw, L ? L.width : 0), Math.max(ph, L ? L.height : 0));
        L.uw = pw; L.uh = ph;
        ctx = L.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, pw + 1, ph + 1);
        ctx.setTransform(s, 0, 0, s, 0, 0);
        lastFont = '';
      },
      cv_layer_end: function () { ctx = main; lastFont = ''; },
      cv_layer_draw: function (id, x, y, w, h) { var L = layers[id]; if (L) ctx.drawImage(L, 0, 0, L.uw, L.uh, x, y, w, h); },
      cv_layer_draw_sub: function (id, sx, sy, sw, sh, dx, dy, dw, dh) {
        var L = layers[id], s = base[0];
        if (!L || sw <= 0 || sh <= 0) return;
        var px = sx * s, py = sy * s, pw = sw * s, ph = sh * s;
        if (px < 0) { dx -= px / s * (dw / sw); dw += px / s * (dw / sw); pw += px; px = 0; }
        if (py < 0) { dy -= py / s * (dh / sh); dh += py / s * (dh / sh); ph += py; py = 0; }
        pw = Math.min(pw, L.uw - px); ph = Math.min(ph, L.uh - py);
        if (pw <= 0 || ph <= 0) return;
        ctx.drawImage(L, px, py, pw, ph, dx, dy, pw / s * (dw / sw), ph / s * (dh / sh));
      },
      cv_snapshot: function (id) {
        var L = layers[id];
        if (!L || L.width < canvas.width || L.height < canvas.height) L = layers[id] = opts.createCanvas(Math.max(canvas.width, L ? L.width : 0), Math.max(canvas.height, L ? L.height : 0));
        L.uw = canvas.width; L.uh = canvas.height;
        var c = L.getContext('2d');
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.clearRect(0, 0, L.width, L.height);
        c.drawImage(canvas, 0, 0);
      },
      cv_font_family: function (f) { if (f !== fontFam) { fontFam = (f >= 0 && f < FONT_STACKS.length) ? f : 0; lastFont = ''; } },
      cv_filter: function (p, n) { ctx.filter = str(p, n); },
      cv_smoothing: function (on) { ctx.imageSmoothingEnabled = !!on; },
      cv_shadow: function (c, blur, ox, oy) {
        if ((c & 255) === 0) { ctx.shadowColor = 'rgba(0,0,0,0)'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; return; }
        ctx.shadowColor = css(c); ctx.shadowBlur = blur * base[0]; ctx.shadowOffsetX = ox * base[0]; ctx.shadowOffsetY = oy * base[0];
      },
      cv_dash: function (on, off) { ctx.setLineDash(on > 0 ? [on, off] : []); },
      cv_image_load: function (slot, p, n) {
        var path = str(p, n), im = images[slot];
        if (im && im.path === path) return;
        im = images[slot] = { path: path, state: 0, img: null };
        opts.loadImage(imgBase + path, function (img) { if (images[slot] === im) { im.img = img; im.state = 1; } },
          function () { if (images[slot] === im) im.state = -1; });
      },
      cv_image_state: function (slot) { var im = images[slot]; return im ? im.state : 0; },
      cv_image_w: function (slot) { var im = images[slot]; return im && im.state === 1 ? im.img.width : 0; },
      cv_image_h: function (slot) { var im = images[slot]; return im && im.state === 1 ? im.img.height : 0; },
      cv_image_draw: function (slot, sx, sy, sw, sh, dx, dy, dw, dh) {
        var im = images[slot];
        if (!im || im.state !== 1) return;
        if (sw <= 0 || sh <= 0) ctx.drawImage(im.img, dx, dy, dw, dh);
        else ctx.drawImage(im.img, sx, sy, sw, sh, dx, dy, dw, dh);
      },
      au_load: function (i) { audio.load(i); },
      au_state: function () { return audio.state(); },
      au_play: function (from) { audio.play(from); },
      au_pause: function () { audio.pause(); },
      au_resume: function () { audio.resume(); },
      au_time: function () { return audio.time(); },
      au_volume: function (v) { audio.volume(v); },
      au_sfx_define: function (id, p, n, rate) { views(); audio.sfxDefine(id, f32.slice(p >> 2, (p >> 2) + n), rate); },
      au_sfx_play: function (id, vol, rate) { audio.sfxPlay(id, vol, rate); },
      st_load: function (p, max) {
        var s = opts.storage.load();
        if (!s) return 0;
        try {
          var bin = atob(s);
          if (bin.length > max) return 0;
          views();
          for (var i = 0; i < bin.length; i++) u8[p + i] = bin.charCodeAt(i);
          return bin.length;
        } catch (e) { return 0; }
      },
      st_save: function (p, n) {
        views();
        var s = '';
        for (var i = 0; i < n; i++) s += String.fromCharCode(u8[p + i]);
        opts.storage.save(btoa(s));
      },
      js_log: function (p, n) { console.log(str(p, n)); }
    };
    return WebAssembly.instantiate(opts.wasmBytes, { env: env }).then(function (res) {
      var ex = res.instance.exports;
      memory = ex.memory;
      if (ex._initialize) ex._initialize();
      ex.init();
      return ex;
    });
  }
  function makeBrowserAudio() {
    var music = new Audio();
    var state = 0, song = -1, loadAt = 0;
    var actx = null, sfx = {};
    music.preload = 'auto';
    function ready() { if (state === 1) state = 2; }
    music.addEventListener('canplay', ready);
    music.addEventListener('canplaythrough', ready);
    var remote = null, onLocal = 0, blobs = {}, blobOrder = [], fetchGen = 0;
    function setSrc(url, local) { onLocal = local; music.src = url; music.load(); }
    function fetchRemote(i) {
      var gen = ++fetchGen;
      fetch(remote).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); }).then(function (b) {
        var url = URL.createObjectURL(b);
        blobs[i] = url;
        blobOrder.push(i);
        while (blobOrder.length > 6) { var old = blobOrder.shift(); if (old !== song) { URL.revokeObjectURL(blobs[old]); delete blobs[old]; } else blobOrder.push(old); }
        if (gen === fetchGen && song === i && state === 1) setSrc(url, 0);
      }).catch(function (e) { diag('online song failed: ' + e.message); if (gen === fetchGen && song === i && state === 1) state = 3; });
    }
    music.addEventListener('error', function () {
      if (state !== 1) return;
      if (onLocal && remote) { onLocal = 0; fetchRemote(song); } else state = 3;
    });
    ['waiting', 'stalled'].forEach(function (ev) {
      music.addEventListener(ev, function () { diag(ev + ' @' + music.currentTime.toFixed(2)); });
    });
    function unlock() {
      if (!actx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (AC) { try { actx = new AC({ latencyHint: 'interactive' }); } catch (e) { actx = null; } }
      }
      if (actx && actx.state === 'suspended') actx.resume();
    }
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
    function playSafe() { var p = music.play(); if (p && p.catch) p.catch(function () {}); }
    return {
      load: function (i) {
        if (song === i && state === 2) return;
        song = i;
        state = 1;
        loadAt = performance.now();
        music.pause();
        var nn = (i + 1 < 10 ? '0' : '') + (i + 1);
        remote = (root.FATEBEAT_MUSIC || {})[nn] || null;
        if (blobs[i]) { setSrc(blobs[i], 0); return; }
        setSrc('music/' + nn + '.ogg', 1);
      },
      state: function () {
        if (state === 1 && !(remote && !onLocal && !blobs[song]) && (music.readyState >= 3 || (music.readyState >= 1 && performance.now() - loadAt > 1200))) state = 2;
        return state;
      },
      play: function (from) { try { music.currentTime = Math.max(0, from); } catch (e) {} playSafe(); },
      pause: function () { music.pause(); },
      paused: function () { return music.paused; },
      resume: function () { playSafe(); },
      time: function () { return music.currentTime; },
      info: function () { return 'state=' + state + ' ready=' + music.readyState + ' paused=' + music.paused + ' t=' + music.currentTime.toFixed(2) + (music.error ? ' err=' + music.error.code : ''); },
      volume: function (v) { music.volume = Math.max(0, Math.min(1, v)); },
      sfxDefine: function (id, samples, rate) { sfx[id] = { samples: samples, rate: rate, buf: null }; },
      sfxPlay: function (id, vol, rate) {
        var s = sfx[id];
        if (!actx || !s || actx.state !== 'running') return;
        if (!s.buf) {
          s.buf = actx.createBuffer(1, s.samples.length, s.rate);
          s.buf.getChannelData(0).set(s.samples);
        }
        var src = actx.createBufferSource(), g = actx.createGain();
        src.buffer = s.buf;
        src.playbackRate.value = rate;
        g.gain.value = vol;
        src.connect(g);
        g.connect(actx.destination);
        src.start();
      }
    };
  }
  var KEYS = {
    KeyD: 1, KeyF: 2, KeyJ: 3, KeyK: 4,
    ArrowUp: 10, ArrowDown: 11, ArrowLeft: 12, ArrowRight: 13, KeyW: 10, KeyS: 11, KeyA: 12,
    Enter: 14, NumpadEnter: 14, Escape: 15, Space: 16, Tab: 17, KeyR: 20, KeyO: 21, KeyP: 15, Backspace: 15
  };
  var diagLog = [];
  var lastHeap = 0;
  function heap() {
    var m = typeof performance !== 'undefined' && performance.memory;
    if (!m) return '';
    var h = m.usedJSHeapSize / 1048576, d = h - lastHeap;
    lastHeap = h;
    return ' heap ' + h.toFixed(1) + 'MB (' + (d >= 0 ? '+' : '') + d.toFixed(1) + ')';
  }
  function diag(msg) { if (diagLog.length >= 200) diagLog.shift(); diagLog.push((performance.now() / 1000).toFixed(2) + 's ' + msg); }
  if (typeof window !== 'undefined') window.__fbDiag = function () { return diagLog.join('\n'); };
  function b64bytes(b64) {
    var bin = atob(b64), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function boot() {
    var canvas = document.getElementById('game');
    var note = document.getElementById('note');
    function fail(msg) { if (note) { note.style.display = 'block'; note.textContent = msg; } }
    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = Math.max(320, Math.floor(window.innerWidth * dpr)), h = Math.max(180, Math.floor(window.innerHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    }
    window.addEventListener('resize', resize);
    resize();
    var audioDev = null;
    var fonts = [];
    if (window.FontFace && document.fonts && root.FATEBEAT_FONTS) {
      root.FATEBEAT_FONTS.forEach(function (f) {
        try {
          var face = new FontFace(f.family, b64bytes(f.data).buffer, f.desc || {});
          fonts.push(face.load().then(function (ff) { document.fonts.add(ff); }, function () {}));
        } catch (e) {}
      });
    }
    var storage = {
      load: function () { try { return localStorage.getItem('fatebeat.save'); } catch (e) { return null; } },
      save: function (s) { try { localStorage.setItem('fatebeat.save', s); } catch (e) {} }
    };
    var wasm = root.GAME_WASM_B64 ? Promise.resolve(b64bytes(root.GAME_WASM_B64))
      : fetch('game.wasm').then(function (r) { return r.arrayBuffer(); });
    Promise.all([wasm, Promise.all(fonts)]).then(function (r) {
      return createGame({
        canvas: canvas,
        wasmBytes: r[0],
        createCanvas: function (w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; },
        loadImage: function (src, ok, fail) {
          var im = new Image();
          im.onload = function () { if (im.decode) im.decode().then(function () { ok(im); }, function () { ok(im); }); else ok(im); };
          im.onerror = fail;
          im.src = src;
        },
        audio: (audioDev = makeBrowserAudio()),
        storage: storage
      });
    }).then(function (ex) {
      if (note) note.style.display = 'none';
      var dprOf = function () { return canvas.width / canvas.getBoundingClientRect().width; };
      window.addEventListener('keydown', function (e) {
        if (e.code === 'F8') {
          e.preventDefault();
          var box = document.getElementById('diag');
          if (!box) {
            box = document.createElement('pre');
            box.id = 'diag';
            box.style.cssText = 'position:fixed;left:8px;top:8px;max-height:80vh;overflow:auto;margin:0;padding:8px 12px;' +
              'background:rgba(0,0,0,.8);color:#fff;font:13px monospace;z-index:9;user-select:text';
            document.body.appendChild(box);
          } else if (box.style.display !== 'none') { box.style.display = 'none'; return; }
          box.style.display = 'block';
          box.textContent = 'FateBeat hitch log (F8 to close)\n' + (diagLog.length ? diagLog.join('\n') : 'no hitches recorded');
          return;
        }
        var k = KEYS[e.code];
        if (!k || e.ctrlKey || e.metaKey || e.altKey) return;
        e.preventDefault();
        if (e.repeat && k < 10) return;
        ex.key(k, 1, e.timeStamp || performance.now());
      });
      window.addEventListener('keyup', function (e) {
        var k = KEYS[e.code];
        if (!k) return;
        ex.key(k, 0, e.timeStamp || performance.now());
      });
      var slots = {};
      function slot(e, release) {
        if (e.pointerType === 'mouse') return 0;
        var s = slots[e.pointerId];
        if (s === undefined) {
          var used = {};
          for (var k in slots) used[slots[k]] = 1;
          for (s = 1; s < 11 && used[s]; s++) {}
          slots[e.pointerId] = s;
        }
        if (release) delete slots[e.pointerId];
        return s;
      }
      function ptr(phase) {
        return function (e) {
          var r = canvas.getBoundingClientRect(), d = dprOf();
          e.preventDefault();
          if (phase === 0 && canvas.setPointerCapture) { try { canvas.setPointerCapture(e.pointerId); } catch (err) {} }
          ex.pointer(slot(e, phase === 2), phase, (e.clientX - r.left) * d, (e.clientY - r.top) * d, e.timeStamp || performance.now());
        };
      }
      canvas.addEventListener('pointerdown', ptr(0));
      canvas.addEventListener('pointermove', ptr(1));
      canvas.addEventListener('pointerup', ptr(2));
      canvas.addEventListener('pointercancel', ptr(2));
      canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      var wheelAt = 0;
      window.addEventListener('wheel', function (e) {
        var now = performance.now();
        if (now - wheelAt < 70 || !e.deltaY) return;
        wheelAt = now;
        ex.key(e.deltaY > 0 ? 11 : 10, 1, now);
      }, { passive: true });
      document.addEventListener('visibilitychange', function () { if (document.hidden) ex.blur(); });
      window.addEventListener('blur', function () { ex.blur(); });
      var q = new URLSearchParams(location.search);
      if (q.has('debug')) ex.debug(+q.get('debug'), +(q.get('song') || 0), +(q.get('diff') || 0), +(q.get('at') || 0));
      var dbg = q.get('debug') === '6' ? note : null;
      if (dbg) { dbg.style.display = 'block'; dbg.style.top = '2px'; dbg.style.fontSize = '13px'; }
      if (dbg) window.__fb = function () { return 'gstate=' + ex.stat(0) + ' gt=' + ex.stat(9) + 'ms combo=' + ex.stat(10); };
      var lastTick = 0, lastAt = -1, atSame = 0, lastHeapAt = 0;
      function tick(now) {
        resize();
        var t0 = performance.now();
        ex.frame(t0, canvas.width, canvas.height);
        var t1 = performance.now();
        var where = '';
        if (ex.stat(0) === 3) where = ' song ' + (ex.stat(11) + 1) + ' at ' + (ex.stat(9) / 1000).toFixed(1) + 's';
        if (t1 - t0 > 50) diag('slow frame ' + (t1 - t0).toFixed(0) + 'ms (game drawing)' + where);
        else if (lastTick && t0 - lastTick > 120 && !document.hidden) diag('frame gap ' + (t0 - lastTick).toFixed(0) + 'ms (browser busy)' + where + heap());
        lastTick = t1;
        if (((t1 / 1000) | 0) !== ((lastHeapAt / 1000) | 0)) { lastHeapAt = t1; heap(); }
        var at = audioDev.time();
        if (!audioDev.paused() && ex.stat(0) === 3) {
          if (at === lastAt) { if (atSame >= 0 && (atSame += 1) === 9) { diag('music stalled' + where); atSame = -1; } }
          else { if (atSame === -1) diag('music running again' + where); atSame = 0; }
        }
        lastAt = at;
        if (dbg) dbg.textContent = audioDev.info();
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }).catch(function (e) {
      console.error(e);
      fail('Could not start the game: ' + (e && e.message ? e.message : e));
    });
  }
  root.FateBeat = { createGame: createGame };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.FateBeat;
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);

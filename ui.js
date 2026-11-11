// ========================
// UI kit: the shared look and behaviour of every menu ("storybook arcade")
// ========================
// One global, `UI`. Everything it draws is code-drawn (no image or font
// files), sits on the main camera in full-width 1066x600 coordinates
// (obj.wideUI = true, scrollFactor 0, see view.js) and works on the Canvas
// renderer too (no postFX / preFX).
//
// ---- Screens -----------------------------------------------------------
//   const s = UI.screen(scene, {
//       id: 'shop',             // name, for tests and debugging
//       depth: 2000,            // base depth; parts use depth .. depth+9
//       backdrop: 'solid',      // 'dim' (level shows through), 'solid', or false
//       modal: true,            // swallow clicks behind it (default true)
//       onBack: () => s.close(() => showMainMenu(scene)),   // Esc, and back buttons
//       onKey: (event) => false,   // optional: runs before default navigation,
//                                  // return true when it handled the key
//       enter: 'slide'          // 'slide' (default), 'fade' or 'pop'
//   });
//   s.title(VIEW_W / 2, 48, 'SHOP', { ribbon: true });
//   s.panel(VIEW_W / 2, 300, 520, 360, { header: 'COLORS', accent: 'nav' });
//   s.button(VIEW_W / 2, 520, 'Back', { role: 'neutral', icon: 'back', onClick: () => s.onBack() });
//   s.hintBar([['ARROWS', 'Move'], ['ENTER', 'Select'], ['ESC', 'Back']]);
//   s.open();                   // call right after building
//   menuObjects.push({ destroy: () => s.destroy() });   // so clearMenuObjects() closes it too
//
//   All x, y are the CENTRE of the element, in 1066x600 screen coordinates
//   (VIEW_W / 2 is the middle). Labels take opts.align 'left' | 'center' | 'right'.
//
// ---- Builders (each adds the object to the screen and returns it) -------
//   s.panel(x, y, w, h, { header, accent: role, fill: 'dark' })
//   s.title(x, y, text, { ribbon: true, size })        -> .setText(t)
//   s.label(x, y, text, { style: 'body'|'small'|'caps'|'value'|'mono',
//                         color: role or css colour, align, size, wrap: px })   -> Phaser Text
//   s.button(x, y, text, { role: 'go'|'nav'|'mode'|'danger'|'neutral',
//                          size: 'lg'|'md'|'sm', icon, iconColor, width, enabled,
//                          locked (grey with a lock icon), default: true, onClick(button) })
//        -> a Container with setLabel(t), setRole(r), setEnabled(b), setVisible(b), .record
//        default: true marks the item focused first (else the first enabled one)
//   s.iconButton(x, y, icon, { role, size: px, label: 'Close', enabled, default, onClick })
//        round key; `label` names it for tests and the inventory
//   s.toggle(x, y, label, value, onChange(bool), { width })    -> .value, .setValue(v)
//   s.slider(x, y, w, value01, onChange(v), { label, showValue })  -> .value, .setValue(v)
//        drag the handle, click the track, or Left / Right (5% steps) while focused
//   s.tabs(x, y, ['A', 'B'], activeIndex, onChange(i), { label })  -> .index, .setActive(i)
//        (its focus record is labelled opts.label or 'A / B'; each tab is clickable)
//        Left / Right switch tabs while the strip is focused
//   s.card(x, y, w, h, { label, sub, icon, iconColor, right, state: 'normal'|'selected'|'locked'|'owned',
//                        enabled, default, onClick(card) })
//        -> Container; card.add(child) puts your own objects inside (local coords,
//           0,0 = card centre); card.setState(s); card.setEnabled(b)
//        A 'locked' card is focusable but its onClick does not run (enabled false)
//        unless you pass enabled: true.
//   s.stat(x, y, icon, text, { color, mono, align })   icon + value chip   -> .setText(t)
//   s.icon(x, y, name, size, color)         see UI.ICONS; returns an Image
//   s.scrollList(x, y, w, h, { rowHeight, gap })
//        -> list.addRow(label, { sub, icon, right, rightColor, state, onClick }) -> card
//           list.addCard(h, cardOpts) -> card (empty, fill it with card.add)
//           list.clear(); list.scrollToRow(i)
//        Mouse wheel, Up / Down keep the focused row in view, scroll bar on the right.
//   s.hintBar('text' or [['ESC', 'Back'], ...])
//   s.add(anyPhaserObject, layer)   adopt a custom object (wideUI, scrollFactor 0,
//                                   destroyed with the screen); returns it. Layer is
//                                   added to the screen depth: 0 backdrop, 1 panels,
//                                   3 text and icons (default), 4 controls, 5 hint bar, 6 rings
//   s.focusable(obj, { label, onActivate, onFocus, onBlur, onLeft, onRight, default })
//        register a custom object for keyboard focus (the kit draws the gold ring)
//
// ---- Lifecycle ---------------------------------------------------------
//   s.open()        enter animation, then input is enabled
//   s.onBack()      runs opts.onBack (what Esc does)
//   s.close(cb)     leave animation (120 ms), destroys everything, then cb()
//   s.destroy()     remove at once, no animation (safe to call twice)
//   s.setFocus(el)  el = a builder result or its record
//   s.rebuild(fn)   swap content with a cross-fade: objects made inside the
//                   previous rebuild(fn) fade out, fn() builds the new ones
//   Elements added after open() animate in by themselves and join focus.
//   s.id, s.focusables (records: { label, enabled, visible, x, y, kind }),
//   s.focused (the focused record) are readable from tests.
//
// ---- Input -------------------------------------------------------------
//   Arrows move focus to the nearest item that way (wrapping); Space / Enter
//   activate; Esc calls onBack. The mouse moves the same focus. Only the top
//   screen gets keys and clicks; closing it returns focus to where it was.
//   Input is ignored while a screen animates in or out.
//
// ---- Other -------------------------------------------------------------
//   UI.theme        colours, fonts, sizes, depths, timings (the only place they live)
//   UI.theme.motion false with ?nomotion=1 or prefers-reduced-motion: no tweens
//   UI.toast(scene, { icon, iconColor, title, body, key, position: 'top'|'bottom',
//                     duration, accent }) -> { close() }   non-modal banner
//   UI.icon(scene, name, size, color) -> Image (code-drawn once into a cached texture)
//   UI.drawIcon(graphics, name, size, color, x, y) draws one into your own Graphics
//   UI.isOpen()     true while any modal kit screen is open (or closing)
//   UI.top()        the top screen or null
//   UI.reset(scene) called from create(): drops every screen, toast and listener
//   UI.showStyleSheet(scene)   every component (open with ?uikit=1)
//
// ---- Notes for converting a screen ---------------------------------------
//   - game.js already ignores Esc / R and skips update() while UI.isOpen(),
//     and closing a screen sets wasJumpPressed so a held Space does not jump.
//   - The legacy 800px menu camera (view.js) draws after the main camera, so
//     old-style objects always appear ABOVE kit screens whatever their depth.
//     Convert a screen together with the popups it opens. While a modal kit
//     screen is open the kit turns off input on that camera.
//   - Camera fade / shake on the main camera also move kit screens.
//   - Panels and icons are drawn once into cached textures; everything else is
//     live Graphics, so keep very large screens lean (WebGL redraws them).

const UI = (() => {
    const params = new URLSearchParams(window.location.search);
    let reducedMotion = false;
    try {
        reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) { /* old browser */ }

    const role = (base, light, lip, ink, text) => ({ base, light, lip, ink, text: text || '#ffffff' });

    const theme = {
        motion: params.get('nomotion') !== '1' && !reducedMotion,
        font: '"Trebuchet MS", "Segoe UI", system-ui, sans-serif',
        fontMono: '"Consolas", "Menlo", "DejaVu Sans Mono", monospace',
        textResolution: 2,
        roles: {
            go: role(0x43b649, 0x5ccf62, 0x2a7d32, '#1d5a24'),
            nav: role(0x3b82e0, 0x5a9cf2, 0x2457a3, '#173f7a'),
            mode: role(0xf0a030, 0xffb94e, 0xb26d12, '#7a4705'),
            danger: role(0xe04a4a, 0xf26464, 0x9e2c30, '#6e1a1d'),
            neutral: role(0x5b6b88, 0x7183a3, 0x3a4660, '#262f42'),
            disabled: role(0x464e5e, 0x4d5667, 0x2f3542, '#20252f', '#8d97a8')
        },
        color: {
            gold: 0xffc93c, goldDeep: 0xc98a12,
            pink: 0xff6fae, cyan: 0x5fe0ff,
            ink: 0x0a1226,                 // outlines, shadows, icon outlines
            backdrop: 0x0b1533,
            panel: 0x1c2b4f, panelHi: 0x2f4677, panelDark: 0x131f3b, panelOutline: 0x0a1226,
            card: 0x25375f, cardHi: 0x2f4575, cardLocked: 0x1a2440,
            ribbon: 0xc8394a, ribbonDark: 0x8c2333,
            chip: 0x0d1730,
            white: 0xffffff, black: 0x000000,
            keyCap: 0xe8eefb, keyCapEdge: 0x8a9bbb,          // key hint chips
            track: 0x2a3654, trackOff: 0x3a4660,             // slider track, switch when off
            knobShade: 0xd5ddeb, scrollThumb: 0x8fa6d1,
            iconDisabled: 0x9aa3b2, lockBadge: 0xc9d2e3,
            ferrule: 0xd7dde8, clockFace: 0xf1f5ff, pin: 0xe04a4a, mapPaper: 0xe9d9a6   // icon details
        },
        text: {
            light: '#f1f5ff', dim: '#93a4c3', caps: '#a8bde0', dark: '#0a1226', white: '#ffffff', black: '#000000',
            off: '#9aa6bd',
            gold: '#ffc93c', pink: '#ff6fae', cyan: '#5fe0ff',
            go: '#6fe075', nav: '#7cb4ff', mode: '#ffbf5a', danger: '#ff7a7a', neutral: '#b6c2d9'
        },
        size: {
            title: 44, ribbon: 30, body: 17, small: 14, caps: 13, value: 22, mono: 18,
            header: 18, tab: 16, stat: 18, sliderValue: 16, switchText: 12, keyChip: 12, iconName: 10,
            cardLabel: 14, rowLabel: 17, cardSub: 13, rowRight: 16, toastTitle: 19, toastBody: 15
        },
        button: {
            lg: { h: 56, font: 24, minW: 240, r: 14, lip: 6, icon: 24, pad: 28 },
            md: { h: 46, font: 19, minW: 180, r: 12, lip: 5, icon: 20, pad: 22 },
            sm: { h: 36, font: 15, minW: 110, r: 10, lip: 4, icon: 16, pad: 16 }
        },
        radius: { panel: 14, card: 12, chip: 16, row: 12, tab: 11, list: 12, keyChip: 6 },
        touchMinHit: 44,
        depth: { menu: 2000, popup: 2010, toast: 2500 },
        time: {
            backdrop: 150, enter: 220, stagger: 25, leave: 120, fade: 150, pulse: 560,
            sink: 50, press: 90, bounce: 160, knob: 140, scroll: 160, deny: 45,
            toastIn: 320, toastOut: 200, toast: 3000, drift: 16000
        },
        lift: 2
    };

    const ICONS = ['star', 'starEmpty', 'coin', 'gem', 'gemEmpty', 'lock', 'trophy', 'gear', 'brush', 'clock',
        'bolt', 'infinity', 'sun', 'play', 'back', 'close', 'check', 'heart', 'map', 'crown', 'speaker', 'speakerOff'];

    // ---------- small helpers ----------

    const css = n => '#' + (n >>> 0).toString(16).padStart(6, '0').slice(-6);
    const isTouch = () => typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
    const sound = name => { if (typeof playSound === 'function') playSound(name); };
    const roleOf = name => theme.roles[name] || theme.roles.neutral;
    const textColor = c => {
        if (c === undefined || c === null) return theme.text.light;
        if (typeof c === 'number') return css(c);
        if (theme.text[c]) return theme.text[c];
        return c;
    };
    const numColor = c => {
        if (typeof c === 'number') return c;
        if (theme.color[c] !== undefined) return theme.color[c];
        if (theme.roles[c]) return theme.roles[c].base;
        if (typeof c === 'string' && c[0] === '#') return parseInt(c.slice(1), 16);
        return theme.color.white;
    };
    const shade = (c, f) => {      // f < 0 darkens, > 0 lightens
        const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
        const m = v => Math.max(0, Math.min(255, Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f)));
        return (m(r) << 16) | (m(g) << 8) | m(b);
    };
    const clampR = (r, w, h) => Math.max(0, Math.min(r, w / 2, h / 2));

    function textStyle(size, color, extra) {
        return Object.assign({
            fontFamily: theme.font, fontSize: size + 'px', fontStyle: 'bold',
            color: textColor(color), resolution: theme.textResolution
        }, extra || {});
    }

    // Sets scroll factor 0 on an object and everything inside it (input hit
    // tests on container children use the child's own scroll factor).
    function fix(obj) {
        if (!obj) return obj;
        if (obj.setScrollFactor) obj.setScrollFactor(0, 0);
        if (obj.list && obj.type === 'Container') obj.list.forEach(fix);
        return obj;
    }

    // A container whose add() also fixes the scroll factor of what is added
    function box(scene, x, y) {
        const c = scene.add.container(x, y);
        const add = c.add.bind(c);
        c.add = (child) => { add(child); (Array.isArray(child) ? child : [child]).forEach(fix); return c; };
        return c;
    }

    // ---------- icons ----------

    // A pen draws each shape twice: pass 0 is the dark outline (shapes grown
    // by `o`), pass 1 the colour. Details only draw in pass 1.
    function pen(g, s, color, pass) {
        const o = Math.max(1.2, s / 14), ink = theme.color.ink;
        const col = c => pass === 0 ? ink : (c === undefined ? color : c);
        const p = {
            o: o, pass: pass,
            poly(pts, c) {
                g.fillStyle(col(c), 1);
                g.fillPoints(pts, true);
                if (pass === 0) { g.lineStyle(o * 2, ink, 1); g.strokePoints(pts, true, true); }
            },
            circle(x, y, r, c) { g.fillStyle(col(c), 1); g.fillCircle(x, y, pass === 0 ? r + o : r); },
            rect(x, y, w, h, r, c) {
                const e = pass === 0 ? o : 0;
                g.fillStyle(col(c), 1);
                g.fillRoundedRect(x - e, y - e, w + 2 * e, h + 2 * e, clampR((r || 0) + e, w + 2 * e, h + 2 * e));
            },
            line(x1, y1, x2, y2, w, c) {
                const ww = pass === 0 ? w + 2 * o : w;
                g.lineStyle(ww, col(c), 1);
                g.lineBetween(x1, y1, x2, y2);
                g.fillStyle(col(c), 1);
                g.fillCircle(x1, y1, ww / 2);
                g.fillCircle(x2, y2, ww / 2);
            },
            polyline(pts, w, c) { for (let i = 0; i < pts.length - 1; i++) p.line(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, w, c); },
            arc(x, y, r, a1, a2, w, c) {
                const ww = pass === 0 ? w + 2 * o : w;
                g.lineStyle(ww, col(c), 1);
                g.beginPath(); g.arc(x, y, r, a1, a2, false); g.strokePath();
                g.fillStyle(col(c), 1);
                g.fillCircle(x + Math.cos(a1) * r, y + Math.sin(a1) * r, ww / 2);
                g.fillCircle(x + Math.cos(a2) * r, y + Math.sin(a2) * r, ww / 2);
            },
            ring(x, y, r, w, c) {
                g.lineStyle(pass === 0 ? w + 2 * o : w, col(c), 1);
                g.strokeCircle(x, y, r);
            },
            detail(fn) { if (pass === 1) fn(); }
        };
        return p;
    }

    const V = (x, y) => ({ x: x, y: y });
    function starPts(r, inner) {
        const pts = [];
        for (let i = 0; i < 10; i++) {
            const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 === 0 ? r : r * inner;
            pts.push(V(Math.cos(a) * rr, Math.sin(a) * rr + r * 0.06));
        }
        return pts;
    }
    function gemPts(r) {
        return [V(-0.5 * r, -0.62 * r), V(0.5 * r, -0.62 * r), V(0.95 * r, -0.15 * r), V(0, 0.9 * r), V(-0.95 * r, -0.15 * r)];
    }
    function heartPts(r) {
        const pts = [];
        for (let i = 0; i < 40; i++) {
            const t = i / 40 * Math.PI * 2;
            const x = 16 * Math.pow(Math.sin(t), 3);
            const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
            pts.push(V(x / 17 * r, (y + 1.5) / 17 * r));
        }
        return pts;
    }

    // Each icon: (pen, r = half size, color). Drawn centred on 0,0.
    const DRAW = {
        star(P, r) { P.poly(starPts(r, 0.5)); P.detail(() => P.poly(starPts(r * 0.42, 0.5).map(p => V(p.x - r * 0.12, p.y - r * 0.14)), shade(P.c, 0.45))); },
        starEmpty(P, r) {
            const pts = starPts(r * 0.9, 0.5);
            P.poly(pts, theme.color.ink);
            P.detail(() => { P.g.lineStyle(Math.max(1.5, r / 5), P.c, 1); P.g.strokePoints(pts, true, true); });
        },
        coin(P, r) {
            P.circle(0, 0, r);
            P.detail(() => {
                P.circle(0, 0, r * 0.7, shade(P.c, -0.18));
                P.g.fillStyle(shade(P.c, 0.35), 1);
                P.g.fillRoundedRect(-r * 0.13, -r * 0.42, r * 0.26, r * 0.84, r * 0.12);
            });
        },
        gem(P, r) {
            P.poly(gemPts(r));
            P.detail(() => {
                P.poly([V(-0.5 * r, -0.62 * r), V(0.5 * r, -0.62 * r), V(0.95 * r, -0.15 * r), V(-0.95 * r, -0.15 * r)], shade(P.c, 0.35));
                P.poly([V(-0.3 * r, -0.15 * r), V(0.3 * r, -0.15 * r), V(0, 0.9 * r)], shade(P.c, 0.15));
            });
        },
        gemEmpty(P, r) {
            const pts = gemPts(r * 0.9);
            P.poly(pts, theme.color.ink);
            P.detail(() => { P.g.lineStyle(Math.max(1.5, r / 5), P.c, 1); P.g.strokePoints(pts, true, true); });
        },
        lock(P, r) {
            P.arc(0, -0.2 * r, 0.42 * r, Math.PI, 0, r * 0.22);
            P.line(-0.42 * r, -0.2 * r, -0.42 * r, 0, r * 0.22);
            P.line(0.42 * r, -0.2 * r, 0.42 * r, 0, r * 0.22);
            P.rect(-0.75 * r, -0.08 * r, 1.5 * r, 1.0 * r, r * 0.2);
            P.detail(() => { P.circle(0, 0.32 * r, 0.15 * r, theme.color.ink); P.line(0, 0.35 * r, 0, 0.6 * r, r * 0.14, theme.color.ink); });
        },
        trophy(P, r) {
            P.arc(-0.55 * r, -0.4 * r, 0.3 * r, Math.PI * 0.5, Math.PI * 1.5, r * 0.16);
            P.arc(0.55 * r, -0.4 * r, 0.3 * r, -Math.PI * 0.5, Math.PI * 0.5, r * 0.16);
            P.poly([V(-0.65 * r, -0.85 * r), V(0.65 * r, -0.85 * r), V(0.5 * r, -0.05 * r), V(0.12 * r, 0.25 * r), V(-0.12 * r, 0.25 * r), V(-0.5 * r, -0.05 * r)]);
            P.rect(-0.14 * r, 0.2 * r, 0.28 * r, 0.4 * r, 0);
            P.rect(-0.55 * r, 0.55 * r, 1.1 * r, 0.32 * r, r * 0.08);
            P.detail(() => P.poly([V(-0.42 * r, -0.72 * r), V(-0.2 * r, -0.72 * r), V(-0.24 * r, -0.2 * r), V(-0.34 * r, -0.28 * r)], shade(P.c, 0.45)));
        },
        gear(P, r) {
            const pts = [], teeth = 8;
            for (let i = 0; i < teeth * 4; i++) {
                const a = (i / (teeth * 4)) * Math.PI * 2 - Math.PI / (teeth * 4) * 1.5;
                const rr = (i % 4 === 0 || i % 4 === 1) ? r : r * 0.74;
                pts.push(V(Math.cos(a) * rr, Math.sin(a) * rr));
            }
            P.poly(pts);
            P.detail(() => P.circle(0, 0, r * 0.3, theme.color.ink));
        },
        brush(P, r) {
            P.line(0.72 * r, -0.72 * r, 0.05 * r, -0.05 * r, r * 0.26, theme.color.goldDeep);
            P.poly([V(-0.05 * r, -0.25 * r), V(0.25 * r, 0.05 * r), V(-0.05 * r, 0.42 * r), V(-0.45 * r, 0.05 * r)], theme.color.ferrule);
            P.poly([V(-0.4 * r, 0.02 * r), V(0.0, 0.4 * r), V(-0.35 * r, 0.85 * r), V(-0.92 * r, 0.92 * r), V(-0.85 * r, 0.35 * r)]);
        },
        clock(P, r) {
            P.circle(0, 0, r);
            P.detail(() => {
                P.circle(0, 0, r * 0.78, theme.color.clockFace);
                P.line(0, 0, 0, -r * 0.5, r * 0.16, theme.color.ink);
                P.line(0, 0, r * 0.38, r * 0.1, r * 0.16, theme.color.ink);
            });
        },
        bolt(P, r) { P.poly([V(0.25 * r, -r), V(-0.6 * r, 0.12 * r), V(-0.05 * r, 0.12 * r), V(-0.3 * r, r), V(0.62 * r, -0.2 * r), V(0.06 * r, -0.2 * r)]); },
        infinity(P, r) {
            const pts = [];
            for (let i = 0; i <= 48; i++) {
                const t = i / 48 * Math.PI * 2, d = 1 + Math.sin(t) * Math.sin(t);
                pts.push(V(r * 0.95 * Math.cos(t) / d, r * 0.95 * Math.sin(t) * Math.cos(t) / d));
            }
            P.polyline(pts, r * 0.26);
        },
        sun(P, r) {
            for (let i = 0; i < 8; i++) {
                const a = i * Math.PI / 4;
                P.line(Math.cos(a) * r * 0.66, Math.sin(a) * r * 0.66, Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9, r * 0.2);
            }
            P.circle(0, 0, r * 0.48);
        },
        play(P, r) { P.poly([V(-0.5 * r, -0.75 * r), V(0.8 * r, 0), V(-0.5 * r, 0.75 * r)]); },
        back(P, r) { P.poly([V(-0.9 * r, 0), V(-0.1 * r, -0.75 * r), V(-0.1 * r, -0.3 * r), V(0.85 * r, -0.3 * r), V(0.85 * r, 0.3 * r), V(-0.1 * r, 0.3 * r), V(-0.1 * r, 0.75 * r)]); },
        close(P, r) { P.line(-0.6 * r, -0.6 * r, 0.6 * r, 0.6 * r, r * 0.34); P.line(0.6 * r, -0.6 * r, -0.6 * r, 0.6 * r, r * 0.34); },
        check(P, r) { P.polyline([V(-0.7 * r, 0.02 * r), V(-0.2 * r, 0.52 * r), V(0.72 * r, -0.5 * r)], r * 0.32); },
        heart(P, r) { P.poly(heartPts(r)); P.detail(() => P.circle(-0.42 * r, -0.3 * r, r * 0.16, shade(P.c, 0.5))); },
        map(P, r) {
            const t = -0.72 * r, b = 0.72 * r, xs = [-0.95, -0.32, 0.32, 0.95].map(v => v * r), d = 0.16 * r;
            P.poly([V(xs[0], t + d), V(xs[1], t - d), V(xs[2], t + d), V(xs[3], t - d), V(xs[3], b - d), V(xs[2], b + d), V(xs[1], b - d), V(xs[0], b + d)]);
            P.detail(() => {
                P.poly([V(xs[1], t - d), V(xs[2], t + d), V(xs[2], b + d), V(xs[1], b - d)], shade(P.c, -0.22));
                P.circle(0.1 * r, -0.12 * r, r * 0.3, theme.color.pin);
                P.poly([V(-0.12 * r, 0), V(0.32 * r, 0), V(0.1 * r, 0.45 * r)], theme.color.pin);
                P.circle(0.1 * r, -0.12 * r, r * 0.11, theme.color.white);
            });
        },
        crown(P, r) {
            P.poly([V(-0.9 * r, -0.35 * r), V(-0.45 * r, 0.05 * r), V(0, -0.65 * r), V(0.45 * r, 0.05 * r), V(0.9 * r, -0.35 * r), V(0.75 * r, 0.6 * r), V(-0.75 * r, 0.6 * r)]);
            P.circle(-0.9 * r, -0.42 * r, r * 0.14); P.circle(0, -0.72 * r, r * 0.14); P.circle(0.9 * r, -0.42 * r, r * 0.14);
            P.detail(() => P.rect(-0.75 * r, 0.38 * r, 1.5 * r, 0.22 * r, 0, shade(P.c, -0.2)));
        },
        speaker(P, r) {
            P.poly([V(-0.9 * r, -0.3 * r), V(-0.45 * r, -0.3 * r), V(0.1 * r, -0.8 * r), V(0.1 * r, 0.8 * r), V(-0.45 * r, 0.3 * r), V(-0.9 * r, 0.3 * r)]);
            if (!P.off) {
                P.arc(0.15 * r, 0, 0.42 * r, -Math.PI / 3.2, Math.PI / 3.2, r * 0.14);
                P.arc(0.15 * r, 0, 0.78 * r, -Math.PI / 3.2, Math.PI / 3.2, r * 0.14);
            }
        },
        speakerOff(P, r) {
            P.off = true; DRAW.speaker(P, r);
            P.line(0.42 * r, -0.32 * r, 0.95 * r, 0.32 * r, r * 0.17);
            P.line(0.95 * r, -0.32 * r, 0.42 * r, 0.32 * r, r * 0.17);
        }
    };
    const ICON_COLOR = { star: 'gold', starEmpty: 'gold', coin: 'gold', gem: 'pink', gemEmpty: 'pink', trophy: 'gold',
        crown: 'gold', clock: 'cyan', bolt: 'gold', sun: 'gold', heart: 'danger', map: 'mapPaper' };

    // Draws icon `name` into graphics g, centred on (x, y)
    function drawIcon(g, name, size, color, x, y) {
        const fn = DRAW[name] || DRAW.star;
        const c = numColor(color !== undefined ? color : (ICON_COLOR[name] !== undefined ? ICON_COLOR[name] : 'white'));
        const r = size / 2;
        for (let pass = 0; pass < 2; pass++) {
            g.save && g.save();
            g.translateCanvas && g.translateCanvas(x || 0, y || 0);
            const P = pen(g, size, c, pass);
            P.g = g; P.c = c;
            fn(P, r);
            g.restore && g.restore();
        }
    }

    // Icons are drawn once into a cached texture at twice their size (crisp
    // when the canvas is scaled up, and cheap to render every frame).
    function iconTexture(scene, name, size, color) {
        const key = 'uiicon_' + name + '_' + size + '_' + (color === undefined ? 'd' : String(color));
        if (!scene.textures.exists(key)) {
            const k = 2, box = Math.ceil(size * 1.5) * k;
            const g = scene.make.graphics({ add: false });
            drawIcon(g, name, size * k, color, box / 2, box / 2);
            g.generateTexture(key, box, box);
            g.destroy();
        }
        return key;
    }
    function makeIcon(scene, name, size, color) {
        size = size || 24;
        return scene.add.image(0, 0, iconTexture(scene, name, size, color)).setScale(0.5);
    }

    // ---------- shared textures (code-drawn, persist across restarts) ----------

    function ensureTextures(scene) {
        const tex = scene.textures;
        if (!tex.exists('ui_vignette')) {
            const ct = tex.createCanvas('ui_vignette', 533, 300);
            const ctx = ct.getContext();
            const grad = ctx.createRadialGradient(266, 150, 60, 266, 150, 330);
            const ink = theme.color.ink, rgba = a => `rgba(${ink >> 16 & 255},${ink >> 8 & 255},${ink & 255},${a})`;
            grad.addColorStop(0, rgba(0));
            grad.addColorStop(0.6, rgba(0.25));
            grad.addColorStop(1, rgba(0.75));
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 533, 300);
            ct.refresh();
        }
        if (!tex.exists('ui_pattern')) {
            const ct = tex.createCanvas('ui_pattern', 96, 96);
            const ctx = ct.getContext();
            ctx.fillStyle = css(theme.color.white);
            [[12, 14, 2], [60, 30, 1.5], [36, 70, 2], [82, 82, 1.5], [80, 8, 1]].forEach(d => {
                ctx.beginPath(); ctx.arc(d[0], d[1], d[2], 0, Math.PI * 2); ctx.fill();
            });
            // two tiny four-point stars
            [[48, 48, 5], [14, 86, 4]].forEach(st => {
                const [sx, sy, sr] = st;
                ctx.beginPath();
                ctx.moveTo(sx, sy - sr); ctx.lineTo(sx + sr * 0.3, sy - sr * 0.3); ctx.lineTo(sx + sr, sy);
                ctx.lineTo(sx + sr * 0.3, sy + sr * 0.3); ctx.lineTo(sx, sy + sr); ctx.lineTo(sx - sr * 0.3, sy + sr * 0.3);
                ctx.lineTo(sx - sr, sy); ctx.lineTo(sx - sr * 0.3, sy - sr * 0.3); ctx.closePath(); ctx.fill();
            });
            ct.refresh();
        }
    }

    // ---------- drawing primitives ----------

    function drawPanel(g, w, h, opts) {
        const R = theme.radius.panel, C = theme.color;
        const x = -w / 2, y = -h / 2;
        g.fillStyle(C.ink, 0.22); g.fillRoundedRect(x - 2, y + 6, w + 4, h + 6, R + 2);
        g.fillStyle(C.ink, 0.35); g.fillRoundedRect(x, y + 4, w, h + 2, R);
        g.fillStyle(C.panelOutline, 1); g.fillRoundedRect(x, y, w, h, R);
        const fill = opts.fill === 'dark' ? C.panelDark : C.panel;
        g.fillStyle(opts.fill === 'dark' ? shade(C.panelHi, -0.25) : C.panelHi, 1);
        g.fillRoundedRect(x + 3, y + 3, w - 6, h - 6, R - 2);
        g.fillStyle(fill, 1);
        g.fillRoundedRect(x + 3, y + 5, w - 6, h - 8, R - 2);
        if (opts.header) {
            const hc = opts.accent ? roleOf(opts.accent) : null;
            const hh = 40;
            g.fillStyle(hc ? hc.lip : C.panelDark, 1);
            g.fillRoundedRect(x + 3, y + 3, w - 6, hh, { tl: R - 2, tr: R - 2, bl: 0, br: 0 });
            g.fillStyle(hc ? hc.base : shade(C.panelDark, 0.08), 1);
            g.fillRoundedRect(x + 3, y + 3, w - 6, hh - 3, { tl: R - 2, tr: R - 2, bl: 0, br: 0 });
            g.fillStyle(theme.color.white, hc ? 0.18 : 0.06);
            g.fillRoundedRect(x + 3, y + 3, w - 6, 2, { tl: 1, tr: 1, bl: 0, br: 0 });
        }
    }

    // A key: lip below, face on top. Face is drawn in its own graphics so it can lift.
    function drawKeyLip(g, w, h, r, lip, rc) {
        g.clear();
        g.fillStyle(theme.color.ink, 0.3); g.fillRoundedRect(-w / 2 + 2, -h / 2 + lip + 3, w - 4, h, r);
        g.fillStyle(theme.color.ink, 1); g.fillRoundedRect(-w / 2 - 2, -h / 2 - 2 + lip, w + 4, h + 4, r + 2);
        g.fillStyle(rc.lip, 1); g.fillRoundedRect(-w / 2, -h / 2 + lip, w, h, r);
    }
    function drawKeyFace(g, w, h, r, rc, bright) {
        g.clear();
        g.fillStyle(theme.color.ink, 1); g.fillRoundedRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, r + 2);
        g.fillStyle(bright ? rc.light : rc.base, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
        g.fillStyle(theme.color.white, bright ? 0.24 : 0.17);
        g.fillRoundedRect(-w / 2 + 4, -h / 2 + 3, w - 8, Math.round(h * 0.4), { tl: Math.max(2, r - 3), tr: Math.max(2, r - 3), bl: 4, br: 4 });
    }
    function drawRing(g, w, h, r, pad) {
        g.clear();
        g.lineStyle(3, theme.color.gold, 1);
        g.strokeRoundedRect(-w / 2 - pad, -h / 2 - pad, w + pad * 2, h + pad * 2, r + pad);
    }

    // ---------- screen stack and global input ----------

    let stack = [];          // open screens, bottom first
    let toasts = [];
    let boundScene = null;
    let keyHandler = null;
    let shutdownHandler = null;

    function topScreen() { return stack.length ? stack[stack.length - 1] : null; }

    function syncUiCameraInput() {
        // The legacy 800px menu camera sits above the main camera, so it would
        // win clicks over a kit screen. Turn its input off under a modal screen.
        if (typeof uiCamera !== 'undefined' && uiCamera) {
            uiCamera.inputEnabled = !stack.some(s => s.modal);
        }
    }

    function onKeyDown(event) {
        const s = topScreen();
        if (s) s._handleKey(event);
    }

    function bindScene(scene) {
        if (boundScene === scene && keyHandler) return;
        unbindScene();
        boundScene = scene;
        keyHandler = onKeyDown;
        if (scene.input && scene.input.keyboard) scene.input.keyboard.on('keydown', keyHandler);
        shutdownHandler = () => resetAll(true);
        scene.events.once('shutdown', shutdownHandler);
        ensureTextures(scene);
    }
    function unbindScene() {
        if (boundScene) {
            try { if (boundScene.input && boundScene.input.keyboard && keyHandler) boundScene.input.keyboard.off('keydown', keyHandler); } catch (e) { /* scene gone */ }
            try { if (shutdownHandler) boundScene.events.off('shutdown', shutdownHandler); } catch (e) { /* scene gone */ }
        }
        boundScene = null; keyHandler = null; shutdownHandler = null;
    }
    function resetAll(fromShutdown) {
        stack.slice().reverse().forEach(s => s.destroy(true));
        stack = [];
        toasts.slice().forEach(t => t.close(true));
        toasts = [];
        if (fromShutdown) unbindScene();
    }

    // ---------- the screen ----------

    let screenCounter = 0;

    class Screen {
        constructor(scene, opts) {
            opts = opts || {};
            bindScene(scene);
            this.scene = scene;
            this.id = opts.id || ('screen' + (++screenCounter));
            this.depth = opts.depth !== undefined ? opts.depth : theme.depth.menu;
            this.modal = opts.modal !== false;
            this.onBackFn = opts.onBack || null;
            this.onKey = opts.onKey || null;
            this.enterStyle = opts.enter || 'slide';
            this.state = 'new';          // new | opening | open | closing | closed
            this.inputEnabled = false;
            this.objects = [];           // every top-level object owned by the screen
            this.focusables = [];        // focus records
            this.focused = null;
            this.lists = [];
            this._group = 0;             // rebuild group being built
            this._groups = 0;
            this._openedAt = 0;
            this._press = null;
            this._busy = false;
            this._hoverHidden = false;
            this._timers = [];
            this._listeners = [];
            this._updater = () => this._update();
            scene.events.on('postupdate', this._updater);

            if (this.modal) {
                const z = scene.add.zone(0, 0, VIEW_W, VIEW_H).setOrigin(0, 0);
                z.setInteractive();
                this._adopt(z, 0, { noAnim: true });
                this.blocker = z;
            }
            if (opts.backdrop) this._makeBackdrop(opts.backdrop);
        }

        // ----- object ownership -----

        _adopt(obj, layer, info) {
            obj.wideUI = true;
            fix(obj);
            if (obj.setDepth) obj.setDepth(this.depth + (layer || 0));
            obj._ui = Object.assign({ screen: this, group: this._group, layer: layer || 0 }, info || {});
            this.objects.push(obj);
            if (this.state === 'opening' || this.state === 'open') this._animateLate(obj);
            return obj;
        }

        add(obj, layer) { return this._adopt(obj, layer === undefined ? 3 : layer); }

        _later(ms, fn) {
            const t = this.scene.time.delayedCall(ms, () => {
                this._timers = this._timers.filter(x => x !== t);
                if (this.state !== 'closed') fn();
            });
            this._timers.push(t);
            return t;
        }

        _makeBackdrop(kind) {
            const scene = this.scene, C = theme.color;
            const g = scene.add.graphics();
            g.fillStyle(C.backdrop, kind === 'solid' ? 0.95 : 0.62);
            g.fillRect(0, 0, VIEW_W, VIEW_H);
            this._adopt(g, 0, { backdrop: true });
            const v = scene.add.image(0, 0, 'ui_vignette').setOrigin(0, 0).setDisplaySize(VIEW_W, VIEW_H);
            this._adopt(v, 0, { backdrop: true });
            if (kind === 'solid') {
                const t = scene.add.tileSprite(0, 0, VIEW_W, VIEW_H, 'ui_pattern').setOrigin(0, 0).setAlpha(0.07);
                this._adopt(t, 0, { backdrop: true, keepAlpha: true });
                this._pattern = t;
            }
        }

        // ----- focus records -----

        _register(obj, o) {
            const screen = this;
            const rec = {
                obj: obj,
                kind: o.kind || 'custom',
                label: o.label || '',
                enabled: o.enabled !== false,
                isDefault: !!o.default,
                onActivate: o.onActivate || null,
                onFocus: o.onFocus || null,
                onBlur: o.onBlur || null,
                onLeft: o.onLeft || null,
                onRight: o.onRight || null,
                look: o.look || null,           // (state) => void, state = { focused, pressed }
                bounce: o.bounce !== false,     // play the release bounce before acting
                list: o.list || null,
                group: this._group,
                get visible() {
                    for (let p = obj; p; p = p.parentContainer) if (!p.visible || !p.active) return false;
                    return !obj._uiHidden;
                },
                get x() { return screen._center(rec).x; },
                get y() { return screen._center(rec).y; }
            };
            obj._uiRec = rec;
            obj.uiLabel = rec.label;
            this.focusables.push(rec);
            if (!rec.look) {
                // custom object: the kit draws a ring around it
                rec.look = (st) => this._customRing(rec, st);
            }
            this._wirePointer(rec, o.hit || obj);
            if (this.state === 'open' && !this.focused) this._initialFocus();
            return rec;
        }

        focusable(obj, o) {
            o = o || {};
            if (!obj._ui) this.add(obj, 4);
            if (!obj.input && obj.setInteractive) {
                try { obj.setInteractive(); } catch (e) { /* no size */ }
            }
            return this._register(obj, Object.assign({ kind: 'custom', bounce: false }, o));
        }

        _center(rec) {
            const o = rec.obj;
            if (o._uiCenter) return o._uiCenter();
            if (o.getWorldTransformMatrix && o.type === 'Container') {
                const m = o.getWorldTransformMatrix();
                return { x: m.tx, y: m.ty };
            }
            const b = o.getBounds();
            return { x: b.centerX, y: b.centerY };
        }

        _customRing(rec, st) {
            if (!rec._ring) {
                rec._ring = this.scene.add.graphics();
                this._adopt(rec._ring, 6, { noAnim: true });
            }
            const g = rec._ring;
            g.clear();
            if (st.focused) {
                const b = rec.obj.getBounds();
                g.lineStyle(3, theme.color.gold, 1);
                g.strokeRoundedRect(b.x - 5, b.y - 5, b.width + 10, b.height + 10, 10);
                this._pulse(rec, g, true);
            } else {
                this._pulse(rec, g, false);
            }
        }

        _pulse(rec, ring, on) {
            if (rec._pulseTween) { rec._pulseTween.stop(); rec._pulseTween = null; }
            ring.setAlpha(on ? 1 : 0);
            if (on && theme.motion) {
                rec._pulseTween = this.scene.tweens.add({
                    targets: ring, alpha: 0.62, duration: theme.time.pulse, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
                });
            }
        }

        _wirePointer(rec, hit) {
            const screen = this;
            if (!hit || !hit.on) return;
            const ok = (p) => screen._acceptsPointer() && screen._inClip(rec, p);
            hit.on('pointerover', (p) => {
                if (!ok(p)) return;
                screen._hoverHidden = false;
                screen.setFocus(rec, { source: 'pointer' });
            });
            hit.on('pointerdown', (p) => {
                if (!ok(p)) return;
                screen.setFocus(rec, { source: 'pointer', silent: screen.focused === rec });
                screen._press = rec;
                screen._look(rec, { pressed: true });
            });
            hit.on('pointerout', () => {
                if (screen._press === rec) { screen._press = null; screen._look(rec); }
            });
            hit.on('pointerup', (p) => {
                if (screen._press !== rec) return;
                screen._press = null;
                if (!ok(p)) { screen._look(rec); return; }
                screen._activate(rec);
                if (p && p.wasTouch && screen._focusSource === 'pointer') {
                    // no hover look stuck on a touch screen
                    screen._hoverHidden = true;
                    screen._look(rec);
                }
            });
        }

        _inClip(rec, p) {
            if (!rec.list || !p) return true;
            const c = rec.list._clip();
            return p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y && p.y <= c.y + c.h;
        }

        _acceptsPointer() {
            return this.state === 'open' && this.inputEnabled && topScreen() === this && !this._busy;
        }

        _look(rec, extra) {
            if (!rec || !rec.look) return;
            const focused = rec === this.focused && !this._hoverHidden;
            rec.look(Object.assign({ focused: focused, pressed: false, enabled: rec.enabled }, extra || {}), rec);
        }

        setFocus(target, o) {
            o = o || {};
            const rec = target && (target._uiRec || (target.record && target.record._uiRec ? target.record : null) || target.record || target);
            if (!rec || this.focusables.indexOf(rec) === -1) return;
            const prev = this.focused;
            this._focusSource = o.source || 'key';
            if (prev === rec) { this._look(rec); return; }
            this.focused = rec;
            if (prev) { this._look(prev); if (prev.onBlur) prev.onBlur(); }
            this._look(rec);
            if (rec.list) rec.list._ensureVisible(rec);
            if (rec.onFocus) rec.onFocus();
            if (!o.silent && this.state === 'open') sound('menuHover');
        }

        _initialFocus() {
            const vis = this.focusables.filter(r => r.visible);
            const pick = vis.find(r => r.isDefault) || vis.find(r => r.enabled) || vis[0];
            if (pick) this.setFocus(pick, { silent: true });
        }

        // ----- keyboard -----

        _handleKey(event) {
            if (this.state !== 'open' || !this.inputEnabled || this._busy) return;
            // a key pressed before this screen opened (e.g. the Esc that opened it)
            if (event.timeStamp && event.timeStamp < this._openedAt) return;
            if (this.onKey && this.onKey(event)) return;
            const k = event.key;
            const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[k];
            if (dir) {
                if (event.preventDefault) event.preventDefault();
                this._hoverHidden = false;
                const f = this.focused;
                if (f && f.visible) {
                    if (dir[0] < 0 && f.onLeft && f.onLeft() !== false) return;
                    if (dir[0] > 0 && f.onRight && f.onRight() !== false) return;
                }
                this._move(dir[0], dir[1]);
                return;
            }
            if (event.repeat) return;
            if (k === ' ' || k === 'Enter' || k === 'Spacebar') {
                if (event.preventDefault) event.preventDefault();
                if (this.focused && this.focused.visible) {
                    this._hoverHidden = false;
                    this._activate(this.focused, { key: true });
                }
                return;
            }
            if (k === 'Escape' || k === 'Esc') {
                if (this.onBackFn) { sound('menuClick'); this.onBackFn(); }
            }
        }

        onBack() { if (this.onBackFn) this.onBackFn(); }

        _candidates(from) {
            return this.focusables.filter(r => {
                if (r === from || !r.visible) return false;
                // rows scrolled out of view are only reached from inside the list
                if (r.list && !r.list._rowInView(r) && (!from || from.list !== r.list)) return false;
                return true;
            });
        }

        _move(dx, dy) {
            const cur = this.focused;
            if (!cur || !cur.visible) { this._initialFocus(); return; }
            const c = this._center(cur);
            const cands = this._candidates(cur);
            let best = null, bestScore = Infinity;
            cands.forEach(r => {
                const p = this._center(r), vx = p.x - c.x, vy = p.y - c.y;
                const along = vx * dx + vy * dy, ortho = Math.abs(vx * dy - vy * dx);
                if (along <= 4) return;
                const score = along + ortho * (ortho > along ? 4 : 2);
                if (score < bestScore) { bestScore = score; best = r; }
            });
            if (!best) {
                // wrap: the item on the far side, as level with this one as possible
                cands.forEach(r => {
                    const p = this._center(r), vx = p.x - c.x, vy = p.y - c.y;
                    const along = vx * dx + vy * dy, ortho = Math.abs(vx * dy - vy * dx);
                    if (along >= -4) return;
                    const score = ortho * 3 + along * 0.25;   // along is negative: farther wins
                    if (score < bestScore) { bestScore = score; best = r; }
                });
            }
            if (best) this.setFocus(best);
        }

        // ----- activation -----

        _activate(rec, o) {
            o = o || {};
            if (this._busy || this.state !== 'open') return;
            if (!rec.enabled) {
                this._look(rec);
                this._deny(rec);
                return;
            }
            sound('menuClick');
            const run = () => {
                this._busy = false;
                if (this.state === 'closed') return;
                this._look(rec);
                if (rec.onActivate) rec.onActivate();
            };
            if (theme.motion && rec.bounce) {
                this._busy = true;
                this._look(rec, { pressed: true });
                this._later(theme.time.sink, () => {
                    this._look(rec, { bounce: true });
                    this._later(theme.time.press, run);
                });
            } else {
                run();
            }
        }

        _deny(rec) {
            const o = rec.obj;
            if (!theme.motion || o._denying) return;
            o._denying = true;
            const x0 = o.x;
            this.scene.tweens.add({
                targets: o, x: x0 + 5, duration: theme.time.deny, yoyo: true, repeat: 2, ease: 'Sine.easeInOut',
                onComplete: () => { o.x = x0; o._denying = false; }
            });
        }

        // ----- lifecycle -----

        open() {
            if (this.state !== 'new') return this;
            stack.push(this);
            syncUiCameraInput();
            this.state = 'opening';
            this._openedAt = (typeof performance !== 'undefined') ? performance.now() : 0;
            this._opener = null;
            const below = stack[stack.length - 2];
            if (below) {
                this._opener = below.focused;
                if (below._press) { below._press = null; }
                // one highlight on screen: the covered screen hides its focus look
                below._hoverHidden = true;
                if (below.focused) below._look(below.focused);
            }
            this._initialFocus();
            const total = this._animateIn();
            const done = () => {
                if (this.state !== 'opening') return;
                this.state = 'open';
                this.inputEnabled = true;
                if (!this.focused) this._initialFocus();
                else this._look(this.focused);
            };
            if (total > 0) this._later(total, done); else done();
            return this;
        }

        _restPose(o) {
            if (!o._uiRest) o._uiRest = { x: o.x, y: o.y, alpha: o.alpha, sx: o.scaleX, sy: o.scaleY };
            return o._uiRest;
        }

        _animateIn() {
            if (!theme.motion) return 0;
            const T = theme.time, tw = this.scene.tweens;
            let end = 0, n = 0;
            const pop = this.enterStyle === 'pop', fade = this.enterStyle === 'fade';
            const centre = this._popCentre();
            this.objects.forEach(o => {
                if (o._ui.noAnim) return;
                const rest = this._restPose(o);
                if (o._ui.backdrop) {
                    o.setAlpha(0);
                    tw.add({ targets: o, alpha: rest.alpha, duration: T.backdrop });
                    end = Math.max(end, T.backdrop);
                    return;
                }
                const isCtl = o._ui.layer >= 4 && o._uiRec;
                const delay = isCtl ? Math.min(240, 60 + (n++) * T.stagger) : 0;
                o.setAlpha(0);
                const to = { alpha: rest.alpha };
                if (pop) {
                    o.x = centre.x + (rest.x - centre.x) * 0.9; o.y = centre.y + (rest.y - centre.y) * 0.9;
                    o.setScale(rest.sx * 0.9, rest.sy * 0.9);
                    Object.assign(to, { x: rest.x, y: rest.y, scaleX: rest.sx, scaleY: rest.sy });
                } else if (!fade) {
                    o.y = rest.y + 24;
                    to.y = rest.y;
                }
                tw.add(Object.assign({
                    targets: o, duration: T.enter, delay: delay,
                    ease: fade ? 'Quad.easeOut' : 'Back.easeOut', easeParams: fade ? undefined : [1.3]
                }, to));
                end = Math.max(end, delay + T.enter);
            });
            if (this._pattern) this._driftPattern();
            return end;
        }

        _driftPattern() {
            if (!theme.motion || !this._pattern) return;
            this.scene.tweens.add({ targets: this._pattern, tilePositionX: 96, tilePositionY: -96, duration: theme.time.drift, repeat: -1 });
        }

        _popCentre() {
            const p = this.objects.find(o => o._ui.panel);
            return p ? { x: p.x, y: p.y } : { x: VIEW_W / 2, y: VIEW_H / 2 };
        }

        _animateLate(o) {
            if (!theme.motion || o._ui.noAnim) return;
            const rest = this._restPose(o);
            o.setAlpha(0);
            const to = { alpha: rest.alpha };
            if (!o._ui.backdrop && !o._ui.fadeOnly) { o.y = rest.y + 12; to.y = rest.y; }
            this.scene.tweens.add(Object.assign({ targets: o, duration: theme.time.enter, ease: 'Back.easeOut', easeParams: [1.3] }, to));
        }

        close(cb) {
            if (this.state === 'closing' || this.state === 'closed') return;
            if (this.state === 'new') { this.destroy(); if (cb) cb(); return; }
            this.state = 'closing';
            this.inputEnabled = false;
            const finish = () => {
                this.destroy();
                if (cb) cb();
            };
            if (!theme.motion) { finish(); return; }
            const T = theme.time, tw = this.scene.tweens;
            const pop = this.enterStyle === 'pop';
            this.objects.forEach(o => {
                if (!o.active || o._ui.noAnim) return;
                tw.killTweensOf(o);
                const to = { alpha: 0 };
                if (!o._ui.backdrop) {
                    if (pop) { to.scaleX = o.scaleX * 0.94; to.scaleY = o.scaleY * 0.94; } else to.y = o.y + 12;
                }
                tw.add(Object.assign({ targets: o, duration: T.leave, ease: 'Quad.easeIn' }, to));
            });
            // blocker and rings vanish with the rest
            this.objects.forEach(o => { if (o._ui.noAnim && o !== this.blocker && o.setAlpha) o.setAlpha(0); });
            this._timers.push(this.scene.time.delayedCall(T.leave, finish));
        }

        destroy(silent) {
            if (this.state === 'closed') return;
            const wasOpen = this.state !== 'new';
            this.state = 'closed';
            this.inputEnabled = false;
            const scene = this.scene;
            try { scene.events.off('postupdate', this._updater); } catch (e) { /* scene gone */ }
            this._timers.forEach(t => { try { t.remove(false); } catch (e) { /* gone */ } });
            this._timers = [];
            this._listeners.forEach(l => { try { l.target.off(l.event, l.fn); } catch (e) { /* gone */ } });
            this._listeners = [];
            this.focusables.forEach(r => { if (r._pulseTween) { r._pulseTween.stop(); r._pulseTween = null; } });
            this.lists.forEach(l => l._destroyMask());
            this.objects.forEach(o => {
                try { if (scene.tweens) scene.tweens.killTweensOf(o); } catch (e) { /* gone */ }
                if (o.destroy && o.active !== false) o.destroy();
            });
            this.objects = [];
            const idx = stack.indexOf(this);
            if (idx !== -1) stack.splice(idx, 1);
            syncUiCameraInput();
            if (wasOpen && !silent) {
                // a held Space / Up must not jump on the first gameplay frame
                if (typeof wasJumpPressed !== 'undefined') wasJumpPressed = true;
                const top = topScreen();
                if (top && idx === stack.length) {
                    // focus goes back to the item that opened this screen
                    top._hoverHidden = false;
                    if (this._opener && top.focusables.indexOf(this._opener) !== -1 && this._opener.visible) {
                        top.setFocus(this._opener, { silent: true });
                    } else if (top.focused) top._look(top.focused);
                }
            }
        }

        _update() {
            this.lists.forEach(l => l._sync());
        }

        // Replace the content made by the previous rebuild(fn) with a cross-fade
        rebuild(fn) {
            const oldGroup = this._lastGroup || 0;
            const old = oldGroup ? this.objects.filter(o => o._ui.group === oldGroup) : [];
            const oldFocused = this.focused;
            const keepLabel = oldFocused && oldFocused.group === oldGroup && oldGroup ? oldFocused.label : null;
            const keepKind = oldFocused ? oldFocused.kind : null;
            // drop the old group's records now so focus cannot land on them
            const oldRecs = this.focusables.filter(r => oldGroup && r.group === oldGroup);
            oldRecs.forEach(r => { if (r._pulseTween) { r._pulseTween.stop(); r._pulseTween = null; } });
            this.focusables = this.focusables.filter(r => oldRecs.indexOf(r) === -1);
            this.lists = this.lists.filter(l => {
                if (oldGroup && l.group === oldGroup) { l._destroyMask(); return false; }
                return true;
            });
            if (oldRecs.indexOf(this.focused) !== -1) this.focused = null;

            const g = ++this._groups;
            this._group = g;
            const live = this.state === 'opening' || this.state === 'open';
            const prevState = this.state;
            if (live) this.state = 'rebuilding';     // suppress the per-object late animation
            try { fn(); } finally { if (live) this.state = prevState; this._group = 0; }
            // later builder calls belong to the permanent set again, but the
            // next rebuild replaces group g
            this._group = 0;
            this._lastGroup = g;
            const fresh = this.objects.filter(o => o._ui.group === g);

            const T = theme.time;
            this.objects = this.objects.filter(o => old.indexOf(o) === -1);
            if (live && theme.motion) {
                old.forEach(o => {
                    if (!o.active) return;
                    this.scene.tweens.killTweensOf(o);
                    this.scene.tweens.add({ targets: o, alpha: 0, duration: T.fade, onComplete: () => o.destroy() });
                });
                fresh.forEach(o => {
                    if (o._ui.noAnim) return;
                    const a = this._restPose(o).alpha;
                    o.setAlpha(0);
                    this.scene.tweens.add({ targets: o, alpha: a, duration: T.fade, delay: 60 });
                });
            } else {
                old.forEach(o => { if (o.active) o.destroy(); });
            }
            if (!this.focused || this.focusables.indexOf(this.focused) === -1) {
                const freshRecs = this.focusables.filter(r => r.group === g && r.visible);
                const pick = (keepLabel && freshRecs.find(r => r.label === keepLabel && r.kind === keepKind)) ||
                    freshRecs.find(r => r.isDefault) || freshRecs.find(r => r.enabled) || null;
                this.focused = null;
                if (pick) this.setFocus(pick, { silent: true });
                else this._initialFocus();
            }
            return this;
        }

        // The group id rebuild() gives new objects: objects made by later
        // builder calls inside fn join it.
        get _currentGroup() { return this._group; }

        // ----- builders -----

        panel(x, y, w, h, o) {
            o = o || {};
            const c = box(this.scene, x, y);
            // static, so it is drawn once into a cached texture
            const key = ['uipanel', w, h, o.fill || '', o.header ? (o.accent || 'plain') : ''].join('_');
            const padX = 4, padT = 4, tw = Math.ceil(w + padX * 2), th = Math.ceil(h + padT + 16);
            if (!this.scene.textures.exists(key)) {
                const g = this.scene.make.graphics({ add: false });
                g.translateCanvas(tw / 2, padT + h / 2);
                drawPanel(g, w, h, o);
                g.generateTexture(key, tw, th);
                g.destroy();
            }
            const img = this.scene.add.image(0, 0, key).setOrigin(0.5, (padT + h / 2) / th);
            c.add(img);
            if (o.header) {
                const t = this.scene.add.text(0, -h / 2 + 23, String(o.header).toUpperCase(),
                    textStyle(theme.size.header, 'light', { stroke: css(theme.color.ink), strokeThickness: 4 })).setOrigin(0.5);
                if (t.setLetterSpacing) t.setLetterSpacing(1.5);
                c.add(t);
            }
            c.setSize(w, h);
            c.panelW = w; c.panelH = h;
            return this._adopt(c, 1, { panel: true });
        }

        title(x, y, text, o) {
            o = o || {};
            const scene = this.scene, C = theme.color;
            const c = box(scene, x, y);
            const size = o.size || (o.ribbon ? theme.size.ribbon : theme.size.title);
            const t = scene.add.text(0, 0, text, textStyle(size, 'gold', {
                stroke: css(C.ink), strokeThickness: Math.round(size / 5),
                shadow: { offsetX: 0, offsetY: 4, color: theme.text.black, blur: 0, fill: true, stroke: true }
            })).setOrigin(0.5, 0.5);
            if (t.setLetterSpacing) t.setLetterSpacing(o.ribbon ? 2 : 1);
            let rib = null;
            const drawRibbon = () => {
                if (!rib) return;
                const w = Math.max(220, t.width + 90), h = size + 26, tail = 34, drop = 9;
                rib.clear();
                const L = -w / 2, R = w / 2, T = -h / 2, B = h / 2;
                const tails = (sx) => {
                    const xo = sx < 0 ? L : R, xe = xo + sx * tail;
                    return [V(xo - sx * 6, T + drop), V(xe + sx * 10, T + drop), V(xe - sx * 2, (T + B) / 2 + drop),
                        V(xe + sx * 10, B + drop), V(xo - sx * 6, B + drop)];
                };
                [-1, 1].forEach(sx => {
                    rib.fillStyle(C.ink, 1); rib.fillPoints(tails(sx).map(p => V(p.x + sx * 2, p.y + 2)), true);
                    rib.fillStyle(C.ribbonDark, 1); rib.fillPoints(tails(sx), true);
                    rib.fillStyle(shade(C.ribbonDark, -0.35), 1);
                    const xo = sx < 0 ? L : R;
                    rib.fillPoints([V(xo, B), V(xo - sx * 10, B + drop), V(xo, B + drop)], true);
                });
                rib.fillStyle(C.ink, 1); rib.fillRoundedRect(L - 3, T - 3, w + 6, h + 6, 10);
                rib.fillStyle(C.ribbon, 1); rib.fillRoundedRect(L, T, w, h, 8);
                rib.fillStyle(theme.color.white, 0.16); rib.fillRoundedRect(L + 4, T + 3, w - 8, h * 0.38, { tl: 6, tr: 6, bl: 3, br: 3 });
                rib.fillStyle(shade(C.ribbon, -0.25), 1); rib.fillRect(L + 4, B - 6, w - 8, 3);
            };
            if (o.ribbon) { rib = scene.add.graphics(); c.add(rib); drawRibbon(); t.y = -2; }
            c.add(t);
            c.text = t;
            c.setText = (s) => { t.setText(s); drawRibbon(); return c; };
            return this._adopt(c, 3);
        }

        label(x, y, text, o) {
            o = o || {};
            const st = o.style || 'body';
            const size = o.size || theme.size[st] || theme.size.body;
            const defColor = { body: 'light', small: 'dim', caps: 'caps', value: 'gold', mono: 'cyan' }[st];
            const extra = {};
            if (st === 'mono') extra.fontFamily = theme.fontMono;
            if (st === 'value' || o.outline) { extra.stroke = css(theme.color.ink); extra.strokeThickness = 4; }
            if (o.wrap) { extra.wordWrap = { width: o.wrap, useAdvancedWrap: true }; extra.align = o.align || 'center'; }
            if (st === 'body' || st === 'small') extra.fontStyle = o.bold === false ? 'normal' : 'bold';
            const t = this.scene.add.text(x, y, st === 'caps' ? String(text).toUpperCase() : text,
                textStyle(size, o.color || defColor, extra));
            if (st === 'caps' && t.setLetterSpacing) t.setLetterSpacing(1.5);
            const ax = { left: 0, center: 0.5, right: 1 }[o.align || 'center'];
            t.setOrigin(ax, 0.5);
            return this._adopt(t, 3);
        }

        icon(x, y, name, size, color) {
            const g = makeIcon(this.scene, name, size || 24, color);
            g.setPosition(x, y);
            return this._adopt(g, 3);
        }

        stat(x, y, iconName, text, o) {
            o = o || {};
            const scene = this.scene, C = theme.color;
            const c = box(scene, x, y);
            const bg = scene.add.graphics();
            const ic = makeIcon(scene, iconName, 20, o.iconColor);
            const t = scene.add.text(0, 0, String(text), textStyle(theme.size.stat, o.color || 'light',
                o.mono ? { fontFamily: theme.fontMono } : {})).setOrigin(0, 0.5);
            c.add([bg, ic, t]);
            const layout = () => {
                const w = 14 + 22 + 8 + t.width + 14, h = 32;
                const ox = o.align === 'left' ? w / 2 : (o.align === 'right' ? -w / 2 : 0);
                bg.x = ox; ic.x = 0;
                bg.clear();
                bg.fillStyle(C.ink, 0.9); bg.fillRoundedRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, theme.radius.chip + 2);
                bg.fillStyle(C.chip, 1); bg.fillRoundedRect(-w / 2, -h / 2, w, h, theme.radius.chip);
                bg.fillStyle(theme.color.white, 0.07); bg.fillRoundedRect(-w / 2 + 3, -h / 2 + 2, w - 6, 10, { tl: 10, tr: 10, bl: 3, br: 3 });
                ic.setPosition(ox - w / 2 + 14 + 11, 0);
                t.setPosition(ox - w / 2 + 14 + 22 + 8, 0);
                c.setSize(w, h);
            };
            layout();
            c.setText = (s) => { t.setText(String(s)); layout(); return c; };
            c.text = t;
            return this._adopt(c, 3);
        }

        hintBar(items) {
            const scene = this.scene, C = theme.color;
            const c = box(scene, VIEW_W / 2, VIEW_H - 18);
            const bg = scene.add.graphics();
            bg.fillStyle(C.ink, 0.72); bg.fillRect(-VIEW_W / 2, -18, VIEW_W, 36);
            bg.fillStyle(theme.color.white, 0.06); bg.fillRect(-VIEW_W / 2, -18, VIEW_W, 1);
            c.add(bg);
            const parts = [];
            if (typeof items === 'string') {
                parts.push(scene.add.text(0, 0, items, textStyle(theme.size.small, 'dim')).setOrigin(0, 0.5));
            } else {
                (items || []).forEach(([key, label]) => {
                    const kt = scene.add.text(0, 0, key, textStyle(theme.size.keyChip, 'dark')).setOrigin(0.5);
                    const kw = Math.max(26, kt.width + 14), kr = theme.radius.keyChip;
                    const kg = scene.add.graphics();
                    kg.fillStyle(C.keyCapEdge, 1); kg.fillRoundedRect(-kw / 2, -10, kw, 22, kr);
                    kg.fillStyle(C.keyCap, 1); kg.fillRoundedRect(-kw / 2, -11, kw, 20, kr);
                    const chip = scene.add.container(0, 0, [kg, kt]);
                    chip.chipW = kw;
                    kt.y = -1;
                    const lt = scene.add.text(0, 0, label, textStyle(theme.size.small, 'dim')).setOrigin(0, 0.5);
                    parts.push(chip, lt);
                });
            }
            let total = 0;
            const widths = parts.map((p, i) => {
                const w = p.chipW || p.width;
                const gap = p.chipW ? 7 : (i < parts.length - 1 ? 22 : 0);
                total += w + gap;
                return [w, gap];
            });
            let px = -total / 2;
            parts.forEach((p, i) => {
                const [w, gap] = widths[i];
                p.x = p.chipW ? px + w / 2 : px;
                px += w + gap;
                c.add(p);
            });
            return this._adopt(c, 5);
        }

        button(x, y, text, o) {
            o = o || {};
            const scene = this.scene;
            const S = theme.button[o.size || 'md'] || theme.button.md;
            const c = box(scene, x, y);
            const lipG = scene.add.graphics();
            const top = scene.add.container(0, 0);
            const face = scene.add.graphics();
            const ring = scene.add.graphics().setAlpha(0);
            const label = scene.add.text(0, 0, text, textStyle(S.font, 'light', {
                stroke: theme.text.black, strokeThickness: 3
            })).setOrigin(0.5, 0.5);
            let ic = null;
            top.add([face, label]);
            c.add([lipG, top, ring]);
            let roleName = o.role || 'go';
            let enabled = o.enabled !== false;
            let iconName = o.locked ? 'lock' : o.icon;
            let w = 0;
            const h = S.h;
            const st = { focused: false, pressed: false, bounce: false };

            const rc = () => enabled ? roleOf(roleName) : theme.roles.disabled;
            const layout = () => {
                if (ic) { ic.destroy(); ic = null; }
                const iconW = iconName ? S.icon + 8 : 0;
                w = o.width || Math.max(S.minW, Math.ceil(label.width) + S.pad * 2 + iconW);
                if (iconName) {
                    ic = makeIcon(scene, iconName, S.icon, enabled ? (o.iconColor !== undefined ? o.iconColor : theme.color.white) : theme.color.iconDisabled);
                    top.add(ic);
                    fix(ic);
                }
                const groupW = iconW + label.width;
                if (ic) ic.setPosition(-groupW / 2 + S.icon / 2, 0);
                label.setPosition(-groupW / 2 + iconW + label.width / 2, -1);
                label.setColor(rc().text);
                label.setStroke(rc().ink, 4);
                drawKeyLip(lipG, w, h, S.r, S.lip, rc());
                drawRing(ring, w, h + S.lip, S.r, 4);
                ring.y = S.lip / 2;
                const hitH = Math.max(h + S.lip, isTouch() ? theme.touchMinHit : 0);
                c.setSize(w + 4, hitH);
                if (c.input && c.input.hitArea) {
                    c.input.hitArea.setTo(0, 0, w + 4, hitH);
                }
                paint();
            };
            const paint = () => {
                const bright = st.focused && enabled;
                drawKeyFace(face, w, h, S.r, rc(), bright || st.pressed && enabled);
                let ty = 0;
                if (st.pressed) ty = S.lip - 1;
                else if (st.focused && enabled) ty = -theme.lift;
                scene.tweens.killTweensOf(top);
                if (st.bounce && theme.motion) {
                    top.y = S.lip - 1;
                    scene.tweens.add({ targets: top, y: st.focused ? -theme.lift : 0, duration: theme.time.bounce, ease: 'Back.easeOut', easeParams: [3] });
                } else top.y = ty;
                ring.y = S.lip / 2 + (st.focused && enabled && !st.pressed ? -theme.lift / 2 : 0);
            };
            c._uiCenter = () => { const m = c.getWorldTransformMatrix(); return { x: m.tx, y: m.ty }; };
            layout();
            c.setInteractive({ useHandCursor: true });
            this._adopt(c, 4);
            const rec = this._register(c, {
                kind: 'button', label: text, enabled: enabled, default: o.default,
                onActivate: () => { if (o.onClick) o.onClick(c); },
                look: (s, r) => {
                    st.focused = s.focused; st.pressed = s.pressed; st.bounce = !!s.bounce;
                    paint();
                    this._pulse(r, ring, s.focused);
                }
            });
            c.record = rec;
            c.setLabel = (s) => { label.setText(s); rec.label = s; c.uiLabel = s; layout(); return c; };
            c.setRole = (r) => { roleName = r; layout(); return c; };
            c.setEnabled = (b) => { enabled = b !== false; rec.enabled = enabled; if (o.locked && enabled) iconName = o.icon; layout(); return c; };
            const setVis = c.setVisible.bind(c);
            c.setVisible = (v) => {
                setVis(v);
                if (!v && this.focused === rec) { this.focused = null; this._move(0, 1); if (!this.focused) this._initialFocus(); }
                return c;
            };
            c.label = label;
            return c;
        }

        iconButton(x, y, iconName, o) {
            o = o || {};
            const scene = this.scene;
            const d = o.size || 44, r = d / 2, lip = 4;
            const c = box(scene, x, y);
            const lipG = scene.add.graphics(), top = scene.add.container(0, 0), face = scene.add.graphics(), ring = scene.add.graphics().setAlpha(0);
            const rc = o.enabled === false ? theme.roles.disabled : roleOf(o.role || 'neutral');
            const ic = makeIcon(scene, iconName, Math.round(d * 0.46), o.enabled === false ? theme.color.iconDisabled
                : (o.iconColor !== undefined ? o.iconColor : theme.color.white));
            top.add([face, ic]);
            c.add([lipG, top, ring]);
            lipG.fillStyle(theme.color.ink, 0.3); lipG.fillCircle(0, lip + 3, r);
            lipG.fillStyle(theme.color.ink, 1); lipG.fillCircle(0, lip, r + 2);
            lipG.fillStyle(rc.lip, 1); lipG.fillCircle(0, lip, r);
            const st = { focused: false, pressed: false };
            const paint = (bounce) => {
                face.clear();
                face.fillStyle(theme.color.ink, 1); face.fillCircle(0, 0, r + 2);
                face.fillStyle(st.focused || st.pressed ? rc.light : rc.base, 1); face.fillCircle(0, 0, r);
                face.fillStyle(theme.color.white, 0.2); face.fillEllipse(0, -r * 0.45, r * 1.3, r * 0.6);
                scene.tweens.killTweensOf(top);
                const ty = st.pressed ? lip - 1 : (st.focused ? -theme.lift : 0);
                if (bounce && theme.motion) {
                    top.y = lip - 1;
                    scene.tweens.add({ targets: top, y: st.focused ? -theme.lift : 0, duration: theme.time.bounce, ease: 'Back.easeOut', easeParams: [3] });
                } else top.y = ty;
                ring.clear(); ring.lineStyle(3, theme.color.gold, 1); ring.strokeCircle(0, lip / 2 - (st.focused ? 1 : 0), r + 6);
            };
            paint();
            const hit = Math.max(d + lip, isTouch() ? theme.touchMinHit : 0);
            c.setSize(hit, hit);
            c.setInteractive({ useHandCursor: true });
            c._uiCenter = () => { const m = c.getWorldTransformMatrix(); return { x: m.tx, y: m.ty }; };
            this._adopt(c, 4);
            const rec = this._register(c, {
                kind: 'iconButton', label: o.label || iconName, default: o.default, enabled: o.enabled !== false,
                onActivate: () => { if (o.onClick) o.onClick(c); },
                look: (s, r) => { st.focused = s.focused; st.pressed = s.pressed; paint(s.bounce); this._pulse(r, ring, s.focused); }
            });
            c.record = rec;
            return c;
        }

        toggle(x, y, labelText, value, onChange, o) {
            o = o || {};
            const scene = this.scene, C = theme.color;
            const w = o.width || 300, h = 44;
            const c = box(scene, x, y);
            const bg = scene.add.graphics(), sw = scene.add.graphics(), knob = scene.add.graphics(), ring = scene.add.graphics().setAlpha(0);
            const t = scene.add.text(-w / 2 + 16, 0, labelText, textStyle(theme.size.body, 'light')).setOrigin(0, 0.5);
            const stateT = scene.add.text(0, 0, '', textStyle(theme.size.switchText, 'light')).setOrigin(0.5);
            c.add([bg, t, sw, stateT, knob, ring]);
            const SW = 60, SH = 30, sx = w / 2 - 16 - SW / 2;
            let val = !!value;
            const st = { focused: false };
            const paint = (animate) => {
                bg.clear();
                bg.fillStyle(st.focused ? C.cardHi : C.card, st.focused ? 1 : 0.75);
                bg.fillRoundedRect(-w / 2, -h / 2, w, h, theme.radius.row);
                sw.clear();
                sw.fillStyle(C.ink, 1); sw.fillRoundedRect(sx - SW / 2 - 2, -SH / 2 - 2, SW + 4, SH + 4, SH / 2 + 2);
                sw.fillStyle(val ? theme.roles.go.base : C.trackOff, 1); sw.fillRoundedRect(sx - SW / 2, -SH / 2, SW, SH, SH / 2);
                sw.fillStyle(C.ink, 0.25); sw.fillRoundedRect(sx - SW / 2 + 2, -SH / 2 + 2, SW - 4, 6, 3);
                stateT.setText(val ? 'ON' : 'OFF');
                stateT.setPosition(val ? sx - SW / 2 + 17 : sx + SW / 2 - 18, 0);
                stateT.setColor(val ? theme.text.white : theme.text.off);
                const kx = val ? sx + SW / 2 - SH / 2 : sx - SW / 2 + SH / 2;
                knob.clear();
                knob.fillStyle(C.ink, 1); knob.fillCircle(0, 0, SH / 2 - 1);
                knob.fillStyle(C.white, 1); knob.fillCircle(0, 0, SH / 2 - 3);
                knob.fillStyle(C.knobShade, 1); knob.fillCircle(0, 2, SH / 2 - 7);
                knob.fillStyle(C.white, 1); knob.fillCircle(0, 0, SH / 2 - 7);
                scene.tweens.killTweensOf(knob);
                if (animate && theme.motion) scene.tweens.add({ targets: knob, x: kx, duration: theme.time.knob, ease: 'Back.easeOut' });
                else knob.x = kx;
                ring.clear(); ring.lineStyle(3, C.gold, 1); ring.strokeRoundedRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, 15);
            };
            paint(false);
            c.setSize(w, Math.max(h, isTouch() ? theme.touchMinHit : 0));
            c.setInteractive({ useHandCursor: true });
            c._uiCenter = () => { const m = c.getWorldTransformMatrix(); return { x: m.tx, y: m.ty }; };
            this._adopt(c, 4);
            const rec = this._register(c, {
                kind: 'toggle', label: labelText, bounce: false, default: o.default,
                onActivate: () => { val = !val; paint(true); if (onChange) onChange(val); },
                look: (s, r) => { st.focused = s.focused; paint(false); this._pulse(r, ring, s.focused); }
            });
            c.record = rec;
            Object.defineProperty(c, 'value', { get: () => val });
            c.setValue = (v) => { val = !!v; paint(false); return c; };
            return c;
        }

        slider(x, y, w, value01, onChange, o) {
            o = o || {};
            const scene = this.scene, C = theme.color;
            const c = box(scene, x, y);
            const track = scene.add.graphics(), handle = scene.add.container(0, 0), hg = scene.add.graphics(), ring = scene.add.graphics().setAlpha(0);
            handle.add([hg, ring]);
            const valT = o.showValue === false ? null :
                scene.add.text(w / 2 + 16, 0, '', textStyle(theme.size.sliderValue, 'light')).setOrigin(0, 0.5);
            const H = 12, HR = 13;
            let val = Math.max(0, Math.min(1, value01 || 0));
            const st = { focused: false, dragging: false };
            const items = [track, handle];
            if (valT) items.push(valT);
            c.add(items);
            const paint = () => {
                track.clear();
                track.fillStyle(C.ink, 1); track.fillRoundedRect(-w / 2 - 2, -H / 2 - 2, w + 4, H + 4, H / 2 + 2);
                track.fillStyle(C.track, 1); track.fillRoundedRect(-w / 2, -H / 2, w, H, H / 2);
                const fw = Math.max(H, w * val);
                track.fillStyle(theme.roles.nav.base, 1); track.fillRoundedRect(-w / 2, -H / 2, fw, H, H / 2);
                track.fillStyle(theme.color.white, 0.22); track.fillRoundedRect(-w / 2 + 3, -H / 2 + 2, Math.max(0, fw - 6), 3, 1.5);
                handle.x = -w / 2 + w * val;
                hg.clear();
                hg.fillStyle(C.ink, 0.35); hg.fillCircle(0, 3, HR + 1);
                hg.fillStyle(C.ink, 1); hg.fillCircle(0, 0, HR + 2);
                hg.fillStyle(st.focused ? C.white : C.keyCap, 1); hg.fillCircle(0, 0, HR);
                hg.fillStyle(theme.roles.nav.base, 1); hg.fillCircle(0, 0, 4);
                ring.clear(); ring.lineStyle(3, C.gold, 1); ring.strokeCircle(0, 0, HR + 6);
                if (valT) valT.setText(Math.round(val * 100) + '%');
                handle.setScale(st.focused ? 1.12 : 1);
            };
            const set = (v, fire) => {
                v = Math.max(0, Math.min(1, Math.round(v * 100) / 100));
                if (v === val) return;
                val = v; paint();
                if (fire && onChange) onChange(val);
            };
            paint();
            // hit area: the whole track plus the handle
            const hitH = Math.max(HR * 2 + 8, isTouch() ? theme.touchMinHit : 0);
            const hitW = w + HR * 2 + 8;
            c.setSize(hitW, hitH);
            c.setInteractive({ useHandCursor: true, draggable: true });
            c._uiCenter = () => { const m = c.getWorldTransformMatrix(); return { x: m.tx, y: m.ty }; };
            const fromPointer = (p) => {
                const m = c.getWorldTransformMatrix();
                set((p.x - (m.tx - w / 2)) / w, true);
            };
            c.on('pointerdown', (p) => { if (this._acceptsPointer()) { st.dragging = true; fromPointer(p); } });
            c.on('drag', (p) => { if (st.dragging && this._acceptsPointer()) fromPointer(p); });
            c.on('dragend', () => { st.dragging = false; });
            c.on('pointerup', () => { st.dragging = false; });
            this._adopt(c, 4);
            const rec = this._register(c, {
                kind: 'slider', label: o.label || 'Slider', bounce: false, default: o.default,
                onActivate: null,
                onLeft: () => { set(val - 0.05, true); sound('menuHover'); return true; },
                onRight: () => { set(val + 0.05, true); sound('menuHover'); return true; },
                look: (s, r) => { st.focused = s.focused; paint(); this._pulse(r, ring, s.focused); }
            });
            c.record = rec;
            Object.defineProperty(c, 'value', { get: () => val });
            c.setValue = (v) => { set(v, false); return c; };
            return c;
        }

        tabs(x, y, labels, activeIndex, onChange, o) {
            o = o || {};
            const scene = this.scene, C = theme.color;
            const c = box(scene, x, y);
            const bg = scene.add.graphics(), ring = scene.add.graphics().setAlpha(0);
            c.add(bg);
            const texts = labels.map(l => scene.add.text(0, 0, l, textStyle(theme.size.tab, 'light')).setOrigin(0.5));
            const TW = Math.max(...texts.map(t => t.width)) + 36, H = 38, gap = 6, padX = 5;
            const total = labels.length * TW + (labels.length - 1) * gap + padX * 2;
            const zones = [];
            let idx = Math.max(0, Math.min(labels.length - 1, activeIndex || 0));
            const st = { focused: false };
            texts.forEach((t, i) => {
                t.x = -total / 2 + padX + i * (TW + gap) + TW / 2;
                c.add(t);
                const z = scene.add.zone(t.x, 0, TW, Math.max(H, isTouch() ? theme.touchMinHit : 0));
                z.setInteractive({ useHandCursor: true });
                z.uiLabel = labels[i];
                zones.push(z);
                c.add(z);
            });
            c.add(ring);
            const paint = () => {
                bg.clear();
                bg.fillStyle(C.ink, 1); bg.fillRoundedRect(-total / 2 - 2, -H / 2 - 7, total + 4, H + 14, 16);
                bg.fillStyle(C.panelDark, 1); bg.fillRoundedRect(-total / 2, -H / 2 - 5, total, H + 10, 14);
                texts.forEach((t, i) => {
                    const tx = t.x - TW / 2;
                    if (i === idx) {
                        const rc = roleOf('nav');
                        bg.fillStyle(rc.lip, 1); bg.fillRoundedRect(tx, -H / 2 + 3, TW, H - 2, theme.radius.tab);
                        bg.fillStyle(st.focused ? rc.light : rc.base, 1); bg.fillRoundedRect(tx, -H / 2, TW, H - 3, theme.radius.tab);
                        bg.fillStyle(theme.color.white, 0.18); bg.fillRoundedRect(tx + 4, -H / 2 + 2, TW - 8, 10, { tl: 8, tr: 8, bl: 3, br: 3 });
                        t.setColor(theme.text.white); t.setStroke(rc.ink, 4); t.y = -2;
                    } else {
                        t.setColor(theme.text.dim); t.setStroke(theme.text.black, 0); t.y = 0;
                    }
                });
                const ax = texts[idx].x;
                ring.clear(); ring.lineStyle(3, C.gold, 1); ring.strokeRoundedRect(ax - TW / 2 - 4, -H / 2 - 4, TW + 8, H + 6, 14);
            };
            paint();
            c.setSize(total, H + 10);
            c._uiCenter = () => { const m = c.getWorldTransformMatrix(); return { x: m.tx, y: m.ty }; };
            this._adopt(c, 4);
            const change = (i, fire) => {
                i = (i + labels.length) % labels.length;
                if (i === idx) return;
                idx = i; paint();
                if (fire && onChange) onChange(idx);
            };
            const rec = this._register(c, {
                kind: 'tabs', label: o.label || labels.join(' / '), bounce: false, default: o.default, hit: null,
                onActivate: null,
                onLeft: () => { change(idx - 1, true); sound('menuClick'); return true; },
                onRight: () => { change(idx + 1, true); sound('menuClick'); return true; },
                look: (s, r) => { st.focused = s.focused; paint(); this._pulse(r, ring, s.focused); }
            });
            zones.forEach((z, i) => {
                z.on('pointerover', () => { if (this._acceptsPointer()) { this._hoverHidden = false; this.setFocus(rec, { source: 'pointer' }); } });
                z.on('pointerup', (p) => {
                    if (!this._acceptsPointer()) return;
                    if (i !== idx) { sound('menuClick'); change(i, true); }
                    if (p && p.wasTouch) { this._hoverHidden = true; this._look(rec); }
                });
            });
            c.record = rec;
            Object.defineProperty(c, 'index', { get: () => idx });
            c.setActive = (i) => { change(i, false); return c; };
            return c;
        }

        _buildCard(c, w, h, o, layer) {
            const scene = this.scene, C = theme.color;
            const bg = scene.add.graphics(), ring = scene.add.graphics().setAlpha(0), badge = scene.add.graphics();
            const content = scene.add.container(0, 0);
            c.add([bg, content, badge, ring]);
            let state = o.state || 'normal';
            let enabled = o.enabled !== undefined ? o.enabled !== false : state !== 'locked';
            const st = { focused: false, pressed: false };
            const R = Math.min(theme.radius.card, h / 2 - 2);
            const paint = (bounce) => {
                const locked = state === 'locked', sel = state === 'selected', owned = state === 'owned';
                const lift = st.pressed ? 1 : (st.focused && !locked ? -theme.lift : 0);
                bg.clear();
                bg.fillStyle(C.ink, 0.35); bg.fillRoundedRect(-w / 2, -h / 2 + 4, w, h, R);
                bg.fillStyle(sel ? theme.roles.go.lip : C.ink, 1);
                bg.fillRoundedRect(-w / 2 - 2, -h / 2 - 2 + lift, w + 4, h + 4, R + 2);
                const fill = locked ? C.cardLocked : (st.focused ? C.cardHi : C.card);
                bg.fillStyle(sel ? theme.roles.go.base : shade(fill, 0.12), 1);
                bg.fillRoundedRect(-w / 2, -h / 2 + lift, w, h, R);
                bg.fillStyle(fill, 1);
                const inset = sel ? 3 : 0;
                bg.fillRoundedRect(-w / 2 + inset, -h / 2 + 2 + lift + inset, w - inset * 2, h - 2 - inset * 2, Math.max(2, R - inset));
                content.y = lift;
                content.setAlpha(locked ? 0.45 : 1);
                badge.clear();
                badge.y = lift;
                const bx = w / 2 - 12, by = -h / 2 + 12;
                if (sel || owned) {
                    badge.fillStyle(C.ink, 1); badge.fillCircle(bx, by, 11);
                    badge.fillStyle(sel ? theme.roles.go.base : C.gold, 1); badge.fillCircle(bx, by, 9);
                    drawIcon(badge, 'check', 11, C.white, bx, by);
                } else if (locked) {
                    badge.fillStyle(C.ink, 1); badge.fillCircle(bx, by, 11);
                    badge.fillStyle(C.trackOff, 1); badge.fillCircle(bx, by, 9);
                    drawIcon(badge, 'lock', 11, C.lockBadge, bx, by + 0.5);
                }
                ring.clear(); ring.y = lift;
                ring.lineStyle(3, C.gold, 1); ring.strokeRoundedRect(-w / 2 - 5, -h / 2 - 5, w + 10, h + 10, R + 5);
                if (bounce && theme.motion) {
                    [content, badge, ring].forEach(t => {
                        t.y = 1;
                        scene.tweens.add({ targets: t, y: lift, duration: theme.time.bounce, ease: 'Back.easeOut', easeParams: [3] });
                    });
                }
            };
            if (o.icon) {
                const hasText = !!o.label;
                const ic = makeIcon(scene, o.icon, Math.min(34, h * 0.42), o.iconColor);
                ic.setPosition(o.layout === 'row' ? -w / 2 + 28 : 0, o.layout === 'row' ? 0 : (hasText ? -h * 0.14 : 0));
                content.add(ic);
            }
            if (o.label) {
                const row = o.layout === 'row';
                const lx = row ? -w / 2 + (o.icon ? 54 : 16) : 0;
                const ly = row ? (o.sub ? -9 : 0) : (o.icon ? h * 0.26 : (o.sub ? -9 : 0));
                const lt = scene.add.text(lx, ly, o.label, textStyle(row ? theme.size.rowLabel : theme.size.cardLabel, 'light')).setOrigin(row ? 0 : 0.5, 0.5);
                content.add(lt);
                c.labelText = lt;
                if (o.sub) {
                    const sy = row ? 10 : ly + 18;
                    content.add(scene.add.text(lx, sy, o.sub, textStyle(theme.size.cardSub, 'dim')).setOrigin(row ? 0 : 0.5, 0.5));
                }
            }
            if (o.right !== undefined) {
                const rt = scene.add.text(w / 2 - 16, 0, String(o.right), textStyle(theme.size.rowRight, o.rightColor || 'gold',
                    o.rightMono ? { fontFamily: theme.fontMono } : {})).setOrigin(1, 0.5);
                content.add(rt);
                c.rightText = rt;
            }
            paint();
            c.setSize(w, Math.max(h, isTouch() ? theme.touchMinHit : 0));
            c.setInteractive({ useHandCursor: true });
            c._uiCenter = () => { const m = c.getWorldTransformMatrix(); return { x: m.tx, y: m.ty }; };
            const cadd = c.add;
            c.add = (child) => { content.add(child); (Array.isArray(child) ? child : [child]).forEach(fix); return c; };
            c._addRaw = cadd;
            c.content = content;
            const info = { c, paint, st, get state() { return state; }, setState: (s) => { state = s; paint(); },
                get enabled() { return enabled; }, setEnabled: (b) => { enabled = b; } };
            const rec = {
                kind: 'card', label: o.label || 'card', default: o.default,
                onActivate: () => { if (o.onClick) o.onClick(c); },
                look: (s) => { st.focused = s.focused; st.pressed = s.pressed; paint(s.bounce); }
            };
            return { info, rec, ring };
        }

        card(x, y, w, h, o) {
            o = o || {};
            const c = box(this.scene, x, y);
            const { info, rec, ring } = this._buildCard(c, w, h, o);
            this._adopt(c, 4);
            const look = rec.look;
            rec.look = (s, rr) => { look(s); this._pulse(rr, ring, s.focused); };
            const r = this._register(c, Object.assign(rec, { enabled: info.enabled }));
            this._finishCard(c, r, info);
            return c;
        }

        _finishCard(c, r, info) {
            c.record = r;
            c.setState = (s) => {
                info.setState(s);
                if (s === 'locked') r.enabled = false; else if (!r._forcedEnabled) r.enabled = true;
                return c;
            };
            c.setEnabled = (b) => { r.enabled = b !== false; r._forcedEnabled = true; return c; };
            Object.defineProperty(c, 'state', { get: () => info.state });
        }

        scrollList(x, y, w, h, o) {
            o = o || {};
            const scene = this.scene, C = theme.color, screen = this;
            const rowH = o.rowHeight || 52, gap = o.gap !== undefined ? o.gap : 8, pad = 8, barW = 8;
            const c = box(scene, x, y);
            const bg = scene.add.graphics();
            bg.fillStyle(C.ink, 1); bg.fillRoundedRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, theme.radius.list + 2);
            bg.fillStyle(C.panelDark, 1); bg.fillRoundedRect(-w / 2, -h / 2, w, h, theme.radius.list);
            const content = scene.add.container(0, 0);
            const bar = scene.add.graphics();
            c.add([bg, content, bar]);
            const maskG = scene.make.graphics({ add: false });
            maskG.setScrollFactor(0, 0);
            const mask = maskG.createGeometryMask();
            content.setMask(mask);
            this._adopt(c, 4, {});
            const rows = [];
            let scroll = 0, target = 0, contentH = pad;
            const rowW = w - pad * 2 - barW - 6;
            const list = {
                group: this._group,
                container: c,
                rows: rows,
                _clip() {
                    const m = c.getWorldTransformMatrix();
                    return { x: m.tx - w / 2, y: m.ty - h / 2, w: w, h: h };
                },
                _maxScroll() { return Math.max(0, contentH - h); },
                _rowInView(rec) {
                    const card = rec.obj;
                    const top = card.y - card._rowH / 2 - scroll, bot = card.y + card._rowH / 2 - scroll;
                    return bot > -h / 2 + 2 && top < h / 2 - 2;
                },
                _apply() {
                    content.y = -scroll;
                    rows.forEach(card => {
                        const top = card.y - card._rowH / 2 - scroll, bot = card.y + card._rowH / 2 - scroll;
                        const vis = bot > -h / 2 + 4 && top < h / 2 - 4;
                        if (card.input) card.input.enabled = vis;
                    });
                    bar.clear();
                    const max = this._maxScroll();
                    if (max > 0) {
                        const bx = w / 2 - pad - barW / 2 - 1, th = h - pad * 2;
                        const thumb = Math.max(28, th * h / contentH), ty = -h / 2 + pad + (th - thumb) * (scroll / max);
                        bar.fillStyle(theme.color.black, 0.35); bar.fillRoundedRect(bx - barW / 2, -h / 2 + pad, barW, th, barW / 2);
                        bar.fillStyle(C.scrollThumb, 1); bar.fillRoundedRect(bx - barW / 2, ty, barW, thumb, barW / 2);
                    }
                },
                _sync() {
                    const cl = this._clip();
                    maskG.clear();
                    maskG.fillStyle(theme.color.white, 1);
                    maskG.fillRect(cl.x + 2, cl.y + 2, cl.w - 4, cl.h - 4);
                },
                _scrollTo(v, animate) {
                    target = Math.max(0, Math.min(this._maxScroll(), v));
                    scene.tweens.killTweensOf(proxy);
                    if (animate && theme.motion) {
                        proxy.v = scroll;
                        scene.tweens.add({ targets: proxy, v: target, duration: theme.time.scroll, ease: 'Quad.easeOut',
                            onUpdate: () => { scroll = proxy.v; this._apply(); } });
                    } else { scroll = target; this._apply(); }
                },
                _ensureVisible(rec) {
                    const card = rec.obj;
                    const top = card.y - card._rowH / 2, bot = card.y + card._rowH / 2;
                    const viewTop = target - h / 2 + pad, viewBot = target + h / 2 - pad;
                    if (top < viewTop) this._scrollTo(target - (viewTop - top), true);
                    else if (bot > viewBot) this._scrollTo(target + (bot - viewBot), true);
                },
                _destroyMask() { try { content.clearMask(); maskG.destroy(); } catch (e) { /* gone */ } },
                addCard(rh, co) {
                    co = co || {};
                    const card = scene.add.container(-w / 2 + pad + rowW / 2, -h / 2 + contentH + rh / 2);
                    card._rowH = rh;
                    content.add(card);
                    const { info, rec, ring } = screen._buildCard(card, rowW, rh, Object.assign({ layout: 'row' }, co));
                    fix(card);
                    card._uiCenter = () => {
                        const m = card.getWorldTransformMatrix();
                        return { x: m.tx, y: m.ty };
                    };
                    const look = rec.look;
                    rec.look = (s, rr) => { look(s); screen._pulse(rr, ring, s.focused); };
                    const r = screen._register(card, Object.assign(rec, { enabled: info.enabled, list: list }));
                    screen._finishCard(card, r, info);
                    rows.push(card);
                    contentH += rh + gap;
                    this._apply();
                    if (screen.state === 'open' && theme.motion) {
                        card.setAlpha(0);
                        scene.tweens.add({ targets: card, alpha: 1, duration: theme.time.fade });
                    }
                    return card;
                },
                addRow(label, ro) { return this.addCard(rowH, Object.assign({ label: label }, ro || {})); },
                clear() {
                    rows.forEach(card => {
                        const r = card._uiRec;
                        if (r && r._pulseTween) r._pulseTween.stop();
                        screen.focusables = screen.focusables.filter(f => f !== r);
                        if (screen.focused === r) screen.focused = null;
                        card.destroy();
                    });
                    rows.length = 0; contentH = pad; scroll = target = 0; this._apply();
                },
                scrollToRow(i) { if (rows[i]) this._ensureVisible(rows[i]._uiRec); }
            };
            const proxy = { v: 0 };
            c.list_ = list;
            Object.assign(c, {
                addRow: list.addRow.bind(list), addCard: list.addCard.bind(list),
                clear: list.clear.bind(list), scrollToRow: list.scrollToRow.bind(list), rows: rows
            });
            const onWheel = (p, over, dx, dy) => {
                if (!screen._acceptsPointer()) return;
                const cl = list._clip();
                if (p.x < cl.x || p.x > cl.x + cl.w || p.y < cl.y || p.y > cl.y + cl.h) return;
                list._scrollTo(target + dy * 0.6, true);
            };
            scene.input.on('wheel', onWheel);
            this._listeners.push({ target: scene.input, event: 'wheel', fn: onWheel });
            this.lists.push(list);
            list._sync();
            list._apply();
            return c;
        }
    }

    // ---------- toast ----------

    function toast(scene, o) {
        o = o || {};
        bindScene(scene);
        const C = theme.color;
        const w = o.width || 470;
        const pos = o.position === 'bottom' ? 'bottom' : 'top';
        const c = scene.add.container(VIEW_W / 2, 0);
        c.wideUI = true;
        const g = scene.add.graphics();
        const accent = o.accent ? numColor(o.accent) : C.gold;
        const ic = scene.add.graphics();
        const tx = -w / 2 + 70;
        const title = scene.add.text(tx, 0, o.title || '', textStyle(theme.size.toastTitle, 'gold', { stroke: css(C.ink), strokeThickness: 4 })).setOrigin(0, 0);
        const body = o.body ? scene.add.text(tx, 0, o.body, textStyle(theme.size.toastBody, 'light', {
            fontStyle: 'bold', wordWrap: { width: w - 90 - (o.key ? 70 : 0), useAdvancedWrap: true }
        })).setOrigin(0, 0) : null;
        const h = Math.max(70, 18 + title.height + (body ? body.height + 4 : 0) + 16);
        title.y = -h / 2 + 15;
        if (body) body.y = title.y + title.height + 3;
        g.fillStyle(C.ink, 0.35); g.fillRoundedRect(-w / 2, -h / 2 + 5, w, h, 14);
        g.fillStyle(C.ink, 1); g.fillRoundedRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6, 16);
        g.fillStyle(C.panelHi, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
        g.fillStyle(C.panel, 1); g.fillRoundedRect(-w / 2, -h / 2 + 2, w, h - 2, 14);
        g.fillStyle(accent, 1); g.fillRoundedRect(-w / 2, -h / 2, 8, h, { tl: 14, tr: 0, bl: 14, br: 0 });
        ic.fillStyle(C.ink, 1); ic.fillCircle(-w / 2 + 38, 0, 24);
        ic.fillStyle(shade(accent, -0.55), 1); ic.fillCircle(-w / 2 + 38, 0, 21);
        drawIcon(ic, o.icon || 'star', 26, o.iconColor !== undefined ? o.iconColor : accent, -w / 2 + 38, 0);
        const parts = [g, ic, title];
        if (body) parts.push(body);
        if (o.key) {
            const kt = scene.add.text(w / 2 - 44, -1, o.key, textStyle(theme.size.keyChip + 1, 'dark')).setOrigin(0.5);
            const kw = Math.max(34, kt.width + 16), kr = theme.radius.keyChip + 1;
            const kg = scene.add.graphics();
            kg.fillStyle(C.keyCapEdge, 1); kg.fillRoundedRect(w / 2 - 44 - kw / 2, -12, kw, 26, kr);
            kg.fillStyle(C.keyCap, 1); kg.fillRoundedRect(w / 2 - 44 - kw / 2, -13, kw, 23, kr);
            parts.push(kg, kt);
        }
        c.add(parts);
        fix(c);
        c.setDepth(o.depth !== undefined ? o.depth : theme.depth.toast);
        const restY = pos === 'top' ? 16 + h / 2 : VIEW_H - 16 - h / 2;
        const offY = pos === 'top' ? -h / 2 - 20 : VIEW_H + h / 2 + 20;
        let closed = false, timer = null;
        const t = {
            container: c,
            close(now) {
                if (closed) return;
                closed = true;
                toasts = toasts.filter(x => x !== t);
                if (timer) { try { timer.remove(false); } catch (e) { /* gone */ } }
                const kill = () => { if (c.active) c.destroy(); };
                if (now || !theme.motion || !c.active) { kill(); return; }
                scene.tweens.killTweensOf(c);
                scene.tweens.add({ targets: c, y: offY, alpha: 0, duration: theme.time.toastOut, ease: 'Quad.easeIn', onComplete: kill });
            }
        };
        if (theme.motion) {
            c.y = offY;
            scene.tweens.add({ targets: c, y: restY, duration: theme.time.toastIn, ease: 'Back.easeOut', easeParams: [1.4] });
        } else c.y = restY;
        const dur = o.duration === undefined ? theme.time.toast : o.duration;
        if (dur > 0) timer = scene.time.delayedCall(dur, () => t.close());
        toasts.push(t);
        return t;
    }

    // ---------- style sheet ----------

    function showStyleSheet(scene) {
        const D = theme.depth.menu;
        const s = new Screen(scene, {
            id: 'uikit', depth: D, backdrop: 'solid',
            onBack: () => s.close(() => { if (typeof showMainMenu === 'function') showMainMenu(scene); })
        });
        const status = (msg) => statusLabel.setText(msg);
        s.title(VIEW_W / 2, 38, 'UI KIT', { ribbon: true });
        const statusLabel = s.label(VIEW_W - 24, 38, 'Style sheet', { style: 'small', align: 'right' });
        s.label(24, 38, 'storybook arcade', { style: 'caps', align: 'left' });

        // column A: buttons
        const AX = 188;
        s.panel(AX, 318, 340, 470, { header: 'Buttons', accent: 'go' });
        s.button(AX, 160, 'Play', { role: 'go', size: 'lg', icon: 'play', default: true, onClick: () => status('Play') });
        s.button(AX - 82, 224, 'Map', { role: 'nav', size: 'sm', icon: 'map', width: 140, onClick: () => status('Map') });
        s.button(AX + 82, 224, 'Speedrun', { role: 'mode', size: 'sm', icon: 'bolt', width: 140, onClick: () => status('Speedrun') });
        s.button(AX - 82, 272, 'Quit', { role: 'danger', size: 'sm', width: 140, onClick: () => status('Quit') });
        s.button(AX + 82, 272, 'Locked', { role: 'go', size: 'sm', locked: true, enabled: false, width: 140, onClick: () => status('should not run') });
        s.button(AX, 326, 'Settings', { role: 'neutral', size: 'md', icon: 'gear', width: 304, onClick: () => status('Settings') });
        s.button(AX, 380, 'Back', { role: 'neutral', size: 'sm', icon: 'back', onClick: () => s.onBack() });
        s.label(AX, 416, 'icon buttons', { style: 'caps' });
        [['close', 'Close', 'neutral'], ['gear', 'Gear', 'neutral'], ['speaker', 'Speaker', 'nav'], ['heart', 'Heart', 'danger'], ['trophy', 'Trophy', 'mode']]
            .forEach(([ic, lab, rl], i) => s.iconButton(AX - 112 + i * 56, 450, ic, { label: lab, role: rl, onClick: () => status(lab) }));
        s.button(AX - 82, 512, 'Popup', { role: 'nav', size: 'sm', width: 140, onClick: () => openPopup() });
        s.button(AX + 82, 512, 'Toast', { role: 'mode', size: 'sm', width: 140,
            onClick: () => UI.toast(scene, { icon: 'trophy', title: 'Achievement unlocked', body: 'Combo King: reach a 10x combo in one level.', key: 'NEW' }) });

        // column B: controls
        const BX = 533;
        s.panel(BX, 318, 330, 470, { header: 'Controls', accent: 'nav' });
        s.tabs(BX, 154, ['Colors', 'Trails', 'Hats'], 0, (i) => status('Tab ' + i));
        s.toggle(BX, 206, 'Mute All', false, (v) => status('Mute ' + v), { width: 290 });
        s.toggle(BX, 256, 'Colorblind', true, (v) => status('Colorblind ' + v), { width: 290 });
        s.label(BX - 145, 292, 'Music', { style: 'caps', align: 'left' });
        s.slider(BX - 20, 314, 220, 0.6, (v) => status('Music ' + Math.round(v * 100)), { label: 'Music' });
        s.label(BX - 145, 342, 'Sound', { style: 'caps', align: 'left' });
        s.slider(BX - 20, 364, 220, 0.85, (v) => status('Sound ' + Math.round(v * 100)), { label: 'Sound' });
        const cardDefs = [['normal', 'brush', 'Paint'], ['selected', 'crown', 'Crown'], ['owned', 'star', 'Star'], ['locked', 'heart', '500']];
        const cards = cardDefs.map(([state, ic, lab], i) => s.card(BX - 111 + i * 74, 422, 64, 66, {
            icon: ic, label: lab, state: state, onClick: (c) => {
                cards.forEach(k => { if (k.state === 'selected') k.setState('owned'); });
                c.setState('selected');
                status('Card ' + lab);
            }
        }));
        s.stat(BX - 145, 488, 'coin', '1840', { color: 'gold', align: 'left' });
        s.stat(BX + 145, 488, 'star', '24 / 72', { color: 'gold', align: 'right' });
        s.stat(BX - 145, 528, 'gem', '7', { color: 'pink', align: 'left' });
        s.stat(BX + 145, 528, 'clock', '1:04.30', { color: 'cyan', mono: true, align: 'right' });

        // column C: list, labels, icons
        const CX = 877;
        s.panel(CX, 318, 334, 470, { header: 'List and icons', accent: 'mode' });
        const list = s.scrollList(CX, 214, 304, 164, { rowHeight: 46, gap: 6 });
        for (let i = 0; i < 12; i++) {
            const st = i === 1 ? 'selected' : (i >= 9 ? 'locked' : 'normal');
            list.addRow('Level ' + (Math.floor(i / 4) + 1) + '-' + (i % 4 + 1), {
                sub: i >= 9 ? 'Locked' : (i % 3 === 0 ? 'Best 0:41.20' : ''), icon: i >= 9 ? 'lock' : 'star',
                iconColor: i >= 9 ? theme.color.iconDisabled : undefined,
                right: i >= 9 ? '' : '★'.repeat(3 - (i % 3)), state: st,
                onClick: () => status('Row ' + (i + 1))
            });
        }
        s.label(CX - 150, 316, 'Body text', { style: 'body', align: 'left' });
        s.label(CX - 150, 338, 'Small dim text', { style: 'small', align: 'left' });
        s.label(CX + 150, 316, '12,450', { style: 'value', align: 'right' });
        s.label(CX + 150, 340, '0:41.20', { style: 'mono', align: 'right' });
        ICONS.forEach((name, i) => {
            const col = i % 6, row = Math.floor(i / 6);
            const ix = CX - 135 + col * 54, iy = 372 + row * 46;
            s.icon(ix, iy, name, 22);
            s.label(ix, iy + 20, name, { style: 'small', size: theme.size.iconName });
        });

        s.hintBar([['←↑↓→', 'Move'], ['ENTER', 'Select'], ['←→', 'Slider / tabs'], ['ESC', 'Back']]);

        function openPopup() {
            const p = new Screen(scene, { id: 'uikit-popup', depth: D + 20, backdrop: 'dim', enter: 'pop', onBack: () => p.close() });
            p.panel(VIEW_W / 2, 300, 440, 250, { header: 'Stacked popup', accent: 'danger' });
            p.iconButton(VIEW_W / 2 + 196, 196, 'close', { label: 'Close', size: 36, onClick: () => p.close() });
            p.icon(VIEW_W / 2, 252, 'trophy', 40);
            p.label(VIEW_W / 2, 296, 'Only this popup takes input.\nEsc or No closes it.', { style: 'body', wrap: 380 });
            p.button(VIEW_W / 2 - 100, 368, 'Yes', { role: 'go', size: 'md', width: 170, default: true, onClick: () => p.close(() => status('Yes')) });
            p.button(VIEW_W / 2 + 100, 368, 'No', { role: 'neutral', size: 'md', width: 170, onClick: () => p.close(() => status('No')) });
            p.open();
            UI._lastPopup = p;
        }
        s.open();
        if (typeof menuObjects !== 'undefined') menuObjects.push({ destroy: () => s.destroy() });
        return s;
    }

    // ---------- public API ----------

    return {
        theme: theme,
        ICONS: ICONS,
        css: css,
        screen: (scene, opts) => new Screen(scene, opts),
        toast: toast,
        icon: makeIcon,
        drawIcon: drawIcon,
        isOpen: () => stack.some(s => s.modal),
        top: topScreen,
        stack: () => stack.slice(),
        reset: (scene) => { resetAll(false); unbindScene(); if (scene) bindScene(scene); },
        showStyleSheet: showStyleSheet
    };
})();

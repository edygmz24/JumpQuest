// ========================
// Widescreen view
// ========================
// The playfield is 16:9. Menus, popups and mode HUDs were all laid out for
// the original 800x600 screen, so rather than re-position hundreds of
// objects they are drawn by a second camera whose 800px viewport is centred
// in the wider canvas. The world (and the slim gameplay HUD, which is laid
// out for the full width) stays on the main camera.
//
// Objects are sorted between the two cameras automatically, once, just
// before their first render:
//   - obj.wideUI === true           -> main camera only (full-width HUD)
//   - fixed to the screen, depth>=80 -> menu camera only (legacy 800px UI)
//   - everything else                -> main camera only (the world)

const VIEW_W = 1066;
const VIEW_H = 600;
const UI_W = 800;
const UI_X = Math.round((VIEW_W - UI_W) / 2);
const UI_DEPTH_MIN = 80;

let uiCamera = null;
let viewCurtains = [];

// Marks an object as laid out for the full-width screen.
function wideUI(obj) {
    obj.wideUI = true;
    return obj;
}

function setupViewCameras(scene) {
    uiCamera = scene.cameras.add(UI_X, 0, UI_W, VIEW_H);
    uiCamera.setName('ui');

    // Full-screen dimmers and flashes only cover the menu camera's 800px, so
    // these two strips repeat them over the margins.
    viewCurtains = [0, 1].map(i => {
        const r = scene.add.rectangle(i === 0 ? 0 : UI_X + UI_W, 0, UI_X, VIEW_H, 0x000000, 1);
        r.setOrigin(0, 0).setScrollFactor(0).setDepth(5000).setAlpha(0);
        r.wideUI = true;
        return r;
    });

    const sortObjects = () => {
        const list = scene.children.list;
        const main = scene.cameras.main;
        let clear = 1;       // how much of the margin still shows through
        let curtainColor = 0x000000;
        for (let i = 0; i < list.length; i++) {
            const o = list[i];
            if (!o._viewSorted) {
                o._viewSorted = true;
                const fixed = o.scrollFactorX === 0 && o.scrollFactorY === 0;
                if (!o.wideUI && fixed && o.depth >= UI_DEPTH_MIN) {
                    main.ignore(o);
                    o._viewUi = true;
                } else {
                    uiCamera.ignore(o);
                }
            }
            if (o._viewUi && o.type === 'Rectangle' && o.width === UI_W && o.height === VIEW_H &&
                o.visible && o.alpha > 0 && o.fillAlpha > 0) {
                clear *= 1 - Math.min(1, o.alpha * o.fillAlpha);
                curtainColor = o.fillColor;
            }
        }
        const alpha = 1 - clear;
        viewCurtains.forEach(c => {
            c.setAlpha(alpha);
            if (alpha > 0) c.setFillStyle(curtainColor, 1);
        });
    };
    scene.events.on('prerender', sortObjects);
    scene.events.once('shutdown', () => {
        scene.events.off('prerender', sortObjects);
        uiCamera = null;
        viewCurtains = [];
    });
}

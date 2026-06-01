/**
 * Browser keyboard and mouse input plugin.
 *
 * Poll each frame (inside a system or scene update):
 *   inputPlugin.keyboard.isHeld('KeyW')       // held this frame
 *   inputPlugin.keyboard.isDown('Space')       // pressed this frame
 *   inputPlugin.keyboard.isUp('ShiftLeft')     // released this frame
 *   inputPlugin.mouse.x / .y                  // position relative to `target`
 *   inputPlugin.mouse.dx / .dy                // movement delta this frame
 *   inputPlugin.mouse.wheel                   // accumulated Y-scroll this frame
 *   inputPlugin.mouse.isButtonHeld(0)         // 0=left  1=middle  2=right
 *   inputPlugin.mouse.isButtonDown(0)
 *   inputPlugin.mouse.isButtonUp(0)
 *
 * React to events via the world bus:
 *   world.on('input:keyDown',   ({ code, key }) => { ... });
 *   world.on('input:keyUp',     ({ code, key }) => { ... });
 *   world.on('input:mouseDown', ({ button, x, y }) => { ... });
 *   world.on('input:mouseUp',   ({ button, x, y }) => { ... });
 *   world.on('input:mouseMove', ({ x, y, dx, dy }) => { ... });
 *   world.on('input:wheel',     ({ x, y, dy }) => { ... });
 *
 * key codes follow the Web KeyboardEvent.code convention ('KeyA', 'ArrowLeft', …).
 *
 * Options:
 *   target             — element that receives mouse events (default: window)
 *   preventContextMenu — suppress the right-click context menu on `target` (default: false)
 */

import { InputBeginSystem, InputEndSystem } from './InputSystems.js';

function createInput(options = {}) {
    const {
        target             = window,
        preventContextMenu = false,
    } = options;

    const state = {
        held:          new Set(),
        down:          new Set(),
        up:            new Set(),
        _kPendingDown: [],
        _kPendingUp:   [],
        mouse: {
            x:             0,
            y:             0,
            dx:            0,
            dy:            0,
            wheel:         0,
            held:          new Set(),
            down:          new Set(),
            up:            new Set(),
            _pendingDown:  [],
            _pendingUp:    [],
            _pendingMove:  [],
            _pendingWheel: [],
        },
    };

    // Stored so the exact same function references can be passed to removeEventListener.
    const _h = {};

    function _clearHeld() {
        state.held.clear();
        state._kPendingDown.length      = 0;
        state._kPendingUp.length        = 0;
        state.mouse.held.clear();
        state.mouse._pendingDown.length = 0;
        state.mouse._pendingUp.length   = 0;
    }

    return {
        keyboard: {
            isHeld: (code) => state.held.has(code),
            isDown: (code) => state.down.has(code),
            isUp:   (code) => state.up.has(code),
        },

        mouse: {
            get x()     { return state.mouse.x;     },
            get y()     { return state.mouse.y;     },
            get dx()    { return state.mouse.dx;    },
            get dy()    { return state.mouse.dy;    },
            get wheel() { return state.mouse.wheel; },
            isButtonHeld: (b) => state.mouse.held.has(b),
            isButtonDown: (b) => state.mouse.down.has(b),
            isButtonUp:   (b) => state.mouse.up.has(b),
        },

        _systems: null,

        install(world) {
            const t = target;

            _h.keydown = (e) => {
                // Ignore auto-repeat events; only queue the initial press.
                if (!state.held.has(e.code)) {
                    state._kPendingDown.push({ code: e.code, key: e.key });
                }
            };
            _h.keyup = (e) => {
                state._kPendingUp.push({ code: e.code, key: e.key });
            };
            _h.mousedown = (e) => {
                const { x, y } = _toLocal(e, t);
                state.mouse._pendingDown.push({ button: e.button, x, y });
            };
            _h.mouseup = (e) => {
                const { x, y } = _toLocal(e, t);
                state.mouse._pendingUp.push({ button: e.button, x, y });
            };
            _h.mousemove = (e) => {
                const { x, y } = _toLocal(e, t);
                state.mouse._pendingMove.push({ x, y, dx: e.movementX, dy: e.movementY });
            };
            _h.wheel = (e) => {
                state.mouse._pendingWheel.push({ dy: e.deltaY });
            };
            // Prevent keys and buttons from sticking when the page loses focus.
            _h.blur             = _clearHeld;
            _h.visibilitychange = () => { if (document.hidden) _clearHeld(); };

            window.addEventListener('keydown',          _h.keydown);
            window.addEventListener('keyup',            _h.keyup);
            window.addEventListener('blur',             _h.blur);
            document.addEventListener('visibilitychange', _h.visibilitychange);

            t.addEventListener('mousedown', _h.mousedown);
            t.addEventListener('mouseup',   _h.mouseup);
            t.addEventListener('mousemove', _h.mousemove);
            t.addEventListener('wheel',     _h.wheel, { passive: true });

            if (preventContextMenu) {
                _h.contextmenu = (e) => e.preventDefault();
                t.addEventListener('contextmenu', _h.contextmenu);
            }

            this._systems = [
                new InputBeginSystem(state),
                new InputEndSystem(state),
            ];
            for (const system of this._systems) {
                world.registerSystem(system);
            }
        },

        uninstall(world) {
            for (const system of this._systems) {
                world.unregisterSystem(system);
            }
            this._systems = null;

            window.removeEventListener('keydown',          _h.keydown);
            window.removeEventListener('keyup',            _h.keyup);
            window.removeEventListener('blur',             _h.blur);
            document.removeEventListener('visibilitychange', _h.visibilitychange);

            target.removeEventListener('mousedown', _h.mousedown);
            target.removeEventListener('mouseup',   _h.mouseup);
            target.removeEventListener('mousemove', _h.mousemove);
            target.removeEventListener('wheel',     _h.wheel);

            if (_h.contextmenu) {
                target.removeEventListener('contextmenu', _h.contextmenu);
                _h.contextmenu = null;
            }

            // Full state reset so a re-install starts clean.
            state.held.clear();
            state.down.clear();
            state.up.clear();
            state._kPendingDown.length = 0;
            state._kPendingUp.length   = 0;

            const m = state.mouse;
            m.held.clear();
            m.down.clear();
            m.up.clear();
            m._pendingDown.length  = 0;
            m._pendingUp.length    = 0;
            m._pendingMove.length  = 0;
            m._pendingWheel.length = 0;
        },
    };
}

function _toLocal(e, target) {
    if (target === window || target === document) {
        return { x: e.clientX, y: e.clientY };
    }
    const r = target.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
}

export default createInput;

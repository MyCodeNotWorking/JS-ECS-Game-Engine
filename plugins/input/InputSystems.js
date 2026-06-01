import { System } from '../../engine/src/index.js';

// Runs first each update: drains the pending DOM-event queues into frame state
// and emits world events. Order -800 ensures it precedes all user systems.
export class InputBeginSystem extends System {
    constructor(state) {
        super({ phase: 'update', order: -800 });
        this._s = state;
    }

    update(world, _dt) {
        const s = this._s;
        const m = s.mouse;

        for (const ev of s._kPendingDown) {
            s.held.add(ev.code);
            s.down.add(ev.code);
            world.emit('input:keyDown', ev);
        }
        s._kPendingDown.length = 0;

        for (const ev of s._kPendingUp) {
            s.held.delete(ev.code);
            s.up.add(ev.code);
            world.emit('input:keyUp', ev);
        }
        s._kPendingUp.length = 0;

        if (m._pendingMove.length > 0) {
            let dx = 0, dy = 0;
            for (const ev of m._pendingMove) {
                m.x = ev.x;
                m.y = ev.y;
                dx += ev.dx;
                dy += ev.dy;
            }
            m.dx = dx;
            m.dy = dy;
            m._pendingMove.length = 0;
            world.emit('input:mouseMove', { x: m.x, y: m.y, dx: m.dx, dy: m.dy });
        }

        for (const ev of m._pendingDown) {
            m.held.add(ev.button);
            m.down.add(ev.button);
            world.emit('input:mouseDown', ev);
        }
        m._pendingDown.length = 0;

        for (const ev of m._pendingUp) {
            m.held.delete(ev.button);
            m.up.add(ev.button);
            world.emit('input:mouseUp', ev);
        }
        m._pendingUp.length = 0;

        if (m._pendingWheel.length > 0) {
            let dy = 0;
            for (const ev of m._pendingWheel) dy += ev.dy;
            m.wheel = dy;
            m._pendingWheel.length = 0;
            world.emit('input:wheel', { x: m.x, y: m.y, dy: m.wheel });
        }
    }
}

// Runs last each lateUpdate: resets all per-frame (just-pressed / just-released)
// state so the next frame starts clean. Order 900 ensures it trails user systems.
export class InputEndSystem extends System {
    constructor(state) {
        super({ phase: 'lateUpdate', order: 900 });
        this._s = state;
    }

    lateUpdate(_world, _dt) {
        const s = this._s;
        const m = s.mouse;

        s.down.clear();
        s.up.clear();
        m.down.clear();
        m.up.clear();
        m.dx    = 0;
        m.dy    = 0;
        m.wheel = 0;
    }
}

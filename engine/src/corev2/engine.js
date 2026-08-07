import { EngineError } from './errors.js';
import { World } from './world.js';

function nowMs() {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        return performance.now();
    }
    return Date.now();
}

export class Engine {
    constructor({
        world = new World(),
        fixedDelta = 1 / 60,
        timeScale = 1
    } = {}) {
        if (!(fixedDelta > 0)) {
            throw new EngineError('E_FIXED_DELTA', 'fixedDelta must be greater than 0.');
        }
        if (!(timeScale > 0)) {
            throw new EngineError('E_TIMESCALE', 'timeScale must be greater than 0.');
        }

        this.world = world;
        this.fixedDelta = fixedDelta;
        this.timeScale = timeScale;

        this.running = false;
        this.paused = false;

        this._lastTime = 0;
        this._accumulator = 0;
        this._frameHandle = null;

        this._raf = typeof globalThis.requestAnimationFrame === 'function'
            ? globalThis.requestAnimationFrame.bind(globalThis)
            : null;

        this._caf = typeof globalThis.cancelAnimationFrame === 'function'
            ? globalThis.cancelAnimationFrame.bind(globalThis)
            : null;

        this._boundTick = (time) => this._tick(time);
    }

    start() {
        if (this.running && !this.paused) return;

        this.running = true;
        this.paused = false;
        this._lastTime = nowMs();
        this._accumulator = 0;

        this.world.notifyLifecycle('start');

        this._scheduleNext();
    }

    pause() {
        if (!this.running || this.paused) return;
        this.paused = true;
        this.world.notifyLifecycle('pause');
        this._cancelNext();
    }

    stop() {
        if (!this.running) return;
        this.running = false;
        this.paused = false;
        this._accumulator = 0;
        this._cancelNext();
        this.world.notifyLifecycle('stop');
    }

    setTimeScale(value) {
        if (!(value > 0)) {
            throw new EngineError('E_TIMESCALE', 'timeScale must be greater than 0.');
        }
        this.timeScale = value;
    }

    setFixedDelta(value) {
        if (!(value > 0)) {
            throw new EngineError('E_FIXED_DELTA', 'fixedDelta must be greater than 0.');
        }
        this.fixedDelta = value;
    }

    // Advances the simulation by an explicit delta, independent of rAF/setTimeout
    // scheduling and of running/paused state. Useful for unit tests, deterministic
    // replay or lockstep networking, and headless/server-side ticking.
    step(dt = this.fixedDelta) {
        if (!Number.isFinite(dt) || dt < 0) dt = 0;
        dt *= this.timeScale;

        this._accumulator += dt;
        this.world.update(dt);

        while (this._accumulator >= this.fixedDelta) {
            this.world.fixedUpdate(this.fixedDelta);
            this._accumulator -= this.fixedDelta;
        }

        this.world.lateUpdate(dt);
    }

    _scheduleNext() {
        if (!this.running || this.paused) return;

        if (this._raf) {
            this._frameHandle = this._raf(this._boundTick);
        } else {
            this._frameHandle = setTimeout(() => this._boundTick(nowMs()), 16);
        }
    }

    _cancelNext() {
        if (this._frameHandle === null) return;

        if (this._raf && this._caf) {
            this._caf(this._frameHandle);
        } else {
            clearTimeout(this._frameHandle);
        }

        this._frameHandle = null;
    }

    _tick(timestamp) {
        if (!this.running || this.paused) return;

        const current = typeof timestamp === 'number' ? timestamp : nowMs();
        let dt = (current - this._lastTime) / 1000;
        this._lastTime = current;

        if (!Number.isFinite(dt) || dt < 0) dt = 0;
        if (dt > 0.25) dt = 0.25;
        dt *= this.timeScale;

        this._accumulator += dt;

        this.world.update(dt);

        while (this._accumulator >= this.fixedDelta) {
            this.world.fixedUpdate(this.fixedDelta);
            this._accumulator -= this.fixedDelta;
        }

        this.world.lateUpdate(dt);
        this._scheduleNext();
    }
}
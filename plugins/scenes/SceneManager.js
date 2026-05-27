import { EngineError } from '../../engine/src/index.js';

function assertName(name) {
    if (typeof name !== 'string' || name.length === 0) {
        throw new EngineError('E_SCENE_NAME', 'Scene name must be a non-empty string.');
    }
}

function assertScene(scene) {
    if (!scene || typeof scene !== 'object') {
        throw new EngineError('E_SCENE', 'Scene must be an object.');
    }

    const allowed = ['enter', 'exit', 'update', 'fixedUpdate', 'lateUpdate'];
    for (const key of Object.keys(scene)) {
        if (!allowed.includes(key) && key !== 'data') {
            throw new EngineError('E_SCENE_FIELD', `Unknown scene field "${key}".`);
        }
    }
}

class SceneManager {
    constructor() {
        this._scenes = new Map();
        this._current = null;
        this._currentName = null;
        this._transitioning = false;
    }

    register(name, scene) {
        assertName(name);
        assertScene(scene);

        if (this._scenes.has(name)) {
            throw new EngineError('E_SCENE_EXISTS', `Scene "${name}" is already registered.`);
        }

        this._scenes.set(name, scene);
        return scene;
    }

    unregister(name) {
        assertName(name);

        if (!this._scenes.has(name)) {
            return false;
        }

        if (this._currentName === name) {
            this.unload();
        }

        return this._scenes.delete(name);
    }

    has(name) {
        assertName(name);
        return this._scenes.has(name);
    }

    get current() {
        return this._current;
    }

    get currentName() {
        return this._currentName;
    }

    get names() {
        return Array.from(this._scenes.keys());
    }

    load(world, name, data = undefined) {
        assertName(name);

        const next = this._scenes.get(name);
        if (!next) {
            throw new EngineError('E_SCENE_UNKNOWN', `Scene "${name}" is not registered.`);
        }

        if (this._transitioning) {
            throw new EngineError('E_SCENE_TRANSITION', 'Scene transition already in progress.');
        }

        this._transitioning = true;

        try {
            if (this._current && typeof this._current.exit === 'function') {
                this._current.exit(world, this._current.data);
            }

            this._current = next;
            this._currentName = name;
            this._current.data = data;

            if (typeof next.enter === 'function') {
                next.enter(world, data);
            }

            return next;
        } finally {
            this._transitioning = false;
        }
    }

    reload(world, data = undefined) {
        if (!this._currentName) {
            throw new EngineError('E_SCENE_EMPTY', 'No current scene to reload.');
        }
        return this.load(world, this._currentName, data);
    }

    unload(world) {
        if (!this._current) return false;

        if (typeof this._current.exit === 'function') {
            this._current.exit(world, this._current.data);
        }

        this._current = null;
        this._currentName = null;
        return true;
    }

    update(world, dt) {
        if (this._current && typeof this._current.update === 'function') {
            this._current.update(world, dt, this._current.data);
        }
    }

    fixedUpdate(world, dt) {
        if (this._current && typeof this._current.fixedUpdate === 'function') {
            this._current.fixedUpdate(world, dt, this._current.data);
        }
    }

    lateUpdate(world, dt) {
        if (this._current && typeof this._current.lateUpdate === 'function') {
            this._current.lateUpdate(world, dt, this._current.data);
        }
    }

    clear(world) {
        this.unload(world);
        this._scenes.clear();
    }
}

export default SceneManager;
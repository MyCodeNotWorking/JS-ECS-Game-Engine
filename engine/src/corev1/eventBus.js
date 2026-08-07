// src/core/eventBus.js
import { EngineError } from './errors.js';

export class EventBus {
    constructor() {
        this._listeners = new Map();
    }

    on(type, handler) {
        if (typeof type !== 'string' || type.length === 0) {
            throw new EngineError('E_EVENT_TYPE', 'Event type must be a non-empty string.');
        }
        if (typeof handler !== 'function') {
            throw new EngineError('E_EVENT_HANDLER', 'Event handler must be a function.');
        }

        let set = this._listeners.get(type);
        if (!set) {
            set = new Set();
            this._listeners.set(type, set);
        }

        set.add(handler);
        return () => this.off(type, handler);
    }

    off(type, handler) {
        const set = this._listeners.get(type);
        if (!set) return false;
        const removed = set.delete(handler);
        if (set.size === 0) this._listeners.delete(type);
        return removed;
    }

    emit(type, payload) {
        const set = this._listeners.get(type);
        if (!set || set.size === 0) return 0;

        let count = 0;
        for (const handler of Array.from(set)) {
            handler(payload, type);
            count += 1;
        }
        return count;
    }

    clear(type = undefined) {
        if (typeof type === 'undefined') {
            this._listeners.clear();
            return;
        }
        this._listeners.delete(type);
    }
}
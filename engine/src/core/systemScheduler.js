// src/core/systemScheduler.js
import { EngineError } from './errors.js';

const VALID_PHASES = new Set(['update', 'fixedUpdate', 'lateUpdate']);

export class SystemScheduler {
    constructor() {
        this._phases = new Map();
        this._records = new Map();
        this._sequence = 0;
    }

    register(system, options = {}) {
        if (!system || typeof system !== 'object') {
            throw new EngineError('E_SYSTEM', 'System must be an object.');
        }

        const phase = options.phase ?? system.phase ?? 'update';
        if (!VALID_PHASES.has(phase)) {
            throw new EngineError('E_SYSTEM_PHASE', `Invalid system phase "${phase}".`);
        }

        const record = {
            system,
            phase,
            order: options.order ?? system.order ?? 0,
            enabled: options.enabled ?? system.enabled ?? true,
            sequence: this._sequence++
        };

        const list = this._phases.get(phase) ?? [];
        const index = list.findIndex((entry) => entry.order > record.order || (entry.order === record.order && entry.sequence > record.sequence));
        if (index === -1) {
            list.push(record);
        } else {
            list.splice(index, 0, record);
        }
        this._phases.set(phase, list);
        this._records.set(system, record);
        return system;
    }

    unregister(system) {
        const record = this._records.get(system);
        if (!record) return false;

        const list = this._phases.get(record.phase);
        if (list) {
            const index = list.indexOf(record);
            if (index !== -1) list.splice(index, 1);
            if (list.length === 0) this._phases.delete(record.phase);
        }

        this._records.delete(system);
        return true;
    }

    setEnabled(system, enabled) {
        const record = this._records.get(system);
        if (!record) return false;
        record.enabled = Boolean(enabled);
        return true;
    }

    run(phase, world, dt) {
        const list = this._phases.get(phase);
        if (!list || list.length === 0) return;

        for (const record of list) {
            if (!record.enabled) continue;
            const fn = record.system[phase];
            if (typeof fn === 'function') {
                fn.call(record.system, world, dt);
            }
        }
    }

    clear() {
        this._phases.clear();
        this._records.clear();
        this._sequence = 0;
    }
}
import { EngineError } from './errors.js';

export class SystemScheduler {
    constructor() {
        this._phases = new Map();
        this._records = new Map(); // system -> record[] (one per registered phase)
        this._sequence = 0;
    }

    register(system, options = {}) {
        if (!system || typeof system !== 'object') {
            throw new EngineError('E_SYSTEM', 'System must be an object.');
        }
        if (this._records.has(system)) {
            throw new EngineError('E_SYSTEM_EXISTS', 'System is already registered.');
        }

        const requested = options.phase ?? system.phase ?? 'update';
        const phases = Array.isArray(requested) ? requested : [requested];
        for (const phase of phases) {
            if (typeof phase !== 'string' || phase.length === 0) {
                throw new EngineError('E_SYSTEM_PHASE', 'System phase must be a non-empty string.');
            }
        }

        const enabled = options.enabled ?? system.enabled ?? true;
        // options.order can be a single number (applied to every phase) or an
        // object like { fixedUpdate: 0, lateUpdate: 5 } for per-phase ordering.
        const perPhaseOrder = options.order && typeof options.order === 'object' && !Array.isArray(options.order);

        const records = [];
        for (const phase of phases) {
            const order = perPhaseOrder ? (options.order[phase] ?? 0) : (options.order ?? system.order ?? 0);
            const record = { system, phase, order, enabled, sequence: this._sequence++ };
            this._insert(phase, record);
            records.push(record);
        }

        this._records.set(system, records);
        return system;
    }

    _insert(phase, record) {
        const list = this._phases.get(phase) ?? [];
        const index = list.findIndex((entry) => entry.order > record.order || (entry.order === record.order && entry.sequence > record.sequence));
        if (index === -1) {
            list.push(record);
        } else {
            list.splice(index, 0, record);
        }
        this._phases.set(phase, list);
    }

    unregister(system) {
        const records = this._records.get(system);
        if (!records) return false;

        for (const record of records) {
            const list = this._phases.get(record.phase);
            if (list) {
                const index = list.indexOf(record);
                if (index !== -1) list.splice(index, 1);
                if (list.length === 0) this._phases.delete(record.phase);
            }
        }

        this._records.delete(system);
        return true;
    }

    setEnabled(system, enabled) {
        const records = this._records.get(system);
        if (!records) return false;
        for (const record of records) record.enabled = Boolean(enabled);
        return true;
    }

    run(phase, world, dt) {
        const list = this._phases.get(phase);
        if (!list || list.length === 0) return;

        for (const record of list) {
            if (!record.enabled) continue;
            const fn = record.system[phase];
            if (typeof fn !== 'function') continue;

            try {
                fn.call(record.system, world, dt);
            } catch (error) {
                world.logger?.error(`System "${record.system.name ?? 'unnamed'}" threw in "${phase}":`, error);
                world.events?.emit('systemError', { system: record.system, phase, error });
            }
        }
    }

    clear() {
        this._phases.clear();
        this._records.clear();
        this._sequence = 0;
    }
}
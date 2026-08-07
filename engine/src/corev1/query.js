// src/core/query.js
import { EngineError } from './errors.js';

function normalizeList(value) {
    if (!Array.isArray(value)) {
        throw new EngineError('E_QUERY', 'Query filters must be arrays.');
    }
    for (const entry of value) {
        if (typeof entry !== 'string' || entry.length === 0) {
            throw new EngineError('E_QUERY', 'Query component names must be non-empty strings.');
        }
    }
    return value.slice();
}

export class Query {
    constructor({ all = [], any = [], none = [] } = {}) {
        this.all = normalizeList(all);
        this.any = normalizeList(any);
        this.none = normalizeList(none);
    }

    matches(world, entity) {
        for (const name of this.all) {
            if (!world.hasComponent(entity, name)) return false;
        }

        if (this.any.length > 0) {
            let matched = false;
            for (const name of this.any) {
                if (world.hasComponent(entity, name)) {
                    matched = true;
                    break;
                }
            }
            if (!matched) return false;
        }

        for (const name of this.none) {
            if (world.hasComponent(entity, name)) return false;
        }

        return true;
    }

    entities(world) {
        if (this.all.length === 0 && this.any.length === 0 && this.none.length === 0) {
            return world.entities();
        }

        let candidates = null;

        if (this.all.length > 0) {
            let smallest = null;
            for (const name of this.all) {
                const storage = world.componentStorage(name);
                if (smallest === null || storage.size() < smallest.size()) {
                    smallest = storage;
                }
            }
            candidates = smallest ? smallest.entities() : [];
        } else if (this.any.length > 0) {
            const set = new Set();
            for (const name of this.any) {
                const storage = world.componentStorage(name);
                for (const entity of storage.entities()) set.add(entity);
            }
            candidates = Array.from(set);
        } else {
            candidates = world.entities();
        }

        const result = [];
        for (const entity of candidates) {
            if (this.matches(world, entity)) {
                result.push(entity);
            }
        }
        return result;
    }
}
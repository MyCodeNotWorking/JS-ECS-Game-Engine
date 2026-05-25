// src/core/entityManager.js
import { EngineError } from './errors.js';

export class EntityManager {
    constructor() {
        this._nextId = 1;
        this._freeIds = [];
        this._alive = new Map(); // id -> dense index
        this._entities = [];
    }

    create() {
        const id = this._freeIds.length > 0 ? this._freeIds.pop() : this._nextId++;
        if (this._alive.has(id)) {
            throw new EngineError('E_ENTITY_CREATE', `Entity ${id} already exists.`);
        }

        this._alive.set(id, this._entities.length);
        this._entities.push(id);
        return id;
    }

    destroy(id) {
        if (!this._alive.has(id)) return false;

        const index = this._alive.get(id);
        const lastIndex = this._entities.length - 1;
        const lastId = this._entities[lastIndex];

        if (index !== lastIndex) {
            this._entities[index] = lastId;
            this._alive.set(lastId, index);
        }

        this._entities.pop();
        this._alive.delete(id);
        this._freeIds.push(id);
        return true;
    }

    has(id) {
        return this._alive.has(id);
    }

    clear() {
        this._nextId = 1;
        this._freeIds.length = 0;
        this._alive.clear();
        this._entities.length = 0;
    }

    count() {
        return this._entities.length;
    }

    all() {
        return this._entities.slice();
    }

    _indexOf(id) {
        return this._alive.get(id);
    }
}
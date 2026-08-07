// src/core/componentRegistry.js
import { EngineError } from './errors.js';
import { ComponentStorage } from './componentStorage.js';

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;
}

export class ComponentRegistry {
    constructor() {
        this._definitions = new Map();
    }

    define(name, schema) {
        if (typeof name !== 'string' || name.length === 0) {
            throw new EngineError('E_COMPONENT_NAME', 'Component name must be a non-empty string.');
        }
        if (!isPlainObject(schema)) {
            throw new EngineError('E_COMPONENT_SCHEMA', `Schema for "${name}" must be a plain object.`);
        }
        if (this._definitions.has(name)) {
            throw new EngineError('E_COMPONENT_EXISTS', `Component "${name}" is already defined.`);
        }

        const storage = new ComponentStorage(name, schema);
        const definition = { name, schema: storage.schema, storage };
        this._definitions.set(name, definition);
        return definition;
    }

    has(name) {
        return this._definitions.has(name);
    }

    get(name) {
        return this._definitions.get(name);
    }

    storage(name) {
        const definition = this._definitions.get(name);
        if (!definition) {
            throw new EngineError('E_COMPONENT_UNKNOWN', `Component "${name}" is not defined.`);
        }
        return definition.storage;
    }

    remove(name) {
        const definition = this._definitions.get(name);
        if (!definition) return false;
        definition.storage.clear();
        this._definitions.delete(name);
        return true;
    }

    clear() {
        for (const definition of this._definitions.values()) {
            definition.storage.clear();
        }
        this._definitions.clear();
    }

    names() {
        return Array.from(this._definitions.keys());
    }

    forEachStorage(fn) {
        for (const definition of this._definitions.values()) {
            fn(definition.storage, definition);
        }
    }
}
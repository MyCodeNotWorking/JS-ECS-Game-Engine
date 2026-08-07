// src/core/componentStorage.js
import { EngineError } from './errors.js';

function cloneValue(value) {
    if (typeof value === 'function') {
        return value();
    }

    if (value && typeof value === 'object') {
        if (typeof structuredClone === 'function') {
            return structuredClone(value);
        }
        return Array.isArray(value) ? value.slice() : { ...value };
    }

    return value;
}

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype;
}

function resolveDefault(definition) {
    if (definition && typeof definition === 'object' && !Array.isArray(definition) && Object.prototype.hasOwnProperty.call(definition, 'default')) {
        return cloneValue(definition.default);
    }
    return cloneValue(definition);
}

export class ComponentStorage {
    constructor(name, schema) {
        if (typeof name !== 'string' || name.length === 0) {
            throw new EngineError('E_COMPONENT_NAME', 'Component name must be a non-empty string.');
        }
        if (!isPlainObject(schema)) {
            throw new EngineError('E_COMPONENT_SCHEMA', `Schema for "${name}" must be a plain object.`);
        }

        this.name = name;
        this.schema = Object.freeze({ ...schema });
        this._entities = [];
        this._values = [];
        this._index = new Map();
    }

    has(entity) {
        return this._index.has(entity);
    }

    get(entity) {
        const index = this._index.get(entity);
        if (index === undefined) return undefined;
        return this._values[index];
    }

    set(entity, value) {
        if (this._index.has(entity)) {
            this._values[this._index.get(entity)] = value;
            return value;
        }

        const index = this._entities.length;
        this._entities.push(entity);
        this._values.push(value);
        this._index.set(entity, index);
        return value;
    }

    create(entity, data = {}) {
        if (!isPlainObject(data)) {
            throw new EngineError('E_COMPONENT_DATA', `Component data for "${this.name}" must be a plain object.`);
        }

        const value = {};
        for (const key of Object.keys(this.schema)) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                value[key] = data[key];
            } else {
                value[key] = resolveDefault(this.schema[key]);
            }
        }

        for (const key of Object.keys(data)) {
            if (!Object.prototype.hasOwnProperty.call(this.schema, key)) {
                throw new EngineError(
                    'E_COMPONENT_FIELD',
                    `Unknown field "${key}" for component "${this.name}".`
                );
            }
        }

        return this.set(entity, value);
    }

    delete(entity) {
        const index = this._index.get(entity);
        if (index === undefined) return false;

        const lastIndex = this._entities.length - 1;
        const lastEntity = this._entities[lastIndex];

        if (index !== lastIndex) {
            this._entities[index] = lastEntity;
            this._values[index] = this._values[lastIndex];
            this._index.set(lastEntity, index);
        }

        this._entities.pop();
        this._values.pop();
        this._index.delete(entity);
        return true;
    }

    clear() {
        this._entities.length = 0;
        this._values.length = 0;
        this._index.clear();
    }

    size() {
        return this._entities.length;
    }

    entities() {
        return this._entities.slice();
    }

    entries() {
        return this._entities.map((entity, index) => [entity, this._values[index]]);
    }

    forEach(fn) {
        for (let i = 0; i < this._entities.length; i += 1) {
            fn(this._values[i], this._entities[i], this);
        }
    }
}
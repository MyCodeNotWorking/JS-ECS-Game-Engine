import { EngineError } from './errors.js';
import { Logger } from './logger.js';
import { EventBus } from './eventBus.js';
import { EntityManager } from './entityManager.js';
import { ComponentRegistry } from './componentRegistry.js';
import { Query } from './query.js';
import { SystemScheduler } from './systemScheduler.js';
import { PluginManager } from './pluginManager.js';

export class World {
    constructor({
        logger = new Logger(),
        eventBus = new EventBus()
    } = {}) {
        this.logger = logger;
        this.events = eventBus;

        this.entitiesManager = new EntityManager();
        this.components = new ComponentRegistry();
        this.systems = new SystemScheduler();
        this.plugins = new PluginManager();

        // Singleton/global state shared across systems and plugins (config, caches,
        // input state, etc.) that doesn't belong on an entity.
        this.resources = new Map();

        // Accumulated simulation time, advanced once per frame in update().
        this.time = 0;

        this._deferred = [];
    }

    // --- resources -----------------------------------------------------

    setResource(key, value) {
        this.resources.set(key, value);
        return value;
    }

    getResource(key) {
        return this.resources.get(key);
    }

    hasResource(key) {
        return this.resources.has(key);
    }

    removeResource(key) {
        return this.resources.delete(key);
    }

    // --- components ------------------------------------------------------

    defineComponent(name, schema) {
        return this.components.define(name, schema);
    }

    componentStorage(name) {
        return this.components.storage(name);
    }

    // --- entities --------------------------------------------------------

    createEntity() {
        const entity = this.entitiesManager.create();
        this.events.emit('entityCreated', entity);
        return entity;
    }

    destroyEntity(entity) {
        if (!this.entitiesManager.has(entity)) return false;

        this.components.forEachStorage((storage, definition) => {
            const value = storage.get(entity);
            if (storage.delete(entity)) {
                this.events.emit('componentRemoved', { entity, name: definition.name, value });
            }
        });

        this.entitiesManager.destroy(entity);
        this.events.emit('entityDestroyed', entity);
        return true;
    }

    entities() {
        return this.entitiesManager.all();
    }

    hasEntity(entity) {
        return this.entitiesManager.has(entity);
    }

    addComponent(entity, name, data = {}) {
        this._assertEntity(entity);
        const storage = this.components.storage(name);
        const value = storage.create(entity, data);
        this.events.emit('componentAdded', { entity, name, value });
        return value;
    }

    setComponent(entity, name, value) {
        this._assertEntity(entity);
        const storage = this.components.storage(name);
        if (value === null || typeof value !== 'object') {
            throw new EngineError('E_COMPONENT_VALUE', `Component "${name}" value must be an object.`);
        }
        const existed = storage.has(entity);
        storage.set(entity, value);
        this.events.emit(existed ? 'componentChanged' : 'componentAdded', { entity, name, value });
        return value;
    }

    getComponent(entity, name) {
        this._assertEntity(entity);
        return this.components.storage(name).get(entity);
    }

    hasComponent(entity, name) {
        if (!this.entitiesManager.has(entity)) return false;
        return this.components.storage(name).has(entity);
    }

    removeComponent(entity, name) {
        this._assertEntity(entity);
        const storage = this.components.storage(name);
        const value = storage.get(entity);
        const removed = storage.delete(entity);
        if (removed) this.events.emit('componentRemoved', { entity, name, value });
        return removed;
    }

    query(filter = {}) {
        return new Query(filter).entities(this);
    }

    // --- systems / deferred commands -------------------------------------

    registerSystem(system, options = {}) {
        return this.systems.register(system, options);
    }

    unregisterSystem(system) {
        return this.systems.unregister(system);
    }

    // Queue a structural change (destroy entity, remove component, etc.) to run
    // once the current update phase finishes, so it's safe to call from inside
    // a query iteration without disturbing swap-remove storage.
    defer(fn) {
        this._deferred.push(fn);
    }

    _flushDeferred() {
        if (this._deferred.length === 0) return;
        const queue = this._deferred;
        this._deferred = [];
        for (const fn of queue) fn(this);
    }

    // Runs every system registered under `phase` and flushes deferred commands
    // afterward. Works for the three built-in phases and any custom phase a
    // plugin registers systems under (e.g. 'render').
    runPhase(phase, dt) {
        this.systems.run(phase, this, dt);
        this._flushDeferred();
    }

    update(dt) {
        this.time += dt;
        this.runPhase('update', dt);
    }

    fixedUpdate(dt) {
        this.runPhase('fixedUpdate', dt);
    }

    lateUpdate(dt) {
        this.runPhase('lateUpdate', dt);
    }

    // --- plugins / events --------------------------------------------------

    use(plugin) {
        return this.plugins.register(plugin, this);
    }

    unuse(plugin) {
        return this.plugins.unregister(plugin, this);
    }

    notifyLifecycle(event, payload = undefined) {
        this.plugins.notify(event, this, payload);
    }

    on(type, handler) {
        return this.events.on(type, handler);
    }

    off(type, handler) {
        return this.events.off(type, handler);
    }

    emit(type, payload) {
        return this.events.emit(type, payload);
    }

    clear() {
        this.plugins.clear(this);
        this.systems.clear();
        this.components.clear();
        this.entitiesManager.clear();
        this.events.clear();
        this.resources.clear();
        this._deferred.length = 0;
        this.time = 0;
    }

    _assertEntity(entity) {
        if (!this.entitiesManager.has(entity)) {
            throw new EngineError('E_ENTITY', `Entity ${entity} does not exist.`);
        }
    }
}
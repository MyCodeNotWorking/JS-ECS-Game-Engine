// src/core/world.js
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
    }

    defineComponent(name, schema) {
        return this.components.define(name, schema);
    }

    componentStorage(name) {
        return this.components.storage(name);
    }

    createEntity() {
        return this.entitiesManager.create();
    }

    destroyEntity(entity) {
        if (!this.entitiesManager.has(entity)) return false;

        this.components.forEachStorage((storage) => {
            storage.delete(entity);
        });

        return this.entitiesManager.destroy(entity);
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
        return storage.create(entity, data);
    }

    setComponent(entity, name, value) {
        this._assertEntity(entity);
        const storage = this.components.storage(name);
        if (value === null || typeof value !== 'object') {
            throw new EngineError('E_COMPONENT_VALUE', `Component "${name}" value must be an object.`);
        }
        return storage.set(entity, value);
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
        return this.components.storage(name).delete(entity);
    }

    query(filter = {}) {
        return new Query(filter).entities(this);
    }

    registerSystem(system, options = {}) {
        return this.systems.register(system, options);
    }

    unregisterSystem(system) {
        return this.systems.unregister(system);
    }

    update(dt) {
        this.systems.run('update', this, dt);
    }

    fixedUpdate(dt) {
        this.systems.run('fixedUpdate', this, dt);
    }

    lateUpdate(dt) {
        this.systems.run('lateUpdate', this, dt);
    }

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
    }

    _assertEntity(entity) {
        if (!this.entitiesManager.has(entity)) {
            throw new EngineError('E_ENTITY', `Entity ${entity} does not exist.`);
        }
    }
}
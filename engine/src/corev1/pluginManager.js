// src/core/pluginManager.js
import { EngineError } from './errors.js';

function lifecycleName(event) {
    return `on${event.charAt(0).toUpperCase()}${event.slice(1)}`;
}

export class PluginManager {
    constructor() {
        this._plugins = new Map();
    }

    register(plugin, world) {
        if (!plugin || typeof plugin !== 'object') {
            throw new EngineError('E_PLUGIN', 'Plugin must be an object.');
        }
        if (this._plugins.has(plugin)) {
            throw new EngineError('E_PLUGIN_EXISTS', 'Plugin is already registered.');
        }

        const cleanup = typeof plugin.install === 'function' ? plugin.install(world) : undefined;
        this._plugins.set(plugin, { cleanup });
        return plugin;
    }

    unregister(plugin, world) {
        const record = this._plugins.get(plugin);
        if (!record) return false;

        if (typeof plugin.uninstall === 'function') {
            plugin.uninstall(world);
        }
        if (typeof record.cleanup === 'function') {
            record.cleanup(world);
        }

        this._plugins.delete(plugin);
        return true;
    }

    notify(event, world, payload = undefined) {
        const method = lifecycleName(event);
        for (const plugin of this._plugins.keys()) {
            const handler = plugin[method];
            if (typeof handler === 'function') {
                handler.call(plugin, world, payload);
            }
        }
    }

    clear(world) {
        for (const plugin of Array.from(this._plugins.keys())) {
            this.unregister(plugin, world);
        }
    }

    has(plugin) {
        return this._plugins.has(plugin);
    }

    list() {
        return Array.from(this._plugins.keys());
    }
}
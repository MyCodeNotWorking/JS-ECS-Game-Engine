# Minimal ECS Engine Documentation

## Overview

This engine core provides a minimal, extensible foundation built around an Entity Component System (ECS), a small runtime loop, a plugin layer, an event bus, and standalone math primitives.

It intentionally excludes transforms, hierarchy, scenes, rendering, input, physics, animation, and UI.

## Project Structure

```text
src/
    core/
        errors.js
        logger.js
        eventBus.js
        entityManager.js
        componentStorage.js
        componentRegistry.js
        query.js
        system.js
        systemScheduler.js
        pluginManager.js
        world.js
        engine.js
    math/
        index.js
examples/
    main.js
```

## Core Modules

### `EngineError`

Typed error class used for validation and runtime failures.

```js
import { EngineError } from './src/core/errors.js';
```

### `Logger`

Simple level-based logger with `debug`, `info`, `warn`, and `error`.

```js
import { Logger } from './src/core/logger.js';

const logger = new Logger({ level: 'info' });
logger.info('Ready');
```

### `EventBus`

Minimal publish/subscribe system.

```js
import { EventBus } from './src/core/eventBus.js';

const bus = new EventBus();
const off = bus.on('spawn', (payload) => console.log(payload));
bus.emit('spawn', { id: 1 });
off();
```

### `EntityManager`

Creates, destroys, and reuses entity IDs.

Methods:

* `create()`
* `destroy(id)`
* `has(id)`
* `clear()`
* `count()`
* `all()`

### `ComponentRegistry`

Defines component schemas and gives access to their storage.

```js
world.defineComponent('Position', { x: 0, y: 0 });
```

### `ComponentStorage`

Stores component instances in dense arrays for a single component type.

Used internally by the registry and world.

### `Query`

Filters entities by component membership.

Supported filters:

* `all`: entity must contain all listed components
* `any`: entity must contain at least one listed component
* `none`: entity must contain none of the listed components

```js
world.query({ all: ['Position', 'Velocity'] });
```

### `System`

Base class for systems.

Supported phases:

* `update`
* `fixedUpdate`
* `lateUpdate`

```js
import { System } from './src/core/system.js';

class MovementSystem extends System {
    constructor() {
        super({ phase: 'update', order: 0 });
    }

    update(world, dt) {
        // ...
    }
}
```

### `SystemScheduler`

Registers and runs systems by phase and order.

### `PluginManager`

Registers plugins without hard dependencies between plugins.

A plugin may define any of these methods:

* `install(world)`
* `uninstall(world)`
* `onStart(world)`
* `onStop(world)`
* `onPause(world)`

### `World`

The main ECS facade.

It combines:

* entity management
* component registry/storage
* system scheduling
* event bus
* plugin manager

## World API

### Entity methods

```js
const entity = world.createEntity();
world.destroyEntity(entity);
world.hasEntity(entity);
world.entities();
```

### Component methods

```js
world.defineComponent('Position', { x: 0, y: 0 });
world.addComponent(entity, 'Position', { x: 10, y: 20 });
world.setComponent(entity, 'Position', { x: 10, y: 20 });
world.getComponent(entity, 'Position');
world.hasComponent(entity, 'Position');
world.removeComponent(entity, 'Position');
```

### Query

```js
for (const entity of world.query({ all: ['Position'], none: ['Disabled'] })) {
    const position = world.getComponent(entity, 'Position');
}
```

### System methods

```js
world.registerSystem(new MovementSystem());
world.unregisterSystem(system);
world.update(dt);
world.fixedUpdate(dt);
world.lateUpdate(dt);
```

### Plugin methods

```js
world.use(plugin);
world.unuse(plugin);
```

### Event methods

```js
world.on('spawn', handler);
world.off('spawn', handler);
world.emit('spawn', payload);
```

## Engine Runtime

`Engine` controls the main loop and time management.

Supported lifecycle methods:

* `start()`
* `pause()`
* `stop()`

Constructor options:

* `world`: `World` instance
* `fixedDelta`: fixed timestep in seconds
* `timeScale`: multiplier applied to frame time

```js
import { Engine } from './src/core/engine.js';

const engine = new Engine({ world, fixedDelta: 1 / 60 });
engine.start();
```

### Update order

Each frame the engine does:

1. `world.update(dt)`
2. zero or more `world.fixedUpdate(fixedDelta)` calls
3. `world.lateUpdate(dt)`

## Plugin Authoring

A plugin is a plain object.

```js
const myPlugin = {
    install(world) {
        world.defineComponent('Health', { value: 100 });
    },

    onStart() {
        console.log('engine started');
    },

    uninstall(world) {
        console.log('plugin removed');
    }
};
```

Install it with:

```js
world.use(myPlugin);
```

Uninstall it with:

```js
world.unuse(myPlugin);
```

## Math Primitives

Math utilities are standalone and not tied to ECS.

### `Vec2`

2D vector with:

* `set`
* `copy`
* `clone`
* `add`
* `sub`
* `scale`
* `length`
* `normalize`
* `dot`

### `Vec3`

3D vector with the same core operations plus:

* `cross`

### `Quat`

Quaternion with:

* `identity`
* `normalize`
* `multiply`
* `invert`
* `fromAxisAngle`
* `fromEuler`
* `slerp`
* `toMat4`

### `Mat4`

4x4 matrix with:

* `identity`
* `copy`
* `clone`
* `multiply`
* `multiplyMatrices`
* `translate`
* `scale`
* `rotateX`
* `rotateY`
* `rotateZ`
* `fromQuat`
* `compose`
* `invert`
* `perspective`
* `lookAt`

```js
import { Vec3, Quat, Mat4 } from './src/math/index.js';

const position = new Vec3(1, 2, 3);
const rotation = new Quat().fromEuler(0, Math.PI / 2, 0);
const matrix = new Mat4().compose(position, rotation, new Vec3(1, 1, 1));
```

## Example

```js
import { Engine } from './src/core/engine.js';
import { World } from './src/core/world.js';
import { System } from './src/core/system.js';

const world = new World();

world.defineComponent('Position', { x: 0, y: 0 });
world.defineComponent('Velocity', { x: 0, y: 0 });

class MovementSystem extends System {
    constructor() {
        super({ phase: 'update', order: 0 });
    }

    update(world, dt) {
        for (const entity of world.query({ all: ['Position', 'Velocity'] })) {
            const position = world.getComponent(entity, 'Position');
            const velocity = world.getComponent(entity, 'Velocity');
            position.x += velocity.x * dt;
            position.y += velocity.y * dt;
        }
    }
}

world.registerSystem(new MovementSystem());

const entity = world.createEntity();
world.addComponent(entity, 'Position', { x: 0, y: 0 });
world.addComponent(entity, 'Velocity', { x: 10, y: 5 });

const engine = new Engine({ world });
engine.start();
```

## Guarantees

* No global engine state
* No scene graph
* No transform system in core
* No rendering/input/physics/asset loading in core
* Deterministic fixed-step execution
* Explicit registration for systems and plugins

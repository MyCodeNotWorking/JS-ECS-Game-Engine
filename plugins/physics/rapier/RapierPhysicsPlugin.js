import { World as RapierWorld, EventQueue, Vector2 } from '@dimforge/rapier2d';
import {
    PhysicsDestroySystem,
    PhysicsInitSystem,
    PhysicsPreStepSystem,
    PhysicsStepSystem,
    PhysicsSyncSystem,
} from './PhysicsSystems.js';

/**
 * Wires Rapier2D into the ECS engine as a plugin.
 *
 * Spawn a physics object:
 *   world.addComponent(entity, 'RigidBodyDef', { type: 'dynamic', x: 0, y: 5 });
 *   world.addComponent(entity, 'ColliderDef',  { shape: 'cuboid', hx: 0.5, hy: 0.5 });
 *
 * Apply a one-shot impulse:
 *   world.addComponent(entity, 'PhysicsImpulse', { impulseX: 0, impulseY: 200 });
 *
 * Move a kinematic body:
 *   world.setComponent(entity, 'PhysicsKinematicTarget', { x, y, rotation });
 *
 * Collision events (collider must set activeEvents: 'collision'):
 *   world.on('physics:collisionStart', ({ entityA, entityB }) => { ... });
 *   world.on('physics:collisionEnd',   ({ entityA, entityB }) => { ... });
 *   world.on('physics:contactForce',   ({ entityA, entityB, totalForceMagnitude }) => { ... });
 */
function createRapierPhysics(options = {}) {
    const {
        gravity               = { x: 0.0, y: -9.81 },
        enableCollisionEvents = true,
    } = options;

    return {
        physicsWorld:            null,
        _systems:                null,
        _bodyMap:                null,
        _colliderHandleToEntity: null,
        _eventQueue:             null,

        install(world) {
            this._defineComponents(world);

            this.physicsWorld            = new RapierWorld(new Vector2(gravity.x, gravity.y));
            this._bodyMap                = new Map();
            this._colliderHandleToEntity = new Map();

            if (enableCollisionEvents) {
                this._eventQueue = new EventQueue(true);
            }

            const stepSystem = new PhysicsStepSystem(this.physicsWorld, this._colliderHandleToEntity);
            if (this._eventQueue) stepSystem.setEventQueue(this._eventQueue);

            this._systems = [
                new PhysicsDestroySystem(this.physicsWorld, this._bodyMap, this._colliderHandleToEntity),
                new PhysicsInitSystem(this.physicsWorld, this._bodyMap, this._colliderHandleToEntity),
                new PhysicsPreStepSystem(this.physicsWorld, this._bodyMap),
                stepSystem,
                new PhysicsSyncSystem(this.physicsWorld, this._bodyMap),
            ];

            for (const system of this._systems) {
                world.registerSystem(system);
            }
        },

        uninstall(world) {
            for (const system of this._systems) {
                world.unregisterSystem(system);
            }
            this._systems = null;

            this._bodyMap.clear();
            this._bodyMap = null;

            this._colliderHandleToEntity.clear();
            this._colliderHandleToEntity = null;

            if (this._eventQueue) {
                this._eventQueue.free();
                this._eventQueue = null;
            }

            this.physicsWorld.free();
            this.physicsWorld = null;
        },

        getBody(entity) {
            return this._bodyMap.get(entity)?.body ?? null;
        },

        getCollider(entity) {
            return this._bodyMap.get(entity)?.collider ?? null;
        },

        _defineComponents(world) {
            // type: 'dynamic' | 'static' | 'kinematic_position' | 'kinematic_velocity'
            world.defineComponent('RigidBodyDef', {
                type:            'dynamic',
                x:               0,
                y:               0,
                rotation:        0,
                gravityScale:    1.0,
                canSleep:        true,
                linearDamping:   0.0,
                angularDamping:  0.0,
                linearVelocityX: 0.0,
                linearVelocityY: 0.0,
            });

            // shape: 'cuboid' (hx/hy) | 'ball' (radius) | 'capsule' (halfHeight/radius)
            // activeEvents: 'none' | 'collision' | 'contactForce' | 'all'
            world.defineComponent('ColliderDef', {
                shape:        'cuboid',
                hx:           0.5,
                hy:           0.5,
                radius:       0.5,
                halfHeight:   1.0,
                friction:     0.5,
                restitution:  0.2,
                density:      1.0,
                isSensor:     false,
                activeEvents: 'none',
            });

            // Managed by the plugin — do not set manually.
            world.defineComponent('PhysicsBody', {
                _bodyHandle:     null,
                _colliderHandle: null,
            });

            world.defineComponent('PhysicsTransform', {
                x:        0,
                y:        0,
                rotation: 0,
            });

            world.defineComponent('PhysicsVelocity', {
                x:       0,
                y:       0,
                angular: 0,
            });

            // One-shot: component is removed after the values are applied.
            world.defineComponent('PhysicsImpulse', {
                impulseX:      0,
                impulseY:      0,
                torqueImpulse: 0,
                forceX:        0,
                forceY:        0,
            });

            world.defineComponent('PhysicsKinematicTarget', {
                x:        0,
                y:        0,
                rotation: 0,
            });
        },
    };
}

export default createRapierPhysics;
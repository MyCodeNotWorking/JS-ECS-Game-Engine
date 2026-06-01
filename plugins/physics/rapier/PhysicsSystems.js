import { System } from '../../../engine/src/index.js';
import { RigidBodyDesc, ColliderDesc, ActiveEvents } from '@dimforge/rapier2d';

export class PhysicsDestroySystem extends System {
    constructor(physicsWorld, bodyMap, colliderHandleToEntity) {
        super({ phase: 'update', order: -600 });
        this.physicsWorld           = physicsWorld;
        this.bodyMap                = bodyMap;
        this.colliderHandleToEntity = colliderHandleToEntity;
    }

    update(world, _dt) {
        for (const [entity, { body, collider }] of this.bodyMap) {
            if (!world.hasEntity(entity)) {
                if (collider !== null) {
                    this.colliderHandleToEntity.delete(collider.handle);
                }
                // removeRigidBody also frees attached colliders.
                this.physicsWorld.removeRigidBody(body);
                this.bodyMap.delete(entity);
            }
        }
    }
}

export class PhysicsInitSystem extends System {
    constructor(physicsWorld, bodyMap, colliderHandleToEntity) {
        super({ phase: 'update', order: -500 });
        this.physicsWorld           = physicsWorld;
        this.bodyMap                = bodyMap;
        this.colliderHandleToEntity = colliderHandleToEntity;
    }

    update(world, _dt) {
        for (const entity of world.query({ all: ['RigidBodyDef'], none: ['PhysicsBody'] })) {
            this._spawn(world, entity);
        }
    }

    _spawn(world, entity) {
        const { physicsWorld } = this;
        const def = world.getComponent(entity, 'RigidBodyDef');

        let bodyDesc;
        switch (def.type) {
            case 'static':             bodyDesc = RigidBodyDesc.fixed();                    break;
            case 'kinematic_position': bodyDesc = RigidBodyDesc.kinematicPositionBased();   break;
            case 'kinematic_velocity': bodyDesc = RigidBodyDesc.kinematicVelocityBased();   break;
            default:                   bodyDesc = RigidBodyDesc.dynamic();
        }

        bodyDesc
            .setTranslation(def.x, def.y)
            .setRotation(def.rotation)
            .setGravityScale(def.gravityScale)
            .setLinearDamping(def.linearDamping)
            .setAngularDamping(def.angularDamping)
            .setCanSleep(def.canSleep);

        if (def.linearVelocityX !== 0 || def.linearVelocityY !== 0) {
            bodyDesc.setLinvel(def.linearVelocityX, def.linearVelocityY);
        }

        const body = physicsWorld.createRigidBody(bodyDesc);

        let collider = null;
        if (world.hasComponent(entity, 'ColliderDef')) {
            const cd = world.getComponent(entity, 'ColliderDef');

            let colliderDesc;
            switch (cd.shape) {
                case 'ball':    colliderDesc = ColliderDesc.ball(cd.radius);                    break;
                case 'capsule': colliderDesc = ColliderDesc.capsule(cd.halfHeight, cd.radius);  break;
                default:        colliderDesc = ColliderDesc.cuboid(cd.hx, cd.hy);
            }

            colliderDesc
                .setFriction(cd.friction)
                .setRestitution(cd.restitution)
                .setDensity(cd.density)
                .setSensor(cd.isSensor);

            let activeEvents = 0;
            if (cd.activeEvents === 'collision'    || cd.activeEvents === 'all') activeEvents |= ActiveEvents.COLLISION_EVENTS;
            if (cd.activeEvents === 'contactForce' || cd.activeEvents === 'all') activeEvents |= ActiveEvents.CONTACT_FORCE_EVENTS;
            if (activeEvents !== 0) colliderDesc.setActiveEvents(activeEvents);

            collider = physicsWorld.createCollider(colliderDesc, body);
            this.colliderHandleToEntity.set(collider.handle, entity);
        }

        this.bodyMap.set(entity, { body, collider });

        world.addComponent(entity, 'PhysicsBody', {
            _bodyHandle:     body.handle,
            _colliderHandle: collider?.handle ?? null,
        });

        if (!world.hasComponent(entity, 'PhysicsTransform')) {
            world.addComponent(entity, 'PhysicsTransform', { x: def.x, y: def.y, rotation: def.rotation });
        }
        if (!world.hasComponent(entity, 'PhysicsVelocity')) {
            world.addComponent(entity, 'PhysicsVelocity', { x: 0, y: 0, angular: 0 });
        }
    }
}

export class PhysicsPreStepSystem extends System {
    constructor(physicsWorld, bodyMap) {
        super({ phase: 'fixedUpdate', order: -100 });
        this.physicsWorld = physicsWorld;
        this.bodyMap      = bodyMap;
    }

    fixedUpdate(world, _dt) {
        for (const entity of world.query({ all: ['PhysicsBody', 'PhysicsImpulse'] })) {
            const entry = this.bodyMap.get(entity);
            if (!entry) continue;

            const { body } = entry;
            const impulse  = world.getComponent(entity, 'PhysicsImpulse');

            if (impulse.impulseX !== 0 || impulse.impulseY !== 0) {
                body.applyImpulse({ x: impulse.impulseX, y: impulse.impulseY }, true);
            }
            if (impulse.torqueImpulse !== 0) {
                body.applyTorqueImpulse(impulse.torqueImpulse, true);
            }
            if (impulse.forceX !== 0 || impulse.forceY !== 0) {
                body.addForce({ x: impulse.forceX, y: impulse.forceY }, true);
            }

            world.removeComponent(entity, 'PhysicsImpulse');
        }

        for (const entity of world.query({ all: ['PhysicsBody', 'PhysicsKinematicTarget'] })) {
            const entry = this.bodyMap.get(entity);
            if (!entry) continue;

            const { body } = entry;
            const target   = world.getComponent(entity, 'PhysicsKinematicTarget');

            body.setNextKinematicTranslation({ x: target.x, y: target.y });
            body.setNextKinematicRotation(target.rotation);
        }
    }
}

export class PhysicsStepSystem extends System {
    constructor(physicsWorld, colliderHandleToEntity) {
        super({ phase: 'fixedUpdate', order: 0 });
        this.physicsWorld           = physicsWorld;
        this.colliderHandleToEntity = colliderHandleToEntity;
        this._eventQueue            = null;
    }

    setEventQueue(eventQueue) {
        this._eventQueue = eventQueue;
    }

    fixedUpdate(world, dt) {
        this.physicsWorld.timestep = dt;

        if (this._eventQueue) {
            this.physicsWorld.step(this._eventQueue);
            this._drainEvents(world);
        } else {
            this.physicsWorld.step();
        }
    }

    _drainEvents(world) {
        const lookup = this.colliderHandleToEntity;

        this._eventQueue.drainCollisionEvents((handle1, handle2, started) => {
            world.emit(started ? 'physics:collisionStart' : 'physics:collisionEnd', {
                entityA: lookup.get(handle1) ?? null,
                entityB: lookup.get(handle2) ?? null,
                handle1,
                handle2,
            });
        });

        this._eventQueue.drainContactForceEvents((event) => {
            world.emit('physics:contactForce', {
                entityA:             lookup.get(event.collider1()) ?? null,
                entityB:             lookup.get(event.collider2()) ?? null,
                totalForce:          event.totalForce(),
                totalForceMagnitude: event.totalForceMagnitude(),
            });
        });
    }
}

export class PhysicsSyncSystem extends System {
    constructor(physicsWorld, bodyMap) {
        super({ phase: 'fixedUpdate', order: 100 });
        this.physicsWorld = physicsWorld;
        this.bodyMap      = bodyMap;
    }

    fixedUpdate(world, _dt) {
        for (const entity of world.query({ all: ['PhysicsBody', 'PhysicsTransform'] })) {
            const entry = this.bodyMap.get(entity);
            if (!entry) continue;

            const { body } = entry;
            if (body.isSleeping()) continue;

            const pos    = body.translation();
            const rot    = body.rotation();
            const linvel = body.linvel();
            const angvel = body.angvel();

            const transform    = world.getComponent(entity, 'PhysicsTransform');
            transform.x        = pos.x;
            transform.y        = pos.y;
            transform.rotation = rot;

            if (world.hasComponent(entity, 'PhysicsVelocity')) {
                const velocity   = world.getComponent(entity, 'PhysicsVelocity');
                velocity.x       = linvel.x;
                velocity.y       = linvel.y;
                velocity.angular = angvel;
            }
        }
    }
}
/**
 * GameScene.js — demonstrates the Rapier physics plugin
 *
 * Physics units are in metres; the PixiRenderer plugin scales the stage so
 * 1 unit ≈ a sensible on-screen size.  Adjust SCALE to taste.
 */

import { Container, Graphics } from 'pixi.js';

const SCALE = 60; // pixels per physics unit

// ── Helpers ──────────────────────────────────────────────────────────────────

function physToScreen(x, y) {
    return { sx: x * SCALE, sy: -y * SCALE }; // Pixi Y is down; Rapier Y is up
}

function createBoxGraphic(hx, hy, color = 0x4488ff) {
    const g = new Graphics();
    g.rect(-hx * SCALE, -hy * SCALE, hx * SCALE * 2, hy * SCALE * 2).fill(color);
    return g;
}

function createBallGraphic(radius, color = 0xff4444) {
    const g = new Graphics();
    g.circle(0, 0, radius * SCALE).fill(color);
    return g;
}

// ── Scene factory ─────────────────────────────────────────────────────────────

function createGameScene({ app, physicsPlugin, onBack }) {
    let container   = null;
    let graphics    = new Map(); // entity → Pixi DisplayObject
    let boxes       = [];
    let ball        = null;

    // ── Build the scene ───────────────────────────────────────────────────────

    function spawnGround(world) {
        const ground = world.createEntity();
        world.addComponent(ground, 'RigidBodyDef', { type: 'static', x: 0, y: -3 });
        world.addComponent(ground, 'ColliderDef',  { shape: 'cuboid', hx: 7, hy: 0.3,
                                                     friction: 0.8, restitution: 0.1 });
        const g = createBoxGraphic(7, 0.3, 0x334466);
        container.addChild(g);
        graphics.set(ground, g);
        return ground;
    }

    function spawnBox(world, x, y) {
        const entity = world.createEntity();
        world.addComponent(entity, 'RigidBodyDef', {
            type: 'dynamic', x, y, gravityScale: 1,
        });
        world.addComponent(entity, 'ColliderDef', {
            shape: 'cuboid', hx: 0.4, hy: 0.4,
            friction: 0.5, restitution: 0.3,
            activeEvents: 'collision',
        });
        const g = createBoxGraphic(0.4, 0.4, 0x4488ff);
        container.addChild(g);
        graphics.set(entity, g);
        boxes.push(entity);
        return entity;
    }

    function spawnBall(world) {
        const entity = world.createEntity();
        world.addComponent(entity, 'RigidBodyDef', {
            type: 'dynamic', x: -4, y: 6,
            linearVelocityX: 6, linearVelocityY: 0,
        });
        world.addComponent(entity, 'ColliderDef', {
            shape: 'ball', radius: 0.45,
            friction: 0.3, restitution: 0.7,
            activeEvents: 'collision',
        });
        const g = createBallGraphic(0.45, 0xff4444);
        container.addChild(g);
        graphics.set(entity, g);
        return entity;
    }

    function spawnKinematicPlatform(world) {
        const entity = world.createEntity();
        world.addComponent(entity, 'RigidBodyDef', {
            type: 'kinematic_position', x: 0, y: 1.5,
        });
        world.addComponent(entity, 'ColliderDef', {
            shape: 'cuboid', hx: 2, hy: 0.2, friction: 0.5, restitution: 0,
        });
        world.addComponent(entity, 'PhysicsKinematicTarget', { x: 0, y: 1.5, rotation: 0 });
        const g = createBoxGraphic(2, 0.2, 0x44cc88);
        container.addChild(g);
        graphics.set(entity, g);
        return entity;
    }

    // ── Scene interface ───────────────────────────────────────────────────────

    return {
        enter(world) {
            container = new Container();

            // Centre the stage on x=0, y=0 in physics space
            container.x = 400;
            container.y = 350;
            app.stage.addChild(container);

            // Spawn objects
            spawnGround(world);
            for (let i = 0; i < 5; i++) {
                spawnBox(world, -2 + i * 1.0, 4 + i * 1.2);
            }
            ball = spawnBall(world);
            const platform = spawnKinematicPlatform(world);

            // Collision events — tint boxes on impact
            world.on('physics:collisionStart', ({ entityA, entityB }) => {
                for (const e of [entityA, entityB]) {
                    if (boxes.includes(e)) {
                        const g = graphics.get(e);
                        if (g) g.tint = 0xff8800;
                        setTimeout(() => { if (g) g.tint = 0xffffff; }, 120);
                    }
                }
            });

            // Animate kinematic platform in lateUpdate via ECS
            let t = 0;
            this._platformEntity = platform;
            this._getT = () => t;
            this._tickT = (dt) => { t += dt; };
        },

        lateUpdate(world, dt) {
            // Move kinematic platform
            const t       = this._getT?.() ?? 0;
            this._tickT?.(dt);
            const target  = world.getComponent(this._platformEntity, 'PhysicsKinematicTarget');
            if (target) {
                target.x = Math.sin(t * 1.2) * 3;
                target.y = 1.5;
            }

            // Sync Pixi graphics with PhysicsTransform
            for (const [entity, gfx] of graphics) {
                if (!world.hasComponent(entity, 'PhysicsTransform')) continue;
                const { x, y, rotation } = world.getComponent(entity, 'PhysicsTransform');
                const { sx, sy }         = physToScreen(x, y);
                gfx.x        = sx;
                gfx.y        = sy;
                gfx.rotation = -rotation; // Rapier CCW, Pixi CW
            }
        },

        exit(world) {
            // Destroy all physics entities
            for (const entity of [...boxes, ball, this._platformEntity]) {
                if (entity != null && world.hasEntity(entity)) {
                    world.destroyEntity(entity);
                }
            }
            boxes   = [];
            ball    = null;
            graphics.clear();
            container.destroy({ children: true });
            container = null;
        },
    };
}

export default createGameScene;

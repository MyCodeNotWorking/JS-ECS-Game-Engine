import { Engine, World as EngineWorld, System } from "../../engine/src/index.js";
import { createPixiRenderer, createSceneManager, createInput, createRapierPixi } from '../../plugins/index.js';
import { Container, Graphics } from "pixi.js";
import { World as PhysicsWorld, RigidBodyDesc, ColliderDesc } from "@dimforge/rapier2d";
import { Viewport } from "pixi-viewport";

const world = new EngineWorld();
const engine = new Engine({ world, fixedDelta: 1/60 });

const pixiPlugin 	   = createPixiRenderer();
const scenePlugin 	   = createSceneManager();
const inputPlugin 	   = createInput();
const rapierPixiPlugin = createRapierPixi();

await pixiPlugin.init();

[
    pixiPlugin,
    scenePlugin,
    inputPlugin,
    rapierPixiPlugin
].forEach(plugin => world.use(plugin));

const physicsWorld = new PhysicsWorld({ x: 0, y: -50 })

world.defineComponent("RapierPixi", {
	collider: null,
	graphics: null,
});

function syncRapierPixi(c, g) {
    const pos = c.translation();
    const rot = c.rotation();
    g.position.set(pos.x, -pos.y);
    g.rotation = rot;
    switch(c.shapeType()) {
        case 0:
            g.scale.set(c.radius(), c.radius());
            break;
        case 1:
            g.scale.set(c.halfExtents().x, c.halfExtents().y);
            break;
        case 2:
            g.scale.set(c.radius(), c.halfHeight() + c.radius());
            break;                
    }
}

class RapierPhysicsStepSystem extends System {
  	constructor() {
    	super({ phase: "fixedUpdate", order: 0 });
  	}

  	fixedUpdate(world, dt) {
    	physicsWorld.step();
  	}
}

class RapierPixiSyncSystem extends System {
  	constructor() {
    	super({ phase: "lateUpdate", order: 0 });
  	}

  	lateUpdate(world, dt) {
    	for (const entity of world.query({ all: ["RapierPixi"] })) {
      		const sync = world.getComponent(entity, "RapierPixi");
      		if (!sync?.collider || !sync?.graphics) continue;
      		syncRapierPixi(sync.collider, sync.graphics);
    	}
  	}
}

world.registerSystem(new RapierPhysicsStepSystem());
world.registerSystem(new RapierPixiSyncSystem());

function makeRigidBodyObject({ world, physicsWorld, vp, rbd, cd, gfx }) {
	const e = world.createEntity();
	const r = physicsWorld.createRigidBody(rbd);
	const c = physicsWorld.createCollider(cd, r);
	vp.addChild(gfx);
	world.addComponent(e, "RapierPixi", { collider: c, graphics: gfx });
	return {
		e,
		r,
		c,
		gfx
	}
}

function createGameScene({ app }) {
	let viewport;		
	return {
		enter(world) {
			viewport = new Viewport({
			  	screenWidth: window.innerWidth,
			  	screenHeight: window.innerHeight,
			  	worldWidth: 1000,
			  	worldHeight: 1000,
			  	events: app.renderer.events, // the interaction module is important for wheel to work properly when renderer.view is placed or scaled
			});
			viewport.drag().pinch().wheel().decelerate();
			viewport.setZoom(50);
			pixiPlugin.addDebugCoordinateSystem(viewport, 100);
			const box = makeRigidBodyObject({
				world: world, physicsWorld: physicsWorld, vp: viewport, 
				rbd: RigidBodyDesc.dynamic().setTranslation(0, 0),
				cd: ColliderDesc.cuboid(5, 5),
				gfx: new Graphics().rect(-1, -1, 2, 2).fill("red")
			});
			const ground = makeRigidBodyObject({
				world: world, physicsWorld: physicsWorld, vp: viewport, 
				rbd: RigidBodyDesc.fixed().setTranslation(0, -20),
				cd: ColliderDesc.cuboid(20, 2),
				gfx: new Graphics().rect(-1, -1, 2, 2).fill("green")
			});
			app.stage.addChild(viewport);
		}
	}
}

const sm = scenePlugin.sceneManager;
sm.register('game', createGameScene({ app: pixiPlugin.app }));
sm.load(world, 'game');
engine.start();
import { Engine, World } from "../../engine/src/index.js";
import { createPixiRenderer, createSceneManager, createRapierPhysics, createInput } from '../../plugins/index.js';
import { Container, Graphics } from "pixi.js";
import { Viewport } from "pixi-viewport";

const world = new World();
const engine = new Engine({ world, fixedDelta: 1/60 });

const pixiPlugin 	= createPixiRenderer();
const scenePlugin 	= createSceneManager();
const physicsPlugin = createRapierPhysics();
const inputPlugin 	= createInput();

await pixiPlugin.init();

world.use(pixiPlugin);
world.use(scenePlugin);
world.use(physicsPlugin);
world.use(inputPlugin);

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
			pixiPlugin.addDebugCoordinateSystem(viewport, 100);			
			const rect = new Graphics().rect(100, 0, 100, 100).fill('red');
			viewport.addChild(rect);
			app.stage.addChild(viewport);
		}
	}
}

const sm = scenePlugin.sceneManager;
sm.register('game', createGameScene({ app: pixiPlugin.app }));
sm.load(world, 'game');
engine.start();
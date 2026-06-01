import { Engine, World } from '../../engine/src/index.js';
import { createPixiRenderer, createSceneManager, createRapierPhysics } from '../../plugins/index.js';
import createGameScene from './GameScene.js';

const world  = new World();
const engine = new Engine({ world, fixedDelta: 1 / 60 });

// ── Plugins ───────────────────────────────────────────────────────────────────

const pixiPlugin    = createPixiRenderer();
const scenePlugin   = createSceneManager();
const physicsPlugin = createRapierPhysics({ gravity: { x: 0, y: -9.81 } });

await pixiPlugin.init();

world.use(pixiPlugin);
world.use(physicsPlugin);
world.use(scenePlugin);

// ── Scenes ────────────────────────────────────────────────────────────────────

const sm = scenePlugin.sceneManager;

sm.register('game', createGameScene({
    app:           pixiPlugin.app,
    physicsPlugin,
}));

sm.load(world, 'game');
engine.start();

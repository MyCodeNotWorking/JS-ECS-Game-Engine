import { Engine, World } from "../../engine/src/index.js";
import { createSceneManager, createPixiRenderer } from "../../plugins/index.js";
import createMenuScene from "./MenuScene.js";

const world = new World();
const engine = new Engine({ world });

const pixiPlugin = createPixiRenderer();
await pixiPlugin.init();
const scenePlugin = createSceneManager();
world.use(pixiPlugin);
world.use(scenePlugin);

const sm = scenePlugin.sceneManager;
sm.register('menu', createMenuScene({
    app: pixiPlugin.app,
    onStart: () => sm.load(world, 'game'),
}));
sm.load(world, 'menu');

engine.start();
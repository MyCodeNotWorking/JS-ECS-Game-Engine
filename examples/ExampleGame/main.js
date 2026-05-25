import { Engine, World } from "../../engine/src/index.js";
import { SceneManager, createPixiRenderer } from "./extras/index.js";

const world = new World();
const engine = new Engine({ world });

const scenes = new SceneManager(world);

const pixiRenderer = createPixiRenderer({
  	designWidth: 1920,
  	designHeight: 1080,
  	backgroundColor: 0x000000
});
world.use(pixiRenderer);

engine.start();
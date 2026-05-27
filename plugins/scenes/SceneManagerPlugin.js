import SceneManager from './SceneManager.js';
import { SceneUpdateBridge, SceneFixedBridge, SceneLateBridge } from './SceneBridgeSystems.js';

function createSceneManager() {
    return {
        sceneManager: null,
        _bridges: null,

        install(world) {
            this.sceneManager = new SceneManager();

            this._bridges = [
                new SceneUpdateBridge(this.sceneManager),
                new SceneFixedBridge(this.sceneManager),
                new SceneLateBridge(this.sceneManager),
            ];

            for (const bridge of this._bridges) {
                world.registerSystem(bridge);
            }
        },

        uninstall(world) {
            for (const bridge of this._bridges) {
                world.unregisterSystem(bridge);
            }
            this._bridges = null;

            this.sceneManager.clear(world);
            this.sceneManager = null;
        }
    };
}

export default createSceneManager;
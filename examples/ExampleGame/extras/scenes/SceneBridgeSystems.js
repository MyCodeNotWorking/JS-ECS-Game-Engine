import { System } from "../../../../engine/src/index.js";

class SceneUpdateBridge extends System {
    constructor(sceneManager) {
        super({ phase: 'update', order: -1000 });
        this.sceneManager = sceneManager;
    }
    update(world, dt) {
        this.sceneManager.update(dt);
    }
}

class SceneFixedBridge extends System {
    constructor(sceneManager) {
        super({ phase: 'fixedUpdate', order: -1000 });
        this.sceneManager = sceneManager;
    }
    fixedUpdate(world, dt) {
        this.sceneManager.fixedUpdate(dt);
    }
}

class SceneLateBridge extends System {
    constructor(sceneManager) {
        super({ phase: 'lateUpdate', order: -1000 });
        this.sceneManager = sceneManager;
    }
    lateUpdate(world, dt) {
        this.sceneManager.lateUpdate(dt);
    }
}

export { SceneUpdateBridge, SceneFixedBridge, SceneLateBridge };
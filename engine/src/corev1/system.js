// src/core/system.js
export class System {
    constructor({ name = '', phase = 'update', order = 0, enabled = true } = {}) {
        this.name = name;
        this.phase = phase;
        this.order = order;
        this.enabled = enabled;
    }

    update() {}
    fixedUpdate() {}
    lateUpdate() {}
}
// src/core/logger.js
const LEVELS = Object.freeze({
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    off: 4
});

export class Logger {
    constructor({ level = 'info', sink = console } = {}) {
        if (!(level in LEVELS)) {
            throw new TypeError(`Unknown logger level: ${level}`);
        }
        this.level = level;
        this.sink = sink;
    }

    setLevel(level) {
        if (!(level in LEVELS)) {
            throw new TypeError(`Unknown logger level: ${level}`);
        }
        this.level = level;
    }

    debug(...args) {
        if (LEVELS[this.level] <= LEVELS.debug) this.sink.debug(...args);
    }

    info(...args) {
        if (LEVELS[this.level] <= LEVELS.info) this.sink.info(...args);
    }

    warn(...args) {
        if (LEVELS[this.level] <= LEVELS.warn) this.sink.warn(...args);
    }

    error(...args) {
        if (LEVELS[this.level] <= LEVELS.error) this.sink.error(...args);
    }
}

export { LEVELS as LoggerLevels };
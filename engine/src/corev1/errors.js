// src/core/errors.js
export class EngineError extends Error {
    constructor(code, message, details = undefined) {
        super(message);
        this.name = 'EngineError';
        this.code = code;
        this.details = details;
    }
}
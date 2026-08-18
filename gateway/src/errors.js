export class GatewayError extends Error {
    constructor(code, message, { status = 500, retryable = false, cause } = {}) {
        super(message, { cause });
        this.name = 'GatewayError';
        this.code = code;
        this.status = status;
        this.retryable = retryable;
    }
}

export class StateConflictError extends GatewayError {
    constructor(message = 'State changed concurrently', cause) {
        super('STATE_CONFLICT', message, { status: 409, retryable: true, cause });
        this.name = 'StateConflictError';
    }
}

export const EVENT_INBOUND = 'inbound'
export const EVENT_OUTBOUND = 'outbound'
export const EVENT_OPEN = 'open'
export const EVENT_CLOSE = 'close'
export const EVENT_ERROR = 'error'
export const EVENT_CONFIG = 'configure'
export const EVENT_CERT = 'cert'
export const EVENT_HANDSHAKE = 'handshake'

export const createMessage = (event, message) => ({ event, message })

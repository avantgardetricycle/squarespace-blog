/**
 * Handles /api/* except routes with dedicated files (health, webhooks, queues).
 * Required so Express sees full paths like /api/dashboard/me (rewrites to /api strip the path).
 */
export { default } from './express-handler.js'

import 'dotenv/config'
import serverless from 'serverless-http'
import { createApp } from '../server/dist/app.js'

const app = createApp({ mountStripeWebhook: false })

export default serverless(app)

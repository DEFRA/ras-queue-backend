import { SQSClient } from '@aws-sdk/client-sqs'

import { config } from '~/src/config/index.js'
import { createLogger } from '~/src/helpers/logging/logger.js'

const logger = createLogger()
const sqsClientPlugin = {
  plugin: {
    name: 'sqsClient',
    version: '0.1.0',
    register: (server) => {
      const client = new SQSClient({
        region: config.get('awsRegion'),
        endpoint: config.get('sqsEndpoint'),
        logger: {
          trace: (...content) => {
            logger.info(JSON.stringify(content))
          },
          debug: (...content) => {
            logger.info(JSON.stringify(content))
          },
          info: (...content) => {
            logger.info(JSON.stringify(content))
          },
          warn: (...content) => {
            logger.info(JSON.stringify(content))
          },
          error: (...content) => {
            logger.info(JSON.stringify(content))
          }
        }
      })

      server.decorate('server', 'sqs', client)

      server.events.on('stop', () => {
        server.logger.info(`Closing SQS client`)
        client.destroy()
      })
    }
  }
}

export { sqsClientPlugin }

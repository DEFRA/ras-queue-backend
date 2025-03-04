import { SQSClient } from '@aws-sdk/client-sqs'
import { config } from '~/src/config/index.js'
import { createLogger } from '~/src/api/common/helpers/logging/logger.js'

const logger = createLogger()
export const sqsClient = new SQSClient({
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
  },
  region: config.get('awsRegion'),
  endpoint: config.get('sqsEndpoint')
})

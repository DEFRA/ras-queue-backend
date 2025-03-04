import { SQSClient } from '@aws-sdk/client-sqs'
import { config } from '~/src/config/index.js'

export const sqsClient = new SQSClient({
  logger: {
    ...console
  },
  region: config.get('awsRegion'),
  endpoint: config.get('sqsEndpoint')
})

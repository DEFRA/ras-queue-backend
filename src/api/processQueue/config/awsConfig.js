import { SQSClient } from '@aws-sdk/client-sqs'
import { config } from '~/src/config/index.js'
import { fromIni } from '@aws-sdk/credential-providers'

const awsRegion = config.get('awsRegion')
const awsEndPoint = config.get('awsSQSEndPoint')

export const sqsClient = new SQSClient({
  region: awsRegion,
  endpoint: awsEndPoint,
  credentials: fromIni()
})

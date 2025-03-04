import { SQSClient } from '@aws-sdk/client-sqs'
// import { config } from '~/src/config/index.js'

// const awsRegion = config.get('awsRegion')
// const awsEndPoint = config.get('awsSQSEndPoint')

export const sqsClient = new SQSClient({})

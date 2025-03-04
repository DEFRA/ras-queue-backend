import { createLogger } from '~/src/api/common/helpers/logging/logger.js'
import { sqsClient } from '~/src/api/processQueue/config/awsConfig.js'
import { transformExcelData } from './transformService.js'
import { queueInitialInfo } from '~/src/api/common/constants/queue-initial-data.js'
import { fetchFileContent } from './sharepointService.js'
import { config } from '~/src/config/index.js'
import {
  DeleteMessageCommand,
  ReceiveMessageCommand
} from '@aws-sdk/client-sqs'
import { fromNodeProviderChain } from '@aws-sdk/credential-providers'

const logger = createLogger()
const awsQueueUrl = config.get('awsQueueUrl')

export const getSqsMessages = async () => {
  const params = {
    QueueUrl: awsQueueUrl,
    MaxNumberOfMessages: 5,
    WaitTimeSeconds: 10
  }
  logger.info(`Queue URL: ${params.QueueUrl}`)
  try {
    const data = await sqsClient.send(new ReceiveMessageCommand(params))
    logger.info(`messages in SQS queue:, ${data.Messages.length}`)
    if (data.Messages && data.Messages.length > 0) {
      for (const message of data.Messages) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        queueInitialInfo.map(async (record) => {
          if (record.fileName === JSON.parse(message.Body).fileName) {
            record.data = await fetchFileContent(record.filePath)
          }
          return record
        })
        await transformExcelData(queueInitialInfo)
      }
      // Delete message from SQS
      for (const message of data.Messages) {
        await deleteMessage(message.ReceiptHandle)
      }
    } else {
      logger.info('No messages available to process')
    }
  } catch (error) {
    logger.error(`Error receiving messages: ${JSON.stringify(error)}`)
  }
}

export const deleteMessage = async (receiptHandle) => {
  const params = {
    QueueUrl: awsQueueUrl,
    ReceiptHandle: receiptHandle
  }

  try {
    await sqsClient.send(new DeleteMessageCommand(params))
    logger.info('Message deleted successfully')
  } catch (error) {
    logger.error('Error deleting message:', error)
  }
}

export const testCredentials = async () => {
  try {
    const provider = fromNodeProviderChain()
    const credentials = await provider()
    logger.info(`AWS Credentials: ${JSON.stringify(credentials)}`)
  } catch (error) {
    logger.error(`CredentialsProviderError: ${JSON.stringify(error)}`)
  }
}

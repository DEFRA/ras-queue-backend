import { createLogger } from '~/src/api/common/helpers/logging/logger.js'
import { transformExcelData } from './transformService.js'
import { queueInitialInfo } from '~/src/api/common/constants/queue-initial-data.js'
import { fetchFileContent } from './sharepointService.js'
import { config } from '~/src/config/index.js'
import {
  DeleteMessageCommand,
  GetQueueUrlCommand,
  ReceiveMessageCommand
} from '@aws-sdk/client-sqs'

const logger = createLogger()
const awsQueueUrl = config.get('awsQueueUrl')

export const getSqsMessages = async (client) => {
  const params = {
    QueueUrl: awsQueueUrl,
    MaxNumberOfMessages: 5,
    WaitTimeSeconds: 10
  }
  logger.info(`Queue URL: ${params.QueueUrl}`)
  try {
    const data = await client.send(new ReceiveMessageCommand(params))
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

export const deleteMessage = async (client, receiptHandle) => {
  const params = {
    QueueUrl: awsQueueUrl,
    ReceiptHandle: receiptHandle
  }

  try {
    await client.send(new DeleteMessageCommand(params))
    logger.info('Message deleted successfully')
  } catch (error) {
    logger.error('Error deleting message:', error)
  }
}

export const testSqsClient = async (client) => {
  try {
    logger.info('about to test testSqsClient getQueueUrl')
    const cmd = new GetQueueUrlCommand({ QueueName: 'ras_automation_backend' })
    const response = await client.send(cmd)
    logger.info(`testSqsClient getQueueUrl: ${response?.QueueUrl}`)
  } catch (error) {
    logger.error(`failed to get queue url ${error}`)
  }
}

export const testCredentials = (client) => {
  try {
    logger.info(`AWS Credentials: ${JSON.stringify(client.config)}`)
  } catch (error) {
    logger.error(
      `testCredentials CredentialsProviderError: ${JSON.stringify(error)}`
    )
  }
}

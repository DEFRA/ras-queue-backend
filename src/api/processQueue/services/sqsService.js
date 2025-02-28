import { createLogger } from '~/src/api/common/helpers/logging/logger.js'
import { sqsClient } from '~/src/api/processQueue/config/awsConfig.js'
import { transformExcelData } from './transformService.js'
import { queueInitialInfo } from '~/src/api/common/constants/queue-initial-data.js'
// import { fetchFileContent } from './sharepointService.js'
import { config } from '~/src/config/index.js'
import {
  DeleteMessageCommand,
  ReceiveMessageCommand
} from '@aws-sdk/client-sqs'

const logger = createLogger()
const awsQueueUrl = config.get('awsQueueUrl')

export const getSqsMessages = async () => {
  await transformExcelData(queueInitialInfo)
  const params = {
    QueueUrl: awsQueueUrl,
    MaxNumberOfMessages: 5,
    WaitTimeSeconds: 10,
    VisibilityTimeout: 30
  }
  try {
    const data = await sqsClient.send(new ReceiveMessageCommand(params))
    logger.info('messages in SQS queue', JSON.stringify(data.Messages))
    // if (data.Messages && data.Messages.length > 0) {
    //   for (const message of data.Messages) {
    //     queueInitialInfo.map((record) => {
    //       if (record.fileName === message.MessageBody.fileName) {
    //         record.data = fetchFileContent(record.filePath)
    //       }
    //       return record
    //     })
    //     await transformExcelData(queueInitialInfo)
    //   }
    //   // Delete message from SQS
    //   for (const message of data.Messages) {
    //     await deleteMessage(message.ReceiptHandle)
    //   }
    // } else {
    //   logger.info('No messages available to process')
    // }
  } catch (error) {
    logger.error('Error receiving messages:', error)
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

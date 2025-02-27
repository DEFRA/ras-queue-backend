import { createLogger } from '~/src/api/common/helpers/logging/logger.js'
import { queueUrl, sqs } from '~/src/api/processQueue/config/awsConfig.js'
import { transformExcelData } from './transformService.js'
import { queueInitialInfo } from '~/src/api/common/constants/queue-initial-data.js'
import { fetchFileContent } from './sharepointService.js'

const logger = createLogger()

export const getSqsMessages = async () => {
  const params = {
    QueueUrl:
      'https://sqs.eu-west-2.amazonaws.com/332499610595/ras_automation_backend',
    MaxNumberOfMessages: 10,
    WaitTimeSeconds: 5,
    VisibilityTimeout: 30
  }
  try {
    const data = await sqs.receiveMessage(params).promise()
    logger.info('messages in SQS queue', JSON.stringify(data.Messages))
    if (data.Messages) {
      for (const message of data.Messages) {
        queueInitialInfo.map((record) => {
          if (record.fileName === message.messageBody.fileName) {
            record.data = fetchFileContent(record.filePath)
          }
          return record
        })
        await transformExcelData(queueInitialInfo)
        // Delete message from SQS
        await deleteMessage(message.ReceiptHandle)
      }
    } else {
      return []
    }
  } catch (error) {
    logger.error('Error consuming messages from SQS:', error)
  }
}

export const deleteMessage = async (receiptHandle) => {
  const params = {
    QueueUrl: queueUrl,
    ReceiptHandle: receiptHandle
  }

  try {
    await sqs.deleteMessage(params).promise()
  } catch (error) {
    logger.error('Error deleting message:', error)
  }
}

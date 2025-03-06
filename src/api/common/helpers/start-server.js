import { config } from '../../../config/index.js'
import { createServer } from '../../../api/index.js'
import { createLogger } from '../../../api/common/helpers/logging/logger.js'
import { fetchFileContent } from '../../processQueue/services/sharepointService.js'
import {
  queueInitialInfo,
  REQUIRED_FILES
} from '../constants/queue-initial-data.js'
import { fetchFileInfo } from '../../common/services/getFiles.js'
import {
  sharePointFileinfo,
  findMissingFiles
} from '../../common/helpers/file-info.js'
import { transformExcelData } from '../../processQueue/services/transformService.js'
import fs from 'fs'
import { sendEmails } from '~/src/api/processQueue/services/emailService.js'
import {
  testCredentials,
  testSqsClient,
  deleteMessage
} from '../../processQueue/services/sqsService.js'
import { Consumer } from 'sqs-consumer'

let sharePointFile
const awsQueueUrl = config.get('awsQueueUrl')

async function startServer() {
  let server
  const logger = createLogger()

  try {
    server = await createServer()
    await server.start()
    server.logger.info('Server started successfully')
    server.logger.info(
      `Access your backend on http://localhost:${config.get('port')}`
    )

    testCredentials(server.sqs)
    await testSqsClient(server.sqs)

    const fileInfo = await fetchFileInfo()
    sharePointFile = sharePointFileinfo(fileInfo)

    for (const message of queueInitialInfo) {
      const { filePath, fileName } = message

      // Fetch file content from SharePoint
      const fileContent = await fetchFileContent(filePath)
      fs.writeFileSync(fileName, fileContent)
    }

    const options = {
      config: {
        waitTimeSeconds: 20,
        pollingWaitTimeMs: 1 * 60000,
        batchSize: 5
      }
    }

    const batchMessageHandler = async (messages) => {
      try {
        if (!messages || messages.length === 0) {
          logger.info('No messages available to process')
          return
        }
        logger.info(`data message inside: ${JSON.stringify(messages)}`)

        for (const message of messages) {
          try {
            const parsedMessage = JSON.parse(message.Body)
            const { fileName } = parsedMessage
            const { filePath } = queueInitialInfo.find(
              (file) => file.fileName === fileName
            )
            const fileContent = await fetchFileContent(filePath)
            fs.writeFileSync(fileName, fileContent)

            // Check if files are missing before processing
            const fileInfo = await fetchFileInfo()
            const filesInSharePoint = fileInfo.value.map((data) => data.name)
            const missingFiles = findMissingFiles(
              REQUIRED_FILES,
              filesInSharePoint
            )

            if (missingFiles && missingFiles.length > 0) {
              logger.info(
                missingFiles.length > 0 ??
                  `Missing files: ${missingFiles.join(', ')}`
              )
              return
            }

            await transformExcelData()
            await sendEmails()
            await deleteMessage(server.sqs, message.ReceiptHandle)
            logger.info(
              `Successfully processed and  deleted message: ${message?.MessageId}`
            )
          } catch (error) {
            logger.error(`Error processing message:, ${JSON.stringify(error)}`)
          }
        }
      } catch (error) {
        logger.error(`Error while consuming message:, ${JSON.stringify(error)}`)
      }
    }

    const app = Consumer.create({
      queueUrl: awsQueueUrl,
      waitTimeSeconds: options.config.waitTimeSeconds,
      pollingWaitTimeMs: options.config.pollingWaitTimeMs,
      visibilityTimeout: 180,
      batchSize: options.config.batchSize,
      handleMessageBatch: batchMessageHandler,
      sqs: server.sqs
    })

    app.on('error', (err) => {
      logger.error(`Error Occured:, ${JSON.stringify(err)}`)
    })
    app.on('processing_error', (err) => {
      logger.error(`Processing error:, ${JSON.stringify(err)}`)
    })

    app.on('timeout_error', (err) => {
      logger.error(`Timeout Error :, ${JSON.stringify(err)}`)
    })

    server.events.on('closing', () => {
      app.stop()
    })

    app.start()
  } catch (error) {
    logger.info('Server failed to start :(')
    logger.error(error)
  }
  return server
}

export { startServer, queueInitialInfo, sharePointFile }

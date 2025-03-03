import { config } from '../../../config/index.js'
import { createServer } from '../../../api/index.js'
import { createLogger } from '../../../api/common/helpers/logging/logger.js'
import { fetchFileContent } from '../../processQueue/services/sharepointService.js'
import { queueInitialInfo } from '../constants/queue-initial-data.js'
import { fetchFileInfo } from '../../common/services/getFiles.js'
import { sharePointFileinfo } from '../../common/helpers/file-info.js'
import { sqsClient } from '~/src/api/processQueue/config/awsConfig.js'
import { Consumer } from 'sqs-consumer'

let sharePointFile
const awsQueueUrl = config.get('awsQueueUrl')

async function startServer() {
  let server
  const logger = createLogger()
  const POLLING_INTERVAL = 2 * 10 * 1000

  try {
    server = await createServer()
    await server.start()
    server.logger.info('Server started successfully')
    server.logger.info(
      `Access your backend on http://localhost:${config.get('port')}`
    )

    const fileInfo = await fetchFileInfo()
    sharePointFile = sharePointFileinfo(fileInfo)

    for (const message of queueInitialInfo) {
      const { filePath } = message

      // Fetch file content from SharePoint
      const fileContent = await fetchFileContent(filePath)
      message.data = fileContent
    }

    const options = {
      config: {
        waitTimeSeconds: 10,
        pollingWaitTimeMs: 10,
        batchSize: 5
      }
    }

    const batchMessageHandler = (message) => {
      logger.info(`message: ${JSON.stringify(message)}`)
    }

    const app = Consumer.create({
      queueUrl: awsQueueUrl,
      waitTimeSeconds: options.config.waitTimeSeconds,
      pollingWaitTimeMs: POLLING_INTERVAL,
      shouldDeleteMessages: true,
      batchSize: options.config.batchSize,
      handleMessageBatch: (messages) => batchMessageHandler(messages),
      sqs: sqsClient
    })

    app.on('error', (err) => {
      logger.error('Error Occured:', err.message)
    })
    app.on('processing_error', (err) => {
      logger.error('Processing error:', err.message)
    })

    app.on('timeout_error', (err) => {
      logger.error('Timeout Error :', err.message)
    })

    app.start()
  } catch (error) {
    logger.info('Server failed to start :(')
    logger.error(error)
  }
  return server
}

export { startServer, queueInitialInfo, sharePointFile }

import ExcelJS from 'exceljs'
import fs from 'fs'
import { read, write } from 'xlsx'
import { createLogger } from '~/src/api/common/helpers/logging/logger.js'

export const loadColumnNamesByName = async (
  sourceFile = '',
  keyColumnName = '',
  valueColumnName = '',
  workSheetName = '',
  rowNumber = 1
) => {
  const logger = createLogger()
  const startTime = new Date()
  const workbook = new ExcelJS.Workbook()

  const buffer = fs.readFileSync(sourceFile)

  const workbookXLSX = read(buffer, { type: 'buffer' })

  const xlsxBuffer = write(workbookXLSX, { bookType: 'xlsx', type: 'buffer' })

  await workbook.xlsx.load(xlsxBuffer)

  let worksheet = workbook.getWorksheet(workSheetName)

  const lookupValue = 'Y'

  const result = []

  const headerRow = worksheet.getRow(rowNumber)

  const idColumnIndex = headerRow.values.indexOf(keyColumnName)

  const nameColumnIndex = headerRow.values.indexOf(valueColumnName)

  const rows = worksheet.getSheetValues()
  for (let i = rowNumber + 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row) continue

    const idValue = row[idColumnIndex]
    if (idValue === lookupValue) {
      const nameValue = row[nameColumnIndex]
      result.push(nameValue)
    }
  }

  const logInfo = {
    method: 'loadColumnNamesByName',
    duration: new Date() - startTime
  }
  logger.info(`Start time ${JSON.stringify(logInfo)}`)

  worksheet = null

  return result
}

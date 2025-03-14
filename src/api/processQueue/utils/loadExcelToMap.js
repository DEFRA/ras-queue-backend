import ExcelJS from 'exceljs'
import { read, write } from 'xlsx'
import fs from 'fs'
import { createLogger } from '~/src/api/common/helpers/logging/logger.js'

export const loadExcelToMap = async (
  filePath = '',
  keyColumnName = '',
  valueColumnNames = [],
  workSheetName = '',
  rowNumber = 1
) => {
  const workbook = new ExcelJS.Workbook()
  const logger = createLogger()
  const startTime = new Date()
  const extension = filePath.split('.').pop()
  let buffer = fs.readFileSync(filePath)

  if (extension === 'xlsb') {
    const workbookXLSX = read(buffer, {
      type: 'buffer'
    })

    buffer = write(workbookXLSX, { bookType: 'xlsx', type: 'buffer' })
  }

  // const buffer = Buffer.from(filePath)

  await workbook.xlsx.load(buffer)

  let worksheet = workbook.getWorksheet(workSheetName)

  // Extract column names from header Row
  const headerRow = rowNumber && worksheet.getRow(rowNumber)
  const columnMap = {}

  headerRow.eachCell((cell, colNumber) => {
    columnMap[cell.value] = colNumber
  })

  if (
    !columnMap[keyColumnName] ||
    valueColumnNames.some((name) => !columnMap[name])
  ) {
    throw new Error(`Invalid column names`)
  }

  const dataMap = new Map()

  let rows = worksheet.getRows(rowNumber, worksheet.rowCount - rowNumber)
  for (const row of rows) {
    const key = row.getCell(columnMap[keyColumnName])?.value
    if (!key) continue
    const values = Object.fromEntries(
      valueColumnNames.map((name) => [
        name,
        row.getCell(columnMap[name])?.value ?? null
      ])
    )
    dataMap.set(key, values)
  }

  const logInfo = {
    method: 'loadExcelToMap',
    duration: new Date() - startTime,
    filename: filePath
  }

  logger.info(`Start time in loadExcelToMap ${JSON.stringify(logInfo)}`)

  worksheet = null

  rows = null

  return dataMap
}

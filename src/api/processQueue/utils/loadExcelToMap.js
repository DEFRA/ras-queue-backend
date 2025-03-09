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

  // const buffer = Buffer.from(filePath)

  const buffer = fs.readFileSync(filePath)

  const workbookXLSX = read(buffer, { type: 'buffer' })

  const xlsxBuffer = write(workbookXLSX, { bookType: 'xlsx', type: 'buffer' })

  await workbook.xlsx.load(xlsxBuffer)

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

  // worksheet.eachRow((row, rowIndex) => {
  //   if (rowIndex > rowNumber) {
  //     const key = row.getCell(columnMap[keyColumnName]).value
  //     if (key) {
  //       const values = {}
  //       valueColumnNames.forEach((name) => {
  //         values[name] = row.getCell(columnMap[name]).value
  //       })
  //       dataMap.set(key, values)
  //     }
  //   }
  // })

  // const rows = worksheet.getSheetValues()

  // console.log('rowCount:', rows.length)

  // for (let rowIndex = rowNumber; rowIndex <= rows.length; rowIndex++) {
  //   const row = rows[rowIndex]
  //   console.log("each row", row)
  //   if (!row) continue
  //   const key = row[columnMap.indexOf(keyColumnName)]?.value

  //   if (key) {
  //     const values = {}
  //     for (const name of valueColumnNames) {
  //       values[name] = row[columnMap[name]]?.value || null
  //     }
  //     dataMap.set(key, values)
  //   }
  // }

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

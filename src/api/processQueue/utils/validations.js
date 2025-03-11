import {
  styleToHighlight,
  styleToHighlightValidationError
} from '../utils/index.js'

export const applyValidationBasedOnHeaderColor = (worksheet, headers) => {
  worksheet.eachRow((row, rowIndex) => {
    if (rowIndex === 1) {
      row.eachCell((cell, colIndex) => {
        const cellColor = cell.fill.fgColor.argb
        worksheet.getColumn(colIndex).eachCell((cell, rowNumber) => {
          const required = headers[colIndex - 1]?.required
          const maxLength = headers[colIndex - 1]?.maxLength || 50
          const rules = headers[colIndex - 1]?.rules
          if (rowNumber > 1) {
            if (
              required &&
              (cell?.value === null ||
                cell.value === undefined ||
                cell.value === '')
            ) {
              cell.border = styleToHighlight()
            }
            if (cellColor === '0000FF') {
              cell.dataValidation = {
                type: 'textLength',
                operator: 'between',
                formulae: [0, maxLength],
                showErrorMessage: true,
                errorTitle: 'Text too long',
                error: `Maximum length is ${maxLength} characters.`
              }
            } else if (cellColor === 'FFFF00') {
              cell.dataValidation = {
                type: 'date',
                operator: 'between',
                formula1: '01/01/2024',
                formula2: '31/12/2025',
                showErrorMessage: true,
                errorTitle: 'Invalid Date',
                error: 'Date must be in DD/MM/YYYY format'
              }
              if (
                cell.value &&
                cell.value instanceof Date &&
                !isNaN(cell.value)
              ) {
                cell.border = styleToHighlightValidationError()
              }
            } else if (cellColor === 'FFA500') {
              cell.dataValidation = {
                type: 'list',
                formulae: ['"Y, N"'],
                showErrorMessage: true,
                errorTitle: 'Invalid Input',
                error: 'Only Y or N is allowed.'
              }
            } else if (cellColor === '40E0D0') {
              cell.dataValidation = {
                type: 'whole',
                operator: 'greaterThanOrEqual',
                formula1: '0',
                showErrorMessage: true,
                errorTitle: 'Invalid Input',
                error: 'Only numeric values are allowed'
              }

              // Highlight if cell is not a whole number
              if (cell.value && cell.value < 0) {
                cell.border = styleToHighlightValidationError()
              }
            }

            if (rules === 'mobile' && cell.value !== null) {
              const ukMobileRegex = /^(?:\+44\s?|0)7[1-9]\d{2}\s?\d{6}$/
              const flag = ukMobileRegex.test(cell?.value?.trim())
              if (!flag) cell.border = styleToHighlightValidationError()
            }
          }
        })
      })
    }
  })
}

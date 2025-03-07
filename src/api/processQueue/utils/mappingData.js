import ExcelJS from 'exceljs'
import { loadExcelToMap } from '~/src/api/processQueue/utils/loadExcelToMap.js'
import { read, write } from 'xlsx'
import { cleanNumberField } from '../utils/index.js'
import fs from 'fs'

export const getMappingDataForExcel = async (
  sourceFile,
  columnName,
  targetProjectIds
) => {
  try {
    const workbook = new ExcelJS.Workbook()

    // use stream reader for large files
    const buffer = fs.readFileSync(sourceFile)

    // const buffer = Buffer.from(
    //   sourceFile.find(
    //     (file) => file.fileName === 'giles_report_official_sensitive_2b.xlsb'
    //   ).data
    // )

    const workbookXLSX = read(buffer, { type: 'buffer' })

    const xlsxBuffer = write(workbookXLSX, { bookType: 'xlsx', type: 'buffer' })

    await workbook.xlsx.load(xlsxBuffer)

    // Get first sheet from source workbook
    const worksheet = workbook.getWorksheet(1)

    // Get header row ( first row names)
    const headerRow = worksheet.getRow(4)

    // Find the column index  for the condition column and target column
    const columnIndex = headerRow.values.findIndex(
      (value) => value === columnName
    )

    // const getBusinessNameIndex = headerRow.values.findIndex(
    //   (value) => value === 'Business Name'
    // )

    const getSBIIndex = headerRow.values.findIndex(
      (value) => value === 'Single Business Identifier (SBI)'
    )

    const getAddressCore4 = headerRow.values.findIndex(
      (value) => value === 'County'
    )

    // const mappedObject = []
    const obj = {
      limtCore: null,
      CPHCore: null,
      SBICore: null,
      FRNCore: null,
      schemeCore: 'FETF',
      schemeYearCore: 2024,
      selectionMethodCore: 'random',
      customerNameCore: null,
      phoneNoCore: null,
      mobileCore: null,
      claimValueDossier: null,
      agreementRefCore: null,
      highValueCore: null,
      SPSClaimantCore: 'Y',
      NoOfAgreementsRDP: 1,
      totalFieldsRDP: 0,
      lifetimeValueRDP: null,
      addressCore1: null,
      addressCore2: null,
      addressCore3: null,
      addressCore4: null,
      postCodeCore: null,
      selectionBasisRDP: null,
      preInspectionDate: null
    }

    // const CPH_CODE = await loadExcelToMap(
    //   sourceFile.find((file) => file.fileName === 'SBI_FRN_CPH.xlsx').data,
    //   'SBI',
    //   ['CPH_CODE'],
    //   'FRN_CPH_SBI'
    // )

    const LMT_CORE = await loadExcelToMap(
      'CPH_SEO_Group_Look_Up_Table_V4_23.01.2025.xlsx',
      'Enter CPH data in this column',
      ['SEO Group'],
      'CPH to SEO group Match'
    )

    const SEO_GROUP = await loadExcelToMap(
      'CPH_SEO_Group_Look_Up_Table_V4_23.01.2025.xlsx',
      'County',
      ['SEOGroup'],
      'CPH to SEO group Match'
    )

    const SEO_GROUP_SHORE_SPLIT = await loadExcelToMap(
      'CPH_SEO_Group_Look_Up_Table_V4_23.01.2025.xlsx',
      'County & Parish Number',
      ['AREA'],
      '35 Shropshire Split'
    )

    const LMT_CORE_CONVERSION = (value = '', CPHValue = '', county) => {
      if (CPHValue === null || CPHValue === '') {
        const result = SEO_GROUP?.get(county)?.SEOGroup || null
        return result
      }
      if (CPHValue.split('/')[0] === '35') {
        return SEO_GROUP_SHORE_SPLIT?.get(CPHValue.split('/')[1])?.AREA || null
      }
      return value
    }

    const PHONE_NO = await loadExcelToMap(
      'CS_MEASURES.xlsb',
      'SBI',
      [
        'LANDLINE',
        'MOBILE',
        'FRN',
        'POST_CODE',
        'CPH_CODE',
        'ORGANISATION_NAME',
        'ADDRESS_LINE1',
        'ADDRESS_LINE2',
        'CITY'
      ],
      'CS_MEASURES'
    )

    const CLAIM_VALUE_DOSSIER = await loadExcelToMap(
      'giles_report_official_sensitive_1.xlsb',
      'Project Ref',
      ['Forecast claim (grant) value', 'Sub Scheme'],
      'giles_report_official_sensitive',
      4
    )

    const selectionBasisRDPConversion = {
      'FETF 2024 AHW Window 1': 'FETF-2024 AHW Rand',
      'FETF 2024 Productivity': 'FETF-2024 Prod Rand',
      'FETF 2024 Slurry': 'FETF-2024 Slry Rand'
    }

    const targetProjectIdSet = new Set(targetProjectIds)

    const mappedObject = worksheet._rows
      .filter((row) => {
        if (!row || row.number <= 4) return false

        const projectId = row.getCell(columnIndex).value
        return targetProjectIdSet.has(projectId)
      })
      .map((row) => {
        const getSBIValue = row.getCell(getSBIIndex).value
        const getColumnValue = row.getCell(columnIndex)?.value
        return {
          ...obj,
          SBICore: getSBIValue || null,
          CPHCore: PHONE_NO.get(getSBIValue)?.CPH_CODE || null,
          limtCore: LMT_CORE_CONVERSION(
            LMT_CORE?.get(PHONE_NO.get(getSBIValue)?.CPH_CODE)?.['SEO Group']
              ?.result,
            PHONE_NO.get(getSBIValue)?.CPH_CODE,
            row.getCell(getAddressCore4).value
          ),
          FRNCore: PHONE_NO.get(getSBIValue)?.FRN || null,
          phoneNoCore:
            cleanNumberField(PHONE_NO.get(getSBIValue)?.LANDLINE) ?? null,
          mobileCore:
            cleanNumberField(PHONE_NO.get(getSBIValue)?.MOBILE) || null,
          customerNameCore:
            PHONE_NO.get(getSBIValue)?.ORGANISATION_NAME || null,
          lifetimeValueRDP:
            CLAIM_VALUE_DOSSIER.get(getColumnValue)?.[
              'Forecast claim (grant) value'
            ] ?? null,
          agreementRefCore: getColumnValue ?? null,
          highValueCore:
            CLAIM_VALUE_DOSSIER.get(getColumnValue)?.[
              'Forecast claim (grant) value'
            ] > 50000
              ? 'Y'
              : 'N',
          claimValueDossier:
            CLAIM_VALUE_DOSSIER.get(getColumnValue)?.[
              'Forecast claim (grant) value'
            ] ?? null,
          addressCore1: PHONE_NO.get(getSBIValue)?.ADDRESS_LINE1 || null,
          addressCore2: PHONE_NO.get(getSBIValue)?.ADDRESS_LINE2 || null,
          addressCore3: PHONE_NO.get(getSBIValue)?.CITY || null,
          addressCore4: row.getCell(getAddressCore4).value ?? null,
          postCodeCore: PHONE_NO.get(getSBIValue)?.POST_CODE ?? null,
          selectionBasisRDP:
            (selectionBasisRDPConversion[
              CLAIM_VALUE_DOSSIER.get(getColumnValue)?.['Sub Scheme']
            ] ||
              CLAIM_VALUE_DOSSIER.get(getColumnValue)?.['Sub Scheme']) ??
            null
        }
      })

    //    }

    return mappedObject
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('error', error)
  }
}

import * as xlsx from 'xlsx'
import Papa from 'papaparse'

/**
 * Parses a spreadsheet file (CSV, XLSX, XLS) and returns an array of objects
 * where keys are the column headers.
 * 
 * @param file The file to parse
 * @returns Promise resolving to an array of parsed row objects
 */
export async function parseSpreadsheet(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
        const fileExtension = file.name.split('.').pop()?.toLowerCase()

        if (fileExtension === 'csv') {
            // Use PapaParse for CSV (faster and more robust for CSV specifically)
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    resolve(results.data)
                },
                error: (error) => {
                    reject(new Error(`CSV Parse Error: ${error.message}`))
                }
            })
        } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
            // Use SheetJS (xlsx) for Excel files
            const reader = new FileReader()
            
            reader.onload = (e) => {
                try {
                    const data = e.target?.result
                    if (!data) throw new Error('Failed to read file data')

                    // Read the workbook from array buffer
                    const workbook = xlsx.read(data, { type: 'array' })
                    
                    // Get the first worksheet
                    const firstSheetName = workbook.SheetNames[0]
                    const worksheet = workbook.Sheets[firstSheetName]
                    
                    // Convert sheet to json (array of objects mapping headers to values)
                    // defval: '' ensures empty cells become empty strings rather than undefined
                    const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: '' })
                    
                    resolve(jsonData)
                } catch (error: any) {
                    reject(new Error(`Excel Parse Error: ${error.message}`))
                }
            }
            
            reader.onerror = () => {
                reject(new Error('Failed to read file'))
            }
            
            // Read as ArrayBuffer for xlsx
            reader.readAsArrayBuffer(file)
        } else {
            reject(new Error('Unsupported file format. Please upload a .csv, .xlsx, or .xls file.'))
        }
    })
}

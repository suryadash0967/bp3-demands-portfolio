import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import excelFile from '../data/demands.xlsx'

/**
 * useExcelData
 * Loads demands.xlsx, parses it into JSON rows.
 * Returns { data: Array<Object>, loading: boolean, error: string|null }
 *
 * Drop a new Excel file at src/data/demands.xlsx with the same columns
 * and all charts will update automatically — no code changes needed.
 */
export function useExcelData() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        // Dynamic import of the xlsx binary asset
        const response = await fetch(excelFile)
        if (!response.ok) {
          throw new Error(`Could not load demands.xlsx (HTTP ${response.status})`)
        }
        const arrayBuffer = await response.arrayBuffer()
        console.log(response.url);
        console.log(response.status);
        console.log(response.headers.get("content-type"));
        const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: false })
        const sheetName = wb.SheetNames[0]
        const ws = wb.Sheets[sheetName]
        const json = XLSX.utils.sheet_to_json(ws, { defval: '' })
        setData(json)
      } catch (err) {
        console.error('useExcelData error:', err)
        setError(err.message)
        // Fallback to sample data so the UI is never blank
        setData(getSampleData())
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return { data, loading, error }
}

/** Sample data used when no Excel file is present */
function getSampleData() {
  const statuses = ['Open', 'In Progress', 'Completed', 'On Hold', 'Cancelled']
  const priorities = ['High', 'Medium', 'Low', 'Critical']
  const types = ['Enhancement', 'Bug Fix', 'New Feature', 'Support', 'Configuration']
  const apps = ['SAP ERP', 'Salesforce', 'ServiceNow', 'Workday', 'Oracle HCM', 'Ariba', 'SuccessFactors', 'Concur']
  const rows = []
  const base = new Date('2024-01-05')
  for (let i = 0; i < 180; i++) {
    const d = new Date(base.getTime() + i * 2.1 * 24 * 3600 * 1000)
    rows.push({
      'Demand Status': statuses[i % statuses.length],
      'Priority': priorities[i % priorities.length],
      'Demand Request Date': d.toISOString().slice(0, 10),
      'Application': apps[i % apps.length],
      'Demand Type': types[i % types.length],
    })
  }
  return rows
}

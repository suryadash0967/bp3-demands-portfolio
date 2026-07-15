/**
 * dataUtils.js
 * Pure aggregation helpers — keep chart components clean.
 */

/** Group an array of objects by a key, return [{name, value}] */
export function groupByKey(data, key) {
  if (!data || !data.length) return []
  const counts = {}
  data.forEach(row => {
    const val = row[key] ? String(row[key]).trim() : 'Unknown'
    counts[val] = (counts[val] || 0) + 1
  })
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

/** Group by month from a date column, return [{name: 'Jan 24', value}] */
export function groupByMonth(data, dateKey) {
  if (!data || !data.length) return []
  const counts = {}
  data.forEach(row => {
    const raw = row[dateKey]
    if (!raw) return
    let date
    // Handle Excel serial date numbers
    if (typeof raw === 'number') {
      date = new Date(Math.round((raw - 25569) * 86400 * 1000))
    } else {
      date = new Date(raw)
    }
    if (isNaN(date.getTime())) return
    const key = date.toLocaleString('en-GB', { month: 'short', year: '2-digit' })
    counts[key] = (counts[key] || 0) + 1
  })
  // Sort chronologically
  const sorted = Object.entries(counts)
    .map(([name, value]) => ({ name, value, _d: parseMonthLabel(name) }))
    .sort((a, b) => a._d - b._d)
    .map(({ name, value }) => ({ name, value }))
  return sorted
}

function parseMonthLabel(label) {
  try {
    return new Date(`01 ${label}`).getTime()
  } catch { return 0 }
}

/** Top N by count for a column */
export function topN(data, key, n = 5) {
  const grouped = groupByKey(data, key)
  return grouped.slice(0, n)
}

/** Count rows matching a predicate */
export function countWhere(data, predicate) {
  if (!data || !data.length) return 0
  return data.filter(predicate).length
}

/**
 * Like groupByKey but skips blank/empty/whitespace-only values.
 * Returns [{name, value}] sorted descending.
 */
export function groupByKeyFiltered(data, key) {
  if (!data || !data.length) return []
  const counts = {}
  data.forEach(row => {
    const val = row[key] ? String(row[key]).trim() : ''
    if (!val) return
    counts[val] = (counts[val] || 0) + 1
  })
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

/**
 * Returns month-wise [{name, total, approved}] for the grouped bar chart.
 * "approved" counts rows where statusKey value (trimmed, lowercased) is in matchStatuses array.
 */
export function groupByMonthDouble(data, dateKey, statusKey, matchStatuses = ['approved']) {
  if (!data || !data.length) return []
  const totals = {}
  const approved = {}

  const normalised = matchStatuses.map(s => s.toLowerCase().trim())

  data.forEach(row => {
    const raw = row[dateKey]
    if (!raw) return
    let date
    if (typeof raw === 'number') {
      date = new Date(Math.round((raw - 25569) * 86400 * 1000))
    } else {
      date = new Date(raw)
    }
    if (isNaN(date.getTime())) return
    const key = date.toLocaleString('en-GB', { month: 'short', year: '2-digit' })
    totals[key] = (totals[key] || 0) + 1
    const status = row[statusKey] ? String(row[statusKey]).trim().toLowerCase() : ''
    if (normalised.includes(status)) {
      approved[key] = (approved[key] || 0) + 1
    }
  })

  return Object.keys(totals)
    .map(name => ({ name, total: totals[name], approved: approved[name] || 0, _d: parseMonthLabel(name) }))
    .sort((a, b) => a._d - b._d)
    .map(({ name, total, approved }) => ({ name, total, approved }))
}

/**
 * Returns stacked bar data for Priority by Application.
 * Output: [{name, Critical, High, Medium, Low, ...otherPriorities}] sorted by total desc.
 */
export function priorityByApplication(data, appKey = 'Application', priorityKey = 'Demand Priority') {
  if (!data || !data.length) return []
  const map = {}
  const prioritySet = new Set()

  data.forEach(row => {
    const app = row[appKey] ? String(row[appKey]).trim() : ''
    const pri = row[priorityKey] ? String(row[priorityKey]).trim() : ''
    if (!app || !pri) return
    if (!map[app]) map[app] = {}
    map[app][pri] = (map[app][pri] || 0) + 1
    prioritySet.add(pri)
  })

  const rows = Object.entries(map).map(([name, counts]) => {
    const total = Object.values(counts).reduce((s, v) => s + v, 0)
    return { name, ...counts, _total: total }
  })

  rows.sort((a, b) => b._total - a._total)
  return rows.map(({ _total, ...rest }) => rest).slice(0, 10)
}

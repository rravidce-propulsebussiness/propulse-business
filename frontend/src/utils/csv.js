const FORMULA_PREFIX = /^[=+\-@\t\r]/

export function csvCell(value) {
  let text = String(value ?? '')
  if (FORMULA_PREFIX.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

export function csvText(rows) {
  return rows.map(row => row.map(csvCell).join(',')).join('\n')
}

export function downloadCsv(filename, rows) {
  const blob = new Blob([`\uFEFF${csvText(rows)}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

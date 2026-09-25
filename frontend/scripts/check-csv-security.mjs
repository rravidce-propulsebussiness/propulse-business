import { csvCell, csvText } from '../src/utils/csv.js'

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

for (const dangerous of ['=2+2', '+SUM(A1:A2)', '-10+20', '@HYPERLINK("https://example.com")', '\t=CMD()', '\r=CMD()']) {
  const encoded = csvCell(dangerous)
  assert(encoded.startsWith('"\''), `CSV formula value must be neutralized: ${JSON.stringify(dangerous)}`)
}

assert(csvCell('hello') === '"hello"', 'Ordinary CSV text should remain unchanged')
assert(csvCell('a"b') === '"a""b"', 'CSV quotes must be escaped')
assert(csvText([['A', 'B'], ['1', '2']]) === '"A","B"\n"1","2"', 'CSV row serialization must be stable')

console.log('CSV formula-injection security check passed.')

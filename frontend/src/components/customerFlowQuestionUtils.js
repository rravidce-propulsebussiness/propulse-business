export const isEmptyAnswer = value => value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length)

export function isQuestionVisible(question, answers) {
  const rule = question?.showWhen || {}
  if (!rule.questionKey) return true
  const actual = answers[rule.questionKey]
  if (Object.prototype.hasOwnProperty.call(rule, 'equals')) return Array.isArray(actual) ? actual.includes(rule.equals) : actual === rule.equals
  if (Array.isArray(rule.in)) return Array.isArray(actual) ? actual.some(value => rule.in.includes(value)) : rule.in.includes(actual)
  if (Object.prototype.hasOwnProperty.call(rule, 'notEquals')) return Array.isArray(actual) ? !actual.includes(rule.notEquals) : actual !== rule.notEquals
  return true
}

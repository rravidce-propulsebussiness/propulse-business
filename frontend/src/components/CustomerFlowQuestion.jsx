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

const activeOptions = question => (question?.options || []).filter(option => option?.isActive !== false)
const controlMode = question => String(question?.validation?.uiControl || 'auto').trim().toLowerCase()
const placeholder = (question, fallback) => String(question?.validation?.placeholder || fallback || '').trim()

function ChoiceButtons({ question, value, onChange, multiple = false }) {
  const selected = multiple ? (Array.isArray(value) ? value : []) : []
  const compact=question?.validation?.compactChoices || controlMode(question)==='checkboxes'
  return <div className={'rq-options'+(compact ? ' compact' : '')} role="group" aria-label={question.label}>{activeOptions(question).map(option => {
    const active = multiple ? selected.includes(option.value) : value === option.value
    return <button key={option.value} type="button" className={active ? 'active' : ''} onClick={() => {
      if (!multiple) return onChange(option.value)
      onChange(active ? selected.filter(item => item !== option.value) : [...selected, option.value])
    }}><span>{active ? '✓' : ''}</span><b>{option.label}</b></button>
  })}</div>
}

function Dropdown({question,value,onChange,id}){
  return <select id={id} className="rq-select" aria-label={question.label} value={value ?? ''} onChange={event=>onChange(event.target.value)}>
    <option value="">{placeholder(question,'Select an option')}</option>
    {activeOptions(question).map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
  </select>
}

function BooleanControl({question,value,onChange,id}){
  if(controlMode(question)==='dropdown'){
    return <select id={id} className="rq-select" aria-label={question.label} value={value===true?'true':value===false?'false':''} onChange={event=>onChange(event.target.value===''?'':event.target.value==='true')}>
      <option value="">{placeholder(question,'Select')}</option>
      <option value="true">Yes</option>
      <option value="false">No</option>
    </select>
  }
  return <div className="rq-options two compact" role="group" aria-label={question.label}><button type="button" className={value === true ? 'active' : ''} onClick={() => onChange(true)}><span>{value === true ? '✓' : ''}</span><b>Yes</b></button><button type="button" className={value === false ? 'active' : ''} onClick={() => onChange(false)}><span>{value === false ? '✓' : ''}</span><b>No</b></button></div>
}

export default function CustomerFlowQuestion({ question, value, onChange, id }) {
  if (!question) return null
  const mode=controlMode(question)

  if (question.questionType === 'single_select' || question.questionType === 'timeline') {
    return mode==='cards' ? <ChoiceButtons question={question} value={value} onChange={onChange} /> : <Dropdown id={id} question={question} value={value} onChange={onChange}/>
  }
  if (question.questionType === 'multi_select') {
    return <ChoiceButtons question={question} value={value} onChange={onChange} multiple />
  }
  if (question.questionType === 'boolean') {
    return <BooleanControl id={id} question={question} value={value} onChange={onChange}/>
  }
  if (question.questionType === 'text') {
    return <textarea id={id} rows={Number(question.validation?.rows || 4)} value={value || ''} maxLength={Number(question.validation?.maxLength || 2000)} onChange={event => onChange(event.target.value)} placeholder={placeholder(question,'Share useful details...')} />
  }
  if (question.questionType === 'location') {
    return <div className="rq-input-suffix"><input id={id} inputMode="numeric" maxLength="6" value={value || ''} onChange={event => onChange(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder={placeholder(question,'6-digit PIN code')} /><span>PIN</span></div>
  }
  if (question.questionType === 'number' || question.questionType === 'area') {
    return <div className="rq-input-suffix"><input id={id} type="number" min={question.validation?.min} max={question.validation?.max} step={question.validation?.step || 'any'} value={value ?? ''} onChange={event => onChange(event.target.value)} placeholder={placeholder(question,'Enter number')} />{question.questionType === 'area' && <span>sq ft</span>}</div>
  }
  return <input id={id} value={value || ''} maxLength={Number(question.validation?.maxLength || 240)} onChange={event => onChange(event.target.value)} placeholder={placeholder(question,question.questionType === 'budget' ? 'Example: ₹10–15 lakh' : 'Enter your answer')} />
}

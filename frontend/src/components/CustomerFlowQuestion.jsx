function ChoiceButtons({ question, value, onChange, multiple = false }) {
  const selected = multiple ? (Array.isArray(value) ? value : []) : []
  return <div className="rq-options">{(question.options || []).map(option => {
    const active = multiple ? selected.includes(option.value) : value === option.value
    return <button key={option.value} type="button" className={active ? 'active' : ''} onClick={() => {
      if (!multiple) return onChange(option.value)
      onChange(active ? selected.filter(item => item !== option.value) : [...selected, option.value])
    }}><span>{active ? '✓' : ''}</span><b>{option.label}</b></button>
  })}</div>
}

export default function CustomerFlowQuestion({ question, value, onChange }) {
  if (!question) return null
  if (question.questionType === 'single_select' || question.questionType === 'timeline') {
    return <ChoiceButtons question={question} value={value} onChange={onChange} />
  }
  if (question.questionType === 'multi_select') {
    return <ChoiceButtons question={question} value={value} onChange={onChange} multiple />
  }
  if (question.questionType === 'boolean') {
    return <div className="rq-options two"><button type="button" className={value === true ? 'active' : ''} onClick={() => onChange(true)}><span>{value === true ? '✓' : ''}</span><b>Yes</b></button><button type="button" className={value === false ? 'active' : ''} onClick={() => onChange(false)}><span>{value === false ? '✓' : ''}</span><b>No</b></button></div>
  }
  if (question.questionType === 'text') {
    return <textarea rows="5" value={value || ''} maxLength={Number(question.validation?.maxLength || 2000)} onChange={event => onChange(event.target.value)} placeholder="Share useful details..." />
  }
  if (question.questionType === 'location') {
    return <div className="rq-input-suffix"><input inputMode="numeric" maxLength="6" value={value || ''} onChange={event => onChange(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit PIN code" /><span>PIN</span></div>
  }
  if (question.questionType === 'number' || question.questionType === 'area') {
    return <div className="rq-input-suffix"><input type="number" min={question.validation?.min} max={question.validation?.max} value={value ?? ''} onChange={event => onChange(event.target.value)} placeholder="Enter number" />{question.questionType === 'area' && <span>sq ft</span>}</div>
  }
  return <input value={value || ''} maxLength={Number(question.validation?.maxLength || 240)} onChange={event => onChange(event.target.value)} placeholder={question.questionType === 'budget' ? 'Example: ₹10–15 lakh' : 'Enter your answer'} />
}

// Recover the question/answer structure from the published requirement wizard.
// Existing requests already store answers as newline-separated "Label: Value" rows;
// parsing that source also repairs marketplace presentation of historical leads.
const reserved = /^(?:reference project|published professional|quotation industry|site pin code)$/i;
const normalizeLabel = value => {
  const label = String(value || '').trim().replace(/\?$/, '').trim();
  if (/^(?:what type of property is it|property type|type of property)$/i.test(label)) return 'Property Type';
  if (/^(?:number of bedrooms|how many bedrooms|bedrooms)$/i.test(label)) return 'Bedrooms';
  if (/^(?:what interior scope do you need|interior scope)$/i.test(label)) return 'Interior Scope';
  if (/^(?:interior style preference|interior style)$/i.test(label)) return 'Interior Style';
  if (/^(?:what is your approximate budget|approximate budget|budget|budget range)$/i.test(label)) return 'Budget';
  if (/^(?:when do you want to start|when would you like to start|project timeline|timeline)$/i.test(label)) return 'Timeline';
  if (/^(?:planned built-up area|built-up area)$/i.test(label)) return 'Built-up Area';
  if (/^(?:additional requirement|additional requirements|additional information|other details|share more details and requirement)$/i.test(label)) return 'Additional Requirements';
  return label;
};
const isContactLabel = value => /(?:phone|mobile|whatsapp|email|contact|address|pincode|pin code|postal|website|social|instagram)/i.test(value);

function parseProjectQuoteRequirement(raw) {
  const fields = {};
  const extra = [];
  for (const line of String(raw || '').split(/\r?\n/)) {
    const text = line.trim().replace(/^(?:Interior Design|Real Estate|Construction) enquiry from a completed project\.\s*/i, '');
    if (!text) continue;
    const pos = text.indexOf(':');
    if (pos <= 0 || pos > 110) {
      extra.push(text);
      continue;
    }
    const label = normalizeLabel(text.slice(0, pos));
    const value = text.slice(pos + 1).trim();
    if (!label || reserved.test(label) || isContactLabel(label) || !value || value === '—') continue;
    if (Object.keys(fields).length >= 35) break;
    fields[label] = value.slice(0, 450);
  }
  // Unlabelled requirement text must remain visible rather than be silently dropped.
  if (extra.length) {
    const unlabelled = extra.join('\n').slice(0, 900);
    fields['Additional Requirements'] = [fields['Additional Requirements'], unlabelled].filter(Boolean).join('\n').slice(0, 1200);
  }
  return fields;
}

module.exports = { parseProjectQuoteRequirement };

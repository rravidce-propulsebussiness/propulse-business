import { BUSINESS } from '../seo/businessProfile'

// WebMCP: expose a few safe, user-visible actions to in-browser AI agents via
// navigator.modelContext. Tools only read public facts, open the requirement
// form for the person to fill in, or navigate between public pages.
const PAGES = {
  home: '/', quote: '/quote', packages: '/packages', projects: '/projects', professionals: '/experts',
  technology: '/technology', about: '/about', contact: '/contact', faq: '/faq', guides: '/guides', terms: '/terms',
}
const SERVICE_FLOWS = { construction: 'build', interiors: 'design', property: 'property', not_sure: '' }

const text = value => ({ content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }] })

function navigate(path) {
  if (window.location.pathname + window.location.hash === path) return
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

const TOOLS = [
  {
    name: 'get_contact_details',
    description: 'Get ProPulse\'s phone, WhatsApp, email, address and business hours.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
    async execute() {
      return text({
        company: BUSINESS.legalName,
        phone: BUSINESS.telephoneDisplay,
        whatsapp: BUSINESS.telephoneDisplay,
        email: BUSINESS.email,
        address: BUSINESS.addressDisplay,
        hours: BUSINESS.openingHours,
        contact_page: window.location.origin + '/contact',
      })
    },
  },
  {
    name: 'open_requirement_form',
    description: 'Open the ProPulse requirement form on this page so the user can request a construction, interiors or property estimate. The user reviews and submits the form themselves.',
    inputSchema: {
      type: 'object',
      properties: { service: { type: 'string', enum: Object.keys(SERVICE_FLOWS), description: 'What the user needs help with.' } },
      required: ['service'],
      additionalProperties: false,
    },
    async execute({ service } = {}) {
      const flowKey = SERVICE_FLOWS[service] ?? ''
      window.dispatchEvent(new CustomEvent('propulse:open-lead-popup', { detail: { flowKey } }))
      return text('The requirement form is open on the page. Ask the user to fill in their name, phone and project details and submit it.')
    },
  },
  {
    name: 'open_page',
    description: 'Navigate this tab to a public ProPulse page: home, quote, packages, projects, professionals, technology, about, contact, faq, guides or terms.',
    inputSchema: {
      type: 'object',
      properties: { page: { type: 'string', enum: Object.keys(PAGES) } },
      required: ['page'],
      additionalProperties: false,
    },
    async execute({ page } = {}) {
      const path = PAGES[page]
      if (!path) return text('Unknown page. Choose one of: ' + Object.keys(PAGES).join(', ') + '.')
      navigate(path)
      return text('Opened ' + window.location.origin + path)
    },
  },
]

let installed = false
export function installWebMcpTools() {
  if (installed || typeof navigator === 'undefined') return
  const context = navigator.modelContext
  if (!context) return
  installed = true
  try {
    if (typeof context.registerTool === 'function') {
      TOOLS.forEach(tool => { try { context.registerTool(tool) } catch { /* already registered */ } })
    } else if (typeof context.provideContext === 'function') {
      context.provideContext({ tools: TOOLS })
    }
  } catch (error) {
    console.warn('WebMCP tool registration failed', error)
  }
}

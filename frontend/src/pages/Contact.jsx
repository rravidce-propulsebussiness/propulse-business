import { useEffect, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import PortalContact from './PortalContact'
import { publicRequest } from '../utils/auth'
import { openLeadPopup } from '../utils/leadPopup'
import { PublicFooter, PublicHeader } from '../components/PublicSiteChrome'
import './Contact.css'

const EMPTY_CONTACT = {
  company_name: 'ProPulse',
  email: 'info@propulsetechnologies.online',
  support_email: 'info@propulsetechnologies.online',
  phone: '+91 9000360812',
  whatsapp: '+91 9000360812',
  address: '',
  business_hours: '',
  maps_url: '',
  social_handles: [],
}

function ContactIcon({ type }) {
  const common = {
    width: 23, height: 23, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.7,
    strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
  }
  if (type === 'mail') return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
  if (type === 'phone') return <svg {...common}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 0-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c1 .3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z"/></svg>
  if (type === 'chat') return <svg {...common}><path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.6-5A7 7 0 0 1 3 12V8a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/></svg>
  if (type === 'pin') return <svg {...common}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
  return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
}

function ContactCard({ icon, title, detail, href, action, external = false }) {
  return <a
    className="contact-method"
    href={href}
    target={external ? '_blank' : undefined}
    rel={external ? 'noopener noreferrer' : undefined}
  >
    <span className="contact-method-icon"><ContactIcon type={icon}/></span>
    <h2>{title}</h2>
    <p>{detail}</p>
    <span className="contact-method-action">{action} <span aria-hidden="true">↗</span></span>
  </a>
}

export default function Contact() {
  const [searchParams] = useSearchParams()
  const portalAudience = searchParams.get('audience')
  if (portalAudience === 'lead_partners') return <PortalContact audience={portalAudience}/>
  if (portalAudience === 'users') return <Navigate to="/contact" replace/>
  return <PublicContact/>
}

function PublicContact() {
  const [data, setData] = useState(EMPTY_CONTACT)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    publicRequest('/contact?audience=website')
      .then(value => {
        if (active) setData({
          ...EMPTY_CONTACT,
          ...(value || {}),
          social_handles: Array.isArray(value?.social_handles) ? value.social_handles : [],
        })
      })
      .catch(() => { if (active) setError(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const email = String(data.email || data.support_email || '').trim()
  const phone = String(data.phone || '').trim()
  const whatsapp = String(data.whatsapp || '').replace(/\D/g, '')
  const mapsUrl = /^https?:\/\//i.test(String(data.maps_url || '')) ? data.maps_url : ''
  const socials = data.social_handles.filter(item => item?.enabled && /^https?:\/\//i.test(String(item?.url || '')))
  const hasContact = Boolean(email || phone || whatsapp)
  const hasOffice = Boolean(data.address || data.business_hours || mapsUrl)

  return <main className="contact-page">
    <PublicHeader/>

    <div className="contact-simple">
      <header className="contact-intro">
        <span className="contact-eyebrow">CONTACT US</span>
        <h1>We’re here to help.</h1>
        <p>Questions about construction, interiors or real estate? Reach our team directly.</p>
      </header>

      {loading ? <p className="contact-status" role="status">Loading contact details…</p> : <>
        {error && <p className="contact-status contact-error" role="alert">
          Contact details are temporarily unavailable. Please try again later.
        </p>}

        {hasContact ? <section className="contact-methods" aria-label="Ways to contact us">
          {phone && <ContactCard icon="phone" title="Call us" detail={phone}
            href={'tel:' + phone.replace(/[^+\d]/g, '')} action="Call now"/>}
          {whatsapp && <ContactCard icon="chat" title="WhatsApp" detail={data.whatsapp || ('+' + whatsapp)}
            href={'https://wa.me/' + whatsapp} action="Start a chat" external/>}
          {email && <ContactCard icon="mail" title="Email us" detail={email}
            href={'mailto:' + email} action="Send an email"/>}
        </section> : !error && <p className="contact-status">
          Direct contact details will be available here soon.
        </p>}

        {(hasOffice || socials.length > 0) && <section className="contact-more" aria-label="Additional contact details">
          {hasOffice && <div className="contact-office">
            <span className="contact-method-icon"><ContactIcon type={data.address ? 'pin' : 'clock'}/></span>
            <div>
              <h2>{data.address ? 'Office' : 'Business hours'}</h2>
              {data.address && <p>{data.address}</p>}
              {data.business_hours && <p className="contact-hours">{data.business_hours}</p>}
              {mapsUrl && <a href={mapsUrl} target="_blank" rel="noopener noreferrer">Get directions <span aria-hidden="true">↗</span></a>}
            </div>
          </div>}
          {socials.length > 0 && <div className="contact-social">
            <h2>Find us online</h2>
            <div>{socials.map(item => <a key={item.id || item.platform || item.url}
              href={item.url} target="_blank" rel="noopener noreferrer">
              {item.platform || 'Social profile'} <span aria-hidden="true">↗</span>
            </a>)}</div>
          </div>}
        </section>}
      </>}

      <section className="contact-quote">
        <div>
          <h2>Planning a project?</h2>
          <p>Share your requirements and get started.</p>
        </div>
        <button type="button" onClick={() => openLeadPopup('')}>Get Free Quote <span aria-hidden="true">→</span></button>
      </section>
    </div>

    <PublicFooter phone={phone} email={email} address={data.address || 'Hyderabad, India'}/>
  </main>
}

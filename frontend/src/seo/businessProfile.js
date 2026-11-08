// Single source for the business facts published in structured data, the
// prerendered HTML footer and the in-browser agent tools. Keep it in step with
// Admin -> Contact & Social (the /api/contact "website" audience).
export const BUSINESS = {
  name: 'ProPulse Business',
  legalName: 'ProPulse Business Private Limited',
  telephone: '+91-9000360812',
  telephoneDisplay: '+91 9000360812',
  email: 'info@propulsetechnologies.online',
  address: {
    streetAddress: 'Hitech City',
    addressLocality: 'Hyderabad',
    addressRegion: 'Telangana',
    postalCode: '500081',
    addressCountry: 'IN',
  },
  addressDisplay: 'Hitech City, Hyderabad, Telangana - 500081, India',
  openingHours: 'Mon - Sat, 9:00 AM - 6:00 PM',
  mapsUrl: 'https://maps.google.com/?q=Hitech+City,+Hyderabad',
  // Public profiles that belong to ProPulse (LinkedIn, Facebook, Instagram,
  // YouTube, Google Business Profile, directories). Only add real URLs:
  // agents use these to confirm the business identity.
  sameAs: [],
}

export function telephoneHref(value = BUSINESS.telephone) {
  return 'tel:' + String(value).replace(/[^+\d]/g, '')
}

// schema.org HomeAndConstructionBusiness is a LocalBusiness (and Organization) subtype.
export function businessJsonLd(origin) {
  const home = origin + '/'
  const node = {
    '@context': 'https://schema.org',
    '@type': 'HomeAndConstructionBusiness',
    '@id': home + '#organization',
    name: BUSINESS.name,
    legalName: BUSINESS.legalName,
    url: home,
    logo: origin + '/brand/propulse-logo.png',
    image: origin + '/brand/propulse-logo.png',
    description: 'ProPulse directly delivers house construction and interiors in Hyderabad, operates a professional marketplace and builds software for construction businesses.',
    telephone: BUSINESS.telephone,
    email: BUSINESS.email,
    address: { '@type': 'PostalAddress', ...BUSINESS.address },
    hasMap: BUSINESS.mapsUrl,
    openingHoursSpecification: [{
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      opens: '09:00',
      closes: '18:00',
    }],
    areaServed: [
      { '@type': 'City', name: 'Hyderabad' },
      { '@type': 'State', name: 'Telangana' },
      { '@type': 'State', name: 'Andhra Pradesh' },
    ],
    contactPoint: [{
      '@type': 'ContactPoint',
      contactType: 'customer service',
      telephone: BUSINESS.telephone,
      email: BUSINESS.email,
      areaServed: 'IN',
      availableLanguage: ['English'],
    }],
  }
  if (BUSINESS.sameAs.length) node.sameAs = BUSINESS.sameAs
  return node
}

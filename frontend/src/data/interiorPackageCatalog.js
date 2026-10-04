export const INTERIOR_PACKAGE_CATALOG = {
  standard: {
    key: 'standard',
    name: 'Standard',
    eyebrow: 'SMART VALUE',
    badge: 'Smart Value',
    price: 1399,
    image: 'https://images.unsplash.com/photo-1556912167-f556f1f39fdf?auto=format&fit=crop&w=1000&q=88',
    description: 'Practical semi-modular interiors with dependable ply, laminate and hardware references.',
    highlights: ['Gurjan BWP reference', 'EBCO soft-close hardware', 'Semi-modular finish'],
    specs: {
      'Wood': 'Gurjan BWP',
      'Internal laminate': '0.72mm liner',
      'External laminate': '1mm Virgo / Advance',
      'Hardware': 'EBCO soft-close hinges & channels',
      'Baskets': 'Extra @ ₹4,000 / no.',
      'Finish': 'Semi-modular finish',
      'Handle allowance': 'Up to ₹120 / no.',
    },
  },
  premium: {
    key: 'premium',
    name: 'Premium',
    eyebrow: 'FULL MODULAR',
    badge: 'Most Popular',
    price: 1599,
    image: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1000&q=88',
    description: 'Higher-spec full-modular interiors with upgraded ply, laminate and hardware allowances.',
    highlights: ['Greenply / Century 710', 'Hettich / Häfele soft-close', 'Full modular finish'],
    specs: {
      'Wood': 'Greenply / Century Ply 710',
      'Internal laminate': '0.8 fabric finish',
      'External laminate': '1mm Merino / Century laminate',
      'Hardware': 'Hettich / Häfele soft-close hinges & channels',
      'Baskets': 'Extra @ ₹6,000 / no.',
      'Finish': 'Full modular finish',
      'Handle allowance': 'Up to ₹250 / no.',
    },
  },
}

export const INTERIOR_PACKAGES = Object.values(INTERIOR_PACKAGE_CATALOG)

export function getInteriorPackage(key) {
  return INTERIOR_PACKAGE_CATALOG[String(key || '').toLowerCase()] || INTERIOR_PACKAGE_CATALOG.standard
}

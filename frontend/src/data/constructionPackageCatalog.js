export const CONSTRUCTION_PACKAGE_CATALOG = {
  standard: {
    key: 'standard',
    name: 'Standard',
    rate: 1750,
    specs: {
      'Architecture': '2D floor plans · Structural plans · 3D elevation · Soil test',
      'Steel': 'Shree 550 TMT or equivalent',
      'Cement': 'Nagarjuna 53 grade for slabs/pillars · Priya/equivalent 43 grade for brick/internal work',
      'Sand': 'Robo sand for construction · River sand for plastering',
      'Bricks': 'Karimnagar brick',
      'Kitchen': 'Wall tiles ₹45/sq ft · Sink ₹2,000 · Granite platform ₹120/sq ft',
      'Main door': 'Indian teak double door allowance ₹25,000',
      'Internal doors': 'Flush door allowance ₹7,000',
      'Windows': 'uPVC 3-track allowance ₹350/sq ft',
      'Bathroom': 'Wall tiles ₹45/sq ft · CERA fitting allowance ₹25,000/bathroom',
      'Flooring': 'Rooms ₹45/sq ft · Stair granite ₹70/sq ft · Parking anti-skid ₹45/sq ft',
      'Painting': 'Asian Tractor interior · ACE exterior reference',
      'Electrical': 'Finolex fireproof wire · MARU basic switches · Sudhakar piping',
      'Other': 'SS202 stair railing · MS gate up to ₹20,000 · 4,000L double-layer overhead tank',
    },
  },
  premium: {
    key: 'premium',
    name: 'Premium',
    rate: 1899,
    specs: {
      'Architecture': '2D + structural + 3D elevation · Digital survey · Soil test · Plumbing & electrical drawings',
      'Steel': 'Vizag TMT or Jairaj',
      'Cement': 'UltraTech 53 grade for slabs/pillars · Bangur/equivalent for brick/internal work',
      'Sand': 'River sand for construction except terrace/tile work',
      'Bricks': 'Karimnagar Class II bricks',
      'Kitchen': 'Wall tiles ₹55/sq ft · Sink ₹3,500 · Granite platform ₹160/sq ft',
      'Main door': 'Indian teak double door allowance ₹50,000',
      'Internal doors': 'Flush door allowance ₹10,000',
      'Windows': 'uPVC glass + mesh shutter allowance ₹450/sq ft',
      'Bathroom': 'Wall tiles ₹55/sq ft · Ashirwad pipe · Jaguar fitting allowance ₹35,000/bathroom',
      'Flooring': 'Rooms ₹70/sq ft · Stair granite ₹100/sq ft · Parking anti-skid ₹60/sq ft',
      'Painting': 'Birla putty + Asian Royale interior · Apex exterior reference',
      'Electrical': 'Polycab fireproof wire · Gold Medal switches · Sudhakar piping',
      'Other': 'SS303 stair railing · MS gate up to ₹35,000 · 4,000L three-layer overhead tank · RCC sump',
    },
  },
  royal: {
    key: 'royal',
    name: 'Royal',
    rate: 2099,
    specs: {
      'Architecture': '2D + structural + 3D elevation · Digital survey · Soil test · Plumbing & electrical drawings',
      'Steel': 'Tata 550 TMT',
      'Cement': 'UltraTech 53 grade for complete construction',
      'Sand': 'River sand for complete construction',
      'Bricks': 'Karimnagar Class I bricks',
      'Kitchen': 'Wall tiles ₹60/sq ft · Sink ₹6,000 · Granite platform ₹250/sq ft',
      'Main door': 'Indian teak double door allowance ₹60,000',
      'Internal doors': 'Flush door allowance ₹15,000',
      'Windows': 'uPVC glass + mesh shutter allowance ₹550/sq ft',
      'Bathroom': 'Tiles up to ceiling ₹65/sq ft · Ashirwad hot-water CPVC · Parryware Premium allowance ₹50,000/bathroom',
      'Flooring': 'Rooms ₹85/sq ft · Stair granite ₹130/sq ft · Parking granite ₹70/sq ft',
      'Painting': 'Birla putty + Royal emulsion · Apex Ultima weatherproof exterior',
      'Electrical': 'Polycab FRLS wire + Polycab piping · Gold Medal Air switches',
      'Other': 'SS304 stairs + glass balcony railing · Sliding gate up to ₹45,000 · 4,000L RCC overhead tank · 11 ft floor height',
    },
  },
}

export function constructionPackageKeyFromQuality(quality) {
  const key = String(quality || 'standard').toLowerCase()
  if (key === 'luxury' || key === 'royal') return 'royal'
  if (key === 'premium') return 'premium'
  return 'standard'
}

export function getConstructionPackage(quality) {
  return CONSTRUCTION_PACKAGE_CATALOG[constructionPackageKeyFromQuality(quality)] || CONSTRUCTION_PACKAGE_CATALOG.standard
}

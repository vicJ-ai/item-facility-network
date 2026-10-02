const CLIENT_LOGO_BASE = '/media/client-logos'

// Only exact, reviewed customer names are associated with a logo. Unlisted names
// intentionally render an empty logo slot instead of a guessed brand identity.
export const clientLogoByCustomerName = {
  'GURUNANDA, LLC': `${CLIENT_LOGO_BASE}/gurunanda.png`,
  'ORGAIN, LLC.': `${CLIENT_LOGO_BASE}/orgain.png`,
  'LENNOX INDUSTRIES INC.': `${CLIENT_LOGO_BASE}/lennox.png`,
  'ALL MARKET INC / VITA COCO': `${CLIENT_LOGO_BASE}/vita-coco.png`,
  'VITA COCO - DTC': `${CLIENT_LOGO_BASE}/vita-coco.png`,
  'EMBER TECHNOLOGIES, INC.': `${CLIENT_LOGO_BASE}/ember.png`,
  'SIMPLE MODERN': `${CLIENT_LOGO_BASE}/simple-modern.png`,
  'FLAG & ANTHEM': `${CLIENT_LOGO_BASE}/flag-anthem.png`,
  'DRUPLEY INC / DBA GRAZA': `${CLIENT_LOGO_BASE}/graza.png`,
  'NZXT': `${CLIENT_LOGO_BASE}/nzxt.png`,
  'AS EVER ENTERPRISES, LLC': `${CLIENT_LOGO_BASE}/as-ever.png`,
  'COME READY FOODS LLC': `${CLIENT_LOGO_BASE}/ready.png`,
  'MAMMA CHIA': `${CLIENT_LOGO_BASE}/mamma-chia.png`,
  'THE OUAI': `${CLIENT_LOGO_BASE}/ouai.png`,
  "KING'S HAWAIIAN": `${CLIENT_LOGO_BASE}/kings-hawaiian.png`,
  'ROAR BEVERAGES INC': `${CLIENT_LOGO_BASE}/roar.png`,
  'DELTA ELECTRONICS (AMERICAS) LTD - NEW': `${CLIENT_LOGO_BASE}/delta.png`,
  'DUPRAY USA LLC': `${CLIENT_LOGO_BASE}/dupray.png`,
} as const satisfies Readonly<Record<string, string>>

export function getClientLogo(customerName: string) {
  return clientLogoByCustomerName[customerName as keyof typeof clientLogoByCustomerName]
}

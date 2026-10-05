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
  'Midea America Corp': `${CLIENT_LOGO_BASE}/midea.png`,
  'SharkNinja Sales Company': `${CLIENT_LOGO_BASE}/sharkninja.png`,
  'ONE SOURCE TO MARKET, LLC dba HEXCLAD COOKWARE': `${CLIENT_LOGO_BASE}/hexclad.png`,
  'TCL NORTH AMERICA': `${CLIENT_LOGO_BASE}/tcl.png`,
  'TCL - ECOM': `${CLIENT_LOGO_BASE}/tcl.png`,
  'AIT WORLDWIDE LOGISTICS INC.': `${CLIENT_LOGO_BASE}/ait.png`,
  'CMPC USA INC': `${CLIENT_LOGO_BASE}/cmpc.png`,
  'CMPC USA (Cut Paper and Rolls)': `${CLIENT_LOGO_BASE}/cmpc.png`,
  'ATERIAN GROUP, INC.': `${CLIENT_LOGO_BASE}/aterian.png`,
  'THE LUMISTELLA COMPANY': `${CLIENT_LOGO_BASE}/lumistella.png`,
  'LIPPERT COMPONENTS, INC.': `${CLIENT_LOGO_BASE}/lippert.png`,
  'TURTLE BEACH': `${CLIENT_LOGO_BASE}/turtle-beach.png`,
  'EN-R-G FOODS LLC DBA HONEY STINGER': `${CLIENT_LOGO_BASE}/honey-stinger.png`,
  'DUKE CANNON SUPPLY CO.': `${CLIENT_LOGO_BASE}/duke-cannon.png`,
  'OLIPOP': `${CLIENT_LOGO_BASE}/olipop.png`,
  'HINT INC.': `${CLIENT_LOGO_BASE}/hint.png`,
  "MIKE'S HOT HONEY, INC.": `${CLIENT_LOGO_BASE}/mikes-hot-honey.png`,
  'PANASONIC LOGISTICS SOLUTIONS AMERICA INC': `${CLIENT_LOGO_BASE}/panasonic.png`,
  'SCHINDLER ELEVATOR CORPORATION': `${CLIENT_LOGO_BASE}/schindler.png`,
  'DEER STAGS': `${CLIENT_LOGO_BASE}/deer-stags.png`,
  'BOREALIS COMPOUNDS INC.': `${CLIENT_LOGO_BASE}/borealis.png`,
  'GOOD START PACKAGING': `${CLIENT_LOGO_BASE}/good-start.png`,
  'GLOVIS AMERICA': `${CLIENT_LOGO_BASE}/glovis.png`,
  'PEPSICO': `${CLIENT_LOGO_BASE}/pepsico.png`,
  'SAMSUNG SDS GLOBAL SCL AMERICA, INC.': `${CLIENT_LOGO_BASE}/samsung-sds.png`,
  'FEDEX GROUND PACKAGES SYSTEM INC.': `${CLIENT_LOGO_BASE}/fedex.png`,
  'PARAMOUNT GLOBAL, INC.': `${CLIENT_LOGO_BASE}/paramount.png`,
  'LENOVO (UNITED STATES) INC.': `${CLIENT_LOGO_BASE}/lenovo.png`,
  'Lenovo Mobile Communications Inc - US11': `${CLIENT_LOGO_BASE}/lenovo.png`,
  'LENOVO GLOBAL TECHNOLOGY(UNITED STATES) INC-DCG(GP)': `${CLIENT_LOGO_BASE}/lenovo.png`,
  'LENOVO GLOBAL TECHNOLOGY(UNITED STATES) INC-DCG': `${CLIENT_LOGO_BASE}/lenovo.png`,
} as const satisfies Readonly<Record<string, string>>

const clientLogoDarkBackgroundCustomerNames = new Set<string>([
  'NZXT',
  'ROAR BEVERAGES INC',
  'ATERIAN GROUP, INC.',
  'ONE SOURCE TO MARKET, LLC dba HEXCLAD COOKWARE',
  'THE LUMISTELLA COMPANY',
  'PARAMOUNT GLOBAL, INC.',
  'TURTLE BEACH',
])

export function getClientLogo(customerName: string) {
  return clientLogoByCustomerName[customerName as keyof typeof clientLogoByCustomerName]
}

export function clientLogoNeedsDarkBackground(customerName: string) {
  return clientLogoDarkBackgroundCustomerNames.has(customerName)
}

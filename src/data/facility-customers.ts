// Top customers per facility, in rank order, from the "top costumers" sheet the user supplied on 2026-10-02. Rows were
// matched to roster facilities by address; names are kept exactly as the sheet writes them. The sheet's location code and
// abbreviation are kept so a row can be traced back. Confirmed or assumed address variants:
// - Waddell: the sheet says "6801 N. Cotton Ln., Glendale, AZ 85355" (same street, number, and ZIP).
// - El Paso 12100: the sheet says "12104 Emerald Pass Drive, Building #4"; the user confirmed it is this facility.
// - Kent: the sheet says "19802-20024 85th Ave. South"; the user confirmed it is this facility.
// Sheet rows for sites outside this roster (Kansas City, La Mirada, Greenwood, Portage, Suffolk, Northampton, Douglasville,
// 320 Morgan Lakes, and others) are not recorded.
export type FacilityTopCustomers = {
  locationCode: number
  abbreviation?: string
  sheetAddress: string
  customers: readonly string[]
}

export const TOP_CUSTOMERS_SOURCE_NOTE = 'Top customers sheet supplied by the user on 2026-10-02.'

export const facilityTopCustomers: Partial<Record<string, FacilityTopCustomers>> = {
  'buena-park-valley-view': {
    locationCode: 889, abbreviation: 'SNA', sheetAddress: '6800 Valley View, Buena Park, CA 90620',
    customers: [
      'GURUNANDA, LLC', 'Euromarket Designs, Inc.', 'ORGAIN, LLC.', 'LENNOX INDUSTRIES INC.', 'ALL MARKET INC / VITA COCO',
      'EMBER TECHNOLOGIES, INC.', 'KARAKA, LLC', 'SIMPLE MODERN', 'TORQUAY ETRADING LLC', 'FLAG & ANTHEM',
      'DRUPLEY INC / DBA GRAZA', 'NZXT', 'AS EVER ENTERPRISES, LLC', 'COME READY FOODS LLC', 'MAMMA CHIA',
      'THE OUAI', "KING'S HAWAIIAN", 'ROAR BEVERAGES INC', 'DELTA ELECTRONICS (AMERICAS) LTD - NEW', 'DUPRAY USA LLC',
    ],
  },
  'riverside-alessandro': {
    locationCode: 882, abbreviation: 'ONT14', sheetAddress: '2677 Alessandro Blvd, Riverside, CA 92508',
    customers: [
      'Midea America Corp', 'AMAZON (CROSSDOCK)', '5 Star Apparel LLC', 'CORE HOME', 'NYDJ Apparel LLC',
      'PLANAHEAD', 'ADOORN LLC', 'VIZIO', 'BRUMATE LLC', 'SHEEX, INC.',
      'AVIRON INTERACTIVE INC', 'THE LUMISTELLA COMPANY', 'GLOBAL TV CONCEPTS, LTD', 'OVERLAND', 'E&S INTERNATIONAL ENTERPRISES, INC',
      'DAGNE DOVER', 'FLEET PACKAGING INC.', 'QUE ONDA BEVERAGE, INC', '5 Star Apparel - Amazon 1P', 'MICHAEL TODD BEAUTY, LP',
    ],
  },
  'moreno-valley-heacock': {
    locationCode: 156, abbreviation: 'RIV', sheetAddress: '16850 Heacock Street, Moreno Valley, CA 92551',
    customers: ['SharkNinja Sales Company', 'THE LUMISTELLA COMPANY'],
  },
  'houston-citypark': {
    locationCode: 144, abbreviation: 'IAH2', sheetAddress: '8833 Citypark Loop, Houston, TX 77013',
    customers: [
      'JSONIC SERVICES INC', 'SEC LARGE PROJECTS', 'CHR C/O MONSANTO', 'HIH LOGISTICS, INC - USA (TRINA SOLAR)', 'IBCC INDUSTRIES',
      'PARAMOUNT GLOBAL, INC.', 'Professional Exports', 'C.H.ROBINSON-PHILLIPS HEALTHCARE-LIFESTYLE',
    ],
  },
  'roanoke-highway-114': {
    locationCode: 869, abbreviation: 'DFW1', sheetAddress: '1230 Highway 114, Roanoke, TX 76262',
    customers: [
      'ONE SOURCE TO MARKET, LLC dba HEXCLAD COOKWARE', 'Midea America Corp', 'MRO MARYRUTH, LLC.', 'CKNAPP SALES INC', 'VIZIO',
      'RITUAL BEVERAGE COMPANY', 'MOD LIGHTING', 'UPTIME ENERGY INC', 'THE ANDERSONS, INC.', 'PAMOS HEMP LLC',
      'BEYOND ALCOHOL INC, dba THREE SPIRIT', 'GOOD START PACKAGING', "BERK'S WAREHOUSING & TRUCKING LLC", 'ATERIAN GROUP, INC.', 'HVAC TECHNOLOGIES',
      'VISIONARY BEVERAGES LLC DBA BUDDI', 'TRAFFIC SAFETY STORE.', 'HINT INC.', 'GLOBALONE PET, INC.', 'CODA RESOURCES',
    ],
  },
  'pooler-morgan-lakes': {
    locationCode: 893, abbreviation: 'SAV2', sheetAddress: '335 Morgan Lakes industrial Blvd, Pooler, GA 31322',
    customers: ['Labwork Auto, Inc', 'FEDEX GROUND PACKAGES SYSTEM INC.'],
  },
  'pooler-seabrook-building-2': {
    locationCode: 823, abbreviation: 'SAV6', sheetAddress: '300 Seabrook Parkway, Pooler, GA 31322',
    customers: [
      'ZURU LLC', 'BEXCO ENTERPRISES, INC', 'C.H.Robinson-CVS', 'TRI-UNION SEAFOODS, LLC DBA CHICKEN OF THE SEA INTERNATIONAL', 'BOREALIS COMPOUNDS INC.',
      'ADOORN LLC', 'TCL NORTH AMERICA', 'AMAZON (CROSSDOCK)', 'INTERNATIONAL TEXTILE & APPAREL', 'STERLING RIVERS INC.',
      'FILIPPO BERIO USA LTD', 'GOLDEN BULL MARKETING', 'JSONIC SERVICES INC', 'THE LUMISTELLA COMPANY', "RITIKA'S GLOBAL GRAINS",
      'TRIDENT GLOBAL INC', 'SMART SOLAR INC.', 'VTECH ELECTRONICS NORTH AMERICA, LLC', 'ATERIAN GROUP, INC.', 'ELIX POLYMERS AMERICAS LLC',
    ],
  },
  'summerville-cypress-tradeport': {
    locationCode: 875, abbreviation: 'CHS1', sheetAddress: '369 North Cyprus Drive, Summerville, SC 29486',
    customers: [
      'ONE SOURCE TO MARKET, LLC dba HEXCLAD COOKWARE', 'GOLDEN BULL MARKETING', 'NATUS SPORTS AND RECREATION INC', 'BRIGGS PLUMBING PRODUCTS', 'HIH LOGISTICS (JIANFA)',
      'AMERCAREROYAL', 'CMPC USA INC', 'ARGO BRANDS INC', 'STRON USA INC', 'DELMAR INTERNATIONAL INC',
      'URB PRODUCTS LLC', 'AIT WORLDWIDE LOGISTICS INC.', 'THE ANDERSONS, INC.', 'SPLENDOR WATER LLC', 'CODA RESOURCES',
      'JLC Entertainment LLC dba Who Has It Packaging', 'KARAKA, LLC',
    ],
  },
  'tennessee-quality-drive': {
    locationCode: 811, abbreviation: 'MEM', sheetAddress: '4550 Quality Drive, Memphis, TN 38118',
    customers: ['LENOVO (UNITED STATES) INC.', 'Lenovo Mobile Communications Inc - US11'],
  },
  'tacoma-lincoln': {
    locationCode: 879, abbreviation: 'SEA', sheetAddress: '3320 Lincoln Ave., Tacoma, WA 98421',
    customers: [
      'GLOVIS AMERICA', 'NATUS SPORTS AND RECREATION INC', 'ALL MARKET INC / VITA COCO', 'SCHINDLER ELEVATOR CORPORATION', 'NIAGARA BOTTLING LLC - RESIN',
      'STRON USA INC', 'LIPPERT COMPONENTS, INC.', 'SURF 9 LLC', 'SAFE CATCH, INC.', 'MAMMC SOLUTIONS',
      'SPLENDOR WATER LLC', 'GALANZ AMERICAS LIMITED COMPANY', 'THE ONLY BEAN LLC', 'TCL - ECOM', 'AIT WORLDWIDE LOGISTICS INC.',
      'ZURU LLC', 'NORTH STAR CONTAINER, LLC', 'DRUPLEY INC / DBA GRAZA', 'KING COFFEE', 'DELMAR INTERNATIONAL INC',
    ],
  },
  'tacoma-steele': {
    locationCode: 880, abbreviation: 'SEA1', sheetAddress: '12005 Steele St S, Tacoma, WA 98444',
    customers: ['PEPSICO', 'AMAZON (CROSSDOCK)'],
  },
  'jacksonville-ignition': {
    locationCode: 140, abbreviation: 'JAX', sheetAddress: '2619 Ignition Dr, Jacksonville, FL 32218',
    customers: [
      'ALL MARKET INC / VITA COCO', 'SCHINDLER ELEVATOR CORPORATION', 'MONSTER ENERGY COMPANY', 'VITA COCO - DTC', 'CMPC USA INC',
      'GOOD START PACKAGING', 'WHOLE EARTH BRANDS', 'BT SWIM LLC', 'HIH LOGISTICS, INC - NAVIGATION/JACKSONVILLE', 'UPTIME ENERGY INC',
    ],
  },
  'las-vegas-marion-building-5': {
    locationCode: 151, abbreviation: 'VGT', sheetAddress: '2861 North Marion Drive, Suite 101-109, Las Vegas, NV 89115',
    customers: ['IGL WAREHOUSE, LLC'],
  },
  'el-paso-emerald-12100': {
    locationCode: 146, abbreviation: 'ELP', sheetAddress: '12104 Emerald Pass Drive, Building #4, El Paso, TX 79928',
    customers: ['TCL NORTH AMERICA'],
  },
  'long-beach-willow': {
    locationCode: 920, abbreviation: 'LGB', sheetAddress: '2131 W. Willow St, Long Beach, CA 90810',
    customers: [
      'C.H.Robinson-CVS', 'CONCANNON LUMBER COMPANY', 'THE PARALLAX GROUP', 'C.H.ROBINSON-PHILLIPS HEALTHCARE-LIFESTYLE', 'QUALITY PLYWOOD PRODUCTS LLC',
      'BENDON PUBLISHING INC.', 'ASUS - NON BONDED', 'LIPPERT COMPONENTS, INC.', 'ASUS', 'DELMAR INTERNATIONAL INC',
      'CMPC USA INC', 'ANDERSON ADVANCED INGREDIENTS', 'CMPC USA (Cut Paper and Rolls)', 'DAGNE DOVER - TRANSLOAD', 'SLINGER BAG AMERICAS INC.',
      'HANDTMANN, INC.', 'UNIPLY, LLC',
    ],
  },
  'joliet-brandon': {
    locationCode: 890, abbreviation: 'JOL', sheetAddress: '3901 Brandon Rd, Joliet, IL 60436',
    customers: [
      'Midea America Corp', 'DUKE CANNON SUPPLY CO.', 'EN-R-G FOODS LLC DBA HONEY STINGER', 'VANTAGE TRANSITION LLC', "MIKE'S HOT HONEY, INC.",
      'TURTLE BEACH', 'KHLOUD, INC.', 'THE OUAI', 'DELTA ELECTRONICS (AMERICAS) LTD - NEW', 'FLUFFCO LLC',
      'RIP VAN, INC.', 'GOODER FOODS, INC.', 'SLEEP DOCTOR HOLDINGS LLC', 'OLIPOP', 'THE MURRIETA RHINO HOLDCO LLC',
      'DUPRAY USA LLC', 'SCHINDLER ELEVATOR CORPORATION', 'THE ANDERSONS, INC.', 'UPSNACK BRANDS, INC.', 'MONOGRAM FOOD SOLUTIONS, LLC',
    ],
  },
  'el-paso-emerald-12102-building-5': {
    locationCode: 154, abbreviation: 'ELP1', sheetAddress: '12102 Emerald Pass Drive, El Paso, TX 79928',
    customers: ['TCL NORTH AMERICA'],
  },
  'waddell-cotton': {
    locationCode: 885, abbreviation: 'PHX1', sheetAddress: '6801 N. Cotton Ln., Glendale, AZ 85355',
    customers: [
      'PEPSI - QUAKER', 'PEPSICO', 'AIT WORLDWIDE LOGISTICS INC.', 'GOLDEN BULL MARKETING', 'AMAZON (CROSSDOCK)',
      'CHEP USA', 'DOYLE FARRIS', 'SPENCER GIFTS', 'SCHINDLER ELEVATOR CORPORATION', 'RECESS',
      'PANASONIC LOGISTICS SOLUTIONS AMERICA INC', 'ZURU LLC', 'F3 ENERGY LLC', 'KINECT RENEWABLE SOLUTIONS LLC', 'KINECT SOLAR LLC',
    ],
  },
  'ontario-airport': {
    locationCode: 132, abbreviation: 'ONT6', sheetAddress: '3950 E Airport Dr, Ontario, CA 91761',
    customers: ['AIT WORLDWIDE LOGISTICS INC.', 'STAR ELITE INC.', 'Midea America Corp', "L'IMAGE HOME PRODUCTS INC."],
  },
  'kent-85th-avenue-range': {
    locationCode: 877, abbreviation: 'SEA2', sheetAddress: '19802-20024 85th Ave. South, Kent, WA 98031',
    customers: ['DEER STAGS', 'SEC LARGE PROJECTS'],
  },
  'west-sacramento-overland': {
    locationCode: 908, abbreviation: 'SMF1', sheetAddress: '1500 Overland Ct, West Sacramento, CA 95691',
    customers: ['SCHINDLER ELEVATOR CORPORATION', 'MICRO CENTER'],
  },
  'sparks-vista': {
    locationCode: 112, abbreviation: 'RNO', sheetAddress: '250 Vista Blvd, Suite 101, Sparks, NV 89434',
    customers: [
      'ONE SOURCE TO MARKET, LLC dba HEXCLAD COOKWARE', 'PLANTBABY, INC.', 'ATERIAN GROUP, INC.', 'THE ANDERSONS, INC.', 'CODA RESOURCES',
      'PROUD SOURCE WATER, LLC', 'teaRIOT LLC dba RIOT Energy', 'UNIVERA BRANDS', 'THE SWEET COMPANY LLC', 'A FORCE OF NATURE - CFORCE BOTTLING',
    ],
  },
  'houston-navigation': {
    locationCode: 195, abbreviation: 'IAH', sheetAddress: '3401 Navigation Blvd, Houston, TX 77003',
    customers: ['JSONIC SERVICES INC', 'PARAMOUNT GLOBAL, INC.'],
  },
  'memphis-delp': {
    locationCode: 892, abbreviation: 'MEM1', sheetAddress: '4444 Delp St, Memphis, TN 38118',
    customers: ['LENOVO GLOBAL TECHNOLOGY(UNITED STATES) INC-DCG(GP)', 'LENOVO GLOBAL TECHNOLOGY(UNITED STATES) INC-DCG', 'IBCC INDUSTRIES'],
  },
  'salt-lake-city-jimmy-doolittle': {
    locationCode: 114, abbreviation: 'SLC', sheetAddress: '485 N Jimmy Doolittle Rd, Salt Lake City, UT 84116',
    customers: ['PANASONIC LOGISTICS SOLUTIONS AMERICA INC'],
  },
  'somerset-cottontail': {
    locationCode: 152, abbreviation: 'EWR', sheetAddress: '101 Cottontail Lane, Somerset, NJ 08873',
    customers: [
      'CMPC USA INC', 'DRUPLEY INC / DBA GRAZA', 'C.H.ROBINSON-PHILLIPS HEALTHCARE-NJ', 'ELIX POLYMERS AMERICAS LLC', 'JCB MAX LLC',
      'ALPINE NET CORP', 'BEKO US, INC.', 'WOODY FLAW CREST INC',
    ],
  },
  'plano-10th-f-avenue': {
    locationCode: 139, abbreviation: 'DAL', sheetAddress: '910 10th St/880 F Avenue, Plano, TX 75074',
    customers: ['SCHINDLER ELEVATOR CORPORATION', 'BANYAN INTERNATIONAL'],
  },
  'garden-city-prosperity': {
    locationCode: 804, abbreviation: 'SAV7', sheetAddress: '140 Prosperity Drive, Garden City, GA 31408',
    customers: ['SAMSUNG SDS GLOBAL SCL AMERICA, INC.'],
  },
  'university-park-central': {
    locationCode: 136, abbreviation: 'ORD1', sheetAddress: '701 Central Ave, (Samsung), University Park, IL 60484',
    customers: ['SAMSUNG SDS GLOBAL SCL AMERICA, INC.'],
  },
}

export const getFacilityTopCustomers = (facilityId: string) => facilityTopCustomers[facilityId]

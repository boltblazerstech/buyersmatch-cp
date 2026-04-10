import { isDemoMode } from '../config/brand.js'

function hashStr(str) {
  if (!str) return 0
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash)
}

const FIRST_NAMES = [
  "James","Sarah","Michael","Emma","David",
  "Jessica","Daniel","Olivia","Matthew","Sophia",
  "Andrew","Charlotte","Joshua","Mia","Ryan",
  "Isabella","Nathan","Ava","Thomas","Grace"
]

const LAST_NAMES = [
  "Smith","Johnson","Williams","Brown","Jones",
  "Wilson","Taylor","Anderson","Thomas","Martin",
  "White","Harris","Thompson","Garcia","Martinez",
  "Robinson","Clark","Rodriguez","Lewis","Lee"
]

const STREET_NAMES = [
  "Maple","Cedar","Oak","River","Park",
  "Hill","Lake","Valley","Garden","Forest",
  "Sunset","Horizon","Rosewood","Ironbark",
  "Gumtree","Banksia","Wattle","Eucalyptus"
]

const STREET_TYPES = [
  "Street","Avenue","Drive","Court","Place",
  "Circuit","Road","Crescent","Close","Way",
  "Boulevard","Parade","Lane","Terrace"
]

export function anonymizeName(realName) {
  if (!isDemoMode || !realName) return realName
  const h = hashStr(realName)
  const first = FIRST_NAMES[h % FIRST_NAMES.length]
  const last = LAST_NAMES[(h >> 4) % LAST_NAMES.length]
  return `${first} ${last}`
}

export function anonymizeEmail(realEmail) {
  if (!isDemoMode || !realEmail) return realEmail
  const h = hashStr(realEmail)
  const first = FIRST_NAMES[h % FIRST_NAMES.length].toLowerCase()
  const last = LAST_NAMES[(h >> 4) % LAST_NAMES.length].toLowerCase()
  return `${first}.${last}@demo.com.au`
}

export function anonymizePhone(realPhone) {
  if (!isDemoMode || !realPhone) return realPhone
  const h = hashStr(realPhone)
  const suffix = String(h).padStart(8, '0').slice(0, 8)
  return `04${suffix}`
}

export function anonymizeAddress(realAddress) {
  if (!isDemoMode || !realAddress) return realAddress
  const h = hashStr(realAddress)
  const num = (h % 199) + 1
  const street = STREET_NAMES[h % STREET_NAMES.length]
  const type = STREET_TYPES[(h >> 3) % STREET_TYPES.length]

  // Keep suburb state postcode — strip only street
  // Real format: "52 Powell Street, Wulguru QLD 4811"
  const commaIndex = realAddress.indexOf(',')
  const suburbPart = commaIndex > -1
    ? realAddress.substring(commaIndex + 1).trim()
    : ''

  return suburbPart
    ? `${num} ${street} ${type}, ${suburbPart}`
    : `${num} ${street} ${type}`
}

export function anonymizeGreeting(realGreeting) {
  if (!isDemoMode || !realGreeting) return realGreeting
  const h = hashStr(realGreeting)
  return FIRST_NAMES[h % FIRST_NAMES.length]
}

export function anonymizeCompany(realCompany) {
  if (!isDemoMode || !realCompany) return realCompany
  const COMPANIES = [
    "Sunrise Investments Pty Ltd",
    "Blue Sky Holdings",
    "Apex Property Group",
    "Golden Gate Ventures",
    "Pacific Realty Trust",
    "Southern Cross Investments",
    "Harbour View Holdings",
    "Cornerstone Assets Pty Ltd"
  ]
  const h = hashStr(realCompany)
  return COMPANIES[h % COMPANIES.length]
}

export function anonymizeAgentName(realName) {
  if (!isDemoMode || !realName) return realName
  const h = hashStr(realName)
  const first = FIRST_NAMES[(h + 7) % FIRST_NAMES.length]
  const last = LAST_NAMES[(h + 13) % LAST_NAMES.length]
  return `${first} ${last}`
}

export function anonymizeAgentEmail(realEmail) {
  if (!isDemoMode || !realEmail) return realEmail
  return 'agent@demo.com.au'
}

// Apply anonymization to full property object
export function anonymizeProperty(property) {
  if (!isDemoMode || !property) return property
  const streetOnly = property.addressLine1
    ? anonymizeAddress(
        property.addressLine1 + (property.suburb ? ', ' + property.suburb : '')
      ).split(',')[0].trim()
    : property.addressLine1
  return {
    ...property,
    address:      anonymizeAddress(property.address),
    addressLine1: streetOnly,
    agentName:    anonymizeAgentName(property.agentName),
    linkToListing:  null,
    stashLink:      null,
    cmaLink:        null,
    coreLogicLink:  null,
  }
}

// Apply anonymization to full assignment object
export function anonymizeAssignment(assignment) {
  if (!isDemoMode || !assignment) return assignment
  return {
    ...assignment,
    buyerEmail: anonymizeEmail(assignment.buyerEmail),
    buyerFullName: anonymizeName(assignment.buyerFullName),
    buyerGreetingName: anonymizeGreeting(assignment.buyerGreetingName),
    secondaryBuyerEmail: assignment.secondaryBuyerEmail
      ? anonymizeEmail(assignment.secondaryBuyerEmail)
      : null,
    jointBuyersName: assignment.jointBuyersName
      ? anonymizeCompany(assignment.jointBuyersName)
      : null,
    realEstateAgentName: anonymizeAgentName(assignment.realEstateAgentName),
    agentEmail: anonymizeAgentEmail(assignment.agentEmail),
    docusignLink: null,
    bnpReportLink: null,
    financeLetterLink: null,
    contractDownloadLink: null,
    cashflowDocLink: null,
  }
}

// Apply anonymization to full buyer brief
export function anonymizeBrief(brief) {
  if (!isDemoMode || !brief) return brief
  return {
    ...brief,
    fullName:      anonymizeName(brief.fullName),
    email:         anonymizeEmail(brief.email),
    secondaryEmail: brief.secondaryEmail ? anonymizeEmail(brief.secondaryEmail) : null,
    greetingName:  anonymizeGreeting(brief.greetingName),
    financerName:  brief.financerName ? anonymizeName(brief.financerName) : null,
    assignedAgents: Array.isArray(brief.assignedAgents)
      ? brief.assignedAgents.map(a => anonymizeAgentName(a))
      : brief.assignedAgents,
  }
}

const SCRUB_PATTERN = [
  [/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g,                                              'Client'],
  [/\d+ [A-Z][a-z]+ (Street|Avenue|Drive|Road|Court|Place|Crescent|Close|Way)/g, 'the property'],
  [/\S+@\S+\.\S+/g,                                                               'client@demo.com.au'],
]

function scrubText(text) {
  if (!text) return text
  return SCRUB_PATTERN.reduce((t, [re, sub]) => t.replace(re, sub), text)
}

// Apply anonymization to notification
export function anonymizeNotification(notification) {
  if (!isDemoMode || !notification) return notification
  return {
    ...notification,
    title:   scrubText(notification.title),
    message: scrubText(notification.message),
  }
}

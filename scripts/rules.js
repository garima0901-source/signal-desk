// Classification rules. Every rule here is documented on the Method page.
// Input entity: { n: name, t: CompanyCategory, s: [5-digit SIC codes], pc: postcode }

const MANAGER_SIC = new Set(['66300', '64303', '64304', '64301']);
const ADVISORY_SIC = new Set(['66190', '70221', '64999', '66120', '64991', '64205']);

const RX = {
  deal: /\b(BIDCO|MIDCO|TOPCO)\b/,
  // "GP" only counts in the fund position: after the first word and followed by a legal suffix,
  // a bracket, a numeral or the end of the name (e.g. "X FUND III GP LIMITED", "X (GP) LLP").
  gp: /.\b(GP\b(?=\s*(\(|\)|LIMITED|LTD|LLP|L\.?P\.?\b|S\.?A\.?R\.?L|NO\b|[IVX]+\b|\d|$))|\(GP\)|G\.P\.|GENERAL PARTNER|CARRY\b|CARRIED INTEREST|CO-?INVEST(MENT)?\b|COINVEST(MENT)?\b|FEEDER\b|FOUNDER PARTNER|MANAGING MEMBER|SLP\b)/,
  // "GP" is also a doctor's surgery; "carry" is also cash-and-carry.
  gpFalse: /(SURGERY|PRACTICE|MEDICAL|HEALTH|DOCTOR|CLINIC|LOCUM|\bPCN\b|PRIMARY CARE|CASH\s*(&|AND)?\s*CARRY|&\s*GP\b)/,
  manager: /\b(CAPITAL|INVESTMENT MANAGEMENT|INVESTMENTS MANAGEMENT|ASSET MANAGEMENT|FUND MANAGEMENT|INVESTORS|EQUITY|VENTURES|PRIVATE CREDIT|CREDIT PARTNERS|INVESTMENT PARTNERS|INVESTMENT ADVIS[OE]RS|GROWTH PARTNERS)\b/,
  managerFalse: /\b(PROPERTY|PROPERTIES|HOMES|ESTATES?|LETTINGS|CONSTRUCTION|BUILDERS)\b/,
  advisory: /\b(CORPORATE FINANCE|M ?& ?A|MERGERS|TRANSACTION ADVISORY|CAPITAL ADVIS[OE]RS|CAPITAL MARKETS ADVIS[OE]RS|INVESTMENT BANK(ING)?|DEBT ADVIS[OE]RY)\b/,
};

// Returns one of fund | deal | gp | manager | advisory, or null. First match wins.
function classify(e) {
  const name = e.n.toUpperCase();
  if (e.t === 'Limited Partnership') return 'fund';
  if (RX.deal.test(name)) return 'deal';
  if (RX.gp.test(name) && !RX.gpFalse.test(name)) return 'gp';
  const isLLP = e.t === 'Limited Liability Partnership';
  if ((isLLP || e.s.some(s => MANAGER_SIC.has(s))) && RX.manager.test(name) && !RX.managerFalse.test(name)) return 'manager';
  if (e.s.some(s => ADVISORY_SIC.has(s)) && RX.advisory.test(name)) return 'advisory';
  return null;
}

// Name stem used to group entities that look like one sponsor's structure:
// first one or two words before a structural marker or a number.
const MARKERS = new Set(['GP', 'G', 'P', 'GENERAL', 'CARRY', 'CARRIED', 'CO', 'COINVEST', 'CO-INVEST', 'CO-INVESTMENT',
  'FEEDER', 'FOUNDER', 'LP', 'L', 'LLP', 'SLP', 'LIMITED', 'LTD', 'PARTNERSHIP', 'BIDCO', 'MIDCO', 'TOPCO', 'HOLDCO',
  'HOLDINGS', 'NOMINEE', 'NOMINEES', 'MANAGING', 'FUND', 'PF', 'SCSP', 'EXECUTIVE']);
const ROMAN = /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)$/;
const GENERIC = new Set(['CAPITAL', 'PARTNERS', 'GLOBAL', 'UK', 'EUROPE', 'EUROPEAN', 'PRIVATE', 'INVESTMENT', 'INVESTMENTS',
  'EQUITY', 'VENTURES', 'GROUP', 'PROJECT', 'NEW', 'FIRST', 'GREEN', 'LONDON', 'BRITISH', 'INTERNATIONAL', 'GROWTH',
  'INFRASTRUCTURE', 'REAL', 'CREDIT', 'ASSET', 'THE', 'AND', '&']);

const CONNECT = new Set(['TO', 'OF', 'AND', '&', 'DE', 'LA', 'THE']);

function familyKey(name) {
  const tokens = name.toUpperCase().replace(/[^A-Z0-9&\- ]/g, ' ').split(/\s+/).filter(Boolean);
  if (tokens[0] === 'THE') tokens.shift();
  const stem = [];
  for (const t of tokens) {
    if (MARKERS.has(t) || ROMAN.test(t) || /\d/.test(t)) break;
    stem.push(t);
    // Keep going past a connector so "BORDER TO COAST" doesn't stop at "BORDER TO".
    if (stem.length >= 2 && !CONNECT.has(t) && !stem.every(x => GENERIC.has(x))) break;
    if (stem.length === 4) break;
  }
  while (stem.length && CONNECT.has(stem[stem.length - 1])) stem.pop();
  if (!stem.length) return null;
  if (stem.every(t => GENERIC.has(t))) return null;
  if (stem.length === 1 && stem[0].length < 3) return null;
  return stem.join(' ');
}

function region(e) {
  const pc = e.pc.replace(/\s+/g, '');
  if (/^(EC|WC|E|N|NW|SE|SW|W)\d/.test(pc)) return 'London';
  if (/^EH\d/.test(pc)) return 'Edinburgh';
  if (/^(GY|JE|IM)\d/.test(pc)) return 'Channel Islands & IoM';
  if (!pc) return 'Unknown';
  return 'Rest of UK';
}

module.exports = { classify, familyKey, region };

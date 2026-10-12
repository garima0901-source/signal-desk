// Build public/data/signals.json from the Companies House "Basic Company Data" snapshot.
// Source: https://download.companieshouse.gov.uk/en_output.html (free, monthly, no key).
// Usage: node scripts/build-data.js <snapshot.csv | -> <snapshotDate YYYY-MM-DD>
// Pass "-" to read the CSV from stdin (e.g. `unzip -p snapshot.zip | node ...`).
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
const { classify, familyKey, region } = require('./rules');

const [src, snapshotDate] = process.argv.slice(2);
if (!src || !/^\d{4}-\d{2}-\d{2}$/.test(snapshotDate || '')) {
  console.error('usage: node scripts/build-data.js <csv|-> <YYYY-MM-DD>');
  process.exit(1);
}

// Window: the 24 full months before the snapshot date (trend) and the last 12 (feed).
const snap = new Date(snapshotDate + 'T00:00:00Z');
const monthStart = (d, back) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - back, 1)).toISOString().slice(0, 10);
const trendFrom = monthStart(snap, 24);
const feedFrom = monthStart(snap, 12);
const until = monthStart(snap, 0); // exclusive: first day of snapshot month

const toISO = d => (d ? d.split('/').reverse().join('-') : '');
const entities = [];
let scanned = 0;

const input = src === '-' ? process.stdin : fs.createReadStream(src);
input
  .pipe(parse({ columns: h => h.map(s => s.trim()), relax_quotes: true, relax_column_count: true }))
  .on('data', r => {
    scanned++;
    const d = toISO(r.IncorporationDate);
    if (!d || d < trendFrom || d >= until) return;
    const e = {
      n: (r.CompanyName || '').trim(),
      id: r.CompanyNumber,
      d,
      t: r.CompanyCategory,
      s: ['SICCode.SicText_1', 'SICCode.SicText_2', 'SICCode.SicText_3', 'SICCode.SicText_4']
        .map(k => r[k]).filter(Boolean).map(s => s.slice(0, 5)),
      town: (r['RegAddress.PostTown'] || '').trim(),
      pc: (r['RegAddress.PostCode'] || '').trim().toUpperCase(),
      lp: +r['LimitedPartnerships.NumLimPartners'] || 0,
    };
    const k = classify(e);
    if (!k) return;
    e.k = k;
    e.r = region(e);
    entities.push(e);
  })
  .on('error', err => { console.error(err); process.exit(1); })
  .on('end', () => {
    // Monthly trend: [month, region, type, count] rows.
    const tc = {};
    for (const e of entities) {
      const key = [e.d.slice(0, 7), e.r, e.k].join('|');
      tc[key] = (tc[key] || 0) + 1;
    }
    const trend = Object.entries(tc).map(([key, c]) => [...key.split('|'), c]).sort();

    // Feed: last 12 months only.
    const feed = entities.filter(e => e.d >= feedFrom).sort((a, b) => b.d.localeCompare(a.d) || a.n.localeCompare(b.n));

    // Families: 2+ fund-structure entities in the feed window sharing a name stem.
    const groups = {};
    for (const e of feed) {
      if (e.k === 'manager' || e.k === 'advisory') continue;
      const key = familyKey(e.n);
      if (!key) continue;
      (groups[key] ??= []).push(e.id);
    }
    const families = Object.entries(groups)
      .filter(([, ids]) => ids.length >= 2)
      .map(([key, ids]) => ({ key, ids }))
      .sort((a, b) => b.ids.length - a.ids.length || a.key.localeCompare(b.key));
    const famOf = {};
    families.forEach(f => f.ids.forEach(id => { famOf[id] = f.key; }));

    const out = {
      meta: {
        source: 'Companies House — Free Company Data Product (Basic Company Data)',
        sourceUrl: 'https://download.companieshouse.gov.uk/en_output.html',
        licence: 'Contains public sector information licensed under the Open Government Licence v3.0.',
        snapshotDate, built: new Date().toISOString().slice(0, 10),
        trendFrom, feedFrom, until, scanned, matched: entities.length,
      },
      trend,
      families,
      feed: feed.map(e => ({ n: e.n, id: e.id, d: e.d, k: e.k, t: e.t, s: e.s, town: e.town, pc: e.pc, lp: e.lp, r: e.r, f: famOf[e.id] || null })),
    };
    const dest = path.join(__dirname, '..', 'public', 'data', 'signals.json');
    fs.writeFileSync(dest, JSON.stringify(out));
    console.log(`scanned ${scanned} rows; ${entities.length} signals since ${trendFrom}; feed ${feed.length}; families ${families.length}`);
  });

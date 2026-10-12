// Pass 1: stream the Companies House "Basic Company Data" snapshot and keep only
// recent finance-relevant entities. Output is a compact JSON the build step reads.
// Usage: node scripts/extract.js <snapshot.csv> <out.json> [sinceISO]
const fs = require('fs');
const { parse } = require('csv-parse');

const [file, out, since = '2024-10-01'] = process.argv.slice(2);

// SIC codes kept for companies (partnerships carry no SIC codes on the register).
const SIC_KEEP = new Set([
  '64205', '64301', '64302', '64303', '64304', '64305', '64306',
  '64991', '64999', '66120', '66190', '66300', '70221',
]);
const PARTNERSHIP = /^(Limited Partnership|Limited Liability Partnership|Scottish Partnership)$/;

const toISO = d => (d ? d.split('/').reverse().join('-') : '');
const kept = [];

fs.createReadStream(file)
  .pipe(parse({ columns: h => h.map(s => s.trim()), relax_quotes: true, relax_column_count: true }))
  .on('data', r => {
    const inc = toISO(r.IncorporationDate);
    if (!inc || inc < since) return;
    const sic = ['SICCode.SicText_1', 'SICCode.SicText_2', 'SICCode.SicText_3', 'SICCode.SicText_4']
      .map(k => r[k]).filter(Boolean).map(s => s.slice(0, 5));
    const isP = PARTNERSHIP.test(r.CompanyCategory);
    if (!isP && !sic.some(s => SIC_KEEP.has(s))) return;
    kept.push({
      n: r.CompanyName, id: r.CompanyNumber, d: inc, t: r.CompanyCategory, s: sic,
      town: r['RegAddress.PostTown'], pc: r['RegAddress.PostCode'], st: r.CompanyStatus,
      gp: +r['LimitedPartnerships.NumGenPartners'] || 0, lp: +r['LimitedPartnerships.NumLimPartners'] || 0,
    });
  })
  .on('end', () => {
    fs.writeFileSync(out, JSON.stringify(kept));
    console.log(`kept ${kept.length} entities incorporated since ${since}`);
  });

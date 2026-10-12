// Shared: theme toggle, signal-type metadata, formatting, data loading.
(function () {
  const root = document.documentElement;
  try { const t = localStorage.getItem('sd-theme'); if (t) root.dataset.theme = t; } catch (e) {}
  document.addEventListener('click', e => {
    const b = e.target.closest('.theme-btn');
    if (!b) return;
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('sd-theme', root.dataset.theme); } catch (e) {}
  });
})();

const SD = {
  TYPES: {
    fund: { label: 'New fund partnership', short: 'Fund LP', desc: 'A limited partnership registered at Companies House, the usual legal form for UK private equity, venture and infrastructure fund vehicles.' },
    gp: { label: 'GP, carry or co-invest entity', short: 'GP / carry', desc: 'A company or LLP whose name marks it as a fund’s general partner, carried-interest vehicle, co-investment or feeder entity.' },
    deal: { label: 'Deal vehicle (BidCo / MidCo / TopCo)', short: 'Deal vehicle', desc: 'A newly incorporated BidCo, MidCo or TopCo, the acquisition stack typically set up for a sponsor-backed transaction.' },
    manager: { label: 'New manager or investment firm', short: 'Manager', desc: 'A new company declaring fund management, venture capital or investment-company activity (or an LLP) with an investment-firm name.' },
    advisory: { label: 'New advisory boutique', short: 'Advisory', desc: 'A new financial-services company whose name says corporate finance, M&A, capital or debt advisory.' },
  },
  ORDER: ['deal', 'fund', 'manager', 'gp', 'advisory'],
  fmt: n => n.toLocaleString('en-GB'),
  month: m => new Date(m + '-01T00:00:00Z').toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' }),
  date: d => new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }),
  chUrl: id => 'https://find-and-update.company-information.service.gov.uk/company/' + encodeURIComponent(id),
  esc: s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
  load: () => fetch('data/signals.json').then(r => { if (!r.ok) throw new Error('data ' + r.status); return r.json(); }),
};

// Playbook page: live counts, tiering, coverage planner and plays.
(async function () {
  const { TYPES, ORDER, fmt, month, esc } = SD;
  const $ = s => document.querySelector(s);

  const PLAYS = {
    deal: {
      title: 'The deal just signed',
      when: 'A BidCo, MidCo or TopCo is registered. A sponsor-backed acquisition is usually close to signing or completion.',
      who: 'Deal team VP and partner at the sponsor; COO for the paper process.',
      research: 'Officers and persons with significant control on the new entity point to the sponsor. Check the sponsor’s website and the trade press before mentioning the deal.',
      angle: 'Diligence is finished, but the work isn’t: the 100-day plan, add-on screening, lender and LP reporting. Then the next deal starts.',
      seq: [
        ['Email · day 1', 'Subject: [Firm] after the close\n\nHi [Name], once a deal closes the work moves to the 100-day plan and add-on screening, usually with the same team still running live processes. [Product] gives [Firm]’s associates cited first drafts of add-on screens and portfolio updates from the documents you already have. Would a 20-minute look at an add-on screen be useful?'],
        ['LinkedIn · day 3', 'Connect with no pitch. If they accept, mention one specific thing from the firm’s published portfolio or strategy.'],
        ['Email · day 8', 'One proof point: a short example of a cited output on a public company in the same sector as the deal. Then a direct question about who owns add-on research.'],
      ],
    },
    fund: {
      title: 'New fund, new deployment period',
      when: 'A new limited partnership is registered. The number of limited partners shows how widely it has already been raised.',
      who: 'Managing partner and COO; investment team principals.',
      research: 'Confirm the fund on the manager’s website or in press coverage. Check whether earlier funds in the same family (II, III, IV…) show a pattern.',
      angle: 'A new fund means years of deployment ahead. This is the moment to set up the team’s tools before deal volume rises.',
      seq: [
        ['Email · day 1', 'Subject: Deployment capacity for [Fund name or “the new fund”]\n\nHi [Name], at the start of a deployment period the team usually screens far more than it closes. [Product] gives each associate cited first-pass screens and comps, so the funnel can widen without adding headcount. Open to comparing notes on how [Firm] screens today?'],
        ['LinkedIn · day 4', 'Engage with the firm’s fund announcement if there is one. Otherwise, connect with the principal running sourcing.'],
        ['Email · day 9', 'A short note for the COO: security posture, data handling and how pilots are scoped, so the operations question is answered before it comes up.'],
      ],
    },
    gp: {
      title: 'The structure around a fund',
      when: 'A GP, carry, co-invest or feeder entity is registered, often in a group with a new fund partnership.',
      who: 'Same as the fund play; co-invest entities point to a specific deal team.',
      research: 'Use the sponsor groups on the feed: a GP, a carry vehicle and an LP registered together confirm a fund build. A co-invest vehicle on its own points to a live deal.',
      angle: 'This confirms the timing for the fund play; for co-invest vehicles, use the deal play.',
      seq: [
        ['Routing rule', 'Never sequence on a GP or carry entity alone. Attach it to the sponsor account as supporting evidence and run the fund or deal play.'],
      ],
    },
    manager: {
      title: 'A new firm setting up its tools',
      when: 'A new fund manager, venture firm or investment LLP is registered. This is often a spin-out or first-time manager.',
      who: 'Founding partners. They are buyer and user at once.',
      research: 'Find the founders’ previous firm (their own profiles and the firm’s website). Check whether a first fund has been announced.',
      angle: 'The research depth of a larger firm before hiring a team to match. There are no existing tools to replace and no committee to convince.',
      seq: [
        ['Email · day 1', 'Subject: Research capacity for a new firm\n\nHi [Name], congratulations on setting up [Firm]. New firms often run the pipeline and the fundraise at the same time with a small team. [Product] gives you cited research, comps and memo drafts from day one. Worth 15 minutes?'],
        ['LinkedIn · day 2', 'Founders are usually active on LinkedIn: comment on their launch post before connecting.'],
        ['Email · day 7', 'Offer something useful to the fundraise, such as a cited market map of their stated strategy, built in the product.'],
      ],
    },
    advisory: {
      title: 'A new advisory boutique',
      when: 'A new corporate finance, M&A or debt advisory company is registered.',
      who: 'Founding director; the firm’s first associates.',
      research: 'The founders’ previous banks or advisers, their sector focus, and any first mandates announced.',
      angle: 'Pitches, information memoranda and buyer lists at a larger bank’s pace with a boutique’s headcount.',
      seq: [
        ['Email · day 1', 'Subject: Pitch prep at [Firm]\n\nHi [Name], new boutiques win on senior attention, and the groundwork (pitch books, buyer universes, memorandum drafts) takes up that time. [Product] drafts it with sources, so your time goes to clients. Could I show you a buyer-universe build in [sector]?'],
        ['LinkedIn · day 3', 'Connect, and refer to the sector focus listed on their website.'],
        ['Email · day 8', 'Send a sample buyer universe for a public company in their sector, with a citation for each entry.'],
      ],
    },
  };

  let data;
  try { data = await SD.load(); } catch (e) { $('#why-stats').textContent = 'Could not load data.'; return; }
  const { feed, trend, families, meta } = data;
  const famSize = Object.fromEntries(families.map(f => [f.key, f.ids.length]));
  const byId = Object.fromEntries(feed.map(e => [e.id, e]));
  const dealStacks = new Set(families.filter(f => f.ids.filter(id => byId[id].k === 'deal').length >= 2).map(f => f.key));

  // ---- why stats
  const c = {}; feed.forEach(e => { c[e.k] = (c[e.k] || 0) + 1; });
  const lon = feed.filter(e => e.r === 'London').length;
  const bigFunds = feed.filter(e => e.k === 'fund' && e.lp >= 10).length;
  $('#why-stats').innerHTML = `
    <div class="out-row"><span>Deal vehicles (BidCo / MidCo / TopCo)</span><b>${fmt(c.deal || 0)}</b></div>
    <div class="out-row"><span>New fund partnerships</span><b>${fmt(c.fund || 0)}</b></div>
    <div class="out-row"><span>…of which with 10+ limited partners</span><b>${fmt(bigFunds)}</b></div>
    <div class="out-row"><span>GP, carry and co-invest entities</span><b>${fmt(c.gp || 0)}</b></div>
    <div class="out-row"><span>New managers and advisory boutiques</span><b>${fmt((c.manager || 0) + (c.advisory || 0))}</b></div>
    <div class="out-row"><span>Sponsor groups (2+ related entities)</span><b>${fmt(families.length)}</b></div>
    <div class="out-row"><span>Share registered in London</span><b>${Math.round(lon / feed.length * 100)}%</b></div>
    <p class="muted" style="font-size:12px;margin:10px 0 0">Companies House snapshot dated ${meta.snapshotDate}. <a href="./">Open the feed</a>.</p>`;

  // ---- tiers
  const u = new Date(meta.until + 'T00:00:00Z'); u.setUTCMonth(u.getUTCMonth() - 3);
  const recentFrom = u.toISOString().slice(0, 10);
  const strong = e => (e.f && famSize[e.f] >= 3) || (e.k === 'fund' && e.lp >= 10) || (e.k === 'deal' && e.f && dealStacks.has(e.f));
  const tierOf = e => {
    if (strong(e) && e.d >= recentFrom) return 'A';
    if (strong(e) || (['fund', 'gp', 'deal'].includes(e.k) && ['London', 'Edinburgh'].includes(e.r)) || (['manager', 'advisory'].includes(e.k) && e.r === 'London')) return 'B';
    return 'C';
  };
  const tc = { A: 0, B: 0, C: 0 }; feed.forEach(e => { tc[tierOf(e)]++; });
  $('#tier-rows').innerHTML = `
    <tr><td><b>A</b></td><td>Registered in the last 3 months (since ${SD.date(recentFrom)}) <i>and</i> in a sponsor group of 3+ entities, <i>or</i> a fund partnership with 10+ limited partners, <i>or</i> a deal vehicle that is part of a 2+ entity acquisition stack</td><td>Recent, and several signals point to the same sponsor, or the fund is clearly being raised</td><td class="num">${fmt(tc.A)}</td><td>Research within 48 hours; multi-persona sequence; manager reviews the first line</td></tr>
    <tr><td><b>B</b></td><td>The same strong signals but older than 3 months, <i>or</i> any other fund, GP or deal entity in London or Edinburgh, <i>or</i> a new manager or advisory firm in London</td><td>A real signal in the core market, but a single data point</td><td class="num">${fmt(tc.B)}</td><td>Research within the week; standard play</td></tr>
    <tr><td><b>C</b></td><td>Everything else in the feed</td><td>Outside the core regions, or weaker on its own</td><td class="num">${fmt(tc.C)}</td><td>Batch monthly; marketing nurture unless research upgrades it</td></tr>`;

  // ---- coverage planner
  const months = [...new Set(trend.map(t => t[0]))].sort().slice(-12);
  const types = new Set(['deal', 'fund', 'manager', 'advisory']);
  $('#p-types').innerHTML = ORDER.map(k => `<button class="chip k-${k}" data-k="${k}" aria-pressed="${types.has(k)}"><span class="dot"></span>${TYPES[k].short}</button>`).join('');
  $('#p-types').addEventListener('click', e => {
    const b = e.target.closest('[data-k]'); if (!b) return;
    types.has(b.dataset.k) ? types.delete(b.dataset.k) : types.add(b.dataset.k);
    b.setAttribute('aria-pressed', types.has(b.dataset.k)); plan();
  });
  ['#p-region', '#p-fit', '#p-heads', '#p-cap', '#p-mtg'].forEach(s => $(s).addEventListener('input', plan));
  function plan() {
    const region = $('#p-region').value;
    const num = (s, lo, hi) => Math.min(hi, Math.max(lo, +$(s).value || 0));
    const fit = num('#p-fit', 0, 100) / 100, heads = num('#p-heads', 0, 50), cap = num('#p-cap', 0, 200), mtg = num('#p-mtg', 0, 100) / 100;
    const total = trend.filter(([m, r, k]) => months.includes(m) && (region === 'all' || r === region) && types.has(k)).reduce((s, t) => s + t[3], 0);
    const perMonth = total / 12;
    const accounts = perMonth * fit;
    const capacity = heads * cap * 52 / 12;
    const worked = Math.min(accounts, capacity);
    const coverage = accounts ? Math.min(1, capacity / accounts) : 0;
    const needed = cap ? Math.ceil(accounts / (cap * 52 / 12)) : 0;
    $('#p-out').innerHTML = `
      <h3>Monthly picture</h3>
      <div class="out-row"><span>Signals per month in scope <small>(real, 12-month average)</small></span><b>${fmt(Math.round(perMonth))}</b></div>
      <div class="out-row"><span>Researchable target accounts per month</span><b>${fmt(Math.round(accounts))}</b></div>
      <div class="out-row"><span>Team research capacity per month</span><b>${fmt(Math.round(capacity))}</b></div>
      <div class="out-row"><span>Coverage of signal accounts</span><b>${Math.round(coverage * 100)}%</b></div>
      <div class="out-row"><span>First meetings per month from signals</span><b>${fmt(Math.round(worked * mtg))}</b></div>
      <div class="out-row"><span>Associates needed for full coverage</span><b>${fmt(needed)}</b></div>
      <p class="muted" style="font-size:13px;margin:12px 0 0">${coverage < 1
        ? `Capacity is the constraint: about ${fmt(Math.round(accounts - capacity))} signal accounts a month go unworked. Tier A first, then B; C goes to nurture.`
        : `The signals run out before capacity does: about ${fmt(Math.round(capacity - accounts))} research slots a month are free for inbound, named-account and expansion work.`}
      Signals are monthly registrations ${month(months[0])} – ${month(months[months.length - 1])}.</p>`;
  }
  plan();

  // ---- plays
  $('#plays-list').innerHTML = ORDER.map((k, i) => {
    const p = PLAYS[k];
    return `<details class="play"${i === 0 ? ' open' : ''}>
      <summary><span class="tag k-${k}"><span class="dot"></span>${TYPES[k].short}</span><span class="t">${p.title}</span><span class="c">${fmt(c[k] || 0)} signals / 12 mo</span></summary>
      <div class="body">
        <div class="prose" style="font-size:14px">
          <p><b>Trigger.</b> ${p.when}</p>
          <p><b>Who.</b> ${p.who}</p>
          <p><b>Research step.</b> ${p.research}</p>
          <p><b>Angle.</b> ${p.angle}</p>
        </div>
        <div>${p.seq.map(([h, t]) => `<div class="seq"><b>${h}</b>${esc(t).replace(/\n/g, '<br>')}</div>`).join('')}</div>
      </div>
    </details>`;
  }).join('');
})();

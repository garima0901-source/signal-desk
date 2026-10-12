// Signal feed page.
(async function () {
  const { TYPES, ORDER, fmt, month, date, chUrl, esc } = SD;
  const $ = s => document.querySelector(s);
  let data;
  try { data = await SD.load(); } catch (e) {
    $('#stamp').textContent = 'Could not load the data file. Please refresh.';
    return;
  }
  const { meta, feed, families, trend } = data;
  const byId = Object.fromEntries(feed.map(e => [e.id, e]));
  $('#stamp').innerHTML = `Snapshot dated <b>${date(meta.snapshotDate)}</b> · covers registrations ${month(meta.feedFrom.slice(0, 7))} – ${month(prevMonth(meta.until))} · ${fmt(meta.scanned)} register entries scanned`;
  $('#kpi-range').textContent = `${month(meta.feedFrom.slice(0, 7))} – ${month(prevMonth(meta.until))}`;

  function prevMonth(iso) { const d = new Date(iso + 'T00:00:00Z'); d.setUTCMonth(d.getUTCMonth() - 1); return d.toISOString().slice(0, 7); }

  // ---- state
  const state = { types: new Set(ORDER), q: '', region: '', month: '', sort: 'new', famOnly: false, fam: '', page: 0 };
  const PAGE = 50;

  // ---- KPIs
  const counts = {};
  feed.forEach(e => { counts[e.k] = (counts[e.k] || 0) + 1; });
  $('#kpis').innerHTML = ORDER.map(k => `
    <button class="kpi k-${k}" data-k="${k}" style="text-align:left;cursor:pointer;font:inherit;color:inherit">
      <div class="v">${fmt(counts[k] || 0)}</div>
      <div class="l"><span class="dot"></span>${TYPES[k].label}</div>
    </button>`).join('');
  $('#kpis').addEventListener('click', e => {
    const b = e.target.closest('[data-k]'); if (!b) return;
    state.types = new Set([b.dataset.k]); state.page = 0; syncChips(); render(); jump();
  });

  // ---- type chips
  $('#type-chips').innerHTML = ORDER.map(k => `<button class="chip k-${k}" data-k="${k}" aria-pressed="true"><span class="dot"></span>${TYPES[k].short} <span class="muted">${fmt(counts[k] || 0)}</span></button>`).join('');
  $('#type-chips').addEventListener('click', e => {
    const b = e.target.closest('[data-k]'); if (!b) return;
    const k = b.dataset.k;
    if (state.types.size === ORDER.length) state.types = new Set([k]);
    else if (state.types.has(k)) { state.types.delete(k); if (!state.types.size) state.types = new Set(ORDER); }
    else state.types.add(k);
    state.page = 0; syncChips(); render();
  });
  function syncChips() {
    document.querySelectorAll('#type-chips [data-k]').forEach(b => b.setAttribute('aria-pressed', state.types.has(b.dataset.k)));
    $('#fam-only').setAttribute('aria-pressed', state.famOnly);
    $('#region').value = state.region; $('#month').value = state.month; $('#q').value = state.q; $('#sort').value = state.sort;
  }

  // ---- selects
  const regions = [...new Set(feed.map(e => e.r))].sort();
  $('#region').insertAdjacentHTML('beforeend', regions.map(r => `<option>${esc(r)}</option>`).join(''));
  const months = [...new Set(feed.map(e => e.d.slice(0, 7)))].sort().reverse();
  $('#month').insertAdjacentHTML('beforeend', months.map(m => `<option value="${m}">${month(m)}</option>`).join(''));
  $('#q').addEventListener('input', e => { state.q = e.target.value.trim().toUpperCase(); state.fam = ''; state.page = 0; render(); });
  $('#region').addEventListener('change', e => { state.region = e.target.value; state.page = 0; render(); });
  $('#month').addEventListener('change', e => { state.month = e.target.value; state.page = 0; render(); });
  $('#sort').addEventListener('change', e => { state.sort = e.target.value; state.page = 0; render(); });
  $('#fam-only').addEventListener('click', () => { state.famOnly = !state.famOnly; state.page = 0; syncChips(); render(); });
  $('#clear').addEventListener('click', () => { Object.assign(state, { types: new Set(ORDER), q: '', region: '', month: '', sort: 'new', famOnly: false, fam: '', page: 0 }); syncChips(); render(); });
  $('#prev').addEventListener('click', () => { if (state.page > 0) { state.page--; render(); } });
  $('#next').addEventListener('click', () => { state.page++; render(); });

  function filtered() {
    let rows = feed.filter(e => state.types.has(e.k)
      && (!state.region || e.r === state.region)
      && (!state.month || e.d.startsWith(state.month))
      && (!state.famOnly || e.f)
      && (!state.fam || e.f === state.fam)
      && (!state.q || e.n.includes(state.q) || e.pc.replace(/\s/g, '').startsWith(state.q.replace(/\s/g, ''))));
    if (state.sort === 'lp') rows = rows.slice().sort((a, b) => b.lp - a.lp || b.d.localeCompare(a.d));
    if (state.sort === 'name') rows = rows.slice().sort((a, b) => a.n.localeCompare(b.n));
    return rows;
  }

  function render() {
    const rows = filtered();
    const pages = Math.max(1, Math.ceil(rows.length / PAGE));
    state.page = Math.min(state.page, pages - 1);
    const slice = rows.slice(state.page * PAGE, state.page * PAGE + PAGE);
    $('#count').textContent = `${fmt(rows.length)} entities${state.fam ? ` in group “${state.fam}”` : ''}`;
    $('#rows').innerHTML = slice.length ? slice.map(e => `
      <tr>
        <td style="white-space:nowrap">${date(e.d)}</td>
        <td class="name"><a href="${chUrl(e.id)}" target="_blank" rel="noopener">${esc(e.n)}</a><br><small class="mono">${esc(e.id)}</small>${e.f ? ` <button class="fam" data-f="${esc(e.f)}" title="Show this sponsor group">${esc(e.f)} group</button>` : ''}</td>
        <td><span class="tag k-${e.k}"><span class="dot"></span>${TYPES[e.k].short}</span></td>
        <td class="hide-sm">${esc(e.t.replace('Limited Liability Partnership', 'LLP').replace('Private Limited Company', 'Private Ltd'))}</td>
        <td class="hide-sm">${esc(e.town || '')}<br><small>${esc(e.pc)} · ${esc(e.r)}</small></td>
        <td class="num">${e.t === 'Limited Partnership' ? fmt(e.lp) : '<span class="muted">–</span>'}</td>
      </tr>`).join('') : `<tr><td colspan="6" class="muted">No entities match these filters.</td></tr>`;
    $('#page-info').textContent = rows.length ? `Showing ${fmt(state.page * PAGE + 1)}–${fmt(state.page * PAGE + slice.length)} of ${fmt(rows.length)}` : '';
    $('#prev').disabled = state.page === 0; $('#next').disabled = state.page >= pages - 1;
  }
  $('#rows').addEventListener('click', e => {
    const b = e.target.closest('[data-f]'); if (!b) return;
    showFamily(b.dataset.f);
  });
  function showFamily(f) {
    Object.assign(state, { types: new Set(ORDER), q: '', region: '', month: '', famOnly: false, fam: f, page: 0, sort: 'new' });
    syncChips(); render(); jump();
  }
  function jump() { $('#feed-section').scrollIntoView({ behavior: 'smooth', block: 'start' }); }

  // ---- CSV export of the current filter
  $('#export').addEventListener('click', () => {
    const q = v => `"${String(v).replace(/"/g, '""')}"`;
    const lines = [['registered', 'company_number', 'name', 'signal', 'legal_form', 'post_town', 'postcode', 'region', 'limited_partners', 'sponsor_group', 'companies_house_url'].join(',')];
    filtered().forEach(e => lines.push([e.d, e.id, e.n, TYPES[e.k].label, e.t, e.town, e.pc, e.r, e.t === 'Limited Partnership' ? e.lp : '', e.f || '', chUrl(e.id)].map(q).join(',')));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `signal-desk-${meta.snapshotDate}.csv` });
    a.click(); URL.revokeObjectURL(a.href);
  });

  // ---- families
  let famShown = 24;
  function renderFamilies() {
    $('#families').innerHTML = families.slice(0, famShown).map(f => {
      const ents = f.ids.map(id => byId[id]);
      const types = [...new Set(ents.map(e => e.k))];
      const last = ents.map(e => e.d).sort().pop();
      return `<button class="family" data-f="${esc(f.key)}">
        <div class="k">${esc(f.key)}</div>
        <div class="m">${f.ids.length} entities · latest ${date(last)}</div>
        <div class="m">${types.map(k => TYPES[k].short).join(' · ')}</div>
        <div class="bars">${ents.slice(0, 30).map(e => `<i class="k-${e.k}"></i>`).join('')}</div>
      </button>`;
    }).join('');
    $('#more-fam').hidden = famShown >= families.length;
  }
  $('#families').addEventListener('click', e => { const b = e.target.closest('[data-f]'); if (b) showFamily(b.dataset.f); });
  $('#more-fam').addEventListener('click', () => { famShown += 24; renderFamilies(); });

  // ---- glossary
  $('#glossary').innerHTML = ORDER.map(k => `<div class="card"><h3 class="tag k-${k}" style="font-size:17px;color:var(--ink)"><span class="dot"></span>${TYPES[k].label}</h3><p class="muted" style="margin:6px 0 0;font-size:14px">${TYPES[k].desc}</p></div>`).join('');

  // ---- trend chart (stacked bars, inline SVG)
  const tip = $('#tip');
  function renderTrend(region) {
    const ms = [...new Set(trend.map(t => t[0]))].sort();
    const agg = Object.fromEntries(ms.map(m => [m, {}]));
    trend.forEach(([m, r, k, c]) => { if (region === 'all' || r === region) agg[m][k] = (agg[m][k] || 0) + c; });
    const totals = ms.map(m => ORDER.reduce((s, k) => s + (agg[m][k] || 0), 0));
    const max = Math.max(...totals, 1);
    const step = niceStep(max);
    const top = Math.ceil(max / step) * step;
    const W = 1000, H = 300, L = 44, R = 8, T = 10, B = 30;
    const bw = (W - L - R) / ms.length;
    const y = v => T + (H - T - B) * (1 - v / top);
    let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Monthly registrations by signal type">`;
    svg += '<g class="grid">';
    for (let v = 0; v <= top; v += step) svg += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/>`;
    svg += '</g><g class="axis">';
    for (let v = 0; v <= top; v += step) svg += `<text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${fmt(v)}</text>`;
    ms.forEach((m, i) => { if (i % 3 === 0 || i === ms.length - 1) svg += `<text x="${L + i * bw + bw / 2}" y="${H - 10}" text-anchor="middle">${month(m)}</text>`; });
    svg += '</g>';
    const feedStart = meta.feedFrom.slice(0, 7);
    ms.forEach((m, i) => {
      let acc = 0;
      const x = L + i * bw + bw * 0.12, w = bw * 0.76;
      svg += `<g data-m="${m}" style="cursor:${m >= feedStart ? 'pointer' : 'default'}" opacity="${m >= feedStart ? 1 : .55}">`;
      ORDER.forEach(k => {
        const v = agg[m][k] || 0; if (!v) return;
        const y1 = y(acc + v), y0 = y(acc);
        svg += `<rect x="${x}" y="${y1}" width="${w}" height="${Math.max(0, y0 - y1 - 1)}" fill="var(--k-${k})" rx="1"/>`;
        acc += v;
      });
      svg += `<rect x="${L + i * bw}" y="${T}" width="${bw}" height="${H - T - B}" fill="transparent"/></g>`;
    });
    svg += '</svg>';
    $('#trend').innerHTML = svg;
    $('#trend').querySelectorAll('g[data-m]').forEach(g => {
      const m = g.dataset.m;
      g.addEventListener('mousemove', ev => {
        tip.innerHTML = `<b>${month(m)}</b>${region === 'all' ? '' : ' · ' + esc(region)}<br>` + ORDER.filter(k => agg[m][k]).map(k => `${TYPES[k].short}: ${fmt(agg[m][k])}`).join('<br>') + `<br>Total: ${fmt(ORDER.reduce((s, k) => s + (agg[m][k] || 0), 0))}${m < feedStart ? '<br><i>Before the 12-month feed window</i>' : ''}`;
        tip.style.opacity = 1;
        tip.style.left = Math.min(ev.clientX + 14, innerWidth - 250) + 'px'; tip.style.top = (ev.clientY + 14) + 'px';
      });
      g.addEventListener('mouseleave', () => { tip.style.opacity = 0; });
      g.addEventListener('click', () => {
        if (m < feedStart) return;
        Object.assign(state, { month: m, region: region === 'all' ? '' : region, fam: '', page: 0 });
        syncChips(); render(); jump();
      });
    });
  }
  function niceStep(max) { const raw = max / 4; const p = Math.pow(10, Math.floor(Math.log10(raw))); return [1, 2, 2.5, 5, 10].map(s => s * p).find(s => s >= raw); }
  $('#legend').innerHTML = ORDER.map(k => `<span class="k-${k}"><span class="dot"></span>${TYPES[k].label}</span>`).join('');
  $('#trend-region').addEventListener('click', e => {
    const b = e.target.closest('[data-r]'); if (!b) return;
    document.querySelectorAll('#trend-region .chip').forEach(c => c.setAttribute('aria-pressed', c === b));
    renderTrend(b.dataset.r);
  });

  renderTrend('all'); renderFamilies(); render();
})();

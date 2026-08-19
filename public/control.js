/* ============================================================
   TSW — Control Center
   Season lifecycle, divisions, cup competitions and brackets.
   Nothing is created unless an admin submits a form.
   ============================================================ */
(function () {
  const API = window.__HATCHABLE__.api;
  const C = document.getElementById('content');

  async function api(path, method, body) {
    const r = await fetch(API + path, {
      method: method || 'GET',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw Error(d.error || 'Request failed');
    return d;
  }
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const crest = (url, name, size) => url
    ? `<img class="crest" style="width:${size || 20}px;height:${size || 20}px" src="${esc(url)}" alt="" loading="lazy">`
    : `<span class="crest placeholder" style="width:${size || 20}px;height:${size || 20}px">${esc(String(name || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase())}</span>`;
  const fmtDate = (ts) => ts ? new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '';

  /* ---------- Season setup ---------- */
  function seasonSetup() {
    window.openModal(`
      <h3>Start a TSW season</h3>
      <p class="modal-sub">Creates an empty Division 1, Division 2 and the cup competitions — never clubs, players or fixtures. Add everything yourself.</p>
      <form id="initSeason">
        <div class="field"><label>Season name</label><input required name="season_name" placeholder="e.g. Season 1"></div>
        <div class="field"><label>Minimum rated apps for the average leaderboard</label><input name="minimum_rating_apps" type="number" min="1" value="3"></div>
        <div class="modal-actions">
          <button type="button" class="btn ghost" data-close-modal>Cancel</button>
          <button class="btn primary">Create Season</button>
        </div>
      </form>
    `);
    document.getElementById('initSeason').onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      try {
        await api('/pts/initialize', 'POST', { season_name: f.get('season_name'), minimum_rating_apps: +f.get('minimum_rating_apps') });
        window.closeModal(); window.toast('Season created — now add clubs', 'ok'); route();
      } catch (x) { window.toast(x.message, 'error'); }
    };
  }

  /* ---------- Cup helpers (shared with Leagues page) ---------- */
  window.openCupEntries = async (id, name, teams) => {
    window.openModal(`
      <h3>${esc(name)} — entries</h3>
      <div id="entryList" class="empty">Loading…</div>
      <form id="entryForm" style="margin-top:12px">
        <div class="field"><label>Add club</label>
          <select name="team_id"><option value="">Choose club…</option>${(teams || []).map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select>
        </div>
        <div class="modal-actions"><button type="button" class="btn ghost" data-close-modal>Close</button><button class="btn primary">Add entry</button></div>
      </form>
    `);
    const load = async () => {
      const list = await api('/pts/entries?competition_id=' + id);
      document.getElementById('entryList').innerHTML = list.length
        ? `<div class="chip-list">${list.map(t => `<span class="chip">${crest(t.crest_url, t.name, 16)} ${esc(t.name)}</span>`).join('')}</div>`
        : '<p class="subtle" style="text-align:center;margin:0">No clubs entered yet.</p>';
    };
    load().catch(x => window.toast(x.message, 'error'));
    document.getElementById('entryForm').onsubmit = async (e) => {
      e.preventDefault();
      try {
        const team_id = new FormData(e.target).get('team_id');
        if (!team_id) return;
        await api('/pts/entries', 'POST', { competition_id: id, team_id: +team_id });
        await load(); window.toast('Club entered', 'ok');
      } catch (x) { window.toast(x.message, 'error'); }
    };
  };

  window.openCupDraw = (id, name) => {
    window.openModal(`
      <h3>Draw ${esc(name)} round</h3>
      <p class="modal-sub">No seeding. The first round draws from all entered clubs; later rounds draw from the previous round’s winners. A draw cannot be edited after creation.</p>
      <form id="drawForm">
        <div class="field"><label>Round name</label><input name="round_name" required placeholder="e.g. Round of 8 / Quarter-Finals"></div>
        <div class="modal-actions">
          <button type="button" class="btn ghost" data-close-modal>Cancel</button>
          <button class="btn primary">Create draw</button>
        </div>
      </form>
    `);
    document.getElementById('drawForm').onsubmit = async (e) => {
      e.preventDefault();
      try {
        const r = await api('/cups/actions', 'POST', { action: 'draw', competition_id: id, round_name: new FormData(e.target).get('round_name') });
        window.closeModal(); window.toast(r.message, 'ok'); route();
      } catch (x) { window.toast(x.message, 'error'); }
    };
  };

  window.openCupRemove = (id, name) => {
    window.confirmModal('Remove ' + name + '?', 'This removes this cup, its entries and its bracket from the current season only. Other seasons are unaffected. Division leagues cannot be removed.', 'DELETE', async (word) => {
      const r = await api('/pts/competitions/delete', 'POST', { competition_id: id, confirmation: word });
      window.closeModal(); window.toast(r.message, 'ok'); route();
    }, true);
  };

  window.openNewCup = () => {
    window.openModal(`
      <h3>Add a cup</h3>
      <p class="modal-sub">Adds a knockout cup to the active season. After creating it, enter clubs and draw the first round.</p>
      <form id="cupForm">
        <div class="field"><label>Cup name</label><input name="name" required placeholder="e.g. TSW Trophy"></div>
        <div class="field"><label>Format</label>
          <select name="format">
            <option value="single_elimination">Knockout — single leg</option>
            <option value="two_leg">Knockout — two legs (aggregate, away goals)</option>
          </select>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn ghost" data-close-modal>Cancel</button>
          <button class="btn primary">Create cup</button>
        </div>
      </form>
    `);
    document.getElementById('cupForm').onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      try {
        const cup = await api('/competitions/create', 'POST', { name: f.get('name'), format: f.get('format') });
        window.closeModal(); window.toast('Cup created', 'ok');
        location.hash = '#/cup/' + cup.id;
      } catch (x) { window.toast(x.message, 'error'); }
    };
  };

  /* ---------- Rollover / archive ---------- */
  function rollover(season) {
    window.openModal(`
      <h3>Roll over ${esc(season.name)}</h3>
      <p class="modal-sub">Permanent: archives the completed season and creates the next fixture cycle with promotion/relegation applied (D1 bottom two swap with D2 top two). Both divisions must have all 28 results recorded.</p>
      <form id="rollForm">
        <div class="field"><label>Next season name</label><input required name="name" placeholder="e.g. Season 2"></div>
        <div class="modal-actions"><button type="button" class="btn ghost" data-close-modal>Cancel</button><button class="btn primary">Archive & roll over</button></div>
      </form>
    `);
    document.getElementById('rollForm').onsubmit = async (e) => {
      e.preventDefault();
      try {
        const r = await api('/pts/rollover', 'POST', { season_id: season.id, next_season_name: new FormData(e.target).get('name') });
        window.closeModal(); window.toast(r.message, 'ok'); route();
      } catch (x) { window.toast(x.message, 'error'); }
    };
  }

  function forceArchive(season) {
    window.confirmModal('Force archive ' + season.name + '?', 'For an incomplete season where you only need to keep awards and existing records. This cannot be undone, does not apply promotion/relegation, and does not create a new season.', 'ARCHIVE', async (word) => {
      const r = await api('/pts/force-archive', 'POST', { season_id: season.id, confirmation: word });
      window.closeModal(); window.toast(r.message, 'ok'); route();
    }, true);
  }

  /* ---------- Control Center route ---------- */
  window.tswControlRoute = async () => {
    window.setHeader('Control Center', 'Season, divisions & cups', '');
    C.innerHTML = '<div class="empty">Loading…</div>';
    let d;
    try { d = await api('/pts/overview'); } catch (x) {
      C.innerHTML = `<div class="empty"><h3>Platform not ready</h3><p>${esc(x.message)}</p></div>`;
      return;
    }
    if (!d.active) {
      C.innerHTML = `
        <div class="empty">
          <h3>Ready for kickoff</h3>
          <p>No season exists yet. Starting one creates empty Division 1, Division 2 and the cup competitions — you add the clubs, fixtures and results.</p>
          <div class="empty-state-cta"><button class="btn primary admin-only" id="startBtn">Start a season</button></div>
        </div>`;
      document.getElementById('startBtn').onclick = seasonSetup;
      return;
    }
    const s = d.active;
    const leagues = d.leagues;
    const cups = d.competitions.filter(x => x.format !== 'league');

    C.innerHTML = `
      <div class="card">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <span class="badge solid">Active</span>
          <div style="flex:1;min-width:180px">
            <div style="font-weight:900;font-size:16px">${esc(s.name)}</div>
            <div class="subtle">Current season · started ${fmtDate(s.created_at)}</div>
          </div>
          <span class="btn sm admin-only" id="newCupBtn">+ Add cup</span>
        </div>
      </div>

      <div class="section-block">
        <div class="section-head"><h3>Divisions</h3><span class="subtle">8 clubs · 7 gameweeks · 28 matches</span></div>
        <div class="grid cols-2">
          ${leagues.map(l => {
            const canGenerate = l.team_count === 8 && l.matches_total === 0;
            return `
            <div class="card">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
                <span class="badge solid">${esc(l.division_code || 'LG')}</span>
                <div style="flex:1;min-width:0">
                  <div style="font-weight:800;font-size:15px"><a href="#/league/${l.id}">${esc(l.name)}</a></div>
                  <div class="subtle">${l.team_count}/8 clubs · ${l.matches_played}/${l.matches_total} matches</div>
                </div>
              </div>
              <div class="mini-bars">
                <div class="mini-bar-row"><span style="width:52px">Played</span><span class="bar"><div style="width:${Math.min(100, l.matches_total ? l.matches_played / l.matches_total * 100 : 0)}%"></div></span><span class="tnum">${l.matches_played}/${l.matches_total}</span></div>
              </div>
              <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
                <a class="btn sm" href="#/league/${l.id}">View table</a>
                <button class="btn sm admin-only gen-fixtures" data-id="${l.id}" ${canGenerate ? '' : 'disabled'}>Generate 7 gameweeks</button>
                <button class="btn sm admin-only add-club" data-id="${l.id}">+ Add club</button>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>

      <div class="section-block">
        <div class="section-head"><h3>Cups</h3><span class="subtle">Entries · draws · brackets</span></div>
        <div class="card" style="padding:0">
          ${cups.length ? `
          <div class="table-wrap"><table>
            <thead><tr><th>Competition</th><th>Format</th><th class="num">Clubs</th><th>Status</th><th></th></tr></thead>
            <tbody>
              ${cups.map(x => `
                <tr>
                  <td><b><a href="#/cup/${x.id}">${esc(x.name)}</a></b></td>
                  <td><span class="badge faint">${esc(x.format === 'two_leg' ? 'Two legs' : 'Knockout')}</span></td>
                  <td class="num">${x.entry_count}</td>
                  <td><span class="badge ${x.status === 'completed' ? 'faint' : ''}">${esc(x.status)}</span></td>
                  <td style="white-space:nowrap">
                    <button class="btn sm admin-only entries" data-id="${x.id}" data-name="${esc(x.name)}">Entries</button>
                    <button class="btn sm admin-only draw" data-id="${x.id}" data-name="${esc(x.name)}" ${x.entry_count < 2 ? 'disabled' : ''}>Draw</button>
                    <a class="btn sm" href="#/cup/${x.id}">Bracket</a>
                    <button class="btn sm danger admin-only remove" data-id="${x.id}" data-name="${esc(x.name)}">Remove</button>
                  </td>
                </tr>`).join('')}
            </tbody></table></div>`
            : '<div class="empty"><h3>No cups</h3><p>Add a cup for this season.</p></div>'}
        </div>
      </div>

      <div class="section-block">
        <div class="section-head"><h3>Season rollover</h3></div>
        <div class="card">
          <p class="subtle" style="margin:0 0 12px">After both divisions finish all 28 matches, Division 2’s top two replace Division 1’s bottom two. The completed season stays archived in the records.</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn admin-only" id="rolloverBtn">Archive & roll over</button>
            <button class="btn danger admin-only" id="forceArchiveBtn">Force archive</button>
          </div>
        </div>
      </div>
    `;

    document.querySelectorAll('.gen-fixtures').forEach(b => b.onclick = async () => {
      try {
        const r = await api('/pts/fixtures/generate', 'POST', { league_id: +b.dataset.id });
        window.toast(r.message, 'ok'); route();
      } catch (x) { window.toast(x.message, 'error'); }
    });
    document.querySelectorAll('.add-club').forEach(b => b.onclick = () => {
      if (window.openLeagueAddClub) window.openLeagueAddClub(+b.dataset.id);
    });
    document.querySelectorAll('.entries').forEach(b => b.onclick = () => window.openCupEntries(+b.dataset.id, b.dataset.name, d.teams));
    document.querySelectorAll('.draw').forEach(b => b.onclick = () => window.openCupDraw(+b.dataset.id, b.dataset.name));
    document.querySelectorAll('.remove').forEach(b => b.onclick = () => window.openCupRemove(+b.dataset.id, b.dataset.name));
    document.getElementById('rolloverBtn').onclick = () => rollover(s);
    document.getElementById('forceArchiveBtn').onclick = () => forceArchive(s);
    document.getElementById('newCupBtn').onclick = () => window.openNewCup();
  };

  /* Quick add-club modal used from the Control Center division cards */
  window.openLeagueAddClub = async (leagueId) => {
    const [allTeams, inLeague] = await Promise.all([api('/teams/list'), api('/teams/list?league_id=' + leagueId)]);
    const taken = new Set(inLeague.map(t => String(t.id)));
    const available = allTeams.filter(t => !taken.has(String(t.id)));
    window.openModal(`
      <h3>Add Club</h3>
      <form id="addClubForm">
        <div class="field"><label>Club</label>
          <select name="team_id" required><option value="">Choose club…</option>${available.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select>
        </div>
        ${available.length ? '' : '<p class="subtle">Every club is already in this division — create a new club first.</p>'}
        <div class="modal-actions"><button type="button" class="btn ghost" data-close-modal>Cancel</button><button class="btn primary" ${available.length ? '' : 'disabled'}>Add</button></div>
      </form>
    `);
    document.getElementById('addClubForm').onsubmit = async (e) => {
      e.preventDefault();
      try {
        await api('/teams/add-to-league', 'POST', { league_id: leagueId, team_id: +new FormData(e.target).get('team_id') });
        window.closeModal(); window.toast('Club added', 'ok'); route();
      } catch (x) { window.toast(x.message, 'error'); }
    };
  };

  /* ---------- Cup bracket page ---------- */
  window.renderCupBracket = async (cupId) => {
    window.setHeader('Cup', '<a href="#/leagues">Leagues</a>', '');
    C.innerHTML = '<div class="empty">Loading bracket…</div>';
    let data;
    try { data = await api('/cups/ties?competition_id=' + cupId); }
    catch (x) {
      C.innerHTML = `<div class="empty"><h3>Could not load the cup</h3><p>${esc(x.message)}</p></div>`;
      return;
    }
    const cup = data.competition;
    const rounds = data.rounds;

    window.setHeader(cup.name, `<a href="#/leagues">Leagues</a> / ${esc(cup.format === 'two_leg' ? 'Two legs' : 'Knockout')}`,
      `<button class="btn sm admin-only" data-cup-entries="${cup.id}" data-cup-name="${esc(cup.name)}">Entries</button>
       <button class="btn sm primary admin-only" id="cupDrawBtn">Draw round</button>
       <button class="btn sm danger admin-only" id="cupRemoveBtn">Remove for season</button>`);

    const allPlayed = rounds.every(r => r.ties.length && r.ties.every(t => t.status === 'played'));
    const champion = rounds.length && allPlayed
      ? rounds[rounds.length - 1].ties.find(t => t.winner_team_id)
      : null;

    C.innerHTML = `
      <div class="card" style="margin-bottom:14px">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <span class="badge">${esc(cup.format === 'two_leg' ? 'Two legs' : 'Knockout')}</span>
          <span class="badge ${cup.status === 'completed' ? 'faint' : ''}">${esc(cup.status)}</span>
          <div style="flex:1;min-width:160px">
            <div class="subtle">${rounds.length ? rounds.reduce((n, r) => n + r.ties.length, 0) + ' ties across ' + rounds.length + ' round' + (rounds.length > 1 ? 's' : '') : 'No draws yet — draw the first round to build the bracket.'}</div>
          </div>
          ${champion ? `<span class="badge solid">Champion: ${esc(champion.winner_team_name)}</span>` : ''}
        </div>
      </div>

      ${rounds.length ? `
      <div class="bracket">
        ${rounds.map(r => {
          const played = r.ties.filter(t => t.status === 'played').length;
          return `
          <div class="bracket-col">
            <div class="round-head"><span>${esc(r.round_name)}</span><small class="tnum">${played}/${r.ties.length}</small></div>
            ${r.ties.map(t => tieCard(t, cup.format)).join('')}
          </div>`;
        }).join('')}
      </div>` : `
      <div class="empty">
        <h3>No draw yet</h3>
        <p>Add clubs as entries, then draw the first round to build the bracket. Winners advance automatically.</p>
      </div>`}
    `;

    document.getElementById('cupDrawBtn').onclick = () => window.openCupDraw(cup.id, cup.name);
    document.getElementById('cupRemoveBtn').onclick = () => window.openCupRemove(cup.id, cup.name);
    const entriesBtn = C.querySelector('[data-cup-entries]');
    if (entriesBtn) entriesBtn.onclick = async () => {
      const ov = await api('/pts/overview');
      window.openCupEntries(cup.id, entriesBtn.dataset.cupName, ov.teams);
    };
    C.querySelectorAll('[data-tie-result]').forEach(el => el.onclick = () => openTieResult(cup, el.dataset.tieResult));
  };

  function tieCard(t, format) {
    const isTwoLeg = format === 'two_leg';
    const legLabel = isTwoLeg ? (t.leg_number === 1 ? 'Leg 1' : 'Leg 2') : null;
    const homeWin = t.winner_team_id && String(t.winner_team_id) === String(t.home_team_id);
    const awayWin = t.winner_team_id && String(t.winner_team_id) === String(t.away_team_id);
    const homeClass = t.status === 'played' ? (homeWin ? 'winner' : 'loser') : '';
    const awayClass = t.status === 'played' ? (awayWin ? 'winner' : 'loser') : '';
    return `
      <div class="tie-card">
        <div class="tie-row ${homeClass}">
          ${crest(t.home_crest_url, t.home_team_name, 18)}
          <span class="t-name">${esc(t.home_team_name || 'TBD')}</span>
          <span class="t-score">${t.home_score ?? ''}</span>
          <span class="t-mark">${homeWin ? '✓' : ''}</span>
        </div>
        <div class="tie-row ${awayClass}">
          ${crest(t.away_crest_url, t.away_team_name, 18)}
          <span class="t-name">${esc(t.away_team_name || 'TBD')}</span>
          <span class="t-score">${t.away_score ?? ''}</span>
          <span class="t-mark">${awayWin ? '✓' : ''}</span>
        </div>
        <div class="tie-foot">
          <span>${legLabel || (t.played_at ? fmtDate(t.played_at) : (t.status === 'played' ? 'Full time' : 'Scheduled'))}</span>
          <button class="btn sm admin-only" data-tie-result="${t.id}" ${t.home_team_id && t.away_team_id ? '' : 'disabled'}>${t.status === 'played' ? 'Edit result' : 'Enter result'}</button>
        </div>
      </div>`;
  }

  async function openTieResult(cup, tieId) {
    const data = await api('/cups/ties?competition_id=' + cup.id);
    let tie = null;
    for (const r of data.rounds) {
      const found = r.ties.find(t => String(t.id) === String(tieId));
      if (found) { tie = found; break; }
    }
    if (!tie) return;
    const isTwoLeg = cup.format === 'two_leg';
    let otherLeg = null;
    if (isTwoLeg) {
      for (const r of data.rounds) {
        const found = r.ties.find(t => t.round_name === tie.round_name && t.tie_number === tie.tie_number && t.leg_number !== tie.leg_number);
        if (found) { otherLeg = found; break; }
      }
    }

    window.openModal(`
      <h3>${esc(tie.home_team_name)} vs ${esc(tie.away_team_name)}</h3>
      <p class="modal-sub">${esc(tie.round_name)} · ${isTwoLeg ? 'Leg ' + tie.leg_number + ' of 2 — the aggregate resolves when both legs are in.' : 'Single leg — the winner advances.'}</p>
      <form id="tieResultForm">
        <div class="form-row">
          <div class="field"><label>${esc(tie.home_team_name)} goals</label><input name="home_score" type="number" min="0" value="${tie.home_score ?? ''}" required></div>
          <div class="field"><label>${esc(tie.away_team_name)} goals</label><input name="away_score" type="number" min="0" value="${tie.away_score ?? ''}" required></div>
        </div>
        <div class="field" id="winnerField" style="display:none">
          <label>Winner after level score (penalties / replay)</label>
          <select name="winner_team_id">
            <option value="">Choose…</option>
            <option value="${tie.home_team_id}">${esc(tie.home_team_name)}</option>
            <option value="${tie.away_team_id}">${esc(tie.away_team_name)}</option>
          </select>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn ghost" data-close-modal>Cancel</button>
          <button class="btn primary">Save result</button>
        </div>
      </form>
    `);
    const hs = document.querySelector('input[name="home_score"]');
    const as = document.querySelector('input[name="away_score"]');
    const wf = document.getElementById('winnerField');
    const check = () => {
      const h = Number(hs.value), a = Number(as.value);
      if (isNaN(h) || isNaN(a) || h === '') { wf.style.display = 'none'; return; }
      if (!isTwoLeg) { wf.style.display = h === a ? 'block' : 'none'; return; }
      // Two legs: aggregate + away goals decide; picker only for a level tie.
      const l1h = tie.leg_number === 1 ? h : otherLeg ? otherLeg.home_score : null;
      const l1a = tie.leg_number === 1 ? a : otherLeg ? otherLeg.away_score : null;
      const l2h = tie.leg_number === 2 ? h : otherLeg ? otherLeg.home_score : null;
      const l2a = tie.leg_number === 2 ? a : otherLeg ? otherLeg.away_score : null;
      const bothIn = l1h !== null && l1a !== null && l2h !== null && l2a !== null;
      if (!bothIn) { wf.style.display = 'none'; return; }
      const totalHome = l1h + l2a, totalAway = l1a + l2h;
      wf.style.display = (totalHome === totalAway && l2a === l1a) ? 'block' : 'none';
    };
    hs.addEventListener('input', check);
    as.addEventListener('input', check);
    check();
    document.getElementById('tieResultForm').onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const body = {
        action: 'result', tie_id: tie.id,
        home_score: Number(f.get('home_score')), away_score: Number(f.get('away_score'))
      };
      const w = f.get('winner_team_id');
      if (w) body.winner_team_id = +w;
      try {
        const r = await api('/cups/actions', 'POST', body);
        window.closeModal();
        if (r.message) window.toast(r.message, 'ok');
        window.renderCupBracket(cup.id);
      } catch (x) { window.toast(x.message, 'error'); }
    };
  }

  if (location.hash.startsWith('#/control')) {
    window.tswControlRoute();
  } else if (location.hash.startsWith('#/cup/')) {
    const cupId = location.hash.split('/')[2];
    if (cupId) window.renderCupBracket(cupId);
  }
})();

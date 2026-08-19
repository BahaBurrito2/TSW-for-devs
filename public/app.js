/* ---------- Core ---------- */
const API = window.__HATCHABLE__.api;
const $content = document.getElementById('content');
const $title = document.getElementById('pageTitle');
const $crumbs = document.getElementById('pageCrumbs');
const $actions = document.getElementById('topbarActions');
const $nav = document.getElementById('nav');
const $modalRoot = document.getElementById('modalRoot');
const $toastRoot = document.getElementById('toastRoot');

async function api(path, method, body) {
  const res = await fetch(API + path, {
    method: method || 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  });
  let data = null;
  try { data = await res.json(); } catch (e) {}
  if (!res.ok) throw new Error((data && data.error) || ('Request failed (' + res.status + ')'));
  return data;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}
function fmt1(n) { return n === null || n === undefined ? '—' : Number(n).toFixed(1); }
function crestOrPlaceholder(url, name, size) {
  size = size || 20;
  if (url) return `<img class="crest" style="width:${size}px;height:${size}px" src="${esc(url)}" alt="">`;
  const initials = (name || '?').split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
  return `<span class="crest placeholder" style="width:${size}px;height:${size}px">${esc(initials)}</span>`;
}
function avatarOrPlaceholder(url, name, color, size) {
  size = size || 20;
  if (url) return `<img class="avatar" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover" src="${esc(url)}" alt="">`;
  const initials = (name || '?').split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
  const bg = color || '#22c55e';
  return `<span class="avatar placeholder" style="width:${size}px;height:${size}px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:${esc(bg)}33;border:1px solid ${esc(bg)};color:${esc(bg)};font-weight:800;font-size:${Math.max(9, Math.round(size*0.38))}px">${esc(initials)}</span>`;
}
window.avatarOrPlaceholder = avatarOrPlaceholder;
function toast(msg, type) {
  const t = document.createElement('div');
  t.className = 'toast ' + (type || '');
  t.textContent = msg;
  $toastRoot.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}
function closeModal() { $modalRoot.innerHTML = ''; }
function openModal(html) {
  $modalRoot.innerHTML = `<div class="modal-backdrop" data-close-modal>
    <div class="modal">${html}</div>
  </div>`;
  $modalRoot.querySelector('.modal-backdrop').addEventListener('click', (e) => {
    if (e.target.hasAttribute('data-close-modal')) closeModal();
  });
}

const POSITIONS = ['GK','RB','CB','LB','CM','ST'];
const POS_LABEL = { GK:'Goalkeeper', RB:'Right Back', CB:'Centre Back', LB:'Left Back', CM:'Centre Mid', ST:'Striker' };

/* ---------- Theme ---------- */
function initTheme() {
  const saved = localStorage.getItem('slm-theme') || 'dark';
  document.body.classList.toggle('light', saved === 'light');
  document.getElementById('themeToggle').addEventListener('click', () => {
    const isLight = document.body.classList.toggle('light');
    localStorage.setItem('slm-theme', isLight ? 'light' : 'dark');
  });
  // Top navigation needs no collapsible sidebar.
}

/* ---------- Nav / Router ---------- */
const NAV_ITEMS = [
  { href: '#/', label: 'Dashboard', match: (h) => h === '#/' || h === '' },
  { href: '#/leagues', label: 'Leagues', match: (h) => h.startsWith('#/leagues') || h.startsWith('#/league/') },
  { href: '#/teams', label: 'Clubs & Players', match: (h) => h.startsWith('#/teams') || h.startsWith('#/team/') },
  { href: '#/pts', label: 'PTS Control', match: (h) => h.startsWith('#/pts') && !h.startsWith('#/pts/news') && !h.startsWith('#/pts/awards') },
  { href: '#/pts/news', label: 'News', match: (h) => h === '#/pts/news' },
  { href: '#/pts/awards', label: 'Awards', match: (h) => h === '#/pts/awards' },
  { href: '#/transfers', label: 'Transfer Market', match: (h) => h.startsWith('#/transfers') }
];

function renderNav() {
  const h = location.hash || '#/';
  $nav.innerHTML = NAV_ITEMS.map(i => `<a class="nav-link ${i.match(h) ? 'active' : ''}" href="${i.href}">${i.label}</a>`).join('');
}

function setHeader(title, crumbs, actionsHtml) {
  $title.textContent = title;
  $crumbs.innerHTML = crumbs || '';
  $actions.innerHTML = actionsHtml || '';
}

async function route() {
  renderNav();
  const hash = location.hash || '#/';
  const parts = hash.replace(/^#\//, '').split('/').filter(Boolean);
  try {
    if (parts.length === 0) return viewDashboard();
    if (parts[0] === 'leagues') return viewLeagues();
    if (parts[0] === 'league' && parts[1]) return viewLeagueDetail(parts[1], parts[2]);
    if (parts[0] === 'teams') return viewTeams();
    if (parts[0] === 'team' && parts[1]) return viewTeamDetail(parts[1]);
    if (parts[0] === 'player' && parts[1] && window.renderFullPlayerProfile) return window.renderFullPlayerProfile(parts[1]);
    if (parts[0] === 'player' && parts[1]) return viewPlayerDetail(parts[1]);
    if (parts[0] === 'transfers' && window.renderTransferMarket) return window.renderTransferMarket();
    if (parts[0] === 'transfers') return viewTransferMarket();
    if (parts[0] === 'pts' && window.ptsRoute) return window.ptsRoute();
    $content.innerHTML = '<div class="empty">Not found.</div>';
  } catch (err) {
    $content.innerHTML = `<div class="card"><div class="empty">Error: ${esc(err.message)}</div></div>`;
  }
}
window.addEventListener('hashchange', route);

/* ---------- Dashboard ---------- */
async function viewDashboard() {
  setHeader('Dashboard', 'Division 1 & Division 2 overview', '');
  $content.innerHTML = '<div class="empty">Loading…</div>';
  const d = await api('/dashboard');
  $content.innerHTML = `
    <div class="grid cols-4">
      <div class="card stat-card accent-green"><div class="num">${d.active_leagues}</div><div class="lbl">Active Leagues</div></div>
      <div class="card stat-card accent-blue"><div class="num">${d.matches_played}</div><div class="lbl">Matches Played</div></div>
      <div class="card stat-card accent-gold"><div class="num">${d.top_scorers[0] ? d.top_scorers[0].goals : 0}</div><div class="lbl">Golden Boot (${d.top_scorers[0] ? esc(d.top_scorers[0].name) : '—'})</div></div>
      <div class="card stat-card accent-red"><div class="num">${d.biggest_win_this_week ? Math.abs(d.biggest_win_this_week.home_score - d.biggest_win_this_week.away_score) : 0}</div><div class="lbl">Biggest Win Margin (7d)</div></div>
    </div>

    <div class="grid cols-2" style="margin-top:14px">
      <div class="card">
        <h3>Top Scorers</h3>
        ${d.top_scorers.length ? '<canvas id="scorersChart" height="180"></canvas>' : '<div class="empty">No goals recorded yet.</div>'}
      </div>
      <div class="card">
        <h3>Best Defense (fewest conceded)</h3>
        ${renderTable(
          ['Team','P','Conceded'],
          d.best_defense.map(t => [esc(t.team_name), t.played, t.conceded])
        )}
      </div>
    </div>

    <div class="grid cols-2" style="margin-top:14px">
      <div class="card">
        <h3>Most Assists</h3>
        ${renderTable(['Player','Team','Assists'], d.top_assists.map(p => [`<div class="team-cell">${avatarOrPlaceholder(p.avatar_url, p.name, null, 22)} ${esc(p.name)}</div>`, esc(p.team_name), p.assists]))}
      </div>
      <div class="card">
        <h3>Biggest Win This Week</h3>
        ${d.biggest_win_this_week ? `
          <div style="font-weight:800;font-size:15px">${esc(d.biggest_win_this_week.home_team_name)} ${d.biggest_win_this_week.home_score} – ${d.biggest_win_this_week.away_score} ${esc(d.biggest_win_this_week.away_team_name)}</div>
          <div class="subtle" style="margin-top:6px">${esc(d.biggest_win_this_week.league_name)}</div>
        ` : '<div class="empty">No matches played in the last 7 days.</div>'}
      </div>
    </div>
  `;
  if (d.top_scorers.length) {
    new Chart(document.getElementById('scorersChart'), {
      type: 'bar',
      data: {
        labels: d.top_scorers.map(p => p.name),
        datasets: [{ label: 'Goals', data: d.top_scorers.map(p => p.goals), backgroundColor: '#22c55e', borderRadius: 4 }]
      },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
    });
  }
}

function renderTable(headers, rows, opts) {
  opts = opts || {};
  if (!rows.length) return `<div class="empty">${opts.empty || 'No data yet.'}</div>`;
  return `<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr ${opts.rowAttr ? opts.rowAttr(r) : ''}>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

function openDeleteLeagueModal(leagueId, league) {
  if (!league) return;
  openModal(`
    <h3>Delete ${esc(league.name)}?</h3>
    <p class="subtle">This cannot be undone. All fixtures, results, ratings, and standings for this league will be permanently removed. Clubs and player profiles will remain.</p>
    <div class="field"><label>Type DELETE to confirm</label><input id="deleteLeagueConfirm" autocomplete="off"></div>
    <div class="modal-actions"><button type="button" class="btn ghost" data-close-modal>Cancel</button><button type="button" class="btn danger" id="deleteLeagueBtn">Delete league</button></div>
  `);
  document.getElementById('deleteLeagueBtn').addEventListener('click', async () => {
    try {
      await api('/leagues/delete', 'POST', { league_id: Number(leagueId), confirmation: document.getElementById('deleteLeagueConfirm').value });
      closeModal(); toast('League deleted', 'ok'); viewLeagues();
    } catch (err) { toast(err.message, 'error'); }
  });
}

/* ---------- Leagues list ---------- */
async function viewLeagues() {
  setHeader('Leagues', 'All leagues & competitions',
    `<button class="btn primary" id="newLeagueBtn">+ New League</button>`);
  $content.innerHTML = '<div class="empty">Loading…</div>';
  const leagues = await api('/leagues/list');
  $content.innerHTML = `
    <div class="grid cols-3" id="leagueCards">
      ${leagues.map(l => `
        <div class="card" style="display:block">
          <div style="display:flex;justify-content:space-between;gap:8px"><a href="#/league/${l.id}"><h3 style="margin-bottom:2px">${esc(l.name)}</h3></a>${l.season_id ? '' : `<button class="btn sm danger delete-league" data-id="${l.id}">Delete</button>`}</div>
          <div class="subtle" style="margin-bottom:10px">${esc(l.season)}${l.country ? ' · ' + esc(l.country) : ''}</div>
          <div style="display:flex;gap:16px">
            <div><div style="font-weight:800;font-size:18px">${l.team_count}</div><div class="subtle">Teams</div></div>
            <div><div style="font-weight:800;font-size:18px">${l.matches_played}</div><div class="subtle">Played</div></div>
          </div>
        </div>
      `).join('') || '<div class="empty">No leagues yet — create your first one.</div>'}
    </div>
  `;
  document.querySelectorAll('.delete-league').forEach(btn => btn.addEventListener('click', () => openDeleteLeagueModal(btn.dataset.id, leagues.find(l => String(l.id) === String(btn.dataset.id)))));
  document.getElementById('newLeagueBtn').addEventListener('click', () => {
    openModal(`
      <h3>New League</h3>
      <form id="leagueForm">
        <div class="field"><label>League Name</label><input name="name" required placeholder="e.g. PTS Division 1"></div>
        <div class="form-row">
          <div class="field"><label>Season</label><input name="season" required placeholder="2025/26"></div>
          <div class="field"><label>Country / Region</label><input name="country" placeholder="optional"></div>
        </div>
        <div class="form-row">
          <div class="field"><label>Relegation spots</label><input name="relegation_spots" type="number" min="0" value="3"></div>
          <div class="field"><label>Promotion spots</label><input name="promotion_spots" type="number" min="0" value="2"></div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn ghost" data-close-modal>Cancel</button>
          <button type="submit" class="btn primary">Create League</button>
        </div>
      </form>
    `);
    document.getElementById('leagueForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      try {
        const league = await api('/leagues/create', 'POST', {
          name: f.get('name'), season: f.get('season'), country: f.get('country') || null,
          relegation_spots: Number(f.get('relegation_spots')) || 0,
          promotion_spots: Number(f.get('promotion_spots')) || 0
        });
        closeModal();
        toast('League created', 'ok');
        location.hash = '#/league/' + league.id;
      } catch (err) { toast(err.message, 'error'); }
    });
  });
}

/* ---------- League detail ---------- */
const LEAGUE_TABS = [
  { key: 'standings', label: 'Standings' },
  { key: 'matches', label: 'Matches' },
  { key: 'scorers', label: 'Top Scorers' },
  { key: 'ratings', label: 'Ratings' },
  { key: 'totw', label: 'TOTW' }
];

async function viewLeagueDetail(leagueId, tab) {
  tab = tab || 'standings';
  const [standingsData, teams] = await Promise.all([
    api('/standings/get?league_id=' + leagueId),
    api('/teams/list?league_id=' + leagueId)
  ]);
  const league = standingsData.league;
  setHeader(league.name, `<a href="#/leagues">Leagues</a> / ${esc(league.season)}`,
    `<button class="btn" id="addTeamBtn">+ Add Team</button> <button class="btn primary" id="newMatchBtn">+ New Match</button>`);

  $content.innerHTML = `
    <div class="tabs">
      ${LEAGUE_TABS.map(t => `<div class="tab ${t.key === tab ? 'active' : ''}" data-tab="${t.key}">${t.label}</div>`).join('')}
    </div>
    <div id="tabBody"></div>
  `;
  $content.querySelectorAll('.tab').forEach(el => el.addEventListener('click', () => {
    location.hash = `#/league/${leagueId}/${el.dataset.tab}`;
  }));

  document.getElementById('addTeamBtn').addEventListener('click', () => openAddTeamModal(leagueId, teams));
  document.getElementById('newMatchBtn').addEventListener('click', () => openNewMatchModal(leagueId, teams));

  const body = document.getElementById('tabBody');
  if (tab === 'standings') return renderStandingsTab(body, standingsData);
  if (tab === 'matches') return renderMatchesTab(body, leagueId, teams);
  if (tab === 'scorers') return renderScorersTab(body, leagueId);
  if (tab === 'ratings') return renderRatingsTab(body, leagueId, teams);
  if (tab === 'totw') return renderTotwTab(body, leagueId);
}

function renderStandingsTab(body, data) {
  const rows = data.table.map(t => [
    `<span class="pos">${t.position}</span>`,
    `<div class="team-cell"><a href="#/team/${t.team_id}" style="display:flex;align-items:center;gap:8px">${crestOrPlaceholder(t.crest_url, t.name)} ${esc(t.name)}</a></div>`,
    t.played, t.won, t.drawn, t.lost, t.gf, t.ga,
    (t.gd > 0 ? '+' : '') + t.gd,
    `<strong>${t.pts}</strong>`,
    `<div class="form-dots">${t.last5.map(r => `<span class="dot ${r}">${r}</span>`).join('') || '—'}</div>`
  ]);
  body.innerHTML = `
    <div class="card">
      <table class="standings-table">
        <thead><tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th><th>Form</th></tr></thead>
        <tbody>
          ${data.table.map((t, i) => `
            <tr class="${t.zone ? 'zone-' + t.zone : ''}">
              <td class="pos">${t.position}</td>
              <td><div class="team-cell"><a href="#/team/${t.team_id}" style="display:flex;align-items:center;gap:8px">${crestOrPlaceholder(t.crest_url, t.name)} ${esc(t.name)}</a></div></td>
              <td>${t.played}</td><td>${t.won}</td><td>${t.drawn}</td><td>${t.lost}</td>
              <td>${t.gf}</td><td>${t.ga}</td><td>${t.gd > 0 ? '+' : ''}${t.gd}</td>
              <td><strong>${t.pts}</strong></td>
              <td><div class="form-dots">${t.last5.length ? t.last5.map(r => `<span class="dot ${r}">${r}</span>`).join('') : '<span class="subtle">—</span>'}</div></td>
            </tr>
          `).join('') || `<tr><td colspan="11" class="empty">No teams yet — add teams to build the table.</td></tr>`}
        </tbody>
      </table>
    </div>
    ${data.table.length ? `<div class="card" style="margin-top:14px"><h3>Goals For vs Against</h3><canvas id="gdChart" height="90"></canvas></div>` : ''}
    <div class="subtle" style="margin-top:10px">Gold = champion &nbsp;•&nbsp; Blue = promotion &nbsp;•&nbsp; Red = relegation (${data.league.relegation_spots} spots)</div>
  `;
  if (data.table.length) {
    new Chart(document.getElementById('gdChart'), {
      type: 'bar',
      data: {
        labels: data.table.map(t => t.name),
        datasets: [
          { label: 'GF', data: data.table.map(t => t.gf), backgroundColor: '#22c55e' },
          { label: 'GA', data: data.table.map(t => t.ga), backgroundColor: '#ef4444' }
        ]
      },
      options: { scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
    });
  }
}

async function renderMatchesTab(body, leagueId, teams) {
  body.innerHTML = '<div class="empty">Loading…</div>';
  const matches = await api('/matches/list?league_id=' + leagueId);
  const byWeek = {};
  matches.forEach(m => { (byWeek[m.matchweek] ||= []).push(m); });
  const weeks = Object.keys(byWeek).sort((a, b) => a - b);
  body.innerHTML = weeks.length ? weeks.map(w => `
    <div class="card" style="margin-bottom:14px">
      <h3>Matchweek ${w}</h3>
      ${byWeek[w].map(m => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)" data-match="${m.id}">
          <div style="display:flex;align-items:center;gap:10px;flex:1">
            <span style="font-weight:700;min-width:120px;text-align:right">${esc(m.home_team_name)}</span>
            <span class="badge status-${m.status}" style="min-width:70px;text-align:center">
              ${m.status === 'played' ? `${m.home_score} – ${m.away_score}` : 'vs'}
            </span>
            <span style="font-weight:700;min-width:120px">${esc(m.away_team_name)}</span>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            ${m.played_at ? `<span class="subtle">${esc(m.played_at)}</span>` : ''}
            <button class="btn sm edit-match-btn" data-id="${m.id}">${m.status === 'played' ? 'Edit' : 'Enter score'}</button>
            ${m.status === 'played' ? `<button class="btn sm rate-players-btn" data-id="${m.id}">Rate players</button>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `).join('') : '<div class="card"><div class="empty">No matches scheduled yet.</div></div>';

  body.querySelectorAll('.edit-match-btn').forEach(b => b.addEventListener('click', () => {
    const m = matches.find(x => String(x.id) === b.dataset.id);
    openEditMatchModal(leagueId, m);
  }));
  body.querySelectorAll('.rate-players-btn').forEach(b => b.addEventListener('click', () => {
    const m = matches.find(x => String(x.id) === b.dataset.id);
    openRateMatchModal(leagueId, m);
  }));
}

async function renderScorersTab(body, leagueId) {
  body.innerHTML = '<div class="empty">Loading…</div>';
  const [board, ratingBoard] = await Promise.all([
    api('/leaderboard/scorers?league_id=' + leagueId),
    api('/leaderboard/ratings?league_id=' + leagueId + '&min_apps=1')
  ]);
  body.innerHTML = `
    <div class="grid cols-3">
      <div class="card"><h3>Top Scorers</h3>${renderTable(['Player','Team','G'], board.top_scorers.map(p => [`<a href="#/player/${p.player_id}" class="team-cell">${avatarOrPlaceholder(p.avatar_url, p.name, null, 22)} ${esc(p.name)}</a>`, esc(p.team_name), p.goals]))}</div>
      <div class="card"><h3>Top Assists</h3>${renderTable(['Player','Team','A'], board.top_assists.map(p => [`<a href="#/player/${p.player_id}" class="team-cell">${avatarOrPlaceholder(p.avatar_url, p.name, null, 22)} ${esc(p.name)}</a>`, esc(p.team_name), p.assists]))}</div>
      <div class="card"><h3>Best Defense</h3>${renderTable(['Team','P','GA'], board.best_defense.map(t => [esc(t.team_name), t.played, t.conceded]))}</div>
    </div>
    <div class="card" style="margin-top:14px">
      <h3>Player Average</h3>
      ${renderTable(
        ['Player','Team','Pos','Apps','Avg','Last 5','G','A'],
        ratingBoard.map(p => [
          `<a href="#/player/${p.player_id}" class="team-cell">${avatarOrPlaceholder(p.avatar_url, p.name, null, 22)} ${esc(p.name)}</a>`, esc(p.team_name),
          `<span class="badge pos-${p.position}">${p.position}</span>`,
          p.apps, `<strong>${fmt1(p.avg_rating)}</strong>`, fmt1(p.avg_last5), p.goals, p.assists
        ])
      )}
    </div>
  `;
}

async function renderRatingsTab(body, leagueId, teams) {
  body.innerHTML = '<div class="empty">Loading…</div>';
  const [matches, ratingBoard] = await Promise.all([
    api('/matches/list?league_id=' + leagueId + '&status=played'),
    api('/leaderboard/ratings?league_id=' + leagueId + '&min_apps=1')
  ]);
  let posFilter = '';
  function draw() {
    const filtered = posFilter ? ratingBoard.filter(p => p.position === posFilter) : ratingBoard;
    body.innerHTML = `
      <div class="card" style="margin-bottom:14px">
        <h3>Played Matches — Enter or Edit Ratings</h3>
        ${matches.length ? matches.map(m => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
            <div>MW${m.matchweek}: <strong>${esc(m.home_team_name)} ${m.home_score}–${m.away_score} ${esc(m.away_team_name)}</strong></div>
            <button class="btn sm rate-btn" data-id="${m.id}">Rate players</button>
          </div>
        `).join('') : '<div class="empty">No played matches yet.</div>'}
      </div>
      <div class="card">
        <div class="section-head"><h3 style="margin:0">Player Average</h3></div>
        <div class="chip-list" style="margin-bottom:12px">
          <div class="chip ${posFilter === '' ? 'active' : ''}" data-pos="">All</div>
          ${POSITIONS.map(p => `<div class="chip ${posFilter === p ? 'active' : ''}" data-pos="${p}">${p}</div>`).join('')}
        </div>
        ${renderTable(
          ['Player','Team','Pos','Apps','Avg','Last 5','G','A'],
          filtered.map(p => [
            `<a href="#/player/${p.player_id}" class="team-cell">${avatarOrPlaceholder(p.avatar_url, p.name, null, 22)} ${esc(p.name)}</a>`, esc(p.team_name),
            `<span class="badge pos-${p.position}">${p.position}</span>`,
            p.apps, `<strong>${fmt1(p.avg_rating)}</strong>`, fmt1(p.avg_last5), p.goals, p.assists
          ])
        )}
      </div>
    `;
    body.querySelectorAll('.rate-btn').forEach(b => b.addEventListener('click', () => {
      const m = matches.find(x => String(x.id) === b.dataset.id);
      openRateMatchModal(leagueId, m);
    }));
    body.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => { posFilter = c.dataset.pos; draw(); }));
  }
  draw();
}

async function renderTotwTab(body, leagueId) {
  const matches = await api('/matches/list?league_id=' + leagueId + '&status=played');
  const weeks = [...new Set(matches.map(m => m.matchweek))].sort((a, b) => a - b);
  if (!weeks.length) {
    body.innerHTML = '<div class="card"><div class="empty">Play some matches and rate players to generate a Team of the Week.</div></div>';
    return;
  }
  let week = weeks[weeks.length - 1];

  async function draw() {
    body.innerHTML = `
      <div class="card" style="margin-bottom:14px">
        <div class="section-head">
          <div class="chip-list">${weeks.map(w => `<div class="chip ${w === week ? 'active' : ''}" data-week="${w}">MW ${w}</div>`).join('')}</div>
          <div>
            <button class="btn sm" id="genBtn">Auto-generate</button>
            <button class="btn sm primary" id="pubBtn">Publish</button>
          </div>
        </div>
      </div>
      <div id="pitchWrap"></div>
    `;
    body.querySelectorAll('[data-week]').forEach(c => c.addEventListener('click', () => { week = Number(c.dataset.week); draw(); }));
    document.getElementById('genBtn').addEventListener('click', async () => {
      try { await api('/totw/generate', 'POST', { league_id: leagueId, matchweek: week, force: true }); toast('TOTW generated', 'ok'); draw(); }
      catch (err) { toast(err.message, 'error'); }
    });
    document.getElementById('pubBtn').addEventListener('click', async () => {
      try { await api('/totw/publish', 'POST', { league_id: leagueId, matchweek: week }); toast('TOTW published', 'ok'); draw(); }
      catch (err) { toast(err.message, 'error'); }
    });

    let picks = await api(`/totw/get?league_id=${leagueId}&matchweek=${week}`);
    const wrap = document.getElementById('pitchWrap');
    if (!picks.length) {
      wrap.innerHTML = '<div class="card"><div class="empty">No TOTW picks yet for this matchweek — click Auto-generate.</div></div>';
      return;
    }
    const bySlot = {};
    picks.forEach(p => { bySlot[p.position_code + p.slot_index] = p; });
    const published = picks.some(p => p.status === 'published');
    const slotHtml = (code, idx) => {
      const p = bySlot[code + idx];
      const filled = p && p.player_id;
      return `<div class="totw-slot ${filled ? '' : 'empty'}" data-pos="${code}" data-slot="${idx}">
        ${filled ? `<div class="rating">${fmt1(p.match_rating)}</div><div class="pname">${esc(p.player_name)}</div><div class="pteam">${esc(p.team_name)} · ${code}</div>`
                  : `<div class="pname">— ${POS_LABEL[code]} —</div>`}
      </div>`;
    };
    wrap.innerHTML = `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <h3 style="margin:0">Team of the Week ${published ? '<span class="badge status-published">Published</span>' : '<span class="badge status-pending">Pending</span>'}</h3>
        </div>
        <div class="pitch">
          <div class="pitch-row">${slotHtml('ST', 0)}${slotHtml('ST', 1)}</div>
          <div class="pitch-row">${slotHtml('CM', 0)}</div>
          <div class="pitch-row">${slotHtml('LB', 0)}${slotHtml('CB', 0)}${slotHtml('RB', 0)}</div>
          <div class="pitch-row">${slotHtml('GK', 0)}</div>
        </div>
        <div class="subtle" style="margin-top:10px">Click a slot to override the pick manually.</div>
      </div>
    `;
    wrap.querySelectorAll('.totw-slot').forEach(el => el.addEventListener('click', () =>
      openTotwOverrideModal(leagueId, week, el.dataset.pos, Number(el.dataset.slot), draw)));
  }
  draw();
}

/* ---------- Modals ---------- */
async function openAddTeamModal(leagueId, teamsInLeague) {
  const allTeams = await api('/teams/list');
  const inLeagueIds = new Set(teamsInLeague.map(t => String(t.id)));
  const available = allTeams.filter(t => !inLeagueIds.has(String(t.id)));
  openModal(`
    <h3>Add Team to League</h3>
    <div class="tabs" style="margin-bottom:14px">
      <div class="tab active" data-mode="existing">Existing Team</div>
      <div class="tab" data-mode="new">Create New</div>
    </div>
    <div id="addTeamBody"></div>
  `);
  const bodyEl = document.getElementById('addTeamBody');
  function drawExisting() {
    bodyEl.innerHTML = `
      <form id="existingForm">
        <div class="field"><label>Team</label>
          <select name="team_id" required>
            <option value="">Select a team…</option>
            ${available.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}
          </select>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn ghost" data-close-modal>Cancel</button>
          <button type="submit" class="btn primary" ${available.length ? '' : 'disabled'}>Add</button>
        </div>
      </form>
      ${available.length ? '' : '<div class="subtle">All existing teams are already in this league.</div>'}
    `;
    document.getElementById('existingForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await api('/teams/add-to-league', 'POST', { league_id: leagueId, team_id: new FormData(e.target).get('team_id') });
        closeModal(); toast('Team added', 'ok'); route();
      } catch (err) { toast(err.message, 'error'); }
    });
  }
  function drawNew() {
    bodyEl.innerHTML = `
      <form id="newTeamForm">
        <div class="field"><label>Team Name</label><input name="name" required></div>
        <div class="form-row">
          <div class="field"><label>Home Color</label><input name="home_color" type="color" value="#22c55e"></div>
          <div class="field"><label>Away Color</label><input name="away_color" type="color" value="#0f172a"></div>
        </div>
        <div class="field"><label>Crest URL (optional)</label><input name="crest_url" placeholder="https://…"></div>
        <div class="form-row">
          <div class="field"><label>Stadium</label><input name="stadium"></div>
          <div class="field"><label>Manager</label><input name="manager"></div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn ghost" data-close-modal>Cancel</button>
          <button type="submit" class="btn primary">Create & Add</button>
        </div>
      </form>
    `;
    document.getElementById('newTeamForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      try {
        await api('/teams/create', 'POST', {
          name: f.get('name'), home_color: f.get('home_color'), away_color: f.get('away_color'),
          crest_url: f.get('crest_url') || null, stadium: f.get('stadium') || null, manager: f.get('manager') || null,
          league_id: leagueId
        });
        closeModal(); toast('Team created & added', 'ok'); route();
      } catch (err) { toast(err.message, 'error'); }
    });
  }
  $modalRoot.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => {
    $modalRoot.querySelectorAll('.tab').forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    t.dataset.mode === 'existing' ? drawExisting() : drawNew();
  }));
  drawExisting();
}

function openNewMatchModal(leagueId, teams) {
  if (teams.length < 2) { toast('Add at least two teams first', 'error'); return; }
  openModal(`
    <h3>New Match</h3>
    <form id="matchForm">
      <div class="form-row">
        <div class="field"><label>Home Team</label>
          <select name="home_team_id" required>${teams.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select>
        </div>
        <div class="field"><label>Away Team</label>
          <select name="away_team_id" required>${teams.map((t, i) => `<option value="${t.id}" ${i === 1 ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select>
        </div>
      </div>
      <div class="form-row">
        <div class="field"><label>Matchweek</label><input name="matchweek" type="number" min="1" value="1"></div>
        <div class="field"><label>Date (optional)</label><input name="played_at" type="date"></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Home Score (optional)</label><input name="home_score" type="number" min="0"></div>
        <div class="field"><label>Away Score (optional)</label><input name="away_score" type="number" min="0"></div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn ghost" data-close-modal>Cancel</button>
        <button type="submit" class="btn primary">Create Match</button>
      </div>
    </form>
  `);
  document.getElementById('matchForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await api('/matches/create', 'POST', {
        league_id: leagueId, home_team_id: f.get('home_team_id'), away_team_id: f.get('away_team_id'),
        matchweek: Number(f.get('matchweek')) || 1, played_at: f.get('played_at') || null,
        home_score: f.get('home_score') === '' ? null : Number(f.get('home_score')),
        away_score: f.get('away_score') === '' ? null : Number(f.get('away_score'))
      });
      closeModal(); toast('Match created', 'ok'); route();
    } catch (err) { toast(err.message, 'error'); }
  });
}

function openEditMatchModal(leagueId, m) {
  openModal(`
    <h3>${esc(m.home_team_name)} vs ${esc(m.away_team_name)}</h3>
    <form id="editMatchForm">
      <div class="form-row">
        <div class="field"><label>${esc(m.home_team_name)} Score</label><input name="home_score" type="number" min="0" value="${m.home_score ?? ''}" required></div>
        <div class="field"><label>${esc(m.away_team_name)} Score</label><input name="away_score" type="number" min="0" value="${m.away_score ?? ''}" required></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Matchweek</label><input name="matchweek" type="number" min="1" value="${m.matchweek}"></div>
        <div class="field"><label>Date</label><input name="played_at" type="date" value="${m.played_at ? m.played_at.slice(0,10) : ''}"></div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn ghost" data-close-modal>Cancel</button>
        <button type="submit" class="btn primary">Save Result</button>
      </div>
    </form>
  `);
  document.getElementById('editMatchForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await api('/matches/update', 'POST', {
        id: m.id, home_score: Number(f.get('home_score')), away_score: Number(f.get('away_score')),
        matchweek: Number(f.get('matchweek')) || m.matchweek, played_at: f.get('played_at') || null
      });
      closeModal(); toast('Result saved', 'ok'); route();
    } catch (err) { toast(err.message, 'error'); }
  });
}

async function openRateMatchModal(leagueId, m) {
  openModal('<div class="empty">Loading roster…</div>');
  const [homePlayers, awayPlayers, existing] = await Promise.all([
    api('/players/list?team_id=' + m.home_team_id),
    api('/players/list?team_id=' + m.away_team_id),
    api('/ratings/list?match_id=' + m.id)
  ]);
  const existingByPlayer = {};
  existing.forEach(r => { existingByPlayer[r.player_id] = r; });

  const rowsFor = (players, teamId) => players.map(p => {
    const ex = existingByPlayer[p.id];
    return `
      <div class="form-row" style="align-items:flex-end" data-player="${p.id}" data-team="${teamId}">
        <div class="field" style="flex:2"><label>${esc(p.name)} <span class="badge pos-${p.position}">${p.position}</span></label></div>
        <div class="field" style="flex:1"><label>Rating</label><input class="r-rating" type="number" min="0" max="10" step="0.1" value="${ex ? ex.rating : ''}"></div>
        <div class="field" style="flex:1"><label>G</label><input class="r-goals" type="number" min="0" value="${ex ? ex.goals : 0}"></div>
        <div class="field" style="flex:1"><label>A</label><input class="r-assists" type="number" min="0" value="${ex ? ex.assists : 0}"></div>
      </div>
    `;
  }).join('');

  openModal(`
    <h3>Rate Players — ${esc(m.home_team_name)} ${m.home_score}–${m.away_score} ${esc(m.away_team_name)}</h3>
    <div class="subtle" style="margin-bottom:10px">Leave rating blank to skip a player.</div>
    <div style="max-height:50vh;overflow-y:auto;padding-right:4px">
      <h4>${esc(m.home_team_name)}</h4>${rowsFor(homePlayers, m.home_team_id)}
      <h4>${esc(m.away_team_name)}</h4>${rowsFor(awayPlayers, m.away_team_id)}
    </div>
    <div class="modal-actions">
      <button type="button" class="btn ghost" data-close-modal>Cancel</button>
      <button type="button" class="btn primary" id="saveRatingsBtn">Save Ratings</button>
    </div>
  `);
  document.getElementById('saveRatingsBtn').addEventListener('click', async () => {
    const ratings = [];
    $modalRoot.querySelectorAll('[data-player]').forEach(row => {
      const rating = row.querySelector('.r-rating').value;
      if (rating === '') return;
      ratings.push({
        player_id: Number(row.dataset.player), team_id: Number(row.dataset.team), rating: Number(rating),
        goals: Number(row.querySelector('.r-goals').value) || 0, assists: Number(row.querySelector('.r-assists').value) || 0
      });
    });
    if (!ratings.length) { toast('Enter at least one rating', 'error'); return; }
    try {
      await api('/ratings/save', 'POST', { match_id: m.id, ratings });
      closeModal(); toast('Ratings saved', 'ok'); route();
    } catch (err) { toast(err.message, 'error'); }
  });
}

async function openTotwOverrideModal(leagueId, week, posCode, slotIdx, onDone) {
  openModal('<div class="empty">Loading…</div>');
  const players = await api('/players/list?league_id=' + leagueId);
  const eligible = players.filter(p => p.position === posCode);
  openModal(`
    <h3>Select ${POS_LABEL[posCode]} — MW ${week}</h3>
    <form id="overrideForm">
      <div class="field"><label>Player</label>
        <select name="player_id" required>
          <option value="">Choose…</option>
          ${eligible.map(p => `<option value="${p.id}">${esc(p.name)} (${esc(p.team_name)})</option>`).join('')}
        </select>
      </div>
      ${eligible.length ? '' : `<div class="subtle">No players registered at position ${posCode} in this league yet.</div>`}
      <div class="modal-actions">
        <button type="button" class="btn ghost" data-close-modal>Cancel</button>
        <button type="submit" class="btn primary" ${eligible.length ? '' : 'disabled'}>Set Player</button>
      </div>
    </form>
  `);
  document.getElementById('overrideForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const playerId = new FormData(e.target).get('player_id');
    try {
      await api('/totw/override', 'POST', { league_id: leagueId, matchweek: week, position_code: posCode, slot_index: slotIdx, player_id: Number(playerId) });
      closeModal(); toast('TOTW slot updated', 'ok'); onDone();
    } catch (err) { toast(err.message, 'error'); }
  });
}

/* ---------- Teams ---------- */
async function viewTeams() {
  setHeader('Clubs', 'Team database',
    `<button class="btn primary" id="newTeamBtn">+ New Team</button>`);
  $content.innerHTML = '<div class="empty">Loading…</div>';
  const teams = await api('/teams/list');
  $content.innerHTML = `
    <div class="grid cols-3">
      ${teams.map(t => `
        <a class="card" href="#/team/${t.id}" style="display:block">
          <div class="team-cell" style="margin-bottom:8px">${crestOrPlaceholder(t.crest_url, t.name, 28)} <span style="font-size:15px">${esc(t.name)}</span></div>
          <div class="subtle">${t.stadium ? esc(t.stadium) + ' · ' : ''}${t.player_count} players</div>
        </a>
      `).join('') || '<div class="empty">No teams yet.</div>'}
    </div>
  `;
  document.getElementById('newTeamBtn').addEventListener('click', () => {
    openModal(`
      <h3>New Team</h3>
      <form id="teamForm">
        <div class="field"><label>Team Name</label><input name="name" required></div>
        <div class="form-row">
          <div class="field"><label>Home Color</label><input name="home_color" type="color" value="#22c55e"></div>
          <div class="field"><label>Away Color</label><input name="away_color" type="color" value="#0f172a"></div>
        </div>
        <div class="field"><label>Crest URL (optional)</label><input name="crest_url" placeholder="https://…"></div>
        <div class="form-row">
          <div class="field"><label>Stadium</label><input name="stadium"></div>
          <div class="field"><label>Manager</label><input name="manager"></div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn ghost" data-close-modal>Cancel</button>
          <button type="submit" class="btn primary">Create Team</button>
        </div>
      </form>
    `);
    document.getElementById('teamForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      try {
        const team = await api('/teams/create', 'POST', {
          name: f.get('name'), home_color: f.get('home_color'), away_color: f.get('away_color'),
          crest_url: f.get('crest_url') || null, stadium: f.get('stadium') || null, manager: f.get('manager') || null
        });
        closeModal(); toast('Team created', 'ok'); location.hash = '#/team/' + team.id;
      } catch (err) { toast(err.message, 'error'); }
    });
  });
}

async function viewTeamDetail(teamId) {
  const [teams, players] = await Promise.all([api('/teams/list'), api('/players/list?team_id=' + teamId)]);
  const team = teams.find(t => String(t.id) === String(teamId));
  if (!team) { $content.innerHTML = '<div class="empty">Team not found.</div>'; return; }
  setHeader(team.name, `<a href="#/teams">Clubs</a>`, `<button class="btn" data-give-club-award="${team.id}">+ Give award</button> <button class="btn" data-edit-club="${team.id}">Edit club</button> <button class="btn danger" data-disband-club="${team.id}">Disband</button> <button class="btn primary" id="addPlayerBtn">+ Add Player</button>`);
  $content.innerHTML = `
    <div class="grid cols-2" style="margin-bottom:14px">
      <div class="card">
        <h3>Team Info</h3>
        <div style="display:flex;gap:14px;align-items:center;margin-bottom:10px">
          ${crestOrPlaceholder(team.crest_url, team.name, 44)}
          <div>
            <div style="font-weight:800;font-size:16px">${esc(team.name)}</div>
            <div class="subtle">${team.stadium ? esc(team.stadium) : 'No stadium set'}${team.manager ? ' · Manager: ' + esc(team.manager) : ''}</div>
          </div>
        </div>
        <div style="display:flex;gap:10px">
          <span class="chip" style="background:${team.home_color}22;border-color:${team.home_color};color:${team.home_color}">Home</span>
          <span class="chip" style="background:${team.away_color}22;border-color:${team.away_color};color:${team.away_color}">Away</span>
        </div>
      </div>
      <div class="card">
        <h3>Squad Breakdown</h3>
        ${POSITIONS.map(p => `<div style="display:flex;justify-content:space-between;padding:4px 0"><span class="badge pos-${p}">${p}</span><span>${players.filter(x => x.position === p).length}</span></div>`).join('')}
      </div>
    </div>
    <div class="card">
      <h3>Roster (${players.length})</h3>
      ${renderTable(
        ['#', 'Name', 'Position'],
        players.map(p => [p.shirt_number ?? '—', `<a href="#/player/${p.id}">${esc(p.name)}</a>`, `<span class="badge pos-${p.position}">${p.position}</span>`]),
        { empty: 'No players registered yet.' }
      )}
    </div>
  `;
  document.getElementById('addPlayerBtn').addEventListener('click', () => {
    openModal(`
      <h3>Add Player to ${esc(team.name)}</h3>
      <form id="playerForm">
        <div class="field"><label>Name</label><input name="name" required></div>
        <div class="field"><label>Country (optional)</label><input name="country" placeholder="e.g. England"></div>
        <div class="field"><label>Profile picture URL (optional)</label><input name="avatar_url" placeholder="https://…"></div>
        <div class="field"><label>Or upload profile picture</label><input name="avatar_file" type="file" accept="image/png,image/jpeg,image/webp"></div>
        <div class="form-row">
          <div class="field"><label>Position</label>
            <select name="position" required>${POSITIONS.map(p => `<option value="${p}">${p} — ${POS_LABEL[p]}</option>`).join('')}</select>
          </div>
          <div class="field"><label>Shirt #</label><input name="shirt_number" type="number" min="1" max="99"></div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn ghost" data-close-modal>Cancel</button>
          <button type="submit" class="btn primary">Add Player</button>
        </div>
      </form>
    `);
    document.getElementById('playerForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      try {
        await api('/players/create', 'POST', {
          team_id: teamId, name: f.get('name'), position: f.get('position'),
          shirt_number: f.get('shirt_number') ? Number(f.get('shirt_number')) : null,
          country: f.get('country') || null,
          avatar_url: f.get('avatar_file').size ? await window.ptsUploadSquare(f.get('avatar_file')) : (f.get('avatar_url') || null)
        });
        closeModal(); toast('Player added', 'ok'); route();
      } catch (err) { toast(err.message, 'error'); }
    });
  });
}

/* ---------- Player detail ---------- */
async function viewPlayerDetail(playerId) {
  setHeader('Player', '', '');
  $content.innerHTML = '<div class="empty">Loading…</div>';
  const d = await api('/players/detail?player_id=' + playerId);
  const p = d.player;
  setHeader(p.name, `${p.team_id ? `<a href="#/team/${p.team_id}">${esc(p.team_name)}</a>` : 'Free Agent'} · <span class="badge pos-${p.position}">${p.position}</span>`, `<button class="btn" data-player-photo="${p.id}">Update picture</button> <button class="btn primary" data-player-move="${p.id}">Transfer / Release</button>`);
  $content.innerHTML = `
    <div class="grid cols-4" style="margin-bottom:14px">
      <div class="card stat-card accent-green"><div class="num">${fmt1(d.avg_rating)}</div><div class="lbl">Season Avg Rating</div></div>
      <div class="card stat-card accent-blue"><div class="num">${d.apps}</div><div class="lbl">Appearances</div></div>
      <div class="card stat-card accent-gold"><div class="num">${d.goals}</div><div class="lbl">Goals</div></div>
      <div class="card stat-card"><div class="num">${d.assists}</div><div class="lbl">Assists</div></div>
    </div>
    <div class="card" style="margin-bottom:14px">
      <h3>Rating Over Time <span class="subtle">(TOTW appearances: ${d.totw_appearances})</span></h3>
      ${d.history.length ? '<canvas id="ratingChart" height="90"></canvas>' : '<div class="empty">No rated matches yet.</div>'}
    </div>
    <div class="card">
      <h3>Match History</h3>
      ${renderTable(
        ['MW','League','Rating','G','A','Cards'],
        d.history.slice().reverse().map(h => [
          h.matchweek, esc(h.league_name), `<strong>${fmt1(h.rating)}</strong>`, h.goals, h.assists,
          (h.yellow_cards ? `🟨${h.yellow_cards}` : '') + (h.red_cards ? ` 🟥${h.red_cards}` : '') || '—'
        ]),
        { empty: 'No matches rated yet.' }
      )}
    </div>
  `;
  if (d.history.length) {
    new Chart(document.getElementById('ratingChart'), {
      type: 'line',
      data: {
        labels: d.history.map(h => 'MW' + h.matchweek),
        datasets: [{
          label: 'Rating', data: d.history.map(h => h.rating), borderColor: '#22c55e',
          backgroundColor: '#22c55e33', tension: .25, fill: true, pointRadius: 3
        }]
      },
      options: { scales: { y: { min: 0, max: 10 } }, plugins: { legend: { display: false } } }
    });
  }
}

/* ---------- Boot ---------- */
initTheme();
route();
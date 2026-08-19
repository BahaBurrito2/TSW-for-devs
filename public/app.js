/* ============================================================
   TSW — Touch Soccer World · core application
   Public read-only for visitors; admin actions are hidden
   client-side and enforced server-side.
   ============================================================ */
const API = window.__HATCHABLE__.api;
const $content = document.getElementById('content');
const $title = document.getElementById('pageTitle');
const $crumbs = document.getElementById('pageCrumbs');
const $actions = document.getElementById('pageActions');
const $nav = document.getElementById('nav');
const $tabBar = document.getElementById('tabBar');
const $modalRoot = document.getElementById('modalRoot');
const $toastRoot = document.getElementById('toastRoot');
const $lightboxRoot = document.getElementById('lightboxRoot');

/* ---------- Core helpers ---------- */
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
function initials(name) {
  return String(name || '?').split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}
function crest(url, name, size) {
  size = size || 20;
  if (url) return `<img class="crest" style="width:${size}px;height:${size}px" src="${esc(url)}" alt="" loading="lazy">`;
  return `<span class="crest placeholder" style="width:${size}px;height:${size}px;font-size:${Math.max(8, Math.round(size * 0.42))}px">${esc(initials(name))}</span>`;
}
function avatar(url, name, size) {
  size = size || 22;
  if (url) return `<img class="avatar" style="width:${size}px;height:${size}px" src="${esc(url)}" alt="" loading="lazy">`;
  return `<span class="avatar placeholder" style="width:${size}px;height:${size}px;font-size:${Math.max(8, Math.round(size * 0.4))}px">${esc(initials(name))}</span>`;
}

function toast(msg, type) {
  const t = document.createElement('div');
  t.className = 'toast ' + (type || '');
  t.textContent = msg;
  $toastRoot.appendChild(t);
  setTimeout(() => t.remove(), 3400);
}
function closeModal() { $modalRoot.innerHTML = ''; }
function openModal(html, wide) {
  $modalRoot.innerHTML = `<div class="modal-backdrop" data-close-modal>
    <div class="modal" style="${wide ? 'max-width:720px' : ''}">${html}</div>
  </div>`;
  $modalRoot.querySelector('.modal-backdrop').addEventListener('click', (e) => {
    if (e.target.hasAttribute('data-close-modal')) closeModal();
  });
}
function confirmModal(title, sub, confirmLabel, onConfirm, danger) {
  openModal(`
    <h3>${esc(title)}</h3>
    <p class="modal-sub">${sub}</p>
    <div class="field"><label>Type ${esc(confirmLabel.toUpperCase())} to confirm</label><input id="confirmWord" autocomplete="off"></div>
    <div class="modal-actions">
      <button type="button" class="btn ghost" data-close-modal>Cancel</button>
      <button type="button" class="btn ${danger ? 'danger' : 'primary'}" id="confirmBtn" disabled>${esc(confirmLabel)}</button>
    </div>
  `);
  const word = document.getElementById('confirmWord');
  const btn = document.getElementById('confirmBtn');
  word.addEventListener('input', () => { btn.disabled = word.value.trim().toUpperCase() !== confirmLabel.toUpperCase(); });
  btn.addEventListener('click', async () => {
    try { await onConfirm(word.value.trim()); } catch (err) { toast(err.message, 'error'); }
  });
}
function timeAgo(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return esc(ts);
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  if (s < 86400 * 7) return Math.floor(s / 86400) + 'd ago';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
}
function fmtDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return esc(String(ts).slice(0, 10));
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/* Country → flag (typographic, part of player data, not UI chrome) */
const FLAGS = {
  england:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', scotland:'🏴󠁧󠁢󠁳󠁣󠁴󠁿', wales:'🏴󠁧󠁢󠁷󠁬󠁳󠁿', ireland:'🇮🇪', uk:'🇬🇧', usa:'🇺🇸',
  france:'🇫🇷', germany:'🇩🇪', spain:'🇪🇸', italy:'🇮🇹', portugal:'🇵🇹', netherlands:'🇳🇱', belgium:'🇧🇪',
  brazil:'🇧🇷', argentina:'🇦🇷', colombia:'🇨🇴', uruguay:'🇺🇾', mexico:'🇲🇽', chile:'🇨🇱', peru:'🇵🇪',
  nigeria:'🇳🇬', ghana:'🇬🇭', senegal:'🇸🇳', morocco:'🇲🇦', algeria:'🇩🇿', egypt:'🇪🇬', 'south africa':'🇿🇦',
  japan:'🇯🇵', 'south korea':'🇰🇷', china:'🇨🇳', india:'🇮🇳', australia:'🇦🇺', 'new zealand':'🇳🇿',
  sweden:'🇸🇪', norway:'🇳🇴', denmark:'🇩🇰', finland:'🇫🇮', poland:'🇵🇱', ukraine:'🇺🇦', turkey:'🇹🇷',
  greece:'🇬🇷', croatia:'🇭🇷', serbia:'🇷🇸', switzerland:'🇨🇭', austria:'🇦🇹', 'czech republic':'🇨🇿',
  canada:'🇨🇦', jamaica:'🇯🇲', trinidad:'🇹🇹', 'costa rica':'🇨🇷', panama:'🇵🇦', ecuador:'🇪🇨', venezuela:'🇻🇪',
  'saudi arabia':'🇸🇦', qatar:'🇶🇦', uae:'🇦🇪', iran:'🇮🇷', iraq:'🇮🇶', russia:'🇷🇺', romania:'🇷🇴',
  hungary:'🇭🇺', slovakia:'🇸🇰', slovenia:'🇸🇮', bulgaria:'🇧🇬', iceland:'🇮🇸', bosnia:'🇧🇦', albania:'🇦🇱',
  macedonia:'🇲🇰', montenegro:'🇲🇪', latvia:'🇱🇻', lithuania:'🇱🇹', estonia:'🇪🇪', georgia:'🇬🇪',
  cameroon:'🇨🇲', 'ivory coast':'🇨🇮', mali:'🇲🇱', tunisia:'🇹🇳', congo:'🇨🇬', angola:'🇦🇴', zambia:'🇿🇲',
  kenya:'🇰🇪', tanzania:'🇹🇿', uganda:'🇺🇬', ethiopia:'🇪🇹', zimbabwe:'🇿🇼'
};
function flagOf(country) {
  if (!country) return '';
  const c = String(country).toLowerCase();
  if (FLAGS[c]) return FLAGS[c];
  const exact = Object.keys(FLAGS).find(k => c.startsWith(k) || k.startsWith(c));
  return exact ? FLAGS[exact] : '';
}

const POSITIONS = ['GK', 'RB', 'CB', 'LB', 'CM', 'ST'];
const POS_LABEL = { GK: 'Goalkeeper', RB: 'Right Back', CB: 'Centre Back', LB: 'Left Back', CM: 'Centre Mid', ST: 'Striker' };
const FORMAT_LABEL = { single_elimination: 'Knockout', two_leg: 'Two legs', league: 'League', single_round_robin: 'Round robin' };
const TYPE_LABEL = { transfer: 'Transfer', free_agent: 'Free agent', loan: 'Loan', registration: 'Registration' };

/* ---------- Header / nav / router ---------- */
const NAV_ITEMS = [
  { href: '#/', label: 'Dashboard', ic: '▤', match: (h) => h === '#/' || h === '' },
  { href: '#/leagues', label: 'Leagues', ic: '▥', match: (h) => h.startsWith('#/leagues') || h.startsWith('#/league/') || h.startsWith('#/cup/') },
  { href: '#/teams', label: 'Clubs & Players', ic: '◉', match: (h) => h.startsWith('#/teams') || h.startsWith('#/team/') || h.startsWith('#/player/') },
  { href: '#/control', label: 'Control Center', ic: '⚙', match: (h) => h.startsWith('#/control') },
  { href: '#/news', label: 'News', ic: '▣', match: (h) => h.startsWith('#/news') },
  { href: '#/awards', label: 'Awards', ic: '✦', match: (h) => h.startsWith('#/awards') },
  { href: '#/transfers', label: 'Transfer Market', ic: '⇄', match: (h) => h.startsWith('#/transfers') }
];
const TAB_ITEMS = [
  { href: '#/', label: 'Home', ic: '▤', match: (h) => h === '#/' || h === '' },
  { href: '#/leagues', label: 'Leagues', ic: '▥', match: (h) => h.startsWith('#/leagues') || h.startsWith('#/league/') || h.startsWith('#/cup/') },
  { href: '#/teams', label: 'Clubs', ic: '◉', match: (h) => h.startsWith('#/teams') || h.startsWith('#/team/') || h.startsWith('#/player/') },
  { href: '#/news', label: 'News', ic: '▣', match: (h) => h.startsWith('#/news') },
  { href: '#/transfers', label: 'Market', ic: '⇄', match: (h) => h.startsWith('#/transfers') }
];

function renderNav() {
  const h = location.hash || '#/';
  $nav.innerHTML = NAV_ITEMS.map(i =>
    `<a class="nav-link ${i.match(h) ? 'active' : ''}" href="${i.href}"><span class="nav-ic">${i.ic}</span>${i.label}</a>`
  ).join('');
  $tabBar.innerHTML = TAB_ITEMS.map(i =>
    `<a class="tab-link ${i.match(h) ? 'active' : ''}" href="${i.href}"><span class="tab-ic">${i.ic}</span>${i.label}</a>`
  ).join('');
}

function setHeader(title, crumbs, actionsHtml) {
  $title.textContent = title;
  $crumbs.innerHTML = crumbs || '';
  $actions.innerHTML = actionsHtml || '';
  document.title = title + ' — TSW';
}

async function route() {
  renderNav();
  const hash = location.hash || '#/';
  const parts = hash.replace(/^#\//, '').split('/').filter(Boolean);
  try {
    if (parts.length === 0) return viewDashboard();
    if (parts[0] === 'leagues') return viewLeagues();
    if (parts[0] === 'league' && parts[1]) return viewLeagueDetail(parts[1], parts[2]);
    if (parts[0] === 'cup' && parts[1] && window.renderCupBracket) return window.renderCupBracket(parts[1]);
    if (parts[0] === 'teams') return viewTeams();
    if (parts[0] === 'team' && parts[1]) return viewTeamDetail(parts[1]);
    if (parts[0] === 'player' && parts[1] && window.renderFullPlayerProfile) return window.renderFullPlayerProfile(parts[1]);
    if (parts[0] === 'control' && window.tswControlRoute) return window.tswControlRoute();
    if (parts[0] === 'news' && window.renderNews) return window.renderNews();
    if (parts[0] === 'awards' && window.renderAwards) return window.renderAwards();
    if (parts[0] === 'transfers' && window.renderTransferMarket) return window.renderTransferMarket();
    $content.innerHTML = '<div class="empty"><h3>Page not found</h3><p>That page does not exist.</p></div>';
  } catch (err) {
    $content.innerHTML = `<div class="empty"><h3>Something went wrong</h3><p>${esc(err.message)}</p></div>`;
  }
}
window.addEventListener('hashchange', route);

/* ---------- Dashboard ---------- */
async function viewDashboard() {
  setHeader('Dashboard', 'Division 1 & Division 2 overview', '');
  $content.innerHTML = '<div class="empty">Loading…</div>';
  const [d, posts] = await Promise.all([api('/dashboard'), api('/news').catch(() => [])]);
  const boot = d.top_scorers[0];
  const win = d.biggest_win_this_week;
  const margin = win ? Math.abs(win.home_score - win.away_score) : 0;
  const newsList = (Array.isArray(posts) ? posts : []).slice(0, 3);

  $content.innerHTML = `
    <div class="stat-strip">
      <div class="stat-cell"><div class="stat-num">${d.active_leagues}</div><div class="stat-lbl">Active leagues</div></div>
      <div class="stat-cell"><div class="stat-num">${d.matches_played}</div><div class="stat-lbl">Matches played</div></div>
      <div class="stat-cell"><div class="stat-num">${boot ? boot.goals : '—'}</div><div class="stat-lbl">Golden boot</div><div class="stat-sub">${boot ? esc(boot.name) : 'No goals yet'}</div></div>
      <div class="stat-cell"><div class="stat-num">${win ? margin : '—'}</div><div class="stat-lbl">Biggest win (7d)</div><div class="stat-sub">${win ? esc(win.home_team_name) + ' ' + win.home_score + '–' + win.away_score + ' ' + esc(win.away_team_name) : 'No results'}</div></div>
    </div>

    ${d.matches_played === 0 ? `
      <div class="section-block">
        <div class="empty">
          <h3>The season hasn’t kicked off</h3>
          <p>No fixtures recorded yet. Add clubs, generate the fixture list and enter results from the Control Center.</p>
          <div class="empty-state-cta"><a class="btn primary" href="#/control">Open Control Center</a></div>
        </div>
      </div>` : ''}

    <div class="grid cols-2 section-block">
      <div class="card">
        <h3>Top scorers</h3>
        ${d.top_scorers.length ? `<ul class="rank-list">${d.top_scorers.map((p, i) => `
          <li>
            <span class="rank">${i + 1}</span>
            ${avatar(p.avatar_url, p.name, 24)}
            <div class="r-body">
              <div class="r-name"><a href="#/player/${p.player_id}">${esc(p.name)}</a></div>
              <div class="r-sub">${esc(p.team_name)}</div>
            </div>
            <span class="r-val">${p.goals}</span>
          </li>`).join('')}</ul>` : '<div class="empty"><h3>No goals yet</h3><p>Ratings with goals will build this board.</p></div>'}
      </div>
      <div class="card">
        <h3>Most assists</h3>
        ${d.top_assists.length ? `<ul class="rank-list">${d.top_assists.map((p, i) => `
          <li>
            <span class="rank">${i + 1}</span>
            ${avatar(p.avatar_url, p.name, 24)}
            <div class="r-body">
              <div class="r-name"><a href="#/player/${p.player_id}">${esc(p.name)}</a></div>
              <div class="r-sub">${esc(p.team_name)}</div>
            </div>
            <span class="r-val">${p.assists}</span>
          </li>`).join('')}</ul>` : '<div class="empty"><h3>No assists yet</h3><p>Assists are recorded with post-match ratings.</p></div>'}
      </div>
    </div>

    <div class="grid cols-2 section-block">
      <div class="card">
        <h3>Best defense — fewest conceded</h3>
        ${renderTable(['Club', 'P', 'GA'], d.best_defense.map(t => [esc(t.team_name), t.played, t.conceded]), { empty: 'No matches played yet.' })}
      </div>
      <div class="card">
        <h3>Latest news</h3>
        ${newsList.length ? newsList.map(p => `
          <a class="news-row-mini" href="#/news">
            ${p.cover_url ? `<img src="${esc(p.cover_url)}" alt="" loading="lazy">` : ''}
            <div>
              <b>${esc(p.title)}</b>
              <small>${esc(p.category)} · ${timeAgo(p.published_at || p.created_at)}</small>
            </div>
          </a>`).join('') : '<div class="empty"><h3>No news yet</h3><p>Published posts will appear here.</p></div>'}
      </div>
    </div>
  `;
}

/* ---------- Leagues list ---------- */
async function viewLeagues() {
  setHeader('Leagues', 'Divisions, cups & competitions',
    `<button class="btn primary admin-only" id="newLeagueBtn">+ New League</button>`);
  $content.innerHTML = '<div class="empty">Loading…</div>';
  const [overview, allLeagues] = await Promise.all([api('/pts/overview'), api('/leagues/list')]);
  const active = overview.active;
  const divisions = active ? overview.leagues : [];
  const cups = active ? overview.competitions.filter(c => c.format !== 'league') : [];
  const standalone = allLeagues.filter(l => !l.season_id);
  const teamsById = {};
  overview.teams.forEach(t => { teamsById[t.id] = t; });

  let html = '';

  if (active) {
    html += `
      <div class="section-block">
        <div class="section-head"><h3>Divisions — ${esc(active.name)}</h3><span class="subtle">Single round robin · ${divisions.length ? '7 gameweeks' : ''}</span></div>
        <div class="grid cols-2">
          ${divisions.map(l => {
            const full = l.team_count === 8;
            const noFixtures = l.matches_total === 0;
            return `
            <div class="card">
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
                <span class="badge solid">${esc(l.division_code || 'LG')}</span>
                <div style="flex:1;min-width:0">
                  <div style="font-weight:800;font-size:15px"><a href="#/league/${l.id}">${esc(l.name)}</a></div>
                  <div class="subtle">${esc(l.season)}</div>
                </div>
              </div>
              <div class="mini-bars">
                <div class="mini-bar-row"><span style="width:52px">Clubs</span><span class="bar"><div style="width:${Math.min(100, l.team_count / 8 * 100)}%"></div></span><span class="tnum">${l.team_count}/8</span></div>
                <div class="mini-bar-row"><span style="width:52px">Played</span><span class="bar"><div style="width:${Math.min(100, l.matches_played / 28 * 100)}%"></div></span><span class="tnum">${l.matches_played}/28</span></div>
              </div>
              <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
                <a class="btn sm" href="#/league/${l.id}">View table</a>
                ${full && noFixtures ? `<button class="btn sm admin-only gen-fixtures" data-id="${l.id}">Generate 7 gameweeks</button>` : ''}
                ${!full ? `<span class="subtle" style="align-self:center">Add ${8 - l.team_count} more club${8 - l.team_count > 1 ? 's' : ''} to generate fixtures</span>` : ''}
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`;

    html += `
      <div class="section-block">
        <div class="section-head"><h3>Cups</h3><button class="btn sm admin-only" id="newCupBtn">+ Add cup</button></div>
        ${cups.length ? `
        <div class="grid cols-3">
          ${cups.map(c => `
            <div class="card">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                <span class="badge">${esc(c.format === 'two_leg' ? 'Two legs' : 'Knockout')}</span>
                <span class="badge ${c.status === 'completed' ? 'faint' : ''}">${esc(c.status)}</span>
              </div>
              <div style="font-weight:800;font-size:15px;margin-bottom:2px"><a href="#/cup/${c.id}">${esc(c.name)}</a></div>
              <div class="subtle">${c.entry_count} club${c.entry_count === 1 ? '' : 's'} entered</div>
              <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
                <a class="btn sm" href="#/cup/${c.id}">Bracket</a>
                <button class="btn sm admin-only cup-entries" data-id="${c.id}" data-name="${esc(c.name)}">Entries</button>
                <button class="btn sm admin-only cup-draw" data-id="${c.id}" data-name="${esc(c.name)}" ${c.entry_count < 2 ? 'disabled' : ''}>Draw</button>
                <button class="btn sm danger admin-only cup-remove" data-id="${c.id}" data-name="${esc(c.name)}">Remove</button>
              </div>
            </div>`).join('')}
        </div>` : '<div class="empty"><h3>No cups this season</h3><p>Add a knockout or two-leg cup, then enter clubs and draw the bracket.</p></div>'}
      </div>`;
  }

  if (standalone.length) {
    html += `
      <div class="section-block">
        <div class="section-head"><h3>Other leagues</h3></div>
        <div class="grid cols-3">
          ${standalone.map(l => `
            <div class="card">
              <div style="font-weight:800;font-size:15px;margin-bottom:2px"><a href="#/league/${l.id}">${esc(l.name)}</a></div>
              <div class="subtle" style="margin-bottom:10px">${esc(l.season)}${l.country ? ' · ' + esc(l.country) : ''}</div>
              <div style="display:flex;gap:16px">
                <div><div class="num" style="font-weight:900;font-size:18px">${l.team_count}</div><div class="subtle">Clubs</div></div>
                <div><div class="num" style="font-weight:900;font-size:18px">${l.matches_played}</div><div class="subtle">Played</div></div>
              </div>
              <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
                <a class="btn sm" href="#/league/${l.id}">Open</a>
                <button class="btn sm danger admin-only delete-league" data-id="${l.id}" data-name="${esc(l.name)}">Delete</button>
              </div>
            </div>`).join('')}
        </div>
      </div>`;
  }

  if (!active && !standalone.length) {
    html = `
      <div class="empty">
        <h3>No competitions yet</h3>
        <p>Start a season to create Division 1, Division 2 and the cup competitions — then add clubs and fixtures.</p>
        <div class="empty-state-cta"><a class="btn primary" href="#/control">Go to Control Center</a></div>
      </div>`;
  }

  $content.innerHTML = html;

  document.querySelectorAll('.gen-fixtures').forEach(b => b.addEventListener('click', async () => {
    try {
      const r = await api('/pts/fixtures/generate', 'POST', { league_id: +b.dataset.id });
      toast(r.message, 'ok'); route();
    } catch (err) { toast(err.message, 'error'); }
  }));
  document.querySelectorAll('.delete-league').forEach(b => b.addEventListener('click', () => {
    confirmModal('Delete ' + b.dataset.name + '?', 'This archives the league. Historical fixtures, results, ratings and standings remain in the records. Division leagues are managed through season rollover and cannot be deleted individually.', 'DELETE', async (word) => {
      await api('/leagues/delete', 'POST', { league_id: +b.dataset.id, confirmation: word });
      closeModal(); toast('League archived', 'ok'); route();
    }, true);
  }));
  document.querySelectorAll('.cup-entries').forEach(b => b.addEventListener('click', () => {
    if (window.openCupEntries) window.openCupEntries(+b.dataset.id, b.dataset.name, overview.teams);
  }));
  document.querySelectorAll('.cup-draw').forEach(b => b.addEventListener('click', () => {
    if (window.openCupDraw) window.openCupDraw(+b.dataset.id, b.dataset.name);
  }));
  document.querySelectorAll('.cup-remove').forEach(b => b.addEventListener('click', () => {
    if (window.openCupRemove) window.openCupRemove(+b.dataset.id, b.dataset.name);
  }));
  const newLeagueBtn = document.getElementById('newLeagueBtn');
  if (newLeagueBtn) newLeagueBtn.addEventListener('click', openNewLeagueModal);
  const newCupBtn = document.getElementById('newCupBtn');
  if (newCupBtn && window.openNewCup) newCupBtn.addEventListener('click', () => window.openNewCup());
}

function openNewLeagueModal() {
  openModal(`
    <h3>New League</h3>
    <p class="modal-sub">A standalone round-robin league outside the season structure.</p>
    <form id="leagueForm">
      <div class="field"><label>League name</label><input name="name" required placeholder="e.g. Summer 7s League"></div>
      <div class="form-row">
        <div class="field"><label>Season</label><input name="season" required placeholder="2026/27"></div>
        <div class="field"><label>Country / region</label><input name="country" placeholder="optional"></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Relegation spots</label><input name="relegation_spots" type="number" min="0" value="0"></div>
        <div class="field"><label>Promotion spots</label><input name="promotion_spots" type="number" min="0" value="0"></div>
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
      closeModal(); toast('League created', 'ok');
      location.hash = '#/league/' + league.id;
    } catch (err) { toast(err.message, 'error'); }
  });
}

/* ---------- League detail ---------- */
const LEAGUE_TABS = [
  { key: 'standings', label: 'Standings' },
  { key: 'matches', label: 'Matches' },
  { key: 'scorers', label: 'Top Scorers' },
  { key: 'ratings', label: 'Ratings' },
  { key: 'totw', label: 'Team of the Week' }
];

async function viewLeagueDetail(leagueId, tab) {
  tab = tab || 'standings';
  const [standingsData, teams] = await Promise.all([
    api('/standings/get?league_id=' + leagueId),
    api('/teams/list?league_id=' + leagueId)
  ]);
  const league = standingsData.league;
  setHeader(league.name, `<a href="#/leagues">Leagues</a> / ${esc(league.season)}`,
    `<button class="btn admin-only" id="addTeamBtn">+ Add Club</button>
     <button class="btn primary admin-only" id="newMatchBtn">+ New Match</button>`);

  $content.innerHTML = `
    <div class="tabs">
      ${LEAGUE_TABS.map(t => `<div class="tab ${t.key === tab ? 'active' : ''}" data-tab="${t.key}">${t.label}</div>`).join('')}
    </div>
    <div id="tabBody"></div>
  `;
  $content.querySelectorAll('.tab').forEach(el => el.addEventListener('click', () => {
    location.hash = `#/league/${leagueId}/${el.dataset.tab}`;
  }));
  const addBtn = document.getElementById('addTeamBtn');
  if (addBtn) addBtn.addEventListener('click', () => openAddTeamModal(leagueId, teams));
  const matchBtn = document.getElementById('newMatchBtn');
  if (matchBtn) matchBtn.addEventListener('click', () => openNewMatchModal(leagueId, teams));

  const body = document.getElementById('tabBody');
  if (tab === 'standings') return renderStandingsTab(body, standingsData);
  if (tab === 'matches') return renderMatchesTab(body, leagueId, teams);
  if (tab === 'scorers') return renderScorersTab(body, leagueId);
  if (tab === 'ratings') return renderRatingsTab(body, leagueId, teams);
  if (tab === 'totw') return renderTotwTab(body, leagueId);
}

function renderStandingsTab(body, data) {
  const cols = [
    { key: 'position', label: '#', num: false },
    { key: 'name', label: 'Club', num: false },
    { key: 'played', label: 'P', num: true },
    { key: 'won', label: 'W', num: true },
    { key: 'drawn', label: 'D', num: true },
    { key: 'lost', label: 'L', num: true },
    { key: 'gf', label: 'GF', num: true },
    { key: 'ga', label: 'GA', num: true },
    { key: 'gd', label: 'GD', num: true },
    { key: 'pts', label: 'Pts', num: true },
    { key: 'form', label: 'Form', num: false }
  ];
  let sortKey = 'position';
  let sortDir = 1;

  const zoneBadge = (t) => {
    if (t.zone === 'champion') return '<span class="badge zone-champ">Champion</span>';
    if (t.zone === 'promotion') return '<span class="badge zone-promo">↑ Promoted</span>';
    if (t.zone === 'relegation') return '<span class="badge zone-releg">↓ Relegated</span>';
    return '';
  };

  function draw() {
    const rows = [...data.table];
    if (sortKey !== 'position') {
      rows.sort((a, b) => {
        let av = a[sortKey], bv = b[sortKey];
        if (typeof av === 'string') return av.localeCompare(bv) * sortDir;
        return (av - bv) * sortDir;
      });
    }
    const zoneNote = data.league.division_code === 'D1'
      ? `Champion · bottom two relegated (${data.league.relegation_spots || 2} spots)`
      : data.league.division_code === 'D2'
        ? `Champion · top two promoted`
        : 'Champion';
    body.innerHTML = `
      <div class="card">
        <div class="table-wrap">
          <table class="standings-table">
            <thead><tr>
              ${cols.map(c => `<th class="${c.num ? 'num' : ''} ${c.key !== 'name' ? 'sortable' : ''}" data-key="${c.key}">${c.label}${sortKey === c.key ? (sortDir === 1 ? ' ▾' : ' ▴') : ''}</th>`).join('')}
            </tr></thead>
            <tbody>
              ${rows.map(t => `
                <tr class="${t.zone ? 'zone-' + t.zone : ''}">
                  <td class="pos num">${t.position}</td>
                  <td>
                    <div class="team-cell"><a href="#/team/${t.team_id}" style="display:flex;align-items:center;gap:8px">${crest(t.crest_url, t.name)} <span>${esc(t.name)}</span></a></div>
                  </td>
                  <td class="num">${t.played}</td><td class="num">${t.won}</td><td class="num">${t.drawn}</td><td class="num">${t.lost}</td>
                  <td class="num">${t.gf}</td><td class="num">${t.ga}</td>
                  <td class="num">${t.gd > 0 ? '+' : ''}${t.gd}</td>
                  <td class="num"><strong>${t.pts}</strong></td>
                  <td class="num"><div class="form-dots">${t.last5.length ? t.last5.map(r => `<span class="dot ${r}">${r}</span>`).join('') : '<span class="subtle">—</span>'}</div></td>
                </tr>`).join('') || `<tr><td colspan="${cols.length}" class="center"><div class="empty"><h3>No clubs yet</h3><p>Add clubs to build the table.</p></div></td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
      ${data.table.length ? `<div class="subtle" style="margin-top:10px">${esc(zoneNote)} · Click a column header to sort</div>` : ''}
    `;
    body.querySelectorAll('th.sortable').forEach(th => th.addEventListener('click', () => {
      const key = th.dataset.key;
      if (sortKey === key) sortDir *= -1; else { sortKey = key; sortDir = 1; }
      draw();
    }));
  }
  draw();
}

async function renderMatchesTab(body, leagueId, teams) {
  body.innerHTML = '<div class="empty">Loading…</div>';
  const [matches, allTeams] = await Promise.all([
    api('/matches/list?league_id=' + leagueId),
    api('/teams/list?league_id=' + leagueId)
  ]);
  const crestById = {};
  allTeams.forEach(t => { crestById[t.id] = t.crest_url; });
  const byWeek = {};
  matches.forEach(m => { (byWeek[m.matchweek] ||= []).push(m); });
  const weeks = Object.keys(byWeek).sort((a, b) => a - b);

  body.innerHTML = weeks.length ? weeks.map(w => `
    <div class="card" style="padding:0;overflow:hidden">
      <div style="padding:11px 14px;border-bottom:1px solid var(--fg-15);display:flex;justify-content:space-between;align-items:center">
        <b style="font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--fg-55)">Matchweek ${w}</b>
        <span class="subtle tnum">${byWeek[w].filter(m => m.status === 'played').length}/${byWeek[w].length} played</span>
      </div>
      ${byWeek[w].map(m => `
        <div class="match-card">
          <div class="match-side home">
            <span class="m-name">${esc(m.home_team_name)}</span>
            ${crest(crestById[m.home_team_id], m.home_team_name, 22)}
          </div>
          <div class="match-center">
            ${m.status === 'played'
              ? `<span class="match-score">${m.home_score} – ${m.away_score}</span>`
              : `<span class="match-score vs">vs</span>`}
          </div>
          <div class="match-side">
            ${crest(crestById[m.away_team_id], m.away_team_name, 22)}
            <span class="m-name">${esc(m.away_team_name)}</span>
          </div>
          <div class="match-meta">
            ${m.status === 'played'
              ? `<span class="badge solid">FT</span>${m.forfeit_team_id ? '<span class="badge faint">Forfeit</span>' : ''}`
              : `<span class="m-date subtle">${m.played_at ? fmtDate(m.played_at) : 'Scheduled'}</span>`}
            <button class="btn sm admin-only edit-match" data-id="${m.id}">${m.status === 'played' ? 'Edit' : 'Enter score'}</button>
            ${m.status === 'played' ? `<button class="btn sm admin-only rate-match" data-id="${m.id}">Rate players</button>` : ''}
          </div>
        </div>`).join('')}
    </div>
  `).join('') : '<div class="card"><div class="empty"><h3>No fixtures yet</h3><p>Add clubs and generate the fixture list from the Control Center, or create a match manually.</p></div></div>';

  body.querySelectorAll('.edit-match').forEach(b => b.addEventListener('click', () => {
    const m = matches.find(x => String(x.id) === b.dataset.id);
    openEditMatchModal(leagueId, m);
  }));
  body.querySelectorAll('.rate-match').forEach(b => b.addEventListener('click', () => {
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
  const rankList = (list, valKey, subKey) => list.length ? `<ul class="rank-list">${list.map((p, i) => `
    <li>
      <span class="rank">${i + 1}</span>
      ${avatar(p.avatar_url, p.name, 24)}
      <div class="r-body">
        <div class="r-name"><a href="#/player/${p.player_id}">${esc(p.name)}</a></div>
        <div class="r-sub">${esc(p.team_name)}</div>
      </div>
      <span class="r-val">${p[valKey]}</span>
    </li>`).join('')}</ul>` : '<div class="empty"><h3>Nothing here yet</h3><p>Record ratings with goals and assists to fill this board.</p></div>';

  body.innerHTML = `
    <div class="grid cols-3">
      <div class="card"><h3>Top scorers</h3>${rankList(board.top_scorers, 'goals', 'team_name')}</div>
      <div class="card"><h3>Top assists</h3>${rankList(board.top_assists, 'assists', 'team_name')}</div>
      <div class="card">
        <h3>Best defense</h3>
        ${board.best_defense.length ? `<ul class="rank-list">${board.best_defense.map((t, i) => `
          <li>
            <span class="rank">${i + 1}</span>
            ${crest(t.crest_url, t.team_name, 24)}
            <div class="r-body"><div class="r-name">${esc(t.team_name)}</div><div class="r-sub">${t.played} games</div></div>
            <span class="r-val">${t.conceded}</span>
          </li>`).join('')}</ul>` : '<div class="empty"><h3>No matches yet</h3></div>'}
      </div>
    </div>
    <div class="card section-block">
      <h3>Player average rating</h3>
      ${ratingBoard.length ? renderTable(
        ['Player', 'Club', 'Pos', 'Apps', 'Avg', 'Last 5', 'G', 'A'],
        ratingBoard.map(p => [
          `<a href="#/player/${p.player_id}" style="display:flex;align-items:center;gap:8px;font-weight:700">${avatar(p.avatar_url, p.name, 22)} ${esc(p.name)}</a>`,
          esc(p.team_name),
          `<span class="badge pos">${p.position}</span>`,
          p.apps, `<strong>${fmt1(p.avg_rating)}</strong>`, fmt1(p.avg_last5), p.goals, p.assists
        ])
      ) : '<div class="empty"><h3>No ratings yet</h3><p>Rate players after matches to build the average board.</p></div>'}
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
      <div class="card">
        <h3>Rate played matches</h3>
        ${matches.length ? matches.map(m => `
          <div class="match-card">
            <div style="font-weight:700;font-size:13px;flex:1">MW${m.matchweek} · <a href="#/team/${m.home_team_id}">${esc(m.home_team_name)}</a> <span class="match-score" style="font-size:13px">${m.home_score}–${m.away_score}</span> <a href="#/team/${m.away_team_id}">${esc(m.away_team_name)}</a></div>
            <button class="btn sm admin-only rate-btn" data-id="${m.id}">Rate players</button>
          </div>`).join('') : '<div class="empty"><h3>No played matches yet</h3><p>Enter scores first, then rate the players involved.</p></div>'}
      </div>
      <div class="card section-block">
        <div class="section-head">
          <h3>Player average</h3>
          <div class="chip-list">
            <div class="chip ${posFilter === '' ? 'active' : ''}" data-pos="">All</div>
            ${POSITIONS.map(p => `<div class="chip ${posFilter === p ? 'active' : ''}" data-pos="${p}">${p}</div>`).join('')}
          </div>
        </div>
        ${filtered.length ? renderTable(
          ['Player', 'Club', 'Pos', 'Apps', 'Avg', 'Last 5', 'G', 'A'],
          filtered.map(p => [
            `<a href="#/player/${p.player_id}" style="display:flex;align-items:center;gap:8px;font-weight:700">${avatar(p.avatar_url, p.name, 22)} ${esc(p.name)}</a>`,
            esc(p.team_name),
            `<span class="badge pos">${p.position}</span>`,
            p.apps, `<strong>${fmt1(p.avg_rating)}</strong>`, fmt1(p.avg_last5), p.goals, p.assists
          ])
        ) : '<div class="empty"><h3>No ratings yet</h3><p>Rate players after matches to build this board.</p></div>'}
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
    body.innerHTML = '<div class="card"><div class="empty"><h3>No matchweeks yet</h3><p>Play and rate matches to generate a Team of the Week.</p></div></div>';
    return;
  }
  let week = weeks[weeks.length - 1];

  async function draw() {
    body.innerHTML = `
      <div class="card" style="margin-bottom:14px">
        <div class="section-head" style="margin-bottom:0">
          <div class="chip-list">${weeks.map(w => `<div class="chip ${w === week ? 'active' : ''}" data-week="${w}">MW ${w}</div>`).join('')}</div>
          <div style="display:flex;gap:8px">
            <button class="btn sm admin-only" id="genBtn">Auto-generate</button>
            <button class="btn sm primary admin-only" id="pubBtn">Publish</button>
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
      wrap.innerHTML = '<div class="card"><div class="empty"><h3>No picks for this matchweek</h3><p>Auto-generate a team from the match ratings.</p></div></div>';
      return;
    }
    const bySlot = {};
    picks.forEach(p => { bySlot[p.position_code + p.slot_index] = p; });
    const published = picks.some(p => p.status === 'published');
    const slotHtml = (code, idx) => {
      const p = bySlot[code + idx];
      return `<div class="totw-slot ${p && p.player_id ? '' : 'empty'}" data-pos="${code}" data-slot="${idx}" ${p && p.player_id ? '' : 'data-noop'}>
        ${p && p.player_id
          ? `<div class="rating">${fmt1(p.match_rating)}</div><div class="pname">${esc(p.player_name)}</div><div class="pteam">${esc(p.team_name)} · ${code}</div>`
          : `<div class="pname">— ${POS_LABEL[code]} —</div>`}
      </div>`;
    };
    wrap.innerHTML = `
      <div class="card">
        <div class="section-head">
          <h3>Team of the Week</h3>
          <span class="badge ${published ? 'solid' : ''}">${published ? 'Published' : 'Pending'}</span>
        </div>
        <div class="pitch">
          <div class="pitch-row">${slotHtml('ST', 0)}${slotHtml('ST', 1)}</div>
          <div class="pitch-row">${slotHtml('CM', 0)}</div>
          <div class="pitch-row">${slotHtml('LB', 0)}${slotHtml('CB', 0)}${slotHtml('RB', 0)}</div>
          <div class="pitch-row">${slotHtml('GK', 0)}</div>
        </div>
        <div class="subtle" style="margin-top:10px">Fixed formation<span class="admin-only"> · click a slot to override the pick manually</span>.</div>
      </div>
    `;
    if (window.TSW_ADMIN) {
      wrap.querySelectorAll('.totw-slot:not([data-noop])').forEach(el => el.addEventListener('click', () =>
        openTotwOverrideModal(leagueId, week, el.dataset.pos, Number(el.dataset.slot), draw)));
    }
  }
  draw();
}

/* ---------- League modals ---------- */
async function openAddTeamModal(leagueId, teamsInLeague) {
  const allTeams = await api('/teams/list');
  const inLeagueIds = new Set(teamsInLeague.map(t => String(t.id)));
  const available = allTeams.filter(t => !inLeagueIds.has(String(t.id)));
  openModal(`
    <h3>Add Club to League</h3>
    <div class="tabs" style="margin-bottom:12px">
      <div class="tab active" data-mode="existing">Existing club</div>
      <div class="tab" data-mode="new">Create new</div>
    </div>
    <div id="addTeamBody"></div>
  `);
  const bodyEl = document.getElementById('addTeamBody');
  const tabs = $modalRoot.querySelectorAll('.tab');
  function drawExisting() {
    bodyEl.innerHTML = `
      <form id="existingForm">
        <div class="field"><label>Club</label>
          <select name="team_id" required>
            <option value="">Select a club…</option>
            ${available.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}
          </select>
        </div>
        ${available.length ? '' : '<p class="subtle">Every existing club is already in this league.</p>'}
        <div class="modal-actions">
          <button type="button" class="btn ghost" data-close-modal>Cancel</button>
          <button type="submit" class="btn primary" ${available.length ? '' : 'disabled'}>Add club</button>
        </div>
      </form>
    `;
    document.getElementById('existingForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await api('/teams/add-to-league', 'POST', { league_id: leagueId, team_id: new FormData(e.target).get('team_id') });
        closeModal(); toast('Club added', 'ok'); route();
      } catch (err) { toast(err.message, 'error'); }
    });
  }
  function drawNew() {
    bodyEl.innerHTML = `
      <form id="newTeamForm">
        <div class="field"><label>Club name</label><input name="name" required placeholder="e.g. Northside FC"></div>
        <div class="form-row">
          <div class="field"><label>Short name</label><input name="short_name" placeholder="e.g. NSD"></div>
          <div class="field"><label>Manager</label><input name="manager"></div>
        </div>
        <div class="form-row">
          <div class="field"><label>Home kit hex</label><input name="home_color" type="text" value="#F4F1DE" placeholder="#F4F1DE"></div>
          <div class="field"><label>Away kit hex</label><input name="away_color" type="text" value="#1A1A1A" placeholder="#1A1A1A"></div>
        </div>
        <div class="field"><label>Crest URL (optional)</label><input name="crest_url" placeholder="https://…"></div>
        <div class="field"><label>Or upload crest</label><input name="crest_file" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"></div>
        <div class="modal-actions">
          <button type="button" class="btn ghost" data-close-modal>Cancel</button>
          <button type="submit" class="btn primary">Create & add</button>
        </div>
      </form>
    `;
    document.getElementById('newTeamForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      try {
        const crest_url = f.get('crest_file').size ? await window.tswUpload(f.get('crest_file')) : (f.get('crest_url') || null);
        await api('/teams/create', 'POST', {
          name: f.get('name'), short_name: f.get('short_name') || null,
          home_color: f.get('home_color') || '#F4F1DE', away_color: f.get('away_color') || '#1A1A1A',
          crest_url, manager: f.get('manager') || null,
          league_id: leagueId
        });
        closeModal(); toast('Club created & added', 'ok'); route();
      } catch (err) { toast(err.message, 'error'); }
    });
  }
  tabs.forEach(t => t.addEventListener('click', () => {
    tabs.forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    t.dataset.mode === 'existing' ? drawExisting() : drawNew();
  }));
  drawExisting();
}

function openNewMatchModal(leagueId, teams) {
  if (teams.length < 2) { toast('Add at least two clubs first', 'error'); return; }
  openModal(`
    <h3>New Match</h3>
    <form id="matchForm">
      <div class="form-row">
        <div class="field"><label>Home</label>
          <select name="home_team_id" required>${teams.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select>
        </div>
        <div class="field"><label>Away</label>
          <select name="away_team_id" required>${teams.map((t, i) => `<option value="${t.id}" ${i === 1 ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select>
        </div>
      </div>
      <div class="form-row">
        <div class="field"><label>Matchweek</label><input name="matchweek" type="number" min="1" value="1"></div>
        <div class="field"><label>Date</label><input name="played_at" type="date"></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Home score (optional)</label><input name="home_score" type="number" min="0"></div>
        <div class="field"><label>Away score (optional)</label><input name="away_score" type="number" min="0"></div>
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
      <div class="field"><label>Forfeit</label>
        <select name="forfeit" id="forfeitSel">
          <option value="">Normal result</option>
          <option value="home">${esc(m.home_team_name)} forfeit — 3–0 to ${esc(m.away_team_name)}</option>
          <option value="away">${esc(m.away_team_name)} forfeit — 3–0 to ${esc(m.home_team_name)}</option>
        </select>
      </div>
      <div class="form-row">
        <div class="field"><label>${esc(m.home_team_name)} score</label><input name="home_score" type="number" min="0" value="${m.home_score ?? ''}" ${m.forfeit_team_id ? 'disabled' : ''}></div>
        <div class="field"><label>${esc(m.away_team_name)} score</label><input name="away_score" type="number" min="0" value="${m.away_score ?? ''}" ${m.forfeit_team_id ? 'disabled' : ''}></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Matchweek</label><input name="matchweek" type="number" min="1" value="${m.matchweek}"></div>
        <div class="field"><label>Date</label><input name="played_at" type="date" value="${m.played_at ? String(m.played_at).slice(0, 10) : ''}"></div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn ghost" data-close-modal>Cancel</button>
        <button type="submit" class="btn primary">Save Result</button>
      </div>
    </form>
  `);
  const sel = document.getElementById('forfeitSel');
  const inputs = $modalRoot.querySelectorAll('input[name="home_score"], input[name="away_score"]');
  sel.addEventListener('change', () => {
    const locked = sel.value !== '';
    inputs.forEach(i => { i.disabled = locked; if (locked) i.value = ''; });
  });
  document.getElementById('editMatchForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const forfeit = f.get('forfeit');
    try {
      const body = { id: m.id, matchweek: Number(f.get('matchweek')) || m.matchweek, played_at: f.get('played_at') || null };
      if (forfeit) {
        body.forfeit_team_id = forfeit === 'home' ? m.home_team_id : m.away_team_id;
      } else {
        body.home_score = Number(f.get('home_score'));
        body.away_score = Number(f.get('away_score'));
      }
      await api('/matches/update', 'POST', body);
      closeModal(); toast(forfeit ? 'Forfeit recorded — 3–0' : 'Result saved', 'ok'); route();
    } catch (err) { toast(err.message, 'error'); }
  });
}

async function openRateMatchModal(leagueId, m) {
  openModal('<div class="empty">Loading rosters…</div>');
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
        <div class="field" style="flex:2"><label>${esc(p.name)} <span class="badge pos">${p.position}</span></label></div>
        <div class="field" style="flex:1"><label>Rating</label><input class="r-rating" type="number" min="0" max="10" step="0.1" value="${ex ? ex.rating : ''}"></div>
        <div class="field" style="flex:.7"><label>G</label><input class="r-goals" type="number" min="0" value="${ex ? ex.goals : 0}"></div>
        <div class="field" style="flex:.7"><label>A</label><input class="r-assists" type="number" min="0" value="${ex ? ex.assists : 0}"></div>
        <div class="field" style="flex:.7"><label>Y</label><input class="r-yellow" type="number" min="0" value="${ex ? ex.yellow_cards : 0}"></div>
        <div class="field" style="flex:.7"><label>R</label><input class="r-red" type="number" min="0" value="${ex ? ex.red_cards : 0}"></div>
        <div class="field" style="flex:1.1;justify-content:flex-end"><label class="check" style="margin:0"><input class="r-clean" type="checkbox" ${ex && ex.clean_sheet ? 'checked' : ''}> Clean sheet</label></div>
      </div>
    `;
  }).join('');

  openModal(`
    <h3>Rate Players</h3>
    <p class="modal-sub">${esc(m.home_team_name)} ${m.home_score}–${m.away_score} ${esc(m.away_team_name)} · leave rating blank to skip</p>
    <div class="modal-scroll">
      <h4 style="margin:10px 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--fg-55)">${esc(m.home_team_name)}</h4>
      ${rowsFor(homePlayers, m.home_team_id)}
      <h4 style="margin:14px 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--fg-55)">${esc(m.away_team_name)}</h4>
      ${rowsFor(awayPlayers, m.away_team_id)}
    </div>
    <div class="modal-actions">
      <button type="button" class="btn ghost" data-close-modal>Cancel</button>
      <button type="button" class="btn primary" id="saveRatingsBtn">Save Ratings</button>
    </div>
  `, true);
  document.getElementById('saveRatingsBtn').addEventListener('click', async () => {
    const ratings = [];
    $modalRoot.querySelectorAll('[data-player]').forEach(row => {
      const rating = row.querySelector('.r-rating').value;
      if (rating === '') return;
      ratings.push({
        player_id: Number(row.dataset.player), team_id: Number(row.dataset.team), rating: Number(rating),
        goals: Number(row.querySelector('.r-goals').value) || 0,
        assists: Number(row.querySelector('.r-assists').value) || 0,
        yellow_cards: Number(row.querySelector('.r-yellow').value) || 0,
        red_cards: Number(row.querySelector('.r-red').value) || 0,
        clean_sheet: row.querySelector('.r-clean').checked
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
      ${eligible.length ? '' : '<p class="subtle">No players registered at this position in the league yet.</p>'}
      <div class="modal-actions">
        <button type="button" class="btn ghost" data-close-modal>Cancel</button>
        <button type="submit" class="btn primary" ${eligible.length ? '' : 'disabled'}>Set Player</button>
      </div>
    </form>
  `);
  document.getElementById('overrideForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api('/totw/override', 'POST', { league_id: leagueId, matchweek: week, position_code: posCode, slot_index: slotIdx, player_id: Number(new FormData(e.target).get('player_id')) });
      closeModal(); toast('TOTW slot updated', 'ok'); onDone();
    } catch (err) { toast(err.message, 'error'); }
  });
}

/* ---------- Clubs & players ---------- */
async function viewTeams() {
  setHeader('Clubs & Players', 'The club database',
    `<button class="btn primary admin-only" id="newTeamBtn">+ New Club</button>`);
  $content.innerHTML = '<div class="empty">Loading…</div>';
  const teams = await api('/teams/list');
  $content.innerHTML = `
    ${teams.length ? `
    <div class="grid cols-3">
      ${teams.map(t => `
        <a class="card" href="#/team/${t.id}" style="display:block">
          <div class="team-cell" style="margin-bottom:8px">${crest(t.crest_url, t.name, 28)} <span style="font-size:14.5px">${esc(t.name)}</span>${t.short_name ? ` <span class="badge faint">${esc(t.short_name)}</span>` : ''}</div>
          <div class="subtle">${t.stadium ? esc(t.stadium) + ' · ' : ''}${t.manager ? 'Manager: ' + esc(t.manager) + ' · ' : ''}${t.player_count} player${t.player_count === 1 ? '' : 's'}</div>
        </a>`).join('')}
    </div>` : '<div class="empty"><h3>No clubs yet</h3><p>Create clubs, then add players and enter them into divisions.</p><div class="empty-state-cta"><button class="btn primary admin-only" id="emptyNewTeam">+ New Club</button></div></div>'}
  `;
  const btn = document.getElementById('newTeamBtn') || document.getElementById('emptyNewTeam');
  if (btn) btn.addEventListener('click', openNewTeamModal);
}

function openNewTeamModal() {
  openModal(`
    <h3>New Club</h3>
    <form id="teamForm">
      <div class="field"><label>Club name</label><input name="name" required placeholder="e.g. Northside FC"></div>
      <div class="form-row">
        <div class="field"><label>Short name</label><input name="short_name" placeholder="e.g. NSD"></div>
        <div class="field"><label>Manager</label><input name="manager"></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Home kit hex</label><input name="home_color" type="text" value="#F4F1DE"></div>
        <div class="field"><label>Away kit hex</label><input name="away_color" type="text" value="#1A1A1A"></div>
      </div>
      <div class="field"><label>Crest URL (optional)</label><input name="crest_url" placeholder="https://…"></div>
      <div class="field"><label>Or upload crest</label><input name="crest_file" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"></div>
      <div class="field"><label>Stadium</label><input name="stadium"></div>
      <div class="modal-actions">
        <button type="button" class="btn ghost" data-close-modal>Cancel</button>
        <button type="submit" class="btn primary">Create Club</button>
      </div>
    </form>
  `);
  document.getElementById('teamForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      const crest_url = f.get('crest_file').size ? await window.tswUpload(f.get('crest_file')) : (f.get('crest_url') || null);
      const team = await api('/teams/create', 'POST', {
        name: f.get('name'), short_name: f.get('short_name') || null,
        home_color: f.get('home_color') || '#F4F1DE', away_color: f.get('away_color') || '#1A1A1A',
        crest_url, stadium: f.get('stadium') || null, manager: f.get('manager') || null
      });
      closeModal(); toast('Club created', 'ok'); location.hash = '#/team/' + team.id;
    } catch (err) { toast(err.message, 'error'); }
  });
}

async function viewTeamDetail(teamId) {
  $content.innerHTML = '<div class="empty">Loading…</div>';
  let team, players, stats;
  try {
    [team, players, stats] = await Promise.all([
      api('/teams/list').then(all => all.find(t => String(t.id) === String(teamId))),
      api('/players/list?team_id=' + teamId),
      api('/teams/stats?team_id=' + teamId).catch(() => null)
    ]);
  } catch (err) {
    $content.innerHTML = `<div class="empty"><h3>Something went wrong</h3><p>${esc(err.message)}</p></div>`;
    return;
  }
  if (!team) { $content.innerHTML = '<div class="empty"><h3>Club not found</h3></div>'; return; }

  setHeader(team.name, `<a href="#/teams">Clubs & Players</a>`,
    `<button class="btn admin-only" data-give-club-award="${team.id}">+ Give award</button>
     <button class="btn admin-only" data-edit-club="${team.id}">Edit club</button>
     <button class="btn danger admin-only" data-disband-club="${team.id}">Disband</button>
     <button class="btn primary admin-only" id="addPlayerBtn">+ Add Player</button>`);

  const byPos = {};
  POSITIONS.forEach(p => { byPos[p] = players.filter(x => x.position === p).length; });

  $content.innerHTML = `
    <div class="card" style="margin-bottom:14px">
      <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
        ${crest(team.crest_url, team.name, 46)}
        <div style="flex:1;min-width:200px">
          <div style="font-weight:900;font-size:17px">${esc(team.name)} ${team.short_name ? `<span class="badge faint">${esc(team.short_name)}</span>` : ''}</div>
          <div class="subtle" style="margin-top:2px">
            ${team.stadium ? esc(team.stadium) + ' · ' : ''}${team.manager ? 'Manager: ' + esc(team.manager) + ' · ' : ''}${players.length} player${players.length === 1 ? '' : 's'}
          </div>
          <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
            <span class="chip" title="Home kit colour">Home #${esc((team.home_color || '').replace('#', ''))}</span>
            <span class="chip" title="Away kit colour">Away #${esc((team.away_color || '').replace('#', ''))}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="section-head">
        <h3>Record</h3>
        <div class="seg" id="recSeg">
          <button data-mode="season" class="active">Season</button>
          <button data-mode="all">All-time</button>
        </div>
      </div>
      <div class="stat-strip" id="recStrip" style="grid-template-columns:repeat(7,1fr)">
        ${statCell('P', 0)}${statCell('W', 0)}${statCell('D', 0)}${statCell('L', 0)}${statCell('GF', 0)}${statCell('GA', 0)}${statCell('Pts', 0)}
      </div>
      <div class="mini-bars" style="margin-top:12px">
        <div class="mini-bar-row"><span style="width:52px">Win rate</span><span class="bar"><div id="winBar" style="width:0%"></div></span><span class="tnum" id="winPct">—</span></div>
      </div>
    </div>

    <div class="grid cols-2 section-block">
      <div class="card">
        <h3>Squad by position</h3>
        ${POSITIONS.map(p => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--fg-08)">
            <span class="badge pos">${p} · ${POS_LABEL[p]}</span>
            <span class="tnum" style="font-weight:800">${byPos[p]}</span>
          </div>`).join('')}
      </div>
      <div class="card">
        <h3>Club honors</h3>
        ${stats && stats.honors.length ? stats.honors.map(h => `
          <div class="honor">
            ${h.icon_url ? `<img class="h-icon" src="${esc(h.icon_url)}" alt="">` : `<span class="h-icon placeholder">${esc(initials(h.name))}</span>`}
            <div><b>${esc(h.name)}</b><small>${esc(h.season_name || 'All-time')} · ${esc(h.awarded_at)}</small></div>
          </div>`).join('') : '<div class="empty"><h3>No honors yet</h3><p>Assign club awards to display them here.</p></div>'}
      </div>
    </div>

    <div class="card section-block">
      <div class="section-head">
        <h3>Roster (${players.length})</h3>
        <div class="chip-list">
          ${POSITIONS.map(p => `<span class="chip" data-pos="${p}">${p}</span>`).join('')}
          <span class="chip active" data-pos="">All</span>
        </div>
      </div>
      <div id="rosterWrap"></div>
    </div>
  `;

  function statCell(lbl, val) {
    return `<div class="stat-cell" style="padding:10px 8px;text-align:center;border-right:1px solid var(--fg-15)"><div class="stat-num" style="font-size:17px">${val}</div><div class="stat-lbl">${lbl}</div></div>`;
  }
  function drawRecord(rec) {
    const cells = $content.querySelectorAll('#recStrip .stat-cell');
    const vals = [rec.played, rec.won, rec.drawn, rec.lost, rec.gf, rec.ga, rec.pts];
    cells.forEach((c, i) => { c.querySelector('.stat-num').textContent = vals[i]; });
    const winRate = rec.played ? Math.round(rec.won / rec.played * 100) : 0;
    document.getElementById('winBar').style.width = winRate + '%';
    document.getElementById('winPct').textContent = rec.played ? winRate + '%' : '—';
  }
  drawRecord(stats ? stats.season : { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0 });
  document.querySelectorAll('#recSeg button').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('#recSeg button').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    drawRecord(b.dataset.mode === 'season' ? stats.season : stats.all_time);
  }));

  function drawRoster(filter) {
    const list = filter ? players.filter(p => p.position === filter) : players;
    document.getElementById('rosterWrap').innerHTML = list.length ? renderTable(
      ['#', 'Player', 'Pos', 'Country', ''],
      list.map(p => [
        p.shirt_number ?? '—',
        `<a href="#/player/${p.id}" style="display:flex;align-items:center;gap:8px;font-weight:700">${avatar(p.avatar_url, p.name, 24)} ${esc(p.name)}</a>`,
        `<span class="badge pos">${p.position}</span>`,
        p.country ? flagOf(p.country) + ' ' + esc(p.country) : '<span class="subtle">—</span>',
        `<a class="btn sm" href="#/player/${p.id}">Profile</a>`
      ]),
      { empty: filter ? `No ${filter}s in the squad.` : 'No players yet — add the first one.' }
    ) : '<div class="empty"><h3>No players yet</h3><p>Add players to build the squad.</p></div>';
  }
  drawRoster('');
  $content.querySelectorAll('.chip[data-pos]').forEach(c => c.addEventListener('click', () => {
    $content.querySelectorAll('.chip[data-pos]').forEach(x => x.classList.remove('active'));
    c.classList.add('active');
    drawRoster(c.dataset.pos);
  }));

  document.getElementById('addPlayerBtn').addEventListener('click', () => openAddPlayerModal(teamId, team));
}

function openAddPlayerModal(teamId, team) {
  openModal(`
    <h3>Add Player — ${esc(team.name)}</h3>
    <form id="playerForm">
      <div class="field"><label>Username / gamertag</label><input name="name" required placeholder="e.g. TouchKing99"></div>
      <div class="field"><label>Country</label><input name="country" placeholder="e.g. England"></div>
      <div class="form-row">
        <div class="field"><label>Position</label>
          <select name="position" required>${POSITIONS.map(p => `<option value="${p}">${p} — ${POS_LABEL[p]}</option>`).join('')}</select>
        </div>
        <div class="field"><label>Shirt #</label><input name="shirt_number" type="number" min="1" max="99"></div>
      </div>
      <div class="field"><label>Profile picture URL (optional)</label><input name="avatar_url" placeholder="https://…"></div>
      <div class="field"><label>Or upload picture</label><input name="avatar_file" type="file" accept="image/png,image/jpeg,image/webp"></div>
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
      const avatar_url = f.get('avatar_file').size ? await window.tswUpload(f.get('avatar_file')) : (f.get('avatar_url') || null);
      await api('/players/create', 'POST', {
        team_id: teamId, name: f.get('name'), position: f.get('position'),
        shirt_number: f.get('shirt_number') ? Number(f.get('shirt_number')) : null,
        country: f.get('country') || null, avatar_url
      });
      closeModal(); toast('Player added', 'ok'); route();
    } catch (err) { toast(err.message, 'error'); }
  });
}

/* ---------- Shared table helper ---------- */
function renderTable(headers, rows, opts) {
  opts = opts || {};
  if (!rows.length) return `<div class="empty"><h3>${opts.emptyTitle || 'Nothing here yet'}</h3>${opts.empty ? `<p>${opts.empty}</p>` : ''}</div>`;
  return `<div class="table-wrap"><table><thead><tr>${headers.map(h => `<th class="${h === 'G' || h === 'A' || h === 'Apps' || h === 'Avg' || h === 'Last 5' || h === 'P' || h === 'GA' || h === 'Goals' ? 'num' : ''}">${h}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

/* ---------- Boot ---------- */
route();

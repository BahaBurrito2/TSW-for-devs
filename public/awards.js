/* ============================================================
   TSW — Awards
   Custom awards created by the admin, assigned to players or
   clubs, and shown on every profile. Public read-only.
   ============================================================ */
(function () {
  const API = window.__HATCHABLE__.api;
  const C = document.getElementById('content');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const initials = (n) => String(n || '?').split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

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

  const avatar = (url, name, size) => url
    ? `<img class="avatar" style="width:${size || 22}px;height:${size || 22}px" src="${esc(url)}" alt="" loading="lazy">`
    : `<span class="avatar placeholder" style="width:${size || 22}px;height:${size || 22}px;font-size:${Math.max(8, Math.round((size || 22) * 0.4))}px">${esc(initials(name))}</span>`;
  const crest = (url, name, size) => url
    ? `<img class="crest" style="width:${size || 20}px;height:${size || 20}px" src="${esc(url)}" alt="" loading="lazy">`
    : `<span class="crest placeholder" style="width:${size || 20}px;height:${size || 20}px">${esc(initials(name))}</span>`;

  window.renderAwards = async () => {
    window.setHeader('Awards', 'Honors & recognition',
      `<button class="btn primary admin-only" id="newAwardBtn">+ Create award</button>`);
    C.innerHTML = '<div class="empty">Loading…</div>';
    let list = [];
    try { list = await api('/awards/list'); } catch (x) {
      C.innerHTML = `<div class="empty"><h3>Could not load awards</h3><p>${esc(x.message)}</p></div>`;
      return;
    }
    list = Array.isArray(list) ? list : [];

    C.innerHTML = list.length ? `
      <div class="grid cols-3">
        ${list.map(a => `
          <div class="card">
            <div style="display:flex;align-items:center;gap:11px;margin-bottom:10px">
              ${a.icon_url
                ? `<img class="h-icon" src="${esc(a.icon_url)}" alt="" style="width:38px;height:38px">`
                : `<span class="h-icon placeholder" style="width:38px;height:38px">${esc(initials(a.name))}</span>`}
              <div style="flex:1;min-width:0">
                <div style="font-weight:800;font-size:14.5px">${esc(a.name)}</div>
                <div class="subtle">${esc(a.award_type === 'player' ? 'Player award' : 'Club award')} · ${esc(a.scope === 'season' ? 'Per season' : 'All-time')}</div>
              </div>
            </div>
            ${a.description ? `<p class="subtle" style="margin:0 0 10px">${esc(a.description)}</p>` : ''}
            <div style="border-top:1px solid var(--fg-08);padding-top:8px">
              ${a.winners.length ? a.winners.map(w => `
                <div class="honor" style="padding:5px 0">
                  ${w.player_id
                    ? `<a href="#/player/${w.player_id}" style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">${avatar(w.avatar_url, w.player_name)} <span style="font-weight:700;font-size:12.5px">${esc(w.player_name)}</span></a>`
                    : `<a href="#/team/${w.team_id}" style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">${crest(w.crest_url, w.team_name)} <span style="font-weight:700;font-size:12.5px">${esc(w.team_name)}</span></a>`}
                  <small class="subtle">${esc(w.season_name || 'All-time')} · ${esc(w.awarded_at)}</small>
                </div>`).join('')
                : '<div class="subtle" style="padding:4px 0 6px">No winners yet.</div>'}
            </div>
            <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
              <button class="btn sm admin-only assign-award" data-id="${a.id}" data-name="${esc(a.name)}" data-type="${a.award_type}">Assign</button>
            </div>
          </div>`).join('')}
      </div>` : `
      <div class="empty">
        <h3>No awards yet</h3>
        <p>Create custom awards — e.g. Player of the Season, Golden Glove, Club of the Year — and assign them to players and clubs.</p>
      </div>`;

    const btn = document.getElementById('newAwardBtn');
    if (btn) btn.onclick = createAwardModal;
    C.querySelectorAll('.assign-award').forEach(b => b.onclick = () => assignModal(b.dataset.id, b.dataset.name, b.dataset.type));
  };

  function createAwardModal() {
    window.openModal(`
      <h3>Create custom award</h3>
      <form id="awardForm">
        <div class="field"><label>Name</label><input name="name" required placeholder="e.g. Player of the Season"></div>
        <div class="field"><label>Description</label><textarea name="description" rows="2" placeholder="Optional — what this award recognises"></textarea></div>
        <div class="form-row">
          <div class="field"><label>Type</label>
            <select name="award_type"><option value="player">Player award</option><option value="club">Club award</option></select>
          </div>
          <div class="field"><label>Scope</label>
            <select name="scope"><option value="season">Per season</option><option value="all_time">All-time</option></select>
          </div>
        </div>
        <div class="field"><label>Award image URL (optional)</label><input name="icon_url" placeholder="https://…"></div>
        <div class="field"><label>Or upload badge</label><input name="file" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"></div>
        <div class="modal-actions">
          <button type="button" class="btn ghost" data-close-modal>Cancel</button>
          <button class="btn primary">Create award</button>
        </div>
      </form>
    `);
    document.getElementById('awardForm').onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      try {
        const icon_url = f.get('file').size ? await window.tswUpload(f.get('file')) : (f.get('icon_url') || null);
        await api('/pts/content', 'POST', {
          action: 'award_save', name: f.get('name'), description: f.get('description') || null,
          award_type: f.get('award_type'), scope: f.get('scope'), icon_url
        });
        window.closeModal(); window.toast('Award created', 'ok'); window.renderAwards();
      } catch (x) { window.toast(x.message, 'error'); }
    };
  }

  async function assignModal(awardId, awardName, awardType) {
    const [players, teams, overview] = await Promise.all([
      api('/players/list').catch(() => []),
      api('/teams/list').catch(() => []),
      api('/pts/overview').catch(() => ({ seasons: [] }))
    ]);
    const seasons = overview.seasons || [];
    window.openModal(`
      <h3>Assign — ${esc(awardName)}</h3>
      <form id="assignForm">
        <div class="field"><label>${awardType === 'player' ? 'Player' : 'Club'}</label>
          <select name="winner" required>
            <option value="">Choose…</option>
            ${awardType === 'player'
              ? players.map(p => `<option value="p${p.id}">${esc(p.name)}${p.team_name ? ' (' + esc(p.team_name) + ')' : ''}</option>`).join('')
              : teams.map(t => `<option value="c${t.id}">${esc(t.name)}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Season</label>
          <select name="season_id"><option value="">All-time / no season</option>${seasons.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select>
        </div>
        <div class="field"><label>Note (optional)</label><input name="note" placeholder="e.g. Voted by captains"></div>
        <div class="modal-actions">
          <button type="button" class="btn ghost" data-close-modal>Cancel</button>
          <button class="btn primary">Assign award</button>
        </div>
      </form>
    `);
    document.getElementById('assignForm').onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const w = f.get('winner');
      if (!w) return;
      const body = { action: 'award_assign', award_id: +awardId };
      if (w[0] === 'p') body.player_id = +w.slice(1);
      else body.team_id = +w.slice(1);
      if (f.get('season_id')) body.season_id = +f.get('season_id');
      if (f.get('note')) body.note = f.get('note');
      try {
        await api('/pts/content', 'POST', body);
        window.closeModal(); window.toast('Award assigned', 'ok'); window.renderAwards();
      } catch (x) { window.toast(x.message, 'error'); }
    };
  }

  /* ---------- Quick award assignment from profiles ---------- */
  async function giveAwardModal(kind, entityId, entityName) {
    const [awards, overview] = await Promise.all([
      api('/pts/content?action=awards_list').catch(() => []),
      api('/pts/overview').catch(() => ({ seasons: [] }))
    ]);
    const pool = (Array.isArray(awards) ? awards : []).filter(a => a.award_type === (kind === 'player' ? 'player' : 'club'));
    const seasons = overview.seasons || [];
    if (!pool.length) {
      window.toast('Create a ' + kind + ' award first from the Awards page.', 'error');
      return;
    }
    window.openModal(`
      <h3>Give ${kind} award — ${esc(entityName)}</h3>
      <form id="giveAwardForm">
        <div class="field"><label>Award</label>
          <select name="award_id" required>${pool.map(a => `<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select>
        </div>
        <div class="field"><label>Season</label>
          <select name="season_id"><option value="">All-time / no season</option>${seasons.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select>
        </div>
        <div class="field"><label>Note (optional)</label><input name="note" placeholder="e.g. Voted by captains"></div>
        <div class="modal-actions">
          <button type="button" class="btn ghost" data-close-modal>Cancel</button>
          <button class="btn primary">Assign award</button>
        </div>
      </form>
    `);
    document.getElementById('giveAwardForm').onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const body = { action: 'award_assign', award_id: +f.get('award_id') };
      if (kind === 'player') body.player_id = +entityId;
      else body.team_id = +entityId;
      if (f.get('season_id')) body.season_id = +f.get('season_id');
      if (f.get('note')) body.note = f.get('note');
      try {
        await api('/pts/content', 'POST', body);
        window.closeModal(); window.toast('Award assigned', 'ok');
        window.route ? window.route() : location.reload();
      } catch (x) { window.toast(x.message, 'error'); }
    };
  }

  document.addEventListener('click', (e) => {
    const pa = e.target.closest('[data-give-award]');
    const ca = e.target.closest('[data-give-club-award]');
    if (pa) giveAwardModal('player', pa.dataset.giveAward, 'this player');
    else if (ca) giveAwardModal('club', ca.dataset.giveClubAward, 'this club');
  });

  if (location.hash.startsWith('#/awards')) window.renderAwards();
})();

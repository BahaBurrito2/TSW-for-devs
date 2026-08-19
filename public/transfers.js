/* ============================================================
   TSW — Transfer Market
   Table of player movements: Player | From | Destination |
   Type | Status. Public read-only; admins create, complete
   and cancel transfers.
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
    ? `<img class="crest" style="width:${size || 18}px;height:${size || 18}px" src="${esc(url)}" alt="" loading="lazy">`
    : `<span class="crest placeholder" style="width:${size || 18}px;height:${size || 18}px;font-size:8px">${esc(initials(name))}</span>`;

  const TYPE_LABEL = { transfer: 'Transfer', free_agent: 'Free agent', loan: 'Loan', registration: 'Registration' };
  const fmtDate = (ts) => ts ? String(ts).slice(0, 10) : '';

  window.renderTransferMarket = async () => {
    window.setHeader('Transfer Market', 'Player movements & deals',
      `<button class="btn primary admin-only" id="newTransferBtn">+ Create transfer</button>`);
    C.innerHTML = '<div class="empty">Loading…</div>';
    let rows = [];
    let status = '';
    try { rows = await api('/transfers/list'); } catch (x) {
      C.innerHTML = `<div class="empty"><h3>Could not load transfers</h3><p>${esc(x.message)}</p></div>`;
      return;
    }
    rows = Array.isArray(rows) ? rows : [];

    function draw() {
      const filtered = status ? rows.filter(r => r.status === status) : rows;
      C.innerHTML = `
        <div class="toolbar">
          <div class="chip-list" id="statusChips">
            <div class="chip ${status === '' ? 'active' : ''}" data-status="">All</div>
            <div class="chip ${status === 'pending' ? 'active' : ''}" data-status="pending">Pending</div>
            <div class="chip ${status === 'completed' ? 'active' : ''}" data-status="completed">Completed</div>
            <div class="chip ${status === 'cancelled' ? 'active' : ''}" data-status="cancelled">Cancelled</div>
          </div>
        </div>
        <div class="card" style="padding:0">
          ${filtered.length ? `
          <div class="table-wrap"><table>
            <thead><tr><th>Player</th><th>From</th><th>Destination</th><th>Type</th><th>Status</th><th class="num">Listed</th><th></th></tr></thead>
            <tbody>
              ${filtered.map(x => `
                <tr>
                  <td>
                    <a href="#/player/${x.player_id}" style="display:flex;align-items:center;gap:8px;font-weight:700">
                      ${avatar(x.avatar_url, x.player_name, 24)} ${esc(x.player_name)}
                    </a>
                    <span class="subtle">${esc(x.position || '')}</span>
                  </td>
                  <td style="white-space:nowrap">${x.from_crest_url ? crest(x.from_crest_url, x.from_name) : ''} ${esc(x.from_name || 'Free agent')}</td>
                  <td style="white-space:nowrap">${x.to_crest_url ? crest(x.to_crest_url, x.to_name) : ''} ${esc(x.to_name || 'Free agent')}</td>
                  <td>${esc(TYPE_LABEL[x.transfer_type] || x.transfer_type)}</td>
                  <td><span class="badge ${x.status === 'completed' ? 'solid' : x.status === 'cancelled' ? 'faint' : ''}">${esc(x.status)}</span></td>
                  <td class="num subtle">${fmtDate(x.listed_at || x.created_at)}</td>
                  <td style="white-space:nowrap">
                    ${x.status === 'pending' ? `
                      <button class="btn sm admin-only complete-t" data-id="${x.id}">Complete</button>
                      <button class="btn sm danger admin-only cancel-t" data-id="${x.id}">Cancel</button>` : ''}
                  </td>
                </tr>`).join('')}
            </tbody></table></div>`
          : '<div class="empty"><h3>No transfers yet</h3><p>Completed deals and pending moves appear here, newest first.</p></div>'}
        </div>`;
      C.querySelectorAll('#statusChips .chip').forEach(ch => ch.onclick = () => { status = ch.dataset.status; draw(); });
      C.querySelectorAll('.complete-t').forEach(b => b.onclick = async () => {
        try {
          const r = await api('/transfers/manage', 'POST', { action: 'complete', transfer_id: +b.dataset.id });
          window.toast(r.message, 'ok'); draw();
        } catch (e) { window.toast(e.message, 'error'); }
      });
      C.querySelectorAll('.cancel-t').forEach(b => b.onclick = async () => {
        try {
          const r = await api('/transfers/manage', 'POST', { action: 'cancel', transfer_id: +b.dataset.id });
          window.toast(r.message || 'Transfer cancelled', 'ok'); draw();
        } catch (e) { window.toast(e.message, 'error'); }
      });
    }
    draw();

    const btn = document.getElementById('newTransferBtn');
    if (btn) btn.onclick = async () => {
      const [players, teams] = await Promise.all([api('/players/list'), api('/teams/list')]);
      window.openModal(`
        <h3>Create transfer</h3>
        <p class="modal-sub">Completing a transfer moves the player and adds to their permanent history.</p>
        <form id="transferForm">
          <div class="field"><label>Player</label>
            <select name="player_id" required>
              <option value="">Choose…</option>
              ${players.map(p => `<option value="${p.id}">${esc(p.name)}${p.team_name ? ' (' + esc(p.team_name) + ')' : ''}</option>`).join('')}
            </select>
          </div>
          <div class="field"><label>Destination club</label>
            <select name="to_team_id"><option value="">Free agent — release</option>${teams.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select>
          </div>
          <div class="form-row">
            <div class="field"><label>Type</label>
              <select name="transfer_type"><option value="transfer">Transfer</option><option value="free_agent">Free agent</option><option value="loan">Loan</option><option value="registration">Registration</option></select>
            </div>
            <div class="field"><label>Status</label>
              <select name="status"><option value="pending">Pending</option><option value="completed">Completed</option></select>
            </div>
          </div>
          <div class="field"><label>Note (optional)</label><input name="note" placeholder="e.g. Summer window"></div>
          <div class="modal-actions">
            <button type="button" class="btn ghost" data-close-modal>Cancel</button>
            <button class="btn primary">Save transfer</button>
          </div>
        </form>
      `);
      document.getElementById('transferForm').onsubmit = async (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        try {
          const r = await api('/transfers/manage', 'POST', {
            action: 'create',
            player_id: +f.get('player_id'),
            to_team_id: f.get('to_team_id') ? +f.get('to_team_id') : null,
            transfer_type: f.get('transfer_type'), status: f.get('status'),
            note: f.get('note') || null
          });
          window.closeModal();
          window.toast(r.message || 'Transfer created', 'ok');
          window.renderTransferMarket();
        } catch (x) { window.toast(x.message, 'error'); }
      };
    };
  };

  if (location.hash.startsWith('#/transfers')) window.renderTransferMarket();
})();

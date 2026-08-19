/* ============================================================
   TSW — Club & player lifecycle
   Disband, transfer/release, pictures and edits. Uploads are
   centre-cropped to a square and stored by durable key (the
   backend resolves keys to fresh URLs at read time).
   ============================================================ */
(function () {
  const API = window.__HATCHABLE__.api;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

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

  async function square(file) {
    if (!file || file.type === 'image/svg+xml') return file;
    const image = await new Promise((ok, bad) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => bad(new Error('Could not read that image.'));
      i.src = URL.createObjectURL(file);
    });
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    canvas.getContext('2d').drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, 512, 512);
    return await new Promise((ok) => canvas.toBlob((b) => ok(new File([b], 'square.jpg', { type: 'image/jpeg' })), 'image/jpeg', 0.9));
  }

  // Upload returns the durable storage key, which every backend read
  // path resolves to a fresh signed URL. (The presigned `url` field is
  // only an instant preview and expires.)
  // Avatars and crests are centre-cropped square by default; pass
  // { square: false } to keep the original aspect ratio (news images,
  // site logo).
  window.tswUpload = async function (file, opts) {
    const f = new FormData();
    f.append('image', opts && opts.square === false ? file : await square(file));
    const r = await fetch(API + '/media/upload', { method: 'POST', body: f });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw Error(d.error || 'Upload failed');
    return d.key;
  };

  document.addEventListener('click', async (e) => {
    const dis = e.target.closest('[data-disband-club]');
    const move = e.target.closest('[data-player-move]');
    const photo = e.target.closest('[data-player-photo]');
    const editClub = e.target.closest('[data-edit-club]');
    const editPlayer = e.target.closest('[data-edit-player]');

    /* ---- Disband club ---- */
    if (dis) {
      const id = +dis.dataset.disbandClub;
      window.confirmModal('Disband this club?', 'This cannot be undone. Past results and all-time records remain; current entries and pending fixtures are removed, and players become free agents.', 'DISBAND', async (word) => {
        const r = await api('/teams/disband', 'POST', { team_id: id, confirmation: word });
        window.closeModal(); window.toast(r.message, 'ok');
        location.hash = '#/teams';
      }, true);
      return;
    }

    /* ---- Transfer / release player ---- */
    if (move) {
      const id = +move.dataset.playerMove;
      const [detail, teams] = await Promise.all([api('/players/detail?player_id=' + id), api('/teams/list')]);
      const p = detail.player;
      window.openModal(`
        <h3>Transfer or release ${esc(p.name)}</h3>
        <p class="modal-sub">All historical statistics stay attached to the player. The move is added to their permanent history.</p>
        <form id="moveForm">
          <div class="field"><label>New club</label>
            <select name="to_team_id">
              <option value="">Free agent — no club</option>
              ${teams.map(t => `<option value="${t.id}" ${String(t.id) === String(p.team_id) ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}
            </select>
          </div>
          <div class="field"><label>Type MOVE to confirm</label><input name="confirmation" required autocomplete="off"></div>
          <div class="field"><label>Note (optional)</label><input name="note" placeholder="e.g. transfer window"></div>
          <div class="modal-actions">
            <button type="button" class="btn ghost" data-close-modal>Cancel</button>
            <button class="btn primary">Save movement</button>
          </div>
        </form>
      `);
      document.getElementById('moveForm').onsubmit = async (ev) => {
        ev.preventDefault();
        const f = new FormData(ev.target);
        try {
          const r = await api('/players/move', 'POST', {
            player_id: id,
            to_team_id: f.get('to_team_id') ? +f.get('to_team_id') : null,
            note: f.get('note'), confirmation: f.get('confirmation')
          });
          window.closeModal(); window.toast(r.message, 'ok');
          window.route ? window.route() : location.reload();
        } catch (x) { window.toast(x.message, 'error'); }
      };
      return;
    }

    /* ---- Update player picture ---- */
    if (photo) {
      const id = +photo.dataset.playerPhoto;
      const d = await api('/players/detail?player_id=' + id);
      const p = d.player;
      window.openModal(`
        <h3>Player picture — ${esc(p.name)}</h3>
        <div class="field"><label>Image URL</label><input name="url" placeholder="https://…"></div>
        <div class="field"><label>Or upload from device</label><input name="file" type="file" accept="image/png,image/jpeg,image/webp"></div>
        <p class="subtle">Uploads are centre-cropped and resized to a square headshot.</p>
        <div class="modal-actions">
          <button type="button" class="btn ghost" data-close-modal>Cancel</button>
          <button class="btn primary">Save picture</button>
        </div>
      `);
      document.querySelector('.modal form').onsubmit = async (ev) => {
        ev.preventDefault();
        const f = new FormData(ev.target);
        try {
          let avatar_url = p.avatar_url_raw || p.avatar_url || null;
          if (f.get('file').size) avatar_url = await window.tswUpload(f.get('file'));
          else if (f.get('url')) avatar_url = f.get('url');
          if (!avatar_url) throw Error('Add an image URL or choose a file.');
          await api('/players/update', 'POST', { id: p.id, name: p.name, position: p.position, shirt_number: p.shirt_number, country: p.country, avatar_url });
          window.closeModal(); window.toast('Picture saved', 'ok');
          window.route ? window.route() : location.reload();
        } catch (x) { window.toast(x.message, 'error'); }
      };
      return;
    }

    /* ---- Edit club ---- */
    if (editClub) {
      const id = +editClub.dataset.editClub;
      const teams = await api('/teams/list');
      const t = teams.find(x => String(x.id) === String(id));
      if (!t) return;
      window.openModal(`
        <h3>Edit club</h3>
        <form id="clubForm">
          <div class="field"><label>Club name</label><input name="name" required value="${esc(t.name)}"></div>
          <div class="form-row">
            <div class="field"><label>Short name</label><input name="short_name" value="${esc(t.short_name || '')}" placeholder="e.g. NSD"></div>
            <div class="field"><label>Manager</label><input name="manager" value="${esc(t.manager || '')}"></div>
          </div>
          <div class="form-row">
            <div class="field"><label>Home kit hex</label><input name="home_color" type="text" value="${esc(t.home_color || '#F4F1DE')}"></div>
            <div class="field"><label>Away kit hex</label><input name="away_color" type="text" value="${esc(t.away_color || '#1A1A1A')}"></div>
          </div>
          <div class="field"><label>Logo URL</label><input name="url" value="${esc(t.crest_url_raw || '')}" placeholder="https://…"></div>
          <div class="field"><label>Or upload logo</label><input name="file" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"></div>
          <div class="modal-actions">
            <button type="button" class="btn ghost" data-close-modal>Cancel</button>
            <button class="btn primary">Save club</button>
          </div>
        </form>
      `);
      document.getElementById('clubForm').onsubmit = async (ev) => {
        ev.preventDefault();
        const f = new FormData(ev.target);
        try {
          let crest_url = t.crest_url_raw || t.crest_url || null;
          if (f.get('file').size) crest_url = await window.tswUpload(f.get('file'));
          else if (f.get('url')) crest_url = f.get('url');
          await api('/teams/update', 'POST', {
            id: t.id, name: f.get('name'), short_name: f.get('short_name') || null,
            home_color: f.get('home_color') || '#F4F1DE', away_color: f.get('away_color') || '#1A1A1A',
            manager: f.get('manager') || null, crest_url
          });
          window.closeModal(); window.toast('Club updated', 'ok');
          window.route ? window.route() : location.reload();
        } catch (x) { window.toast(x.message, 'error'); }
      };
      return;
    }

    /* ---- Edit player ---- */
    if (editPlayer) {
      const id = +editPlayer.dataset.editPlayer;
      const d = await api('/players/detail?player_id=' + id);
      const p = d.player;
      const POSITIONS = ['GK', 'RB', 'CB', 'LB', 'CM', 'ST'];
      window.openModal(`
        <h3>Edit player</h3>
        <form id="playerForm">
          <div class="field"><label>Username / gamertag</label><input name="name" required value="${esc(p.name)}"></div>
          <div class="form-row">
            <div class="field"><label>Position</label>
              <select name="position">${POSITIONS.map(pos => `<option value="${pos}" ${pos === p.position ? 'selected' : ''}>${pos}</option>`).join('')}</select>
            </div>
            <div class="field"><label>Shirt #</label><input name="shirt_number" type="number" min="1" max="99" value="${p.shirt_number ?? ''}"></div>
          </div>
          <div class="field"><label>Country</label><input name="country" value="${esc(p.country || '')}" placeholder="e.g. England"></div>
          <div class="field"><label>Profile picture URL</label><input name="url" value="${esc(p.avatar_url_raw || '')}" placeholder="https://…"></div>
          <div class="field"><label>Or upload picture</label><input name="file" type="file" accept="image/png,image/jpeg,image/webp"></div>
          <div class="modal-actions">
            <button type="button" class="btn ghost" data-close-modal>Cancel</button>
            <button class="btn primary">Save player</button>
          </div>
        </form>
      `);
      document.getElementById('playerForm').onsubmit = async (ev) => {
        ev.preventDefault();
        const f = new FormData(ev.target);
        try {
          let avatar_url = p.avatar_url_raw || p.avatar_url || null;
          if (f.get('file').size) avatar_url = await window.tswUpload(f.get('file'));
          else if (f.get('url')) avatar_url = f.get('url');
          await api('/players/update', 'POST', {
            id: p.id, name: f.get('name'), position: f.get('position'),
            shirt_number: f.get('shirt_number') ? Number(f.get('shirt_number')) : null,
            country: f.get('country') || null, avatar_url
          });
          window.closeModal(); window.toast('Player updated', 'ok');
          window.route ? window.route() : location.reload();
        } catch (x) { window.toast(x.message, 'error'); }
      };
    }
  });
})();

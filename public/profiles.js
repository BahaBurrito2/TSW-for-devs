/* ============================================================
   TSW — Player Profile
   FotMob-inspired layout: hero header, stat strip with
   season/all-time toggle, pitch position marker, honours,
   transfer history and match history.
   ============================================================ */
(function () {
  const API = window.__HATCHABLE__.api;
  const C = document.getElementById('content');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const initials = (n) => String(n || '?').split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

  async function get(p) {
    const r = await fetch(API + p);
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw Error(d.error || 'Request failed');
    return d;
  }

  const FLAGS = {
    england:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', scotland:'🏴󠁧󠁢󠁳󠁣󠁴󠁿', wales:'🏴󠁧󠁢󠁷󠁬󠁳󠁿', ireland:'🇮🇪', uk:'🇬🇧', usa:'🇺🇸',
    france:'🇫🇷', germany:'🇩🇪', spain:'🇪🇸', italy:'🇮🇹', portugal:'🇵🇹', netherlands:'🇳🇱', belgium:'🇧🇪',
    brazil:'🇧🇷', argentina:'🇦🇷', colombia:'🇨🇴', uruguay:'🇺🇾', mexico:'🇲🇽', chile:'🇨🇱', peru:'🇵🇪',
    nigeria:'🇳🇬', ghana:'🇬🇭', senegal:'🇸🇳', morocco:'🇲🇦', algeria:'🇩🇿', egypt:'🇪🇬', 'south africa':'🇿🇦',
    japan:'🇯🇵', 'south korea':'🇰🇷', china:'🇨🇳', india:'🇮🇳', australia:'🇦🇺', 'new zealand':'🇳🇿',
    sweden:'🇸🇪', norway:'🇳🇴', denmark:'🇩🇰', finland:'🇫🇮', poland:'🇵🇱', ukraine:'🇺🇦', turkey:'🇹🇷',
    greece:'🇬🇷', croatia:'🇭🇷', serbia:'🇷🇸', switzerland:'🇨🇭', austria:'🇦🇹', 'czech republic':'🇨🇿',
    canada:'🇨🇦', jamaica:'🇯🇲', 'costa rica':'🇨🇷', ecuador:'🇪🇨', 'saudi arabia':'🇸🇦', qatar:'🇶🇦', uae:'🇦🇪',
    iran:'🇮🇷', russia:'🇷🇺', romania:'🇷🇴', hungary:'🇭🇺', iceland:'🇮🇸', bosnia:'🇧🇦', albania:'🇦🇱',
    cameroon:'🇨🇲', 'ivory coast':'🇨🇮', mali:'🇲🇱', tunisia:'🇹🇳', kenya:'🇰🇪', tanzania:'🇹🇿', uganda:'🇺🇬',
    zambia:'🇿🇲', zimbabwe:'🇿🇼'
  };
  function flagOf(country) {
    if (!country) return '';
    const c = String(country).toLowerCase();
    if (FLAGS[c]) return FLAGS[c];
    const exact = Object.keys(FLAGS).find(k => c.startsWith(k) || k.startsWith(c));
    return exact ? FLAGS[exact] : '';
  }

  const POS_PITCH = {
    GK: [50, 92], RB: [80, 70], CB: [50, 78], LB: [20, 70], CM: [50, 46], ST: [50, 16]
  };

  function pitchMarker(pos) {
    const p = POS_PITCH[pos] || POS_PITCH.CM;
    return `
      <svg class="pos-pitch" viewBox="0 0 100 138" aria-hidden="true">
        <rect x="3" y="3" width="94" height="132" fill="none" stroke="rgba(244,241,222,.25)" stroke-width="1.2"/>
        <line x1="50" y1="3" x2="50" y2="135" stroke="rgba(244,241,222,.18)" stroke-width="1"/>
        <circle cx="50" cy="69" r="17" fill="none" stroke="rgba(244,241,222,.18)" stroke-width="1"/>
        <rect x="36" y="3" width="28" height="16" fill="none" stroke="rgba(244,241,222,.25)" stroke-width="1"/>
        <rect x="36" y="119" width="28" height="16" fill="none" stroke="rgba(244,241,222,.25)" stroke-width="1"/>
        <circle cx="${p[0]}" cy="${p[1]}" r="6" fill="rgba(244,241,222,.12)" stroke="#F4F1DE" stroke-width="1.6"/>
        <circle cx="${p[0]}" cy="${p[1]}" r="2.2" fill="#F4F1DE"/>
      </svg>`;
  }

  window.renderFullPlayerProfile = async (id) => {
    window.setHeader('Player', '', '');
    C.innerHTML = '<div class="empty">Loading player profile…</div>';
    let d;
    try {
      d = await Promise.all([get('/players/full?player_id=' + id), get('/players/detail?player_id=' + id)]);
    } catch (e) {
      C.innerHTML = `<div class="empty"><h3>Player not found</h3><p>${esc(e.message)}</p></div>`;
      return;
    }
    const full = d[0], det = d[1];
    const p = full.player;
    const cur = full.current_season;
    const all = full.all_time;
    const history = (det.history || []).slice().reverse();

    window.setHeader(p.name,
      `${p.team_id ? `<a href="#/team/${p.team_id}">${esc(p.team_name)}</a>` : 'Free agent'} · <span class="badge pos">${esc(p.position)}</span>`,
      `<button class="btn admin-only" data-give-award="${p.id}">+ Give award</button>
       <button class="btn admin-only" data-edit-player="${p.id}">Edit player</button>
       <button class="btn admin-only" data-player-photo="${p.id}">Update picture</button>
       <button class="btn primary admin-only" data-player-move="${p.id}">Transfer / Release</button>`);

    const honors = full.awards && full.awards.length ? full.awards.map(a => `
      <div class="honor">
        ${a.icon_url
          ? `<img class="h-icon" src="${esc(a.icon_url)}" alt="">`
          : `<span class="h-icon placeholder">${esc(initials(a.name))}</span>`}
        <div><b>${esc(a.name)}</b><small>${esc(a.season_name || 'All-time')} · ${esc(a.awarded_at)}</small></div>
      </div>`).join('') : '<div class="empty"><h3>No honours yet</h3><p>Won awards appear here.</p></div>';

    const moves = full.transfer_history && full.transfer_history.length ? full.transfer_history.map(m => `
      <div class="movement">
        <div class="mv-club">${m.from_crest_url ? `<img class="crest" src="${esc(m.from_crest_url)}" alt="">` : ''}<b>${esc(m.from_team_name || 'Free agent')}</b></div>
        <span class="mv-arrow">→</span>
        <div class="mv-club" style="flex:1">${m.to_crest_url ? `<img class="crest" src="${esc(m.to_crest_url)}" alt="">` : ''}<b>${esc(m.to_team_name || 'Free agent')}</b></div>
        <small class="subtle">${esc(m.movement_type === 'free_agent' ? 'Release' : m.movement_type)} · ${esc(m.moved_at ? String(m.moved_at).slice(0, 10) : '')}</small>
      </div>`).join('') : '<div class="empty"><h3>No club moves yet</h3><p>Transfers and releases are recorded here.</p></div>';

    C.innerHTML = `
      <div class="profile-hero">
        ${p.avatar_url
          ? `<img class="p-avatar" src="${esc(p.avatar_url)}" alt="">`
          : `<span class="p-avatar placeholder">${esc(initials(p.name))}</span>`}
        <div style="flex:1;min-width:0">
          <h2>${esc(p.name)}</h2>
          <div class="p-meta">
            ${p.team_id
              ? `<a class="club-chip" href="#/team/${p.team_id}">${p.crest_url ? `<img class="crest" style="width:18px;height:18px" src="${esc(p.crest_url)}" alt="">` : ''}<b>${esc(p.team_name)}</b></a>`
              : '<b>Free agent</b>'}
            <span>·</span>
            <span>${esc(p.position)} — ${esc(POS_LABEL[p.position] || '')}</span>
            <span>·</span>
            <span class="tnum">#${p.shirt_number ?? '—'}</span>
            ${p.country ? `<span>·</span><span><span class="flag">${flagOf(p.country)}</span> ${esc(p.country)}</span>` : ''}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="section-head">
          <h3>Season stats</h3>
          <div class="seg" id="statSeg">
            <button data-mode="season" class="active">Current season</button>
            <button data-mode="all">All-time</button>
          </div>
        </div>
        <div class="stat-strip" id="statStrip">
          ${statCell('Apps', 0)}${statCell('Goals', 0)}${statCell('Assists', 0)}${statCell('Avg Rating', '—')}${statCell('Clean sheets', 0)}
        </div>
        <div class="subtle" style="margin-top:10px" id="statSub"></div>
      </div>

      <div class="grid cols-2 section-block">
        <div class="card">
          <h3>Position — ${esc(p.position)}</h3>
          ${pitchMarker(p.position)}
        </div>
        <div class="card">
          <h3>Match history <span class="subtle">(TOTW appearances: ${full.totw_appearances || 0})</span></h3>
          ${history.length ? `<div class="table-wrap" style="max-height:330px;overflow-y:auto"><table>
            <thead><tr><th>MW</th><th>Competition</th><th class="num">Rating</th><th class="num">G</th><th class="num">A</th><th>Cards</th></tr></thead>
            <tbody>${history.map(h => `
              <tr>
                <td class="num">${h.matchweek}</td>
                <td>${esc(h.league_name)}</td>
                <td class="num"><strong>${Number(h.rating).toFixed(1)}</strong></td>
                <td class="num">${h.goals}</td>
                <td class="num">${h.assists}</td>
                <td>${cardsText(h)}</td>
              </tr>`).join('')}</tbody></table></div>`
            : '<div class="empty"><h3>No rated matches yet</h3><p>Appearances rated after matches show up here.</p></div>'}
        </div>
      </div>

      <div class="grid cols-2 section-block">
        <div class="card"><h3>Honours / Awards</h3>${honors}</div>
        <div class="card"><h3>Transfer history</h3>${moves}</div>
      </div>
    `;

    function statCell(lbl, val) {
      return `<div class="stat-cell"><div class="stat-num">${val}</div><div class="stat-lbl">${lbl}</div></div>`;
    }
    function cardsText(h) {
      const parts = [];
      if (h.yellow_cards) parts.push(h.yellow_cards + 'Y');
      if (h.red_cards) parts.push(h.red_cards + 'R');
      return parts.join(' · ') || '<span class="subtle">—</span>';
    }
    function drawStats(mode) {
      const s = mode === 'season' ? cur : all;
      const vals = [s.apps, s.goals, s.assists, s.avg_rating !== null && s.avg_rating !== undefined ? Number(s.avg_rating).toFixed(2) : '—', s.clean_sheets];
      document.querySelectorAll('#statStrip .stat-cell .stat-num').forEach((el, i) => { el.textContent = vals[i]; });
      document.getElementById('statSub').textContent =
        `Yellow cards: ${s.yellow_cards} · Red cards: ${s.red_cards} · ${mode === 'season' ? 'this season' : 'career'}`;
    }
    drawStats('season');
    document.querySelectorAll('#statSeg button').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('#statSeg button').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      drawStats(b.dataset.mode);
    }));
  };

  const POS_LABEL = { GK: 'Goalkeeper', RB: 'Right Back', CB: 'Centre Back', LB: 'Left Back', CM: 'Centre Mid', ST: 'Striker' };

  if (location.hash.startsWith('#/player/')) {
    const id = location.hash.split('/')[2];
    window.renderFullPlayerProfile(id);
  }
})();

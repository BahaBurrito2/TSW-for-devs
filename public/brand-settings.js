/* ============================================================
   TSW — Site settings
   The admin replaces the header crest from the UI (URL or
   uploaded image). The default TSW monogram stays until then.
   ============================================================ */
(function () {
  const API = window.__HATCHABLE__.api;

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

  async function load() {
    try {
      const s = await api('/settings/site');
      const x = document.getElementById('siteLogo');
      if (s.site_logo_url) {
        x.src = s.site_logo_url;
        x.style.display = 'block';
        document.getElementById('logoFallback').style.display = 'none';
      }
    } catch (e) { /* keep the default monogram */ }
  }

  window.openSiteSettings = async () => {
    let current = null;
    try { current = await api('/settings/site'); } catch (e) {}
    const raw = (current && current.site_logo_url_raw) || '';
    window.openModal(`
      <h3>Site settings</h3>
      <p class="modal-sub">Replace the TSW crest shown in the header. This applies to the whole site — no code changes needed.</p>
      <form id="siteLogoForm">
        <div class="field"><label>Site logo URL</label><input name="url" placeholder="https://…" value="${esc(raw)}"></div>
        <div class="field"><label>Or upload PNG, WebP or SVG</label><input name="file" type="file" accept="image/png,image/webp,image/svg+xml"></div>
        <div class="modal-actions">
          <button type="button" class="btn ghost" data-close-modal>Cancel</button>
          <button class="btn primary">Save logo</button>
        </div>
      </form>
    `);
    document.getElementById('siteLogoForm').onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      try {
        let site_logo_url = raw || null;
        if (f.get('file').size) site_logo_url = await window.tswUpload(f.get('file'), { square: false });
        else if (f.get('url')) site_logo_url = f.get('url');
        if (!site_logo_url) throw Error('Upload or enter a logo URL.');
        await api('/settings/site-save', 'POST', { site_logo_url });
        window.closeModal();
        window.toast('Logo updated', 'ok');
        location.reload();
      } catch (x) { window.toast(x.message, 'error'); }
    };
  };

  load();
})();

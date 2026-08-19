/* ============================================================
   TSW — Admin session shell
   Visitors see the whole site read-only. Logged-in admins get
   the action buttons; every mutation is still protected
   server-side by the API's access rules.
   ============================================================ */
(function () {
  const API = window.__HATCHABLE__.api;
  window.TSW_ADMIN = false;

  async function session() {
    const r = await fetch(API + '/admin/session');
    const d = await r.json().catch(() => ({}));
    if (r.ok) {
      window.TSW_ADMIN = true;
      document.body.classList.add('is-admin');
      render(d);
      return;
    }
    window.TSW_ADMIN = false;
    document.body.classList.remove('is-admin');
    render(null);
  }

  function render(me) {
    const root = document.getElementById('topbarActions');
    if (!root) return;
    const old = document.getElementById('adminSession');
    if (old) old.remove();
    const el = document.createElement('span');
    el.id = 'adminSession';
    if (me) {
      el.innerHTML = `
        <span class="subtle" style="margin-right:6px">${esc(me.display_name || me.handle || me.email)}</span>
        <button class="btn sm" id="siteSettingsBtn">Site settings</button>
        <button class="btn sm" id="adminLogoutBtn">Log out</button>`;
      root.append(el);
      document.getElementById('siteSettingsBtn').onclick = () => window.openSiteSettings && window.openSiteSettings();
      document.getElementById('adminLogoutBtn').onclick = () => {
        location.href = 'https://hatchable.com/logout?next=' + encodeURIComponent(location.href);
      };
    } else {
      el.innerHTML = '<button class="btn sm" id="adminLoginBtn">Login</button>';
      root.append(el);
      document.getElementById('adminLoginBtn').onclick = async () => {
        const r = await fetch(API + '/admin/session');
        const d = await r.json().catch(() => ({}));
        location.href = d.login_url || 'https://hatchable.com/login?next=' + encodeURIComponent(location.href);
      };
    }
  }

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

  new MutationObserver(() => {
    const top = document.getElementById('topbarActions');
    if (top && !document.getElementById('adminSession')) render(window.TSW_ADMIN ? { handle: 'Admin' } : null);
  }).observe(document.body, { childList: true, subtree: true });

  session();
})();

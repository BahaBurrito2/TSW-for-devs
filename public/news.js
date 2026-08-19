/* ============================================================
   Roball — Instagram-style news feed (FotMob-adjacent, original).
   Public read-only feed; admin create/edit/delete lives here and
   is hidden from visitors via the body.is-admin class.
   ============================================================ */
(function () {
  const C = document.getElementById('content');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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

  const CATEGORIES = ['Announcement', 'Match Report', 'Transfer', 'Interview', 'Awards', 'Community'];

  function fmtDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
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
    return fmtDate(ts);
  }
  const nl2br = (s) => esc(s).replace(/\n/g, '<br>');

  const MARK = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9.2"/><path d="M12 7.2l3.4 2.4-1.3 4h-4.2l-1.3-4z" fill="currentColor" stroke="none"/></svg>';

  /* ---------- Feed ---------- */
  window.renderNews = async function () {
    C.innerHTML = '<div class="empty">Loading news…</div>';
    const posts = await api('/news').catch(() => []);
    const imagePosts = posts.filter((p) => p.cover_url);

    C.innerHTML = `
      <div class="news-feed">
        <div class="feed-toolbar">
          <button class="btn sm primary admin-only" id="newPostBtn">+ New post</button>
        </div>
        ${posts.length
          ? posts.map((p, i) => postCard(p, i)).join('')
          : `<div class="card"><div class="empty"><h3>No news yet</h3><p>Match reports, announcements and awards will appear here.</p></div></div>`}
      </div>`;

    const newBtn = document.getElementById('newPostBtn');
    if (newBtn) newBtn.addEventListener('click', () => openPostModal(null));

    C.querySelectorAll('[data-edit-post]').forEach((b) => {
      b.addEventListener('click', () => {
        const post = posts.find((x) => String(x.id) === String(b.dataset.editPost));
        if (post) openPostModal(post);
      });
    });
    C.querySelectorAll('[data-delete-post]').forEach((b) => {
      b.addEventListener('click', () => {
        const post = posts.find((x) => String(x.id) === String(b.dataset.deletePost));
        if (post) deletePost(post);
      });
    });
    C.querySelectorAll('[data-post-image]').forEach((img) => {
      img.addEventListener('click', () => openLightbox(imagePosts, img.dataset.postImage));
    });
  };

  function postCard(p, i) {
    return `
      <article class="feed-post">
        <header>
          <span class="feed-mark">${MARK}</span>
          <div class="feed-name">
            <b>Roball</b>
            <small>${timeAgo(p.published_at || p.created_at)}${p.category ? ' · ' + esc(p.category) : ''}</small>
          </div>
          ${p.featured ? '<span class="badge pinned-mark">Featured</span>' : `<span class="badge faint">${esc(p.category || 'News')}</span>`}
        </header>
        ${p.cover_url ? `<img class="feed-image" src="${esc(p.cover_url)}" alt="${esc(p.title)}" loading="lazy" data-post-image="${p.id}">` : ''}
        <div class="feed-body">
          <h2>${esc(p.title)}</h2>
          <p>${nl2br(p.body)}</p>
        </div>
        <footer>
          <span>${esc(p.category || 'News')} · ${timeAgo(p.published_at || p.created_at)}</span>
          <span class="admin-only" style="display:inline-flex;gap:6px">
            <button class="btn sm" data-edit-post="${p.id}">Edit</button>
            <button class="btn sm danger" data-delete-post="${p.id}">Delete</button>
          </span>
        </footer>
      </article>`;
  }

  /* ---------- Create / edit ---------- */
  function openPostModal(post) {
    window.openModal(`
      <h3>${post ? 'Edit post' : 'New post'}</h3>
      <form id="postForm">
        <div class="field"><label>Headline</label><input name="title" required value="${post ? esc(post.title) : ''}" placeholder="e.g. Roball Cup draw announced"></div>
        <div class="field"><label>Caption</label><textarea name="body" rows="4" required placeholder="The story behind the headline…">${post ? esc(post.body) : ''}</textarea></div>
        <div class="field"><label>Category</label>
          <select name="category">${CATEGORIES.map((c) => `<option ${post && post.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
        </div>
        <div class="field"><label>Cover image</label>
          <div class="dropzone" id="postDrop">
            <div id="postPreview" class="drop-preview"></div>
            <button type="button" class="btn sm" id="postChoose">Choose file</button>
            <span class="subtle">or drag &amp; drop an image</span>
            <input name="file" id="postFile" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden>
          </div>
        </div>
        <div class="field"><label>Or image URL</label><input name="url" value="${post ? esc(post.cover_url_raw || post.cover_url || '') : ''}" placeholder="https://…"></div>
        <div class="modal-actions"><button type="button" class="btn ghost" data-close-modal>Cancel</button><button class="btn primary">${post ? 'Save changes' : 'Publish'}</button></div>
      </form>
    `, true);

    const form = document.getElementById('postForm');
    const input = document.getElementById('postFile');
    const drop = document.getElementById('postDrop');
    const preview = document.getElementById('postPreview');
    const choose = document.getElementById('postChoose');
    let pendingFile = null;

    const show = (url) => {
      preview.innerHTML = url
        ? `<img src="${esc(url)}" alt="">`
        : '<span class="subtle">No image selected</span>';
    };
    show(post ? post.cover_url : null);

    choose.onclick = () => input.click();
    input.addEventListener('change', () => {
      if (input.files && input.files[0]) { pendingFile = input.files[0]; show(URL.createObjectURL(pendingFile)); }
    });
    ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('dragging'); }));
    ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('dragging'); }));
    drop.addEventListener('drop', (e) => {
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (!f || !f.type.startsWith('image/')) return;
      pendingFile = f; show(URL.createObjectURL(f));
    });

    form.onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(form);
      try {
        let cover = f.get('url') || null;
        if (pendingFile) cover = await window.uploadImage(pendingFile, { square: false });
        const body = { title: f.get('title'), body: f.get('body'), category: f.get('category') || 'Announcement', cover_url: cover };
        if (post) await api('/pts/content', 'POST', { action: 'news_update', id: post.id, ...body });
        else await api('/pts/content', 'POST', { action: 'news_save', ...body, status: 'published', featured: post ? post.featured : false });
        window.closeModal();
        window.toast(post ? 'Post updated' : 'Post published', 'ok');
        window.renderNews();
      } catch (x) { window.toast(x.message, 'error'); }
    };
  }

  /* ---------- Delete ---------- */
  function deletePost(post) {
    window.confirmModal(
      'Delete this post?',
      'This permanently removes the post and its image from the feed. This cannot be undone.',
      'DELETE',
      async (word) => {
        await api('/pts/content', 'POST', { action: 'news_delete', id: post.id, confirmation: word });
        window.closeModal();
        window.toast('Post deleted', 'ok');
        window.renderNews();
      },
      true
    );
  }

  /* ---------- Lightbox ---------- */
  function openLightbox(imagePosts, startId) {
    let i = imagePosts.findIndex((p) => String(p.id) === String(startId));
    if (i < 0) i = 0;
    const root = document.getElementById('lightboxRoot');

    const next = () => { i = (i + 1) % imagePosts.length; draw(); };
    const prev = () => { i = (i - 1 + imagePosts.length) % imagePosts.length; draw(); };

    function draw() {
      const p = imagePosts[i];
      root.innerHTML = `
        <div class="lightbox">
          <div class="lb-top">
            <span class="lb-title">${esc(p.title)}</span>
            <span class="lb-count">${i + 1} / ${imagePosts.length}</span>
            <button class="btn sm ghost" id="lbClose">Close</button>
          </div>
          <div class="lb-stage" id="lbStage">
            ${imagePosts.length > 1 ? '<button class="lb-nav prev" id="lbPrev" aria-label="Previous">‹</button>' : ''}
            <img src="${esc(p.cover_url)}" alt="${esc(p.title)}">
            ${imagePosts.length > 1 ? '<button class="lb-nav next" id="lbNext" aria-label="Next">›</button>' : ''}
            ${p.body ? `<div class="lb-caption">${nl2br(p.body)}</div>` : ''}
          </div>
        </div>`;
      root.querySelector('#lbClose').onclick = closeLightbox;
      const pv = root.querySelector('#lbPrev');
      const nx = root.querySelector('#lbNext');
      if (pv) pv.onclick = prev;
      if (nx) nx.onclick = next;

      // Touch swipe between images.
      const stage = root.querySelector('#lbStage');
      let sx = null;
      stage.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
      stage.addEventListener('touchend', (e) => {
        if (sx === null) return;
        const dx = e.changedTouches[0].clientX - sx;
        if (Math.abs(dx) > 42) (dx < 0 ? next() : prev());
        sx = null;
      }, { passive: true });
    }

    const onKey = (e) => {
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft' && imagePosts.length > 1) prev();
      else if (e.key === 'ArrowRight' && imagePosts.length > 1) next();
    };
    document.addEventListener('keydown', onKey);
    window.__lbCleanup = () => document.removeEventListener('keydown', onKey);

    draw();
  }

  function closeLightbox() {
    document.getElementById('lightboxRoot').innerHTML = '';
    if (window.__lbCleanup) { window.__lbCleanup(); window.__lbCleanup = null; }
  }

  // Deep links: app.js boots before this script, so re-run the router if we
  // landed straight on #/news on first load.
  if ((location.hash || '#/').replace(/^#\//, '').split('/')[0] === 'news' && window.route) window.route();
})();

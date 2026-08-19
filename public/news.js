/* ============================================================
   TSW — News
   Instagram-style vertical feed: image-first cards, newest
   first, lazy images, local file uploads, admin edit/delete,
   and a fullscreen lightbox with prev/next.
   ============================================================ */
(function () {
  const API = window.__HATCHABLE__.api;
  const C = document.getElementById('content');
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

  const CATEGORIES = ['Announcement', 'Match Report', 'Transfer', 'Awards', 'Event', 'Featured'];

  window.renderNews = async () => {
    window.setHeader('News', 'Club updates & announcements', '');
    C.innerHTML = '<div class="news-feed"><div class="empty">Loading…</div></div>';
    let posts = [];
    try { posts = await api('/news'); } catch (x) {
      C.innerHTML = `<div class="news-feed"><div class="empty"><h3>Could not load posts</h3><p>${esc(x.message)}</p></div></div>`;
      return;
    }
    posts = Array.isArray(posts) ? posts : [];
    C.innerHTML = `
      <div class="news-feed">
        <div class="feed-toolbar"><button class="btn primary admin-only" id="newPostBtn">New post</button></div>
        ${posts.length ? posts.map(postHtml).join('') : `
        <div class="empty">
          <h3>No posts yet</h3>
          <p>The feed is quiet. Publish the first post — an announcement, match report or transfer.</p>
        </div>`}
      </div>
    `;
    const btn = document.getElementById('newPostBtn');
    if (btn) btn.onclick = () => postModal(null, posts);
    C.querySelectorAll('.feed-image').forEach(img => img.addEventListener('click', () => openLightbox(posts, posts.findIndex(p => p.id === Number(img.dataset.id)))));
    C.querySelectorAll('[data-edit-post]').forEach(b => b.onclick = () => {
      const p = posts.find(x => String(x.id) === b.dataset.editPost);
      if (p) postModal(p, posts);
    });
    C.querySelectorAll('[data-delete-post]').forEach(b => b.onclick = () => {
      const p = posts.find(x => String(x.id) === b.dataset.deletePost);
      if (p) deletePost(p);
    });
  };

  function postHtml(p) {
    return `
      <article class="feed-post" data-news-id="${p.id}">
        <header>
          <span class="feed-mark">TSW</span>
          <div class="feed-name">
            <b>Touch Soccer World</b>
            <small>${timeAgo(p.published_at || p.created_at)}</small>
          </div>
          ${p.featured ? '<span class="badge pinned-mark">Pinned</span>' : ''}
          <span class="badge faint">${esc(p.category || 'Announcement')}</span>
        </header>
        ${p.cover_url ? `<img class="feed-image" data-id="${p.id}" loading="lazy" src="${esc(p.cover_url)}" alt="${esc(p.title)}">` : ''}
        <div class="feed-body">
          <h2>${esc(p.title)}</h2>
          <p>${esc(p.body)}</p>
        </div>
        <footer>
          <span>${esc(p.category || 'Announcement')} · ${timeAgo(p.published_at || p.created_at)}</span>
          <span class="foot-right">
            <button class="btn sm admin-only" data-edit-post="${p.id}">Edit</button>
            <button class="btn sm danger admin-only" data-delete-post="${p.id}">Delete</button>
          </span>
        </footer>
      </article>`;
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

  /* ---------- Post modal (create + edit) ---------- */
  function postModal(post, posts) {
    const isEdit = !!post;
    window.openModal(`
      <h3>${isEdit ? 'Edit post' : 'New post'}</h3>
      <form id="postForm">
        <div class="field"><label>Headline</label><input name="title" required value="${isEdit ? esc(post.title) : ''}"></div>
        <div class="field"><label>Caption</label><textarea name="body" rows="4" required>${isEdit ? esc(post.body) : ''}</textarea></div>
        <div class="field"><label>Image</label>
          <div class="drop-zone" id="dropZone">
            <div id="dropHint">${isEdit && post.cover_url ? 'Replace image —' : ''} Drag & drop an image here, or click to choose a file</div>
            <div id="dropPreview"></div>
          </div>
          <input type="file" id="fileInput" accept="image/png,image/jpeg,image/webp" style="display:none">
          <input type="hidden" name="file" id="fileSlot">
          <input type="hidden" name="cover_raw" value="${isEdit ? esc(post.cover_url_raw || '') : ''}">
        </div>
        <div class="field"><label>Or image URL</label><input name="cover_url" placeholder="https://…" value="${isEdit && !post.cover_url_raw ? esc(post.cover_url || '') : ''}"></div>
        <div class="form-row">
          <div class="field"><label>Category</label>
            <select name="category">${CATEGORIES.map(c => `<option ${(!isEdit && c === 'Announcement') || (isEdit && c === post.category) ? 'selected' : ''}>${c}</option>`).join('')}</select>
          </div>
        </div>
        <label class="check"><input type="checkbox" name="featured" ${isEdit && post.featured ? 'checked' : ''}> Pin this post to the top</label>
        <div class="modal-actions">
          <button type="button" class="btn ghost" data-close-modal>Cancel</button>
          <button class="btn primary">${isEdit ? 'Save changes' : 'Publish'}</button>
        </div>
      </form>
    `);

    const zone = document.getElementById('dropZone');
    const input = document.getElementById('fileInput');
    const preview = document.getElementById('dropPreview');
    const fileSlot = document.getElementById('fileSlot');
    let pickedFile = null;

    if (isEdit && post.cover_url) {
      preview.innerHTML = `<img class="preview" src="${esc(post.cover_url)}" alt="">`;
    }
    const showFile = (file) => {
      pickedFile = file;
      fileSlot.value = 'picked';
      preview.innerHTML = `<img class="preview" src="${URL.createObjectURL(file)}" alt="">`;
    };
    zone.onclick = () => input.click();
    input.onchange = () => { if (input.files[0]) showFile(input.files[0]); };
    zone.ondragover = (e) => { e.preventDefault(); zone.classList.add('drag'); };
    zone.ondragleave = () => zone.classList.remove('drag');
    zone.ondrop = (e) => {
      e.preventDefault();
      zone.classList.remove('drag');
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f && /^image\//.test(f.type)) showFile(f);
    };

    document.getElementById('postForm').onsubmit = async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      try {
        let cover_url = null;
        if (pickedFile) cover_url = await window.tswUpload(pickedFile, { square: false });
        else if (f.get('cover_url')) cover_url = f.get('cover_url');
        else cover_url = f.get('cover_raw') || null;
        const body = {
          title: f.get('title'), body: f.get('body'), category: f.get('category'),
          cover_url, featured: f.get('featured') === 'on', status: 'published'
        };
        if (isEdit) { body.id = post.id; await api('/pts/content', 'POST', { action: 'news_update', ...body }); }
        else await api('/pts/content', 'POST', { action: 'news_save', ...body });
        window.closeModal();
        window.toast(isEdit ? 'Post updated' : 'Post published', 'ok');
        window.renderNews();
      } catch (x) { window.toast(x.message, 'error'); btn.disabled = false; }
    };
  }

  function deletePost(post) {
    window.confirmModal('Delete "' + post.title + '"?', 'This removes the post permanently and cannot be undone.', 'DELETE', async (word) => {
      await api('/pts/content', 'POST', { action: 'news_delete', id: post.id, confirmation: word });
      window.closeModal(); window.toast('Post deleted', 'ok');
      window.renderNews();
    }, true);
  }

  /* ---------- Lightbox ---------- */
  function openLightbox(posts, index) {
    const root = document.getElementById('lightboxRoot');
    const withImages = posts.filter(p => p.cover_url);
    let idx = Math.max(0, withImages.findIndex(p => p.id === posts[index].id));

    function draw() {
      const p = withImages[idx];
      root.innerHTML = `
        <div class="lightbox">
          <div class="lb-top">
            <span class="lb-cat">${esc(p.category || 'Announcement')}</span>
            <span class="lb-title">${esc(p.title)}</span>
            <span class="lb-count">${idx + 1} / ${withImages.length}</span>
            <button class="btn sm ghost" id="lbClose">Close</button>
          </div>
          <div class="lb-stage">
            <img src="${esc(p.cover_url)}" alt="${esc(p.title)}">
            <div class="lb-caption">${esc(p.body)}</div>
            ${withImages.length > 1 ? `
              <button class="lb-nav prev" id="lbPrev">‹</button>
              <button class="lb-nav next" id="lbNext">›</button>` : ''}
          </div>
        </div>`;
      document.getElementById('lbClose').onclick = close;
      const prev = document.getElementById('lbPrev');
      const next = document.getElementById('lbNext');
      if (prev) prev.onclick = (e) => { e.stopPropagation(); idx = (idx - 1 + withImages.length) % withImages.length; draw(); };
      if (next) next.onclick = (e) => { e.stopPropagation(); idx = (idx + 1) % withImages.length; draw(); };
    }

    let touchX = null;
    const close = () => { root.innerHTML = ''; document.removeEventListener('keydown', onKey); };
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft' && withImages.length > 1) { idx = (idx - 1 + withImages.length) % withImages.length; draw(); }
      if (e.key === 'ArrowRight' && withImages.length > 1) { idx = (idx + 1) % withImages.length; draw(); }
    };
    root.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
    root.addEventListener('touchend', (e) => {
      if (touchX === null) return;
      const dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 40 && withImages.length > 1) {
        idx = dx < 0 ? (idx + 1) % withImages.length : (idx - 1 + withImages.length) % withImages.length;
        draw();
      }
      touchX = null;
    }, { passive: true });

    draw();
    document.addEventListener('keydown', onKey);
  }

  if (location.hash.startsWith('#/news')) window.renderNews();
})();

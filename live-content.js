/* Public content from Netlify Blobs. Existing page content remains a fallback if the API is unavailable. */
(() => {
  'use strict';
  const page = location.pathname.split('/').pop() || 'index.html';
  const $ = (selector) => document.querySelector(selector);
  const make = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = String(text);
    return element;
  };
  const add = (parent, ...children) => { children.forEach((child) => parent.append(child)); return parent; };
  const button = (label, className, click) => {
    const element = make('button', className, label);
    element.type = 'button'; element.addEventListener('click', click); return element;
  };
  const empty = (label) => make('p', 'live-empty', label);
  const safeLink = (value, fallback) => {
    if (typeof value !== 'string' || !value) return fallback;
    if (/^\/(?!\/)[a-zA-Z0-9/?#=&._%-]+$/.test(value)) return value;
    try { const url = new URL(value); if (['https:', 'http:'].includes(url.protocol)) return url.href; } catch { /* Use fallback. */ }
    return fallback;
  };
  const anchor = (label, url, className) => {
    const link = make('a', className, label); link.href = safeLink(url, '#');
    if (/^https?:/.test(link.href) && new URL(link.href).origin !== location.origin) { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
    return link;
  };
  async function load(type) {
    const response = await fetch('/api/content?type=' + encodeURIComponent(type), { cache: 'no-store' });
    if (!response.ok) throw new Error('Content unavailable');
    const body = await response.json();
    if (!Array.isArray(body.items)) throw new Error('Invalid content');
    return body.items;
  }

  function courseCard(item, fallback = '/study-material.html') {
    const card = make('article', 'course-card');
    const thumb = make('div', 'course-thumb live-course-thumb');
    thumb.append(make('span', 'live-thumb-symbol', '▤'));
    const body = make('div', 'course-body');
    const meta = make('div', 'course-meta'); add(meta, make('span', '', `${item.lessons || 0} Lessons`), make('span', '', item.category || 'StudyAI'));
    const footer = make('div', 'course-footer'); footer.append(anchor('Open', item.url, 'btn btn-primary btn-sm'));
    if (!item.url) footer.firstChild.href = fallback;
    add(body, make('h3', 'course-title', item.title), meta, footer);
    add(card, thumb, body); return card;
  }

  async function showFeaturedCourses() {
    const grid = $('#featured-courses-grid'); if (!grid) return;
    const items = await load('courses');
    grid.replaceChildren(...(items.length ? items.slice(0, 8).map((item) => courseCard(item)) : [empty('No courses published yet.')]));
  }

  async function showCategories() {
    const grid = $('#live-categories-grid'); if (!grid) return;
    const items = await load('categories');
    grid.replaceChildren(...(items.length ? items.map((item) => {
      const card = anchor('', '/study-material.html?cat=' + encodeURIComponent(item.name), 'category-card');
      add(card, make('div', 'category-icon', '▤'), make('span', 'category-name', item.name));
      return card;
    }) : [empty('No categories published yet.')]));
  }

  async function showMaterials() {
    const grid = $('#materials-grid'); const filters = $('#cat-filters'); const search = $('#material-search');
    if (!grid || !filters || !search) return;
    const items = await load('studyMaterials');
    let category = 'all';
    const queryCategory = new URLSearchParams(location.search).get('cat');
    if (queryCategory) {
      const match = items.find((item) => item.category === queryCategory || item.categorySlug === queryCategory || item.category.toLowerCase().replace(/[^a-z0-9]+/g, '-') === queryCategory);
      if (match) category = match.category;
    }
    const render = () => {
      const query = search.value.trim().toLowerCase();
      const visible = items.filter((item) => (category === 'all' || item.category === category) && (!query || item.title.toLowerCase().includes(query) || item.category.toLowerCase().includes(query)));
      grid.replaceChildren(...(visible.length ? visible.map((item) => courseCard(item, '/pdf-library.html')) : [empty('No study materials found.')]));
      filters.querySelectorAll('button').forEach((item) => {
        const selected = item.dataset.category === category;
        item.classList.toggle('btn-primary', selected); item.classList.toggle('btn-secondary', !selected);
      });
    };
    filters.replaceChildren();
    for (const name of ['all', ...new Set(items.map((item) => item.category))]) {
      const control = button(name === 'all' ? 'All' : name, 'btn btn-sm', () => { category = name; render(); });
      control.dataset.category = name; filters.append(control);
    }
    search.removeAttribute('oninput'); search.oninput = null; search.addEventListener('input', render);
    render();
  }

  async function showPdfs() {
    const grid = $('#pdf-grid'); const filters = $('#pdf-filters'); const search = $('#pdf-search');
    if (!grid || !filters || !search) return;
    const items = await load('pdfs');
    let category = 'all';
    const source = (item) => item.fileId ? '/api/pdf?id=' + encodeURIComponent(item.fileId) : safeLink(item.url, '');
    const preview = (item) => {
      const link = source(item);
      if (link) { window.open(link, '_blank', 'noopener,noreferrer'); return; }
      $('#preview-title').textContent = item.title;
      $('#preview-desc').textContent = item.description || item.content || `${item.pages} pages`;
      window.openModal?.('preview-modal');
    };
    const card = (item) => {
      const wrap = make('article', 'note-card');
      const icon = make('div', 'note-icon', 'PDF');
      const meta = make('div', 'note-meta', `${item.exam || item.category} · ${item.pages} pages${item.size ? ' · ' + item.size : ''}`);
      const actions = make('div', 'live-pdf-actions');
      actions.append(button('Preview', 'btn btn-primary btn-sm', () => preview(item)));
      actions.append(button('Download', 'btn btn-secondary btn-sm', () => {
        const link = source(item);
        if (link) {
          if (item.fileId) {
            const anchor = document.createElement('a'); anchor.href = link; anchor.download = item.title.replace(/\s+/g, '_') + '.pdf'; anchor.click();
          } else window.open(link, '_blank', 'noopener,noreferrer');
          return;
        }
        const blob = new Blob([item.content || item.description || item.title], { type: 'text/plain' });
        const anchor = document.createElement('a'); anchor.href = URL.createObjectURL(blob); anchor.download = item.title.replace(/\s+/g, '_') + '.txt'; anchor.click(); setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
      }));
      actions.append(button('♡', 'btn btn-ghost btn-sm', () => {
        if (!window.AuthManager?.requireAuth?.()) return;
        const added = window.DB.toggleFavorite(window.AuthManager.currentUser.uid, 'pdfs', item.id);
        window.Toast?.show(added ? 'Added to favorites' : 'Removed from favorites', added ? 'success' : 'info');
      }));
      add(wrap, icon, make('h4', 'note-title', item.title), meta, actions); return wrap;
    };
    const render = () => {
      const query = search.value.trim().toLowerCase();
      const visible = items.filter((item) => (category === 'all' || item.category === category) && (!query || `${item.title} ${item.category} ${item.exam || ''}`.toLowerCase().includes(query)));
      grid.replaceChildren(...(visible.length ? visible.map(card) : [empty('No PDFs found.')]));
      filters.querySelectorAll('button').forEach((item) => { const selected = item.dataset.category === category; item.classList.toggle('btn-primary', selected); item.classList.toggle('btn-secondary', !selected); });
    };
    filters.replaceChildren();
    for (const name of ['all', ...new Set(items.map((item) => item.category))]) {
      const control = button(name === 'all' ? 'All' : name, 'btn btn-sm pdf-cat', () => { category = name; render(); });
      control.dataset.category = name; filters.append(control);
    }
    search.removeAttribute('oninput'); search.oninput = null; search.addEventListener('input', render);
    render();
  }

  function youtubeId(value) {
    try {
      const url = new URL(value);
      const host = url.hostname.toLowerCase();
      if (host === 'youtu.be') return url.pathname.split('/')[1] || '';
      if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(host)) return url.searchParams.get('v') || url.pathname.split('/').filter(Boolean).at(-1) || '';
    } catch { /* Skip invalid links. */ }
    return '';
  }
  async function showVideos() {
    const playlist = $('#playlist'); const playlists = $('#playlists-grid'); if (!playlist || !playlists) return;
    const items = (await load('videos')).filter((item) => youtubeId(item.url));
    const play = (item) => {
      const id = youtubeId(item.url);
      $('#main-video').src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id);
      $('#video-title').textContent = item.title;
      $('#video-desc').textContent = item.description || '';
    };
    playlist.replaceChildren(...(items.length ? items.map((item, index) => {
      const control = button('', 'card live-video-row', () => play(item));
      const copy = make('span'); add(copy, make('strong', '', item.title), make('small', '', item.duration || 'Video'));
      add(control, make('span', 'live-video-number', index + 1), copy); return control;
    }) : [empty('No videos published yet.')]));
    if (items.length) play(items[0]);
    const groups = [...new Set(items.map((item) => item.category))];
    playlists.replaceChildren(...groups.map((name) => {
      const group = items.filter((item) => item.category === name);
      const card = make('article', 'course-card'); const thumb = make('div', 'course-thumb', '▷'); const body = make('div', 'course-body');
      add(body, make('h3', 'course-title', name), make('div', 'course-meta', `${group.length} Videos`), button('Watch', 'btn btn-primary btn-sm', () => { play(group[0]); window.scrollTo({ top: 0, behavior: 'smooth' }); }));
      add(card, thumb, body); return card;
    }));
  }

  async function showQuizzes() {
    const grid = $('#quiz-list'); if (!grid || !window.DB) return;
    const items = await load('quizzes');
    const bank = Object.fromEntries(items.map((item) => [item.id, { id: item.id, title: item.title, category: item.category, timeLimit: item.minutes * 60, questions: item.questions.map((entry) => ({ q: entry.question, options: entry.options, answer: entry.correct })) }]));
    window.DB.getQuizBank = () => bank;
    grid.replaceChildren(...(items.length ? items.map((item) => {
      const card = button('', 'course-card live-quiz-card', () => window.QuizEngine.start(item.id));
      const thumb = make('div', 'course-thumb', '◇'); const body = make('div', 'course-body');
      add(body, make('h3', 'course-title', item.title), make('div', 'course-meta', `${item.questions.length} Questions · ${item.minutes} min`), make('div', 'course-footer', item.category));
      add(card, thumb, body); return card;
    }) : [empty('No quizzes published yet.')]));
    const start = new URLSearchParams(location.search).get('start');
    if (start && bank[start]) window.QuizEngine.start(start);
  }

  async function showBlogs() {
    const grid = $('#blog-grid'); const filters = $('#blog-filters'); if (!grid || !filters) return;
    const items = await load('blogs');
    let category = 'all';
    const dialog = make('dialog', 'live-blog-dialog');
    const head = make('div', 'live-blog-dialog-header'); const title = make('h2');
    const close = button('×', 'modal-close', () => dialog.close()); close.setAttribute('aria-label', 'Close article');
    add(head, title, close); const body = make('div', 'live-blog-dialog-body'); add(dialog, head, body); document.body.append(dialog);
    const render = () => {
      const visible = category === 'all' ? items : items.filter((item) => item.category === category);
      grid.replaceChildren(...(visible.length ? visible.map((item) => {
        const card = make('article', 'course-card'); const thumb = make('div', 'course-thumb', '✎'); const inner = make('div', 'course-body');
        add(inner, make('div', 'section-kicker', item.category), make('h3', 'course-title', item.title), make('p', 'live-description', item.excerpt), make('div', 'course-meta', `${item.date || ''} · ${item.readTime || ''}`), button('Read article', 'btn btn-primary btn-sm', () => { title.textContent = item.title; body.textContent = item.body; dialog.showModal(); }));
        add(card, thumb, inner); return card;
      }) : [empty('No posts published yet.')]));
      filters.querySelectorAll('button').forEach((item) => { const selected = item.dataset.category === category; item.classList.toggle('btn-primary', selected); item.classList.toggle('btn-secondary', !selected); });
    };
    filters.replaceChildren();
    for (const name of ['all', ...new Set(items.map((item) => item.category))]) {
      const control = button(name === 'all' ? 'All' : name, 'btn btn-sm', () => { category = name; render(); });
      control.dataset.category = name; filters.append(control);
    }
    render();
  }

  const pages = { 'index.html': () => Promise.all([showCategories(), showFeaturedCourses()]), 'study-material.html': showMaterials, 'pdf-library.html': showPdfs, 'videos.html': showVideos, 'quiz.html': showQuizzes, 'blog.html': showBlogs };
  document.addEventListener('DOMContentLoaded', () => { pages[page]?.().catch((error) => console.warn('StudyAI live content:', error.message)); });
})();

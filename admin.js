/* StudyAI admin client. All writes go through authenticated Netlify Functions. */
(() => {
  'use strict';

  const IDLE_LIMIT = 20 * 60 * 1000;
  const $ = (id) => document.getElementById(id);
  const field = (name, label, type = 'text', extra = {}) => ({ name, label, type, ...extra });
  const withStatus = (fields) => [...fields, field('status', 'Status', 'select', { options: ['Published', 'Draft', 'Review'] })];
  const schemas = {
    categories: { title: 'Categories', singular: 'category', subtitle: 'Keep every learning path easy to discover.', icon: '▧', columns: ['Name', 'Description', 'Status'], fields: withStatus([field('name', 'Category name', 'text', { max: 70 }), field('description', 'Description', 'textarea', { max: 240, required: false })]), primary: 'name', secondary: 'description' },
    courses: { title: 'Courses', singular: 'course', subtitle: 'Build and organize the courses your learners love.', icon: '▤', columns: ['Course', 'Category', 'Lessons', 'Status'], fields: withStatus([field('title', 'Course title', 'text', { max: 100 }), field('category', 'Category', 'category'), field('instructor', 'Instructor', 'text', { max: 70 }), field('lessons', 'Lessons', 'number', { min: 0, max: 999 }), field('description', 'Description (optional)', 'textarea', { max: 400, required: false }), field('url', 'Open link (optional)', 'text', { required: false, max: 2000, hint: 'Use an https:// link or a site path such as /pdf-library.html.' })]), primary: 'title', secondary: 'instructor' },
    studyMaterials: { title: 'Study Material', singular: 'material', subtitle: 'Publish notes and learning resources by category.', icon: '▥', columns: ['Material', 'Category', 'Lessons', 'Status'], fields: withStatus([field('title', 'Material title', 'text', { max: 100 }), field('category', 'Category', 'category'), field('lessons', 'Lessons', 'number', { min: 0, max: 999 }), field('description', 'Description (optional)', 'textarea', { max: 400, required: false }), field('url', 'Open link (optional)', 'text', { required: false, max: 2000, hint: 'Use an https:// link or a site path.' })]), primary: 'title', secondary: 'description' },
    pdfs: { title: 'PDF Library', singular: 'PDF', subtitle: 'Upload a PDF or link to one for learners.', icon: '▣', columns: ['Resource', 'Category', 'Pages', 'Status'], fields: withStatus([field('title', 'PDF title', 'text', { max: 100 }), field('category', 'Category', 'category'), field('url', 'PDF URL (optional)', 'url', { required: false, max: 2000, hint: 'Use a PDF URL, or upload a PDF below (up to 4 MB).' }), field('file', 'Upload PDF (optional)', 'file', { required: false, hint: 'A new file replaces the current PDF when you save.' }), field('pages', 'Pages', 'number', { min: 1, max: 10000 }), field('description', 'Description (optional)', 'textarea', { max: 400, required: false })]), primary: 'title', secondary: 'description' },
    videos: { title: 'Videos', singular: 'video', subtitle: 'Curate helpful YouTube lessons.', icon: '▷', columns: ['Video', 'Category', 'Duration', 'Status'], fields: withStatus([field('title', 'Video title', 'text', { max: 100 }), field('category', 'Category', 'category'), field('url', 'YouTube URL', 'url', { hint: 'Paste a YouTube watch or youtu.be link.' }), field('duration', 'Duration', 'text', { max: 20, hint: 'For example: 18:30' }), field('description', 'Description (optional)', 'textarea', { max: 400, required: false })]), primary: 'title', secondary: 'description' },
    quizzes: { title: 'Quizzes', singular: 'quiz', subtitle: 'Create practice questions and keep learners sharp.', icon: '◇', columns: ['Quiz', 'Category', 'Questions', 'Status'], fields: withStatus([field('title', 'Quiz title', 'text', { max: 100 }), field('category', 'Category', 'category'), field('minutes', 'Time limit (minutes)', 'number', { min: 1, max: 180 }), field('questions', 'Questions', 'questions', { hint: 'One per line: Question | Option A | Option B | Option C | Option D | Correct letter (A–D)' })]), primary: 'title', secondary: 'minutes' },
    blogs: { title: 'Blog', singular: 'post', subtitle: 'Draft and publish stories worth sharing.', icon: '✎', columns: ['Post', 'Category', 'Author', 'Status'], fields: withStatus([field('title', 'Post title', 'text', { max: 120 }), field('category', 'Category', 'category'), field('author', 'Author', 'text', { max: 70 }), field('excerpt', 'Excerpt', 'textarea', { max: 280 }), field('body', 'Article body', 'textarea', { max: 10000 })]), primary: 'title', secondary: 'excerpt' },
    users: { title: 'Users', singular: 'user', subtitle: 'Manage sample learner profiles and access labels.', icon: '♙', columns: ['User', 'Email', 'Role', 'Status'], fields: [field('name', 'Full name', 'text', { max: 70 }), field('email', 'Email', 'email', { max: 160 }), field('role', 'Role', 'select', { options: ['Student', 'Instructor', 'Admin'] }), field('status', 'Status', 'select', { options: ['Active', 'Pending', 'Suspended'] })], primary: 'name', secondary: 'email' }
  };
  let data;
  let revision = 'seed';
  let section = 'dashboard';
  let dialogSection = null;
  let editId = null;
  let idleAt = Date.now();
  let toastTimer;

  function node(tag, className, content) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (content !== undefined) element.textContent = String(content);
    return element;
  }
  function append(parent, ...children) { children.forEach((child) => parent.append(child)); return parent; }
  async function request(path, options = {}) {
    const response = await fetch(`/api/admin/${path}`, { credentials: 'same-origin', cache: 'no-store', ...options });
    let payload;
    try { payload = await response.json(); } catch { throw new Error('Server returned an invalid response.'); }
    if (!response.ok) {
      if (response.status === 401 && data) lock();
      throw new Error(payload.error || 'Request failed.');
    }
    return payload;
  }
  function applySnapshot(snapshot) { revision = snapshot.revision; data = snapshot.data; }
  async function refreshData() { applySnapshot(await request('content')); }
  function toast(message) {
    const target = $('toast'); target.textContent = message; target.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { target.hidden = true; }, 3500);
  }
  function renderAuth() {
    $('auth-title').textContent = 'Welcome back';
    $('auth-description').textContent = 'Sign in to manage your live content.';
    $('auth-error').textContent = '';
  }
  async function handleAuth(event) {
    event.preventDefault();
    const error = $('auth-error'); error.textContent = '';
    $('auth-submit').disabled = true;
    try {
      await request('login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: $('auth-password').value }) });
      await refreshData();
      $('auth-form').reset();
      unlock();
    } catch (failure) { error.textContent = failure.message; }
    finally { $('auth-submit').disabled = false; }
  }
  function unlock() { idleAt = Date.now(); $('auth-screen').hidden = true; $('admin-app').hidden = false; navigate('dashboard'); }
  function lock() { data = null; $('admin-app').hidden = true; $('auth-screen').hidden = false; $('auth-form').reset(); closeSidebar(); renderAuth(); }
  async function logout() { try { await request('logout', { method: 'POST' }); } catch { /* The local view still closes. */ } lock(); }
  function closeSidebar() { $('sidebar').classList.remove('open'); $('sidebar-scrim').hidden = true; $('menu-button').setAttribute('aria-expanded', 'false'); }
  function navigate(target) {
    if (!data) return;
    section = target;
    $('workspace-name').textContent = data.settings.siteName;
    $('workspace-state').textContent = data.settings.maintenance ? 'Maintenance' : 'Live workspace';
    document.querySelectorAll('[data-section]').forEach((button) => button.classList.toggle('active', button.dataset.section === target));
    $('breadcrumb').replaceChildren(document.createTextNode(target === 'dashboard' ? 'Overview' : target === 'settings' || target === 'users' ? 'Workspace' : 'Content'), append(node('span'), document.createTextNode('/')), document.createTextNode(target === 'dashboard' ? ' Dashboard' : target === 'pdfs' ? ' PDF Library' : schemas[target]?.title || ' Settings'));
    closeSidebar();
    if (target === 'dashboard') renderDashboard();
    else if (target === 'settings') renderSettings();
    else renderManagement();
    $('main-content').focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function heading(kicker, title, subtitle, action) {
    const wrap = node('div', 'page-heading');
    const copy = node('div');
    append(copy, node('span', 'section-kicker', kicker), node('h1', '', title), node('p', '', subtitle));
    wrap.append(copy);
    if (action) wrap.append(action);
    return wrap;
  }
  function displayDate(value) { return value ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value)) : '—'; }
  function renderDashboard() {
    const main = $('main-content'); main.replaceChildren();
    const addCourse = node('button', 'button primary', '+ Add course'); addCourse.type = 'button'; addCourse.addEventListener('click', () => openDialog('courses'));
    main.append(heading('OVERVIEW', 'Good to see you, Admin', 'Here’s what is happening in your workspace today.', addCourse));
    const stats = node('div', 'stats-grid');
    [
      ['Sample learners', data.users.filter((item) => item.role === 'Student').length, '♙', 'purple'],
      ['Active courses', data.courses.filter((item) => item.status === 'Published').length, '▤', 'blue'],
      ['Study resources', data.studyMaterials.length + data.pdfs.length + data.videos.length, '▣', 'orange'],
      ['Live quizzes', data.quizzes.filter((item) => item.status === 'Published').length, '◇', 'green']
    ].forEach(([label, count, icon, color]) => {
      const card = node('div', 'card stat-card'); const top = node('div', 'stat-head');
      append(top, node('span', `stat-icon ${color}`, icon), node('span', 'stat-trend', 'LIVE'));
      append(card, top, node('div', 'stat-value', count), node('div', 'stat-label', label)); stats.append(card);
    });
    main.append(stats);
    const grid = node('div', 'dashboard-grid');
    const activity = node('section', 'card panel'); const activityHead = node('div', 'panel-title');
    append(activityHead, node('h2', '', 'Recent content activity'), node('small', '', 'Latest updates'));
    const activityList = node('div', 'activity-list');
    const recent = Object.entries(schemas).flatMap(([key, schema]) => data[key].map((item) => ({ item, schema }))).sort((a, b) => (b.item.updatedAt || '').localeCompare(a.item.updatedAt || '')).slice(0, 5);
    recent.forEach(({ item, schema }) => {
      const row = node('div', 'activity-row'); const info = node('div', 'activity-info');
      append(info, node('strong', '', item[schema.primary]), node('small', '', `${schema.title} · ${item.status}`));
      append(row, node('span', 'activity-badge', schema.icon), info, node('span', 'activity-time', displayDate(item.updatedAt))); activityList.append(row);
    });
    if (!recent.length) activityList.append(node('p', 'muted', 'No activity yet.'));
    append(activity, activityHead, activityList);
    const overview = node('section', 'card panel'); const overviewHead = node('div', 'panel-title');
    append(overviewHead, node('h2', '', 'Publishing overview'), node('small', '', 'Netlify content')); overview.append(overviewHead);
    const content = ['courses', 'studyMaterials', 'pdfs', 'videos', 'quizzes', 'blogs'];
    content.forEach((key, index) => {
      const count = data[key].filter((item) => item.status === 'Published').length;
      const total = data[key].length;
      const row = node('div', 'progress-row'); const label = node('div', 'progress-label');
      append(label, node('span', '', schemas[key].title), node('span', '', `${count} of ${total} published`));
      const track = node('div', 'progress-track'); const fill = node('div', 'progress-fill');
      fill.style.width = `${total ? Math.round(count / total * 100) : 0}%`;
      fill.style.background = ['#665bd9', '#4a95e3', '#f1a562', '#44bd98', '#8f80db', '#5d88db'][index];
      track.append(fill); append(row, label, track); overview.append(row);
    });
    append(grid, activity, overview); main.append(grid);
    main.append(node('h2', 'quick-heading', 'Quick actions'));
    const quick = node('div', 'quick-actions');
    [['pdfs', '▣', 'Add a PDF'], ['quizzes', '◇', 'Create a quiz'], ['blogs', '✎', 'Write a post']].forEach(([key, icon, label]) => {
      const button = node('button', 'quick-card'); button.type = 'button'; append(button, node('span', '', icon), document.createTextNode(label)); button.addEventListener('click', () => openDialog(key)); quick.append(button);
    });
    main.append(quick, node('p', 'subtle-note', 'Published changes appear on the public website immediately. Drafts remain visible only here.'));
  }
  function renderManagement() {
    const main = $('main-content'); main.replaceChildren();
    const schema = schemas[section];
    const add = node('button', 'button primary', `+ Add ${schema.singular}`); add.type = 'button'; add.addEventListener('click', () => openDialog(section));
    main.append(heading('CONTENT WORKSPACE', schema.title, schema.subtitle, add));
    const card = node('div', 'card'); const toolbar = node('div', 'table-toolbar');
    const searchWrap = node('div', 'search-wrap'); const search = node('input'); search.type = 'search'; search.placeholder = `Search ${schema.title.toLowerCase()}...`; search.setAttribute('aria-label', `Search ${schema.title}`);
    append(searchWrap, node('span', '', '⌕'), search);
    const status = node('select', 'filter-select'); status.setAttribute('aria-label', 'Filter by status');
    ['All statuses', ...new Set(data[section].map((item) => item.status))].forEach((value) => { const option = node('option', '', value); option.value = value; status.append(option); });
    const count = node('span', 'table-count'); append(toolbar, searchWrap, status, count);
    const scroll = node('div', 'table-scroll'); const table = node('table', 'data-table');
    const thead = node('thead'); const headerRow = node('tr'); schema.columns.forEach((title) => headerRow.append(node('th', '', title))); headerRow.append(node('th', '', 'Actions')); thead.append(headerRow);
    const tbody = node('tbody'); append(table, thead, tbody); scroll.append(table); append(card, toolbar, scroll); main.append(card);
    const update = () => {
      const query = search.value.trim().toLowerCase();
      const rows = data[section].filter((item) => (status.value === 'All statuses' || item.status === status.value) && Object.values(item).some((value) => typeof value === 'string' && value.toLowerCase().includes(query)));
      count.textContent = `${rows.length} ${rows.length === 1 ? 'item' : 'items'}`;
      tbody.replaceChildren();
      rows.forEach((item) => tbody.append(makeRow(item, schema, section)));
      if (!rows.length) { const empty = node('tr'); const cell = node('td', 'empty-state'); cell.colSpan = schema.columns.length + 1; append(cell, node('strong', '', 'Nothing to show'), document.createTextNode('Try a different search or add a new item.')); empty.append(cell); tbody.append(empty); }
    };
    search.addEventListener('input', update); status.addEventListener('change', update); update();
    main.append(node('p', 'subtle-note', section === 'users' ? 'These sample profiles do not grant access to the public website.' : 'Changes are saved on Netlify. Published items appear on the public website.'));
  }
  function makeRow(item, schema, key) {
    const row = node('tr'); const first = node('td'); const group = node('div', 'table-primary'); const copy = node('div');
    append(copy, node('div', 'row-title', item[schema.primary] || 'Untitled'), node('div', 'row-subtitle', item[schema.secondary] || '—'));
    append(group, node('span', 'row-icon', schema.icon), copy); first.append(group); row.append(first);
    const second = key === 'categories' ? item.description : key === 'users' ? item.email : item.category;
    row.append(node('td', '', second || '—'));
    if (key !== 'categories') row.append(node('td', '', key === 'courses' || key === 'studyMaterials' ? `${item.lessons} lessons` : key === 'pdfs' ? `${item.pages} pages` : key === 'videos' ? item.duration : key === 'quizzes' ? `${item.questions?.length || 0} questions` : key === 'blogs' ? item.author : item.role));
    const status = node('td'); status.append(node('span', `status ${String(item.status || '').toLowerCase()}`, item.status || 'Draft')); row.append(status);
    const actions = node('td'); const buttons = node('div', 'row-actions');
    const edit = node('button', '', 'Edit'); edit.type = 'button'; edit.setAttribute('aria-label', `Edit ${item[schema.primary]}`); edit.addEventListener('click', () => openDialog(key, item.id));
    const remove = node('button', 'delete', 'Delete'); remove.type = 'button'; remove.setAttribute('aria-label', `Delete ${item[schema.primary]}`); remove.addEventListener('click', () => deleteItem(key, item));
    append(buttons, edit, remove); actions.append(buttons); row.append(actions); return row;
  }
  function questionsToText(questions) { return (questions || []).map((question) => [question.question, ...question.options, 'ABCD'[question.correct]].join(' | ')).join('\n'); }
  function parseQuestions(text) {
    const lines = text.trim().split('\n').map((line) => line.trim()).filter(Boolean);
    if (!lines.length) throw new Error('Add at least one question.');
    return lines.map((line, index) => {
      const parts = line.split('|').map((part) => part.trim());
      if (parts.length !== 6 || parts.slice(0, 5).some((part) => !part) || !/^[A-D]$/i.test(parts[5])) throw new Error(`Question ${index + 1} needs four options and a correct letter (A–D).`);
      return { question: parts[0], options: parts.slice(1, 5), correct: 'ABCD'.indexOf(parts[5].toUpperCase()) };
    });
  }
  function openDialog(key, id = null) {
    dialogSection = key; editId = id;
    const schema = schemas[key]; const item = id ? data[key].find((record) => record.id === id) : null;
    $('dialog-title').textContent = `${item ? 'Edit' : 'Add'} ${schema.singular}`;
    $('dialog-error').textContent = '';
    const fields = $('dialog-fields'); fields.replaceChildren();
    schema.fields.forEach((definition) => {
      const label = node('label', '', definition.label); label.htmlFor = `field-${definition.name}`;
      let input;
      if (definition.type === 'textarea' || definition.type === 'questions') input = node('textarea');
      else if (definition.type === 'select' || definition.type === 'category') input = node('select');
      else { input = node('input'); input.type = definition.type; }
      input.id = `field-${definition.name}`; input.name = definition.name; input.required = definition.required !== false;
      if (definition.type === 'file') input.accept = 'application/pdf,.pdf';
      if (definition.max && definition.type !== 'number') input.maxLength = definition.max;
      if (definition.min !== undefined) input.min = definition.min;
      if (definition.max !== undefined && definition.type === 'number') input.max = definition.max;
      if (input.tagName === 'SELECT') {
        const choices = definition.type === 'category' ? data.categories.map((category) => category.name) : definition.options;
        if (definition.type === 'category' && item?.category && !choices.includes(item.category)) choices.push(item.category);
        choices.forEach((value) => { const option = node('option', '', value); option.value = value; input.append(option); });
        if (!choices.length) { const option = node('option', '', 'Create a category first'); option.value = ''; input.append(option); }
      }
      if (definition.type !== 'file') input.value = definition.type === 'questions' ? questionsToText(item?.questions) : item?.[definition.name] ?? (definition.name === 'status' ? definition.options?.[0] : '');
      append(fields, label, input);
      if (definition.hint) fields.append(node('small', 'field-hint', definition.hint));
    });
    $('record-dialog').showModal();
    fields.querySelector('input,textarea,select')?.focus();
  }
  async function deleteItem(key, item) {
    if (!window.confirm('Delete “' + item[schemas[key].primary] + '” from the website?')) return;
    try {
      const snapshot = await request('content?type=' + encodeURIComponent(key), {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revision, id: item.id })
      });
      applySnapshot(snapshot);
      renderManagement();
      toast(schemas[key].singular + ' deleted.');
    } catch (error) {
      toast(error.message);
      if (error.message.includes('changed')) { await refreshData(); if (data) renderManagement(); }
    }
  }
  async function handleRecord(event) {
    event.preventDefault();
    const key = dialogSection;
    const schema = schemas[key];
    const form = $('record-form');
    if (!form.reportValidity()) return;
    const result = {};
    const saveButton = form.querySelector('[type=submit]');
    try {
      schema.fields.forEach((definition) => {
        if (definition.type === 'file') return;
        const value = form.elements[definition.name].value.trim();
        if (!value && definition.required !== false) throw new Error(definition.label + ' is required.');
        if (definition.type === 'questions') result[definition.name] = parseQuestions(value);
        else if (definition.type === 'number') result[definition.name] = Number(value);
        else if (definition.type === 'url' && value) {
          let url;
          try { url = new URL(value); } catch { throw new Error('Use an http:// or https:// URL.'); }
          if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Use an http:// or https:// URL.');
          result[definition.name] = value;
        } else result[definition.name] = value;
      });
      const previous = editId ? data[key].find((item) => item.id === editId) : null;
      const file = key === 'pdfs' ? form.elements.file.files[0] : null;
      if (file && file.size > 4 * 1024 * 1024) throw new Error('PDF must be 4 MB or smaller.');
      if (key === 'pdfs' && !file && !result.url && !previous?.fileId && !previous?.content) throw new Error('Add a PDF file or URL.');
      saveButton.disabled = true;
      let options;
      if (key === 'pdfs') {
        const body = new FormData();
        body.set('revision', revision);
        body.set('id', editId || '');
        body.set('record', JSON.stringify(result));
        if (file) body.set('file', file);
        options = { method: editId ? 'PUT' : 'POST', body };
      } else {
        options = { method: editId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision, id: editId, record: result }) };
      }
      const snapshot = await request('content?type=' + encodeURIComponent(key), options);
      applySnapshot(snapshot);
      $('record-dialog').close();
      navigate(key);
      toast(schema.singular + ' saved.');
    } catch (error) {
      $('dialog-error').textContent = error.message || 'Unable to save this item.';
      if (error.message?.includes('changed')) await refreshData();
    } finally { saveButton.disabled = false; }
  }
  function renderSettings() {
    const main = $('main-content'); main.replaceChildren();
    main.append(heading('WORKSPACE', 'Settings', 'Manage site details and admin security.'));
    const grid = node('div', 'settings-grid');
    const general = node('section', 'card settings-panel'); append(general, node('h2', '', 'General preferences'), node('p', '', 'These preferences are saved on Netlify.'));
    const generalForm = node('form', 'settings-form');
    [['siteName', 'Workspace name', 'text'], ['contactEmail', 'Contact email', 'email']].forEach(([name, labelText, type]) => {
      const label = node('label', '', labelText); label.htmlFor = `setting-${name}`;
      const input = node('input'); input.id = `setting-${name}`; input.name = name; input.type = type; input.required = true; input.maxLength = 160; input.value = data.settings[name]; append(generalForm, label, input);
    });
    const toggleRow = node('div', 'setting-line'); const toggleCopy = node('div'); append(toggleCopy, node('strong', '', 'Maintenance label'), node('p', '', 'Show maintenance status in this workspace.'));
    const toggle = node('label', 'toggle'); const checkbox = node('input'); checkbox.type = 'checkbox'; checkbox.name = 'maintenance'; checkbox.setAttribute('aria-label', 'Maintenance label'); checkbox.checked = !!data.settings.maintenance; append(toggle, checkbox, node('span')); append(toggleRow, toggleCopy, toggle); generalForm.append(toggleRow);
    const saveButton = node('button', 'button primary', 'Save preferences'); saveButton.type = 'submit'; generalForm.append(saveButton);
    generalForm.addEventListener('submit', async (event) => {
      event.preventDefault(); saveButton.disabled = true;
      try {
        const snapshot = await request('settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision, settings: { siteName: generalForm.elements.siteName.value.trim(), contactEmail: generalForm.elements.contactEmail.value.trim(), maintenance: checkbox.checked } }) });
        applySnapshot(snapshot); toast('Preferences saved.'); navigate('settings');
      } catch (error) { toast(error.message); }
      finally { saveButton.disabled = false; }
    });
    general.append(generalForm);
    const security = node('section', 'card settings-panel'); append(security, node('h2', '', 'Admin security'), node('p', '', 'Change the password for this Netlify admin panel.'));
    const securityForm = node('form', 'settings-form');
    [['current', 'Current password'], ['next', 'New password'], ['confirm', 'Confirm new password']].forEach(([name, labelText]) => {
      const label = node('label', '', labelText); label.htmlFor = `security-${name}`;
      const input = node('input'); input.id = `security-${name}`; input.name = name; input.type = 'password'; input.required = true; input.minLength = 12; input.autocomplete = name === 'current' ? 'current-password' : 'new-password'; append(securityForm, label, input);
    });
    const securityError = node('p', 'form-error'); securityError.setAttribute('role', 'alert'); securityForm.append(securityError);
    const changeButton = node('button', 'button secondary', 'Change password'); changeButton.type = 'submit'; securityForm.append(changeButton);
    securityForm.addEventListener('submit', async (event) => {
      event.preventDefault(); securityError.textContent = '';
      if (securityForm.elements.next.value !== securityForm.elements.confirm.value) { securityError.textContent = 'New passwords do not match.'; return; }
      changeButton.disabled = true;
      try {
        await request('password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ current: securityForm.elements.current.value, next: securityForm.elements.next.value }) });
        securityForm.reset(); toast('Admin password changed.');
      } catch (error) { securityError.textContent = error.message; }
      finally { changeButton.disabled = false; }
    });
    append(security, securityForm, node('p', 'security-note', 'Admin writes require a server-validated session. User profiles here remain sample records and are separate from the website’s existing local sign-in.'));
    append(grid, general, security); main.append(grid);
  }

  $('auth-form').addEventListener('submit', handleAuth);
  $('record-form').addEventListener('submit', handleRecord);
  $('dialog-close').addEventListener('click', () => $('record-dialog').close());
  $('dialog-cancel').addEventListener('click', () => $('record-dialog').close());
  $('record-dialog').addEventListener('click', (event) => { if (event.target === $('record-dialog')) $('record-dialog').close(); });
  $('logout-button').addEventListener('click', logout);
  $('side-nav').addEventListener('click', (event) => { const target = event.target.closest('[data-section]'); if (target) navigate(target.dataset.section); });
  $('menu-button').addEventListener('click', () => { const open = $('sidebar').classList.toggle('open'); $('sidebar-scrim').hidden = !open; $('menu-button').setAttribute('aria-expanded', String(open)); });
  $('sidebar-scrim').addEventListener('click', closeSidebar);
  ['pointerdown', 'keydown'].forEach((name) => document.addEventListener(name, () => { idleAt = Date.now(); }));
  setInterval(() => { if (!$('admin-app').hidden && Date.now() - idleAt > IDLE_LIMIT) { logout(); toast('Signed out after 20 minutes of inactivity.'); } }, 30000);
  renderAuth();
  request('session').then(refreshData).then(unlock).catch((error) => {
    if (error.message.includes('environment variables')) $('auth-error').textContent = error.message;
  });
})();

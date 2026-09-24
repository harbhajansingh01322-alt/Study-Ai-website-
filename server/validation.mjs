export const managedTypes = ['categories', 'courses', 'studyMaterials', 'pdfs', 'videos', 'quizzes', 'blogs', 'users'];
export const publicTypes = ['categories', 'courses', 'studyMaterials', 'pdfs', 'videos', 'quizzes', 'blogs'];

function requiredText(value, label, max = 200) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text || text.length > max) throw new Error(`${label} is required and must be at most ${max} characters.`);
  return text;
}

function optionalText(value, max = 1000) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (text.length > max) throw new Error(`Text must be at most ${max} characters.`);
  return text;
}

function integer(value, label, min, max) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) throw new Error(`${label} must be between ${min} and ${max}.`);
  return number;
}

export function safeUrl(value, label = 'URL', allowPath = true) {
  const text = optionalText(value, 2000);
  if (!text) return '';
  if (allowPath && /^\/(?!\/)[a-zA-Z0-9/?#=&._%-]+$/.test(text)) return text;
  try {
    const url = new URL(text);
    if (url.protocol === 'https:' || url.protocol === 'http:') return url.toString();
  } catch { /* Report a consistent error below. */ }
  throw new Error(`${label} must be an http(s) link${allowPath ? ' or a site path' : ''}.`);
}

function status(value, type) {
  const options = type === 'users' ? ['Active', 'Pending', 'Suspended'] : ['Published', 'Draft', 'Review'];
  if (!options.includes(value)) throw new Error('Choose a valid status.');
  return value;
}

function questions(value) {
  if (!Array.isArray(value) || !value.length || value.length > 100) throw new Error('Add 1 to 100 quiz questions.');
  return value.map((entry, index) => {
    const question = requiredText(entry?.question, `Question ${index + 1}`, 500);
    if (!Array.isArray(entry.options) || entry.options.length !== 4) throw new Error(`Question ${index + 1} needs four options.`);
    const options = entry.options.map((option) => requiredText(option, 'Option', 200));
    const correct = integer(entry.correct, 'Correct option', 0, 3);
    return { question, options, correct };
  });
}

export function normalizeRecord(type, input, previous = null) {
  if (!managedTypes.includes(type) || !input || typeof input !== 'object') throw new Error('Invalid content type.');
  const base = { id: previous?.id, updatedAt: new Date().toISOString(), status: status(input.status, type) };
  const category = () => requiredText(input.category, 'Category', 80);
  switch (type) {
    case 'categories': return {
      ...base, name: requiredText(input.name, 'Category name', 80),
      slug: previous?.slug || requiredText(input.name, 'Category name', 80).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'category',
      description: optionalText(input.description, 240)
    };
    case 'courses': return { ...base, title: requiredText(input.title, 'Course title', 120), category: category(), instructor: requiredText(input.instructor, 'Instructor', 80), lessons: integer(input.lessons, 'Lessons', 0, 1000), description: optionalText(input.description, 500), url: safeUrl(input.url) };
    case 'studyMaterials': return { ...base, title: requiredText(input.title, 'Material title', 120), category: category(), categorySlug: previous?.categorySlug || category().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), lessons: integer(input.lessons, 'Lessons', 0, 1000), description: optionalText(input.description, 500), url: safeUrl(input.url) };
    case 'pdfs': return { ...base, title: requiredText(input.title, 'PDF title', 120), category: category(), pages: integer(input.pages, 'Pages', 1, 10000), description: optionalText(input.description, 500), url: safeUrl(input.url, 'PDF URL', false), fileId: previous?.fileId || '', exam: previous?.exam || '', size: previous?.size || '', content: previous?.content || '' };
    case 'videos': {
      const url = safeUrl(input.url, 'Video URL', false);
      if (!url) throw new Error('Video URL is required.');
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      if (!['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(host)) throw new Error('Use a YouTube video link.');
      const videoId = host === 'youtu.be' ? parsed.pathname.split('/')[1] : parsed.searchParams.get('v') || parsed.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1];
      if (!/^[A-Za-z0-9_-]{11}$/.test(videoId || '')) throw new Error('Use a valid YouTube video link.');
      return { ...base, title: requiredText(input.title, 'Video title', 120), category: category(), url, duration: requiredText(input.duration, 'Duration', 20), description: optionalText(input.description, 500) };
    }
    case 'quizzes': return { ...base, title: requiredText(input.title, 'Quiz title', 120), category: category(), minutes: integer(input.minutes, 'Time limit', 1, 180), questions: questions(input.questions) };
    case 'blogs': return { ...base, title: requiredText(input.title, 'Post title', 140), category: category(), author: requiredText(input.author, 'Author', 80), excerpt: requiredText(input.excerpt, 'Excerpt', 280), body: requiredText(input.body, 'Article body', 20000), date: previous?.date || new Date().toISOString().slice(0, 10), readTime: `${Math.max(1, Math.ceil(String(input.body).split(/\s+/).length / 200))} min` };
    case 'users': {
      const email = requiredText(input.email, 'Email', 160).toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
      if (!['Student', 'Instructor', 'Admin'].includes(input.role)) throw new Error('Choose a valid role.');
      return { ...base, name: requiredText(input.name, 'Full name', 80), email, role: input.role };
    }
  }
}

/**
 * StudyAI Database Layer
 * Uses localStorage with a clean schema. When Firebase is configured,
 * the same API routes to Firestore automatically.
 */

const DB = {
  PREFIX: 'studyai_v2_',

  // ---------- Core helpers ----------
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(this.PREFIX + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
  },
  remove(key) {
    localStorage.removeItem(this.PREFIX + key);
  },

  // ---------- Users ----------
  getUsers() {
    return this.get('users', []);
  },
  saveUser(user) {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.uid === user.uid || u.email === user.email);
    if (idx >= 0) users[idx] = { ...users[idx], ...user };
    else users.push(user);
    this.set('users', users);
    return user;
  },
  findUserByEmail(email) {
    return this.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
  },
  getCurrentUser() {
    return this.get('session', null);
  },
  setSession(user) {
    if (user) this.set('session', user);
    else this.remove('session');
  },

  // ---------- PDFs / Notes ----------
  getPDFs() {
    const defaults = [
      { id: 'pdf_1', title: 'Indian Polity Complete Notes', category: 'notes', exam: 'UPSC', pages: 120, size: '4.2 MB', uploadedAt: '2025-09-01', downloads: 1250, content: 'Complete notes covering Indian Constitution, Fundamental Rights, DPSPs, Parliament, Judiciary and more.' },
      { id: 'pdf_2', title: 'Quantitative Aptitude Shortcuts', category: 'notes', exam: 'SSC CGL', pages: 85, size: '2.8 MB', uploadedAt: '2025-09-05', downloads: 2100, content: 'Vedic maths tricks, percentage, ratio, profit-loss, SI-CI, time-work shortcuts for competitive exams.' },
      { id: 'pdf_3', title: 'English Grammar Rules', category: 'notes', exam: 'Banking', pages: 60, size: '1.9 MB', uploadedAt: '2025-09-08', downloads: 980, content: 'All important grammar rules: tenses, subject-verb agreement, articles, prepositions, error spotting.' },
      { id: 'pdf_4', title: 'Current Affairs September 2025', category: 'current', exam: 'All', pages: 45, size: '3.1 MB', uploadedAt: '2025-09-20', downloads: 3400, content: 'National, International, Economy, Sports, Awards and Appointments for September 2025.' },
      { id: 'pdf_5', title: 'SSC CGL 2024 Tier-1 Paper', category: 'papers', exam: 'SSC CGL', pages: 25, size: '1.5 MB', uploadedAt: '2025-08-15', downloads: 5600, content: 'Official SSC CGL 2024 Tier-1 question paper with answer key.' },
      { id: 'pdf_6', title: 'IBPS PO Prelims 2023', category: 'papers', exam: 'Banking', pages: 30, size: '1.8 MB', uploadedAt: '2025-07-20', downloads: 4200, content: 'IBPS PO Prelims 2023 memory-based paper with solutions.' },
      { id: 'pdf_7', title: 'UPSC Prelims 2024 GS Paper', category: 'papers', exam: 'UPSC', pages: 40, size: '2.5 MB', uploadedAt: '2025-06-10', downloads: 8900, content: 'UPSC Civil Services Prelims 2024 General Studies Paper I.' },
      { id: 'pdf_8', title: 'Haryana CET Syllabus 2025', category: 'syllabus', exam: 'Haryana', pages: 12, size: '0.8 MB', uploadedAt: '2025-09-12', downloads: 1500, content: 'Official Haryana CET 2025 detailed syllabus for all posts.' },
      { id: 'pdf_9', title: 'Railway NTPC Syllabus', category: 'syllabus', exam: 'Railway', pages: 15, size: '0.9 MB', uploadedAt: '2025-08-01', downloads: 2800, content: 'RRB NTPC complete syllabus CBT-1 and CBT-2.' },
      { id: 'pdf_10', title: 'Reasoning Complete Notes', category: 'notes', exam: 'All', pages: 95, size: '3.5 MB', uploadedAt: '2025-09-10', downloads: 3200, content: 'Coding-decoding, blood relations, seating arrangement, puzzles, syllogism, inequality.' },
      { id: 'pdf_11', title: 'Weekly Current Affairs Week 38', category: 'current', exam: 'All', pages: 20, size: '1.2 MB', uploadedAt: '2025-09-22', downloads: 1100, content: 'Week 38 current affairs compilation.' },
      { id: 'pdf_12', title: 'Class 10 Science Notes', category: 'notes', exam: 'Class 10', pages: 70, size: '2.4 MB', uploadedAt: '2025-09-03', downloads: 670, content: 'NCERT-based Class 10 Science complete chapter notes.' }
    ];
    const stored = this.get('pdfs', null);
    if (!stored) {
      this.set('pdfs', defaults);
      return defaults;
    }
    return stored;
  },
  savePDF(pdf) {
    const list = this.getPDFs();
    const idx = list.findIndex(p => p.id === pdf.id);
    if (idx >= 0) list[idx] = pdf;
    else list.unshift(pdf);
    this.set('pdfs', list);
    return pdf;
  },
  deletePDF(id) {
    this.set('pdfs', this.getPDFs().filter(p => p.id !== id));
  },

  // ---------- Quizzes ----------
  getQuizBank() {
    const base = this._baseQuizBank();
    const customIds = this.get('custom_quiz_ids', []);
    customIds.forEach(id => {
      const q = this.get('quiz_override_' + id, null);
      if (q) base[id] = q;
    });
    return base;
  },

  _baseQuizBank() {
    return {
      'ssc-maths': {
        id: 'ssc-maths',
        title: 'SSC CGL Mathematics',
        category: 'SSC',
        timeLimit: 900,
        questions: [
          { q: 'What is 15% of 200?', options: ['20', '30', '25', '35'], answer: 1 },
          { q: 'If a train travels 120 km in 2 hours, its speed is?', options: ['50 km/h', '60 km/h', '70 km/h', '80 km/h'], answer: 1 },
          { q: 'LCM of 12 and 18 is?', options: ['24', '36', '48', '72'], answer: 1 },
          { q: 'Simple Interest on ₹5000 at 10% p.a. for 2 years is?', options: ['₹500', '₹1000', '₹1500', '₹2000'], answer: 1 },
          { q: '√144 equals?', options: ['10', '11', '12', '14'], answer: 2 },
          { q: 'Area of a circle with radius 7 cm (π=22/7)?', options: ['154 cm²', '144 cm²', '164 cm²', '174 cm²'], answer: 0 },
          { q: 'If x + 5 = 12, then x = ?', options: ['5', '6', '7', '8'], answer: 2 },
          { q: 'Average of 10, 20, 30, 40 is?', options: ['20', '25', '30', '35'], answer: 1 },
          { q: '25% of 80 is?', options: ['15', '20', '25', '30'], answer: 1 },
          { q: 'A number divisible by both 3 and 5 must be divisible by?', options: ['8', '10', '15', '20'], answer: 2 },
          { q: 'Compound Interest on ₹1000 at 10% for 2 years is?', options: ['₹200', '₹210', '₹220', '₹230'], answer: 1 },
          { q: 'If 3x = 27, x = ?', options: ['6', '7', '8', '9'], answer: 3 },
          { q: 'Perimeter of a square of side 8 cm is?', options: ['24 cm', '32 cm', '36 cm', '40 cm'], answer: 1 },
          { q: '0.25 as a fraction is?', options: ['1/2', '1/3', '1/4', '1/5'], answer: 2 },
          { q: 'HCF of 24 and 36 is?', options: ['6', '8', '12', '18'], answer: 2 }
        ]
      },
      'ssc-reasoning': {
        id: 'ssc-reasoning',
        title: 'SSC Reasoning',
        category: 'SSC',
        timeLimit: 600,
        questions: [
          { q: 'Find the odd one: 2, 3, 5, 7, 9, 11', options: ['3', '7', '9', '11'], answer: 2 },
          { q: 'If CAT = 24, DOG = 26, then BAT = ?', options: ['20', '22', '23', '25'], answer: 2 },
          { q: 'Complete the series: 2, 6, 12, 20, ?', options: ['28', '30', '32', '36'], answer: 1 },
          { q: 'A is B\'s brother. C is A\'s mother. D is C\'s father. How is D related to B?', options: ['Father', 'Grandfather', 'Uncle', 'Brother'], answer: 1 },
          { q: 'Which does not belong: Apple, Mango, Potato, Banana', options: ['Apple', 'Mango', 'Potato', 'Banana'], answer: 2 },
          { q: 'If in a code ROSE is written as 6821, CHAIR is 73456, what is SEARCH?', options: ['214763', '214736', '214673', '216743'], answer: 0 },
          { q: 'Pointing to a man, a woman said "His mother is the only daughter of my mother." How is the woman related to the man?', options: ['Mother', 'Sister', 'Daughter', 'Aunt'], answer: 0 },
          { q: 'Find the missing number: 5, 11, 24, 51, ?', options: ['106', '108', '110', '112'], answer: 0 },
          { q: 'If South-East becomes North, North-East becomes West, then West becomes?', options: ['North-East', 'South-East', 'North-West', 'South-West'], answer: 1 },
          { q: 'In a row of 40 boys, R is 11th from left. What is his position from right?', options: ['29', '30', '31', '32'], answer: 1 }
        ]
      },
      'banking-english': {
        id: 'banking-english',
        title: 'Banking English',
        category: 'Banking',
        timeLimit: 600,
        questions: [
          { q: 'Synonym of "Abundant"?', options: ['Scarce', 'Plentiful', 'Rare', 'Limited'], answer: 1 },
          { q: 'Error in: She don\'t like coffee.', options: ['She', 'don\'t', 'like', 'No error'], answer: 1 },
          { q: 'He is good ___ mathematics.', options: ['in', 'at', 'on', 'with'], answer: 1 },
          { q: 'Antonym of "Brave"?', options: ['Courageous', 'Fearless', 'Cowardly', 'Bold'], answer: 2 },
          { q: 'Plural of "Crisis"?', options: ['Crisises', 'Crises', 'Crisis', 'Crisii'], answer: 1 },
          { q: 'Choose correct: Neither of the boys ___ present.', options: ['are', 'were', 'is', 'have'], answer: 2 },
          { q: 'Idiom "Break the ice" means?', options: ['To break something', 'To start a conversation', 'To freeze', 'To end friendship'], answer: 1 },
          { q: 'One who loves books is called?', options: ['Bibliophile', 'Philatelist', 'Optimistic', 'Pessimist'], answer: 0 },
          { q: 'Correct spelling?', options: ['Recieve', 'Receive', 'Receve', 'Receeve'], answer: 1 },
          { q: 'Passive of "She writes a letter"?', options: ['A letter is written by her', 'A letter was written by her', 'A letter is being written by her', 'A letter has written by her'], answer: 0 }
        ]
      },
      'upsc-polity': {
        id: 'upsc-polity',
        title: 'UPSC Indian Polity',
        category: 'UPSC',
        timeLimit: 900,
        questions: [
          { q: 'Who is the head of the Indian State?', options: ['Prime Minister', 'President', 'Chief Justice', 'Speaker'], answer: 1 },
          { q: 'How many Fundamental Rights are in the Constitution?', options: ['5', '6', '7', '8'], answer: 1 },
          { q: 'Directive Principles were borrowed from?', options: ['USA', 'UK', 'Ireland', 'Canada'], answer: 2 },
          { q: 'Article 370 was related to?', options: ['Jammu & Kashmir', 'Goa', 'Sikkim', 'Puducherry'], answer: 0 },
          { q: 'Who appoints the Chief Minister of a State?', options: ['President', 'Prime Minister', 'Governor', 'Chief Justice'], answer: 2 },
          { q: 'The Constitution of India was adopted on?', options: ['15 Aug 1947', '26 Jan 1950', '26 Nov 1949', '30 Jan 1948'], answer: 2 },
          { q: 'Who is known as the Father of the Indian Constitution?', options: ['Mahatma Gandhi', 'Jawaharlal Nehru', 'B.R. Ambedkar', 'Rajendra Prasad'], answer: 2 },
          { q: 'Right to Education is under which Article?', options: ['Article 19', 'Article 21A', 'Article 32', 'Article 14'], answer: 1 },
          { q: 'Maximum strength of Lok Sabha is?', options: ['545', '550', '552', '500'], answer: 2 },
          { q: 'Who administers the oath to the President of India?', options: ['Prime Minister', 'Chief Justice of India', 'Vice President', 'Speaker'], answer: 1 }
        ]
      },
      'general-science': {
        id: 'general-science',
        title: 'General Science',
        category: 'Science',
        timeLimit: 600,
        questions: [
          { q: 'Chemical formula of water?', options: ['H2O', 'CO2', 'O2', 'NaCl'], answer: 0 },
          { q: 'Red Planet is?', options: ['Venus', 'Mars', 'Jupiter', 'Saturn'], answer: 1 },
          { q: 'Photosynthesis occurs in?', options: ['Mitochondria', 'Chloroplast', 'Nucleus', 'Ribosome'], answer: 1 },
          { q: 'SI unit of force?', options: ['Watt', 'Joule', 'Newton', 'Pascal'], answer: 2 },
          { q: 'Human blood is red due to?', options: ['Hemoglobin', 'Plasma', 'Platelets', 'WBC'], answer: 0 },
          { q: 'Largest organ of human body?', options: ['Liver', 'Brain', 'Skin', 'Heart'], answer: 2 },
          { q: 'Speed of light is approximately?', options: ['3×10^8 m/s', '3×10^6 m/s', '3×10^5 m/s', '3×10^10 m/s'], answer: 0 },
          { q: 'pH of pure water is?', options: ['5', '6', '7', '8'], answer: 2 },
          { q: 'Vitamin C is also known as?', options: ['Retinol', 'Ascorbic acid', 'Thiamine', 'Riboflavin'], answer: 1 },
          { q: 'Which gas is used in fire extinguishers?', options: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'], answer: 2 }
        ]
      }
    };
  },

  getQuizHistory(uid) {
    return this.get('quiz_history_' + (uid || 'guest'), []);
  },
  addQuizResult(uid, result) {
    const key = 'quiz_history_' + (uid || 'guest');
    const list = this.get(key, []);
    list.unshift({ ...result, id: 'qh_' + Date.now(), date: new Date().toISOString() });
    this.set(key, list.slice(0, 100));
  },
  getLeaderboard() {
    return this.get('leaderboard', []);
  },
  addLeaderboardEntry(entry) {
    const list = this.getLeaderboard();
    list.push({ ...entry, id: 'lb_' + Date.now() });
    list.sort((a, b) => b.percent - a.percent || b.score - a.score);
    this.set('leaderboard', list.slice(0, 100));
  },

  // ---------- Favorites ----------
  getFavorites(uid) {
    return this.get('fav_' + (uid || 'guest'), { notes: [], pdfs: [], videos: [] });
  },
  toggleFavorite(uid, type, id) {
    const fav = this.getFavorites(uid);
    if (!fav[type]) fav[type] = [];
    const i = fav[type].indexOf(id);
    if (i >= 0) fav[type].splice(i, 1);
    else fav[type].push(id);
    this.set('fav_' + (uid || 'guest'), fav);
    return fav[type].includes(id);
  },

  // ---------- Tasks / Planner ----------
  getTasks(uid) {
    return this.get('tasks_' + (uid || 'guest'), []);
  },
  saveTasks(uid, tasks) {
    this.set('tasks_' + (uid || 'guest'), tasks);
  },

  // ---------- Blog ----------
  getBlogs() {
    const defaults = [
      { id: 'blog_1', title: 'How to Crack SSC CGL in First Attempt', category: 'Exam Tips', date: '2025-09-20', readTime: '8 min', excerpt: 'A complete strategy guide covering syllabus, time management, books and mock tests for SSC CGL.', content: 'Success in SSC CGL requires a clear plan. Start with NCERT basics, master quantitative aptitude shortcuts, practise previous papers daily, and take at least 30 full mocks before the exam. Consistency beats intensity.' },
      { id: 'blog_2', title: 'Weekly Current Affairs - September Week 3', category: 'Current Affairs', date: '2025-09-22', readTime: '12 min', excerpt: 'Key national and international events for competitive exam preparation.', content: 'This week covered major policy announcements, international summits, sports results and economic indicators important for SSC, Banking and UPSC.' },
      { id: 'blog_3', title: 'National Scholarship Portal 2025 - How to Apply', category: 'Scholarship', date: '2025-09-18', readTime: '6 min', excerpt: 'Step-by-step guide to apply for central and state scholarships.', content: 'Visit scholarships.gov.in, register with Aadhaar, fill the form carefully, upload required documents and submit before the deadline. Keep application ID safe.' },
      { id: 'blog_4', title: 'SSC CGL 2025 Notification Released', category: 'Notification', date: '2025-09-15', readTime: '5 min', excerpt: 'Important dates, eligibility, vacancy details and application process.', content: 'SSC has released the CGL 2025 notification. Check official ssc.gov.in for exact dates, age limits, educational qualification and how to apply online.' },
      { id: 'blog_5', title: 'Best Reasoning Books for Banking Exams', category: 'Exam Tips', date: '2025-09-12', readTime: '7 min', excerpt: 'Recommended books and resources for IBPS, SBI and other banking exams.', content: 'RS Aggarwal, Arun Sharma and Bankers Adda material remain popular. Focus on puzzles and seating arrangement with daily practice.' },
      { id: 'blog_6', title: 'RRB NTPC Application Deadline Extended', category: 'Notification', date: '2025-09-10', readTime: '3 min', excerpt: 'New last date and important instructions for candidates.', content: 'Railway Recruitment Board has extended the NTPC application window. Apply only through the official RRB websites of your region.' }
    ];
    const stored = this.get('blogs', null);
    if (!stored) { this.set('blogs', defaults); return defaults; }
    return stored;
  },
  saveBlog(blog) {
    const list = this.getBlogs();
    const idx = list.findIndex(b => b.id === blog.id);
    if (idx >= 0) list[idx] = blog;
    else list.unshift(blog);
    this.set('blogs', list);
  },

  // ---------- Contact messages ----------
  getMessages() {
    return this.get('messages', []);
  },
  addMessage(msg) {
    const list = this.getMessages();
    list.unshift({ ...msg, id: 'msg_' + Date.now(), date: new Date().toISOString(), read: false });
    this.set('messages', list);
  },

  // ---------- Notifications ----------
  getNotifications(uid) {
    const defaults = [
      { id: 'n1', title: 'New SSC CGL Notes uploaded', body: 'Quantitative Aptitude Shortcuts is now available.', time: Date.now() - 7200000, read: false },
      { id: 'n2', title: 'Quiz reminder', body: 'Complete today\'s Reasoning practice quiz.', time: Date.now() - 18000000, read: false },
      { id: 'n3', title: 'Haryana CET notification', body: 'Official notification has been released.', time: Date.now() - 86400000, read: true }
    ];
    return this.get('notif_' + (uid || 'guest'), defaults);
  },
  saveNotifications(uid, list) {
    this.set('notif_' + (uid || 'guest'), list);
  },
  markNotificationsRead(uid) {
    const list = this.getNotifications(uid).map(n => ({ ...n, read: true }));
    this.saveNotifications(uid, list);
    return list;
  },

  // ---------- Videos ----------
  getVideos() {
    return [
      { id: 'v1', yt: 'dQw4w9WgXcQ', title: 'SSC CGL Preparation Strategy', desc: 'Complete beginner guide to crack SSC CGL', duration: '15:30', playlist: 'SSC CGL' },
      { id: 'v2', yt: 'jNQXAC9IVRw', title: 'Percentage Tricks for Exams', desc: 'Quick calculation methods', duration: '12:45', playlist: 'SSC CGL' },
      { id: 'v3', yt: '9bZkp7q19f0', title: 'Indian Polity Basics', desc: 'Constitution fundamentals for UPSC & SSC', duration: '22:10', playlist: 'Polity' },
      { id: 'v4', yt: 'kJQP7kiw5Fk', title: 'English Grammar Tips', desc: 'Common error spotting techniques', duration: '18:00', playlist: 'English' },
      { id: 'v5', yt: 'RgKAFK5djSk', title: 'Reasoning Shortcuts', desc: 'Coding-decoding mastery', duration: '14:20', playlist: 'Reasoning' }
    ];
  },

  // ---------- Settings ----------
  getSettings() {
    return this.get('settings', {
      theme: 'light',
      lang: 'en',
      geminiKey: '',
      firebaseEnabled: false
    });
  },
  saveSettings(s) {
    this.set('settings', { ...this.getSettings(), ...s });
  },

  // ---------- Search index ----------
  // Quizzes and videos are still built into the app, so they stay local.
  // PDFs, study material and blog posts now live in the real database, so
  // this fetches them from the API instead of a hardcoded list.
  async search(query) {
    const q = (query || '').toLowerCase().trim();
    if (!q) return [];
    const results = [];

    const bank = this.getQuizBank();
    Object.values(bank).forEach(quiz => {
      if (quiz.title.toLowerCase().includes(q) || quiz.category.toLowerCase().includes(q)) {
        results.push({ type: 'Quiz', title: quiz.title, link: 'quiz.html?start=' + quiz.id, id: quiz.id });
      }
    });
    this.getVideos().forEach(v => {
      if (v.title.toLowerCase().includes(q) || v.playlist.toLowerCase().includes(q)) {
        results.push({ type: 'Video', title: v.title, link: 'videos.html?v=' + v.id, id: v.id });
      }
    });

    try {
      const [pdfs, materials, blogs] = await Promise.all([
        fetch('/api/pdfs').then(r => r.json()),
        fetch('/api/materials').then(r => r.json()),
        fetch('/api/blog').then(r => r.json())
      ]);
      pdfs.forEach(p => {
        if (p.title.toLowerCase().includes(q) || p.exam.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)) {
          results.push({ type: 'PDF', title: p.title, link: 'pdf-library.html?id=' + p.id, id: p.id });
        }
      });
      materials.forEach(m => {
        if (m.title.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)) {
          results.push({ type: 'Course', title: m.title, link: 'study-material.html?cat=' + m.category, id: m.id });
        }
      });
      blogs.forEach(b => {
        if (b.title.toLowerCase().includes(q) || b.category.toLowerCase().includes(q) || b.excerpt.toLowerCase().includes(q)) {
          results.push({ type: 'Blog', title: b.title, link: 'blog.html?id=' + b.id, id: b.id });
        }
      });
    } catch {
      // API unreachable — still return the local quiz/video matches above.
    }

    return results;
  }
};

window.DB = DB;

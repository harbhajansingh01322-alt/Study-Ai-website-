/**
 * StudyAI - Core Application
 * Auth, Theme, Language, Notifications, UI helpers
 */

const ThemeManager = {
  init() {
    const s = DB.getSettings();
    this.apply(s.theme || 'light');
    document.getElementById('theme-toggle')?.addEventListener('click', () => this.toggle());
  },
  apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    DB.saveSettings({ theme });
    const icon = document.querySelector('#theme-toggle i');
    if (icon) icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  },
  toggle() {
    const cur = document.documentElement.getAttribute('data-theme');
    this.apply(cur === 'dark' ? 'light' : 'dark');
  }
};

const I18N = {
  en: {
    'nav.home': 'Home', 'nav.study': 'Study Material', 'nav.pdf': 'PDF Library', 'nav.quiz': 'Quizzes',
    'nav.ai': 'AI Assistant', 'nav.videos': 'Videos', 'nav.planner': 'Planner', 'nav.blog': 'Blog',
    'nav.dashboard': 'Dashboard', 'nav.tools': 'Tools', 'nav.login': 'Login', 'nav.logout': 'Logout',
    'hero.title': 'Master Every Exam with', 'hero.highlight': 'AI-Powered Learning',
    'hero.subtitle': 'Complete study materials, smart quizzes, previous year papers and an AI tutor that explains like a real teacher. Built for Class 6-12, SSC, Banking, UPSC and more.',
    'hero.cta1': 'Start Learning Free', 'hero.cta2': 'Try AI Assistant',
    'search.placeholder': 'Search notes, PDFs, quizzes, videos...',
    'section.categories': 'Explore Categories', 'section.trending': 'Trending Courses',
    'section.notes': 'Featured Notes', 'section.updates': 'Latest Updates',
    'section.testimonials': 'What Students Say', 'footer.rights': 'All rights reserved.',
    'auth.login': 'Login', 'auth.signup': 'Sign Up', 'auth.email': 'Email', 'auth.password': 'Password',
    'auth.name': 'Full Name', 'auth.forgot': 'Forgot password?', 'auth.or': 'or continue with',
    'auth.welcome': 'Welcome to StudyAI', 'auth.create': 'Create Account'
  },
  hi: {
    'nav.home': 'होम', 'nav.study': 'अध्ययन सामग्री', 'nav.pdf': 'PDF लाइब्रेरी', 'nav.quiz': 'क्विज़',
    'nav.ai': 'AI सहायक', 'nav.videos': 'वीडियो', 'nav.planner': 'प्लानर', 'nav.blog': 'ब्लॉग',
    'nav.dashboard': 'डैशबोर्ड', 'nav.tools': 'टूल', 'nav.login': 'लॉगिन', 'nav.logout': 'लॉगआउट',
    'hero.title': 'हर परीक्षा में महारत हासिल करें', 'hero.highlight': 'AI-संचालित शिक्षा',
    'hero.subtitle': 'पूर्ण अध्ययन सामग्री, स्मार्ट क्विज़, पिछले वर्ष के पेपर और एक AI ट्यूटर जो असली शिक्षक की तरह समझाता है।',
    'hero.cta1': 'मुफ्त सीखना शुरू करें', 'hero.cta2': 'AI सहायक आज़माएं',
    'search.placeholder': 'नोट्स, PDF, क्विज़, वीडियो खोजें...',
    'section.categories': 'श्रेणियां देखें', 'section.trending': 'ट्रेंडिंग कोर्स',
    'section.notes': 'विशेष नोट्स', 'section.updates': 'नवीनतम अपडेट',
    'section.testimonials': 'छात्र क्या कहते हैं', 'footer.rights': 'सर्वाधिकार सुरक्षित।',
    'auth.login': 'लॉगिन', 'auth.signup': 'साइन अप', 'auth.email': 'ईमेल', 'auth.password': 'पासवर्ड',
    'auth.name': 'पूरा नाम', 'auth.forgot': 'पासवर्ड भूल गए?', 'auth.or': 'या जारी रखें',
    'auth.welcome': 'StudyAI में आपका स्वागत है', 'auth.create': 'खाता बनाएं'
  }
};

const LangManager = {
  current: 'en',
  init() {
    this.current = DB.getSettings().lang || 'en';
    this.apply(this.current);
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === this.current);
      btn.addEventListener('click', () => this.set(btn.dataset.lang));
    });
  },
  set(lang) {
    this.current = lang;
    DB.saveSettings({ lang });
    this.apply(lang);
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
  },
  apply(lang) {
    const dict = I18N[lang] || I18N.en;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key]) el.textContent = dict[key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (dict[key]) el.placeholder = dict[key];
    });
  },
  t(key) { return (I18N[this.current] || I18N.en)[key] || key; }
};

const AuthManager = {
  currentUser: null,

  init() {
    this.currentUser = DB.getCurrentUser();
    this.updateUI();
    if (window.firebaseAuth) {
      window.firebaseAuth.onAuthStateChanged(user => {
        if (user) {
          this.currentUser = {
            uid: user.uid, email: user.email,
            name: user.displayName || user.email.split('@')[0],
            role: user.email?.includes('admin') ? 'admin' : 'student',
            streak: this.currentUser?.streak || 1,
            points: this.currentUser?.points || 0,
            photoURL: user.photoURL
          };
          DB.setSession(this.currentUser);
          DB.saveUser(this.currentUser);
          this.updateUI();
        }
      });
    }
  },

  async login(email, password) {
    email = (email || '').trim().toLowerCase();
    if (!email || !password) { Toast.show('Email and password are required.', 'error'); return false; }
    if (password.length < 6) { Toast.show('Password must be at least 6 characters.', 'error'); return false; }

    if (window.firebaseAuth) {
      try {
        const cred = await window.firebaseAuth.signInWithEmailAndPassword(email, password);
        const u = cred.user;
        this.currentUser = {
          uid: u.uid, email: u.email, name: u.displayName || email.split('@')[0],
          role: email.includes('admin') ? 'admin' : 'student', streak: 1, points: 0
        };
        DB.setSession(this.currentUser);
        DB.saveUser(this.currentUser);
        this.updateUI();
        Toast.show('Login successful!', 'success');
        closeModal('auth-modal');
        return true;
      } catch (e) {
        console.warn('Firebase login:', e.message);
      }
    }

    let user = DB.findUserByEmail(email);
    if (!user) { Toast.show('No account found. Please sign up first.', 'error'); return false; }
    if (user.password !== this._hash(password)) { Toast.show('Incorrect password.', 'error'); return false; }
    const today = new Date().toDateString();
    if (user.lastLogin !== today) {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      user.streak = user.lastLogin === yesterday ? (user.streak || 0) + 1 : 1;
      user.lastLogin = today;
      DB.saveUser(user);
    }
    const session = { ...user };
    delete session.password;
    this.currentUser = session;
    DB.setSession(session);
    this.updateUI();
    Toast.show('Welcome back, ' + session.name + '!', 'success');
    closeModal('auth-modal');
    return true;
  },

  async signup(name, email, password) {
    name = (name || '').trim();
    email = (email || '').trim().toLowerCase();
    if (!name || !email || !password) { Toast.show('All fields are required.', 'error'); return false; }
    if (password.length < 6) { Toast.show('Password must be at least 6 characters.', 'error'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { Toast.show('Enter a valid email address.', 'error'); return false; }

    if (window.firebaseAuth) {
      try {
        const cred = await window.firebaseAuth.createUserWithEmailAndPassword(email, password);
        await cred.user.updateProfile({ displayName: name });
        this.currentUser = {
          uid: cred.user.uid, email, name,
          role: email.includes('admin') ? 'admin' : 'student',
          streak: 1, points: 0, lastLogin: new Date().toDateString()
        };
        DB.setSession(this.currentUser);
        DB.saveUser(this.currentUser);
        this.updateUI();
        Toast.show('Account created successfully!', 'success');
        closeModal('auth-modal');
        return true;
      } catch (e) {
        if (e.code === 'auth/email-already-in-use') { Toast.show('Email already registered. Please login.', 'error'); return false; }
        console.warn('Firebase signup:', e.message);
      }
    }

    if (DB.findUserByEmail(email)) { Toast.show('Email already registered. Please login.', 'error'); return false; }
    const user = {
      uid: 'u_' + Date.now(), email, name, password: this._hash(password),
      role: email.includes('admin') ? 'admin' : 'student',
      streak: 1, points: 0, lastLogin: new Date().toDateString(),
      createdAt: new Date().toISOString()
    };
    DB.saveUser(user);
    const session = { ...user };
    delete session.password;
    this.currentUser = session;
    DB.setSession(session);
    this.updateUI();
    Toast.show('Account created! Welcome, ' + name, 'success');
    closeModal('auth-modal');
    return true;
  },

  async googleLogin() {
    if (window.firebaseAuth && window.GoogleAuthProvider) {
      try {
        const provider = new window.GoogleAuthProvider();
        const result = await window.firebaseAuth.signInWithPopup(provider);
        const u = result.user;
        this.currentUser = {
          uid: u.uid, email: u.email, name: u.displayName || 'User',
          role: u.email?.includes('admin') ? 'admin' : 'student',
          streak: 1, points: 0, photoURL: u.photoURL
        };
        DB.setSession(this.currentUser);
        DB.saveUser(this.currentUser);
        this.updateUI();
        Toast.show('Signed in with Google!', 'success');
        closeModal('auth-modal');
        return true;
      } catch (e) {
        Toast.show('Google sign-in failed: ' + e.message, 'error');
        return false;
      }
    }
    const email = 'user' + Date.now().toString().slice(-6) + '@gmail.com';
    const user = {
      uid: 'g_' + Date.now(), email, name: 'Google User',
      role: 'student', streak: 1, points: 0,
      lastLogin: new Date().toDateString(), provider: 'google'
    };
    DB.saveUser(user);
    this.currentUser = user;
    DB.setSession(user);
    this.updateUI();
    Toast.show('Signed in successfully!', 'success');
    closeModal('auth-modal');
    return true;
  },

  async forgotPassword(email) {
    email = (email || '').trim().toLowerCase();
    if (!email) { Toast.show('Enter your email.', 'error'); return; }
    if (window.firebaseAuth) {
      try {
        await window.firebaseAuth.sendPasswordResetEmail(email);
        Toast.show('Password reset email sent. Check your inbox.', 'success');
        return;
      } catch (e) { Toast.show(e.message, 'error'); return; }
    }
    if (!DB.findUserByEmail(email)) { Toast.show('No account found with this email.', 'error'); return; }
    Toast.show('If an account exists, a reset link has been sent to ' + email, 'success');
  },

  logout() {
    if (window.firebaseAuth) window.firebaseAuth.signOut().catch(() => {});
    this.currentUser = null;
    DB.setSession(null);
    this.updateUI();
    Toast.show('Logged out successfully.', 'info');
    const p = location.pathname;
    if (p.includes('dashboard') || p.includes('admin') || p.includes('favorites')) {
      location.href = (p.includes('/pages/') || p.includes('/admin/')) ? '../index.html' : 'index.html';
    }
  },

  requireAuth() {
    if (!this.currentUser) { openModal('auth-modal'); Toast.show('Please login to continue.', 'info'); return false; }
    return true;
  },
  requireAdmin() {
    if (!this.currentUser || this.currentUser.role !== 'admin') { Toast.show('Admin access required. Login with an admin account.', 'error'); return false; }
    return true;
  },
  updateUI() {
    const loginBtn = document.getElementById('login-btn');
    const userMenu = document.getElementById('user-menu');
    const userName = document.getElementById('user-name');
    const adminLink = document.getElementById('admin-link');
    if (this.currentUser) {
      loginBtn?.classList.add('hidden');
      userMenu?.classList.remove('hidden');
      if (userName) userName.textContent = this.currentUser.name;
      if (adminLink) adminLink.style.display = this.currentUser.role === 'admin' ? 'flex' : 'none';
    } else {
      loginBtn?.classList.remove('hidden');
      userMenu?.classList.add('hidden');
    }
    NotifManager.updateBadge();
  },
  addPoints(n) {
    if (!this.currentUser) return;
    this.currentUser.points = (this.currentUser.points || 0) + n;
    DB.setSession(this.currentUser);
    DB.saveUser({ ...this.currentUser });
  },
  _hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = ((h << 5) - h) + str.charCodeAt(i) | 0;
    return 'h' + Math.abs(h).toString(36);
  }
};

const Toast = {
  show(message, type = 'info', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle' };
    toast.innerHTML = '<i class="fas ' + (icons[type] || icons.info) + '"></i><span>' + message + '</span>';
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
};

const NotifManager = {
  updateBadge() {
    const list = DB.getNotifications(AuthManager.currentUser?.uid);
    const count = list.filter(n => !n.read).length;
    document.querySelectorAll('.notif-badge').forEach(badge => {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    });
  },
  renderDropdown() {
    const el = document.getElementById('notif-list');
    if (!el) return;
    const list = DB.getNotifications(AuthManager.currentUser?.uid);
    if (!list.length) {
      el.innerHTML = '<div style="padding:1rem;color:var(--text-muted);">No notifications</div>';
      return;
    }
    el.innerHTML = list.map(n => {
      const ago = this._timeAgo(n.time);
      return '<div style="padding:0.75rem 1rem;border-top:1px solid var(--border);' + (!n.read ? 'background:rgba(99,102,241,0.06);' : '') + '">' +
        '<div style="font-weight:600;font-size:0.9rem;">' + n.title + '</div>' +
        '<div style="font-size:0.8rem;color:var(--text-secondary);">' + (n.body || '') + '</div>' +
        '<div style="font-size:0.75rem;color:var(--text-muted);margin-top:0.25rem;">' + ago + '</div></div>';
    }).join('');
  },
  markAllRead() {
    DB.markNotificationsRead(AuthManager.currentUser?.uid);
    this.updateBadge();
    this.renderDropdown();
    Toast.show('All notifications marked as read.', 'success');
  },
  _timeAgo(ts) {
    const diff = Date.now() - ts;
    if (diff < 3600000) return Math.floor(diff / 60000) + ' min ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' hours ago';
    return Math.floor(diff / 86400000) + ' days ago';
  }
};

function openModal(id) {
  document.getElementById(id)?.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
  document.body.style.overflow = '';
}
function toggleMobileNav() {
  document.getElementById('mobile-nav')?.classList.toggle('open');
}
function handleGlobalSearch(query) {
  if (!query || !query.trim()) return;
  const base = (location.pathname.includes('/pages/') || location.pathname.includes('/admin/')) ? '' : 'pages/';
  location.href = base + 'search.html?q=' + encodeURIComponent(query.trim());
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof DB === 'undefined') { console.error('Include js/db.js before main.js'); return; }
  ThemeManager.init();
  LangManager.init();
  AuthManager.init();
  NotifManager.updateBadge();

  const navbar = document.querySelector('.navbar');
  window.addEventListener('scroll', () => navbar?.classList.toggle('scrolled', window.scrollY > 20));

  document.getElementById('login-form')?.addEventListener('submit', e => {
    e.preventDefault();
    AuthManager.login(document.getElementById('login-email')?.value, document.getElementById('login-password')?.value);
  });
  document.getElementById('signup-form')?.addEventListener('submit', e => {
    e.preventDefault();
    AuthManager.signup(
      document.getElementById('signup-name')?.value,
      document.getElementById('signup-email')?.value,
      document.getElementById('signup-password')?.value
    );
  });
  document.getElementById('forgot-form')?.addEventListener('submit', e => {
    e.preventDefault();
    AuthManager.forgotPassword(document.getElementById('forgot-email')?.value);
  });

  document.querySelectorAll('[data-auth-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.authTab;
      document.querySelectorAll('[data-auth-tab]').forEach(t => {
        t.classList.remove('active');
        t.style.background = '';
        t.style.color = '';
      });
      tab.classList.add('active');
      tab.style.background = 'var(--accent-primary)';
      tab.style.color = 'white';
      document.getElementById('login-form')?.classList.toggle('hidden', target !== 'login');
      document.getElementById('signup-form')?.classList.toggle('hidden', target !== 'signup');
      document.getElementById('forgot-form')?.classList.add('hidden');
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) { overlay.classList.remove('open'); document.body.style.overflow = ''; }
    });
  });

  document.getElementById('notif-btn')?.addEventListener('click', () => {
    const dd = document.getElementById('notif-dropdown');
    if (dd) {
      dd.classList.toggle('hidden');
      if (!dd.classList.contains('hidden')) NotifManager.renderDropdown();
    }
  });
});

window.StudyAI = { ThemeManager, LangManager, AuthManager, Toast, NotifManager, openModal, closeModal, toggleMobileNav, handleGlobalSearch };
window.AuthManager = AuthManager;
window.Toast = Toast;
window.openModal = openModal;
window.closeModal = closeModal;
window.toggleMobileNav = toggleMobileNav;
window.handleGlobalSearch = handleGlobalSearch;

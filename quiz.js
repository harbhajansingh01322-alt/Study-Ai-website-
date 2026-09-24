/**
 * StudyAI Quiz Engine - Full working system
 */
const QuizEngine = {
  currentQuiz: null,
  currentIndex: 0,
  answers: [],
  timer: null,
  timeLeft: 0,
  score: 0,

  start(quizId) {
    const bank = DB.getQuizBank();
    if (!bank[quizId]) { Toast.show('Quiz not found.', 'error'); return; }
    this.currentQuiz = bank[quizId];
    this.currentIndex = 0;
    this.answers = new Array(this.currentQuiz.questions.length).fill(null);
    this.timeLeft = this.currentQuiz.timeLimit;
    this.score = 0;
    document.getElementById('quiz-select')?.classList.add('hidden');
    document.getElementById('quiz-area')?.classList.remove('hidden');
    document.getElementById('quiz-result')?.classList.add('hidden');
    this.render();
    this.startTimer();
  },

  startTimer() {
    clearInterval(this.timer);
    this.updateTimerDisplay();
    this.timer = setInterval(() => {
      this.timeLeft--;
      this.updateTimerDisplay();
      if (this.timeLeft <= 0) this.submit();
    }, 1000);
  },

  updateTimerDisplay() {
    const el = document.getElementById('quiz-timer');
    if (!el) return;
    const m = Math.floor(this.timeLeft / 60);
    const s = this.timeLeft % 60;
    el.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    el.style.color = this.timeLeft < 60 ? 'var(--danger)' : '';
  },

  render() {
    const q = this.currentQuiz.questions[this.currentIndex];
    const container = document.getElementById('question-container');
    if (!container) return;
    document.getElementById('quiz-title').textContent = this.currentQuiz.title;
    document.getElementById('q-progress').textContent =
      'Question ' + (this.currentIndex + 1) + ' of ' + this.currentQuiz.questions.length;
    const letters = ['A', 'B', 'C', 'D'];
    const opts = q.options.map((opt, i) => {
      const sel = this.answers[this.currentIndex] === i ? ' selected' : '';
      return '<button type="button" class="option-btn' + sel + '" onclick="QuizEngine.selectAnswer(' + i + ')">' +
        '<span class="option-letter">' + letters[i] + '</span><span>' + opt + '</span></button>';
    }).join('');
    const isLast = this.currentIndex === this.currentQuiz.questions.length - 1;
    container.innerHTML =
      '<div class="question-card"><div class="question-number">Question ' + (this.currentIndex + 1) +
      '</div><div class="question-text">' + q.q + '</div><div class="options-list">' + opts +
      '</div></div><div class="flex justify-between mt-3">' +
      '<button class="btn btn-secondary" onclick="QuizEngine.prev()" ' +
      (this.currentIndex === 0 ? 'disabled' : '') + '><i class="fas fa-arrow-left"></i> Previous</button>' +
      (isLast
        ? '<button class="btn btn-primary" onclick="QuizEngine.submit()">Submit Quiz</button>'
        : '<button class="btn btn-primary" onclick="QuizEngine.next()">Next <i class="fas fa-arrow-right"></i></button>') +
      '</div>';
  },

  selectAnswer(idx) {
    this.answers[this.currentIndex] = idx;
    this.render();
  },
  next() {
    if (this.currentIndex < this.currentQuiz.questions.length - 1) {
      this.currentIndex++;
      this.render();
    }
  },
  prev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.render();
    }
  },

  submit() {
    clearInterval(this.timer);
    this.score = 0;
    this.currentQuiz.questions.forEach((q, i) => {
      if (this.answers[i] === q.answer) this.score++;
    });
    const total = this.currentQuiz.questions.length;
    const percent = Math.round((this.score / total) * 100);
    const uid = AuthManager.currentUser?.uid;
    const name = AuthManager.currentUser?.name || 'Guest';

    DB.addQuizResult(uid, {
      title: this.currentQuiz.title,
      quizId: this.currentQuiz.id,
      score: this.score,
      total,
      percent
    });
    DB.addLeaderboardEntry({
      name, score: this.score, total, percent,
      quiz: this.currentQuiz.title, date: new Date().toISOString()
    });
    if (AuthManager.currentUser) AuthManager.addPoints(this.score * 10);
    this.showResult(percent, total);
  },

  showResult(percent, total) {
    document.getElementById('quiz-area')?.classList.add('hidden');
    const result = document.getElementById('quiz-result');
    if (!result) return;
    result.classList.remove('hidden');
    const emoji = percent >= 80 ? '🏆' : percent >= 50 ? '👍' : '📚';
    result.innerHTML =
      '<div class="card" style="padding:3rem;text-align:center;max-width:500px;margin:0 auto;">' +
      '<div style="font-size:4rem;margin-bottom:1rem;">' + emoji + '</div>' +
      '<h2 style="margin-bottom:0.5rem;">Quiz Completed!</h2>' +
      '<p style="color:var(--text-secondary);margin-bottom:1.5rem;">' + this.currentQuiz.title + '</p>' +
      '<div style="font-size:3rem;font-weight:800;background:var(--accent-gradient);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">' +
      this.score + '/' + total + '</div>' +
      '<div style="font-size:1.25rem;color:var(--text-secondary);margin-bottom:1.5rem;">' + percent + '% Score</div>' +
      '<div class="progress-bar" style="margin-bottom:2rem;"><div class="progress-fill" style="width:' + percent + '%"></div></div>' +
      '<div class="flex gap-3" style="justify-content:center;flex-wrap:wrap;">' +
      '<button class="btn btn-primary" onclick="QuizEngine.review()">Review Answers</button>' +
      '<button class="btn btn-secondary" onclick="location.href=location.pathname">Try Another</button>' +
      '<a href="dashboard.html" class="btn btn-outline">Dashboard</a></div></div>';
  },

  review() {
    const container = document.getElementById('quiz-result');
    const letters = ['A', 'B', 'C', 'D'];
    let html = '<h2 class="mb-3">Answer Review</h2>';
    this.currentQuiz.questions.forEach((q, i) => {
      const userAns = this.answers[i];
      const isCorrect = userAns === q.answer;
      html += '<div class="question-card mb-3"><div class="question-number">Q' + (i + 1) + ' ' +
        (isCorrect ? '✅' : '❌') + '</div><div class="question-text">' + q.q + '</div><div class="options-list">';
      q.options.forEach((opt, j) => {
        let cls = 'option-btn';
        if (j === q.answer) cls += ' correct';
        if (j === userAns && !isCorrect) cls += ' wrong';
        html += '<div class="' + cls + '" style="cursor:default;"><span class="option-letter">' + letters[j] +
          '</span><span>' + opt +
          (j === q.answer ? ' (Correct)' : '') +
          (j === userAns && !isCorrect ? ' (Your answer)' : '') +
          '</span></div>';
      });
      html += '</div></div>';
    });
    html += '<button class="btn btn-primary" onclick="location.href=location.pathname">Back to Quizzes</button>';
    container.innerHTML = html;
  }
};
window.QuizEngine = QuizEngine;

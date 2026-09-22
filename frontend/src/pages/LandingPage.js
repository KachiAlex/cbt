import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import dataService from '../services/dataService';
import './LandingPage.css';

const QUESTIONS = [
  { q: 'Which of the following best describes the relationship between force, mass and acceleration?', a: ['A. F = m ÷ a', 'B. F = m × a', 'C. F = a ÷ m', 'D. F = m + a'], sel: 1 },
  { q: 'Which unit is used to measure electric current?', a: ['A. Volt', 'B. Newton', 'C. Ampere', 'D. Joule'], sel: 2 },
  { q: 'A body moving at constant velocity has a net force of:', a: ['A. Zero', 'B. Increasing magnitude', 'C. Maximum value', 'D. Negative mass'], sel: 0 },
];

const DEMO_OPTIONS = ['A. careless', 'B. thorough', 'C. hurriedly', 'D. silently'];

const ROLE_DATA = {
  admin: { name: 'Administrator', chip: 'System healthy', m1: '18', m2: '2,416', m3: '78%', title: 'Command the entire testing operation.', desc: 'Configure institutions, create examinations, manage users, monitor activity and turn assessment data into decisions from one clear administration workspace.', list: ['Manage departments, users and permissions', 'Create assessment rules and schedules', 'View system-wide performance intelligence'] },
  examiner: { name: 'Examiner', chip: '12 drafts', m1: '42', m2: '186', m3: '81%', title: 'Build better assessments, faster.', desc: 'Create and organise question banks, assemble balanced tests, define marking rules and review outcomes without fighting the interface.', list: ['Tag questions by topic and difficulty', 'Randomise questions and answer order', 'Review item-level performance after each test'] },
  invigilator: { name: 'Invigilator', chip: '2 live rooms', m1: '2', m2: '384', m3: '7 flags', title: 'See what is happening while the exam is live.', desc: 'Monitor candidate progress, warnings, connection events and suspicious activity in real time — with the context needed to intervene appropriately.', list: ['Live candidate and session monitoring', 'Incident flags with time-stamped logs', 'Pause, resume or assist within permissions'] },
  candidate: { name: 'Candidate', chip: 'Exam ready', m1: '3', m2: '84%', m3: '2h 10m', title: 'A test screen designed for focus.', desc: 'Candidates get a calm, accessible interface with clear timing, progress, saved answers and familiar navigation — even under exam pressure.', list: ['Automatic answer saving', 'Question review and flagging', 'Responsive and keyboard-friendly controls'] },
};

const STATS = [
  { target: 120, label: 'Tests created today', suffix: '+' },
  { target: 2400, label: 'Active candidates', suffix: '+' },
  { target: 98, label: 'Completion rate', suffix: '%' },
  { target: 12, label: 'Assessment types', suffix: '+' },
];

const FEATURES = [
  { icon: '✦', title: 'Flexible Question Bank', desc: 'Create MCQ, true/false, fill-in, theory and media-rich questions. Organise by subject, topic, difficulty and learning objective.' },
  { icon: '✓', title: 'Smart Auto-Grading', desc: 'Instantly grade objective assessments while preserving configurable manual marking workflows for essays and structured answers.' },
  { icon: '⌁', title: 'Secure Test Sessions', desc: 'Timed access, candidate authentication, question randomisation, activity monitoring, configurable restrictions and audit trails.' },
  { icon: '⌘', title: 'Live Exam Control', desc: 'See active candidates, connection status, progress, warnings and session events in real time from a dedicated invigilator console.' },
  { icon: '↗', title: 'Deep Performance Analytics', desc: 'Understand pass rates, subject performance, difficult questions, completion patterns and candidate-level insights at a glance.' },
  { icon: '◎', title: 'Works Across Devices', desc: 'A polished responsive experience for desktop, tablet and mobile — ideal for labs, classrooms, training centres and remote testing.' },
];

const LandingPage = () => {
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const statsRef = useRef(null);
  const shellRef = useRef(null);

  const [scrolled, setScrolled] = useState(false);
  const [blogs, setBlogs] = useState([]);
  const [counts, setCounts] = useState(STATS.map(() => '0'));
  const countedRef = useRef(false);

  // hero exam state
  const [qi, setQi] = useState(0);
  const [selected, setSelected] = useState(QUESTIONS[0].sel);
  const [seconds, setSeconds] = useState(42 * 60 + 18);

  // demo panel state
  const [demoActive, setDemoActive] = useState(1);

  // role switcher
  const [role, setRole] = useState('admin');
  const rd = ROLE_DATA[role];

  // header scroll state
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // scroll reveals
  useEffect(() => {
    const els = rootRef.current?.querySelectorAll('.reveal') || [];
    const io = new IntersectionObserver(
      (entries) => entries.forEach(e => e.isIntersecting && e.target.classList.add('show')),
      { threshold: 0.14 }
    );
    els.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [blogs]);

  // animated counters
  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || countedRef.current) return;
      countedRef.current = true;
      const t0 = performance.now();
      const dur = 1150;
      const step = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        setCounts(STATS.map(s => Math.floor(s.target * eased).toLocaleString() + s.suffix));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // hero countdown
  useEffect(() => {
    const id = setInterval(() => setSeconds(s => s - 1), 1000);
    return () => clearInterval(id);
  }, []);

  // live blogs
  useEffect(() => {
    dataService.getBlogs()
      .then(list => setBlogs((list || []).slice(0, 3)))
      .catch(() => setBlogs([]));
  }, []);

  const timerText = [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60]
    .map(v => String(v).padStart(2, '0')).join(':');

  const nextQuestion = () => {
    const n = (qi + 1) % QUESTIONS.length;
    setQi(n);
    setSelected(QUESTIONS[n].sel);
  };

  const onHeroMouseMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    if (shellRef.current) shellRef.current.style.translate = `${x * 8}px ${y * 6}px`;
  };
  const onHeroMouseLeave = () => {
    if (shellRef.current) shellRef.current.style.translate = '0 0';
  };

  const q = QUESTIONS[qi];

  return (
    <div className="lp" ref={rootRef}>
      <header className={`site-header${scrolled ? ' scrolled' : ''}`}>
        <div className="lp-container nav">
          <Link className="logo" to="/"><img className="logo-mark" src="/logo-cbtpromax.png" alt="CBTProMax logo" /><span>CBTProMax</span></Link>
          <nav className="nav-links">
            <a href="#features">Features</a>
            <a href="#experience">Experience</a>
            <a href="#solutions">Solutions</a>
            <Link to="/blogs">Blog</Link>
            <Link to="/how-it-works">How it works</Link>
          </nav>
          <div className="nav-actions">
            <button className="btn btn-ghost" onClick={() => navigate('/admin-login')}>Sign in</button>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="lp-container hero-grid">
            <div className="hero-copy">
              <div className="eyebrow"><span className="pulse-dot"></span> Secure. Fast. Built for serious assessments.</div>
              <h1>Testing that feels <span className="gradient-text">effortless.</span><br />Results that matter.</h1>
              <p>A modern computer-based testing platform for schools, training organisations, professional bodies, recruiters and examination centres — with smart workflows for candidates, invigilators and administrators.</p>
              <div className="hero-cta">
                <button className="btn btn-primary" onClick={() => navigate('/trial')}>Create your first test <span>↗</span></button>
                <button className="btn btn-ghost" onClick={() => document.getElementById('experience')?.scrollIntoView({ behavior: 'smooth' })}><span>▶</span> See live experience</button>
              </div>
              <div className="trust-row">
                <div className="avatar-stack">
                  <div className="avatar">AO</div><div className="avatar">JM</div><div className="avatar">SK</div><div className="avatar">+2k</div>
                </div>
                <span><span className="stars">★★★★★</span><br />Trusted by growing institutions</span>
                <span>•</span><span>99.9% test uptime</span>
              </div>
            </div>

            <div className="hero-visual" onMouseMove={onHeroMouseMove} onMouseLeave={onHeroMouseLeave}>
              <div className="exam-shell" ref={shellRef}>
                <div className="browser-head">
                  <span className="dot"></span><span className="dot"></span><span className="dot"></span>
                  <div className="browser-url">cbtpromax.com/session/physics-101</div>
                </div>
                <div className="exam-body">
                  <aside className="exam-sidebar">
                    <div className="mini-brand"><img className="logo-mark" src="/logo-cbtpromax.png" alt="" /> CBT</div>
                    <div className="side-item active"></div><div className="side-item"></div><div className="side-item"></div><div className="side-item"></div>
                  </aside>
                  <div className="exam-main">
                    <div className="exam-top"><span className="subject-pill">Physics • Section A</span><span className="timer">{timerText}</span></div>
                    <div className="progress-line"><span style={{ width: `${58 + qi * 7}%` }}></span></div>
                    <div className="q-label">Question <span>{12 + qi}</span> of 40</div>
                    <div className="question">{q.q}</div>
                    <div>
                      {q.a.map((opt, i) => (
                        <div key={i} className={`option${selected === i ? ' selected' : ''}`} onClick={() => setSelected(i)}>
                          <span className="radio"></span>{opt}
                        </div>
                      ))}
                    </div>
                    <div className="exam-actions">
                      <button className="mini-btn">← Previous</button>
                      <button className="mini-btn next" onClick={nextQuestion}>Next question →</button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="float-card score-card">
                <div className="score-row"><div><small>Average score</small><div className="big">84%</div></div><span className="trend">+12%</span></div>
                <div className="spark"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
              </div>
              <div className="float-card live-card">
                <div className="live-title">Live examination <span className="live-tag">● LIVE</span></div>
                <div className="candidate"><div className="avatar">AD</div><div className="candidate-text"><b>Ada N.</b>Question 21 of 40 • Active now</div></div>
              </div>
              <div className="float-card shield-card">
                <div className="shield-icon">✓</div><b>Secure session</b><span>Identity & activity checks enabled</span>
              </div>
            </div>
          </div>
        </section>

        <div className="lp-container stats-wrap reveal" ref={statsRef}>
          <div className="stats">
            {STATS.map((s, i) => (
              <div className="stat" key={s.label}><strong>{counts[i]}</strong><span>{s.label}</span></div>
            ))}
          </div>
        </div>

        <section className="features" id="features">
          <div className="lp-container">
            <div className="section-head reveal">
              <span className="kicker">Everything in one place</span>
              <h2>Built for reliable exams — without the operational stress.</h2>
              <p>From question creation to invigilation, grading and reporting, the experience stays clean for candidates and powerful for administrators.</p>
            </div>
            <div className="feature-grid">
              {FEATURES.map(f => (
                <article className="feature-card reveal" key={f.title}>
                  <div className="f-icon">{f.icon}</div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="demo" id="experience">
          <div className="lp-container demo-grid">
            <div className="demo-copy reveal">
              <span className="kicker">Candidate experience</span>
              <h2>Calm interface. Clear focus. Zero clutter.</h2>
              <p>The testing environment keeps attention on the question, not the software. Keyboard-friendly navigation, visible timing and progress make every action obvious.</p>
              <div className="check-list">
                <div className="check-item"><span className="check">✓</span><span>Auto-save answers continuously and restore a session safely after an interruption.</span></div>
                <div className="check-item"><span className="check">✓</span><span>Allow review, flag-for-later and question navigation based on exam rules.</span></div>
                <div className="check-item"><span className="check">✓</span><span>Display accessibility-friendly typography, contrast and focused interaction states.</span></div>
              </div>
              <button className="btn btn-dark" onClick={() => navigate('/how-it-works')}>See how it works →</button>
            </div>
            <div className="demo-panel reveal">
              <div className="demo-bar"><b>English Language</b><small>18:42 remaining</small></div>
              <div className="demo-question">
                <div className="d-step">Question 08 / 30</div>
                <h3>Choose the word that best completes the sentence: “The committee reached a decision after a ___ discussion.”</h3>
                {DEMO_OPTIONS.map((o, i) => (
                  <div key={i} className={`demo-option${demoActive === i ? ' active' : ''}`} onClick={() => setDemoActive(i)}>{o}</div>
                ))}
              </div>
              <div className="demo-footer">
                <span>Answer saved automatically</span>
                <div className="mini-progress"><i className="done"></i><i className="done"></i><i className="done"></i><i></i><i></i></div>
              </div>
            </div>
          </div>
        </section>

        <section className="roles" id="solutions">
          <div className="lp-container">
            <div className="section-head reveal">
              <span className="kicker">Designed for every role</span>
              <h2>One platform. Different experiences.</h2>
              <p>Each user gets exactly the interface they need — candidates stay focused while staff get the oversight, control and intelligence to run assessments confidently.</p>
            </div>
            <div className="role-tabs reveal">
              {Object.keys(ROLE_DATA).map(r => (
                <button key={r} className={`role-tab${role === r ? ' active' : ''}`} onClick={() => setRole(r)}>{ROLE_DATA[r].name}</button>
              ))}
            </div>
            <div className="role-stage reveal">
              <div className="role-preview">
                <div className="dashboard-top">
                  <div className="hello">Good morning,<b>{rd.name}</b></div>
                  <span className="dash-chip">{rd.chip}</span>
                </div>
                <div className="dash-cards">
                  <div className="dash-card"><small>Active tests</small><b>{rd.m1}</b></div>
                  <div className="dash-card"><small>Candidates today</small><b>{rd.m2}</b></div>
                  <div className="dash-card"><small>Average score</small><b>{rd.m3}</b></div>
                </div>
                <div className="dash-graph">
                  <svg viewBox="0 0 500 130" preserveAspectRatio="none">
                    <path d="M0,105 C55,75 80,96 125,73 C175,48 210,78 250,52 C295,20 330,63 372,36 C408,14 447,35 500,12" fill="none" stroke="#6667ed" strokeWidth="4" strokeLinecap="round" />
                    <path d="M0,105 C55,75 80,96 125,73 C175,48 210,78 250,52 C295,20 330,63 372,36 C408,14 447,35 500,12 L500,130 L0,130 Z" fill="rgba(102,103,237,.08)" />
                  </svg>
                </div>
                <div className="exam-table">
                  <div className="exam-row head"><span>Assessment</span><span>Candidates</span><span>Status</span></div>
                  <div className="exam-row"><span>Physics Mock Exam</span><span>384</span><span className="status">Live</span></div>
                  <div className="exam-row"><span>English Proficiency</span><span>208</span><span className="status">Ready</span></div>
                </div>
              </div>
              <div className="role-info">
                <h3>{rd.title}</h3>
                <p>{rd.desc}</p>
                <ul>{rd.list.map(item => <li key={item}>{item}</li>)}</ul>
              </div>
            </div>
          </div>
        </section>

        {blogs.length > 0 && (
          <section className="blog-strip" id="blog">
            <div className="lp-container">
              <div className="section-head reveal">
                <span className="kicker">From the blog</span>
                <h2>Latest updates and insights.</h2>
              </div>
              <div className="blog-grid">
                {blogs.map(blog => (
                  <Link key={blog.id} to={`/blog/${blog.id}`} className="blog-card reveal">
                    <div className="blog-img">
                      {blog.imageUrl && <img src={blog.imageUrl} alt={blog.title} loading="lazy" />}
                    </div>
                    <div className="blog-body">
                      <div className="tags">{(blog.tags || [])[0] || 'Update'}</div>
                      <h3>{blog.title}</h3>
                      <p>{blog.excerpt || ''}</p>
                      <div className="blog-meta">
                        {dataService.safeToDate(blog.publishedAt)?.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="blog-more reveal">
                <Link to="/blogs" className="btn btn-ghost">View all posts →</Link>
              </div>
            </div>
          </section>
        )}

        <section className="cta-section" id="contact">
          <div className="lp-container">
            <div className="cta-box reveal">
              <div>
                <h2>Ready to modernise your CBT experience?</h2>
                <p>Launch a platform that candidates enjoy using and administrators can trust when the stakes are high.</p>
              </div>
              <button className="btn" onClick={() => navigate('/admin-login')}>Sign in to your portal →</button>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="lp-container footer-grid">
          <Link className="logo" to="/"><img className="logo-mark" src="/logo-cbtpromax.png" alt="CBTProMax logo" /><span>CBTProMax</span></Link>
          <span>© 2026 CBTProMax. Built for better assessment.</span>
          <div className="footer-links">
            <Link to="/blogs">Blog</Link>
            <Link to="/how-it-works">How it works</Link>
            <Link to="/admin-login">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

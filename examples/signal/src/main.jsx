import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

function Glyph({ kind, size = 20 }) {
  const paths = {
    grid: (
      <>
        <rect x="3" y="3" width="6" height="6" rx="1.5" />
        <rect x="15" y="3" width="6" height="6" rx="1.5" />
        <rect x="3" y="15" width="6" height="6" rx="1.5" />
        <rect x="15" y="15" width="6" height="6" rx="1.5" />
      </>
    ),
    inbox: (
      <>
        <path d="m4 4-2 11v5h20v-5L20 4Z" />
        <path d="M2 15h6l2 3h4l2-3h6" />
      </>
    ),
    check: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    search: (
      <>
        <circle cx="10" cy="10" r="6" />
        <path d="m15 15 6 6" />
      </>
    ),
    settings: (
      <>
        <path d="M4 7h16M4 17h16" />
        <circle cx="8" cy="7" r="3" />
        <circle cx="16" cy="17" r="3" />
      </>
    ),
    arrow: <path d="M4 12h16m-5-5 5 5-5 5" />,
    plus: <path d="M12 4v16M4 12h16" />,
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[kind] || paths.grid}
    </svg>
  );
}

function App() {
  const [projects, setProjects] = useState([]),
    [category, setCategory] = useState('All projects'),
    [query, setQuery] = useState('');
  const [detail, setDetail] = useState(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true);
  const [view, setView] = useState('Projects'),
    [completed, setCompleted] = useState({}),
    [saved, setSaved] = useState(false);
  const [newOpen, setNewOpen] = useState(false),
    [newName, setNewName] = useState('');
  const dialogRef = useRef(null),
    newRef = useRef(null),
    searchRef = useRef(null);
  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then(setProjects)
      .catch(() => setError('Unable to load projects.'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (detail) dialogRef.current?.showModal();
  }, [detail]);
  useEffect(() => {
    if (newOpen) newRef.current?.showModal();
  }, [newOpen]);
  const openProject = async (project) => {
    if (project.local) {
      setDetail({ ...project, tasks: [], activity: 'You created this project in the demo' });
      return;
    }
    try {
      const response = await fetch(`/api/projects/${project.id}`);
      setDetail(await response.json());
    } catch {
      setError('This project was not included in the recording. Try another project.');
    }
  };
  const visible = projects.filter(
    (p) =>
      (category === 'All projects' || p.category === category) &&
      p.name.toLowerCase().includes(query.toLowerCase()),
  );
  const toggleTask = (key) => setCompleted((current) => ({ ...current, [key]: !current[key] }));
  const taskCount = Object.values(completed).filter(Boolean).length;
  function addProject(event) {
    event.preventDefault();
    if (!newName.trim()) return;
    setProjects((previous) => [
      ...previous,
      {
        id: `local-${Date.now()}`,
        name: newName.trim(),
        category: 'Design',
        description: 'A fresh start for your next good idea.',
        color: 'mint',
        icon: '✧',
        progress: 0,
        due: 'No date',
        members: ['YOU'],
        local: true,
      },
    ]);
    setNewName('');
    setNewOpen(false);
    newRef.current.close();
    setCategory('All projects');
    setQuery('');
  }
  return (
    <div className="workspace">
      <a className="skip" href="#main">
        Skip to projects
      </a>
      <aside className="sidebar">
        <a className="logo" href="#">
          <span className="logo-mark">
            <i />
            <i />
            <i />
          </span>
          signal<span className="logo-dot">®</span>
        </a>
        <div className="space-switch">
          <span className="space-icon">S</span>
          <span>
            Studio workspace<small>Personal workspace</small>
          </span>
          <span className="chevron">⌄</span>
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav aria-label="Workspace navigation">
          {[
            ['Projects', 'grid'],
            ['My tasks', 'check'],
            ['Inbox', 'inbox'],
          ].map(([label, icon]) => (
            <button
              key={label}
              className={`nav-item ${view === label ? 'active' : ''}`}
              onClick={() => setView(label)}
            >
              <Glyph kind={icon} />
              {label}
              {label === 'Inbox' && <span className="nav-count">3</span>}
            </button>
          ))}
        </nav>
        <div className="nav-section">
          <span className="nav-label">YOUR COLLECTIONS</span>
          <button
            className="collection"
            onClick={() => {
              setView('Projects');
              setCategory('Design');
            }}
          >
            <span className="collection-dot green" />
            Design team<span>02</span>
          </button>
          <button
            className="collection"
            onClick={() => {
              setView('Projects');
              setCategory('Product');
            }}
          >
            <span className="collection-dot violet" />
            Product team<span>01</span>
          </button>
          <button
            className="collection"
            onClick={() => {
              setView('Projects');
              setCategory('Research');
            }}
          >
            <span className="collection-dot amber" />
            Research<span>01</span>
          </button>
        </div>
        <div className="sidebar-bottom">
          <div className="mini-note">
            <span className="tiny-star">✳</span>
            <strong>A little room to focus.</strong>
            <p>Good work starts with a clear space.</p>
            <button
              onClick={() => {
                setView('Projects');
                searchRef.current?.focus();
              }}
            >
              Find your next project <span>↗</span>
            </button>
          </div>
          <div className="profile">
            <span className="avatar profile-avatar">AM</span>
            <span>
              Avery Morgan<small>Studio member</small>
            </span>
            <Glyph kind="settings" size={17} />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span> <strong>{view}</strong>
          </div>
          <div className="topbar-right">
            <span className="demo-label">INTERACTIVE SAMPLE</span>
            <span className="avatar small">AM</span>
          </div>
        </header>
        <main id="main">
          <div className="eyebrow">
            <Glyph kind="sun" size={16} />
            <span>A LITTLE CLARITY, A LOT OF POSSIBILITY</span>
          </div>
          <div className="page-heading">
            <div>
              <h1>
                {view === 'Projects' ? (
                  <>
                    Make space
                    <br />
                    for <em>good work.</em>
                  </>
                ) : view === 'My tasks' ? (
                  <>
                    One thing
                    <br />
                    <em>at a time.</em>
                  </>
                ) : (
                  <>
                    Stay in
                    <br />
                    <em>the loop.</em>
                  </>
                )}
              </h1>
              <p className="intro">
                {view === 'Projects'
                  ? 'Your ideas, your people, your next big thing. All in one place.'
                  : view === 'My tasks'
                    ? 'A few small steps toward something worth making.'
                    : 'A little signal from the people you work with.'}
              </p>
            </div>
            <div className="hero-aside">
              <span className="orbital" aria-hidden="true">
                <i />
                <i />
                <i />
                <b>✳</b>
              </span>
              <span>
                LESS NOISE.
                <br />
                MORE MOMENTUM.
              </span>
            </div>
          </div>
          <section className="stats" aria-label="Workspace summary">
            <div>
              <span className="stat-label">Active projects</span>
              <strong>
                {String(projects.length).padStart(2, '0')}
                <span className="stat-pill">Moving forward ↗</span>
              </strong>
            </div>
            <div>
              <span className="stat-label">Tasks completed</span>
              <strong>
                {24 + taskCount}
                <span className="stat-context">this week</span>
              </strong>
            </div>
            <div>
              <span className="stat-label">Team members</span>
              <strong>
                04
                <span className="avatar-stack">
                  {['AM', 'JL', 'SK', 'RN'].map((m, i) => (
                    <span key={m} className={`avatar a${i}`}>
                      {m}
                    </span>
                  ))}
                </span>
              </strong>
            </div>
          </section>
          {error && (
            <div className="error" role="alert">
              {error}
              <button onClick={() => setError('')} aria-label="Dismiss error">
                ×
              </button>
            </div>
          )}
          {view === 'Projects' && (
            <>
              <div className="section-heading">
                <h2>
                  Your projects <span>{String(projects.length).padStart(2, '0')}</span>
                </h2>
                <button className="primary" onClick={() => setNewOpen(true)}>
                  <Glyph kind="plus" size={16} />
                  New project
                </button>
              </div>
              <div className="filterbar">
                <div className="filters" role="group" aria-label="Project category">
                  {['All projects', 'Design', 'Product', 'Research'].map((c) => (
                    <button
                      key={c}
                      className={category === c ? 'selected' : ''}
                      aria-pressed={category === c}
                      onClick={() => setCategory(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <label className="search">
                  <Glyph kind="search" size={15} />
                  <input
                    ref={searchRef}
                    aria-label="Search projects"
                    placeholder="Find a project…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {query && (
                    <button onClick={() => setQuery('')} aria-label="Clear search">
                      ×
                    </button>
                  )}
                </label>
              </div>
              <div className="project-grid" aria-live="polite">
                {loading ? (
                  <div className="empty">Finding your projects…</div>
                ) : visible.length ? (
                  visible.map((p) => (
                    <button
                      key={p.id}
                      className="project-card"
                      onClick={() => openProject(p)}
                      aria-label={`Open ${p.name}`}
                    >
                      <div className="card-top">
                        <span className={`project-icon ${p.color}`}>{p.icon}</span>
                        <span className="card-category">{p.category}</span>
                        <span className="card-arrow">↗</span>
                      </div>
                      <h3>{p.name}</h3>
                      <p>{p.description}</p>
                      <div className="progress-text">
                        <span>Progress</span>
                        <strong>{p.progress}%</strong>
                      </div>
                      <div className="progress-track">
                        <span style={{ width: `${p.progress}%` }} className={p.color} />
                      </div>
                      <div className="card-footer">
                        <span className="avatar-stack">
                          {p.members.map((m, i) => (
                            <span key={m} className={`avatar a${i}`}>
                              {m}
                            </span>
                          ))}
                        </span>
                        <span>
                          ◷ <span>{p.due}</span>
                        </span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="empty">
                    <span>⌕</span>
                    <h3>No projects found</h3>
                    <p>Try a different name or collection.</p>
                    <button
                      className="secondary"
                      onClick={() => {
                        setQuery('');
                        setCategory('All projects');
                      }}
                    >
                      Reset filters
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
          {view === 'My tasks' && (
            <section className="task-panel">
              <h2>A good place to start</h2>
              {[
                'Review the Atlas homepage',
                'Share feedback on Orbit',
                'Read the latest fieldnotes',
              ].map((task, i) => (
                <label key={task} className="task-row">
                  <input
                    type="checkbox"
                    checked={Boolean(completed[`home-${i}`])}
                    onChange={() => toggleTask(`home-${i}`)}
                  />
                  <span>{task}</span>
                  <small>Today</small>
                </label>
              ))}
              <p className="quiet-note">Changes in this sample stay in this session.</p>
            </section>
          )}
          {view === 'Inbox' && (
            <section className="task-panel">
              <h2>From your team</h2>
              {[
                ['JL', 'Jamie Lee', 'shared the research synthesis.'],
                ['SK', 'Sam Kim', 'added a new Orbit prototype.'],
                ['RN', 'Robin Nash', 'updated the studio library.'],
              ].map(([avatar, name, text]) => (
                <div className="inbox-row" key={name}>
                  <span className="avatar">{avatar}</span>
                  <p>
                    <strong>{name}</strong> {text}
                    <small>Earlier today</small>
                  </p>
                </div>
              ))}
              <button className="secondary" onClick={() => setSaved(true)} disabled={saved}>
                {saved ? 'You’re all caught up ✓' : 'Mark all as read'}
              </button>
            </section>
          )}
          <footer className="page-footer">
            <span>
              <i />
              Everything has a place.
            </span>
            <span>Made for a little more focus.</span>
          </footer>
        </main>
      </div>
      <dialog
        ref={dialogRef}
        onClose={() => setDetail(null)}
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current.close();
        }}
        aria-labelledby="project-title"
      >
        {detail && (
          <>
            <div className="dialog-top">
              <span className={`project-icon ${detail.color}`}>{detail.icon}</span>
              <button
                className="icon-button"
                onClick={() => dialogRef.current.close()}
                aria-label="Close project"
              >
                ×
              </button>
            </div>
            <span className="eyebrow">{detail.category} PROJECT</span>
            <h2 id="project-title">{detail.name}</h2>
            <p className="dialog-description">{detail.description}</p>
            <div className="detail-progress">
              <span>{detail.progress}% complete</span>
              <div className="progress-track">
                <span className={detail.color} style={{ width: `${detail.progress}%` }} />
              </div>
            </div>
            <h3 className="small-heading">Next steps</h3>
            {detail.tasks.length ? (
              detail.tasks.map((task, i) => (
                <label key={task} className="task-row">
                  <input
                    type="checkbox"
                    checked={Boolean(completed[`${detail.id}-${i}`])}
                    onChange={() => toggleTask(`${detail.id}-${i}`)}
                  />
                  <span>{task}</span>
                </label>
              ))
            ) : (
              <p className="quiet-note">A blank page. The best place to begin.</p>
            )}
            <div className="activity-note">
              <span className="avatar">{detail.members[0]}</span>
              <p>
                {detail.activity}
                <small>All data in this workspace is fictional.</small>
              </p>
            </div>
          </>
        )}
      </dialog>
      <dialog ref={newRef} onClose={() => setNewOpen(false)} aria-labelledby="new-title">
        <form onSubmit={addProject}>
          <div className="dialog-top">
            <span className="project-icon mint">✧</span>
            <button
              type="button"
              className="icon-button"
              onClick={() => newRef.current.close()}
              aria-label="Close new project"
            >
              ×
            </button>
          </div>
          <h2 id="new-title">A new beginning.</h2>
          <p className="dialog-description">Give your next good idea a name.</p>
          <label className="form-label">
            Project name
            <input
              autoFocus
              value={newName}
              maxLength={60}
              onChange={(e) => setNewName(e.target.value)}
              required
              placeholder="Something worth making"
            />
          </label>
          <p className="quiet-note">Demo projects are temporary and stay in this session.</p>
          <button type="submit" className="primary">
            Create project <Glyph kind="arrow" size={16} />
          </button>
        </form>
      </dialog>
    </div>
  );
}
createRoot(document.getElementById('root')).render(<App />);

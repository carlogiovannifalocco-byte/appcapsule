import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Icon, Modal, Avatars, ProjectArt, Progress } from './ui.jsx';
import './style.css';

const categories = ['All projects', 'Design', 'Product', 'Research'];
const colors = ['mint', 'purple', 'orange', 'blue'];
const initialTasks = [
  { id: 'home-0', title: 'Review the Atlas homepage', tag: 'Design', due: 'Today' },
  { id: 'home-1', title: 'Share feedback on Orbit', tag: 'Product', due: 'Today' },
  { id: 'home-2', title: 'Read the latest fieldnotes', tag: 'Research', due: 'Tomorrow' },
];
const updates = [
  {
    id: 'research',
    avatar: 'JL',
    name: 'Jamie Lee',
    text: 'shared the research synthesis.',
    project: 'fieldnotes',
    time: '12 min ago',
  },
  {
    id: 'prototype',
    avatar: 'SK',
    name: 'Sam Kim',
    text: 'added a new Orbit prototype.',
    project: 'orbit',
    time: '1 hour ago',
  },
  {
    id: 'library',
    avatar: 'RN',
    name: 'Robin Nash',
    text: 'updated the studio library.',
    project: 'studio',
    time: '2 hours ago',
  },
];

function App() {
  const [projects, setProjects] = useState([]),
    [details, setDetails] = useState({});
  const [selectedId, setSelectedId] = useState(null),
    [view, setView] = useState('Projects');
  const [category, setCategory] = useState('All projects'),
    [query, setQuery] = useState('');
  const [layout, setLayout] = useState('grid'),
    [sort, setSort] = useState('original');
  const [favorites, setFavorites] = useState([]),
    [favoriteOnly, setFavoriteOnly] = useState(false);
  const [completed, setCompleted] = useState({}),
    [tasks, setTasks] = useState(initialTasks);
  const [addedSteps, setAddedSteps] = useState({}),
    [taskFilter, setTaskFilter] = useState('All');
  const [taskDraft, setTaskDraft] = useState(''),
    [stepDraft, setStepDraft] = useState('');
  const [readUpdates, setReadUpdates] = useState([]),
    [theme, setTheme] = useState('light');
  const [focus, setFocus] = useState(false),
    [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(null),
    [error, setError] = useState('');
  const [toast, setToast] = useState(null),
    [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState(''),
    [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('Design'),
    [newColor, setNewColor] = useState('mint');
  const [commandOpen, setCommandOpen] = useState(false),
    [commandQuery, setCommandQuery] = useState('');
  const [commandIndex, setCommandIndex] = useState(0);
  const searchRef = useRef(null),
    commandDialogRef = useRef(null),
    requestId = useRef(0);

  useEffect(() => {
    let active = true;
    fetch('/api/projects')
      .then((response) => {
        if (!response.ok) throw new Error('Unable to load projects.');
        return response.json();
      })
      .then((items) => {
        if (active) setProjects(items);
      })
      .catch(() => {
        if (active) setError('Unable to load projects. Reload the demo to try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(() => {
    if (!toast || toast.undo) return;
    const timer = setTimeout(() => setToast(null), 6500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const handler = (event) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === 'k' &&
        !selectedId &&
        !newOpen
      ) {
        event.preventDefault();
        setCommandOpen((current) => !current);
        setCommandQuery('');
        setCommandIndex(0);
      }
      if (
        event.key === '/' &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !event.target.isContentEditable &&
        !/INPUT|TEXTAREA|SELECT/.test(event.target.tagName) &&
        !document.querySelector('dialog[open]')
      ) {
        event.preventDefault();
        setView('Projects');
        requestAnimationFrame(() => searchRef.current?.focus());
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedId, newOpen]);

  const notify = (message, undo) => setToast({ message, undo, id: Date.now() });
  const go = (name) => {
    setView(name);
    setQuery('');
    setCategory('All projects');
    setFavoriteOnly(false);
  };
  const openProject = async (project) => {
    const sequence = ++requestId.current;
    setStepDraft('');
    if (project.local || details[project.id]) {
      setOpening(null);
      setSelectedId(project.id);
      return;
    }
    setOpening(project.id);
    try {
      const response = await fetch(`/api/projects/${project.id}`);
      if (!response.ok) throw new Error('Missing project');
      const detail = await response.json();
      setDetails((previous) => ({ ...previous, [project.id]: detail }));
      if (sequence === requestId.current) setSelectedId(project.id);
    } catch {
      setError('This project was not included in the recording. Try another project.');
    } finally {
      if (sequence === requestId.current) setOpening(null);
    }
  };
  const toggleFavorite = (id) =>
    setFavorites((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  const toggleTask = (id) => setCompleted((current) => ({ ...current, [id]: !current[id] }));
  const projectSteps = (project) => [
    ...(details[project.id]?.tasks || []).map((title, index) => ({
      id: `${project.id}-${index}`,
      title,
    })),
    ...(addedSteps[project.id] || []),
  ];
  const progress = (project) => {
    const steps = projectSteps(project),
      total = steps.length || (project.local ? 0 : 3);
    const done = steps.filter((step) => completed[step.id]).length,
      baseline = project.progress || 0;
    return total ? Math.round(baseline + ((100 - baseline) * done) / total) : baseline;
  };
  const detail = projects.find((project) => project.id === selectedId);
  const doneCount = Object.values(completed).filter(Boolean).length,
    unread = updates.length - readUpdates.length;
  const visible = useMemo(() => {
    const result = projects.filter(
      (project) =>
        (category === 'All projects' || project.category === category) &&
        (!favoriteOnly || favorites.includes(project.id)) &&
        `${project.name} ${project.description} ${project.category}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
    );
    if (sort === 'name') result.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'progress') result.sort((a, b) => progress(b) - progress(a));
    return result;
  }, [projects, category, favoriteOnly, favorites, query, sort, completed, details, addedSteps]);
  const resetFilters = () => {
    setQuery('');
    setCategory('All projects');
    setFavoriteOnly(false);
  };
  const average = projects.length
    ? Math.round(projects.reduce((sum, project) => sum + progress(project), 0) / projects.length)
    : 0;
  const commands = [
    ...projects.map((project) => ({
      id: project.id,
      title: project.name,
      sub: `${project.category} project`,
      icon: 'grid',
      run: () => openProject(project),
    })),
    {
      id: 'create',
      title: 'Create a new project',
      sub: 'Start something good',
      icon: 'plus',
      run: () => setNewOpen(true),
    },
    {
      id: 'tasks',
      title: 'Go to my tasks',
      sub: 'Your next steps',
      icon: 'check',
      run: () => go('My tasks'),
    },
    {
      id: 'theme',
      title: theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme',
      sub: 'Make yourself comfortable',
      icon: 'sun',
      run: () => setTheme(theme === 'light' ? 'dark' : 'light'),
    },
    {
      id: 'focus',
      title: focus ? 'Leave focus mode' : 'Enter focus mode',
      sub: 'A little more room',
      icon: 'focus',
      run: () => setFocus(!focus),
    },
  ].filter((command) =>
    `${command.title} ${command.sub}`.toLowerCase().includes(commandQuery.toLowerCase()),
  );
  const chooseCommand = (command) => {
    commandDialogRef.current?.close();
    setCommandOpen(false);
    command.run();
  };
  useEffect(() => {
    if (commandOpen)
      document.querySelector('.command-option.selected')?.scrollIntoView({ block: 'nearest' });
  }, [commandIndex, commandQuery, commandOpen]);

  function addProject(event) {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    const project = {
      id: `local-${crypto.randomUUID()}`,
      name,
      description: newDescription.trim() || 'A fresh start for your next good idea.',
      category: newCategory,
      color: newColor,
      icon: '✧',
      progress: 0,
      due: 'No date',
      members: ['YOU'],
      local: true,
    };
    setProjects((current) => [project, ...current]);
    setNewOpen(false);
    setNewName('');
    setNewDescription('');
    go('Projects');
    setSort('original');
    notify(`“${name}” has a place.`, () => {
      setProjects((current) => current.filter((item) => item.id !== project.id));
      setSelectedId((current) => (current === project.id ? null : current));
      setFavorites((current) => current.filter((id) => id !== project.id));
      setAddedSteps((current) => {
        const next = { ...current };
        delete next[project.id];
        return next;
      });
      setCompleted((current) =>
        Object.fromEntries(
          Object.entries(current).filter(([id]) => !id.startsWith(`${project.id}-`)),
        ),
      );
    });
  }
  const addTask = (event) => {
    event.preventDefault();
    if (!taskDraft.trim()) return;
    const task = {
      id: `task-${crypto.randomUUID()}`,
      title: taskDraft.trim(),
      tag: 'Personal',
      due: 'Today',
    };
    setTasks((current) => [...current, task]);
    setTaskDraft('');
    setTaskFilter('All');
    notify('A small step, added.', () => {
      setTasks((current) => current.filter((item) => item.id !== task.id));
      setCompleted((current) => {
        const next = { ...current };
        delete next[task.id];
        return next;
      });
    });
  };
  const addStep = (event) => {
    event.preventDefault();
    if (!stepDraft.trim() || !detail) return;
    const step = { id: `${detail.id}-${crypto.randomUUID()}`, title: stepDraft.trim() };
    setAddedSteps((current) => ({
      ...current,
      [detail.id]: [...(current[detail.id] || []), step],
    }));
    setStepDraft('');
  };

  return (
    <div className={`workspace ${focus ? 'focus-mode' : ''}`}>
      <a className="skip" href="#main">
        Skip to projects
      </a>
      <aside className="sidebar">
        <button className="logo" onClick={() => go('Projects')} aria-label="Signal home">
          <span className="logo-mark">
            <i />
            <i />
            <i />
          </span>
          signal<span className="logo-dot">®</span>
        </button>
        <div className="space-switch">
          <span className="space-icon">S</span>
          <span>
            Studio workspace<small>A place for good ideas</small>
          </span>
          <span className="online-dot" />
        </div>
        <span className="nav-label">YOUR WORKSPACE</span>
        <nav aria-label="Workspace navigation">
          {[
            ['Projects', 'grid'],
            ['My tasks', 'check'],
            ['Inbox', 'inbox'],
          ].map(([label, icon]) => (
            <button
              key={label}
              className={`nav-item ${view === label ? 'active' : ''}`}
              aria-current={view === label ? 'page' : undefined}
              aria-label={label}
              onClick={() => go(label)}
            >
              <Icon name={icon} />
              <span>{label}</span>
              {label === 'Inbox' && unread > 0 && <span className="nav-count">{unread}</span>}
            </button>
          ))}
        </nav>
        <div className="nav-section">
          <span className="nav-label">COLLECTIONS</span>
          {categories.slice(1).map((name, index) => (
            <button
              key={name}
              className={`collection ${category === name && view === 'Projects' ? 'chosen' : ''}`}
              onClick={() => {
                go('Projects');
                setCategory(name);
              }}
            >
              <span className={`collection-dot ${colors[index]}`} />
              {name === 'Research' ? name : `${name} team`}
              <span>
                {String(projects.filter((p) => p.category === name).length).padStart(2, '0')}
              </span>
            </button>
          ))}
          <button
            className={`collection ${favoriteOnly ? 'chosen' : ''}`}
            onClick={() => {
              go('Projects');
              setFavoriteOnly(true);
            }}
          >
            <Icon name="star" size={14} />
            Saved projects<span>{favorites.length}</span>
          </button>
        </div>
        <div className="sidebar-bottom">
          <div className="mini-note">
            <Icon name="leaf" size={26} />
            <strong>A little room to focus.</strong>
            <p>Clear the edges. Find your flow.</p>
            <button onClick={() => setFocus(true)}>
              Enter focus mode <Icon name="arrow" size={15} />
            </button>
          </div>
          <div className="profile">
            <span className="avatar profile-avatar">AM</span>
            <span>
              Avery Morgan<small>Your personal studio</small>
            </span>
            <span className="online-dot" />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span>
            <strong>{view}</strong>
          </div>
          <div className="topbar-right">
            <button
              className="command-trigger"
              onClick={() => {
                setCommandQuery('');
                setCommandIndex(0);
                setCommandOpen(true);
              }}
              aria-label="Command menu"
            >
              <Icon name="search" size={16} />
              <span>Jump to anything</span>
              <kbd>{/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'} K</kbd>
            </button>
            <button
              className="icon-button"
              aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
              title="Change theme"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            >
              <Icon name={theme === 'light' ? 'moon' : 'sun'} size={18} />
            </button>
            <button
              className={`icon-button ${focus ? 'active' : ''}`}
              aria-label={focus ? 'Leave focus mode' : 'Enter focus mode'}
              aria-pressed={focus}
              onClick={() => setFocus(!focus)}
            >
              <Icon name="focus" size={18} />
            </button>
            <span className="avatar small">AM</span>
          </div>
        </header>
        <main id="main">
          <section className="hero" aria-label="Welcome to your studio">
            <div className="hero-copy">
              <div className="eyebrow">
                <span className="online-dot" />
                YOUR SPACE TO MAKE THINGS HAPPEN
              </div>
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
                  ? 'A home for your ideas. A little clarity for what comes next.'
                  : view === 'My tasks'
                    ? 'Small steps add up. Give your next one a place.'
                    : 'The people, ideas, and little wins moving things forward.'}
              </p>
              <div className="hero-meta">
                <Avatars members={['AM', 'JL', 'SK', 'RN']} />
                <span>Good things happen together.</span>
              </div>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="art-label">
                LESS NOISE.
                <br />
                MORE POSSIBILITY.
              </div>
              <div className="sculpture">
                <i />
                <i />
                <i />
                <i />
                <b>✳</b>
              </div>
              <div className="art-bottom">
                <span>STUDIO NOTES / 001</span>
                <span>↗</span>
              </div>
            </div>
          </section>
          <section className="stats" aria-label="Workspace summary">
            <div>
              <span className="stat-label">
                Active projects <Icon name="grid" size={16} />
              </span>
              <strong>
                {String(projects.length).padStart(2, '0')}
                <span className="stat-context">ideas in motion</span>
              </strong>
              <div className="stat-spark" aria-hidden="true">
                {[24, 40, 32, 53, 46, 62, 76, 67, 87, 100].map((height, i) => (
                  <i key={i} style={{ height: `${height}%` }} />
                ))}
              </div>
            </div>
            <div>
              <span className="stat-label">
                Steps completed <Icon name="check" size={16} />
              </span>
              <strong key={doneCount} className="count-enter">
                {String(doneCount).padStart(2, '0')}
                <span className="stat-context">in this session</span>
              </strong>
              <span className="stat-foot">A little progress, every day.</span>
            </div>
            <div>
              <span className="stat-label">
                Workspace progress <Icon name="leaf" size={16} />
              </span>
              <strong>
                {average}
                <small>%</small>
                <span className="stat-context">across projects</span>
              </strong>
              <Progress value={average} label="Workspace progress" />
            </div>
          </section>
          {error && (
            <div className="error" role="alert">
              {error}
              <button onClick={() => setError('')} aria-label="Dismiss error">
                <Icon name="close" size={16} />
              </button>
            </div>
          )}
          <div key={view} className="view-enter">
            {view === 'Projects' && (
              <>
                <div className="section-heading">
                  <div>
                    <span className="section-kicker">A LITTLE MOMENTUM</span>
                    <h2>
                      Your projects <span>{String(projects.length).padStart(2, '0')}</span>
                    </h2>
                  </div>
                  <button className="primary" onClick={() => setNewOpen(true)}>
                    <Icon name="plus" size={16} />
                    New project
                  </button>
                </div>
                <div className="filterbar">
                  <div className="filters" role="group" aria-label="Project category">
                    {categories.map((name) => (
                      <button
                        key={name}
                        className={category === name ? 'selected' : ''}
                        aria-pressed={category === name}
                        onClick={() => setCategory(name)}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                  <button
                    className={`save-filter ${favoriteOnly ? 'active' : ''}`}
                    aria-label="Show saved projects"
                    aria-pressed={favoriteOnly}
                    onClick={() => setFavoriteOnly(!favoriteOnly)}
                  >
                    <Icon name="star" size={15} />
                    Saved{favorites.length > 0 && <span>{favorites.length}</span>}
                  </button>
                </div>
                <div className="tools">
                  <label className="search">
                    <Icon name="search" size={17} />
                    <input
                      ref={searchRef}
                      aria-label="Search projects"
                      placeholder="Find your next good idea…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    {query ? (
                      <button
                        onClick={() => {
                          setQuery('');
                          searchRef.current.focus();
                        }}
                        aria-label="Clear search"
                      >
                        <Icon name="close" size={14} />
                      </button>
                    ) : (
                      <kbd>/</kbd>
                    )}
                  </label>
                  <label className="sort-control">
                    <span>Sort</span>
                    <select
                      aria-label="Sort projects"
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                    >
                      <option value="original">Studio order</option>
                      <option value="name">Name A–Z</option>
                      <option value="progress">Most progress</option>
                    </select>
                  </label>
                  <div className="layout-switch" role="group" aria-label="Project layout">
                    {['grid', 'list'].map((name) => (
                      <button
                        key={name}
                        className={layout === name ? 'active' : ''}
                        aria-label={`${name === 'grid' ? 'Grid' : 'List'} view`}
                        aria-pressed={layout === name}
                        onClick={() => setLayout(name)}
                      >
                        <Icon name={name} size={16} />
                      </button>
                    ))}
                  </div>
                </div>
                <p className="result-count" aria-live="polite">
                  {loading
                    ? 'Making room for your projects…'
                    : `${visible.length} ${visible.length === 1 ? 'project' : 'projects'}${favoriteOnly ? ' saved' : ' in view'}`}
                </p>
                <div
                  className={`project-grid ${layout === 'list' ? 'project-list' : ''}`}
                  aria-busy={loading}
                >
                  {loading ? (
                    Array.from({ length: 4 }, (_, index) => (
                      <div className="skeleton-card" key={index} aria-hidden="true">
                        <i />
                        <i />
                        <i />
                      </div>
                    ))
                  ) : visible.length ? (
                    visible.map((project, index) => (
                      <article
                        className={`project-card color-${project.color}`}
                        key={project.id}
                        style={{ '--card-index': Math.min(index, 8) }}
                      >
                        <button
                          className={`favorite-button ${favorites.includes(project.id) ? 'saved' : ''}`}
                          aria-label={`${favorites.includes(project.id) ? 'Unsave' : 'Save'} ${project.name}`}
                          aria-pressed={favorites.includes(project.id)}
                          onClick={() => toggleFavorite(project.id)}
                        >
                          <Icon name="star" size={17} />
                        </button>
                        <button
                          className="card-open"
                          aria-label={`Open ${project.name}`}
                          disabled={opening === project.id}
                          onClick={() => openProject(project)}
                        >
                          <ProjectArt variant={project.color} />
                          <div className="card-content">
                            <div className="card-top">
                              <span className="card-category">
                                <i />
                                {project.category}
                              </span>
                              <span className="card-arrow">
                                <Icon name="arrow" size={17} />
                              </span>
                            </div>
                            <h3>{project.name}</h3>
                            <p>{project.description}</p>
                            <div className="progress-text">
                              <span>
                                {opening === project.id ? 'Opening project…' : 'A little closer'}
                              </span>
                              <strong>{progress(project)}%</strong>
                            </div>
                            <Progress value={progress(project)} color={project.color} />
                            <div className="card-footer">
                              <Avatars members={project.members} />
                              <span>
                                <Icon name="clock" size={13} />
                                {project.due}
                              </span>
                            </div>
                          </div>
                        </button>
                      </article>
                    ))
                  ) : (
                    <div className="empty">
                      <div className="empty-art">
                        <Icon name={favoriteOnly ? 'star' : 'search'} size={32} />
                      </div>
                      <h3>
                        {favoriteOnly && !favorites.length
                          ? 'Keep the good ones close.'
                          : 'A little too quiet here.'}
                      </h3>
                      <p>
                        {favoriteOnly && !favorites.length
                          ? 'Save a project with its star. It will be waiting here.'
                          : 'Try another search or give your filters a fresh start.'}
                      </p>
                      <button className="secondary" onClick={resetFilters}>
                        Reset filters <Icon name="arrow" size={15} />
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
            {view === 'My tasks' && (
              <section className="task-panel">
                <div className="section-heading">
                  <div>
                    <span className="section-kicker">ONE SMALL STEP</span>
                    <h2>A good place to start</h2>
                  </div>
                  <span className="task-counter">
                    {tasks.filter((task) => completed[task.id]).length} / {tasks.length} done
                  </span>
                </div>
                <form className="add-task" onSubmit={addTask}>
                  <Icon name="plus" size={19} />
                  <input
                    aria-label="New task"
                    placeholder="What’s your next small step?"
                    maxLength={120}
                    value={taskDraft}
                    onChange={(e) => setTaskDraft(e.target.value)}
                  />
                  <button type="submit" className="primary" disabled={!taskDraft.trim()}>
                    Add task
                  </button>
                </form>
                <div className="filters task-filters" role="group" aria-label="Task status">
                  {['All', 'To do', 'Completed'].map((label) => (
                    <button
                      key={label}
                      aria-pressed={taskFilter === label}
                      className={taskFilter === label ? 'selected' : ''}
                      onClick={() => setTaskFilter(label)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="task-rows">
                  {tasks
                    .filter(
                      (task) =>
                        taskFilter === 'All' ||
                        Boolean(completed[task.id]) === (taskFilter === 'Completed'),
                    )
                    .map((task) => (
                      <label
                        key={task.id}
                        className={`task-row ${completed[task.id] ? 'done' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(completed[task.id])}
                          onChange={() => toggleTask(task.id)}
                        />
                        <span>
                          {task.title}
                          <small>{task.tag}</small>
                        </span>
                        <em>{task.due}</em>
                      </label>
                    ))}
                  {!tasks.some(
                    (task) =>
                      taskFilter === 'All' ||
                      Boolean(completed[task.id]) === (taskFilter === 'Completed'),
                  ) && (
                    <div className="task-empty">
                      <Icon name="check" size={30} />
                      <p>
                        {taskFilter === 'Completed'
                          ? 'Your first small win is ahead.'
                          : 'A clear list. Take a breath.'}
                      </p>
                    </div>
                  )}
                </div>
                <p className="quiet-note">
                  <span className="online-dot" />
                  Changes stay in this session. Reload for a fresh start.
                </p>
              </section>
            )}
            {view === 'Inbox' && (
              <section className="task-panel">
                <div className="section-heading">
                  <div>
                    <span className="section-kicker">A LITTLE SIGNAL</span>
                    <h2>From your team</h2>
                  </div>
                  <span className="task-counter">{unread} unread</span>
                </div>
                {updates.map((update, index) => (
                  <button
                    className={`inbox-row ${readUpdates.includes(update.id) ? 'read' : ''}`}
                    key={update.id}
                    onClick={() => {
                      setReadUpdates((current) =>
                        current.includes(update.id) ? current : [...current, update.id],
                      );
                      const project = projects.find((item) => item.id === update.project);
                      if (project) openProject(project);
                    }}
                  >
                    <span className={`avatar a${index}`}>{update.avatar}</span>
                    <span>
                      <strong>{update.name}</strong> {update.text}
                      <small>{update.time}</small>
                    </span>
                    <span className="unread-dot" />
                    <Icon name="arrow" size={16} />
                  </button>
                ))}
                <button
                  className="secondary mark-read"
                  disabled={!unread}
                  onClick={() => {
                    const previous = readUpdates;
                    setReadUpdates(updates.map((update) => update.id));
                    notify('You’re all caught up.', () => setReadUpdates(previous));
                  }}
                >
                  {unread ? 'Mark all as read' : 'You’re all caught up ✓'}
                </button>
              </section>
            )}
          </div>
          <footer className="page-footer">
            <span>
              <span className="online-dot" />A fictional workspace. Real interactions.
            </span>
            <span>
              Made for a little more focus. <Icon name="leaf" size={14} />
            </span>
          </footer>
        </main>
      </div>
      <Modal
        open={Boolean(detail)}
        onClose={() => setSelectedId(null)}
        titleId="project-title"
        className="project-dialog"
      >
        {detail && (
          <>
            <div className="dialog-cover">
              <ProjectArt variant={detail.color} large />
              <button
                className="icon-button dialog-close"
                onClick={() => setSelectedId(null)}
                aria-label="Close project"
              >
                <Icon name="close" size={18} />
              </button>
            </div>
            <div className="dialog-body">
              <div className="detail-eyebrow">
                <span className="eyebrow">{detail.category} PROJECT</span>
                <button
                  className={`detail-save ${favorites.includes(detail.id) ? 'saved' : ''}`}
                  aria-pressed={favorites.includes(detail.id)}
                  onClick={() => toggleFavorite(detail.id)}
                >
                  <Icon name="star" size={16} />
                  {favorites.includes(detail.id) ? 'Saved' : 'Save project'}
                </button>
              </div>
              <h2 id="project-title">{detail.name}</h2>
              <p className="dialog-description">{detail.description}</p>
              <div className="detail-progress">
                <span>Getting there</span>
                <strong>{progress(detail)}% complete</strong>
                <Progress value={progress(detail)} color={detail.color} />
              </div>
              <div className="steps-heading">
                <h3>Next steps</h3>
                <span>
                  {projectSteps(detail).filter((step) => completed[step.id]).length} /{' '}
                  {projectSteps(detail).length}
                </span>
              </div>
              {projectSteps(detail).map((step) => (
                <label key={step.id} className={`task-row ${completed[step.id] ? 'done' : ''}`}>
                  <input
                    type="checkbox"
                    checked={Boolean(completed[step.id])}
                    onChange={() => toggleTask(step.id)}
                  />
                  <span>{step.title}</span>
                </label>
              ))}
              {!projectSteps(detail).length && (
                <p className="quiet-note">A blank page. Add the first small step below.</p>
              )}
              <form className="step-form" onSubmit={addStep}>
                <input
                  aria-label="New project step"
                  placeholder="Add a small next step…"
                  maxLength={120}
                  value={stepDraft}
                  onChange={(e) => setStepDraft(e.target.value)}
                />
                <button
                  className="icon-button"
                  aria-label="Add project step"
                  disabled={!stepDraft.trim()}
                >
                  <Icon name="plus" size={17} />
                </button>
              </form>
              <div className="activity-note">
                <Avatars members={detail.members} />
                <p>
                  {details[detail.id]?.activity || 'You gave a new idea a place.'}
                  <small>All changes stay in this demo session.</small>
                </p>
              </div>
            </div>
          </>
        )}
      </Modal>
      <Modal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        titleId="new-title"
        className="new-dialog"
      >
        <form onSubmit={addProject}>
          <div className="dialog-top">
            <span className="dialog-symbol">
              <Icon name="leaf" size={27} />
            </span>
            <button
              type="button"
              className="icon-button"
              onClick={() => setNewOpen(false)}
              aria-label="Close new project"
            >
              <Icon name="close" size={18} />
            </button>
          </div>
          <span className="eyebrow">MAKE ROOM FOR SOMETHING GOOD</span>
          <h2 id="new-title">A new beginning.</h2>
          <p className="dialog-description">A name, a little intention, and room to grow.</p>
          <label className="form-label">
            Project name
            <input
              data-autofocus
              maxLength={60}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              placeholder="Something worth making"
            />
          </label>
          <label className="form-label">
            A little description <span className="optional">optional</span>
            <textarea
              maxLength={180}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="What would you like to bring into the world?"
              rows={2}
            />
          </label>
          <div className="form-bottom">
            <label className="form-label">
              Collection
              <select
                aria-label="Collection"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              >
                {categories.slice(1).map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>
            <fieldset className="color-picker">
              <legend>Make it yours</legend>
              {colors.map((color) => (
                <button
                  type="button"
                  key={color}
                  className={`color-option ${color} ${newColor === color ? 'selected' : ''}`}
                  aria-label={`${color} project color`}
                  aria-pressed={newColor === color}
                  onClick={() => setNewColor(color)}
                >
                  {newColor === color && <Icon name="check" size={17} />}
                </button>
              ))}
            </fieldset>
          </div>
          <div className="form-actions">
            <span>Temporary. Thoughtfully yours.</span>
            <button type="submit" className="primary" disabled={!newName.trim()}>
              Create project <Icon name="arrow" size={16} />
            </button>
          </div>
        </form>
      </Modal>
      <Modal
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        titleId="command-title"
        className="command-dialog"
        dialogRef={commandDialogRef}
      >
        <h2 id="command-title" className="sr-only">
          Jump to anything
        </h2>
        <div className="command-search">
          <Icon name="search" size={22} />
          <input
            data-autofocus
            aria-label="Find a project or action"
            value={commandQuery}
            placeholder="A project, a task, a little possibility…"
            onChange={(event) => {
              setCommandQuery(event.target.value);
              setCommandIndex(0);
            }}
            onKeyDown={(event) => {
              if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
                event.preventDefault();
                setCommandIndex((index) =>
                  commands.length
                    ? (index + (event.key === 'ArrowDown' ? 1 : -1) + commands.length) %
                      commands.length
                    : 0,
                );
              }
              if (event.key === 'Enter' && commands[commandIndex]) {
                event.preventDefault();
                chooseCommand(commands[commandIndex]);
              }
            }}
            aria-controls="command-results"
            aria-activedescendant={
              commands[commandIndex] ? `command-${commands[commandIndex].id}` : undefined
            }
            role="combobox"
            aria-expanded="true"
            aria-autocomplete="list"
          />
          <button
            className="escape-key"
            onClick={() => setCommandOpen(false)}
            aria-label="Close command menu"
          >
            esc
          </button>
        </div>
        <div
          id="command-results"
          className="command-results"
          role="listbox"
          aria-label="Projects and actions"
        >
          {commands.map((command, index) => (
            <div
              id={`command-${command.id}`}
              role="option"
              aria-selected={index === commandIndex}
              key={command.id}
              className={`command-option ${index === commandIndex ? 'selected' : ''}`}
              onPointerMove={() => setCommandIndex(index)}
              onClick={() => chooseCommand(command)}
            >
              <Icon name={command.icon} size={19} />
              <span>
                {command.title}
                <small>{command.sub}</small>
              </span>
              <span className="command-enter">↵</span>
            </div>
          ))}
          {!commands.length && (
            <p className="command-empty">No matches. Try a project name or “theme”.</p>
          )}
        </div>
        <div className="command-footer">
          <span>
            ↑ ↓ to explore <span>↵ to go</span>
          </span>
          <span>YOUR STUDIO, A LITTLE CLOSER</span>
        </div>
      </Modal>
      <div className="toast-slot" aria-live="polite" aria-atomic="true">
        {toast && (
          <div className="app-toast" key={toast.id}>
            <span className="toast-mark">
              <Icon name="check" size={18} />
            </span>
            <span>{toast.message}</span>
            {toast.undo && (
              <button
                onClick={() => {
                  toast.undo();
                  setToast(null);
                }}
              >
                Undo
              </button>
            )}
            <button
              className="toast-dismiss"
              aria-label="Dismiss notification"
              onClick={() => setToast(null)}
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);

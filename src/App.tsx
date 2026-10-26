import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api, getAuthToken } from './api';
import type { Application, ApplicationInput, ReviewerUser } from './types';

type View = 'apply' | 'review';

const emptyForm: ApplicationInput = {
  fullName: '',
  email: '',
  education: '',
  experienceYears: 0,
  programmingBackground: '',
  statement: '',
};

interface DecisionModalState {
  isOpen: boolean;
  decision: Application['decision'] | null;
  note: string;
}

export default function App() {
  const [view, setView] = useState<View>('apply');
  const [reviewerUser, setReviewerUser] = useState<ReviewerUser | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  // Reviewer login form state
  const [loginUsername, setLoginUsername] = useState('admissions');
  const [loginPassword, setLoginPassword] = useState('compro2026');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Applications and review state
  const [applications, setApplications] = useState<Application[]>([]);
  const [form, setForm] = useState<ApplicationInput>(emptyForm);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [decisionModal, setDecisionModal] = useState<DecisionModalState>({
    isOpen: false,
    decision: null,
    note: '',
  });

  // Check initial session
  useEffect(() => {
    async function checkAuth() {
      if (getAuthToken()) {
        try {
          const user = await api.me();
          setReviewerUser(user);
          void loadApplications();
        } catch {
          setReviewerUser(null);
        }
      }
      setAuthChecking(false);
    }
    void checkAuth();
  }, []);

  async function loadApplications() {
    setLoading(true);
    setError('');
    try {
      const data = await api.list();
      setApplications(data);
      if (data.length > 0 && selectedId === null) {
        setSelectedId(data[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load applications.');
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return applications;
    return applications.filter(a =>
      `${a.fullName} ${a.email} ${a.education}`.toLowerCase().includes(q)
    );
  }, [applications, search]);

  const current = useMemo(() => {
    if (selectedId !== null) {
      const found = applications.find(a => a.id === selectedId);
      if (found) return found;
    }
    return filtered.length > 0 ? filtered[0] : null;
  }, [applications, filtered, selectedId]);

  const pendingCount = applications.filter(a => a.decision === 'PENDING').length;

  function update<K extends keyof ApplicationInput>(key: K, value: ApplicationInput[K]) {
    setForm(previous => ({ ...previous, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const created = await api.submit(form);
      if (reviewerUser) {
        setApplications(previous => [created, ...previous]);
        setSelectedId(created.id);
      }
      setForm(emptyForm);
      setNotice(
        `Application successfully submitted! Reference ID #${created.id}. Initial screening score: ${created.screening.score}/100 (${created.screening.recommendation}).`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await api.login(loginUsername, loginPassword);
      setReviewerUser(res.user);
      setNotice(`Welcome back, ${res.user.name}.`);
      void loadApplications();
    } catch (e) {
      setLoginError(e instanceof Error ? e.message : 'Authentication failed.');
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleLogout() {
    await api.logout();
    setReviewerUser(null);
    setApplications([]);
    setSelectedId(null);
    setNotice('You have been signed out of the reviewer portal.');
  }

  function openDecisionModal(decision: Application['decision']) {
    if (!current) return;
    setDecisionModal({
      isOpen: true,
      decision,
      note: current.reviewerNote ?? '',
    });
  }

  async function handleConfirmDecision() {
    if (!current || !decisionModal.decision) return;
    setLoading(true);
    setError('');
    try {
      const updated = await api.decide(current.id, decisionModal.decision, decisionModal.note);
      setApplications(previous => previous.map(a => (a.id === updated.id ? updated : a)));
      setNotice(`Recorded decision: ${decisionModal.decision} for applicant ${current.fullName}.`);
      setDecisionModal({ isOpen: false, decision: null, note: '' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save decision.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button
          className="brand"
          onClick={() => setView('apply')}
          aria-label="Maharishi University COMPRO Home"
        >
          <span className="brand-mark">M</span>
          <span>
            MAHARISHI UNIVERSITY <small>COMPRO ADMISSIONS</small>
          </span>
        </button>
        <nav aria-label="Main navigation">
          <button
            className={`nav-link ${view === 'apply' ? 'active' : ''}`}
            onClick={() => setView('apply')}
          >
            Application
          </button>
          <button
            className={`nav-link ${view === 'review' ? 'active' : ''}`}
            onClick={() => {
              setView('review');
              if (reviewerUser) void loadApplications();
            }}
          >
            Reviewer portal{' '}
            {reviewerUser ? (
              <span className="nav-count">{pendingCount}</span>
            ) : (
              <span className="nav-count" title="Protected">🔒</span>
            )}
          </button>
        </nav>

        {reviewerUser ? (
          <div className="topbar-user">
            <div className="user-badge">
              <strong>{reviewerUser.name}</strong>
              <small>{reviewerUser.role}</small>
            </div>
            <button
              className="signout-button"
              onClick={handleLogout}
              title="Sign out of Reviewer Portal"
            >
              Sign out
            </button>
            <div className="avatar" title={`Signed in as ${reviewerUser.username}`}>
              {reviewerUser.username.slice(0, 2).toUpperCase()}
            </div>
          </div>
        ) : (
          <div className="avatar" title="COMPRO Admissions Committee">
            CP
          </div>
        )}
      </header>

      <main>
        {error && (
          <div className="alert error" role="alert">
            <span>{error}</span>
            <button onClick={() => setError('')}>Dismiss</button>
          </div>
        )}
        {notice && (
          <div className="alert success" role="status">
            <span>{notice}</span>
            <button onClick={() => setNotice('')}>Dismiss</button>
          </div>
        )}

        {view === 'apply' ? (
          <>
            <section className="hero">
              <div className="eyebrow">
                <span className="dot" /> APPLICATION PORTAL <span className="eyebrow-line" />
              </div>
              <h1>
                Build what<br />
                <em>comes next.</em>
              </h1>
              <p className="hero-copy">
                Apply to the Computer Professionals (COMPRO) Program at Maharishi University. Tell
                us about your academic background, programming experience, and what you hope to
                achieve.
              </p>
              <div className="hero-meta">
                <span>01 — YOUR DETAILS</span>
                <span>02 — YOUR BACKGROUND</span>
                <span>03 — YOUR STATEMENT</span>
              </div>
            </section>

            <section className="form-layout">
              <form className="application-form" onSubmit={submit}>
                <div className="section-heading">
                  <div>
                    <span className="section-index">01</span>
                    <h2>About you</h2>
                  </div>
                  <span className="required-note">* Required</span>
                </div>
                <div className="field-grid">
                  <label>
                    Full name <b>*</b>
                    <input
                      required
                      maxLength={120}
                      value={form.fullName}
                      onChange={e => update('fullName', e.target.value)}
                      placeholder="Your full legal name"
                    />
                  </label>
                  <label>
                    Email address <b>*</b>
                    <input
                      required
                      type="email"
                      maxLength={254}
                      value={form.email}
                      onChange={e => update('email', e.target.value)}
                      placeholder="you@example.com"
                    />
                  </label>
                  <label className="span-two">
                    Education <b>*</b>
                    <input
                      required
                      maxLength={240}
                      value={form.education}
                      onChange={e => update('education', e.target.value)}
                      placeholder="Degree, major, institution, graduation year"
                    />
                  </label>
                  <label>
                    Relevant experience <span className="muted">(years)</span>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={form.experienceYears}
                      onChange={e => update('experienceYears', Number(e.target.value))}
                    />
                  </label>
                </div>

                <div className="section-heading second">
                  <div>
                    <span className="section-index">02</span>
                    <h2>Technical background</h2>
                  </div>
                </div>
                <label className="block-label">
                  Programming experience <span className="muted">— languages, projects, or tools</span>
                  <textarea
                    required
                    minLength={20}
                    maxLength={2000}
                    rows={4}
                    value={form.programmingBackground}
                    onChange={e => update('programmingBackground', e.target.value)}
                    placeholder="Describe your technical background: programming languages, enterprise stacks, databases, frameworks, or key software projects you have developed..."
                  />
                  <span className="field-hint">
                    At least 20 characters · {form.programmingBackground.length}/2000
                  </span>
                </label>

                <div className="section-heading second">
                  <div>
                    <span className="section-index">03</span>
                    <h2>Your statement</h2>
                  </div>
                </div>
                <label className="block-label">
                  Why COMPRO? <b>*</b>
                  <textarea
                    required
                    minLength={40}
                    maxLength={3000}
                    rows={6}
                    value={form.statement}
                    onChange={e => update('statement', e.target.value)}
                    placeholder="Explain your goals for graduate computer science studies, interest in Maharishi University's consciousness-based education, and your professional aspirations in software engineering..."
                  />
                  <span className="field-hint">
                    At least 40 characters · {form.statement.length}/3000
                  </span>
                </label>

                <div className="form-footer">
                  <p>By submitting, you confirm that the information provided is accurate and authentic.</p>
                  <button className="primary-button" type="submit" disabled={loading}>
                    {loading ? 'Submitting…' : 'Submit application'} <span>↗</span>
                  </button>
                </div>
              </form>

              <aside className="side-note">
                <span className="note-icon">✳</span>
                <h3>A thoughtful review starts with a clear picture.</h3>
                <p>
                  Include specific examples of your work and technical accomplishments. Applications
                  are reviewed carefully by the admissions committee; our algorithmic screening
                  provides advisory heuristic recommendations only.
                </p>
                <div className="side-rule" />
                <p className="privacy-note">
                  Your application data is handled strictly for Maharishi COMPRO admissions evaluation.
                </p>
              </aside>
            </section>
          </>
        ) : !reviewerUser ? (
          /* Reviewer Login Screen */
          <section className="reviewer-login-wrapper">
            <div className="reviewer-login-header">
              <span className="reviewer-login-badge">
                🔒 Admissions Committee Access Only
              </span>
              <h2>Reviewer Portal</h2>
              <p>
                Sign in with your faculty or reviewer credentials to inspect candidate dossiers and record decisions.
              </p>
            </div>

            {loginError && (
              <div className="alert error" role="alert" style={{ marginBottom: 16 }}>
                <span>{loginError}</span>
              </div>
            )}

            <form className="login-form" onSubmit={handleLogin}>
              <label>
                Username
                <input
                  required
                  type="text"
                  autoComplete="username"
                  value={loginUsername}
                  onChange={e => setLoginUsername(e.target.value)}
                  placeholder="e.g. admissions"
                />
              </label>

              <label>
                Password
                <div className="password-input-wrap">
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="pwd-toggle-btn"
                    onClick={() => setShowPassword(p => !p)}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </label>

              <button className="primary-button" type="submit" disabled={loginLoading}>
                {loginLoading ? 'Authenticating…' : 'Sign in to Reviewer Portal'}
              </button>

              <div className="demo-account-hint">
                <div>
                  <strong>Default Reviewer:</strong> <code>admissions</code> /{' '}
                  <code>compro2026</code>
                </div>
                <button
                  type="button"
                  className="demo-fill-btn"
                  onClick={() => {
                    setLoginUsername('admissions');
                    setLoginPassword('compro2026');
                    setLoginError('');
                  }}
                >
                  Fill Demo
                </button>
              </div>
            </form>
          </section>
        ) : (
          /* Reviewer Portal Dashboard */
          <>
            <section className="review-header">
              <div>
                <div className="eyebrow">
                  <span className="dot" /> ADMISSIONS TEAM · LOGGED IN AS {reviewerUser.name.toUpperCase()}
                </div>
                <h1>
                  Review <em>applications.</em>
                </h1>
                <p>
                  Screening results provide heuristic decision support. The admissions team reviews
                  the dossier and records the final decision.
                </p>
              </div>
              <button
                className="secondary-button"
                onClick={() => void loadApplications()}
                disabled={loading}
              >
                {loading ? '↻ Refreshing…' : '↻ Refresh'}
              </button>
            </section>

            <section className="dashboard-stats">
              <Stat label="Total applications" value={applications.length} />
              <Stat label="Awaiting decision" value={pendingCount} />
              <Stat
                label="Recommended accept"
                value={applications.filter(a => a.screening.recommendation === 'ACCEPT').length}
              />
              <Stat
                label="Need closer review"
                value={applications.filter(a => a.screening.recommendation === 'REVIEW').length}
              />
            </section>

            <section className="review-grid">
              <div className="applicant-list">
                <div className="list-toolbar">
                  <h2>
                    Applicants <span>{filtered.length}</span>
                  </h2>
                  <input
                    aria-label="Search applicants"
                    placeholder="Search by name, email, or education..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                {loading && applications.length === 0 ? (
                  <p className="empty-state">Loading applications…</p>
                ) : filtered.length === 0 ? (
                  <p className="empty-state">No matching applications found.</p>
                ) : (
                  filtered.map(a => (
                    <button
                      key={a.id}
                      className={`applicant-row ${current?.id === a.id ? 'selected' : ''}`}
                      onClick={() => setSelectedId(a.id)}
                    >
                      <span className="initials">
                        {a.fullName
                          .split(/\s+/)
                          .map(n => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()}
                      </span>
                      <span className="applicant-info">
                        <strong>{a.fullName}</strong>
                        <small>{a.education}</small>
                      </span>
                      <span className={`status-chip ${a.decision.toLowerCase()}`}>
                        {a.decision.replace('_', ' ')}
                      </span>
                    </button>
                  ))
                )}
              </div>

              {current ? (
                <ApplicantDetail application={current} onDecision={openDecisionModal} />
              ) : (
                <div className="detail-empty">Select an application from the list to review.</div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Decision Reviewer Modal Dialog */}
      {decisionModal.isOpen && decisionModal.decision && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="modal-header">
              <span className="detail-kicker">ADMISSIONS DECISION CONFIRMATION</span>
              <h3>
                {decisionModal.decision === 'ACCEPTED' && 'Accept Applicant'}
                {decisionModal.decision === 'FOLLOW_UP' && 'Request Follow-up Information'}
                {decisionModal.decision === 'REJECTED' && 'Reject Application'}
              </h3>
              <p>
                Recording decision for <strong>{current?.fullName}</strong> (#{current?.id})
              </p>
            </div>
            <div className="modal-body">
              <label className="block-label">
                Reviewer Note <span className="muted">(optional evaluation feedback)</span>
                <textarea
                  rows={4}
                  maxLength={2000}
                  value={decisionModal.note}
                  onChange={e =>
                    setDecisionModal(prev => ({ ...prev, note: e.target.value }))
                  }
                  placeholder="Enter comments on technical fit, interview prerequisites, or rationale for this outcome..."
                />
              </label>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setDecisionModal({ isOpen: false, decision: null, note: '' })}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={handleConfirmDecision}
                disabled={loading}
              >
                {loading ? 'Saving…' : `Confirm ${decisionModal.decision.replace('_', ' ')}`}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer>
        <span>MAHARISHI UNIVERSITY OF MANAGEMENT</span>
        <span>COMPRO · ADMISSIONS</span>
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value.toString().padStart(2, '0')}</strong>
    </div>
  );
}

function ApplicantDetail({
  application: a,
  onDecision,
}: {
  application: Application;
  onDecision: (decision: Application['decision']) => void;
}) {
  const date = new Date(a.submittedAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <article className="detail-panel">
      <div className="detail-top">
        <div>
          <span className="detail-kicker">
            APPLICATION #{a.id} · SUBMITTED {date.toUpperCase()}
          </span>
          <h2>{a.fullName}</h2>
          <a href={`mailto:${a.email}`}>{a.email}</a>
        </div>
        <span className={`recommendation ${a.screening.recommendation.toLowerCase()}`}>
          {a.screening.recommendation}
          <small>HEURISTIC</small>
        </span>
      </div>

      <div className="score-band">
        <div>
          <span>SCREENING SCORE</span>
          <strong>
            {a.screening.score}
            <small>/100</small>
          </strong>
        </div>
        <p>{a.screening.summary}</p>
      </div>

      <div className="criteria">
        <h3>Screening breakdown</h3>
        {a.screening.criteria.map(c => (
          <div className="criterion" key={c.name}>
            <div className="criterion-head">
              <strong>{c.name}</strong>
              <span>
                {c.points}
                <small>/{c.maxPoints}</small>
              </span>
            </div>
            <div className="progress">
              <i style={{ width: `${Math.round((c.points / c.maxPoints) * 100)}%` }} />
            </div>
            <p>{c.explanation}</p>
          </div>
        ))}
      </div>

      <div className="answers">
        <h3>Applicant profile</h3>
        <div>
          <span>Education</span>
          <p>{a.education}</p>
        </div>
        <div>
          <span>Relevant experience</span>
          <p>{a.experienceYears} years</p>
        </div>
        <div>
          <span>Programming background</span>
          <p>{a.programmingBackground}</p>
        </div>
        <div>
          <span>Statement</span>
          <p>{a.statement}</p>
        </div>
      </div>

      {a.reviewerNote && (
        <div className="reviewer-note">
          <strong>Reviewer note:</strong>
          <p>{a.reviewerNote}</p>
        </div>
      )}

      <div className="decision-area">
        <div>
          <h3>Record final decision</h3>
          <p>Choose the admissions outcome after reviewing the complete application.</p>
        </div>
        <div className="decision-buttons">
          <button className="btn-accept" onClick={() => onDecision('ACCEPTED')}>
            Accept
          </button>
          <button className="btn-followup" onClick={() => onDecision('FOLLOW_UP')}>
            Request follow-up
          </button>
          <button className="btn-reject" onClick={() => onDecision('REJECTED')}>
            Reject
          </button>
        </div>
      </div>
    </article>
  );
}

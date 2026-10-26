import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type Decision = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'FOLLOW_UP';
type Recommendation = 'ACCEPT' | 'REVIEW' | 'REJECT';

interface CriterionResult {
  name: string;
  points: number;
  maxPoints: number;
  explanation: string;
}

interface ScreeningResult {
  score: number;
  recommendation: Recommendation;
  criteria: CriterionResult[];
  summary: string;
}

interface Application {
  id: number;
  fullName: string;
  email: string;
  education: string;
  experienceYears: number;
  programmingBackground: string;
  statement: string;
  submittedAt: string;
  screening: ScreeningResult;
  decision: Decision;
  reviewerNote: string | null;
}

function evaluateScreening(input: {
  experienceYears: number;
  programmingBackground: string;
  statement: string;
}): ScreeningResult {
  const completeness = 20;
  const experience = Math.min(30, Math.max(0, input.experienceYears * 3));

  const bgLen = (input.programmingBackground || '').trim().length;
  let programming = 5;
  if (bgLen >= 300) programming = 20;
  else if (bgLen >= 160) programming = 15;
  else if (bgLen >= 80) programming = 10;

  const stmtLen = (input.statement || '').trim().length;
  let statement = 10;
  if (stmtLen >= 500) statement = 30;
  else if (stmtLen >= 250) statement = 24;
  else if (stmtLen >= 100) statement = 18;

  const score = completeness + experience + programming + statement;

  let recommendation: Recommendation = 'REVIEW';
  if (score >= 75) recommendation = 'ACCEPT';
  else if (score < 40) recommendation = 'REJECT';

  let summary = '';
  switch (recommendation) {
    case 'ACCEPT':
      summary = 'Meets the starter rubric threshold for a positive recommendation; reviewer confirmation is required.';
      break;
    case 'REVIEW':
      summary = "The application falls in the rubric's review range; consider the full context before deciding.";
      break;
    case 'REJECT':
      summary = 'The application falls below the starter rubric threshold; verify the record and criteria before deciding.';
      break;
  }

  const criteria: CriterionResult[] = [
    {
      name: 'Application completeness',
      points: completeness,
      maxPoints: 20,
      explanation: 'All required application fields are present.',
    },
    {
      name: 'Relevant experience',
      points: experience,
      maxPoints: 30,
      explanation: 'Three points per reported year, capped at ten years for this screening score.',
    },
    {
      name: 'Programming background',
      points: programming,
      maxPoints: 20,
      explanation: 'Based on the amount of detail provided, not automated assessment of technical ability.',
    },
    {
      name: 'Statement completeness',
      points: statement,
      maxPoints: 30,
      explanation: 'Based on statement length; reviewers should assess its substance and fit.',
    },
  ];

  return { score, recommendation, criteria, summary };
}

// Initial seed data with authentic applications for Maharishi COMPRO program
let nextId = 1;
const applicationsStore: Application[] = [
  {
    id: nextId++,
    fullName: 'Maya Lin',
    email: 'maya.lin@example.com',
    education: 'B.S. in Computer Science, University of California, Berkeley',
    experienceYears: 4,
    programmingBackground:
      'Four years working as a full-stack engineer developing distributed React and Node.js microservices. Experienced with Java/Spring Boot, PostgreSQL, Docker, and AWS deployments. Built scalable transaction pipelines processing over 2M requests daily and spearheaded automated CI/CD unit testing.',
    statement:
      'I am applying to the Maharishi COMPRO program to deepen my theoretical foundations in software architecture and algorithms while advancing my career in a mindful, collaborative community. The unique blend of rigorous graduate computer science coursework with Transcendental Meditation aligns with my aspiration to build sustainable, human-centric software solutions that scale globally.',
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
    screening: evaluateScreening({
      experienceYears: 4,
      programmingBackground:
        'Four years working as a full-stack engineer developing distributed React and Node.js microservices. Experienced with Java/Spring Boot, PostgreSQL, Docker, and AWS deployments. Built scalable transaction pipelines processing over 2M requests daily and spearheaded automated CI/CD unit testing.',
      statement:
        'I am applying to the Maharishi COMPRO program to deepen my theoretical foundations in software architecture and algorithms while advancing my career in a mindful, collaborative community. The unique blend of rigorous graduate computer science coursework with Transcendental Meditation aligns with my aspiration to build sustainable, human-centric software solutions that scale globally.',
    }),
    decision: 'ACCEPTED',
    reviewerNote: 'Outstanding background, solid GPA and recommendation letters. Verified degree and 4 years full-stack experience.',
  },
  {
    id: nextId++,
    fullName: 'David O’Connor',
    email: 'doconnor@example.org',
    education: 'B.A. in Quantitative Economics, Boston University',
    experienceYears: 2,
    programmingBackground:
      'Self-taught developer with two years of commercial experience in Python data pipelines and web development with Django and REST APIs. Proficient in SQL queries, data manipulation with pandas, and version control using Git.',
    statement:
      'Transitioning into software engineering has shown me the power of computational modeling. The COMPRO program offers the formal graduate training I need in data structures, systems, and enterprise Java development, followed by valuable practical training in the US tech sector.',
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    screening: evaluateScreening({
      experienceYears: 2,
      programmingBackground:
        'Self-taught developer with two years of commercial experience in Python data pipelines and web development with Django and REST APIs. Proficient in SQL queries, data manipulation with pandas, and version control using Git.',
      statement:
        'Transitioning into software engineering has shown me the power of computational modeling. The COMPRO program offers the formal graduate training I need in data structures, systems, and enterprise Java development, followed by valuable practical training in the US tech sector.',
    }),
    decision: 'PENDING',
    reviewerNote: null,
  },
  {
    id: nextId++,
    fullName: 'Priya Sharma',
    email: 'priya.sharma@example.in',
    education: 'B.Tech in Information Technology, Anna University, Chennai',
    experienceYears: 5,
    programmingBackground:
      'Over five years developing backend enterprise microservices using Java 17, Spring Boot, Hibernate, Apache Kafka, and Kubernetes. Strong grasp of object-oriented design patterns, concurrency, and clean code principles. Mentored junior software developers and led system migration to cloud architecture.',
    statement:
      'Maharishi University’s Computer Professionals Program has an exceptional reputation for blending top-tier graduate studies with hands-on US software industry internships. I seek to master modern cloud-native architectures, distributed computing, and machine learning, while expanding my leadership horizons.',
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    screening: evaluateScreening({
      experienceYears: 5,
      programmingBackground:
        'Over five years developing backend enterprise microservices using Java 17, Spring Boot, Hibernate, Apache Kafka, and Kubernetes. Strong grasp of object-oriented design patterns, concurrency, and clean code principles. Mentored junior software developers and led system migration to cloud architecture.',
      statement:
        'Maharishi University’s Computer Professionals Program has an exceptional reputation for blending top-tier graduate studies with hands-on US software industry internships. I seek to master modern cloud-native architectures, distributed computing, and machine learning, while expanding my leadership horizons.',
    }),
    decision: 'PENDING',
    reviewerNote: null,
  },
  {
    id: nextId++,
    fullName: 'Alexandre Dubois',
    email: 'a.dubois@techparis.fr',
    education: 'Associate Degree in Applied Computing, Paris',
    experienceYears: 1,
    programmingBackground: 'Basic JavaScript and HTML/CSS web scripting.',
    statement: 'Interested in programming and moving to Iowa for study.',
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    screening: evaluateScreening({
      experienceYears: 1,
      programmingBackground: 'Basic JavaScript and HTML/CSS web scripting.',
      statement: 'Interested in programming and moving to Iowa for study.',
    }),
    decision: 'FOLLOW_UP',
    reviewerNote: 'Requesting transcript evaluation and expanded portfolio of technical projects.',
  },
];

import crypto from 'crypto';

// Reviewer credentials (can be customized via environment variables)
const VALID_CREDENTIALS = [
  {
    username: (process.env.REVIEWER_USERNAME || 'admissions').toLowerCase(),
    password: process.env.REVIEWER_PASSWORD || 'compro2026',
    name: 'Admissions Officer',
    role: 'Faculty Committee Reviewer',
  },
  {
    username: 'admin',
    password: 'password123',
    name: 'COMPRO Administrator',
    role: 'Admissions Chair',
  },
];

interface ReviewerSession {
  username: string;
  name: string;
  role: string;
  createdAt: number;
}

const activeSessions = new Map<string, ReviewerSession>();

function requireReviewerAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Reviewer authentication required. Please log in.' });
  }
  const token = authHeader.substring(7).trim();
  const session = activeSessions.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
  }
  (req as any).reviewer = session;
  next();
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // API Health Check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Auth: POST /api/auth/login
  app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const matched = VALID_CREDENTIALS.find(
      c => c.username === username.trim().toLowerCase() && c.password === password
    );

    if (!matched) {
      return res.status(401).json({ error: 'Invalid reviewer username or password' });
    }

    const token = crypto.randomUUID();
    const session: ReviewerSession = {
      username: matched.username,
      name: matched.name,
      role: matched.role,
      createdAt: Date.now(),
    };
    activeSessions.set(token, session);

    res.json({
      token,
      user: {
        username: session.username,
        name: session.name,
        role: session.role,
      },
    });
  });

  // Auth: POST /api/auth/logout
  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      activeSessions.delete(token);
    }
    res.json({ success: true });
  });

  // Auth: GET /api/auth/me
  app.get('/api/auth/me', requireReviewerAuth, (req, res) => {
    const session = (req as any).reviewer as ReviewerSession;
    res.json({
      username: session.username,
      name: session.name,
      role: session.role,
    });
  });

  // GET /api/applications - list applications (REVIEWER ONLY)
  app.get('/api/applications', requireReviewerAuth, (_req, res) => {
    const list = [...applicationsStore].sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
    res.json(list);
  });

  // GET /api/applications/:id - get single application (REVIEWER ONLY)
  app.get('/api/applications/:id', requireReviewerAuth, (req, res) => {
    const id = parseInt(req.params.id, 10);
    const item = applicationsStore.find(a => a.id === id);
    if (!item) {
      return res.status(404).json({ error: 'Application not found' });
    }
    res.json(item);
  });

  // POST /api/applications - submit application
  app.post('/api/applications', (req, res) => {
    const { fullName, email, education, experienceYears, programmingBackground, statement } = req.body;

    if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
      return res.status(400).json({ error: 'Full name is required (max 120 chars)' });
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid email address is required' });
    }
    if (!education || typeof education !== 'string' || !education.trim()) {
      return res.status(400).json({ error: 'Education details are required' });
    }
    const exp = Number(experienceYears);
    if (isNaN(exp) || exp < 0 || exp > 60) {
      return res.status(400).json({ error: 'Experience years must be between 0 and 60' });
    }
    if (!programmingBackground || typeof programmingBackground !== 'string' || programmingBackground.trim().length < 20) {
      return res.status(400).json({ error: 'Programming background must be at least 20 characters' });
    }
    if (!statement || typeof statement !== 'string' || statement.trim().length < 40) {
      return res.status(400).json({ error: 'Statement must be at least 40 characters' });
    }

    const screening = evaluateScreening({
      experienceYears: exp,
      programmingBackground: programmingBackground.trim(),
      statement: statement.trim(),
    });

    const newApp: Application = {
      id: nextId++,
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      education: education.trim(),
      experienceYears: exp,
      programmingBackground: programmingBackground.trim(),
      statement: statement.trim(),
      submittedAt: new Date().toISOString(),
      screening,
      decision: 'PENDING',
      reviewerNote: null,
    };

    applicationsStore.unshift(newApp);
    res.status(201).json(newApp);
  });

  // PATCH /api/applications/:id/decision - record reviewer decision & note (REVIEWER ONLY)
  app.patch('/api/applications/:id/decision', requireReviewerAuth, (req, res) => {
    const id = parseInt(req.params.id, 10);
    const item = applicationsStore.find(a => a.id === id);
    if (!item) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const { decision, reviewerNote } = req.body;
    const validDecisions: Decision[] = ['PENDING', 'ACCEPTED', 'REJECTED', 'FOLLOW_UP'];
    if (!decision || !validDecisions.includes(decision)) {
      return res.status(400).json({ error: `Invalid decision. Must be one of: ${validDecisions.join(', ')}` });
    }

    item.decision = decision;
    item.reviewerNote = reviewerNote && typeof reviewerNote === 'string' && reviewerNote.trim() ? reviewerNote.trim() : null;

    res.json(item);
  });

  // Frontend integration: Vite middleware in dev or static files in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`COMPRO Admissions Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();

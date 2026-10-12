import cors from 'cors';
import express from 'express';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

const app = express();
const port = Number(process.env.PORT ?? 3001);
const dataDirectory = path.resolve(process.env.DATA_DIR ?? 'data');
const storePath = path.join(dataDirectory, 'bookings.json');
const trackingStorePath = path.join(dataDirectory, 'project-tracking.json');
const projectEventClients = new Set<express.Response>();

const projects = [
  {
    id: 'harbor-residences',
    name: 'Harbor Residences',
    type: 'Residential',
    location: 'East Harbor, Portland',
    description: 'A waterfront community bringing 84 light-filled homes and a new public promenade to the eastern shore.',
    image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=85',
    stage: 'Structure',
    startDate: '2026-11-16',
    duration: '18 months',
    budget: '$2.4M – $3.1M',
    slots: 4,
    featured: true,
  },
  {
    id: 'northline-clinic',
    name: 'Northline Community Clinic',
    type: 'Healthcare',
    location: 'North District, Portland',
    description: 'A neighborhood-first health center designed for accessible care, natural light, and lower energy use.',
    image: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1000&q=85',
    stage: 'Groundworks',
    startDate: '2026-12-02',
    duration: '14 months',
    budget: '$1.8M – $2.2M',
    slots: 2,
    featured: false,
  },
  {
    id: 'cedar-yard',
    name: 'Cedar Yard Works',
    type: 'Commercial',
    location: 'Central Eastside, Portland',
    description: 'Adaptive reuse of a historic warehouse into flexible studios, small offices, and maker spaces.',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1000&q=85',
    stage: 'Finishing',
    startDate: '2026-11-09',
    duration: '9 months',
    budget: '$960K – $1.4M',
    slots: 6,
    featured: false,
  },
  {
    id: 'willow-school',
    name: 'Willow Creek Learning Hub',
    type: 'Education',
    location: 'Willow Creek, Portland',
    description: 'A flexible learning campus with a shared library, outdoor classrooms, and a community sports hall.',
    image: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1000&q=85',
    stage: 'Planning',
    startDate: '2027-01-12',
    duration: '22 months',
    budget: '$3.2M – $4.6M',
    slots: 3,
    featured: false,
  },
  {
    id: 'union-market',
    name: 'Union Market Hall',
    type: 'Commercial',
    location: 'Old Town, Portland',
    description: 'A compact public market for local growers and food makers, with a restored brick facade.',
    image: 'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1000&q=85',
    stage: 'Structure',
    startDate: '2026-11-23',
    duration: '12 months',
    budget: '$1.1M – $1.7M',
    slots: 5,
    featured: false,
  },
  {
    id: 'riverwalk-homes',
    name: 'Riverwalk Townhomes',
    type: 'Residential',
    location: 'South Waterfront, Portland',
    description: 'A carefully scaled row of low-carbon townhomes with shared green space and river access.',
    image: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1000&q=85',
    stage: 'Groundworks',
    startDate: '2027-01-05',
    duration: '16 months',
    budget: '$1.9M – $2.7M',
    slots: 2,
    featured: false,
  },
];

type ProjectStage = 'Planning' | 'Groundworks' | 'Structure' | 'Finishing' | 'Handover';

type ProjectActivity = {
  id: string;
  stage: ProjectStage;
  progress: number;
  message: string;
  createdAt: string;
};

type ProjectTracking = {
  progress: number;
  updatedAt: string;
  activity: ProjectActivity[];
};

const seededProgress = [58, 29, 82, 18, 63, 35];
const seededMessages = [
  'Level four concrete pour signed off by the site team.',
  'Utility trenching is complete on the north side.',
  'Interior joinery installation is underway.',
  'Permit set approved; mobilization plan is being finalized.',
  'Roof structure inspection passed this morning.',
  'Foundation work is progressing along the river frontage.',
];

function createSeedTracking(): Record<string, ProjectTracking> {
  return Object.fromEntries(projects.map((project, index) => {
    const createdAt = new Date(Date.now() - (index + 1) * 42 * 60_000).toISOString();
    const progress = seededProgress[index];
    const activity: ProjectActivity = {
      id: randomUUID(),
      stage: project.stage as ProjectStage,
      progress,
      message: seededMessages[index],
      createdAt,
    };
    return [project.id, { progress, updatedAt: createdAt, activity: [activity] }];
  }));
}

async function readProjectTracking(): Promise<Record<string, ProjectTracking>> {
  try {
    return JSON.parse(await readFile(trackingStorePath, 'utf8')) as Record<string, ProjectTracking>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    const tracking = createSeedTracking();
    await mkdir(path.dirname(trackingStorePath), { recursive: true });
    await writeFile(trackingStorePath, JSON.stringify(tracking, null, 2), 'utf8');
    return tracking;
  }
}

async function getTrackedProjects() {
  const tracking = await readProjectTracking();
  return projects.map((project) => ({ ...project, ...tracking[project.id] }));
}

function broadcastProjectEvent(event: object) {
  const message = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of projectEventClients) client.write(message);
}

const trackingUpdateSchema = z.object({
  progress: z.number().int().min(0).max(100),
  stage: z.enum(['Planning', 'Groundworks', 'Structure', 'Finishing', 'Handover']),
  message: z.string().trim().min(4).max(240),
});

const bookingSchema = z.object({
  projectId: z.string().min(1),
  customerName: z.string().trim().min(2).max(100),
  email: z.email(),
  phone: z.string().trim().min(7).max(30),
  preferredDate: z.iso.date(),
  notes: z.string().trim().max(500).default(''),
});

type Booking = z.infer<typeof bookingSchema> & {
  id: string;
  status: 'requested' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: string;
};

async function readBookings(): Promise<Booking[]> {
  try {
    return JSON.parse(await readFile(storePath, 'utf8')) as Booking[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    await mkdir(path.dirname(storePath), { recursive: true });
    await writeFile(storePath, '[]', 'utf8');
    return [];
  }
}

async function saveBookings(bookings: Booking[]) {
  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(storePath, JSON.stringify(bookings, null, 2), 'utf8');
}

app.use(cors());
app.use(express.json());

app.get('/api/health', (_request, response) => response.json({ status: 'ok' }));
app.get('/api/projects', async (_request, response, next) => {
  try {
    response.json(await getTrackedProjects());
  } catch (error) {
    next(error);
  }
});

app.get('/api/projects/events', async (request, response, next) => {
  try {
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');
    response.flushHeaders();
    projectEventClients.add(response);
    response.write(`data: ${JSON.stringify({ type: 'snapshot', projects: await getTrackedProjects() })}\n\n`);
    const heartbeat = setInterval(() => response.write(': keepalive\n\n'), 25_000);
    request.on('close', () => {
      clearInterval(heartbeat);
      projectEventClients.delete(response);
    });
  } catch (error) {
    next(error);
  }
});

app.patch('/api/projects/:id/tracking', async (request, response, next) => {
  try {
    const parsed = trackingUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: 'Provide a valid stage, progress percentage, and field note.' });
      return;
    }
    const project = projects.find((item) => item.id === request.params.id);
    if (!project) {
      response.status(404).json({ error: 'Project not found.' });
      return;
    }
    const tracking = await readProjectTracking();
    const createdAt = new Date().toISOString();
    const activity: ProjectActivity = { ...parsed.data, id: randomUUID(), createdAt };
    const nextTracking: ProjectTracking = {
      progress: parsed.data.progress,
      updatedAt: createdAt,
      activity: [activity, ...(tracking[project.id]?.activity ?? [])].slice(0, 20),
    };
    await writeFile(trackingStorePath, JSON.stringify({ ...tracking, [project.id]: nextTracking }, null, 2), 'utf8');
    const updatedProject = { ...project, ...nextTracking };
    broadcastProjectEvent({ type: 'project-updated', project: updatedProject });
    response.json(updatedProject);
  } catch (error) {
    next(error);
  }
});

app.get('/api/bookings', async (_request, response, next) => {
  try {
    const bookings = await readBookings();
    response.json(bookings.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  } catch (error) {
    next(error);
  }
});

app.post('/api/bookings', async (request, response, next) => {
  try {
    const parsed = bookingSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: 'Please check the booking details and try again.' });
      return;
    }
    const project = projects.find((item) => item.id === parsed.data.projectId);
    if (!project) {
      response.status(404).json({ error: 'That project is no longer available.' });
      return;
    }
    const booking: Booking = {
      ...parsed.data,
      id: randomUUID(),
      status: 'requested',
      createdAt: new Date().toISOString(),
    };
    const bookings = await readBookings();
    bookings.push(booking);
    await saveBookings(bookings);
    response.status(201).json(booking);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/bookings/:id', async (request, response, next) => {
  try {
    const parsed = z.object({ status: z.enum(['requested', 'confirmed', 'completed', 'cancelled']) }).safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: 'Choose a valid booking status.' });
      return;
    }
    const bookings = await readBookings();
    const booking = bookings.find((item) => item.id === request.params.id);
    if (!booking) {
      response.status(404).json({ error: 'Booking not found.' });
      return;
    }
    booking.status = parsed.data.status;
    await saveBookings(bookings);
    response.json(booking);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/bookings/:id', async (request, response, next) => {
  try {
    const bookings = await readBookings();
    const remaining = bookings.filter((item) => item.id !== request.params.id);
    if (remaining.length === bookings.length) {
      response.status(404).json({ error: 'Booking not found.' });
      return;
    }
    await saveBookings(remaining);
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.use('/api', (_request, response) => response.status(404).json({ error: 'API route not found.' }));
app.use(express.static(path.resolve('dist')));
app.use((request, response, next) => {
  if (request.method !== 'GET' || request.path.startsWith('/api')) {
    next();
    return;
  }
  response.sendFile(path.resolve('dist', 'index.html'), (error) => {
    if (error) next(error);
  });
});

app.use((error: Error, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  console.error(error);
  response.status(500).json({ error: 'Something went wrong. Please try again.' });
});

app.listen(port, () => console.log(`Sitebook API listening on http://localhost:${port}`));
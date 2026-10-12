import cors from 'cors';
import express from 'express';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

const app = express();
const port = Number(process.env.PORT ?? 3001);
const storePath = path.resolve('data', 'bookings.json');

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
app.get('/api/projects', (_request, response) => response.json(projects));

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

app.use((error: Error, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  console.error(error);
  response.status(500).json({ error: 'Something went wrong. Please try again.' });
});

app.listen(port, () => console.log(`Sitebook API listening on http://localhost:${port}`));
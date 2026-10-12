import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ArrowDownUp,
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  HardHat,
  MapPin,
  Menu,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import type { Booking, BookingStatus, Project } from './types';

type View = 'projects' | 'bookings';
type BookingForm = {
  customerName: string;
  email: string;
  phone: string;
  preferredDate: string;
  notes: string;
};

const categories = ['All projects', 'Residential', 'Commercial', 'Healthcare', 'Education'];
const emptyForm: BookingForm = { customerName: '', email: '', phone: '', preferredDate: '', notes: '' };

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? 'Could not complete that request.');
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T12:00:00`));
}

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [view, setView] = useState<View>('projects');
  const [category, setCategory] = useState('All projects');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'recommended' | 'soonest'>('recommended');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [form, setForm] = useState<BookingForm>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    Promise.all([api<Project[]>('/api/projects'), api<Booking[]>('/api/bookings')])
      .then(([nextProjects, nextBookings]) => {
        setProjects(nextProjects);
        setBookings(nextBookings);
      })
      .catch(() => setError('The project service is unavailable. Start the app with npm run dev.'));
  }, []);

  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const matching = projects.filter((project) => {
      const categoryMatches = category === 'All projects' || project.type === category;
      const queryMatches = !normalizedQuery || `${project.name} ${project.location} ${project.type} ${project.stage}`.toLowerCase().includes(normalizedQuery);
      return categoryMatches && queryMatches;
    });
    return matching.sort((a, b) => sort === 'soonest'
      ? a.startDate.localeCompare(b.startDate)
      : Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name));
  }, [projects, category, query, sort]);

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedProject) return;
    setBusy(true);
    setError('');
    try {
      const booking = await api<Booking>('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({ ...form, projectId: selectedProject.id }),
      });
      setBookings((current) => [booking, ...current]);
      setSelectedProject(null);
      setForm(emptyForm);
      setNotice('Your visit request is in. The project team will be in touch.');
      window.setTimeout(() => setNotice(''), 5000);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not send the request.');
    } finally {
      setBusy(false);
    }
  }

  async function updateBooking(id: string, status: BookingStatus) {
    try {
      const updated = await api<Booking>(`/api/bookings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setBookings((current) => current.map((booking) => booking.id === id ? updated : booking));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not update the booking.');
    }
  }

  async function removeBooking(id: string) {
    try {
      await api<void>(`/api/bookings/${id}`, { method: 'DELETE' });
      setBookings((current) => current.filter((booking) => booking.id !== id));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not cancel the booking.');
    }
  }

  const requestedCount = bookings.filter((booking) => booking.status === 'requested').length;
  const confirmedCount = bookings.filter((booking) => booking.status === 'confirmed').length;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <a className="brand" href="#projects" onClick={() => setView('projects')} aria-label="Sitebook home">
          <span className="brand-mark"><HardHat size={19} strokeWidth={2.2} /></span>
          <span>sitebook<span className="brand-period">.</span></span>
        </a>
        <div className="workspace-switcher">
          <span className="workspace-avatar">NW</span>
          <span className="workspace-copy"><strong>Northwest Works</strong><small>Project workspace</small></span>
          <ChevronDown size={15} />
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav className="primary-nav" aria-label="Main navigation">
          <button className={`nav-item ${view === 'projects' ? 'active' : ''}`} onClick={() => { setView('projects'); setMobileNavOpen(false); }}>
            <SlidersHorizontal size={17} /><span>Explore projects</span><span className="nav-count">{projects.length}</span>
          </button>
          <button className={`nav-item ${view === 'bookings' ? 'active' : ''}`} onClick={() => { setView('bookings'); setMobileNavOpen(false); }}>
            <CalendarDays size={17} /><span>My bookings</span>{bookings.length > 0 && <span className="nav-count">{bookings.length}</span>}
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="help-card">
            <span className="help-icon"><Bell size={15} /></span>
            <strong>Need a hand?</strong>
            <p>Our project desk can help with your next site visit.</p>
            <a href="mailto:projects@sitebook.example">Contact project desk <ArrowRight size={13} /></a>
          </div>
          <button className="profile-button" type="button">
            <span className="profile-avatar">JM</span>
            <span className="profile-copy"><strong>Jordan Miller</strong><small>Project coordinator</small></span>
            <ChevronDown size={15} />
          </button>
        </div>
      </aside>

      {mobileNavOpen && <button className="mobile-scrim" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation" />}

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation"><Menu size={19} /></button>
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>{view === 'projects' ? 'Explore projects' : 'My bookings'}</strong></div>
          <div className="topbar-right">
            <span className="today-label">MONDAY, OCT 12</span>
            <button className="icon-button notification-button" aria-label="Notifications"><Bell size={18} /><i /></button>
            <span className="topbar-avatar">JM</span>
          </div>
        </header>

        <div className="content-area">
          {error && <div className="alert alert-error" role="alert"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss"><X size={16} /></button></div>}
          {notice && <div className="alert alert-success" role="status"><CheckCircle2 size={17} /><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss"><X size={16} /></button></div>}

          {view === 'projects' ? (
            <>
              <section className="page-heading">
                <div>
                  <p className="eyebrow"><span className="eyebrow-line" />PROJECT DIRECTORY</p>
                  <h1>Find your next<br /><span>build in motion.</span></h1>
                  <p className="heading-copy">Browse active construction projects and schedule a visit with the people bringing them to life.</p>
                </div>
                <div className="heading-art" aria-hidden="true"><span className="art-ring ring-one" /><span className="art-ring ring-two" /><span className="art-cross">+</span><span className="art-number">06</span><span className="art-caption">LIVE PROJECTS<br />IN YOUR REGION</span></div>
              </section>

              <section className="stats-strip" aria-label="Booking overview">
                <div className="stat-item"><span className="stat-icon stat-green"><CalendarDays size={17} /></span><div><strong>{projects.length.toString().padStart(2, '0')}</strong><span>Open projects</span></div></div>
                <div className="stat-rule" />
                <div className="stat-item"><span className="stat-icon stat-yellow"><Clock3 size={17} /></span><div><strong>{requestedCount.toString().padStart(2, '0')}</strong><span>Awaiting response</span></div></div>
                <div className="stat-rule" />
                <div className="stat-item"><span className="stat-icon stat-blue"><CheckCircle2 size={17} /></span><div><strong>{confirmedCount.toString().padStart(2, '0')}</strong><span>Visits confirmed</span></div></div>
                <button className="stat-cta" onClick={() => setView('bookings')}>View bookings <ArrowRight size={15} /></button>
              </section>

              <section className="project-section" id="projects">
                <div className="section-title-row">
                  <div><h2>Projects to explore <span>{filteredProjects.length.toString().padStart(2, '0')}</span></h2><p>Site visits are available by appointment.</p></div>
                  <button className="sort-button" onClick={() => setSort((current) => current === 'recommended' ? 'soonest' : 'recommended')}><ArrowDownUp size={15} />{sort === 'recommended' ? 'Recommended' : 'Soonest start'}<ChevronDown size={14} /></button>
                </div>
                <div className="project-toolbar">
                  <div className="category-tabs" role="tablist" aria-label="Filter projects by category">
                    {categories.map((item) => <button key={item} className={category === item ? 'selected' : ''} onClick={() => setCategory(item)} role="tab" aria-selected={category === item}>{item}</button>)}
                  </div>
                  <label className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects" aria-label="Search projects" /><kbd>⌘ K</kbd></label>
                </div>
                {filteredProjects.length ? <div className="project-grid">
                  {filteredProjects.map((project, index) => <ProjectCard key={project.id} project={project} index={index} onBook={() => { setError(''); setSelectedProject(project); }} />)}
                </div> : <div className="empty-state"><Search size={23} /><strong>No projects found</strong><span>Try another search or category.</span><button onClick={() => { setQuery(''); setCategory('All projects'); }}>Clear filters</button></div>}
              </section>
              <footer className="page-footer"><span>Showing {filteredProjects.length} of {projects.length} projects</span><span>Project data updated today <i /></span></footer>
            </>
          ) : (
            <BookingsView bookings={bookings} projects={projects} onBack={() => setView('projects')} onCancel={removeBooking} onStatusChange={updateBooking} />
          )}
        </div>
      </main>

      {selectedProject && <BookingModal project={selectedProject} form={form} setForm={setForm} busy={busy} onClose={() => { setSelectedProject(null); setError(''); }} onSubmit={submitBooking} error={error} />}
    </div>
  );
}

function ProjectCard({ project, index, onBook }: { project: Project; index: number; onBook: () => void }) {
  return (
    <article className={`project-card ${project.featured ? 'featured-card' : ''}`} style={{ animationDelay: `${index * 65}ms` }}>
      <div className="card-image-wrap">
        <img src={project.image} alt={`${project.name} construction project`} loading={index > 2 ? 'lazy' : 'eager'} />
        <span className="project-type">{project.type}</span>
        {project.featured && <span className="featured-tag"><span />FEATURED</span>}
        <span className="image-ref">SB / {project.id.slice(0, 2).toUpperCase()}0{index + 1}</span>
      </div>
      <div className="card-body">
        <div className="card-heading"><div><h3>{project.name}</h3><p className="location"><MapPin size={13} />{project.location}</p></div><span className="stage-badge"><i />{project.stage}</span></div>
        <p className="project-description">{project.description}</p>
        <div className="project-meta"><div><span>EST. START</span><strong>{formatDate(project.startDate)}</strong></div><div><span>PROJECT VALUE</span><strong>{project.budget}</strong></div><div><span>OPEN SLOTS</span><strong>{project.slots} available</strong></div></div>
        <button className="book-button" onClick={onBook}>Request a site visit <ArrowRight size={16} /></button>
      </div>
    </article>
  );
}

function BookingsView({ bookings, projects, onBack, onCancel, onStatusChange }: {
  bookings: Booking[];
  projects: Project[];
  onBack: () => void;
  onCancel: (id: string) => void;
  onStatusChange: (id: string, status: BookingStatus) => void;
}) {
  return (
    <section className="bookings-page">
      <div className="page-heading bookings-heading"><div><p className="eyebrow"><span className="eyebrow-line" />YOUR SCHEDULE</p><h1>Site visits,<br /><span>all in one place.</span></h1><p className="heading-copy">Keep track of requests and confirmed visits with your project teams.</p></div><div className="booking-total"><strong>{bookings.length.toString().padStart(2, '0')}</strong><span>TOTAL REQUESTS</span></div></div>
      <div className="bookings-toolbar"><div><h2>Booking requests</h2><p>{bookings.length ? 'Latest updates from your project visits.' : 'Your upcoming site visits will appear here.'}</p></div><button className="outline-button" onClick={onBack}><Plus size={15} />Find a project</button></div>
      {bookings.length === 0 ? <div className="bookings-empty"><div className="empty-calendar"><CalendarDays size={24} /></div><strong>No visits booked yet</strong><p>Explore the project directory and request a time with a site team.</p><button className="book-button" onClick={onBack}>Explore projects <ArrowRight size={16} /></button></div> : <div className="booking-list">
        {bookings.map((booking) => {
          const project = projects.find((item) => item.id === booking.projectId);
          return <article className="booking-row" key={booking.id}>
            <div className="booking-date"><span>{new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(`${booking.preferredDate}T12:00:00`)).toUpperCase()}</span><strong>{new Date(`${booking.preferredDate}T12:00:00`).getDate().toString().padStart(2, '0')}</strong><span>{new Date(`${booking.preferredDate}T12:00:00`).getFullYear()}</span></div>
            <div className="booking-project-thumb">{project && <img src={project.image} alt="" />}</div>
            <div className="booking-info"><strong>{project?.name ?? 'Project unavailable'}</strong><span><MapPin size={13} />{project?.location ?? 'Location unavailable'}</span><small>Requested by {booking.customerName} · {booking.email}</small></div>
            <StatusBadge status={booking.status} />
            <div className="booking-actions">{booking.status === 'requested' && <button className="text-action" onClick={() => onStatusChange(booking.id, 'confirmed')}>Mark confirmed</button>}{booking.status === 'confirmed' && <button className="text-action" onClick={() => onStatusChange(booking.id, 'completed')}>Mark complete</button>}{booking.status !== 'completed' && booking.status !== 'cancelled' && <button className="cancel-action" onClick={() => onCancel(booking.id)}>Cancel</button>}</div>
          </article>;
        })}
      </div>}
      <div className="booking-footnote"><Check size={15} />Your project team will confirm visit details by email.</div>
    </section>
  );
}

function StatusBadge({ status }: { status: BookingStatus }) {
  const labels: Record<BookingStatus, string> = { requested: 'Awaiting response', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled' };
  return <span className={`status-badge status-${status}`}><i />{labels[status]}</span>;
}

function BookingModal({ project, form, setForm, busy, onClose, onSubmit, error }: {
  project: Project;
  form: BookingForm;
  setForm: (form: BookingForm) => void;
  busy: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  error: string;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="booking-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-topline"><span>NEW SITE VISIT REQUEST</span><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={19} /></button></div>
        <div className="modal-project"><img src={project.image} alt="" /><div><span>{project.type} · {project.stage}</span><h2 id="modal-title">{project.name}</h2><p><MapPin size={13} />{project.location}</p></div></div>
        <form onSubmit={onSubmit} className="booking-form">
          <div className="form-intro"><strong>Tell us when works for you.</strong><span>The project team will confirm a time by email.</span></div>
          <div className="form-grid"><label>Full name<input required minLength={2} maxLength={100} autoComplete="name" value={form.customerName} onChange={(event) => setForm({ ...form, customerName: event.target.value })} placeholder="e.g. Jordan Miller" /></label><label>Email address<input required type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@company.com" /></label><label>Phone number<input required type="tel" minLength={7} autoComplete="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="(503) 555-0123" /></label><label>Preferred visit date<input required type="date" min={new Date().toISOString().slice(0, 10)} value={form.preferredDate} onChange={(event) => setForm({ ...form, preferredDate: event.target.value })} /></label></div>
          <label className="notes-label">Anything the team should know? <span>OPTIONAL</span><textarea maxLength={500} rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Access needs, areas of interest, or a good time to reach you" /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="form-actions"><button className="cancel-modal" type="button" onClick={onClose}>Cancel</button><button className="submit-button" type="submit" disabled={busy}>{busy ? 'Sending request…' : 'Send visit request'}<ArrowRight size={16} /></button></div>
          <p className="privacy-note">By requesting a visit, you agree to be contacted about this project.</p>
        </form>
      </section>
    </div>
  );
}
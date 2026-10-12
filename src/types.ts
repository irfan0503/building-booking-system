export type ProjectStage = 'Planning' | 'Groundworks' | 'Structure' | 'Finishing' | 'Handover';

export type ProjectActivity = {
  id: string;
  stage: ProjectStage;
  progress: number;
  message: string;
  createdAt: string;
};

export type Project = {
  id: string;
  name: string;
  type: string;
  location: string;
  description: string;
  image: string;
  stage: ProjectStage;
  progress: number;
  updatedAt: string;
  activity: ProjectActivity[];
  startDate: string;
  duration: string;
  budget: string;
  slots: number;
  featured: boolean;
};

export type BookingStatus = 'requested' | 'confirmed' | 'completed' | 'cancelled';

export type Booking = {
  id: string;
  projectId: string;
  customerName: string;
  email: string;
  phone: string;
  preferredDate: string;
  notes: string;
  status: BookingStatus;
  createdAt: string;
};
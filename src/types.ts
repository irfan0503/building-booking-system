export type Project = {
  id: string;
  name: string;
  type: string;
  location: string;
  description: string;
  image: string;
  stage: string;
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
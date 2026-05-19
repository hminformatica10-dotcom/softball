export interface Player {
  id: string;
  name: string;
  jerseyNumber: string;
  position: string;
  battingHand: string;
  photo?: string;
  createdAt?: string;
}

export interface Payment {
  id: string;
  playerId: string;
  playerName: string;
  amount: number;
  description: string;
  notes?: string;
  eventDate: string;
  date?: string;
  registrationDate?: string;
  conceptId?: string; // Optativo: ID del concepto grupal (Uniforme, etc)
}

export interface PaymentConcept {
  id: string;
  name: string;
  totalAmount: number;
  teamId: string;
  userId: string;
  createdAt?: string;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  receipt?: string;
  eventDate: string;
  date?: string;
  registrationDate?: string;
  responsible?: string;
}

export interface Game {
  id: string;
  opponent: string;
  eventDate: string;
  date?: string;
  time?: string;
  location?: string;
  result: string;
  feePerPerson?: number | string;
}

export interface AppConfig {
  primaryColor: string;
  language: string;
  teamName?: string;
  currency?: string;
  adminPassword?: string;
}

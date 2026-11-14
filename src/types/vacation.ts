export type NavigationTab =
  | 'dashboard'
  | 'ideas'
  | 'schedule'
  | 'week'
  | 'meals'
  | 'polls'
  | 'tasks'
  | 'budget';

export type CurrencyCode = 'EUR' | 'CHF' | 'GBP' | 'USD';

export interface Traveler {
  id: string;
  name: string;
  initials: string;
  color: string; // e.g. '#E8C2E8', '#F5E284', '#A7B582', '#C4D0F5', '#F7C59F'
  role?: string;
}

export type ActivityCategory =
  | 'activity'
  | 'beach'
  | 'culture'
  | 'transport'
  | 'nightlife'
  | 'other';

export interface DayActivity {
  id: string;
  dayNumber: number; // 1 to totalDays
  timeSlot: string; // e.g. '09:30'
  endTime?: string; // e.g. '12:00'
  title: string;
  category: ActivityCategory;
  location: string;
  description: string;
  estimatedCost: number;
  createdBy: string; // Traveler.id
  votes: string[]; // Array of Traveler.id who voted for this
  status: 'planned' | 'confirmed' | 'idea';
  lat?: number;
  lng?: number;
  sourceIdeaId?: string;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type MealStyle = 'cook' | 'restaurant' | 'bakery' | 'delivery';

export interface MealPlan {
  id: string;
  dayNumber: number;
  mealType: MealType;
  style: MealStyle;
  title: string;
  time: string; // e.g. '08:30', '13:00', '19:30'
  locationOrRecipe: string;
  description: string;
  ShoppingNotes?: string;
  estimatedCostPerPerson: number;
  proposedBy: string; // Traveler.id
  assignedTeam: string[]; // Array of Traveler.id
  votes: string[]; // Array of Traveler.id
  lat?: number;
  lng?: number;
}

export interface PollOption {
  id: string;
  text: string;
  subtitle?: string;
  votes: string[]; // Array of Traveler.id
}

export interface Poll {
  id: string;
  question: string;
  category: 'general' | 'accommodation' | 'activity' | 'food' | 'transport';
  createdBy: string; // Traveler.id
  dayNumber?: number;
  isClosed?: boolean;
  allowMultiple?: boolean;
  options: PollOption[];
}

export type TaskCategory =
  | 'before_trip'
  | 'shared_equipment'
  | 'packing'
  | 'shopping'
  | 'documents';
export type TaskPriority = 'normal' | 'important' | 'critical';

export type IdeaPriority = 'must_do' | 'nice_to_have' | 'chill';

export interface BrainstormIdea {
  id: string;
  title: string;
  description: string;
  category: ActivityCategory | 'food';
  priority: IdeaPriority;
  location?: string;
  estimatedCost?: number;
  createdBy: string; // Traveler.id
  votes: string[]; // Array of Traveler.id who voted for this
  assignedDay?: number;
  createdAt: string;
  lat?: number;
  lng?: number;
}

export type IdeaItem = BrainstormIdea;

export interface TodoTask {
  id: string;
  title: string;
  description?: string;
  category: TaskCategory;
  priority: TaskPriority;
  assignedTo?: string; // Traveler.id
  completed: boolean;
  votes: string[]; // Array of Traveler.id who think this is important
}

export interface TripInfo {
  accommodationName?: string;
  address?: string;
  wifiName?: string;
  wifiPassword?: string;
  checkinCode?: string;
  emergencyNotes?: string;
  lat?: number;
  lng?: number;
}

export type ExpenseCategory =
  | 'accommodation'
  | 'transport'
  | 'food'
  | 'activity'
  | 'shopping'
  | 'other';

export interface ExpenseItem {
  id: string;
  title: string;
  amount: number;
  paidBy: string; // Traveler.id
  splitBetween: string[]; // Array of Traveler.id
  category: ExpenseCategory;
  dayNumber?: number;
  createdAt: string;
}

export interface Settlement {
  fromId: string;
  toId: string;
  amount: number;
}

export interface ActivityLogEntry {
  id: string;
  actorId: string;
  action: string;
  targetLabel: string;
  createdAt: string;
}

export interface MapFocusTarget {
  kind: 'accommodation' | 'activity' | 'meal' | 'idea' | 'place';
  id: string;
  title: string;
  location: string;
  lat?: number;
  lng?: number;
  dayNumber?: number;
  time?: string;
}

export interface SearchTarget {
  tab: NavigationTab;
  kind: 'activity' | 'meal' | 'idea' | 'poll' | 'task' | 'expense';
  id: string;
  dayNumber?: number;
}

export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  canUndo?: boolean;
}

export interface Trip {
  id: string;
  title: string;
  destination: string;
  subtitle: string;
  startDate: string; // YYYY-MM-DD, e.g. '2026-07-15'
  totalDays: number;
  budgetTargetPerPerson: number;
  isDemo: boolean;
  schemaVersion?: number;
  updatedAt?: string;
  currency?: CurrencyCode;
  info?: TripInfo;
  travelers: Traveler[];
  activities: DayActivity[];
  meals: MealPlan[];
  polls: Poll[];
  tasks: TodoTask[];
  ideas: BrainstormIdea[];
  expenses?: ExpenseItem[];
  settledPairs?: string[];
  activityLog?: ActivityLogEntry[];
}

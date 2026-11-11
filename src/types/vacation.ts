export type NavigationTab = 'dashboard' | 'schedule' | 'meals' | 'polls' | 'tasks' | 'budget';

export interface Traveler {
  id: string;
  name: string;
  initials: string;
  color: string; // e.g. '#E8C2E8', '#F5E284', '#A7B582', '#C4D0F5', '#F7C59F'
  role?: string;
}

export type ActivityCategory = 'activity' | 'beach' | 'culture' | 'transport' | 'nightlife' | 'other';

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
  options: PollOption[];
}

export type TaskCategory = 'before_trip' | 'packing' | 'shopping' | 'documents';
export type TaskPriority = 'normal' | 'important' | 'critical';

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

export interface Trip {
  id: string;
  title: string;
  destination: string;
  subtitle: string;
  startDate: string; // YYYY-MM-DD, e.g. '2026-07-15'
  totalDays: number;
  budgetTargetPerPerson: number;
  isDemo: boolean;
  travelers: Traveler[];
  activities: DayActivity[];
  meals: MealPlan[];
  polls: Poll[];
  tasks: TodoTask[];
}

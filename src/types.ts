export interface MenuItem {
  id: string;
  name: string;
  category: "burgers" | "chicken-fish" | "sides" | "breakfast" | "desserts" | "drinks";
  price: number;
  calories: number;
  isFeatured?: boolean;
  image: string;
  description: string;
  allergens: string[];
  tags: string[]; // e.g. "Gluten-Free", "High-Protein", "Vegetarian", "Sweet", "Hot"
  nutrition: {
    protein: number;
    fat: number;
    carbs: number;
    sodium: number; // in mg
  };
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  customization?: string;
}

export interface Deal {
  id: string;
  title: string;
  description: string;
  code: string;
  discountValue: number;
  minimumSpend: number;
  category: string;
  image: string;
  urgencyDaysLeft?: number;
  isPremiumRewards?: boolean;
}

export interface Restaurant {
  id: string;
  name: string;
  address: string;
  distance: string; // in miles from simulated location
  hours: string;
  hasDriveThru: boolean;
  hasMcCafe: boolean;
  hasPlayplace: boolean;
  phone: string;
  lat: number;
  lng: number;
}

export interface Message {
  role: "user" | "model";
  text: string;
  timestamp: string;
  suggestions?: string[];
  suggestedItems?: MenuItem[]; // Rich interactive menu references in chat
}

export interface UserPreferences {
  timeOfDay: "morning" | "afternoon" | "night";
  dietaryGoals: string[]; // e.g., "Under 500 kcal", "Gluten-free", "High Protein"
  pastOrderIds: string[]; // to simulate AI personalisation
  isLoyaltyMember: boolean;
  pointBalance: number;
}

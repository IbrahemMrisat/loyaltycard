export interface BusinessCategory {
  id: string;
  label: string;
  emoji: string;
  stampEmoji: string;
  theme: {
    primary: string;
    accent: string;
    bg: string;
  };
  rewardPlaceholder: string;
}

export const CATEGORIES: BusinessCategory[] = [
  {
    id: 'coffee',
    label: 'Coffee Shop',
    emoji: '☕',
    stampEmoji: '☕',
    theme: { primary: '#38bdf8', accent: '#0ea5e9', bg: '#0c1a2e' },
    rewardPlaceholder: 'Free coffee on your next visit!',
  },
  {
    id: 'barbershop',
    label: 'Barbershop',
    emoji: '💈',
    stampEmoji: '✂️',
    theme: { primary: '#a78bfa', accent: '#7c3aed', bg: '#1a0f2e' },
    rewardPlaceholder: 'Free haircut on your next visit!',
  },
  {
    id: 'restaurant',
    label: 'Restaurant',
    emoji: '🍽️',
    stampEmoji: '🍴',
    theme: { primary: '#fb923c', accent: '#ea580c', bg: '#2e1a0c' },
    rewardPlaceholder: 'Free main course on your next visit!',
  },
  {
    id: 'pizza',
    label: 'Pizza',
    emoji: '🍕',
    stampEmoji: '🍕',
    theme: { primary: '#f87171', accent: '#dc2626', bg: '#2e0c0c' },
    rewardPlaceholder: 'Free pizza on your next visit!',
  },
  {
    id: 'sushi',
    label: 'Sushi',
    emoji: '🍣',
    stampEmoji: '🍣',
    theme: { primary: '#34d399', accent: '#059669', bg: '#0c2e1a' },
    rewardPlaceholder: 'Free sushi roll on your next visit!',
  },
  {
    id: 'bakery',
    label: 'Bakery',
    emoji: '🥐',
    stampEmoji: '🥐',
    theme: { primary: '#fbbf24', accent: '#d97706', bg: '#2e220c' },
    rewardPlaceholder: 'Free pastry on your next visit!',
  },
  {
    id: 'burger',
    label: 'Burger',
    emoji: '🍔',
    stampEmoji: '🍔',
    theme: { primary: '#fb923c', accent: '#c2410c', bg: '#2e150c' },
    rewardPlaceholder: 'Free burger on your next visit!',
  },
  {
    id: 'bar',
    label: 'Bar',
    emoji: '🍺',
    stampEmoji: '🍺',
    theme: { primary: '#fbbf24', accent: '#b45309', bg: '#1a1a0c' },
    rewardPlaceholder: 'Free drink on your next visit!',
  },
  {
    id: 'nails',
    label: 'Nail Salon',
    emoji: '💅',
    stampEmoji: '💅',
    theme: { primary: '#f472b6', accent: '#db2777', bg: '#2e0c1a' },
    rewardPlaceholder: 'Free nail treatment on your next visit!',
  },
  {
    id: 'gym',
    label: 'Gym',
    emoji: '💪',
    stampEmoji: '🏋️',
    theme: { primary: '#4ade80', accent: '#16a34a', bg: '#0c2e0c' },
    rewardPlaceholder: 'Free session on your next visit!',
  },
  {
    id: 'bookstore',
    label: 'Bookstore',
    emoji: '📚',
    stampEmoji: '📖',
    theme: { primary: '#60a5fa', accent: '#2563eb', bg: '#0c1a2e' },
    rewardPlaceholder: 'Free book on your next visit!',
  },
  {
    id: 'other',
    label: 'Other',
    emoji: '⭐',
    stampEmoji: '⭐',
    theme: { primary: '#94a3b8', accent: '#64748b', bg: '#0f172a' },
    rewardPlaceholder: 'Free reward on your next visit!',
  },
];

export const getCategoryById = (id: string): BusinessCategory =>
  CATEGORIES.find(c => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
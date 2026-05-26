export interface BoardTheme {
  id: string;
  name: string;
  lightSquare: string;
  darkSquare: string;
  selectedSquare: string;
  validMoveDot: string;
  background: string;
  accent: string;
  textPrimary: string;
  textSecondary: string;
}

export const BOARD_THEMES: BoardTheme[] = [
  {
    id: 'classic',
    name: 'Classic Wood',
    lightSquare: '#E8D5B7',
    darkSquare: '#B58863',
    selectedSquare: '#7CB342',
    validMoveDot: 'rgba(124, 179, 66, 0.7)',
    background: '#1a1a2e',
    accent: '#E8D5B7',
    textPrimary: '#E8D5B7',
    textSecondary: '#9CA3AF',
  },
  {
    id: 'blue',
    name: 'Ocean Blue',
    lightSquare: '#DEE3E6',
    darkSquare: '#5D8AA8',
    selectedSquare: '#4FC3F7',
    validMoveDot: 'rgba(79, 195, 247, 0.7)',
    background: '#1E3A5F',
    accent: '#4FC3F7',
    textPrimary: '#E3F2FD',
    textSecondary: '#90CAF9',
  },
  {
    id: 'green',
    name: 'Forest Green',
    lightSquare: '#EEEED2',
    darkSquare: '#769656',
    selectedSquare: '#BACA44',
    validMoveDot: 'rgba(186, 202, 68, 0.7)',
    background: '#2D4A2D',
    accent: '#8BC34A',
    textPrimary: '#E8F5E9',
    textSecondary: '#A5D6A7',
  },
  {
    id: 'purple',
    name: 'Royal Purple',
    lightSquare: '#E8E0F0',
    darkSquare: '#8B5A9C',
    selectedSquare: '#BA68C8',
    validMoveDot: 'rgba(186, 104, 200, 0.7)',
    background: '#2D1B3D',
    accent: '#CE93D8',
    textPrimary: '#F3E5F5',
    textSecondary: '#CE93D8',
  },
  {
    id: 'dark',
    name: 'Midnight',
    lightSquare: '#4A4A4A',
    darkSquare: '#2C2C2C',
    selectedSquare: '#FF6B6B',
    validMoveDot: 'rgba(255, 107, 107, 0.7)',
    background: '#0D0D0D',
    accent: '#FF6B6B',
    textPrimary: '#FFFFFF',
    textSecondary: '#888888',
  },
  {
    id: 'coral',
    name: 'Coral Sunset',
    lightSquare: '#FFF5EE',
    darkSquare: '#E07A5F',
    selectedSquare: '#F2CC8F',
    validMoveDot: 'rgba(242, 204, 143, 0.7)',
    background: '#3D405B',
    accent: '#F2CC8F',
    textPrimary: '#F4F1DE',
    textSecondary: '#E07A5F',
  },
];

export const DEFAULT_THEME = BOARD_THEMES[0];

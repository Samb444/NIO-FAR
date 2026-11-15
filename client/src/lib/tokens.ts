/** Valeurs JS des design tokens (miroir de src/styles/tokens.css), utilisées par la scène 3D et les SVG. */
export const palette = {
  forest: '#0B6B4F',
  mint: '#4CC9A0',
  ochre: '#E0A21B',
  sand: '#F6F1E7',
  ink: '#14231C',
} as const;

export type CategoryId = 'dechets' | 'eau' | 'eclairage' | 'voirie';

export const categoryColors: Record<CategoryId, string> = {
  dechets: '#E0A21B',
  eau: '#2F8FBF',
  eclairage: '#F2C94C',
  voirie: '#C8553D',
};

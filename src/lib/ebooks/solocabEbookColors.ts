// Shared color palette for the SoloCab eBook — SoloCab Academy branding
// Premium minimalist palette: deep blue, light blue, soft violet
export const ebookColors = {
  // Primary
  deepBlue: [20, 40, 90] as [number, number, number],          // Titres principaux
  primaryBlue: [45, 75, 160] as [number, number, number],       // Bleu SoloCab principal
  lightBlue: [100, 140, 210] as [number, number, number],       // Éléments secondaires
  softBlue: [180, 200, 235] as [number, number, number],        // Accents légers

  // Accent
  softViolet: [140, 110, 200] as [number, number, number],      // Accent violet doux
  lightViolet: [200, 185, 240] as [number, number, number],     // Violet très léger

  // Legacy aliases (backward compat)
  primaryBlue_legacy: [55, 90, 180] as [number, number, number],
  darkBlue: [18, 32, 72] as [number, number, number],           // Navy profond
  accentGold: [140, 110, 200] as [number, number, number],      // Remappé → violet doux
  orange: [100, 140, 210] as [number, number, number],          // Remappé → bleu clair bullets

  // Texte
  darkText: [35, 35, 50] as [number, number, number],
  bodyText: [50, 50, 65] as [number, number, number],           // Corps de texte plus doux
  grayText: [120, 120, 140] as [number, number, number],
  lightGray: [190, 195, 210] as [number, number, number],

  // Surfaces
  white: [255, 255, 255] as [number, number, number],
  lightBg: [245, 247, 252] as [number, number, number],         // Fond très clair bleuté
  softBg: [238, 242, 250] as [number, number, number],          // Fond léger sections
  lightGold: [242, 238, 252] as [number, number, number],       // Fond violet très léger
  lightOrange: [245, 247, 255] as [number, number, number],

  // Fonctionnels
  green: [16, 185, 129] as [number, number, number],
  lightGreen: [236, 253, 245] as [number, number, number],
  red: [239, 68, 68] as [number, number, number],
  purple: [139, 92, 246] as [number, number, number],
  lightPurple: [245, 243, 255] as [number, number, number],
  teal: [20, 184, 166] as [number, number, number],
  lightTeal: [240, 253, 250] as [number, number, number],
};

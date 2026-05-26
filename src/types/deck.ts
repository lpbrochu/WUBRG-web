//
//  deck.ts
//  WUBRG-web
//
//  Created by Codex on 2026-05-26.
//

export enum MTGColor {
  white = 'W',
  blue = 'U',
  black = 'B',
  red = 'R',
  green = 'G',
}

export const MTGColorNames: Record<MTGColor, string> = {
  [MTGColor.white]: 'White',
  [MTGColor.blue]: 'Blue',
  [MTGColor.black]: 'Black',
  [MTGColor.red]: 'Red',
  [MTGColor.green]: 'Green',
};

// Exact display colors from Swift app's custom RGB Color definitions:
// W: (0.95, 0.90, 0.72) -> #f2e5b7
// U: (0.20, 0.50, 0.82) -> #3380d1
// B: (0.18, 0.17, 0.16) -> #2e2b29
// R: (0.82, 0.22, 0.17) -> #d1382b
// G: (0.16, 0.55, 0.28) -> #298c47
export const MTGColorDisplay: Record<MTGColor, string> = {
  [MTGColor.white]: '#f2e5b7',
  [MTGColor.blue]: '#3380d1',
  [MTGColor.black]: '#2e2b29',
  [MTGColor.red]: '#d1382b',
  [MTGColor.green]: '#298c47',
};

export enum MTGDeckFormat {
  commander = 'Commander',
  constructed = 'Constructed',
}

export const MTGDeckFormatCardCounts: Record<MTGDeckFormat, number> = {
  [MTGDeckFormat.commander]: 100,
  [MTGDeckFormat.constructed]: 60,
};

export enum MTGDeckOrigin {
  precon = 'Precon',
  modifiedPrecon = 'Modified Precon',
  customBrew = 'Custom Brew',
}

export interface MTGDeck {
  id: string; // UUID v4 or generated in browser
  name: string;
  format: MTGDeckFormat;
  commanderNames: string[];
  commanderImageURLs: string[];
  colorIdentity: MTGColor[];
  tags: string[];
  deckOrigin: MTGDeckOrigin;
  powerLevel: number; // 1 to 5
  notes: string;
  createdAt: string; // ISO String
  updatedAt: string; // ISO String
}

// Snapshot interface matching Swift's MTGDeckSnapshot Codable exactly
export interface MTGDeckSnapshot {
  name: string;
  format: MTGDeckFormat;
  commanderNames: string[];
  commanderImageURLs?: string[]; // Optional in legacy
  colorIdentity: MTGColor[];
  tags: string[];
  deckOrigin?: MTGDeckOrigin; // Optional in legacy
  isPrecon?: boolean; // Legacy fallback
  powerLevel: number;
  notes: string;
}

export interface DeckFilter {
  formats: MTGDeckFormat[];
  commanderBrackets: number[];
  deckOrigins: MTGDeckOrigin[];
  selectedColors: MTGColor[];
  colorMatchMode: 'Contains' | 'Exact';
}

//
//  storage.ts
//  WUBRG-web
//
//  Created by Codex on 2026-05-26.
//

import { MTGDeck, MTGDeckSnapshot, MTGDeckFormat, MTGDeckOrigin, MTGColor } from '../types/deck';

const STORAGE_KEY = 'wubrg_deck_library';
const AUTO_SYNC_KEY = 'wubrg_auto_sync_enabled';

// Unique ID Generator (simple fallback to crypto.randomUUID or math random)
const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const sampleDecks: MTGDeck[] = [
  {
    id: 'atraxa-superfriends-id',
    name: 'Atraxa Superfriends',
    format: MTGDeckFormat.commander,
    commanderNames: ["Atraxa, Praetors' Voice"],
    commanderImageURLs: [], // Will be backfilled by client
    colorIdentity: [MTGColor.white, MTGColor.blue, MTGColor.black, MTGColor.green],
    tags: ['Planeswalkers', 'Counters', 'Midrange'],
    deckOrigin: MTGDeckOrigin.precon,
    powerLevel: 4,
    notes: 'Proliferate engines and resilient value planeswalkers.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'izzet-phoenix-id',
    name: 'Izzet Phoenix',
    format: MTGDeckFormat.constructed,
    commanderNames: [],
    commanderImageURLs: [],
    colorIdentity: [MTGColor.blue, MTGColor.red],
    tags: ['Tempo', 'Spells', 'Graveyard'],
    deckOrigin: MTGDeckOrigin.precon,
    powerLevel: 3,
    notes: 'Tight cantrip sequencing matters more than raw speed.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tymna-kraum-wheels-id',
    name: 'Tymna and Kraum Wheels',
    format: MTGDeckFormat.commander,
    commanderNames: ["Tymna the Weaver", "Kraum, Ludevic's Opus"],
    commanderImageURLs: [], // Will be backfilled by client
    colorIdentity: [MTGColor.white, MTGColor.blue, MTGColor.black, MTGColor.red],
    tags: ['Partners', 'Wheels', 'Card Advantage'],
    deckOrigin: MTGDeckOrigin.precon,
    powerLevel: 5,
    notes: 'Fast mana package; track pod expectations before playing.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const storageService = {
  /**
   * Retrieves all decks from LocalStorage, seeding with samples if empty.
   */
  loadDecks(): MTGDeck[] {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (!serialized) {
        // Seed database
        this.saveDecks(sampleDecks);
        return sampleDecks;
      }
      return JSON.parse(serialized);
    } catch (err) {
      console.error('Failed to load WUBRG decks from storage:', err);
      return sampleDecks;
    }
  },

  /**
   * Saves decks to LocalStorage.
   */
  saveDecks(decks: MTGDeck[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
    } catch (err) {
      console.error('Failed to save WUBRG decks to storage:', err);
    }
  },

  /**
   * AutoSync settings.
   */
  getAutoSyncEnabled(): boolean {
    const value = localStorage.getItem(AUTO_SYNC_KEY);
    return value === null ? true : value === 'true';
  },

  setAutoSyncEnabled(enabled: boolean): void {
    localStorage.setItem(AUTO_SYNC_KEY, String(enabled));
  },

  /**
   * Converts a deck to a Swift-compatible snapshot format.
   */
  toSnapshot(deck: MTGDeck): MTGDeckSnapshot {
    return {
      name: deck.name,
      format: deck.format,
      commanderNames: deck.commanderNames,
      commanderImageURLs: deck.commanderImageURLs,
      colorIdentity: deck.colorIdentity,
      tags: deck.tags,
      deckOrigin: deck.deckOrigin,
      isPrecon: deck.deckOrigin === MTGDeckOrigin.precon || deck.deckOrigin === MTGDeckOrigin.modifiedPrecon,
      powerLevel: deck.powerLevel,
      notes: deck.notes,
    };
  },

  /**
   * Converts a Swift-compatible snapshot back to a full MTGDeck.
   */
  fromSnapshot(snapshot: MTGDeckSnapshot): MTGDeck {
    const origin = snapshot.deckOrigin || (snapshot.isPrecon ? MTGDeckOrigin.precon : MTGDeckOrigin.customBrew);
    
    return {
      id: generateUUID(),
      name: snapshot.name,
      format: snapshot.format,
      commanderNames: snapshot.commanderNames || [],
      commanderImageURLs: snapshot.commanderImageURLs || [],
      colorIdentity: snapshot.colorIdentity || [],
      tags: snapshot.tags || [],
      deckOrigin: origin,
      powerLevel: Math.min(Math.max(snapshot.powerLevel || 3, 1), 5),
      notes: snapshot.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  /**
   * Exports an array of decks as a downloadable JSON string.
   */
  exportCollection(decks: MTGDeck[]): string {
    const snapshots = decks.map((d) => this.toSnapshot(d));
    return JSON.stringify(snapshots, null, 2);
  },

  /**
   * Imports a collection from JSON text, validating and creating MTGDecks.
   */
  importCollection(jsonText: string): MTGDeck[] {
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) {
        throw new Error('Import data must be a JSON array of decks.');
      }

      return parsed.map((item: any) => {
        // Basic validation and mapping
        const snapshot: MTGDeckSnapshot = {
          name: String(item.name || 'Unnamed Deck'),
          format: Object.values(MTGDeckFormat).includes(item.format) ? item.format : MTGDeckFormat.commander,
          commanderNames: Array.isArray(item.commanderNames) ? item.commanderNames.map(String) : [],
          commanderImageURLs: Array.isArray(item.commanderImageURLs) ? item.commanderImageURLs.map(String) : [],
          colorIdentity: Array.isArray(item.colorIdentity) ? item.colorIdentity.filter((c: any) => Object.values(MTGColor).includes(c)) : [],
          tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
          deckOrigin: Object.values(MTGDeckOrigin).includes(item.deckOrigin) ? item.deckOrigin : undefined,
          isPrecon: typeof item.isPrecon === 'boolean' ? item.isPrecon : undefined,
          powerLevel: typeof item.powerLevel === 'number' ? item.powerLevel : 3,
          notes: String(item.notes || ''),
        };

        return this.fromSnapshot(snapshot);
      });
    } catch (err) {
      throw new Error(`Invalid JSON format: ${err instanceof Error ? err.message : String(err)}`);
    }
  },
};

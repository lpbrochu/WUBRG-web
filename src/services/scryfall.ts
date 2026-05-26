//
//  scryfall.ts
//  WUBRG-web
//
//  Created by Codex on 2026-05-26.
//

import { MTGColor } from '../types/deck';

export interface ScryfallCard {
  id: string;
  name: string;
  type_line?: string;
  image_uris?: {
    small?: string;
    normal?: string;
    large?: string;
    art_crop?: string;
  };
  card_faces?: Array<{
    name: string;
    image_uris?: {
      normal?: string;
    };
  }>;
  color_identity: string[];
}

class ScryfallClient {
  private baseURL = 'https://api.scryfall.com';
  private cache: Map<string, any> = new Map();

  private get headers(): Headers {
    const headers = new Headers();
    // Use the same client User-Agent matching the Swift app's custom header
    headers.append('User-Agent', 'WUBRG/1.0 (personal MTG deck tracker; contact: local-user)');
    headers.append('Accept', 'application/json');
    return headers;
  }

  private async get<T>(url: string): Promise<T> {
    if (this.cache.has(url)) {
      return this.cache.get(url) as T;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: this.headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.details || `Scryfall API error (HTTP ${response.status})`);
    }

    const data = await response.json();
    this.cache.set(url, data);
    return data as T;
  }

  /**
   * Autocompletes card names for search prompts.
   */
  async autocompleteCardNames(query: string): Promise<string[]> {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];

    const url = `${this.baseURL}/cards/autocomplete?q=${encodeURIComponent(trimmed)}`;
    try {
      const response = await this.get<{ data: string[] }>(url);
      return response.data;
    } catch (err) {
      console.error('Scryfall Autocomplete Error:', err);
      return [];
    }
  }

  /**
   * Searches for legal commanders matching a text query.
   */
  async searchCommanderCandidates(query: string): Promise<ScryfallCard[]> {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];

    // Filter to only include commander cards, sorted alphabetically, unique cards
    const scryfallQuery = `is:commander ${trimmed}`;
    const url = `${this.baseURL}/cards/search?q=${encodeURIComponent(scryfallQuery)}&unique=cards&order=name`;

    try {
      const response = await this.get<{ data: ScryfallCard[] }>(url);
      // Return top 8 matches as in the Swift app
      return response.data.slice(0, 8);
    } catch (err) {
      console.error('Scryfall Commander Search Error:', err);
      return [];
    }
  }

  /**
   * Fetches a single card details by exact or fuzzy name.
   */
  async card(name: string): Promise<ScryfallCard> {
    const trimmed = name.trim();
    const url = `${this.baseURL}/cards/named?fuzzy=${encodeURIComponent(trimmed)}`;
    return this.get<ScryfallCard>(url);
  }

  /**
   * Resolves the normal image URL for a ScryfallCard, supporting dual-faced cards.
   */
  getNormalImageURL(card: ScryfallCard): string | null {
    if (card.image_uris?.normal) {
      return card.image_uris.normal;
    }
    
    // Support double-faced cards (e.g., Esika, God of the Tree)
    if (card.card_faces && card.card_faces.length > 0) {
      const firstFace = card.card_faces[0];
      if (firstFace.image_uris?.normal) {
        return firstFace.image_uris.normal;
      }
    }
    return null;
  }

  /**
   * Resolves the color identity colors for a ScryfallCard.
   */
  getColors(card: ScryfallCard): Set<MTGColor> {
    const colors = new Set<MTGColor>();
    if (card.color_identity) {
      card.color_identity.forEach((c) => {
        if (Object.values(MTGColor).includes(c as MTGColor)) {
          colors.add(c as MTGColor);
        }
      });
    }
    return colors;
  }
}

export const scryfallClient = new ScryfallClient();

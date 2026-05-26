//
//  DeckDetail.tsx
//  WUBRG-web
//
//  Created by Codex on 2026-05-26.
//

import React, { useEffect, useState } from 'react';
import { Pencil, ArrowLeft, Shield, Sparkles, Star } from 'lucide-react';
import { MTGDeck, MTGColorNames, MTGDeckFormat } from '../types/deck';
import { ColorIdentityDots } from './DeckFilterSheet';
import { scryfallClient } from '../services/scryfall';

interface DeckDetailProps {
  deck: MTGDeck;
  onBack: () => void;
  onEdit: () => void;
  onSaveDeckUpdate: (updated: MTGDeck) => void;
}

export const DeckDetail: React.FC<DeckDetailProps> = ({
  deck,
  onBack,
  onEdit,
  onSaveDeckUpdate,
}) => {
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  // Backfill commander image URLs from Scryfall if empty (matches Swift backfill task)
  useEffect(() => {
    if (deck.format === MTGDeckFormat.commander && deck.commanderNames.length > 0 && deck.commanderImageURLs.length === 0) {
      backfillCommanderImages();
    }
  }, [deck.commanderNames]);

  const backfillCommanderImages = async () => {
    setIsLoadingImages(true);
    setImageError(null);
    try {
      const urls: string[] = [];
      const colors = new Set(deck.colorIdentity);

      for (const name of deck.commanderNames) {
        const card = await scryfallClient.card(name);
        const url = scryfallClient.getNormalImageURL(card);
        if (url) {
          urls.push(url);
        }
        
        // Form union with card colors
        const cardColors = scryfallClient.getColors(card);
        cardColors.forEach(c => colors.add(c));
      }

      if (urls.length > 0) {
        onSaveDeckUpdate({
          ...deck,
          commanderImageURLs: urls,
          colorIdentity: Array.from(colors),
          updatedAt: new Date().toISOString(),
        });
      } else {
        setImageError('Scryfall found commander, but no image URL was returned.');
      }
    } catch (err) {
      console.error(err);
      setImageError(err instanceof Error ? err.message : 'Failed to fetch images from Scryfall.');
    } finally {
      setIsLoadingImages(false);
    }
  };

  // Label for WUBRG colors
  const colorIdentityLabel = deck.colorIdentity.length === 0
    ? 'Colorless'
    : deck.colorIdentity.map(c => c).join('');

  return (
    <div className="deck-detail-container">
      {/* Top navigation actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button type="button" className="btn" onClick={onBack}>
          <ArrowLeft size={16} />
          Back
        </button>
        <button type="button" className="btn btn-primary" onClick={onEdit}>
          <Pencil size={14} />
          Edit
        </button>
      </div>

      {/* Header Info Panel */}
      <div className="glass-panel deck-detail-header-card">
        <div className="detail-title-row">
          <h2 className="detail-title">{deck.name}</h2>
          <span className="deck-format-badge">{deck.format}</span>
        </div>

        <div className="detail-specs-grid">
          {/* Commander name slot (if applicable) */}
          {deck.format === MTGDeckFormat.commander && deck.commanderNames.length > 0 && (
            <div className="spec-item">
              <span className="spec-label">Commander</span>
              <span className="spec-value">{deck.commanderNames.join(', ')}</span>
            </div>
          )}

          {/* Color identity */}
          <div className="spec-item">
            <span className="spec-label">Color Identity</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              <ColorIdentityDots colors={deck.colorIdentity} />
              <span className="spec-value" style={{ color: 'var(--text-secondary)' }}>
                {colorIdentityLabel} {deck.colorIdentity.length > 0 && `(${deck.colorIdentity.map(c => MTGColorNames[c]).join(', ')})`}
              </span>
            </div>
          </div>

          {/* Origin */}
          <div className="spec-item">
            <span className="spec-label">Origin</span>
            <span className="spec-value">{deck.deckOrigin}</span>
          </div>

          {/* Power level power-pips */}
          <div className="spec-item">
            <span className="spec-label">Power Bracket</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <div className="power-pips">
                {[1, 2, 3, 4, 5].map((level) => (
                  <div
                    key={level}
                    className={`power-pip ${level <= deck.powerLevel ? 'active' : ''}`}
                  />
                ))}
              </div>
              <span className="spec-value" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Bracket {deck.powerLevel}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Commander Images Section */}
      {deck.format === MTGDeckFormat.commander && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <span className="form-section-title" style={{ display: 'block', marginBottom: '14px' }}>Commander Artworks</span>
          
          {deck.commanderImageURLs.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px 20px', gap: '10px' }}>
              {isLoadingImages ? (
                <>
                  <div className="spinner" style={{ border: '2px solid rgba(255,255,255,0.1)', borderTop: '2px solid var(--color-accent)', borderRadius: '50%', width: '24px', height: '24px', animation: 'spin 1s linear infinite' }}></div>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Loading artwork from Scryfall...</span>
                </>
              ) : imageError ? (
                <>
                  <Shield size={24} className="text-secondary" />
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center' }}>{imageError}</span>
                  <button type="button" className="btn" onClick={backfillCommanderImages} style={{ padding: '6px 12px', fontSize: '12px', marginTop: '6px' }}>
                    Retry Scryfall Fetch
                  </button>
                </>
              ) : (
                <>
                  <Sparkles size={24} style={{ color: 'var(--text-tertiary)' }} />
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No commander images saved yet.</span>
                </>
              )}
            </div>
          ) : (
            <div className="commander-cards-scroll">
              {deck.commanderImageURLs.map((url, index) => (
                <div key={index} className="large-commander-card">
                  <img
                    src={url}
                    alt={deck.commanderNames[index] || 'Commander artwork'}
                    className="large-commander-img"
                    onError={(e) => {
                      // Fallback if image fails to load
                      (e.target as HTMLImageElement).src = '';
                      setImageError('Artwork failed to load. Check internet connection.');
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Themes and Tags Section */}
      {deck.tags.length > 0 && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <span className="form-section-title" style={{ display: 'block', marginBottom: '12px' }}>Themes and Tags</span>
          <div className="tag-pills">
            {deck.tags.map((tag) => (
              <span
                key={tag}
                className="tag-pill"
                style={{ padding: '5px 10px', fontSize: '12px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px' }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Notes Section */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <span className="form-section-title" style={{ display: 'block', marginBottom: '12px' }}>Deck Notes</span>
        <div className="notes-box">
          {deck.notes.trim() ? deck.notes : 'No custom notes provided for this deck.'}
        </div>
      </div>
    </div>
  );
};

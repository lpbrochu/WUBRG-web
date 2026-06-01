//
//  DeckClashModal.tsx
//  WUBRG-web
//
//  Created by Antigravity on 2026-06-01.
//

import React, { useState } from 'react';
import { X, Shuffle, Sparkles, Swords, Award } from 'lucide-react';
import { MTGDeck, MTGDeckFormat, MTGColorDisplay, MTGColor, MTGColorNames } from '../types/deck';
import { ColorIdentityDots } from './DeckFilterSheet';

interface DeckClashModalProps {
  decks: [MTGDeck, MTGDeck];
  onClose: () => void;
  onReRoll: () => void;
}

export const DeckClashModal: React.FC<DeckClashModalProps> = ({ decks, onClose, onReRoll }) => {
  const [deckA, deckB] = decks;
  const [isRolling, setIsRolling] = useState(false);

  const handleReRollClick = () => {
    if (isRolling) return;
    setIsRolling(true);
    // Let the shake animation play before updating the decks
    setTimeout(() => {
      onReRoll();
      setIsRolling(false);
    }, 500);
  };

  const renderDeckArtwork = (deck: MTGDeck) => {
    const hasMultipleCommanders = deck.commanderImageURLs.length > 1;

    if (deck.format === MTGDeckFormat.commander) {
      return (
        <div className="clash-card-artwork">
          <div className="clash-card-artwork-stack">
            {deck.commanderImageURLs.length === 0 ? (
              <div className="artwork-placeholder">
                <Sparkles size={36} style={{ color: 'var(--text-tertiary)' }} />
              </div>
            ) : (
              deck.commanderImageURLs.slice(0, 2).map((url, i) => (
                <img
                  key={url}
                  src={url}
                  alt="Commander face"
                  className={`artwork-img ${hasMultipleCommanders ? `clash-artwork-stacked-${i}` : ''}`}
                />
              ))
            )}
            <span className="card-count-badge">100</span>
          </div>
        </div>
      );
    } else {
      return (
        <div className="clash-card-artwork">
          <div className="clash-card-artwork-stack">
            <div className="artwork-placeholder" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <Sparkles size={36} style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <span className="card-count-badge">60</span>
          </div>
        </div>
      );
    }
  };

  const buildColorGradient = (colors: MTGColor[]) => {
    let gradient = 'linear-gradient(to right, rgba(255,255,255,0.1), rgba(255,255,255,0.05))';
    if (colors.length > 0) {
      const sorted = [...colors].sort();
      const colorsList = sorted.map((c) => MTGColorDisplay[c]);
      gradient = sorted.length === 1
        ? `linear-gradient(to right, ${colorsList[0]}, ${colorsList[0]})`
        : `linear-gradient(to right, ${colorsList.join(', ')})`;
    }
    return gradient;
  };

  return (
    <div className="clash-overlay" onClick={onClose}>
      <div 
        className="clash-modal-container glass-material clash-scale-in" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="clash-header">
          <div className="clash-title-group">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Swords size={20} style={{ color: 'var(--color-brand)' }} />
              <span className="clash-title">Deck Clash Duel</span>
            </div>
            <span className="clash-subtitle">Let the battle begin! Who will claim victory?</span>
          </div>
          <button
            type="button"
            className="btn btn-icon"
            style={{ width: '36px', height: '36px' }}
            onClick={onClose}
            aria-label="Close duel"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Arena */}
        <div className="clash-body">
          <div className={`clash-arena ${isRolling ? 'clash-rolling' : ''}`}>
            
            {/* Deck A (Left/Top) */}
            <div className="clash-card-wrapper">
              <div className="clash-deck-card">
                <div 
                  className="clash-card-ribbon" 
                  style={{ background: buildColorGradient(deckA.colorIdentity) }} 
                />
                <div className="clash-card-content">
                  {renderDeckArtwork(deckA)}

                  <div className="clash-deck-info-block">
                    <span className="clash-deck-name">{deckA.name}</span>
                    <span className="clash-deck-subtitle">
                      {deckA.format === MTGDeckFormat.commander && deckA.commanderNames.length > 0
                        ? deckA.commanderNames.join(' & ')
                        : deckA.notes || 'Constructed Deck'}
                    </span>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <ColorIdentityDots colors={deckA.colorIdentity} />
                      <span className="deck-format-badge">{deckA.format}</span>
                    </div>

                    {/* Power Level Glowing Pips */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600 }}>POWER:</span>
                      <div className="power-pips">
                        {[1, 2, 3, 4, 5].map((lvl) => (
                          <div
                            key={lvl}
                            className={`power-pip ${lvl <= deckA.powerLevel ? 'active' : ''}`}
                            style={{
                              boxShadow: lvl <= deckA.powerLevel ? '0 0 8px rgba(255, 255, 255, 0.4)' : 'none'
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* VS Divider in middle */}
            <div className="clash-vs-divider">
              <div className="clash-vs-pulse" />
              <div className="clash-vs-badge">VS</div>
            </div>

            {/* Deck B (Right/Bottom) */}
            <div className="clash-card-wrapper">
              <div className="clash-deck-card">
                <div 
                  className="clash-card-ribbon" 
                  style={{ background: buildColorGradient(deckB.colorIdentity) }} 
                />
                <div className="clash-card-content">
                  {renderDeckArtwork(deckB)}

                  <div className="clash-deck-info-block">
                    <span className="clash-deck-name">{deckB.name}</span>
                    <span className="clash-deck-subtitle">
                      {deckB.format === MTGDeckFormat.commander && deckB.commanderNames.length > 0
                        ? deckB.commanderNames.join(' & ')
                        : deckB.notes || 'Constructed Deck'}
                    </span>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <ColorIdentityDots colors={deckB.colorIdentity} />
                      <span className="deck-format-badge">{deckB.format}</span>
                    </div>

                    {/* Power Level Glowing Pips */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600 }}>POWER:</span>
                      <div className="power-pips">
                        {[1, 2, 3, 4, 5].map((lvl) => (
                          <div
                            key={lvl}
                            className={`power-pip ${lvl <= deckB.powerLevel ? 'active' : ''}`}
                            style={{
                              boxShadow: lvl <= deckB.powerLevel ? '0 0 8px rgba(255, 255, 255, 0.4)' : 'none'
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer actions */}
        <div className="clash-footer">
          <button
            type="button"
            className="btn"
            style={{ minWidth: '120px' }}
            onClick={onClose}
          >
            Close
          </button>
          
          <button
            type="button"
            className="btn btn-primary"
            style={{ minWidth: '150px' }}
            disabled={isRolling}
            onClick={handleReRollClick}
          >
            <Shuffle size={16} className={isRolling ? 'spin-animation' : ''} />
            Re-roll Match
          </button>
        </div>
      </div>
    </div>
  );
};

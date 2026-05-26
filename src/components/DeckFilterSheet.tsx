//
//  DeckFilterSheet.tsx
//  WUBRG-web
//
//  Created by Codex on 2026-05-26.
//

import React from 'react';
import { X, Check } from 'lucide-react';
import { MTGColor, MTGColorNames, MTGColorDisplay, MTGDeckFormat, MTGDeckOrigin, DeckFilter } from '../types/deck';

interface DeckFilterSheetProps {
  filter: DeckFilter;
  setFilter: (filter: DeckFilter) => void;
  onClose: () => void;
}

export const DeckFilterSheet: React.FC<DeckFilterSheetProps> = ({ filter, setFilter, onClose }) => {
  const handleReset = () => {
    setFilter({
      formats: [],
      commanderBrackets: [],
      deckOrigins: [],
      selectedColors: [],
      colorMatchMode: 'Contains',
    });
  };

  const toggleFormat = (format: MTGDeckFormat) => {
    const updated = [...filter.formats];
    const index = updated.indexOf(format);
    if (index > -1) {
      updated.splice(index, 1);
    } else {
      updated.push(format);
    }
    setFilter({ ...filter, formats: updated });
  };

  const toggleOrigin = (origin: MTGDeckOrigin) => {
    const updated = [...filter.deckOrigins];
    const index = updated.indexOf(origin);
    if (index > -1) {
      updated.splice(index, 1);
    } else {
      updated.push(origin);
    }
    setFilter({ ...filter, deckOrigins: updated });
  };

  const setBracket = (bracket: number) => {
    setFilter({
      ...filter,
      commanderBrackets: bracket === 0 ? [] : [bracket],
    });
  };

  const toggleColor = (color: MTGColor) => {
    const updated = [...filter.selectedColors];
    const index = updated.indexOf(color);
    if (index > -1) {
      updated.splice(index, 1);
    } else {
      updated.push(color);
    }
    setFilter({ ...filter, selectedColors: updated });
  };

  const hasActiveFilters =
    filter.formats.length > 0 ||
    filter.commanderBrackets.length > 0 ||
    filter.deckOrigins.length > 0 ||
    filter.selectedColors.length > 0;

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet-container glass-material" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <button
            type="button"
            className="btn btn-icon"
            style={{ width: '36px', height: '36px' }}
            onClick={handleReset}
            disabled={!hasActiveFilters}
          >
            Reset
          </button>
          <span className="sheet-title">Filters</span>
          <button
            type="button"
            className="btn btn-icon"
            style={{ width: '36px', height: '36px' }}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="sheet-body">
          {/* Format Section */}
          <div className="form-section">
            <span className="form-section-title">Format</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.values(MTGDeckFormat).map((format) => {
                const isSelected = filter.formats.includes(format);
                return (
                  <label key={format} className="stepper" style={{ cursor: 'pointer' }}>
                    <span className="form-label">{format}</span>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleFormat(format)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-accent)' }}
                    />
                  </label>
                );
              })}
            </div>
          </div>

          {/* Commander Bracket Section */}
          <div className="form-section">
            <span className="form-section-title">Commander Bracket (Power Level)</span>
            <div className="segmented-picker">
              <div
                className={`picker-item ${filter.commanderBrackets.length === 0 ? 'selected' : ''}`}
                onClick={() => setBracket(0)}
              >
                Any
              </div>
              {[1, 2, 3, 4, 5].map((num) => {
                const isSelected = filter.commanderBrackets.includes(num);
                return (
                  <div
                    key={num}
                    className={`picker-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => setBracket(num)}
                  >
                    {num}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Deck Origin Section */}
          <div className="form-section">
            <span className="form-section-title">Deck Origin</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.values(MTGDeckOrigin).map((origin) => {
                const isSelected = filter.deckOrigins.includes(origin);
                return (
                  <label key={origin} className="stepper" style={{ cursor: 'pointer' }}>
                    <span className="form-label">{origin}</span>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOrigin(origin)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-accent)' }}
                    />
                  </label>
                );
              })}
            </div>
          </div>

          {/* Colors Section */}
          <div className="form-section">
            <span className="form-section-title">Color Identity</span>
            
            {/* Match Mode Segmented Picker */}
            <div className="segmented-picker" style={{ marginBottom: '14px' }}>
              <div
                className={`picker-item ${filter.colorMatchMode === 'Contains' ? 'selected' : ''}`}
                onClick={() => setFilter({ ...filter, colorMatchMode: 'Contains' })}
              >
                Contains
              </div>
              <div
                className={`picker-item ${filter.colorMatchMode === 'Exact' ? 'selected' : ''}`}
                onClick={() => setFilter({ ...filter, colorMatchMode: 'Exact' })}
              >
                Exact
              </div>
            </div>

            {/* Custom interactive WUBRG Color toggle button grid */}
            <div className="wubrg-grid">
              {Object.values(MTGColor).map((color) => {
                const isSelected = filter.selectedColors.includes(color);
                return (
                  <ColorToggleButton
                    key={color}
                    color={color}
                    isSelected={isSelected}
                    onClick={() => toggleColor(color)}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* Color Toggle Button Component */
interface ColorToggleButtonProps {
  color: MTGColor;
  isSelected: boolean;
  onClick: () => void;
}

export const ColorToggleButton: React.FC<ColorToggleButtonProps> = ({ color, isSelected, onClick }) => {
  return (
    <button
      type="button"
      className={`wubrg-btn color-${color} ${isSelected ? 'selected' : ''}`}
      style={{ '--color-value': MTGColorDisplay[color] } as React.CSSProperties}
      onClick={onClick}
      aria-label={`${MTGColorNames[color]} color`}
    >
      {color}
    </button>
  );
};

/* Color Identity Dots Component (Small dots row) */
interface ColorIdentityDotsProps {
  colors: MTGColor[];
}

export const ColorIdentityDots: React.FC<ColorIdentityDotsProps> = ({ colors }) => {
  if (colors.length === 0) {
    return (
      <div className="color-dots" aria-label="Colorless">
        <div className="color-dot" style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.1)' }} />
      </div>
    );
  }

  // Sort colors according to W-U-B-R-G standard sequence
  const sequence = [MTGColor.white, MTGColor.blue, MTGColor.black, MTGColor.red, MTGColor.green];
  const sorted = [...colors].sort((a, b) => sequence.indexOf(a) - sequence.indexOf(b));

  return (
    <div className="color-dots" aria-label={sorted.map(c => MTGColorNames[c]).join(', ')}>
      {sorted.map((color) => (
        <div
          key={color}
          className="color-dot"
          style={{ background: MTGColorDisplay[color] }}
        />
      ))}
    </div>
  );
};

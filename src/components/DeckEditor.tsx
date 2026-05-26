//
//  DeckEditor.tsx
//  WUBRG-web
//
//  Created by Codex on 2026-05-26.
//

import React, { useState } from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';
import { MTGDeck, MTGDeckFormat, MTGDeckOrigin, MTGColor, MTGColorNames } from '../types/deck';
import { CommanderSearchField } from './CommanderSearchField';
import { ColorToggleButton } from './DeckFilterSheet';

interface DeckEditorProps {
  deck: MTGDeck | null; // Null means creating a new deck
  existingDecks: MTGDeck[];
  onSave: (snapshot: Omit<MTGDeck, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
  onOpenScanner: () => void;
}

export const DeckEditor: React.FC<DeckEditorProps> = ({
  deck,
  existingDecks,
  onSave,
  onClose,
  onOpenScanner,
}) => {
  const [name, setName] = useState(deck?.name || '');
  const [format, setFormat] = useState<MTGDeckFormat>(deck?.format || MTGDeckFormat.commander);
  const [deckOrigin, setDeckOrigin] = useState<MTGDeckOrigin>(deck?.deckOrigin || MTGDeckOrigin.precon);
  const [powerLevel, setPowerLevel] = useState<number>(deck?.powerLevel || 3);
  
  // Commander states
  const [commanderNames, setCommanderNames] = useState<string[]>(deck?.commanderNames || []);
  const [commanderImageURLStrings, setCommanderImageURLStrings] = useState<string[]>(deck?.commanderImageURLs || []);
  
  // Selected colors
  const [selectedColors, setSelectedColors] = useState<Set<MTGColor>>(new Set(deck?.colorIdentity || []));
  
  // Theme and Notes text states
  const [tagText, setTagText] = useState(deck?.tags.join(', ') || '');
  const [notes, setNotes] = useState(deck?.notes || '');
  
  // Warning states
  const [duplicateWarning, setDuplicateWarning] = useState<boolean>(false);
  const [duplicateNames, setDuplicateNames] = useState<string[]>([]);

  const toggleColor = (color: MTGColor) => {
    const updated = new Set(selectedColors);
    if (updated.has(color)) {
      updated.delete(color);
    } else {
      updated.add(color);
    }
    setSelectedColors(updated);
  };

  const handleStepPower = (step: number) => {
    setPowerLevel(prev => Math.min(Math.max(prev + step, 1), 5));
  };

  const handleSaveClick = () => {
    if (!name.trim()) return;

    const snapshot = {
      name: name.trim(),
      format,
      commanderNames: format === MTGDeckFormat.commander ? commanderNames : [],
      commanderImageURLs: format === MTGDeckFormat.commander ? commanderImageURLStrings : [],
      colorIdentity: Array.from(selectedColors),
      tags: tagText.split(',').map(t => t.trim()).filter(t => t.length > 0),
      deckOrigin,
      powerLevel,
      notes: notes.trim(),
    };

    // If it's a new deck, check for possible duplicate commanders (exact match check in SwiftData)
    if (!deck && format === MTGDeckFormat.commander && commanderNames.length > 0) {
      const duplicates = findDuplicateCommanderDecks(commanderNames);
      if (duplicates.length > 0) {
        setDuplicateNames(duplicates.map(d => d.name));
        setDuplicateWarning(true);
        return;
      }
    }

    onSave(snapshot);
  };

  const findDuplicateCommanderDecks = (names: string[]): MTGDeck[] => {
    // Normalization matching Swift
    const normalizedNew = names.map(n => n.toLowerCase().trim());
    
    return existingDecks.filter(d => {
      if (d.format !== MTGDeckFormat.commander) return false;
      const normalizedExisting = d.commanderNames.map(n => n.toLowerCase().trim());
      // Check if there is intersection
      return normalizedExisting.some(n => normalizedNew.includes(n));
    });
  };

  const handleForceSave = () => {
    const snapshot = {
      name: name.trim(),
      format,
      commanderNames: format === MTGDeckFormat.commander ? commanderNames : [],
      commanderImageURLs: format === MTGDeckFormat.commander ? commanderImageURLStrings : [],
      colorIdentity: Array.from(selectedColors),
      tags: tagText.split(',').map(t => t.trim()).filter(t => t.length > 0),
      deckOrigin,
      powerLevel,
      notes: notes.trim(),
    };
    onSave(snapshot);
  };

  return (
    <>
      <div className="sheet-overlay" onClick={onClose}>
        <div className="sheet-container glass-material" onClick={(e) => e.stopPropagation()}>
          <div className="sheet-header">
            <button type="button" className="btn btn-icon" style={{ width: '36px', height: '36px' }} onClick={onClose}>
              Cancel
            </button>
            <span className="sheet-title">{deck ? 'Edit Deck' : 'New Deck'}</span>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveClick}
              disabled={!name.trim()}
            >
              <Save size={16} />
              Save
            </button>
          </div>

          <div className="sheet-body">
            <form onSubmit={(e) => e.preventDefault()}>
              {/* Core Deck Info */}
              <div className="form-section">
                <span className="form-section-title">Deck Spec</span>
                
                <div className="form-group">
                  <label className="form-label" htmlFor="deck-name-input">Deck Name</label>
                  <input
                    id="deck-name-input"
                    type="text"
                    className="form-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter deck name..."
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="format-picker">Format</label>
                  <select
                    id="format-picker"
                    className="form-input form-select"
                    value={format}
                    onChange={(e) => setFormat(e.target.value as MTGDeckFormat)}
                  >
                    {Object.values(MTGDeckFormat).map((f) => (
                      <option key={f} value={f}>
                        {f} ({f === MTGDeckFormat.commander ? '100' : '60'} cards)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="origin-picker">Origin</label>
                  <select
                    id="origin-picker"
                    className="form-input form-select"
                    value={deckOrigin}
                    onChange={(e) => setDeckOrigin(e.target.value as MTGDeckOrigin)}
                  >
                    {Object.values(MTGDeckOrigin).map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <span className="form-label">Power Level: Bracket {powerLevel}</span>
                  <div className="stepper">
                    <button
                      type="button"
                      className="stepper-btn"
                      onClick={() => handleStepPower(-1)}
                      disabled={powerLevel <= 1}
                    >
                      -
                    </button>
                    <span className="stepper-value">{powerLevel}</span>
                    <button
                      type="button"
                      className="stepper-btn"
                      onClick={() => handleStepPower(1)}
                      disabled={powerLevel >= 5}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Commander Searching Section (Only if Commander Format) */}
              {format === MTGDeckFormat.commander && (
                <div className="form-section">
                  <span className="form-section-title">Commanders</span>
                  <CommanderSearchField
                    deckName={name}
                    setDeckName={setName}
                    commanderNames={commanderNames}
                    setCommanderNames={setCommanderNames}
                    commanderImageURLStrings={commanderImageURLStrings}
                    setCommanderImageURLStrings={setCommanderImageURLStrings}
                    selectedColors={selectedColors}
                    setSelectedColors={setSelectedColors}
                    onOpenScanner={onOpenScanner}
                  />
                </div>
              )}

              {/* Color Identity interactive selection */}
              <div className="form-section">
                <span className="form-section-title">Color Identity</span>
                <div className="wubrg-grid">
                  {Object.values(MTGColor).map((color) => (
                    <ColorToggleButton
                      key={color}
                      color={color}
                      isSelected={selectedColors.has(color)}
                      onClick={() => toggleColor(color)}
                    />
                  ))}
                </div>
              </div>

              {/* Themes and Tags */}
              <div className="form-section">
                <span className="form-section-title">Themes and Tags</span>
                <div className="form-group">
                  <label className="form-label" htmlFor="tags-input">Comma Separated Tags</label>
                  <textarea
                    id="tags-input"
                    className="form-input"
                    value={tagText}
                    onChange={(e) => setTagText(e.target.value)}
                    placeholder="e.g. Tempo, Spells, Graveyard, Midrange"
                    style={{ minHeight: '60px', resize: 'vertical' }}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="form-section">
                <span className="form-section-title">Notes</span>
                <div className="form-group">
                  <label className="form-label" htmlFor="notes-textarea">Custom Deck Notes</label>
                  <textarea
                    id="notes-textarea"
                    className="form-input"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Provide specific notes regarding deck Pod strategies, card synergies, updates, or pods..."
                    style={{ minHeight: '100px', resize: 'vertical' }}
                  />
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Possible Duplicate Commander Warning Dialog */}
      {duplicateWarning && (
        <div className="sheet-overlay" style={{ zIndex: 300, alignItems: 'center' }}>
          <div className="alert-box glass-material">
            <AlertTriangle size={32} style={{ color: '#ff9800', marginBottom: '10px' }} />
            <h3 className="alert-title">Possible Duplicate Deck</h3>
            <p className="alert-desc">
              You already have a Commander deck with this commander:{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{duplicateNames.join(', ')}</strong>.
            </p>
            <div className="alert-buttons">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setDuplicateWarning(false);
                  setDuplicateNames([]);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: '#ff9800', border: '1px solid #ff9800' }}
                onClick={handleForceSave}
              >
                Add Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

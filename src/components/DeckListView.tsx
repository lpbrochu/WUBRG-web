//
//  DeckListView.tsx
//  WUBRG-web
//
//  Created by Codex on 2026-05-26.
//

import React, { useState, useEffect } from 'react';
import {
  List,
  Grid,
  Search,
  Filter,
  Plus,
  Settings,
  Download,
  Upload,
  Sparkles,
  Trash2,
  AlertTriangle,
  FolderOpen
} from 'lucide-react';
import { MTGDeck, DeckFilter, MTGDeckFormat, MTGDeckOrigin, MTGColorDisplay, MTGColor } from '../types/deck';
import { ColorIdentityDots } from './DeckFilterSheet';
import { storageService } from '../services/storage';

interface DeckListViewProps {
  decks: MTGDeck[];
  onSelectDeck: (deck: MTGDeck) => void;
  onAddDeck: () => void;
  onDeleteDeck: (id: string) => void;
  onImportDecks: (imported: MTGDeck[]) => void;
  onExportDecks: () => void;
  onOpenSettings: () => void;
  filter: DeckFilter;
  setFilter: (f: DeckFilter) => void;
  onOpenFilterSheet: () => void;
}

export const DeckListView: React.FC<DeckListViewProps> = ({
  decks,
  onSelectDeck,
  onAddDeck,
  onDeleteDeck,
  onImportDecks,
  onExportDecks,
  onOpenSettings,
  filter,
  setFilter,
  onOpenFilterSheet,
}) => {
  const [searchText, setSearchText] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Mobile check to default list or grid
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setViewMode('list');
      } else {
        setViewMode('grid');
      }
    };
    handleResize(); // run initially
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Filter and Search logic matching matches() and matchesSearch()
  const filteredDecks = decks.filter((deck) => {
    // Search matching
    const searchTrim = searchText.trim().toLowerCase();
    const matchesSearch =
      !searchTrim ||
      deck.name.toLowerCase().includes(searchTrim) ||
      deck.commanderNames.some((c) => c.toLowerCase().includes(searchTrim)) ||
      deck.tags.some((t) => t.toLowerCase().includes(searchTrim));

    // Format matches
    const matchesFormat =
      filter.formats.length === 0 || filter.formats.includes(deck.format);

    // Power Bracket matches
    const matchesBracket =
      filter.commanderBrackets.length === 0 ||
      filter.commanderBrackets.includes(deck.powerLevel);

    // Origin matches
    const matchesOrigin =
      filter.deckOrigins.length === 0 || filter.deckOrigins.includes(deck.deckOrigin);

    // Color matches
    let matchesColors = true;
    if (filter.selectedColors.length > 0) {
      const selectedSet = new Set(filter.selectedColors);
      const deckSet = new Set(deck.colorIdentity);

      if (filter.colorMatchMode === 'Contains') {
        // Deck must contain all selected colors
        matchesColors = Array.from(selectedSet).every((color) => deckSet.has(color));
      } else {
        // Deck must exactly match selected colors (sets are equal)
        matchesColors =
          selectedSet.size === deckSet.size &&
          Array.from(selectedSet).every((color) => deckSet.has(color));
      }
    }

    return matchesSearch && matchesFormat && matchesBracket && matchesOrigin && matchesColors;
  });

  // Calculate top statistics strip
  const totalShown = filteredDecks.length;
  const commanderCount = filteredDecks.filter((d) => d.format === MTGDeckFormat.commander).length;
  
  const averagePower =
    totalShown > 0
      ? (filteredDecks.reduce((sum, d) => sum + d.powerLevel, 0) / totalShown).toFixed(1)
      : '0.0';
      
  const originTypesCount = new Set(filteredDecks.map((d) => d.deckOrigin)).size;

  const hasActiveFilters =
    filter.formats.length > 0 ||
    filter.commanderBrackets.length > 0 ||
    filter.deckOrigins.length > 0 ||
    filter.selectedColors.length > 0;

  // File loading/upload helper
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const contents = event.target?.result;
      if (typeof contents === 'string') {
        try {
          const imported = storageService.importCollection(contents);
          onImportDecks(imported);
          alert(`Successfully imported ${imported.length} decks!`);
        } catch (err) {
          alert(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div>
      {/* Dynamic Statistics Strip */}
      {decks.length > 0 && (
        <div className="stats-strip glass-panel">
          <div className="stat-item">
            <span className="stat-label">Showing</span>
            <div className="stat-value-group">
              <span className="stat-value">{totalShown}</span>
              <span className="stat-detail">{decks.length === totalShown ? 'decks' : `of ${decks.length}`}</span>
            </div>
          </div>
          <div className="stat-item">
            <span className="stat-label">Commander</span>
            <div className="stat-value-group">
              <span className="stat-value">{commanderCount}</span>
              <span className="stat-detail">lists</span>
            </div>
          </div>
          <div className="stat-item">
            <span className="stat-label">Avg Power</span>
            <div className="stat-value-group">
              <span className="stat-value">{averagePower}</span>
              <span className="stat-detail">bracket</span>
            </div>
          </div>
          <div className="stat-item">
            <span className="stat-label">Origins</span>
            <div className="stat-value-group">
              <span className="stat-value">{originTypesCount}</span>
              <span className="stat-detail">types</span>
            </div>
          </div>
        </div>
      )}

      {/* Main search and control panel */}
      <div className="search-filter-bar">
        <div className="search-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search names, commanders, or tags..."
          />
        </div>

        {/* Action controls */}
        <button
          type="button"
          className="btn btn-icon"
          onClick={onOpenFilterSheet}
          aria-label="Filter decks"
          title="Filter deck list"
          style={{ position: 'relative' }}
        >
          <Filter size={18} />
          {hasActiveFilters && (
            <div
              className="filter-active-dot"
              style={{ position: 'absolute', top: '8px', right: '8px' }}
            />
          )}
        </button>

        <button
          type="button"
          className="btn btn-icon"
          onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          aria-label="Toggle layout mode"
          title="Toggle Grid/List"
          style={{ display: window.innerWidth < 768 ? 'none' : 'flex' }}
        >
          {viewMode === 'grid' ? <List size={18} /> : <Grid size={18} />}
        </button>

        <button
          type="button"
          className="btn btn-icon btn-primary"
          onClick={onAddDeck}
          aria-label="Add a new deck"
          title="Add new deck"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Empty State */}
      {filteredDecks.length === 0 && (
        <div className="empty-state glass-panel">
          <Sparkles className="empty-icon" />
          <span className="empty-title">{decks.length === 0 ? 'No Decks Yet' : 'No Matching Decks'}</span>
          <p className="empty-desc">
            {decks.length === 0
              ? 'Add a new MTG deck list manually or import an existing WUBRG JSON collection.'
              : 'Adjust search queries or active filters to expand search details.'}
          </p>
          {decks.length === 0 ? (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="btn btn-primary" onClick={onAddDeck}>
                Add Deck
              </button>
              <label className="btn btn-primary" style={{ cursor: 'pointer', background: 'var(--bg-surface-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                <Upload size={16} style={{ marginRight: '6px', display: 'inline' }} />
                Import JSON
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          ) : (
            <button type="button" className="btn" onClick={() => setFilter({
              formats: [],
              commanderBrackets: [],
              deckOrigins: [],
              selectedColors: [],
              colorMatchMode: 'Contains',
            })}>
              Reset Filters
            </button>
          )}
        </div>
      )}

      {/* Grid view of Deck Cards */}
      {filteredDecks.length > 0 && viewMode === 'grid' && (
        <div className="decks-grid">
          {filteredDecks.map((deck) => {
            const hasMultipleCommanders = deck.commanderImageURLs.length > 1;
            const cardColors = deck.colorIdentity;
            
            // Build custom multi-colored background gradient for card ribbon
            let gradient = 'linear-gradient(to right, rgba(255,255,255,0.1), rgba(255,255,255,0.05))';
            if (cardColors.length > 0) {
              const sorted = [...cardColors].sort();
              const colorsList = sorted.map((c) => MTGColorDisplay[c]);
              gradient = sorted.length === 1
                ? `linear-gradient(to right, ${colorsList[0]}, ${colorsList[0]})`
                : `linear-gradient(to right, ${colorsList.join(', ')})`;
            }

            return (
              <div
                key={deck.id}
                className="deck-card glass-panel"
                onClick={() => onSelectDeck(deck)}
              >
                {/* Visual color ribbon */}
                <div className="color-ribbon" style={{ background: gradient }} />

                <div className="deck-card-content">
                  {/* Thumbnail art stack */}
                  <div className="commander-artwork-wrapper">
                    {deck.format === MTGDeckFormat.commander ? (
                      <div className="commander-artwork-stack">
                        {deck.commanderImageURLs.length === 0 ? (
                          <div className="artwork-placeholder">
                            <Sparkles size={24} style={{ color: 'var(--text-tertiary)' }} />
                          </div>
                        ) : (
                          deck.commanderImageURLs.slice(0, 2).map((url, i) => (
                            <img
                              key={url}
                              src={url}
                              alt="Commander face"
                              className={`artwork-img ${hasMultipleCommanders ? `artwork-stacked artwork-stacked-${i}` : ''}`}
                            />
                          ))
                        )}
                        <span className="card-count-badge">100</span>
                      </div>
                    ) : (
                      <div className="commander-artwork-stack">
                        <div className="artwork-placeholder" style={{ background: 'rgba(255,255,255,0.02)' }}>
                          <FolderOpen size={24} style={{ color: 'var(--text-tertiary)' }} />
                        </div>
                        <span className="card-count-badge">60</span>
                      </div>
                    )}
                  </div>

                  {/* Metadata details */}
                  <div className="deck-info">
                    <div className="deck-name-row">
                      <span className="deck-name">{deck.name}</span>
                    </div>

                    <span className="deck-subtitle">
                      {deck.format === MTGDeckFormat.commander && deck.commanderNames.length > 0
                        ? deck.commanderNames.join(', ')
                        : deck.notes || deck.tags.join(', ') || 'No notes'}
                    </span>

                    <span className={`deck-origin-badge ${deck.deckOrigin === MTGDeckOrigin.customBrew ? 'custom' : ''}`}>
                      {deck.deckOrigin}
                    </span>

                    {/* Colors & Dots */}
                    <div className="color-identity-row">
                      <ColorIdentityDots colors={deck.colorIdentity} />
                      <span className="color-identity-label">
                        {deck.colorIdentity.length === 0 ? 'Colorless' : deck.colorIdentity.join('')}
                      </span>
                    </div>

                    {/* tags */}
                    {deck.tags.length > 0 && (
                      <div className="tag-pills">
                        {deck.tags.slice(0, 3).map((t) => (
                          <span key={t} className="tag-pill">
                            {t}
                          </span>
                        ))}
                        {deck.tags.length > 3 && (
                          <span className="tag-pill" style={{ background: 'transparent', color: 'var(--text-tertiary)' }}>
                            +{deck.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Power Pip brackets */}
                    <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="power-pips">
                        {[1, 2, 3, 4, 5].map((lvl) => (
                          <div
                            key={lvl}
                            className={`power-pip ${lvl <= deck.powerLevel ? 'active' : ''}`}
                          />
                        ))}
                      </div>

                      {/* Manual Quick Trash delete button */}
                      <button
                        type="button"
                        className="btn btn-icon btn-destructive"
                        style={{ width: '28px', height: '28px', border: 'none', padding: 0 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Are you sure you want to delete "${deck.name}"?`)) {
                            onDeleteDeck(deck.id);
                          }
                        }}
                        aria-label="Delete deck"
                        title="Delete deck list"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Row List View of Deck Cards (Better for iPhone portrait screens) */}
      {filteredDecks.length > 0 && viewMode === 'list' && (
        <div className="decks-list">
          {filteredDecks.map((deck) => (
            <div
              key={deck.id}
              className="deck-row glass-panel"
              onClick={() => onSelectDeck(deck)}
            >
              <div className="row-thumbnail">
                {deck.format === MTGDeckFormat.commander && deck.commanderImageURLs[0] ? (
                  <img
                    src={deck.commanderImageURLs[0]}
                    alt={deck.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: 'var(--text-tertiary)' }}>
                    <Sparkles size={16} />
                  </div>
                )}
              </div>

              <div className="row-details">
                <span className="row-title">{deck.name}</span>
                <span className="row-subtitle">
                  {deck.format === MTGDeckFormat.commander && deck.commanderNames.length > 0
                    ? deck.commanderNames.join(', ')
                    : deck.notes || deck.tags.join(', ') || 'No notes'}
                </span>
              </div>

              {/* Action column */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ColorIdentityDots colors={deck.colorIdentity} />
                <span className="deck-format-badge">{deck.format}</span>
                
                <button
                  type="button"
                  className="btn btn-icon btn-destructive"
                  style={{ width: '32px', height: '32px', border: 'none', padding: 0 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Are you sure you want to delete "${deck.name}"?`)) {
                      onDeleteDeck(deck.id);
                    }
                  }}
                  aria-label="Delete deck"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

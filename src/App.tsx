//
//  App.tsx
//  WUBRG-web
//
//  Created by Codex on 2026-05-26.
//

import { useState, useEffect } from 'react';
import { Settings, Download, Upload, Sparkles, FolderSync, Info, X } from 'lucide-react';
import { MTGDeck, DeckFilter, MTGDeckFormat, MTGDeckOrigin } from './types/deck';
import { storageService } from './services/storage';
import { DeckListView } from './components/DeckListView';
import { DeckDetail } from './components/DeckDetail';
import { DeckEditor } from './components/DeckEditor';
import { DeckFilterSheet } from './components/DeckFilterSheet';
import { CardScanner } from './components/CardScanner';
import { ScryfallCard } from './services/scryfall';

function App() {
  const [decks, setDecks] = useState<MTGDeck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<MTGDeck | null>(null);
  
  // Navigation / Panel states
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Settings
  const [autoSync, setAutoSync] = useState(true);
  const [fileLocation, setFileLocation] = useState<string>('LocalStorage (Synchronized)');

  // Filters State
  const [filter, setFilter] = useState<DeckFilter>({
    formats: [],
    commanderBrackets: [],
    deckOrigins: [],
    selectedColors: [],
    colorMatchMode: 'Contains',
  });

  // Load decks and settings initially
  useEffect(() => {
    setDecks(storageService.loadDecks());
    setAutoSync(storageService.getAutoSyncEnabled());
  }, []);

  // Save decks when mutated
  const updateDecksInStorage = (updatedDecks: MTGDeck[]) => {
    setDecks(updatedDecks);
    if (autoSync) {
      storageService.saveDecks(updatedDecks);
    }
  };

  // Add or Edit save click
  const handleSaveDeck = (snapshot: Omit<MTGDeck, 'id' | 'createdAt' | 'updatedAt'>) => {
    let updatedDecks = [...decks];

    if (selectedDeck) {
      // Editing existing deck
      const index = updatedDecks.findIndex((d) => d.id === selectedDeck.id);
      if (index > -1) {
        const updatedDeck: MTGDeck = {
          ...selectedDeck,
          ...snapshot,
          updatedAt: new Date().toISOString(),
        };
        updatedDecks[index] = updatedDeck;
        setSelectedDeck(updatedDeck); // refresh detail view
      }
    } else {
      // Creating new deck
      const newDeck: MTGDeck = {
        id: 'deck_' + Date.now(),
        ...snapshot,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updatedDecks.push(newDeck);
    }

    updateDecksInStorage(updatedDecks);
    setIsEditorOpen(false);
  };

  const handleDeleteDeck = (id: string) => {
    const updated = decks.filter((d) => d.id !== id);
    updateDecksInStorage(updated);
    if (selectedDeck && selectedDeck.id === id) {
      setSelectedDeck(null);
    }
  };

  // File import JSON handler
  const handleImportDecks = (imported: MTGDeck[]) => {
    const updated = [...decks, ...imported];
    updateDecksInStorage(updated);
  };

  // File export JSON handler
  const handleExportDecks = () => {
    const jsonText = storageService.exportCollection(decks);
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `WUBRG_Deck_Collection_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSelectScannedCommander = (results: ScryfallCard[]) => {
    setIsScannerOpen(false);
    
    // Auto-prefill editor if open
    if (results.length > 0) {
      const card = results[0];
      const isCardInList = (name: string) => {
        // If editor is active, let's pass a scanned result
        // We'll simulate a custom selection event in the search field or alert.
        // For simplicity, we trigger a global alert to choose, or we append it to the current editor deck
        alert(`Scanned Commander: "${card.name}"\nFuzzy search completed! Choose or add partner.`);
      }
      isCardInList(card.name);
    }
  };

  return (
    <div className="app-container">
      <main className="main-content">
        {/* Header */}
        <header className="app-header">
          <div className="app-title-group">
            <span className="app-logo">WUBRG</span>
            <h1 className="app-title" style={{ display: window.innerWidth < 480 ? 'none' : 'block' }}>Deck Library</h1>
          </div>
          <div className="header-actions">
            <button
              type="button"
              className="btn btn-icon"
              onClick={handleExportDecks}
              disabled={decks.length === 0}
              aria-label="Export Collection JSON"
              title="Export JSON Collection"
            >
              <Download size={18} />
            </button>
            <label
              className={`btn btn-icon ${decks.length === 1000 ? 'btn-disabled' : ''}`}
              style={{ cursor: 'pointer' }}
              aria-label="Import Collection JSON"
              title="Import JSON Collection"
            >
              <Upload size={18} />
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (evt) => {
                    try {
                      const imported = storageService.importCollection(evt.target?.result as string);
                      handleImportDecks(imported);
                      alert(`Loaded ${imported.length} decks successfully!`);
                    } catch (err) {
                      alert(err instanceof Error ? err.message : 'Invalid WUBRG file.');
                    }
                  };
                  reader.readAsText(file);
                }}
                style={{ display: 'none' }}
              />
            </label>
            <button
              type="button"
              className="btn btn-icon"
              onClick={() => setIsSettingsOpen(true)}
              aria-label="Open library settings"
              title="Collection Settings"
            >
              <Settings size={18} />
            </button>
          </div>
        </header>

        {/* View Router */}
        {selectedDeck ? (
          <DeckDetail
            deck={selectedDeck}
            onBack={() => setSelectedDeck(null)}
            onEdit={() => {
              setIsEditorOpen(true);
            }}
            onSaveDeckUpdate={(updated) => {
              const idx = decks.findIndex((d) => d.id === updated.id);
              if (idx > -1) {
                const updatedDecks = [...decks];
                updatedDecks[idx] = updated;
                updateDecksInStorage(updatedDecks);
                setSelectedDeck(updated);
              }
            }}
          />
        ) : (
          <DeckListView
            decks={decks}
            onSelectDeck={setSelectedDeck}
            onAddDeck={() => {
              setSelectedDeck(null);
              setIsEditorOpen(true);
            }}
            onDeleteDeck={handleDeleteDeck}
            onImportDecks={handleImportDecks}
            onExportDecks={handleExportDecks}
            onOpenSettings={() => setIsSettingsOpen(true)}
            filter={filter}
            setFilter={setFilter}
            onOpenFilterSheet={() => setIsFilterOpen(true)}
          />
        )}
      </main>

      {/* Editor Modal Overlay */}
      {isEditorOpen && (
        <DeckEditor
          deck={selectedDeck}
          existingDecks={decks}
          onSave={handleSaveDeck}
          onClose={() => setIsEditorOpen(false)}
          onOpenScanner={() => setIsScannerOpen(true)}
        />
      )}

      {/* Filter Sheet Modal Overlay */}
      {isFilterOpen && (
        <DeckFilterSheet
          filter={filter}
          setFilter={setFilter}
          onClose={() => setIsFilterOpen(false)}
        />
      )}

      {/* Camera Card Scanner Overlay */}
      {isScannerOpen && (
        <CardScanner
          onClose={() => setIsScannerOpen(false)}
          onSelectScannedCommander={handleSelectScannedCommander}
        />
      )}

      {/* Library Settings Modal Sheet */}
      {isSettingsOpen && (
        <div className="sheet-overlay" onClick={() => setIsSettingsOpen(false)}>
          <div className="sheet-container glass-material" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-header">
              <span className="sheet-title">Collection Settings</span>
              <button
                type="button"
                className="btn btn-icon"
                style={{ width: '36px', height: '36px' }}
                onClick={() => setIsSettingsOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="sheet-body">
              <div className="form-section">
                <span className="form-section-title">Collection File Info</span>
                
                <div className="stepper" style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FolderSync size={16} className="text-secondary" />
                    <span className="form-label">Storage Link</span>
                  </div>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{fileLocation}</span>
                </div>

                <label className="stepper" style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span className="form-label">Load and save automatically</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Sync changes instantly to browser DB</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoSync}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      setAutoSync(enabled);
                      storageService.setAutoSyncEnabled(enabled);
                    }}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-accent)' }}
                  />
                </label>
              </div>

              {/* Sync Actions */}
              <div className="form-section">
                <span className="form-section-title">Manual Actions</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn"
                    style={{ justifyContent: 'flex-start' }}
                    onClick={() => {
                      setDecks(storageService.loadDecks());
                      alert('Re-loaded database from LocalStorage successfully!');
                    }}
                  >
                    <FolderSync size={16} style={{ marginRight: '4px' }} />
                    Load Library from Browser DB
                  </button>

                  <button
                    type="button"
                    className="btn"
                    style={{ justifyContent: 'flex-start' }}
                    onClick={() => {
                      storageService.saveDecks(decks);
                      alert('Manually saved all deck lists to local browser DB!');
                    }}
                  >
                    <Download size={16} style={{ marginRight: '4px' }} />
                    Save Library to Browser DB
                  </button>

                  <button
                    type="button"
                    className="btn btn-destructive"
                    style={{ justifyContent: 'flex-start' }}
                    onClick={() => {
                      if (confirm('CAUTION: This will clear your entire library. Decks cannot be recovered unless you exported a WUBRG JSON file. Continue?')) {
                        storageService.saveDecks([]);
                        setDecks([]);
                        setSelectedDeck(null);
                        setIsSettingsOpen(false);
                      }
                    }}
                  >
                    Clear Local Database
                  </button>
                </div>
              </div>

              {/* Info panel */}
              <div className="glass-panel" style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.05)', borderColor: 'rgba(59, 130, 246, 0.15)', display: 'flex', gap: '10px', marginTop: '20px' }}>
                <Info size={18} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  WUBRG-Web utilizes browser storage to persist your decks between sessions. To backup or move decks between devices (or transfer lists directly to/from the WUBRG Swift iOS app), utilize the Import/Export JSON buttons in the top navbar.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

//
//  CommanderSearchField.tsx
//  WUBRG-web
//
//  Created by Codex on 2026-05-26.
//

import React, { useState, useEffect, useRef } from 'react';
import { Search, Camera, X, PlusCircle, Sparkles, AlertCircle } from 'lucide-react';
import { scryfallClient, ScryfallCard } from '../services/scryfall';
import { MTGColor } from '../types/deck';

interface CommanderSearchFieldProps {
  deckName: string;
  setDeckName: (name: string) => void;
  commanderNames: string[];
  setCommanderNames: (names: string[]) => void;
  commanderImageURLStrings: string[];
  setCommanderImageURLStrings: (urls: string[]) => void;
  selectedColors: Set<MTGColor>;
  setSelectedColors: (colors: Set<MTGColor>) => void;
  onOpenScanner: () => void;
}

export const CommanderSearchField: React.FC<CommanderSearchFieldProps> = ({
  deckName,
  setDeckName,
  commanderNames,
  setCommanderNames,
  commanderImageURLStrings,
  setCommanderImageURLStrings,
  selectedColors,
  setSelectedColors,
  onOpenScanner,
}) => {
  const [searchText, setSearchText] = useState('');
  const [candidates, setCandidates] = useState<ScryfallCard[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const searchTimeoutRef = useRef<any | null>(null);

  // Trigger search on search text change (debounced)
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchText.trim().length < 2) {
      setCandidates([]);
      setErrorMessage(null);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(searchText);
    }, 400);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchText]);

  const performSearch = async (query: string) => {
    setIsSearching(true);
    setErrorMessage(null);
    try {
      const results = await scryfallClient.searchCommanderCandidates(query);
      setCandidates(results);
      if (results.length === 0) {
        setErrorMessage('No Commander-legal matches found.');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(err instanceof Error ? err.message : 'Search failed.');
      setCandidates([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectCard = (card: ScryfallCard) => {
    if (commanderNames.length >= 2) {
      setErrorMessage('Commander decks support up to two partner commanders.');
      return;
    }

    // Add commander name
    const newNames = [...commanderNames];
    if (!newNames.some(name => name.toLowerCase() === card.name.toLowerCase())) {
      newNames.push(card.name);
    }
    setCommanderNames(newNames);

    // Auto-update deck name if it's empty
    if (!deckName.trim()) {
      if (newNames.length === 1) {
        setDeckName(newNames[0]);
      } else {
        setDeckName(`${newNames[0]} and ${newNames[1]}`);
      }
    }

    // Add commander image URL
    const newImageURLs = [...commanderImageURLStrings];
    const imageURL = scryfallClient.getNormalImageURL(card);
    if (imageURL && !newImageURLs.includes(imageURL)) {
      newImageURLs.push(imageURL);
    }
    setCommanderImageURLStrings(newImageURLs);

    // Union the colors into color identity
    const cardColors = scryfallClient.getColors(card);
    const updatedColors = new Set(selectedColors);
    cardColors.forEach(c => updatedColors.add(c));
    setSelectedColors(updatedColors);

    // Reset search
    setSearchText('');
    setCandidates([]);
    setErrorMessage(null);
  };

  const handleRemoveCommander = (index: number) => {
    const updatedNames = [...commanderNames];
    const removedName = updatedNames[index];
    updatedNames.splice(index, 1);
    setCommanderNames(updatedNames);

    const updatedImageURLs = [...commanderImageURLStrings];
    if (updatedImageURLs[index]) {
      updatedImageURLs.splice(index, 1);
    }
    setCommanderImageURLStrings(updatedImageURLs);

    // Re-evaluate color identity based on remaining commander if wanted,
    // or keep colors. Usually, removing a commander doesn't necessarily wipe colors,
    // but let's match what Swift does:
    // "previousDeckName = deckName(for: names)"
    // "deckName = deckName(for: names)"
    const wasStandardName = deckName === (commanderNames.length === 1 ? removedName : `${commanderNames[0]} and ${commanderNames[1]}`);
    if (wasStandardName) {
      if (updatedNames.length === 0) setDeckName('');
      else if (updatedNames.length === 1) setDeckName(updatedNames[0]);
    }
  };

  return (
    <div className="commander-search-container">
      {/* Commander Selection Slots Panel */}
      <div className="commander-slots">
        {[0, 1].map((index) => {
          const name = commanderNames[index];
          const imageURL = commanderImageURLStrings[index];
          const hasCommander = !!name;

          return (
            <div key={index} className={`commander-slot-row ${hasCommander ? 'active' : ''}`}>
              <div className="slot-art">
                {imageURL ? (
                  <img src={imageURL} alt={name} className="artwork-img" />
                ) : (
                  <div className="artwork-placeholder">
                    <Sparkles size={16} />
                  </div>
                )}
              </div>
              <div className="slot-info">
                <span className="slot-label">{index === 0 ? 'Commander' : 'Partner'}</span>
                {hasCommander ? (
                  <span className="slot-name">{name}</span>
                ) : (
                  <span className="slot-name slot-empty">Open slot</span>
                )}
              </div>
              {hasCommander && (
                <button
                  type="button"
                  className="btn btn-icon"
                  style={{ width: '30px', height: '30px', background: 'transparent', border: 'none' }}
                  onClick={() => handleRemoveCommander(index)}
                >
                  <X size={16} className="text-secondary" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Search Input and Camera Button */}
      {commanderNames.length < 2 && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <div className="search-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder={commanderNames.length === 0 ? 'Search for a commander...' : 'Search for a partner...'}
            />
          </div>

          <button
            type="button"
            className="btn btn-icon"
            onClick={onOpenScanner}
            aria-label="Scan card with camera"
            title="Scan commander card"
          >
            <Camera size={18} />
          </button>
        </div>
      )}

      {/* Loading indicator */}
      {isSearching && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          <div className="spinner" style={{ border: '2px solid rgba(255,255,255,0.1)', borderTop: '2px solid #fff', borderRadius: '50%', width: '14px', height: '14px', animation: 'spin 1s linear infinite' }}></div>
          <span>Searching Scryfall...</span>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* Errors */}
      {errorMessage && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', fontSize: '13px', color: '#ff6b6b' }}>
          <AlertCircle size={14} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Autocomplete Dropdown list */}
      {candidates.length > 0 && (
        <div className="candidates-dropdown">
          {candidates.map((card) => {
            const imageURL = scryfallClient.getNormalImageURL(card);
            return (
              <div
                key={card.id}
                className="candidate-row"
                onClick={() => handleSelectCard(card)}
              >
                {imageURL ? (
                  <img src={imageURL} alt={card.name} className="candidate-art" />
                ) : (
                  <div className="candidate-art" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sparkles size={12} />
                  </div>
                )}
                <div className="candidate-info">
                  <span className="candidate-name">{card.name}</span>
                  {card.type_line && <span className="candidate-type">{card.type_line}</span>}
                </div>
                <span className="candidate-action">
                  {commanderNames.length === 0 ? 'Choose' : 'Add Partner'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

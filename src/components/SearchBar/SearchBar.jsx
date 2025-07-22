import React, { useState, useEffect, useRef } from 'react';
import './SearchBar.css';

const SearchBar = ({ 
  value, 
  onChange, 
  onSuggestionClick, 
  placeholder, 
  suggestions 
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const searchBarRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchBarRef.current && !searchBarRef.current.contains(event.target)) {
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="search-bar" ref={searchBarRef}>
      <input
        type="text"
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        placeholder={placeholder}
        className="search-input"
      />
      {isFocused && suggestions && suggestions.length > 0 && (
        <div className="suggestions-list">
          {suggestions.map((item, index) => {
            console.log(`Suggestion ${index}:`, item);
            console.log(`Address Name for Suggestion ${index}:`, item.address_name);
            return (
            <div
              key={index}
              className="suggestion-item"
              onClick={() => {
                onSuggestionClick(item);
                setIsFocused(false);
              }}
            >
              <div className="suggestion-name">
                {item.search_attributes?.suggested_text || item.name || item.full_name || item.address_name}
              </div>
              {item.address_name && (
                <div className="suggestion-address">
                  {item.address_name}
                </div>
              )}
            </div>
          )})}
        </div>
      )}
    </div>
  );
};

export default SearchBar; 
import React from 'react';
import './BaseMapSelector.css';

// Define la estructura de un mapa base
export interface BaseMap {
  id: string;
  name: string;
  url: string;
  attribution: string;
  thumbnail: string; // URL a la imagen en miniatura
  subdomains?: string[];
}

interface BaseMapSelectorProps {
  baseMaps: BaseMap[];
  onSelect: (baseMap: BaseMap) => void;
  onClose: () => void;
}

const BaseMapSelector: React.FC<BaseMapSelectorProps> = ({ baseMaps, onSelect, onClose }) => {
  return (
    <div className="basemap-selector-overlay" onClick={onClose}>
      <div className="basemap-selector-window" onClick={(e) => e.stopPropagation()}> 
        <div className="basemap-selector-header">
          <span>Mapas Base</span>
          <button onClick={onClose} className="basemap-selector-close-button">×</button>
        </div>
        <div className="basemap-selector-grid">
          {baseMaps.map(baseMap => (
            <div key={baseMap.id} className="basemap-item" onClick={() => onSelect(baseMap)}>
              <img src={baseMap.thumbnail} alt={baseMap.name} />
              <span>{baseMap.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BaseMapSelector;

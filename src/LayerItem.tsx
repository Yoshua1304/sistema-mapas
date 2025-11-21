import React, { useState, useEffect } from 'react';

export interface Layer {
  id: string;
  name: string;
  subLayers?: Layer[];
}

interface LayerItemProps {
  layer: Layer;
  selectedLayers: Set<string>;
  onSelectionChange: (layerId: string, isSelected: boolean) => void;

  // selector real para pintar mapa por diagnóstico
  onDiagnosticoSelect?: (diagnostico: string | null) => void;
  diagnosticoSeleccionado?: string | null;

  isSearchActive?: boolean;
}

const LayerItem: React.FC<LayerItemProps> = ({
  layer,
  selectedLayers,
  onSelectionChange,
  onDiagnosticoSelect,
  diagnosticoSeleccionado,
  isSearchActive
}) => {

  const isInitiallyExpanded =
    layer.id === 'vigilancia-salud-publica' || layer.id === 'distritos';

  const [isExpanded, setIsExpanded] = useState(isInitiallyExpanded);

  const hasSubLayers = layer.subLayers && layer.subLayers.length > 0;

  // Manejo de expandir al buscar
  useEffect(() => {
    if (isSearchActive && hasSubLayers) {
      setIsExpanded(true);
    } else {
      setIsExpanded(isInitiallyExpanded);
    }
  }, [isSearchActive, hasSubLayers, isInitiallyExpanded]);

  const isSelected = selectedLayers.has(layer.id);

  // Expandir categoría
  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasSubLayers && !isSearchActive) {
      setIsExpanded(!isExpanded);
    }
  };

  // Seleccionar la capa (NO activa diagnóstico)
  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const nuevoEstado = !isSelected;
    onSelectionChange(layer.id, nuevoEstado);
  };

  return (
    <li className="layer-item">
      <div className="layer-header" onClick={handleToggleExpand}>
        
        {/* Flecha */}
        <span
          className={`arrow ${hasSubLayers ? 'clickable' : ''} ${isExpanded ? 'expanded' : ''}`}
        >
          {hasSubLayers && '▶'}
        </span>

        {/* Checkbox principal (mostrar la capa) */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleSelect}
          onClick={(e) => e.stopPropagation()}
          className="layer-checkbox"
        />

        <span className="layer-name">{layer.name}</span>

        {/* Checkbox exclusivo para activar "pintado" por diagnóstico */}
        {layer.id.startsWith("diagnostico-") && (
          <div className="diagnostico-checkbox">
            <input
              type="checkbox"
              checked={diagnosticoSeleccionado === layer.name}
              onChange={() =>
                onDiagnosticoSelect?.(
                  diagnosticoSeleccionado === layer.name ? null : layer.name
                )
              }
              onClick={(e) => e.stopPropagation()}
            />
            <span>Pintar</span>
          </div>
        )}
      </div>

      {/* Subcapas */}
      {isExpanded && hasSubLayers && (
        <ul className="sub-layer-list">
          {layer.subLayers?.map((subLayer) => (
            <LayerItem
              key={subLayer.id}
              layer={subLayer}
              selectedLayers={selectedLayers}
              onSelectionChange={onSelectionChange}
              onDiagnosticoSelect={onDiagnosticoSelect}
              diagnosticoSeleccionado={diagnosticoSeleccionado}
              isSearchActive={isSearchActive}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

export default LayerItem;

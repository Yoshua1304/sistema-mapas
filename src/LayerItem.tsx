import React, { useState, useEffect } from 'react';

export interface Layer {
  id: string;
  name: string;
  type?: 'geojson' | 'diagnostico';
  subLayers?: Layer[];
}

interface LayerItemProps {
  layer: Layer;
  selectedLayers: Set<string>;
  onSelectionChange: (layerId: string, isSelected: boolean) => void;

  // selector real para pintar mapa por diagnóstico
  onDiagnosticoSelect?: (diagnostico: string, checked: boolean) => void;
  diagnosticoSeleccionado?: string[]; // ahora es array

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
  const isLeaf = !hasSubLayers;

  useEffect(() => {
    if (isSearchActive && hasSubLayers) {
      setIsExpanded(true);
    } else {
      setIsExpanded(isInitiallyExpanded);
    }
  }, [isSearchActive, hasSubLayers, isInitiallyExpanded]);

  const isSelected = selectedLayers.has(layer.id);

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasSubLayers && !isSearchActive) {
      setIsExpanded(!isExpanded);
    }
  };

  // Manejo del checkbox principal.
  // Si la capa es diagnostic-*, este checkbox actuará como "seleccionar diagnóstico" Y como "pintar".
  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const nuevoEstado = e.target.checked;

    // 1) Notificar selección de capa (visibilidad)
    onSelectionChange(layer.id, nuevoEstado);

    // 2) Si es diagnóstico, notificar selección/ deselección del diagnóstico (array)
    if (layer.id.startsWith("diagnostico-")) {
      onDiagnosticoSelect?.(layer.name, nuevoEstado);
    }
  };

  return (
    <li 
      className={`layer-item ${isExpanded ? 'expanded' : ''} ${layer.id.startsWith('ris-') ? 'ris-item' : ''} ${selectedLayers.has(layer.id) ? 'selected' : ''}`}
      data-ris={layer.id.startsWith('ris-') ? 'true' : 'false'}
      data-layer-id={layer.id}
    >
      <div className="layer-header" onClick={handleToggleExpand}>
        <span
          className={`arrow ${hasSubLayers ? 'clickable' : ''} ${isExpanded ? 'expanded' : ''}`}
        >
          {hasSubLayers && '▶'}
        </span>

        {/* Checkbox principal (mostrar la capa) */}
        {/* Para capas diagnósticas: este checkbox será la única UI */}
        {isLeaf && (
          <input
            type="checkbox"
            checked={
              layer.id.startsWith("diagnostico-")
                ? !!diagnosticoSeleccionado?.includes(layer.name)
                : isSelected
            }
            onChange={handleSelect}
            onClick={(e) => e.stopPropagation()}
            className="layer-checkbox"
          />
        )}


        <span className="layer-name">{layer.name}</span>
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

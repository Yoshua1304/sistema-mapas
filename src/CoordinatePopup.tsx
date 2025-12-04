import React, { useEffect, useState } from 'react';
import proj4 from 'proj4';
import './CoordinatePopup.css';

// Definir la proyección UTM en este componente también
proj4.defs("EPSG:32719", "+proj=utm +zone=19 +south +datum=WGS84 +units=m +no_defs");

interface CoordinatePopupProps {
  lat: number;
  lng: number;
  address: string;
  onDelete: () => void;
  onCopyCoordinates?: () => void;
}

const CoordinatePopup: React.FC<CoordinatePopupProps> = ({
  lat,
  lng,
  address,
  onDelete,
  onCopyCoordinates
}) => {
  const [utmCoords, setUtmCoords] = useState<{ 
    easting: number; 
    northing: number; 
    zone: string 
  }>({ easting: 0, northing: 0, zone: '' });

  // Formateador de números
  const fmt = (num: number) => num.toFixed(6);

  // Calcular UTM al montar el componente
  useEffect(() => {
    try {
      const [easting, northing] = proj4("EPSG:4326", "EPSG:32719", [lng, lat]);
      const zoneNumber = Math.floor((lng + 180) / 6) + 1;
      setUtmCoords({ 
        easting: Number(easting.toFixed(2)), 
        northing: Number(northing.toFixed(2)), 
        zone: `${zoneNumber}K` 
      });
    } catch (error) {
      console.error("Error en la conversión de coordenadas:", error);
      setUtmCoords({ easting: 0, northing: 0, zone: 'N/A' });
    }
  }, [lat, lng]);

  // Función para copiar coordenadas al portapapeles
  const handleCopyCoordinates = () => {
    const coordsText = `Lat: ${fmt(lat)}, Lng: ${fmt(lng)}`;
    navigator.clipboard.writeText(coordsText)
      .then(() => {
        if (onCopyCoordinates) onCopyCoordinates();
      })
      .catch(err => console.error('Error copiando coordenadas:', err));
  };

  return (
    <div className="coordinate-popup-container">
      
      {/* HEADER AZUL */}
      <div className="coordinate-popup-header">
        <span>UBICACIÓN MARCADA</span>
      </div>

      <div className="coordinate-popup-content">

        {/* TÍTULO PRINCIPAL */}
        <h2 className="coordinate-title">Coordenadas Seleccionadas</h2>
        <div className="coordinate-title-underline"></div>

        {/* TARJETAS DE COORDENADAS */}
        <div className="coordinate-cards">
          
          {/* TARJETA DE COORDENADAS GEOGRÁFICAS */}
          <div className="coordinate-card blue">
            <div className="coordinate-card-header">
              <i className="fas fa-globe-americas"></i>
              <h3>Coordenadas Geográficas</h3>
            </div>
            <div className="coordinate-card-content">
              <div className="coordinate-row">
                <div className="coordinate-label">
                  <i className="fas fa-arrow-up"></i>
                  <span>Latitud</span>
                </div>
                <div className="coordinate-value">{fmt(lat)}</div>
              </div>
              <div className="coordinate-row">
                <div className="coordinate-label">
                  <i className="fas fa-arrow-right"></i>
                  <span>Longitud</span>
                </div>
                <div className="coordinate-value">{fmt(lng)}</div>
              </div>
            </div>
          </div>

          {/* TARJETA DE COORDENADAS UTM */}
          <div className="coordinate-card green">
            <div className="coordinate-card-header">
              <i className="fas fa-ruler-combined"></i>
              <h3>Coordenadas UTM</h3>
            </div>
            <div className="coordinate-card-content">
              <div className="coordinate-row">
                <div className="coordinate-label">
                  <i className="fas fa-map-marker-alt"></i>
                  <span>Zona</span>
                </div>
                <div className="coordinate-value">{utmCoords.zone}</div>
              </div>
              <div className="coordinate-row">
                <div className="coordinate-label">
                  <i className="fas fa-long-arrow-alt-right"></i>
                  <span>Este (Easting)</span>
                </div>
                <div className="coordinate-value">{utmCoords.easting.toFixed(2)} m</div>
              </div>
              <div className="coordinate-row">
                <div className="coordinate-label">
                  <i className="fas fa-long-arrow-alt-up"></i>
                  <span>Norte (Northing)</span>
                </div>
                <div className="coordinate-value">{utmCoords.northing.toFixed(2)} m</div>
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN DE DIRECCIÓN */}
        <div className="address-section">
          <div className="section-header">
            <i className="fas fa-map-pin"></i>
            <h3>Dirección</h3>
          </div>
          <div className="address-content">
            {address || 'Cargando dirección...'}
          </div>
        </div>

        {/* ACCIONES */}
        <div className="coordinate-actions">
          <button 
            className="action-button copy-button"
            onClick={handleCopyCoordinates}
            title="Copiar coordenadas"
          >
            <i className="fas fa-copy"></i>
            <span>Copiar Coordenadas</span>
          </button>
          
          <button 
            className="action-button delete-button"
            onClick={onDelete}
            title="Eliminar marcador"
          >
            <i className="fas fa-trash"></i>
            <span>Eliminar Marcador</span>
          </button>
        </div>

        {/* INFORMACIÓN ADICIONAL */}
        <div className="coordinate-footer">
          <div className="footer-info">
            <i className="fas fa-info-circle"></i>
            <span>Datum: WGS84 • Sistema: GCS</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CoordinatePopup;
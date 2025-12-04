import React, { useState, useEffect, useMemo } from 'react';
import ReactDOMServer from 'react-dom/server';
import { MapContainer, TileLayer, GeoJSON, useMapEvents } from 'react-leaflet';
import { DomEvent, Layer as LeafletLayer } from 'leaflet';
import * as L from 'leaflet';
import proj4 from 'proj4';
import 'leaflet/dist/leaflet.css';
import './App.css';
import LayerItem, { Layer } from './LayerItem';
import DistrictPopup from './DistrictPopup';
import BaseMapSelector, { BaseMap } from './BaseMapSelector';
import Legend from './Legend';

// --- CONFIGURACIÓN DE MAPAS BASE ---
const BASE_MAPS: BaseMap[] = [
  {
    id: 'google-streets',
    name: 'Google Maps',
    url: 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: '&copy; Google',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    thumbnail: '/google-streets.png'
  },
  {
    id: 'google-satellite',
    name: 'Google Satelital',
    url: 'https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    attribution: '&copy; Google',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    thumbnail: '/google-satellite.png'
  },
  {
    id: 'google-terrain',
    name: 'Google Terreno',
    url: 'https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
    attribution: '&copy; Google',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    thumbnail: '/google-terrain.png'
  },
  {
    id: 'osm-standard',
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    subdomains: ['a', 'b', 'c'],
    thumbnail: '/osm-standard.png'
  },
];

// Estructura de datos GeoJSON
interface GeoJSONData {
  type: "FeatureCollection";
  features: Array<any>;
}

interface MapResetHandlerProps {
  setClickedDistrictId: React.Dispatch<React.SetStateAction<string | null>>;
  setSearchedDistrictId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedDistrictLayerIds: React.Dispatch<React.SetStateAction<Set<string>>>;
}

const MapResetClickHandler: React.FC<MapResetHandlerProps> = ({
  setClickedDistrictId,
  setSearchedDistrictId,
  setSelectedDistrictLayerIds,
}) => {
  useMapEvents({
    click: () => {
      // Si el evento llega aquí, significa que se hizo clic en el mapa 
      // y que ninguna capa (distrito) detuvo la propagación.
      
      // 1. Limpiamos el resaltado por clic directo
      setClickedDistrictId(null);
      
      // 2. Limpiamos el resaltado por búsqueda
      setSearchedDistrictId(null);
      
      // 3. Limpiamos el resaltado por selección de casilla en el panel de Capas
      setSelectedDistrictLayerIds(new Set()); 
      
      // NOTA: Si también tienes un estado para el Popup o Sidebar, deberías cerrarlo aquí.
    },
  });

  return null; // Este componente no renderiza nada visible
};

// Proyección UTM
proj4.defs("EPSG:32719", "+proj=utm +zone=19 +south +datum=WGS84 +units=m +no_defs");

// Componente de coordenadas del mouse
function MouseCoordinates() {
  const [position, setPosition] = useState({ lat: 0, lng: 0 });
  const [utmCoords, setUtmCoords] = useState({ easting: 0, northing: 0, zone: '19K' });

  useMapEvents({
    mousemove: (e) => {
      const { lat, lng } = e.latlng;
      setPosition(e.latlng);
      try {
        const [easting, northing] = proj4("EPSG:4326", "EPSG:32719", [lng, lat]);
        const zoneNumber = Math.floor((lng + 180) / 6) + 1;
        setUtmCoords({ easting, northing, zone: `${zoneNumber}K`});
      } catch (error) {
        console.error("Error en la conversión de coordenadas:", error);
        setUtmCoords({ easting: 0, northing: 0, zone: 'N/A'});
      }
    },
  });

  return (
    <div className="mouse-coordinates">
        <span className="coord-item datum">DATUM: WGS84</span>
        <span className="coord-item">GCS Longitud: {position.lng.toFixed(5)}</span>
        <span className="coord-item">Latitud: {position.lat.toFixed(5)}</span>
        <span className="coord-item">UTM Zona: {utmCoords.zone}</span>
        <span className="coord-item">Este: {utmCoords.easting.toFixed(2)}m</span>
        <span className="coord-item">Norte: {utmCoords.northing.toFixed(2)}m</span>
    </div>
  );
}

const VIGILANCIA_LAYER_DATA: Layer = {
    id: 'vigilancia-salud-publica',
    name: 'Vigilancia de la Salud Pública',
    subLayers: [
        {
            id: 'enf-transmisibles', name: 'Enfermedades Transmisibles', subLayers: [
                { id: 'diagnostico-zoonosis', name: 'Zoonosis', subLayers: [
              { id: 'diagnostico-antrax-carbunco', name: 'Ántrax (Carbunco)' },
              { id: 'diagnostico-fasciolosis-humana', name: 'Fasciolosis humana' },
              { id: 'diagnostico-leptospirosis', name: 'Leptospirosis' },
              { id: 'diagnostico-loxcelismo', name: 'Loxocelismo' },
              { id: 'diagnostico-meningitis-peste', name: 'Meningitis por peste' },
              { id: 'diagnostico-ofidismo', name: 'Ofidismo' },

              { id: 'diagnostico-peste-otras-formas', name: 'Otras formas de peste' },
              { id: 'diagnostico-peste-bubonica', name: 'Peste bubónica' },
              { id: 'diagnostico-peste-cutanea', name: 'Peste cutánea' },
              { id: 'diagnostico-peste-neumonica', name: 'Peste neumónica' },
              { id: 'diagnostico-peste-no-especificada', name: 'Peste no especificada' },
              { id: 'diagnostico-peste-septicemica', name: 'Peste septicémica' },

              { id: 'diagnostico-rabia-humana-silvestre', name: 'Rabia humana silvestre' },
              { id: 'diagnostico-rabia-humana-urbana', name: 'Rabia humana urbana' },

              { id: 'diagnostico-sindrome-pulmonar-hantavirus', name: 'Síndrome pulmonar por Hanta virus' },
              { id: 'diagnostico-tifus-exantematico', name: 'Tifus exantemático' }
          ]},
                {
                  id: 'diagnostico-metaxenicas',
                  name: 'Metaxénicas',
                  subLayers: [
                      {
                          id: 'diagnostico-arbovirosis',
                          name: 'Arbovirosis',
                          subLayers: [
                              { id: 'diagnostico-carrion-aguda', name: 'Enfermedad de Carrión Aguda' },
                              { id: 'diagnostico-carrion-eruptiva', name: 'Enfermedad de Carrión Eruptiva' },
                              { id: 'diagnostico-carrion-no-deter', name: 'Enfermedad de Carrión No Determinada' },

                              { id: 'diagnostico-chikungunya', name: 'Fiebre de Chikungunya' },
                              { id: 'diagnostico-chikungunya-grave', name: 'Fiebre de Chikungunya Grave' },

                              { id: 'diagnostico-zika', name: 'Zika' },
                              { id: 'diagnostico-zika-gestantes', name: 'Zika en gestantes' },
                              { id: 'diagnostico-zika-asintomatico', name: 'Zika asintomático' },
                              { id: 'diagnostico-zika-asintomatico-gestantes', name: 'Zika asintomático en gestantes' },

                              { id: 'diagnostico-dengue-sin-signos', name: 'Dengue sin signos de alarma' },
                              { id: 'diagnostico-dengue-con-signos', name: 'Dengue con signos de alarma' },
                              { id: 'diagnostico-dengue-grave', name: 'Dengue grave' },

                              { id: 'diagnostico-malaria-falciparum', name: 'Malaria P. falciparum' },
                              { id: 'diagnostico-malaria-vivax', name: 'Malaria por P. vivax' },
                              { id: 'diagnostico-malaria-malariae', name: 'Malaria por P. malariae' },
                              { id: 'diagnostico-malaria-ovale', name: 'Malaria por P. ovale' },

                              { id: 'diagnostico-leishmaniasis-cutanea', name: 'Leishmaniasis cutánea' },
                              { id: 'diagnostico-leishmaniasis-mucocutanea', name: 'Leishmaniasis mucocutánea' },

                              { id: 'diagnostico-chagas', name: 'Enfermedad de Chagas' },

                              { id: 'diagnostico-mayaro', name: 'Mayaro' },
                              { id: 'diagnostico-oropuche', name: 'Oropuche' },
                          ]},
                  ]
              },
                { id: 'diagnostico-vih-sida-ets', name: 'VIH/SIDA/ETS', subLayers: [
                    { id: 'diagnostico-infeccion-gonococica', name: 'infección gonococica' },
                    { id: 'diagnostico-hepatitis-b', name: 'Hepatitis B' },
                    { id: 'diagnostico-nino-expuesto-vih', name: 'Niño expuesto al VIH' },
                    { id: 'diagnostico-infeccion-vih', name: 'Infección por VIH' },
                    { id: 'diagnostico-sida', name: 'Sida' },
                    { id: 'diagnostico-sifilis-congenita', name: 'Sifilis congenita' },
                    { id: 'diagnostico-sifilis-materna', name: 'Sifilis materna' },
                    { id: 'diagnostico-sifilis-no-especificada', name: 'Sifilis no especificada' },

                ]},
                { id: 'diagnostico-inmunoprevenibles', name: 'Inmunoprevenibles', subLayers: [
                    { id: 'diagnostico-difteria', name: 'Difteria' },
                    { id: 'diagnostico-encefalitis-varicela', name: 'Encefalitis debida a varicela' },
                    { id: 'diagnostico-esavi', name: 'ESAVI - Evento adverso post vacunal' },
                    { id: 'diagnostico-fiebre-amarilla-selvatica', name: 'Fiebre amarilla selvática' },
                    { id: 'diagnostico-gestante-vacunada-inadvertida', name: 'Gestante vacunada inadvertidamente' },
                    { id: 'diagnostico-hepatitis-b', name: 'Hepatitis B' },
                    { id: 'diagnostico-meningitis-varicela', name: 'Meningitis debida a varicela' },
                    { id: 'diagnostico-microcefalia', name: 'Microcefalia' },
                    { id: 'diagnostico-neumonia-varicela', name: 'Neumonía debida a varicela' },
                    { id: 'diagnostico-paralisis-flacida-aguda', name: 'Parálisis flácida aguda' },
                    { id: 'diagnostico-parotiditis', name: 'Parotiditis' },
                    { id: 'diagnostico-parotiditis-complicaciones', name: 'Parotiditis con complicaciones' },
                    { id: 'diagnostico-rubeola', name: 'Rubeola' },
                    { id: 'diagnostico-rubeola-congenita', name: 'Rubeola congénita' },
                    { id: 'diagnostico-rubeola-congenita-cent', name: 'Rubeola congénita CENT' },
                    { id: 'diagnostico-sarampion', name: 'Sarampión' },
                    { id: 'diagnostico-guillain-barre', name: 'Síndrome de Guillain Barré' },
                    { id: 'diagnostico-tetanos', name: 'Tétanos' },
                    { id: 'diagnostico-tetanos-neonatal', name: 'Tétanos neonatal' },
                    { id: 'diagnostico-tos-ferina', name: 'Tos ferina' },
                    { id: 'diagnostico-varicela-complicaciones', name: 'Varicela con otras complicaciones' },
                    { id: 'diagnostico-varicela-sin-complicaciones', name: 'Varicela sin complicaciones' },
                    { id: 'diagnostico-viruela', name: 'Viruela' },
                    { id: 'diagnostico-viruela-del-mono', name: 'Viruela del mono' },
                ]},
                { id: 'diagnostico-tuberculosis-group', name: 'Tuberculosis', subLayers: [
                    { id: 'diagnostico-tbcpulmonar', name: 'TBC pulmonar'},
                    { id: 'diagnostico-tbcTIA', name: 'TBC TIA' },
                    { id: 'diagnostico-tbcTIAEESS', name: 'TBC TIA EESS' },

                ]},
                { id: 'diagnostico-ira-eda-etc', name: 'IRA/EDA/Febriles/SGB', subLayers: [
                    { id: 'diagnostico-iras', name: 'Infecciones respiratorias agudas' },
                    { id: 'diagnostico-covid-19', name: 'COVID-19' },
                    { id: 'diagnostico-febriles', name: 'Febriles' },
                    { id: 'diagnostico-sindrome-resp-agudo', name: 'Síndrome respiratorio agudo severo' },
                    { id: 'diagnostico-gripe-humana', name: 'Gripe humana causada por un nuevo subtipo de virus' },
                    { id: 'diagnostico-guillain-barre', name: 'Síndrome de Guillain Barré' },
                    { id: 'diagnostico-colera', name: 'Cólera' },
                    { id: 'diagnostico-edas', name: 'Enfermedades diarreicas agudas' },
                ]},
                { id: 'diagnostico-riesgos-alimentarios', name: 'Riesgos Alimentarios', subLayers: [
                    { id: 'diagnostico-eta', name: 'Enfermedades Transmitidas por Alimentos' }
                ]},
            ]
        },
        {
            id: 'diagnostico-enf-no-transmisibles', name: 'Enfermedades No Transmisibles', subLayers: [
                { id: 'diagnostico-salud-mental', name: 'Salud Mental', subLayers: [
                    { id: 'diagnostico-intento-suicidio', name: 'Intento de suicidio' },
                    { id: 'diagnostico-episodio-depresivo', name: 'Episodio depresivo' },
                    { id: 'diagnostico-primer-episodio-psicotico', name: 'Primer episodio psicótico' },
                    { id: 'diagnostico-violencia-familiar', name: 'Violencia familiar' },
                ]},
                { id: 'diagnostico-accidentes-transito', name: 'Accidentes de Tránsito', subLayers: [
                    { id: 'diagnostico-lesiones-transito', name: 'Lesiones por accidente de tránsito' }
                ]},
                { id: 'diagnostico-enf-cronicas', name: 'Enfermedades Crónicas', subLayers: [
                    { id: 'diagnostico-cancer', name: 'Cáncer' },
                    { id: 'diagnostico-diabetes-mellitus', name: 'Diabetes mellitus' },
                ]},
            ]
        },
        {
            id: 'diagnostico-vigilancia-hospitalaria', name: 'Vigilancia Hospitalaria', subLayers: [
                { id: 'diagnostico-iaas', name: 'Infecciones Asociadas a la Atención de la Salud', subLayers: [
                    { id: 'diagnostico-iaas-sub', name: 'Infecciones Asociadas a la Atención de la Salud' }
                ]},
            ]
        },
        {
            id: 'diagnostico-materno-perinatal', name: 'Materno Perinatal', subLayers: [
                { id: 'diagnostico-madre-nino', name: 'Madre Niño', subLayers: [
              { id: 'diagnostico-muerte-materna-directa', name: 'Muerte materna directa' },
              { id: 'diagnostico-muerte-materna-directa-tardia', name: 'Muerte materna directa tardía' },
              { id: 'diagnostico-muerte-materna-indirecta', name: 'Muerte materna indirecta' },
              { id: 'diagnostico-muerte-materna-indirecta-tardia', name: 'Muerte materna indirecta tardía' },
              { id: 'diagnostico-muerte-materna-incidental', name: 'Muerte materna incidental' }
          ]}
            ]
        },
        {
            id: 'diagnostico-riesgos-ambientales', name: 'Riesgos Ambientales', subLayers: [
                { id: 'diagnostico-plaguicidas-metales', name: 'Plaguicidas y Metales', subLayers: [
                    { id: 'diagnostico-efecto-plaguicidas', name: 'Efecto tóxico de plaguicidas' }
                ]}
            ]
        },
        {
            id: 'diagnostico-otras-vigilancias', name: 'Otras Vigilancias', subLayers: [
                { id: 'diagnostico-brotes-epidemias', name: 'Brotes, epidemias y emergencias sanitarias' },
                { id: 'diagnostico-cambio-climatico', name: 'Cambio Climático-Emergencias y Desastres' },
            ]
        }
    ]
};

function App() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [allDistricts, setAllDistricts] = useState<GeoJSONData | null>(null);
  const [layers, setLayers] = useState<Layer[]>([VIGILANCIA_LAYER_DATA]);
  const [selectedLayers, setSelectedLayers] = useState<Set<string>>(new Set(['distritos']));
  const [layerSearchTerm, setLayerSearchTerm] = useState('');
  const [mapSearchTerm, setMapSearchTerm] = useState('');
  const [searchedDistrictId, setSearchedDistrictId] = useState<string | null>(null);
  const [clickedDistrictId, setClickedDistrictId] = useState<string | null>(null);
  const [selectedDistrictLayerIds, setSelectedDistrictLayerIds] = useState<Set<string>>(new Set());
  const [map, setMap] = useState<any>(null);
  const [suggestionResults, setSuggestionResults] = useState<string[]>([]);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [isBaseMapSelectorOpen, setBaseMapSelectorOpen] = useState(false);
  const [currentBaseMap, setCurrentBaseMap] = useState<BaseMap>(BASE_MAPS[0]);
  const position: [number, number] = [-12.00, -77.02];
  const zoomLevel = 12;

  const [casosPorDistrito, setCasosPorDistrito] = useState<Record<string, any>>({});
  const [diagnosticoSeleccionado, setDiagnosticoSeleccionado] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCopyNotification, setShowCopyNotification] = useState(false);  

//console.log("🟦 diagnosticoSeleccionado TYPE:", typeof diagnosticoSeleccionado);
//console.log("🟦 diagnosticoSeleccionado VALUE:", diagnosticoSeleccionado);
//console.log("🟦 diagnosticoSeleccionado IS ARRAY:", Array.isArray(diagnosticoSeleccionado));

const cargarFebrilesPorDistrito = async () => {
  if (!allDistricts) return;

  const resultados: any = {};

  for (const feature of allDistricts.features) {
    const distrito = feature.properties.NM_DIST;

    try {
      const resp = await fetch(`http://127.0.0.1:5000/api/febriles_distrito?distrito=${distrito}`);
      const data = await resp.json();

      resultados[distrito] = {
        total: data.total || 0,
        detalle: data.detalle || []
      };

    } catch (err) {
      console.error(`Error cargando febriles en distrito ${distrito}:`, err);
    }
  }

  setCasosPorDistrito(resultados);
};

const cargarEdasPorDistrito = async () => {
  if (!allDistricts) return;

  const results: Record<string, any> = {};

  for (const feature of allDistricts.features) {
    const distrito = feature.properties.NM_DIST.toUpperCase();

    try {
      const res = await fetch(`/api/edas/${encodeURIComponent(distrito)}`);
      const data = await res.json();

      results[distrito] = {
        total: data.total || 0,
        detalle: [
          { tipo_dx: "DAA", cantidad: data.daa || 0 },
          { tipo_dx: "DIS", cantidad: data.dis || 0 }
        ]
      };

    } catch (err) {
      console.error("❌ Error EDAS en ", distrito, err);

      results[distrito] = {
        total: 0,
        detalle: [
          { tipo_dx: "DAA", cantidad: 0 },
          { tipo_dx: "DIS", cantidad: 0 }
        ]
      };
    }
  }

  setCasosPorDistrito(prev => ({
    ...prev,
    EDAS: results
  }));
};


const cargarIRASPorDistrito = async () => {
  if (!allDistricts) return;

  const results: Record<string, any> = {};

  for (const feature of allDistricts.features) {
      console.log("➡️ Distrito en GeoJSON:", feature.properties.NM_DIST);
    const distrito = feature.properties.NM_DIST.toUpperCase();

    try {
     const res = await fetch(`/api/iras/${encodeURIComponent(distrito)}`);

      const data = await res.json();

      results[distrito] = {
        total: data.total || 0,
        detalle: [
          { tipo_dx: "IRA NO NEUMONIA", cantidad: data.detalle.cantidad || 0 },
          { tipo_dx: "SOB/ASMA",        cantidad: data.sob_asma || 0 },
          { tipo_dx: "NEUMONÍA GRAVE",  cantidad: data.neumonia_grave || 0 },
          { tipo_dx: "NEUMONÍA",        cantidad: data.neumonia || 0 }
        ]
      };

    } catch (err) {
      console.error("❌ Error IRAS en ", distrito, err);

      results[distrito] = {
        total: 0,
        detalle: [
          { tipo_dx: "IRA NO NEUMONIA", cantidad: 0 },
          { tipo_dx: "SOB/ASMA",        cantidad: 0 },
          { tipo_dx: "NEUMONÍA GRAVE",  cantidad: 0 },
          { tipo_dx: "NEUMONÍA",        cantidad: 0 }
        ]
      };
    }
  }

  // 🔥 Guardar como EDAS (esto sí pinta el mapa)
  setCasosPorDistrito(prev => ({
    ...prev,
    IRAS: results
  }));

};

const cargarTIATotal = async () => {
  try {
    const resp = await fetch("http://127.0.0.1:5000/tb_tia_total");
    const data = await resp.json();

    // Transformamos a un diccionario: { "LIMA": { TIA_100k: 222.09 }, ... }
    const resultados: Record<string, any> = {};

    for (const item of data) {
      const distrito = item.Distrito.toUpperCase();

      resultados[distrito] = {
        TIA_100k: item.TIA_100k,
        casos: item.casos,
        poblacion: item.poblacion_total
      };
    }

    // Guardamos en el estado general
    setCasosPorDistrito(prev => ({
      ...prev,
      TBC_TIA: resultados
    }));

  } catch (error) {
    console.error("❌ Error cargando TB TIA:", error);
  }
};

const cargarTIATotalEESS = async () => {
  try {
    const resp = await fetch("http://127.0.0.1:5000/tb_tia_total_EESS");
    const data = await resp.json();

    // Transformamos a un diccionario: { "LIMA": { TIA_100k: 222.09 }, ... }
    const resultados: Record<string, any> = {};

    for (const item of data) {
      const distrito = item.Distrito.toUpperCase();

      resultados[distrito] = {
        TIA_100k: item.TIA_100k,
        casos: item.casos,
        poblacion: item.poblacion_total
      };
    }

    // Guardamos en el estado general
    setCasosPorDistrito(prev => ({
      ...prev,
      "TBC TIA EESS": resultados
    }));

  } catch (error) {
    console.error("❌ Error cargando TB TIA EESS:", error);
  }
};

const cargarSigtbDistritos = async () => {
  try {
    const resp = await fetch("http://127.0.0.1:5000/tb_sigtb_distritos");
    const data = await resp.json();

    const resultados: Record<string, { total: number }> = {};

    for (const distrito in data) {
      resultados[distrito.toUpperCase()] = {
        total: data[distrito]
      };
    }

    setCasosPorDistrito(prev => ({
      ...prev,
      SIGTB: resultados
    }));

    console.log("SIGTB cargado:", resultados);

  } catch (err) {
    console.error("❌ Error cargando SIGTB:", err);
  }
};


const resetMapToDefault = () => {
    // 1. Limpiar filtros de Diagnóstico y casos
    setDiagnosticoSeleccionado([]);
    setCasosPorDistrito({}); 
    // setCasosDetallePorDistrito({}); // Si existe y se usa, también debe limpiarse

    // 2. Restablecer la selección de capas (solo 'distritos' por defecto)
    const defaultLayers = new Set(['distritos']);
    setSelectedLayers(defaultLayers);
    setSelectedDistrictLayerIds(new Set()); 

    // 3. Limpiar búsquedas y clics
    setLayerSearchTerm('');
    setMapSearchTerm('');
    setSearchedDistrictId(null);
    setClickedDistrictId(null);
    
    // 4. Volver a la vista inicial del mapa
    if (map) {
        map.setView(position, zoomLevel); 
    }
    
    console.log("✅ Mapa y filtros reseteados.");
};

useEffect(() => {
  if (!allDistricts) return;
  if (!diagnosticoSeleccionado || diagnosticoSeleccionado.length === 0) return;

  const diagnostico = diagnosticoSeleccionado[ diagnosticoSeleccionado.length - 1 ];
console.log("🟢 diagnosticoSeleccionado →", diagnosticoSeleccionado);
console.log("🟢 diagnostico final →", diagnostico);

  // 🔴 EDAS
  if (diagnostico === "diagnostico-edas") {
    console.log("🔥 Cargando EDAS...");
    cargarEdasPorDistrito();
    return;
  }

  // 🔵 FEBRILES
  if (diagnostico === "diagnostico-febriles") {
    console.log("🟦 Cargando FEBRILES...");
    cargarFebrilesPorDistrito();
    return;
  }

    // 🔵 IRAS
  if (diagnostico === "diagnostico-iras") {
    console.log("🟦 Cargando IRAS...");
    cargarIRASPorDistrito();
    return;
  }

      // 🔵 TUBERCULOSIS_TIA
if (diagnostico.trim().toLowerCase() === "diagnostico-tbcTIA") {
    cargarTIATotal();
    return;
}

      // 🔵 TUBERCULOSIS_TIA_EESS
if (diagnostico.trim().toLowerCase() === "diagnostico-tbctiaeess") {
    cargarTIATotalEESS();
    return;
}

    // 🔵 TUBERCULOSIS
if (diagnostico.trim().toLowerCase() === "diagnostico-tbcpulmonar") {
    cargarSigtbDistritos();
    return;
}

  // 🟢 Diagnósticos NOTIWEB normales
  cargarCasosPorDiagnostico(diagnostico);

}, [diagnosticoSeleccionado, allDistricts]);

const cargarCasosPorDiagnostico = async (diagnostico: string) => {
  diagnostico = diagnostico.trim();
  
  if (!allDistricts) return;

  console.log("================================");
  console.log("🔍 Diagnóstico seleccionado:", diagnostico);
  console.log("================================");

  // ⬅️ AHORA resultados almacena total + tia
  const resultados: Record<string, { total: number; TIA_100k: number | null }> = {};

const detalles: Record<
      string,
      {
        total: number;
        detalle: { tipo_dx: string; cantidad: number }[];
        TIA_100k?: number | null; // 💡 AGREGAR ESTO: La tasa TIA
      }
    > = {};

  const esTBC = diagnostico.toUpperCase().includes("TBC");

  for (const feature of allDistricts.features) {
    const distrito = feature.properties.NM_DIST;
    const url = `http://localhost:5000/api/casos_enfermedad?distrito=${distrito}&enfermedad=${diagnostico}`;

    console.log(`🌐 Consultando backend para distrito: ${distrito}`);
    console.log(`URL → ${url}`);

    try {
      const res = await fetch(url);

      if (!res.ok) {
        console.error(`❌ Error HTTP (${res.status}) en distrito ${distrito}`);

        resultados[distrito.toUpperCase()] = {
          total: 0,
          TIA_100k: null
        };

        detalles[distrito.toUpperCase()] = {
          total: 0,
          detalle: []
        };

        continue;
      }

      const data = await res.json();

      console.log(`📁 Respuesta para ${distrito}: ${JSON.stringify(data)}`);

      // ⬅️ SI ES TB usamos TIA_100k del backend
      resultados[distrito.toUpperCase()] = {
        total: data.total || 0,
        TIA_100k: esTBC ? (data.TIA_100k ?? null) : null
      };

      detalles[distrito.toUpperCase()] = {
        total: data.total || 0,
        detalle: data.detalle || [],
        // 💡 LÍNEA CLAVE A AÑADIR/MODIFICAR
        TIA_100k: esTBC ? (data.TIA_100k ?? null) : null, 
      };

    } catch (err) {
      console.error(`❌ Error de conexión en distrito ${distrito}`, err);

      resultados[distrito.toUpperCase()] = {
        total: 0,
        TIA_100k: null
      };

      detalles[distrito.toUpperCase()] = {
        total: 0,
        detalle: [],
        TIA_100k: null, // 💡 AGREGAR ESTO
      };
    }
  }

  console.log("================================");
  console.log("📊 RESULTADO FINAL:", diagnostico);
  console.log("================================");

  Object.entries(resultados).forEach(([dist, obj]) => {
    console.log(`🏙 ${dist}: total=${obj.total} | TIA_100k=${obj.TIA_100k}`);
  });

  setCasosPorDistrito(resultados);
  setCasosDetallePorDistrito(detalles);

  console.log("================================");
};


const obtenerCasosEnfermedad = async (distrito: string, enfermedad: string) => {
  const res = await fetch(`http://localhost:5000/api/casos_enfermedad?distrito=${distrito}&enfermedad=${enfermedad}`);
  return await res.json();
};

const obtenerCasosTotales = async (distrito: string) => {
  try {
    const res = await fetch(`http://localhost:5000/api/casos_totales?distrito=${distrito}`);
    const data = await res.json();
    return data.total ?? 0;
  } catch (e) {
    console.error("Error al obtener casos totales", e);
    return 0;
  }
};

const obtenerPoblacion = async (distrito: string) => {
  try {
    const res = await fetch(`http://localhost:5000/api/poblacion?distrito=${distrito}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error desconocido");
    return data;
  } catch (error: any) {
    console.error("Error al obtener población:", error.message);
    return null;
  }
};

// Función para copiar la URL
const handleShare = async () => {
  try {
    await navigator.clipboard.writeText(window.location.href);
    setShowCopyNotification(true);
    
    // Ocultar notificación después de 3 segundos
    setTimeout(() => {
      setShowCopyNotification(false);
    }, 3000);
    
  } catch (err) {
    console.error('Error al copiar la URL: ', err);
    // Fallback para navegadores antiguos
    const textArea = document.createElement('textarea');
    textArea.value = window.location.href;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    
    setShowCopyNotification(true);
    setTimeout(() => {
      setShowCopyNotification(false);
    }, 3000);
  }
};

const [, setCasosDetallePorDistrito] = useState<
  Record<
    string,
    {
      total: number;
      detalle: { tipo_dx: string; cantidad: number }[];
    }
  >
>({});

const handleDiagnosticoSelect = async (diagnostico: string, checked: boolean) => {
    
    // 1. Calcular el NUEVO ARRAY DE DIAGNÓSTICOS inmediatamente (sin usar el setter).
    let nuevoDiagnosticoSeleccionado: string[];

    if (checked) {
        // Incluir el nuevo diagnóstico
        nuevoDiagnosticoSeleccionado = diagnosticoSeleccionado.includes(diagnostico) 
            ? diagnosticoSeleccionado 
            : [...diagnosticoSeleccionado, diagnostico];
    } else {
        // Excluir el diagnóstico
        nuevoDiagnosticoSeleccionado = diagnosticoSeleccionado.filter(d => d !== diagnostico);
    }
    
    // 2. Determinar qué pintar basado en el array CALCULADO (prioridad: el último).
    const diagnosticoParaPintar = nuevoDiagnosticoSeleccionado.length > 0 
        ? nuevoDiagnosticoSeleccionado[nuevoDiagnosticoSeleccionado.length - 1] 
        : '';
        
    // 3. Ejecutar la lógica de carga y consulta (INMEDIATA).
    if (diagnosticoParaPintar) {
        setIsLoading(true); 
        try {
            // ⭐ CONSULTA INMEDIATA ⭐
            await cargarCasosPorDiagnostico(diagnosticoParaPintar); 
        } catch (error) {
            console.error("Error al cargar casos por diagnóstico:", error);
        } finally {
            setIsLoading(false); // <-- DESACTIVA EL SPINNER al finalizar la consulta
        }
    } else {
        setCasosPorDistrito({}); 
    }
    
    // 4. Actualizar el estado del filtro al final.
    setDiagnosticoSeleccionado(nuevoDiagnosticoSeleccionado);
};

  
  // Callback refs to stop event propagation to the map
  const sidebarRef = (instance: HTMLDivElement | null) => {
    if (instance) {
      DomEvent.disableClickPropagation(instance);
      DomEvent.disableScrollPropagation(instance);
    }
  };

  const mapSearchBarRef = (instance: HTMLDivElement | null) => {
    if (instance) {
      DomEvent.disableClickPropagation(instance);
      DomEvent.disableScrollPropagation(instance);
    }
  };

  useEffect(() => {
    fetch('/distrito_solo_lima.geojson')
      .then(response => response.json())
      .then((data: GeoJSONData) => {
        setAllDistricts(data);
        
        const districtNames = data.features.map(feature => ({
          id: `${feature.properties.NM_DIST}`,
          name: feature.properties.NM_DIST,
        }));

        const districtLayer: Layer = {
          id: 'distritos',
          name: 'Distritos',
          subLayers: districtNames,
        };

        setLayers(currentLayers => [currentLayers[0], districtLayer]);
      })
      .catch(error => console.error("Error al cargar los límites de la DIRIS:", error));
  },  [diagnosticoSeleccionado]);

  useEffect(() => {
    // 1. Cierra el popup abierto de Leaflet inmediatamente
    if (map) {
      map.closePopup();
    }

    // 2. Limpia el estado del distrito clickeado
    // Esto quita el borde negro/naranja de "seleccionado" para que 
    // se aprecie la nueva capa de calor de la enfermedad seleccionada.
    setClickedDistrictId(null);
    
    // (Opcional) Si también quieres limpiar la búsqueda al cambiar de filtro:
    // setSearchedDistrictId(null); 

  }, [diagnosticoSeleccionado, map]);

  const getSubLayerIds = (layer: Layer): string[] => {
    let ids: string[] = [layer.id];
    if (layer.subLayers) {
      layer.subLayers.forEach(sub => {
        ids = [...ids, ...getSubLayerIds(sub)];
      });
    }
    return ids;
  };

  const handleLayerSelection = async (layerId: string, isSelected: boolean) => {
    const newSelectedLayers = new Set(selectedLayers);
    const newSelectedDistrictLayerIds = new Set(selectedDistrictLayerIds);

    const findLayerById = (id: string, layersToSearch: Layer[]): Layer | undefined => {
        for (const layer of layersToSearch) {
            if (layer.id === id) return layer;
            if (layer.subLayers) {
                const found = findLayerById(id, layer.subLayers);
                if (found) return found;
            }
        }
    };
    
    const layerToToggle = findLayerById(layerId, layers);
    if (!layerToToggle) return;

    if (layerId === 'distritos') {
        if (isSelected) {
            newSelectedLayers.add(layerId);
            
            // ⭐ LÓGICA DE CARGA: Activar Spinner
            setIsLoading(true);
            try {
                // Solo llama a la carga si hay un diagnóstico seleccionado para pintar
                if (diagnosticoSeleccionado.length > 0) {
                    await cargarCasosPorDiagnostico(diagnosticoSeleccionado[diagnosticoSeleccionado.length - 1]);
                }
            } catch (error) {
                console.error("Error al cargar casos al seleccionar capa distritos:", error);
            } finally {
                setIsLoading(false); // <-- DESACTIVA EL SPINNER
            }
        } else {
            const allDistrictIds = getSubLayerIds(layerToToggle);
            allDistrictIds.forEach(id => newSelectedLayers.delete(id));
        }
    } 
    else if (layerId.startsWith('')) {
        if (isSelected) {
            newSelectedLayers.add(layerId);
        } else {
            newSelectedLayers.delete(layerId);
        }
    } 
    else {
        const childIds = getSubLayerIds(layerToToggle);
        childIds.forEach(id => {
            if (isSelected) newSelectedLayers.add(id);
            else newSelectedLayers.delete(id);
        });
    }

    // Si la capa seleccionada es un distrito individual
    if (allDistricts?.features.some(f => f.properties.NM_DIST === layerId)) {
        if (isSelected) {
            newSelectedDistrictLayerIds.add(layerId.toUpperCase());
        } else {
            newSelectedDistrictLayerIds.delete(layerId.toUpperCase());
        }
    }
    
    // Si se hace clic en la capa principal 'distritos', limpia la selección individual
    if (layerId === 'distritos' && !isSelected) {
        newSelectedDistrictLayerIds.clear();
    }

    setSelectedLayers(newSelectedLayers);
    setSelectedDistrictLayerIds(newSelectedDistrictLayerIds);

    // ⭐ NUEVA LÓGICA DE ZOOM PARA MÚLTIPLES DISTRITOS (Regla 5)
    if (newSelectedDistrictLayerIds.size > 0 && map && allDistricts) {
        // 1. Obtenemos las geometrías de los distritos seleccionados.
        const selectedFeatures = allDistricts.features.filter(f => 
            newSelectedDistrictLayerIds.has(f.properties.NM_DIST?.toUpperCase())
        );

        if (selectedFeatures.length > 0) {
            // 2. Creamos una colección GeoJSON temporal
            const featureCollection: GeoJSONData = { 
                type: "FeatureCollection", 
                features: selectedFeatures 
            };
            
            // 3. Creamos una capa temporal con todas las geometrías
            const tempLayer = L.geoJson(featureCollection as any);
            const bounds = tempLayer.getBounds();
            
            // 4. Ajustar la vista del mapa a los límites de todos los distritos seleccionados.
            map.fitBounds(bounds, {
                padding: [50, 50],
                maxZoom: 14 
            });
        }
    }
  };

  const handleMapSearch = () => {
    const searchTerm = mapSearchTerm.trim().toLowerCase();
    if (!searchTerm || !allDistricts || !map) {
        setSearchedDistrictId(null);
        return;
    };

    const foundDistrict = allDistricts.features.find(feature =>
      feature.properties.NM_DIST.toLowerCase().includes(searchTerm)
    );

    if (foundDistrict) {
    // ⭐ MODIFICACIÓN CLAVE DE ZOOM ⭐
    if (map) { 
        // 1. Crear una capa temporal con la geometría del distrito
        // Asegúrate de que L esté disponible (importa * as L from 'leaflet' si lo necesitas)
        const tempLayer = L.geoJson(foundDistrict); 
        
        // 2. Obtener los límites del polígono
        const bounds = tempLayer.getBounds();
        
        // 3. Ajustar la vista del mapa, usando los mismos parámetros que el zoom por click
        map.fitBounds(bounds, {
            padding: [50, 50],
            maxZoom: 14 // Usa el mismo valor de maxZoom que en onEachDistrict
        });
    
        setSearchedDistrictId(`${foundDistrict.properties.NM_DIST}`);
      } else {
        alert('No se pudieron encontrar las coordenadas para este distrito.');
        setSearchedDistrictId(null);
      }
    } else {
      alert('Distrito no encontrado. Por favor, intente con otro nombre.');
      setSearchedDistrictId(null);
    }
  };

  const handleMapSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMapSearchTerm(value);
    
    if (value.trim() === '' && map) {
        setSearchedDistrictId(null);
        setSuggestionResults([]); // Limpia la lista
        setIsSuggestionsOpen(false); // Cierra las sugerencias
        map.flyTo(position, zoomLevel);
        return;
    }
    
    // ⭐ Lógica de Autocompletado (solo si hay distritos cargados)
    if (allDistricts && value.trim() !== '') {
      const searchTermLower = value.trim().toLowerCase();
      const filteredNames = allDistricts.features
        .map(feature => feature.properties.NM_DIST) // Obtener solo el nombre
        .filter(name => name && name.toLowerCase().includes(searchTermLower)); // Filtrar

      setSuggestionResults(filteredNames.slice(0, 10)); // Mostrar hasta 10 sugerencias
      setIsSuggestionsOpen(true);
    } else {
        setSuggestionResults([]);
        setIsSuggestionsOpen(false);
    }
  };

  const handleSuggestionSelect = (districtName: string) => {
    setMapSearchTerm(districtName); // Establece el input con el nombre completo
    setIsSuggestionsOpen(false); // Cierra las sugerencias
    
    // Ejecuta la búsqueda de inmediato
    const foundDistrict = allDistricts?.features.find(feature =>
      feature.properties.NM_DIST.toLowerCase() === districtName.toLowerCase()
    );

    if (foundDistrict && map) {
      const tempLayer = L.geoJson(foundDistrict);
      setClickedDistrictId(null);

      // 2. Obtener los límites del polígono
      const bounds = tempLayer.getBounds();
      
      // 3. Ajustar la vista del mapa
      map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 14 // Usa el mismo valor de maxZoom que en onEachDistrict
      });

      setSearchedDistrictId(`${foundDistrict.properties.NM_DIST?.toUpperCase()}`);
    }
  };

  const districtsToDisplay = useMemo(() => {
    if (!allDistricts || !selectedLayers.has('distritos')) {
        return null;
    }
    return allDistricts;
  }, [allDistricts, selectedLayers]);

const getDistrictStyle = (feature: any) => {
  const distrito = feature.properties.NM_DIST?.toUpperCase();
  const distritoData = casosPorDistrito[distrito] || { total: 0, TIA_100k: 0 };

  const isSearched = searchedDistrictId === distrito;
  const isClicked = clickedDistrictId === distrito;
  const isLayerSelected = selectedDistrictLayerIds.has(distrito);
  const isDiseaseSelected = diagnosticoSeleccionado.length > 0;

  const baseStyle = {
    weight: 1,
    color: "#555",
    fillOpacity: 0.7,
    fillColor: "#E0E0E0",
  };

  const highlightStyle = {
    weight: 3,
    color: "#000000",
    fillOpacity: 0.9,
  };

  const escalaChoropleth = (valor: number) => {
    return valor > 75 ? "#f21a0aff" :
           valor > 50 ? "#fa9b15ff" :
           valor > 25 ? "#fff134ff" :
           valor > 1  ? "#2eff1bff" :
                        "#9a9a9aff";
  };

  // 🎯 Detectar correctamente TB TIA
  const esTB = diagnosticoSeleccionado.some(d =>
    d.toUpperCase().replace(/[-_ ]/g, "") === "TBCTIA"
  );

  // 🔥 Valor correcto para pintar
  const valorPintado = esTB ? distritoData.TIA_100k : distritoData.total;

  const fillColor = escalaChoropleth(valorPintado);
  const fillOpacity = valorPintado > 0 ? 0.8 : 0.2;

  if (!isDiseaseSelected) {
    if (isSearched || isClicked || isLayerSelected) {
      return { ...highlightStyle, fillColor: "#f3b14fff" };
    }
    return { ...baseStyle, fillOpacity: 0.2 };
  }

  if (isSearched || isClicked || isLayerSelected) {
    return { ...highlightStyle, fillColor, fillOpacity };
  }

  return { ...baseStyle, fillColor, fillOpacity };
};

const onEachDistrict = (feature: any, layer: LeafletLayer) => {
  const districtName = feature.properties.NM_DIST;

  // ⭐ NUEVO: ENLAZAR UN TOOLTIP CON EL NOMBRE DEL DISTRITO ⭐
    if (districtName) {
      layer.bindTooltip(districtName, {
        permanent: false, // El tooltip no se queda permanentemente
        direction: 'auto', // Lo coloca automáticamente
        sticky: true, // Lo mantiene pegado al cursor
        opacity: 0.9,
        className: 'district-tooltip' // Clase opcional para estilizar con CSS
      });
    }

  // ⭐ NUEVO: Efectos visuales de HOVER
  layer.on({
    click: async (e) => {
      L.DomEvent.stopPropagation(e);

      setClickedDistrictId(districtName.toUpperCase());
      setSearchedDistrictId(null);
      setSelectedDistrictLayerIds(new Set()); // Limpia la selección múltiple/búsqueda

      const layer = e.target;
    
      if (map) { // Asegúrate de que la instancia del mapa exista
          const bounds = layer.getBounds();
          
          // ⭐ AJUSTE DE ZOOM (Regla 4)
          map.fitBounds(bounds, {
              padding: [50, 50],
              maxZoom: 14 
          });
      }

      if (map) { // Asegúrate de que la instancia del mapa exista
          const bounds = layer.getBounds();
          
          // Ajusta el mapa a los límites del distrito seleccionado
          map.fitBounds(bounds, {
              // Opcional: añade un padding para que el distrito no toque los bordes
              padding: [50, 50],
              // Opcional: Define un nivel de zoom máximo si no quieres que acerque demasiado
              maxZoom: 14 // Puedes ajustar este valor según la necesidad
          });
      }

      // 1. población
      const dataPoblacion = await obtenerPoblacion(districtName);

      // 2. total de casos
      const caseCount = await obtenerCasosTotales(districtName);

      // 3. detalles múltiples diagnósticos
// 3. detalles múltiples diagnósticos
const detalleDiagnostico: Record<string, any> = {};

for (const diag of diagnosticoSeleccionado) {

  const data = await obtenerCasosEnfermedad(districtName, diag);
  const detalleArray = data.detalle || [];

  // ======================================
  // 🔵 LOGICA PARA TUBERCULOSIS
  // ======================================
if (diag === "TBC TIA") {
  detalleDiagnostico[diag] = {
    total: data.total || 0,        // <── CAMBIO AQUÍ
    TIA_100k: data.TIA_100k || 0,
    poblacion: data.poblacion_total || 0,
    detalle: []
  };
  continue;
}

  // ======================================
  // 🔵 LOGICA PARA TUBERCULOSIS EESS MINSA
  // ======================================
if (diag === "TBC TIA EESS") {
  detalleDiagnostico[diag] = {
    total: data.total || 0,        // <── CAMBIO AQUÍ
    TIA_100k: data.TIA_100k || 0,
    poblacion: data.poblacion_total || 0,
    detalle: []
  };
  continue;
}

  // ======================================
  // 🟠 LOGICA PARA IRAS
  // ======================================
  if (diag === "Infecciones respiratorias agudas") {
    detalleDiagnostico[diag] = {
      total: data.total || 0,
      detalle: detalleArray,

      ira_no_neumonia:
        detalleArray.find((d: any) => d.grupo === "IRA_NO_NEUMONIA")?.cantidad ||
        0,

      sob_asma:
        detalleArray.find((d: any) => d.grupo === "SOB_ASMA")?.cantidad || 0,

      neumonia_grave:
        detalleArray.find((d: any) => d.grupo === "NEUMONIA_GRAVE")?.cantidad ||
        0,

      neumonia:
        detalleArray.find((d: any) => d.grupo === "NEUMONIA")?.cantidad || 0
    };
    continue;
  }

  // ======================================
  // 🟡 LOGICA PARA EDAS
  // ======================================
  if (diag === "Enfermedades diarreicas agudas") {
    detalleDiagnostico[diag] = {
      total: data.total || 0,
      daa: data.daa || 0,
      dis: data.dis || 0,
      detalle: detalleArray
    };
    continue;
  }

  // ======================================
  // ⚪ LOGICA GENÉRICA (otros)
  // ======================================
  detalleDiagnostico[diag] = {
    total: data.total || 0,
    detalle: detalleArray
  };
}


      // 4. guardar en estado
      setCasosDetallePorDistrito(prev => ({
        ...prev,
        [districtName]: detalleDiagnostico
      }));

      // 5. render popup
      const popupContent = ReactDOMServer.renderToString(
        <DistrictPopup
          districtName={districtName}
          caseCount={caseCount}
          poblacion={dataPoblacion}
          diagnosticoSeleccionado={diagnosticoSeleccionado}
          detalleDiagnostico={detalleDiagnostico}
        />
      );

      layer.bindPopup(popupContent, { maxWidth: 400 });
    }
  });
};

  const filteredLayers = useMemo(() => {
    const searchTerm = layerSearchTerm.trim().toLowerCase();
    if (!searchTerm) {
      return layers;
    }

    const filterAndReconstruct = (layersToFilter: Layer[]): Layer[] => {
      const result: Layer[] = [];

      for (const layer of layersToFilter) {
        let filteredSubLayers: Layer[] | undefined = undefined;
        if (layer.subLayers && layer.subLayers.length > 0) {
          filteredSubLayers = filterAndReconstruct(layer.subLayers);
        }

        const selfMatch = layer.name.toLowerCase().includes(searchTerm);
        const hasMatchingChildren = filteredSubLayers && filteredSubLayers.length > 0;

        if (selfMatch || hasMatchingChildren) {
          result.push({ ...layer, subLayers: filteredSubLayers });
        }
      }
      return result;
    };

    return filterAndReconstruct(layers);
  }, [layers, layerSearchTerm]);

  const isSearchActive = layerSearchTerm.trim() !== '';

  const getDisplayNameForDiagnostico = (diagnosticoId: string): string => {
      const findName = (layers: Layer[]): string | undefined => {
          for (const layer of layers) {
              if (layer.id === diagnosticoId) {
                  return layer.name;
              }
              if (layer.subLayers) {
                  const found = findName(layer.subLayers);
                  if (found) return found;
              }
          }
          return undefined;
      };
      return findName([VIGILANCIA_LAYER_DATA]) || diagnosticoId; // Devuelve el ID si no encuentra el nombre
  };


   return (
    <div className="map-container">
      <MapContainer
        center={position}
        zoom={zoomLevel}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        ref={setMap}
      >
        <TileLayer
          key={currentBaseMap.id}
          url={currentBaseMap.url}
          attribution={currentBaseMap.attribution}
          subdomains={currentBaseMap.subdomains}
          maxZoom={20}
        />

        {isLoading && (
          <div className="loading-overlay">
            <img src="/logo.png" alt="Cargando..." className="loading-logo" />
            <p>Cargando datos de vigilancia...</p>
          </div>
        )}

        <MapResetClickHandler 
          setClickedDistrictId={setClickedDistrictId}
          setSearchedDistrictId={setSearchedDistrictId}
          setSelectedDistrictLayerIds={setSelectedDistrictLayerIds}
        />

        {districtsToDisplay && (
          <GeoJSON
            key={
              JSON.stringify(Array.from(selectedLayers)) +
              searchedDistrictId +
              diagnosticoSeleccionado.join(",")
            }
            data={districtsToDisplay}
            style={getDistrictStyle}
            onEachFeature={onEachDistrict}
          />
        )}

        {/* SIDEBAR FLOTANTE */}
        <div
          ref={sidebarRef}
          className={`sidebar-floating ${isSidebarOpen ? "open" : ""}`}
        >
          <div className="sidebar-content">
            <div className="sidebar-header">
              <h3>CAPAS</h3>
            </div>
            
            {isSidebarOpen && (
              <>
                <div className="layer-search">
                  <input
                    type="text"
                    placeholder="Busca la capa que necesitas"
                    value={layerSearchTerm}
                    onChange={(e) => setLayerSearchTerm(e.target.value)}
                  />
                  <button>🔍</button>
                </div>

                <ul className="layer-list">
                  {filteredLayers.map((layer) => (
                    <LayerItem
                      key={layer.id}
                      layer={layer}
                      selectedLayers={selectedLayers}
                      onSelectionChange={handleLayerSelection}
                      onDiagnosticoSelect={handleDiagnosticoSelect}
                      diagnosticoSeleccionado={diagnosticoSeleccionado}
                      isSearchActive={isSearchActive}
                    />
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="sidebar-nav">
            <button 
              className={`nav-button ${isSidebarOpen ? 'active' : ''}`}
              onClick={() => setSidebarOpen(true)}
              title="Capas y Filtros"
            >
              <i className="fas fa-layer-group"></i> 
            </button>

            <button 
              className="nav-button"
              title="Leyenda y Simbología"
            >
              <i className="fas fa-list"></i>
            </button>
            
            <button 
              className="nav-button reset-button"
              onClick={resetMapToDefault}
              title="Limpiar Filtros"
            >
              <i className="fas fa-eraser"></i>
            </button>

            {isSidebarOpen && (
              <button 
                className="sidebar-toggle-button-close"
                onClick={() => setSidebarOpen(false)}
                title="Cerrar Panel"
              >
                <i className="fas fa-chevron-left"></i> 
              </button>
            )}
          </div>
        </div>

        {/* BUSCADOR EN MAPA con Autocompletado */}
        <div 
          ref={mapSearchBarRef} 
          className="map-search-bar-container"
        >
          <div className="map-search-bar">
            <input
              type="text"
              placeholder="Departamento, provincia o distrito"
              value={mapSearchTerm}
              onChange={handleMapSearchChange}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleMapSearch();
                }
              }}
              onBlur={() => setTimeout(() => setIsSuggestionsOpen(false), 200)} 
              onFocus={() => {
                if (suggestionResults.length > 0) setIsSuggestionsOpen(true);
              }}
            />
            <button onClick={handleMapSearch}>🔍</button>
          </div>

          {isSuggestionsOpen && suggestionResults.length > 0 && (
            <ul className="suggestion-list">
              {suggestionResults.map((district) => (
                <li 
                  key={district} 
                  onClick={() => handleSuggestionSelect(district)}
                >
                  {district}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* BOTONERA DEL MAPA */}
        <div className="map-tools">
          <button title="Mapa Base" onClick={() => setBaseMapSelectorOpen(true)}>
            🗺️
          </button>
          <button title="Estadística">📊</button>
          <button title="Docencia">🎓</button>
          <button title="Captura">🖼️</button>
          <button title="Ubicar Coordenada">📍</button>
          <button title="Guardar">💾</button>
          <button title="Compartir" onClick={handleShare}>🔗</button>
        </div>

        {/* BRÚJULA */}
        <div className="compass">
          <div className="compass-n">N</div>
          <div className="compass-arrow">
            <div className="compass-arrow-up"></div>
            <div className="compass-arrow-down"></div>
          </div>
        </div>

        <MouseCoordinates />

        <Legend 
          selectedLayerNames={diagnosticoSeleccionado.map(getDisplayNameForDiagnostico)}
          selectedDistrictNames={
            [...new Set([
              clickedDistrictId, 
              ...Array.from(selectedDistrictLayerIds),
              searchedDistrictId
            ].filter(Boolean) as string[])]
          }
        />

      </MapContainer>

      {showCopyNotification && (
        <div className="copy-notification">
          <div className="copy-notification-icon">✓</div>
          <div className="copy-notification-text">URL copiada</div>
        </div>
      )}

      {isBaseMapSelectorOpen && (
        <BaseMapSelector
          baseMaps={BASE_MAPS}
          onSelect={(baseMap) => {
            setCurrentBaseMap(baseMap);
            setBaseMapSelectorOpen(false);
          }}
          onClose={() => setBaseMapSelectorOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
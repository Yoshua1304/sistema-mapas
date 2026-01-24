import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMapEvents } from 'react-leaflet';
import { DomEvent, Layer as LeafletLayer } from 'leaflet';
import * as L from 'leaflet';
import proj4 from 'proj4';
import 'leaflet/dist/leaflet.css';
import './App.css';
import LayerItem, { Layer } from './LayerItem';
import DistrictPopup from './DistrictPopup';
import EstablecimientoPopup from './EstablecimientoPopup';
import BaseMapSelector, { BaseMap } from './BaseMapSelector';
import Legend from './Legend';
import { createRoot } from "react-dom/client";

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
    click: (e) => {
      // ⭐ VERIFICACIÓN CRÍTICA: Comprobar si el clic fue en un elemento interactivo
      const target = e.originalEvent.target as HTMLElement;
      
      // Si el clic fue en un popup o sus contenidos, NO limpiar selecciones
      const isClickOnPopup = target.closest('.leaflet-popup') !== null;
      const isClickOnTooltip = target.closest('.leaflet-tooltip') !== null;
      const isClickOnSidebar = target.closest('.sidebar-floating') !== null;
      const isClickOnMapSearch = target.closest('.map-search-bar-container') !== null;
      const isClickOnMapTools = target.closest('.map-tools') !== null;
      
      // ⭐ Elementos específicos de tu aplicación que NO deben disparar el reset
      const isClickOnDistrictPopup = target.closest('.district-popup-container') !== null;
      const isClickOnEstablecimientoPopup = target.closest('.establecimiento-popup-container') !== null;
      const isClickOnLegend = target.closest('.legend-container') !== null;
      const isClickOnCompass = target.closest('.compass') !== null;
      const isClickOnCoordinates = target.closest('.mouse-coordinates') !== null;
      
      if (
        isClickOnPopup ||
        isClickOnTooltip ||
        isClickOnSidebar ||
        isClickOnMapSearch ||
        isClickOnMapTools ||
        isClickOnDistrictPopup ||
        isClickOnEstablecimientoPopup ||
        isClickOnLegend ||
        isClickOnCompass ||
        isClickOnCoordinates
      ) {
        console.log("🛑 Clic en elemento interactivo - NO limpiar selecciones");
        return;
      }
      
      // Si el evento llega aquí, significa que se hizo clic en el mapa vacío
      console.log("🗺️ Clic en mapa vacío - Limpiando selecciones");
      
      // Limpiar selecciones solo si no hay popups abiertos
      const map = e.target;
      if (!map._popup || !map._popup.isOpen()) {
        setClickedDistrictId(null);
        setSearchedDistrictId(null);
        setSelectedDistrictLayerIds(new Set());
      } else {
        console.log("ℹ️ Hay un popup abierto, manteniendo selecciones");
      }
    },
    
    // ⭐ Añadir también manejo para cuando se cierra un popup manualmente
    popupclose: () => {
      console.log("📌 Popup cerrado - Manteniendo selección visual");
      // No limpiar las selecciones aquí, solo mantener la visual
    }
  });

  return null;
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
               //{ id: 'diagnostico-antrax-carbunco', name: 'Ántrax (Carbunco)' },
               //{ id: 'diagnostico-fasciolosis-humana', name: 'Fasciolosis humana' },
              { id: 'diagnostico-leptospirosis', name: 'Leptospirosis' },
              { id: 'diagnostico-loxcelismo', name: 'Loxocelismo' },
               //{ id: 'diagnostico-meningitis-peste', name: 'Meningitis por peste' },
              { id: 'diagnostico-ofidismo', name: 'Ofidismo' },

               //{ id: 'diagnostico-peste-otras-formas', name: 'Otras formas de peste' },
               //{ id: 'diagnostico-peste-bubonica', name: 'Peste bubónica' },
               //{ id: 'diagnostico-peste-cutanea', name: 'Peste cutánea' },
               //{ id: 'diagnostico-peste-neumonica', name: 'Peste neumónica' },
               //{ id: 'diagnostico-peste-no-especificada', name: 'Peste no especificada' },
               //{ id: 'diagnostico-peste-septicemica', name: 'Peste septicémica' },

               //{ id: 'diagnostico-rabia-humana-silvestre', name: 'Rabia humana silvestre' },
               //{ id: 'diagnostico-rabia-humana-urbana', name: 'Rabia humana urbana' },

               //{ id: 'diagnostico-sindrome-pulmonar-hantavirus', name: 'Síndrome pulmonar por Hanta virus' },
               //{ id: 'diagnostico-tifus-exantematico', name: 'Tifus exantemático' }
          ]},
                {
                  id: 'diagnostico-metaxenicas',
                  name: 'Metaxénicas',
                  subLayers: [
                      {
                          id: 'diagnostico-arbovirosis',
                          name: 'Arbovirosis',
                          subLayers: [
                               //{ id: 'diagnostico-carrion-aguda', name: 'Enfermedad de Carrión Aguda' },
                               //{ id: 'diagnostico-carrion-eruptiva', name: 'Enfermedad de Carrión Eruptiva' },
                               //{ id: 'diagnostico-carrion-no-deter', name: 'Enfermedad de Carrión No Determinada' },

                              { id: 'diagnostico-chikungunya', name: 'Fiebre de Chikungunya' },
                               //{ id: 'diagnostico-chikungunya-grave', name: 'Fiebre de Chikungunya Grave' },

                              { id: 'diagnostico-zika', name: 'Zika' },
                               //{ id: 'diagnostico-zika-gestantes', name: 'Zika en gestantes' },
                               //{ id: 'diagnostico-zika-asintomatico', name: 'Zika asintomático' },
                               //{ id: 'diagnostico-zika-asintomatico-gestantes', name: 'Zika asintomático en gestantes' },

                              { id: 'diagnostico-dengue-sin-signos', name: 'Dengue sin signos de alarma' },
                              { id: 'diagnostico-dengue-con-signos', name: 'Dengue con signos de alarma' },
                              { id: 'diagnostico-dengue-grave', name: 'Dengue grave' },

                               //{ id: 'diagnostico-malaria-falciparum', name: 'Malaria P. falciparum' },
                               //{ id: 'diagnostico-malaria-vivax', name: 'Malaria por P. vivax' },
                               //{ id: 'diagnostico-malaria-malariae', name: 'Malaria por P. malariae' },
                               //{ id: 'diagnostico-malaria-ovale', name: 'Malaria por P. ovale' },

                               //{ id: 'diagnostico-leishmaniasis-cutanea', name: 'Leishmaniasis cutánea' },
                               //{ id: 'diagnostico-leishmaniasis-mucocutanea', name: 'Leishmaniasis mucocutánea' },

                              { id: 'diagnostico-chagas', name: 'Enfermedad de Chagas' },

                               //{ id: 'diagnostico-mayaro', name: 'Mayaro' },
                               //{ id: 'diagnostico-oropuche', name: 'Oropuche' },
                          ]},
                  ]
              },
                { id: 'diagnostico-vih-sida-ets', name: 'VIH/SIDA/ETS', subLayers: [
                     //{ id: 'diagnostico-infeccion-gonococica', name: 'infección gonococica' },
                    { id: 'diagnostico-hepatitis-b', name: 'Hepatitis B' },
                     //{ id: 'diagnostico-nino-expuesto-vih', name: 'Niño expuesto al VIH' },
                     //{ id: 'diagnostico-infeccion-vih', name: 'Infección por VIH' },
                     //{ id: 'diagnostico-sida', name: 'Sida' },
                    { id: 'diagnostico-sifilis-congenita', name: 'Sifilis congenita' },
                    { id: 'diagnostico-sifilis-materna', name: 'Sifilis materna' },
                    { id: 'diagnostico-sifilis-no-especificada', name: 'Sifilis no especificada' },

                ]},
                { id: 'diagnostico-inmunoprevenibles', name: 'Inmunoprevenibles', subLayers: [
                    { id: 'diagnostico-difteria', name: 'Difteria' },
                     //{ id: 'diagnostico-encefalitis-varicela', name: 'Encefalitis debida a varicela' },
                    { id: 'diagnostico-esavi', name: 'ESAVI - Evento adverso post vacunal' },
                     //{ id: 'diagnostico-fiebre-amarilla-selvatica', name: 'Fiebre amarilla selvática' },
                     //{ id: 'diagnostico-gestante-vacunada-inadvertida', name: 'Gestante vacunada inadvertidamente' },
                    { id: 'diagnostico-hepatitis-b', name: 'Hepatitis B' },
                     //{ id: 'diagnostico-meningitis-varicela', name: 'Meningitis debida a varicela' },
                     //{ id: 'diagnostico-microcefalia', name: 'Microcefalia' },
                     //{ id: 'diagnostico-neumonia-varicela', name: 'Neumonía debida a varicela' },
                     //{ id: 'diagnostico-paralisis-flacida-aguda', name: 'Parálisis flácida aguda' },
                    { id: 'diagnostico-parotiditis', name: 'Parotiditis' },
                     //{ id: 'diagnostico-parotiditis-complicaciones', name: 'Parotiditis con complicaciones' },
                    { id: 'diagnostico-rubeola', name: 'Rubeola' },
                     //{ id: 'diagnostico-rubeola-congenita', name: 'Rubeola congénita' },
                     //{ id: 'diagnostico-rubeola-congenita-cent', name: 'Rubeola congénita CENT' },
                     //{ id: 'diagnostico-sarampion', name: 'Sarampión' },
                     //{ id: 'diagnostico-guillain-barre', name: 'Síndrome de Guillain Barré' },
                     //{ id: 'diagnostico-tetanos', name: 'Tétanos' },
                     //{ id: 'diagnostico-tetanos-neonatal', name: 'Tétanos neonatal' },
                    { id: 'diagnostico-tos-ferina', name: 'Tos ferina' },
                     //{ id: 'diagnostico-varicela-complicaciones', name: 'Varicela con otras complicaciones' },
                    { id: 'diagnostico-varicela-sin-complicaciones', name: 'Varicela sin complicaciones' },
                     //{ id: 'diagnostico-viruela', name: 'Viruela' },
                     //{ id: 'diagnostico-viruela-del-mono', name: 'Viruela del mono' },
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
                     //{ id: 'diagnostico-sindrome-resp-agudo', name: 'Síndrome respiratorio agudo severo' },
                     //{ id: 'diagnostico-gripe-humana', name: 'Gripe humana causada por un nuevo subtipo de virus' },
                     //{ id: 'diagnostico-guillain-barre', name: 'Síndrome de Guillain Barré' },
                     //{ id: 'diagnostico-colera', name: 'Cólera' },
                    { id: 'diagnostico-edas', name: 'Enfermedades diarreicas agudas' },
                ]},
                 //{ id: 'diagnostico-riesgos-alimentarios', name: 'Riesgos Alimentarios', subLayers: [
                 //    { id: 'diagnostico-eta', name: 'Enfermedades Transmitidas por Alimentos' }
                 //]},
            ]
        },
        {
            id: 'diagnostico-enf-no-transmisibles', name: 'Enfermedades No Transmisibles', subLayers: [
                { id: 'diagnostico-salud-mental', name: 'Salud Mental', subLayers: [
                    { id: 'diagnostico-Depresion', name: 'Depresion' },
                    { id: 'diagnostico-violencia', name: 'Violencia familiar' },
                ]},
  //              { id: 'diagnostico-accidentes-transito', name: 'Accidentes de Tránsito', subLayers: [
  //                  { id: 'diagnostico-Accidente-Transito', name: 'Accidente Transito' }
  //              ]},
                { id: 'diagnostico-enf-cronicas', name: 'Enfermedades Crónicas', subLayers: [
                    { id: 'diagnostico-cancer', name: 'Cáncer' },
                    { id: 'diagnostico-diabetes', name: 'Diabetes' },
                    { id: 'diagnostico-renal', name: 'Renal' },

                ]},
            ]
        },
 //    {
 //           id: 'diagnostico-vigilancia-hospitalaria', name: 'Vigilancia Hospitalaria', subLayers: [
 //              { id: 'diagnostico-iaas', name: 'Infecciones Asociadas a la Atención de la Salud', subLayers: [
 //                 { id: 'diagnostico-iaas-sub', name: 'Infecciones Asociadas a la Atención de la Salud' }
 //            ]},
 //        ]
 //   },
        {
            id: 'diagnostico-materno', name: 'Vigilancia Materno', subLayers: [
              { id: 'diagnostico-muerte-materna', name: 'Muerte materna' },
              { id: 'diagnostico-muerte-materna-extrema', name: 'Muerte materna extrema' },
             { id: 'diagnostico-muerte-fetal-neonatal', name: 'Muerte fetal neonatal' },
            ]
        },
        {
            id: 'diagnostico-riesgos-ambientales', name: 'Riesgos Ambientales', subLayers: [
                { id: 'diagnostico-plaguicidas-metales', name: 'Plaguicidas y Metales', subLayers: [
                    { id: 'diagnostico-efecto-plaguicidas', name: 'Efecto toxico de plaguicidas' },
                    //{ id: 'diagnostico-Mercurio-y-sus-compuestos', name: 'Mercurio y sus compuestos' },
                    //{ id: 'diagnostico-Insec.-Org.-Fosf.-y-Carbonatos', name: 'Insec. Org. Fosf. y Carbonatos' },
                    //{ id: 'diagnostico-Efecto toxico-de-otras-susteansias-inorganicas', name: 'Efecto toxico de otras sustansias inorganicas' },
                    { id: 'diagnostico-Metal,-no-Especificado', name: 'Metal, no Especificado' },
                    //{ id: 'diagnostico-Plaguicida-no-especificado', name: 'Plaguicida no especificado' },
                    //{ id: 'diagnostico-Cromo-y-sus-compuestos', name: 'Cromo y sus compuestos' },
                    //{ id: 'diagnostico-Otros-plaguicidas', name: 'Otros plaguicidas' },
                    //{ id: 'diagnostico-Rodenticidas', name: 'Rodenticidas' },
                    //{ id: 'diagnostico-insec.-halogenados', name: 'insec. halogenados' },
                    //{ id: 'diagnostico-derivados-halogenados-de-hidrocarburos-alifaticos-y-aromaticos', name: 'derivados halogenados de hidrocarburos alifaticos y aromaticos' },
                    //{ id: 'diagnostico-Otros-metales', name: 'Otros metales' },
                    //{ id: 'diagnostico-Cadmio-y-sus-compuestos', name: 'Cadmio y sus compuestos' }
                ]}
            ]
        },
//        {
//           id: 'diagnostico-otras-vigilancias', name: 'Otras Vigilancias', subLayers: [
//                { id: 'diagnostico-brotes-epidemias', name: 'Brotes, epidemias y emergencias sanitarias' },
//                { id: 'diagnostico-cambio-climatico', name: 'Cambio Climático-Emergencias y Desastres' },
//            ]
//        }
    ]
};

function App() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [allDistricts, setAllDistricts] = useState<GeoJSONData | null>(null);
  const [allEstablecimientos, setAllEstablecimientos] = useState<GeoJSONData | null>(null);
  const [activeGeoJSON, setActiveGeoJSON] = useState<GeoJSONData | null>(null);
  const [geoJSONType, setGeoJSONType] = useState<'distritos' | 'establecimientos'>('distritos');
  const [layers, setLayers] = useState<Layer[]>([VIGILANCIA_LAYER_DATA]);
  const [selectedLayers, setSelectedLayers] = useState<Set<string>>(new Set(['distritos']));
  const [layerSearchTerm, setLayerSearchTerm] = useState('');
  const [mapSearchTerm, setMapSearchTerm] = useState('');
  const [searchedDistrictId, setSearchedDistrictId] = useState<string | null>(null);
  const [clickedDistrictId, setClickedDistrictId] = useState<string | null>(null);
  const [selectedDistrictLayerIds, setSelectedDistrictLayerIds] = useState<Set<string>>(new Set());
  const [map, setMap] = useState<any>(null);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [isBaseMapSelectorOpen, setBaseMapSelectorOpen] = useState(false);
  const [currentBaseMap, setCurrentBaseMap] = useState<BaseMap>(BASE_MAPS[0]);
  const position: [number, number] = [-12.00, -77.02];
  const zoomLevel = 12;

  const [casosPorDistrito, setCasosPorDistrito] = useState<Record<string, any>>({});
  const [diagnosticoSeleccionado, setDiagnosticoSeleccionado] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarView, setSidebarView] = useState<'capas' | 'leyenda'>('capas');
  const [showCopyNotification, setShowCopyNotification] = useState(false);

//console.log("🟦 diagnosticoSeleccionado TYPE:", typeof diagnosticoSeleccionado);
//console.log("🟦 diagnosticoSeleccionado VALUE:", diagnosticoSeleccionado);
//console.log("🟦 diagnosticoSeleccionado IS ARRAY:", Array.isArray(diagnosticoSeleccionado));


const [suggestionResults, setSuggestionResults] = useState<Array<{
  name: string;
  type: 'distrito' | 'establecimiento';
}>>([]);

const cargarFebrilesPorDistrito = async () => {
  if (!allDistricts) return;

  const resultados: any = {};

  for (const feature of allDistricts.features) {
    const distrito = feature.properties.NM_DIST;

    try {
      const resp = await fetch(`http://10.0.5.237:5001/api/febriles_distrito?distrito=${distrito}`);
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

const cargarDepresionPorDistrito = async () => {
  if (!allDistricts) return;

  const results: Record<string, any> = {};

  for (const feature of allDistricts.features) {
    const distrito = feature.properties.NM_DIST.toUpperCase();

    try {
      const res = await fetch(
        `/api/casos_enfermedad?distrito=${encodeURIComponent(distrito)}&enfermedad=DEPRESION`
      );

      const data = await res.json();

      results[distrito] = {
        total: data.total || 0,
        detalle: data.detalle || [
          { tipo_dx: "TOTAL", cantidad: data.total || 0 }
        ]
      };

    } catch (err) {
      console.error("❌ Error DEPRESIÓN en", distrito, err);

      results[distrito] = {
        total: 0,
        detalle: [
          { tipo_dx: "TOTAL", cantidad: 0 }
        ]
      };
    }
  }

  setCasosPorDistrito(prev => ({
    ...prev,
    DEPRESION: results
  }));
};

const cargarViolenciaPorDistrito = async () => {
  if (!allDistricts) return;

  const results: Record<string, any> = {};

  for (const feature of allDistricts.features) {
    const distrito = feature.properties.NM_DIST.toUpperCase();

    try {
      const res = await fetch(
        `/api/casos_enfermedad?distrito=${encodeURIComponent(distrito)}&enfermedad=VIOLENCIA`
      );

      const data = await res.json();

      results[distrito] = {
        total: data.total || 0,
        detalle: data.detalle || [
          { tipo_dx: "TOTAL", cantidad: data.total || 0 }
        ]
      };

    } catch (err) {
      console.error("❌ Error VIOLENCIA en", distrito, err);

      results[distrito] = {
        total: 0,
        detalle: [
          { tipo_dx: "TOTAL", cantidad: 0 }
        ]
      };
    }
  }

  setCasosPorDistrito(prev => ({
    ...prev,
    VIOLENCIA: results
  }));
};

const cargarDiabetesPorDistrito = async () => {
  if (!allDistricts) return;

  const results: Record<string, any> = {};

  for (const feature of allDistricts.features) {
    const distrito = feature.properties.NM_DIST.toUpperCase();

    try {
      const res = await fetch(
        `/api/casos_enfermedad?distrito=${encodeURIComponent(distrito)}&enfermedad=DIABETES`
      );

      const data = await res.json();

      results[distrito] = {
        total: data.total || 0,
        detalle: data.detalle || [
          { tipo_dx: "TOTAL", cantidad: data.total || 0 }
        ]
      };

    } catch (err) {
      console.error("❌ Error DIABETES en", distrito, err);

      results[distrito] = {
        total: 0,
        detalle: [
          { tipo_dx: "TOTAL", cantidad: 0 }
        ]
      };
    }
  }

  setCasosPorDistrito(prev => ({
    ...prev,
    DIABETES: results
  }));
};


const cargarTIATotal = async () => {
  try {
    const resp = await fetch("http://10.0.5.237:5001/tb_tia_total");
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
    const resp = await fetch("http://10.0.5.237:5001/tb_tia_total_EESS");
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
    const resp = await fetch("http://10.0.5.237:5001/tb_sigtb_distritos");
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
  if (!map) return;

  // 1. Limpiar filtros
  setDiagnosticoSeleccionado([]);
  setCasosPorDistrito({});

  // 2. Limpiar subcapas
  const cleanedLayers = new Set(selectedLayers);
  Array.from(selectedLayers).forEach(id => {
    if (
      id.startsWith('distrito-') ||
      id.startsWith('establecimiento-')
    ) {
      cleanedLayers.delete(id);
    }
  });

  setSelectedLayers(cleanedLayers);
  setSelectedDistrictLayerIds(new Set());

  // 3. Limpiar búsquedas
  setLayerSearchTerm('');
  setMapSearchTerm('');
  setSearchedDistrictId(null);
  setClickedDistrictId(null);

  // 4. 🔍 Reaplicar zoom SIN perder centro
  if (map) {
    map.setView(position, zoomLevel);
  }

  console.log("✅ Filtros limpiados, zoom reaplicado.");
};

const handleShowLegend = () => {
  // Cambiar a vista de leyenda
  setSidebarView('leyenda');
  
  // Abrir el sidebar si está cerrado
  if (!isSidebarOpen) {
    setSidebarOpen(true);
  }
};

useEffect(() => {
  if (!allDistricts) return;
  if (!diagnosticoSeleccionado || diagnosticoSeleccionado.length === 0) return;

  // Si estamos en modo establecimientos, no cargamos datos de diagnósticos
  if (geoJSONType === 'establecimientos') return;

  const diagnostico = diagnosticoSeleccionado[diagnosticoSeleccionado.length - 1];

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

  // 🔵 TBC TIA
  if (diagnostico.trim().toLowerCase() === "diagnostico-tbctia") {
    console.log("🟦 Cargando TBC TIA...");
    cargarTIATotal();
    return;
  }

  // 🔵 TBC TIA EESS
  if (diagnostico.trim().toLowerCase() === "diagnostico-tbctiaeess") {
    console.log("🟦 Cargando TBC TIA EESS...");
    cargarTIATotalEESS();
    return;
  }

  // 🔵 TBC PULMONAR
  if (diagnostico.trim().toLowerCase() === "diagnostico-tbcpulmonar") {
    console.log("🟦 Cargando TBC PULMONAR...");
    cargarSigtbDistritos();
    return;
  }

  // 🟣 DEPRESIÓN (BASE SALUD MENTAL)
  if (diagnostico.trim().toLowerCase() === "diagnostico-depresion") {
    console.log("🟣 Cargando DEPRESIÓN...");
    cargarDepresionPorDistrito();
    return;
  }

  // 🟣 VIOLENCIA (BASE SALUD MENTAL)
  if (diagnostico.trim().toLowerCase() === "diagnostico-violencia") {
    console.log("🟣 Cargando VIOLENCIA...");
    cargarViolenciaPorDistrito();
    return;
  }

    // 🟣 VIOLENCIA (BASE SALUD MENTAL)
  if (diagnostico.trim().toLowerCase() === "diagnostico-diabetes") {
    console.log("🟣 Cargando DIABETES...");
    cargarDiabetesPorDistrito();
    return;
  }


  // 🟢 NOTIWEB (genéricos)
  console.log("🟢 Cargando diagnóstico NOTIWEB:", diagnostico);
  cargarCasosPorDiagnostico(diagnostico);

}, [diagnosticoSeleccionado, allDistricts, geoJSONType]);


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
    const url = `http://10.0.5.237:5001/api/casos_enfermedad?distrito=${distrito}&enfermedad=${diagnostico}`;

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
  const res = await fetch(`http://10.0.5.237:5001/api/casos_enfermedad?distrito=${distrito}&enfermedad=${enfermedad}`);
  return await res.json();
};

const obtenerCasosTotales = async (distrito: string) => {
  try {
    const res = await fetch(`http://10.0.5.237:5001/api/casos_totales?distrito=${distrito}`);
    const data = await res.json();
    return data.total ?? 0;
  } catch (e) {
    console.error("Error al obtener casos totales", e);
    return 0;
  }
};

const obtenerPoblacion = async (distrito: string) => {
  try {
    const res = await fetch(`http://10.0.5.237:5001/api/poblacion?distrito=${distrito}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error desconocido");
    return data;
  } catch (error: any) {
    console.error("Error al obtener población:", error.message);
    return null;
  }
};

// Función para obtener población de establecimientos
const obtenerPoblacionEstablecimiento = async (establecimiento: string) => {
  try {
    const res = await fetch(`http://10.0.5.237:5001/api/poblacion_establecimiento?establecimiento=${encodeURIComponent(establecimiento)}`);
    if (!res.ok) throw new Error("Error al obtener población");
    const data = await res.json();
    return data;
  } catch (error: any) {
    console.error("Error al obtener población del establecimiento:", error.message);
    return null;
  }
};

// Función para obtener casos totales de establecimientos
const obtenerCasosTotalesEstablecimiento = async (establecimiento: string) => {
  try {
    const res = await fetch(`http://10.0.5.237:5001/api/casos_totales_establecimiento?establecimiento=${encodeURIComponent(establecimiento)}`);
    const data = await res.json();
    return data.total ?? 0;
  } catch (error: any) {
    console.error("Error al obtener casos del establecimiento:", error.message);
    return 0;
  }
};

// Función para obtener casos de enfermedad en establecimiento
const obtenerCasosEnfermedadEstablecimiento = async (establecimiento: string, enfermedad: string) => {
  try {
    // Extraer el nombre del diagnóstico sin el prefijo
    let diagNombre = enfermedad.replace('diagnostico-', '');
    
    // Mapear nombres específicos si es necesario
    if (diagNombre.toUpperCase().includes("TBC") && diagNombre.toUpperCase().includes("TIA")) {
      diagNombre = "TBC TIA";
    } else if (diagNombre.toUpperCase() === "TBCTIAEESS") {
      diagNombre = "TBC TIA EESS";
    } else if (diagNombre.toUpperCase() === "TBCPULMONAR") {
      diagNombre = "TBC Pulmonar";
    }
    
    console.log(`🔍 Consultando casos para establecimiento: ${establecimiento}, diagnóstico: ${diagNombre}`);
    
    const res = await fetch(
      `http://10.0.5.237:5001/api/casos_enfermedad_establecimiento?establecimiento=${encodeURIComponent(establecimiento)}&enfermedad=${encodeURIComponent(diagNombre)}`
    );
    
    if (!res.ok) {
      console.error(`❌ Error HTTP ${res.status} para ${establecimiento}: ${diagNombre}`);
      return { 
        total: 0, 
        detalle: [],
        error: `Error ${res.status}: ${res.statusText}`
      };
    }
    
    const data = await res.json();
    console.log(`✅ Datos obtenidos para ${establecimiento}:`, data);
    return data;
    
  } catch (error: any) {
    console.error(`❌ Error al obtener casos de enfermedad en establecimiento ${establecimiento}:`, error.message);
    return { 
      total: 0, 
      detalle: [],
      error: error.message
    };
  }
};

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
    // Cargar DISTRITOS
    fetch('/distrito_solo_lima.geojson')
      .then(response => response.json())
      .then((distritosData: GeoJSONData) => {
        setAllDistricts(distritosData);
        
        // Crear subcapas para cada distrito individual
        const districtSubLayers: Layer[] = distritosData.features.map(feature => ({
          id: `distrito-${feature.properties.NM_DIST}`,
          name: feature.properties.NM_DIST,
        }));

        const districtLayer: Layer = {
          id: 'distritos-layer',
          name: 'Distritos',
          subLayers: districtSubLayers, // Ahora SÍ tiene subcapas
        };

        // Ahora cargar ESTABLECIMIENTOS
        fetch('/JURISDICCION_EESS_DLC_update.geojson')
          .then(response => response.json())
          .then((estableData: GeoJSONData) => {
            setAllEstablecimientos(estableData);
            
            // Crear subcapas para cada establecimiento individual
            const estableSubLayers: Layer[] = estableData.features.map(feature => ({
              id: `establecimiento-${feature.properties.layer}`,
              name: feature.properties.layer,
            }));

            const estableLayer: Layer = {
              id: 'establecimientos-layer',
              name: 'Establecimientos',
              subLayers: estableSubLayers, // Ahora SÍ tiene subcapas
            };

            // Agregar AMBAS capas al árbol
            setLayers(currentLayers => [
              currentLayers[0], // Capa de vigilancia
              districtLayer,
              estableLayer
            ]);

            // Establecer distritos como activos por defecto
            setActiveGeoJSON(distritosData);
          })
          .catch(error => console.error("Error al cargar establecimientos:", error));
      })
      .catch(error => console.error("Error al cargar distritos:", error));
  }, [diagnosticoSeleccionado]);

  // Sincronizar la selección inicial
  useEffect(() => {
    if (allDistricts) {
      setSelectedLayers(new Set(['distritos-layer']));
    }
  }, [allDistricts]);

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

  // Función auxiliar para debug
useEffect(() => {
  console.log("🔄 Estado actualizado - Diagnósticos:", diagnosticoSeleccionado);
  console.log("🔄 Estado actualizado - Capas seleccionadas:", Array.from(selectedLayers));
  console.log("🔄 Estado actualizado - Establecimientos seleccionados:", Array.from(selectedDistrictLayerIds));
}, [diagnosticoSeleccionado, selectedLayers, selectedDistrictLayerIds]);

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
      return undefined;
    };

    const layerToToggle = findLayerById(layerId, layers);
    if (!layerToToggle) return;

    // 🆕 1. Si es una subcapa de distrito (empieza con 'distrito-')
    if (layerId.startsWith('distrito-')) {
      const distritoName = layerId.replace('distrito-', '');
      
      if (isSelected) {
        // Cambiar a GeoJSON de distritos si no está activo
        if (geoJSONType !== 'distritos' && allDistricts) {
          setGeoJSONType('distritos');
          setActiveGeoJSON(allDistricts);
          
          // Actualizar selección de capas principales
          newSelectedLayers.add('distritos-layer');
          newSelectedLayers.delete('establecimientos-layer');
        }
        
        // Agregar a la selección
        newSelectedLayers.add(layerId);
        newSelectedDistrictLayerIds.add(distritoName.toUpperCase());
        
        // 🔥 ZOOM al distrito seleccionado
        const feature = allDistricts?.features.find(f => 
          f.properties.NM_DIST === distritoName
        );
        if (feature && map) {
          const tempLayer = L.geoJson(feature);
          const bounds = tempLayer.getBounds();
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
        }
        
        // ⭐ LÓGICA DE CARGA: Activar Spinner para diagnósticos
        if (diagnosticoSeleccionado.length > 0) {
          setIsLoading(true);
          try {
            await cargarCasosPorDiagnostico(diagnosticoSeleccionado[diagnosticoSeleccionado.length - 1]);
          } catch (error) {
            console.error("Error al cargar casos:", error);
          } finally {
            setIsLoading(false);
          }
        }
      } else {
        newSelectedLayers.delete(layerId);
        newSelectedDistrictLayerIds.delete(distritoName.toUpperCase());
      }
      
      setSelectedLayers(newSelectedLayers);
      setSelectedDistrictLayerIds(newSelectedDistrictLayerIds);
      return;
    }

    // 🆕 2. Si es una subcapa de establecimiento (empieza con 'establecimiento-')
    if (layerId.startsWith('establecimiento-')) {
      const establecimientoName = layerId.replace('establecimiento-', '');
      const establecimientoUpper = establecimientoName.toUpperCase();
      
      if (isSelected) {
        // Cambiar a GeoJSON de establecimientos si no está activo
        if (geoJSONType !== 'establecimientos' && allEstablecimientos) {
          setGeoJSONType('establecimientos');
          setActiveGeoJSON(allEstablecimientos);
          
          // Actualizar selección de capas principales
          newSelectedLayers.add('establecimientos-layer');
          newSelectedLayers.delete('distritos-layer');
        }
        
        // Agregar a la selección
        newSelectedLayers.add(layerId);
        newSelectedDistrictLayerIds.add(establecimientoUpper);
        
        // 🔥 ZOOM al establecimiento seleccionado
        const feature = allEstablecimientos?.features.find(f => 
          f.properties.layer?.toUpperCase() === establecimientoUpper
        );
        
        if (feature && map) {
          console.log("🔍 Zoom a establecimiento:", establecimientoUpper);
          const tempLayer = L.geoJson(feature);
          const bounds = tempLayer.getBounds();
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
        }
      } else {
        newSelectedLayers.delete(layerId);
        newSelectedDistrictLayerIds.delete(establecimientoUpper);
      }
      
      console.log("🔄 Actualizando establecimientos seleccionados:", Array.from(newSelectedDistrictLayerIds));
      setSelectedLayers(newSelectedLayers);
      setSelectedDistrictLayerIds(newSelectedDistrictLayerIds);
      return;
    }

    // 3. Si es la capa principal de distritos (checkbox principal)
    if (layerId === 'distritos-layer') {
      if (isSelected) {
        handleGeoJSONChange('distritos');
        newSelectedLayers.add(layerId);
        newSelectedLayers.delete('establecimientos-layer');
        
        // Limpiar selección de subcapas individuales
        Array.from(newSelectedLayers).forEach(id => {
          if (id.startsWith('distrito-') || id.startsWith('establecimiento-')) {
            newSelectedLayers.delete(id);
          }
        });
        newSelectedDistrictLayerIds.clear();
      } else {
        newSelectedLayers.delete(layerId);
      }
      setSelectedLayers(newSelectedLayers);
      setSelectedDistrictLayerIds(newSelectedDistrictLayerIds);
      return;
    }

    // 4. Si es la capa principal de establecimientos (checkbox principal)
    if (layerId === 'establecimientos-layer') {
      if (isSelected) {
        handleGeoJSONChange('establecimientos');
        newSelectedLayers.add(layerId);
        newSelectedLayers.delete('distritos-layer');
        
        // Limpiar selección de subcapas individuales
        Array.from(newSelectedLayers).forEach(id => {
          if (id.startsWith('distrito-') || id.startsWith('establecimiento-')) {
            newSelectedLayers.delete(id);
          }
        });
        newSelectedDistrictLayerIds.clear();
      } else {
        newSelectedLayers.delete(layerId);
      }
      setSelectedLayers(newSelectedLayers);
      setSelectedDistrictLayerIds(newSelectedDistrictLayerIds);
      return;
    }

    // 5. Si es la capa principal de distritos (la vieja 'distritos')
    if (layerId === 'distritos') {
      if (isSelected) {
        newSelectedLayers.add(layerId);
        
        // ⭐ LÓGICA DE CARGA: Activar Spinner
        setIsLoading(true);
        try {
          if (diagnosticoSeleccionado.length > 0) {
            await cargarCasosPorDiagnostico(diagnosticoSeleccionado[diagnosticoSeleccionado.length - 1]);
          }
        } catch (error) {
          console.error("Error al cargar casos al seleccionar capa distritos:", error);
        } finally {
          setIsLoading(false);
        }
      } else {
        const allDistrictIds = getSubLayerIds(layerToToggle);
        allDistrictIds.forEach(id => newSelectedLayers.delete(id));
      }
      
      setSelectedLayers(newSelectedLayers);
      return;
    }

    // 6. Si es un diagnóstico (empieza con 'diagnostico-')
    if (layerId.startsWith('diagnostico-')) {
      if (isSelected) {
        newSelectedLayers.add(layerId);
      } else {
        newSelectedLayers.delete(layerId);
      }
      
      setSelectedLayers(newSelectedLayers);
      return;
    }

    // 7. Para cualquier otra capa (grupos, subgrupos, etc.)
    const childIds = getSubLayerIds(layerToToggle);
    childIds.forEach(id => {
      if (isSelected) newSelectedLayers.add(id);
      else newSelectedLayers.delete(id);
    });

    // Si la capa seleccionada es un distrito individual (formato viejo)
    if (allDistricts?.features.some(f => f.properties.NM_DIST === layerId)) {
      if (isSelected) {
        newSelectedDistrictLayerIds.add(layerId.toUpperCase());
      } else {
        newSelectedDistrictLayerIds.delete(layerId.toUpperCase());
      }
    }

    setSelectedLayers(newSelectedLayers);
    setSelectedDistrictLayerIds(newSelectedDistrictLayerIds);

    // 🔥 ZOOM PARA MÚLTIPLES ELEMENTOS SELECCIONADOS
    if (newSelectedDistrictLayerIds.size > 0 && map) {
      let selectedFeatures: any[] = [];
      
      // Determinar qué GeoJSON usar según el tipo activo
      if (geoJSONType === 'distritos' && allDistricts) {
        selectedFeatures = allDistricts.features.filter(f => 
          newSelectedDistrictLayerIds.has(f.properties.NM_DIST?.toUpperCase())
        );
      } else if (geoJSONType === 'establecimientos' && allEstablecimientos) {
        selectedFeatures = allEstablecimientos.features.filter(f => 
          newSelectedDistrictLayerIds.has(f.properties.layer?.toUpperCase())
        );
      }
      
      if (selectedFeatures.length > 0) {
        const featureCollection: GeoJSONData = { 
          type: "FeatureCollection", 
          features: selectedFeatures 
        };
        
        const tempLayer = L.geoJson(featureCollection as any);
        const bounds = tempLayer.getBounds();
        
        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 14 
        });
      }
    }
  };

  const handleMapSearch = () => {
    const searchTerm = mapSearchTerm.trim().toLowerCase();
    if (!searchTerm || !map) {
      setSearchedDistrictId(null);
      return;
    }

    let foundFeature;
    let foundType: 'distrito' | 'establecimiento' | null = null;

    // Buscar primero en distritos
    if (allDistricts) {
      foundFeature = allDistricts.features.find(feature =>
        feature.properties.NM_DIST.toLowerCase().includes(searchTerm)
      );
      if (foundFeature) {
        foundType = 'distrito';
      }
    }

    // Si no se encuentra en distritos, buscar en establecimientos
    if (!foundFeature && allEstablecimientos) {
      foundFeature = allEstablecimientos.features.find(feature =>
        feature.properties.layer.toLowerCase().includes(searchTerm)
      );
      if (foundFeature) {
        foundType = 'establecimiento';
      }
    }

    if (foundFeature && foundType) {
      // Cambiar al tipo correspondiente
      if (foundType === 'distrito' && geoJSONType !== 'distritos') {
        handleGeoJSONChange('distritos');
      } else if (foundType === 'establecimiento' && geoJSONType !== 'establecimientos') {
        handleGeoJSONChange('establecimientos');
      }

      const name = foundType === 'distrito' 
        ? foundFeature.properties.NM_DIST
        : foundFeature.properties.layer;
      
      const tempLayer = L.geoJson(foundFeature);
      const bounds = tempLayer.getBounds();
      map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 14
      });

      setSearchedDistrictId(name.toUpperCase());
      setClickedDistrictId(null);
      
      // Actualizar selección
      const newSelectedLayers = new Set(selectedLayers);
      const layerId = foundType === 'distrito' 
        ? `distrito-${name}`
        : `establecimiento-${name}`;
      
      newSelectedLayers.add(layerId);
      setSelectedLayers(newSelectedLayers);
      setSelectedDistrictLayerIds(new Set([name.toUpperCase()]));
    } else {
      alert(`No se encontró ningún distrito o establecimiento con el término: "${mapSearchTerm}".`);
      setSearchedDistrictId(null);
    }
  };

  const handleMapSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMapSearchTerm(value);
    
    if (value.trim() === '' && map) {
      setSearchedDistrictId(null);
      setSuggestionResults([]);
      setIsSuggestionsOpen(false);
      map.flyTo(position, zoomLevel);
      return;
    }
    
    // Lógica de Autocompletado para ambos tipos
    if (value.trim() !== '') {
      const searchTermLower = value.trim().toLowerCase();
      const suggestions: Array<{name: string; type: 'distrito' | 'establecimiento'}> = [];
      
      // Buscar en distritos
      if (allDistricts) {
        allDistricts.features
          .map(feature => feature.properties.NM_DIST)
          .filter(name => name && name.toLowerCase().includes(searchTermLower))
          .forEach(name => {
            suggestions.push({ name, type: 'distrito' });
          });
      }
    
    // Buscar en establecimientos
    if (allEstablecimientos) {
      allEstablecimientos.features
        .map(feature => feature.properties.layer)
        .filter(name => name && name.toLowerCase().includes(searchTermLower))
        .forEach(name => {
          suggestions.push({ name, type: 'establecimiento' });
        });
    }
    
    setSuggestionResults(suggestions.slice(0, 10));
    setIsSuggestionsOpen(true);
  } else {
    setSuggestionResults([]);
    setIsSuggestionsOpen(false);
  }
};

  // Añade esta función después de tus estados:
  const handleGeoJSONChange = (type: 'distritos' | 'establecimientos') => {
    setGeoJSONType(type);
    
    // Limpiar selecciones de subcapas
    const cleanedLayers = new Set(selectedLayers);
    
    // Remover todas las subcapas individuales
    Array.from(selectedLayers).forEach(id => {
      if (id.startsWith('distrito-') || id.startsWith('establecimiento-')) {
        cleanedLayers.delete(id);
      }
    });
    
    setSelectedDistrictLayerIds(new Set());
    
    if (type === 'distritos' && allDistricts) {
      setActiveGeoJSON(allDistricts);
      cleanedLayers.add('distritos-layer');
      cleanedLayers.delete('establecimientos-layer');
      
      // Si hay diagnóstico seleccionado, recargar datos para distritos
      if (diagnosticoSeleccionado.length > 0) {
        setIsLoading(true);
        cargarCasosPorDiagnostico(diagnosticoSeleccionado[diagnosticoSeleccionado.length - 1])
          .finally(() => setIsLoading(false));
      }
    } else if (type === 'establecimientos' && allEstablecimientos) {
      setActiveGeoJSON(allEstablecimientos);
      cleanedLayers.add('establecimientos-layer');
      cleanedLayers.delete('distritos-layer');
      
      // Limpiar datos de diagnóstico cuando se muestran establecimientos
      setCasosPorDistrito({});
    }
    
    setSelectedLayers(cleanedLayers);
    setClickedDistrictId(null);
    setSearchedDistrictId(null);
    setMapSearchTerm(''); // Limpiar búsqueda
    
    // Centrar el mapa según el tipo
    if (map) {
      if (type === 'distritos') {
        map.setView(position, zoomLevel);
      } else {
        map.setView(position, 12);

        // 🔽 Mueve la vista hacia abajo (valores positivos bajan)
        map.panBy([0, 70], { animate: true });
      }
    }

    console.log(`✅ Cambiado a: ${type}`);
    console.log(`📌 Capas seleccionadas:`, Array.from(cleanedLayers));
  };

  const handleSuggestionSelect = (item: {name: string; type: 'distrito' | 'establecimiento'}) => {
    setMapSearchTerm(item.name);
    setIsSuggestionsOpen(false);
    
    if (item.type === 'distrito') {
      // Cambiar a distritos si no está activo
      if (geoJSONType !== 'distritos') {
        handleGeoJSONChange('distritos');
      }
      
      const foundDistrict = allDistricts?.features.find(feature =>
        feature.properties.NM_DIST.toLowerCase() === item.name.toLowerCase()
      );

      if (foundDistrict && map) {
        const tempLayer = L.geoJson(foundDistrict);
        setClickedDistrictId(null);
        
        const bounds = tempLayer.getBounds();
        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 14
        });

        setSearchedDistrictId(foundDistrict.properties.NM_DIST.toUpperCase());
        
        // Actualizar selección en el panel
        const newSelectedLayers = new Set(selectedLayers);
        newSelectedLayers.add(`distrito-${item.name}`);
        setSelectedLayers(newSelectedLayers);
        setSelectedDistrictLayerIds(new Set([item.name.toUpperCase()]));
      }
    } else {
      // Es un establecimiento
      // Cambiar a establecimientos si no está activo
      if (geoJSONType !== 'establecimientos') {
        handleGeoJSONChange('establecimientos');
      }
      
      const foundEstablecimiento = allEstablecimientos?.features.find(feature =>
        feature.properties.layer?.toLowerCase() === item.name.toLowerCase()
      );

      if (foundEstablecimiento && map) {
        const tempLayer = L.geoJson(foundEstablecimiento);
        setClickedDistrictId(null);
        
        const bounds = tempLayer.getBounds();
        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 14
        });

        setSearchedDistrictId(foundEstablecimiento.properties.layer.toUpperCase());
        
        // Actualizar selección en el panel
        const newSelectedLayers = new Set(selectedLayers);
        newSelectedLayers.add(`establecimiento-${item.name}`);
        setSelectedLayers(newSelectedLayers);
        setSelectedDistrictLayerIds(new Set([item.name.toUpperCase()]));
      }
    }
  };

  const getDistrictStyle = (feature: any) => {
    // Si estamos mostrando establecimientos
    if (geoJSONType === 'establecimientos') {
      const establecimientoName = feature.properties.layer?.toUpperCase();
      const isSearched = searchedDistrictId === establecimientoName;
      const isClicked = clickedDistrictId === establecimientoName;
      const isLayerSelected = selectedDistrictLayerIds.has(establecimientoName);
      
      console.log("🔍 Establecimiento:", establecimientoName);
      console.log("  - isSearched:", isSearched);
      console.log("  - isClicked:", isClicked);
      console.log("  - isLayerSelected:", isLayerSelected);
      console.log("  - selectedDistrictLayerIds:", Array.from(selectedDistrictLayerIds));
      
      // Estilo base para establecimientos NO seleccionados
      const baseStyle = {
        weight: 1,
        color: "#000000",
        fillOpacity: 0.2,
        fillColor: "#E0E0E0",
      }; 
      
      // Estilo para establecimientos SELECCIONADOS o CLICKEADOS
      const highlightStyle = {
        weight: 4,
        color: "#FF0000", // Rojo brillante para destacar
        fillOpacity: 0.8,
        fillColor: "#FF4444", // Rojo claro para relleno
      };
      
      // Si está seleccionado por cualquier método (búsqueda, clic o panel)
      if (isSearched || isClicked || isLayerSelected) {
        console.log("🎨 Aplicando estilo HIGHLIGHT a:", establecimientoName);
        return highlightStyle;
      }
      
      console.log("🎨 Aplicando estilo BASE a:", establecimientoName);
      return baseStyle;
    }
    
    const distrito = feature.properties.NM_DIST?.toUpperCase();
    const distritoData = casosPorDistrito[distrito] || { total: 0, TIA_100k: 0 };

    const isSearched = searchedDistrictId === distrito;
    const isClicked = clickedDistrictId === distrito;
    const isLayerSelected = selectedDistrictLayerIds.has(distrito);

    // -------------------------------
    //  ✨ DETECTAR DIAGNÓSTICOS
    // -------------------------------
    const diagnosticos = diagnosticoSeleccionado.map(d =>
      d.toUpperCase().replace(/-|_| /g, "")
    );

    const isDiseaseSelected = diagnosticos.length > 0;

    // Diagnóstico especial para TBC-TIA
    const esTBC_TIA = diagnosticos.includes("TBCTIA") || diagnosticos.includes("TBCTIAEESS");

    // -------------------------------
    //  🎯 DEFINIR VALOR A PINTAR
    // -------------------------------
    const valorPintado = esTBC_TIA
      ? (distritoData.TIA_100k ?? 0)
      : (distritoData.total ?? 0);

    // -------------------------------
    //  🎨 ESCALA FIJA PARA TBC-TIA
    // -------------------------------
    const escalaTB = (valor: number) => {
      if (valor > 75) return "#f21a0aff";     // rojo
      if (valor > 50) return "#fa9b15ff";     // naranja
      if (valor > 25) return "#fff134ff";     // amarillo
      if (valor > 0)  return "#2eff1bff";     // verde
      return "#9a9a9aff";
    };

    // -------------------------------
    //  🎨 ESCALA DINÁMICA para otros diagnósticos
    // -------------------------------
    const getValorDistrito = (d: string) => {
      const data = casosPorDistrito[d];
      if (!data) return 0;
      return data.total ?? 0; // SOLO TOTAL
    };

    const valores = Object.keys(casosPorDistrito).map(getValorDistrito);
    const minValor = Math.min(...valores);
    const maxValor = Math.max(...valores);

    const escalaDinamica = (valor: number) => {
      if (maxValor === minValor) return "#9a9a9aff";

      const rango = maxValor - minValor;
      const porcentaje = (valor - minValor) / rango;

      if (porcentaje > 0.75) return "#f21a0aff";   // rojo
      if (porcentaje > 0.50) return "#fa9b15ff";   // naranja
      if (porcentaje > 0.25) return "#fff134ff";   // amarillo
      return "#2eff1bff";                          // verde
    };

    // -------------------------------
    //  🎨 COLOR FINAL
    // -------------------------------
    const fillColor = esTBC_TIA
      ? escalaTB(valorPintado)
      : escalaDinamica(valorPintado);

    const fillOpacity = valorPintado > 0 ? 0.8 : 0.2;

    // -------------------------------
    //  🧩 ESTILOS BASE / HIGHLIGHT
    // -------------------------------
    const baseStyle = {
      weight: 1,
      color: "#000000",
      fillOpacity,
      fillColor,
    };

    const highlightStyle = {
      weight: 3,
      color: "#000000",
      fillOpacity,
      fillColor,
    };

    if (!isDiseaseSelected) {
      return isSearched || isClicked || isLayerSelected
        ? { ...highlightStyle, fillOpacity: 0.5, fillColor: "#f7e932" }
        : { ...baseStyle, fillOpacity: 0.2, fillColor: "#E0E0E0" };
    }

    if (isSearched || isClicked || isLayerSelected) {
      return { ...highlightStyle };
    }

    return { ...baseStyle };
  };

  const onEachDistrict = (feature: any, layer: LeafletLayer) => {
    const name = geoJSONType === 'distritos' 
      ? feature.properties.NM_DIST 
      : feature.properties.layer;

    // ⭐ Tooltip
    if (name) {
      layer.bindTooltip(name, {
        permanent: false,
        direction: 'auto',
        sticky: true,
        opacity: 0.9,
        className: 'district-tooltip'
      });
    }

    layer.on({
      click: async (e) => {
        L.DomEvent.stopPropagation(e);

        const districtLayer = e.target;

        const clickedName = name.toUpperCase();
        
        console.log("🖱️ Clic en:", clickedName, "Tipo:", geoJSONType);
        
        // ⭐ COMPORTAMIENTO NUEVO: CLIC EN EL MAPA REEMPLAZA LA SELECCIÓN
        if (geoJSONType === 'establecimientos') {
          // 1. Limpiar TODAS las selecciones anteriores
          setSelectedDistrictLayerIds(new Set([clickedName])); // Solo este establecimiento
          setClickedDistrictId(clickedName);
          setSearchedDistrictId(null);
          
          // 2. Actualizar selección en el panel (solo este establecimiento)
          const newSelectedLayers = new Set(selectedLayers);
          
          // Remover todos los establecimientos previamente seleccionados
          Array.from(newSelectedLayers).forEach(id => {
            if (id.startsWith('establecimiento-')) {
              newSelectedLayers.delete(id);
            }
          });
          
          // Agregar solo este establecimiento
          newSelectedLayers.add(`establecimiento-${name}`);
          setSelectedLayers(newSelectedLayers);
          
          console.log("🏥 Establecimiento seleccionado (clic mapa):", clickedName);
          console.log("📋 Nueva selección:", Array.from(new Set([clickedName])));

          // 3. Crear popup para establecimiento usando el nuevo componente
          const container = L.DomUtil.create("div");
          
          // Obtener casos para este establecimiento
          let caseCount = 0;
          const detalleDiagnostico: Record<string, any> = {};
          
          // Si hay diagnósticos seleccionados, obtener datos del establecimiento
          if (diagnosticoSeleccionado.length > 0) {
            // Obtener casos totales del establecimiento usando la función
            try {
              caseCount = await obtenerCasosTotalesEstablecimiento(name);
              console.log(`📊 Casos totales para ${name}: ${caseCount}`);
            } catch (err) {
              console.error(`Error obteniendo casos totales para establecimiento ${name}:`, err);
              caseCount = 0;
            }
            
            // Para cada diagnóstico seleccionado, usar la función correspondiente
            for (const diag of diagnosticoSeleccionado) {
              console.log(`📋 Procesando diagnóstico: ${diag} para establecimiento ${name}`);
              try {
                const data = await obtenerCasosEnfermedadEstablecimiento(name, diag);
                console.log(`✅ Datos obtenidos para ${diag}:`, data);
                
                // Extraer el nombre del diagnóstico sin el prefijo
                const diagNombre = diag.replace('diagnostico-', '');
                
                if (diagNombre.toUpperCase().includes("TBC TIA") || diagNombre.toUpperCase().includes("TBCTIA")) {
                  detalleDiagnostico[diag] = {
                    total: data.total || 0,
                    TIA_100k: data.TIA_100k || 0,
                    detalle: data.detalle || [],
                    rawData: data // Para depuración
                  };
                } else if (diagNombre.toUpperCase().includes("EDAS")) {
                  detalleDiagnostico[diag] = {
                    total: data.total || 0,
                    daa: data.daa || 0,
                    dis: data.dis || 0,
                    detalle: data.detalle || [],
                    rawData: data // Para depuración
                  };
                } else if (diagNombre.toUpperCase().includes("IRAS")) {
                  detalleDiagnostico[diag] = {
                    total: data.total || 0,
                    ira_no_neumonia: data.ira_no_neumonia || 0,
                    sob_asma: data.sob_asma || 0,
                    neumonia_grave: data.neumonia_grave || 0,
                    neumonia: data.neumonia || 0,
                    detalle: data.detalle || [],
                    rawData: data // Para depuración
                  };
                } else {
                  detalleDiagnostico[diag] = {
                    total: data.total || 0,
                    detalle: data.detalle || [],
                    rawData: data // Para depuración
                  };
                }
              } catch (err) {
                console.error(`❌ Error obteniendo datos para ${diag} en establecimiento ${name}:`, err);
                detalleDiagnostico[diag] = { 
                  total: 0, 
                  detalle: [],
                  error: "Error al cargar datos",
                  mensaje: "Error al cargar datos"
                };
              }
            }
          }
          
          // Obtener población asignada al establecimiento (si existe) usando la función
          let dataPoblacion = null;
          try {
            dataPoblacion = await obtenerPoblacionEstablecimiento(name);
            console.log(`👥 Población para ${name}:`, dataPoblacion);
          } catch (error) {
            console.error("Error obteniendo población del establecimiento:", error);
            dataPoblacion = null;
          }
          
          // Crear popup con un contenedor vacío inicialmente
          districtLayer.bindPopup(container, {
            maxWidth: 400,
            minWidth: 350,
            className: "establecimiento-popup-container",
            autoPan: true,
            autoPanPadding: [30, 30]
          });

          // Montar el componente React en el popup cuando se abre
          districtLayer.on("popupopen", () => {
            console.log("🎯 Popup abierto para establecimiento:", name);
            
            // Limpiar el contenedor primero
            container.innerHTML = '';
            const root = createRoot(container);
            
            root.render(
              <EstablecimientoPopup
                establecimientoName={name}
                caseCount={caseCount}
                poblacion={dataPoblacion}
                diagnosticoSeleccionado={diagnosticoSeleccionado}
                detalleDiagnostico={detalleDiagnostico}
                propiedades={feature.properties}
              />
            );

            // Guardar referencia para limpiar luego
            (districtLayer as any)._reactRoot = root;
          });

          // Desmontar React cuando se cierra el popup
          districtLayer.on("popupclose", () => {
            console.log("❌ Popup cerrado para establecimiento:", name);
            const root = (districtLayer as any)._reactRoot;
            if (root) {
              root.unmount();
              delete (districtLayer as any)._reactRoot;
            }
          });

          // Abrir el popup inmediatamente
          districtLayer.openPopup();
          console.log("✅ Popup abierto para:", name);

          // 4. Ajuste de zoom
          if (map) {
            const bounds = districtLayer.getBounds();
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
          }
          
          return;
        } else {
          // Para distritos: mismo comportamiento
          setClickedDistrictId(clickedName);
          setSearchedDistrictId(null);
          setSelectedDistrictLayerIds(new Set([clickedName])); // Solo este distrito
          
          // Actualizar selección en el panel
          const newSelectedLayers = new Set(selectedLayers);
          
          // Remover todos los distritos previamente seleccionados
          Array.from(newSelectedLayers).forEach(id => {
            if (id.startsWith('distrito-')) {
              newSelectedLayers.delete(id);
            }
          });
          
          // Agregar solo este distrito
          newSelectedLayers.add(`distrito-${name}`);
          setSelectedLayers(newSelectedLayers);
          
          console.log("🗺️ Distrito seleccionado (clic mapa):", clickedName);
        }

        // ⭐ Ajuste de zoom
        if (map) {
          const bounds = districtLayer.getBounds();
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
        }

        // ⭐ Solo para distritos: Llamadas a la BD
        const dataPoblacion = await obtenerPoblacion(name);
        const caseCount = await obtenerCasosTotales(name);

        const detalleDiagnostico: Record<string, any> = {};

        for (const diag of diagnosticoSeleccionado) {
          const data = await obtenerCasosEnfermedad(name, diag);
          const detalleArray = data.detalle || [];

          if (diag === "TBC TIA" || diag === "TBC TIA EESS") {
            detalleDiagnostico[diag] = {
              total: data.total || 0,
              TIA_100k: data.TIA_100k || 0,
              poblacion: data.poblacion_total || 0,
              detalle: []
            };
            continue;
          }

          if (diag === "Infecciones respiratorias agudas") {
            detalleDiagnostico[diag] = {
              total: data.total || 0,
              detalle: detalleArray,
              ira_no_neumonia: detalleArray.find((d: any) => d.grupo === "IRA_NO_NEUMONIA")?.cantidad || 0,
              sob_asma: detalleArray.find((d: any) => d.grupo === "SOB_ASMA")?.cantidad || 0,
              neumonia_grave: detalleArray.find((d: any) => d.grupo === "NEUMONIA_GRAVE")?.cantidad || 0,
              neumonia: detalleArray.find((d: any) => d.grupo === "NEUMONIA")?.cantidad || 0
            };
            continue;
          }

          if (diag === "Enfermedades diarreicas agudas") {
            detalleDiagnostico[diag] = {
              total: data.total || 0,
              daa: data.daa || 0,
              dis: data.dis || 0,
              detalle: detalleArray
            };
            continue;
          }

          detalleDiagnostico[diag] = {
            total: data.total || 0,
            detalle: detalleArray
          };
        }

        setCasosDetallePorDistrito(prev => ({
          ...prev,
          [name]: detalleDiagnostico
        }));

        // ⭐ Crear contenedor para React
        const container = L.DomUtil.create("div");
        
        districtLayer.bindPopup(container, {
          maxWidth: 400,
          minWidth: 300,
          className: "district-popup-container",
          autoPan: true,
          autoPanPadding: [30, 30]
        });

        // Montar el componente cuando se abre
        districtLayer.on("popupopen", () => {
          const root = createRoot(container);
          root.render(
            <DistrictPopup
              districtName={name}
              caseCount={caseCount}
              poblacion={dataPoblacion}
              diagnosticoSeleccionado={diagnosticoSeleccionado}
              detalleDiagnostico={detalleDiagnostico}
            />
          );

          (districtLayer as any)._reactRoot = root;
        });

        // Desmontar React
        districtLayer.on("popupclose", () => {
          const root = (districtLayer as any)._reactRoot;
          if (root) {
            root.unmount();
            delete (districtLayer as any)._reactRoot;
          }
        });
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

  const PanelLegend = () => {
    // Determinar qué diagnóstico está activo para mostrar la leyenda correcta
    const diagnosticoActivo = diagnosticoSeleccionado.length > 0 
      ? diagnosticoSeleccionado[diagnosticoSeleccionado.length - 1] 
      : '';
    
    // Obtener el nombre del diagnóstico
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
      return findName([VIGILANCIA_LAYER_DATA]) || diagnosticoId;
    };
    
    const nombreDiagnostico = diagnosticoActivo ? getDisplayNameForDiagnostico(diagnosticoActivo) : '';
    
    const diagId = diagnosticoActivo.trim().toUpperCase().replace(/[-_]/g, '');
    const esTIA = diagId.includes('TBCTIA') || diagId.includes('TBCTIAEESS');
    const esTBGeneral = diagId.includes('TBCPULMONAR') || diagId.includes('SIGTB');
    
    // Calcular los rangos reales de los datos actuales
    const calcularRangos = () => {
      if (!allDistricts || Object.keys(casosPorDistrito).length === 0) {
        return { min: 0, max: 0, valores: [] };
      }
      
      const valores: number[] = [];
      
      // Recorrer todos los distritos para obtener los valores actuales
      allDistricts.features.forEach(feature => {
        const d = feature.properties.NM_DIST?.toUpperCase();
        let valor = 0;
        
        if (esTIA) {
          if (diagId.includes('TBCTIAEESS')) {
            valor = casosPorDistrito['TBC TIA EESS']?.[d]?.TIA_100k || 0;
          } else if (diagId.includes('TBCTIA')) {
            valor = casosPorDistrito['TBC_TIA']?.[d]?.TIA_100k || 0;
          }
        } else if (esTBGeneral) {
          valor = casosPorDistrito['SIGTB']?.[d]?.total || 0;
        } else if (diagnosticoActivo === 'diagnostico-edas') {
          valor = casosPorDistrito['EDAS']?.[d]?.total || 0;
        } else if (diagnosticoActivo === 'diagnostico-iras') {
          valor = casosPorDistrito['IRAS']?.[d]?.total || 0;
        } else if (diagnosticoActivo === 'diagnostico-febriles') {
          valor = casosPorDistrito[d]?.total || 0;
        } else {
          valor = casosPorDistrito[d]?.total || 0;
        }
        
        valores.push(valor);
      });
      
      const minValor = Math.min(...valores.filter(v => !isNaN(v) && v !== null));
      const maxValor = Math.max(...valores.filter(v => !isNaN(v) && v !== null));
      
      return { min: minValor, max: maxValor, valores };
    };
    
    const rangos = calcularRangos();
    
    // Si no hay diagnóstico activo, mostrar leyenda general
    if (!diagnosticoActivo) {
      return (
        <div className="panel-legend">
          <h4>Leyenda General</h4>
          <div className="legend-items">
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#f21a0aff' }}></div>
              <div className="legend-label">Alto</div>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#fa9b15ff' }}></div>
              <div className="legend-label">Medio-Alto</div>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#fff134ff' }}></div>
              <div className="legend-label">Medio-Bajo</div>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#2eff1bff' }}></div>
              <div className="legend-label">Bajo</div>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#9a9a9aff' }}></div>
              <div className="legend-label">Sin casos</div>
            </div>
          </div>
          <p className="legend-note">
            La intensidad del color representa la magnitud de los casos o la tasa de incidencia.
          </p>
        </div>
      );
    }

    // Para TIA (TBC TIA o TBC TIA EESS) - Mostrar ambas leyendas
    if (esTIA) {
      const tipoTIA = diagId.includes('TBCTIAEESS') ? 'TBC TIA EESS' : 'TBC TIA';
      
      return (
        <div className="panel-legend">
          <h4>Leyenda - {nombreDiagnostico}</h4>
          <p className="legend-subtitle">Tasa de Incidencia Anual (TIA por 100,000 hab.)</p>
          
          {/* Leyenda de colores según TIA (escala fija) */}
          <div className="legend-section">
            <h5>Colores según valor TIA:</h5>
            <div className="legend-items">
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#f21a0aff' }}></div>
                <div className="legend-label">{`> 75 (Alto)`}</div>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#fa9b15ff' }}></div>
                <div className="legend-label">{`50 - 75 (Medio-Alto)`}</div>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#fff134ff' }}></div>
                <div className="legend-label">{`25 - 50 (Medio-Bajo)`}</div>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#2eff1bff' }}></div>
                <div className="legend-label">{`0 - 25 (Bajo)`}</div>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#9a9a9aff' }}></div>
                <div className="legend-label">{`0 (Sin casos)`}</div>
              </div>
            </div>
          </div>
          
          {/* Información adicional sobre TIA */}
          <div className="legend-section">
            <h5>Información TIA:</h5>
            <div className="legend-info">
              <div className="info-item">
                <span className="info-label">Tipo:</span>
                <span className="info-value">{tipoTIA}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Rango actual:</span>
                <span className="info-value">{rangos.min.toFixed(2)} - {rangos.max.toFixed(2)} por 100,000 hab.</span>
              </div>
            </div>
          </div>
          
          {/* Leyenda de intensidad (para referencia) */}
          <div className="legend-section">
            <h5>Intensidad de casos:</h5>
            <div className="legend-items compact">
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#f21a0aff' }}></div>
                <div className="legend-label">Alta</div>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#fa9b15ff' }}></div>
                <div className="legend-label">Media-Alta</div>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#fff134ff' }}></div>
                <div className="legend-label">Media-Baja</div>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#2eff1bff' }}></div>
                <div className="legend-label">Baja</div>
              </div>
            </div>
          </div>
          
          <p className="legend-note">
            Los colores representan la tasa de incidencia anual calculada por cada 100,000 habitantes.
          </p>
        </div>
      );
    }
    
    // Para TBC pulmonar (SIGTB)
    if (esTBGeneral) {
      return (
        <div className="panel-legend">
          <h4>Leyenda - {nombreDiagnostico}</h4>
          <p className="legend-subtitle">Casos de Tuberculosis Pulmonar</p>
          
          {/* Leyenda de intensidad de casos (escala dinámica) */}
          <div className="legend-section">
            <h5>Intensidad de casos:</h5>
            <div className="legend-items">
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#f21a0aff' }}></div>
                <div className="legend-label">Alta (75% - 100%)</div>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#fa9b15ff' }}></div>
                <div className="legend-label">Media-Alta (50% - 75%)</div>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#fff134ff' }}></div>
                <div className="legend-label">Media-Baja (25% - 50%)</div>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#2eff1bff' }}></div>
                <div className="legend-label">Baja (0% - 25%)</div>
              </div>
            </div>
          </div>
          
          {rangos.max > 0 ? (
            <div className="legend-section">
              <h5>Información de casos:</h5>
              <div className="legend-info">
                <div className="info-item">
                  <span className="info-label">Rango actual:</span>
                  <span className="info-value">{rangos.min} - {rangos.max} casos</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Distritos con casos:</span>
                  <span className="info-value">{rangos.valores.filter(v => v > 0).length} de {allDistricts?.features.length}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="legend-note">
              No hay datos cargados para este diagnóstico.
            </p>
          )}
        </div>
      );
    }
    
    // Para otros diagnósticos (escala dinámica)
    return (
      <div className="panel-legend">
        <h4>Leyenda - {nombreDiagnostico}</h4>
        <p className="legend-subtitle">Intensidad de Casos (escala dinámica)</p>
        
        {/* Leyenda de intensidad de casos */}
        <div className="legend-section">
          <h5>Colores según intensidad:</h5>
          <div className="legend-items">
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#f21a0aff' }}></div>
              <div className="legend-label">Muy alto riesgo de transmision (75% - 100%)</div>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#fa9b15ff' }}></div>
              <div className="legend-label">Alto riesto de transmision (50% - 75%)</div>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#fff134ff' }}></div>
              <div className="legend-label">Mediano riesgo de transmision (25% - 50%)</div>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ backgroundColor: '#2eff1bff' }}></div>
              <div className="legend-label">Bajo riesgo de transmision (0% - 25%)</div>
            </div>
          </div>
        </div>
        
        {rangos.max > 0 ? (
          <div className="legend-section">
            <h5>Información de casos:</h5>
            <div className="legend-info">
              <div className="info-item">
                <span className="info-label">Rango actual:</span>
                <span className="info-value">{rangos.min} - {rangos.max} casos</span>
              </div>
              <div className="info-item">
                <span className="info-label">Distritos con casos:</span>
                <span className="info-value">{rangos.valores.filter(v => v > 0).length} de {allDistricts?.features.length}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Total casos:</span>
                <span className="info-value">{rangos.valores.reduce((a, b) => a + b, 0)}</span>
              </div>
            </div>
            <p className="legend-note">
              Los colores se ajustan dinámicamente al rango de casos actual.
            </p>
          </div>
        ) : (
          <p className="legend-note">
            No hay datos cargados para este diagnóstico.
          </p>
        )}
      </div>
    );
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

        {activeGeoJSON && (
          <GeoJSON
            key={
              JSON.stringify(Array.from(selectedLayers)) +
              searchedDistrictId +
              diagnosticoSeleccionado.join(",") +
              geoJSONType + // Añade geoJSONType al key
              JSON.stringify(Array.from(selectedDistrictLayerIds)) // Añade las selecciones
            }
            data={activeGeoJSON}
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
              {sidebarView === 'capas' ? (
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

                  <div className="geoJSON-toggle-container">
                    <div 
                      className={`geoJSON-toggle ${geoJSONType === 'distritos' ? 'left' : 'right'}`}
                      onClick={() => handleGeoJSONChange(geoJSONType === 'distritos' ? 'establecimientos' : 'distritos')}
                    >
                      <div className="toggle-slider"></div>
                      <div className="toggle-option left">Distritos</div>
                      <div className="toggle-option right">Establecimientos</div>
                    </div>
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
              ) : (
                <PanelLegend />
              )}
            </>
          )}
          </div>

          <div className="sidebar-nav">
            <button 
              className={`nav-button ${isSidebarOpen && sidebarView === 'capas' ? 'active' : ''}`}
              onClick={() => {
                setSidebarView('capas');
                setSidebarOpen(true);
              }}
              title="Capas y Filtros"
            >
              <i className="fas fa-layer-group"></i> 
            </button>

            <button 
              className={`nav-button ${isSidebarOpen && sidebarView === 'leyenda' ? 'active' : ''}`}
              onClick={handleShowLegend}
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
              {suggestionResults.map((item) => (
                <li 
                  key={`${item.type}-${item.name}`} 
                  onClick={() => handleSuggestionSelect(item)}
                  className="suggestion-item"
                >
                  <span className="suggestion-name">{item.name}</span>
                  <span className={`suggestion-type ${item.type}`}>
                    {item.type === 'distrito' ? '🗺️ Distrito' : '🏥 Establecimiento'}
                  </span>
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
          <button title="Principal" onClick={() => window.location.href = 'http://10.0.5.237:8000'}>🖥️</button>
          <button title="Estadística" onClick={() => window.location.href = 'http://10.0.2.22/geoestadistica/'}>📊</button>
          <button title="Docencia" onClick={() => window.location.href = 'http://10.0.20.235:2005/mapa_ris/'}>🎓</button>
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

        <div className="legend-container">
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
        </div>

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
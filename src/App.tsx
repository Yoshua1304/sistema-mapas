import { useState, useEffect, useMemo } from 'react';
import ReactDOMServer from 'react-dom/server';
import { MapContainer, TileLayer, GeoJSON, useMapEvents } from 'react-leaflet';
import { DomEvent, Layer as LeafletLayer } from 'leaflet';
import proj4 from 'proj4';
import 'leaflet/dist/leaflet.css';
import './App.css';
import LayerItem, { Layer } from './LayerItem';
import DistrictPopup from './DistrictPopup';
import BaseMapSelector, { BaseMap } from './BaseMapSelector';

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
                    { id: 'diagnostico-fasciolosis-humana', name: 'Fasciolosis humana' },
                    { id: 'diagnostico-carbunco', name: 'Carbunco' },
                    { id: 'diagnostico-peste', name: 'Peste' },
                    { id: 'diagnostico-rabia-humana', name: 'Rabia humana urbana y silvestre' },
                    { id: 'diagnostico-leptospirosis', name: 'Leptospirosis' },
                    { id: 'diagnostico-ofidismo', name: 'Ofidismo' },
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
                    { id: 'diagnostico-gonococica', name: 'Infección gonocócica' },
                    { id: 'diagnostico-hepatitis-b', name: 'Hepatitis B' },
                    { id: 'diagnostico-nino-expuesto-vih', name: 'Niño expuesto al VIH' },
                    { id: 'diagnostico-infeccion-vih', name: 'Infección por VIH' },
                    { id: 'diagnostico-sida', name: 'Sida' },
                    { id: 'diagnostico-sifilis', name: 'Sífilis' },
                ]},
                { id: 'diagnostico-inmunoprevenibles', name: 'Inmunoprevenibles', subLayers: [
                    { id: 'diagnostico-fiebre-amarilla', name: 'Fiebre amarilla selvática' },
                    { id: 'diagnostico-tetanos-neonatal', name: 'Tétanos neonatal' },
                    { id: 'diagnostico-viruela-mono', name: 'Viruela del mono' },
                    { id: 'diagnostico-esavi', name: 'ESAVI' },
                    { id: 'diagnostico-tetanos', name: 'Tétanos' },
                    { id: 'diagnostico-difteria', name: 'Difteria' },
                    { id: 'diagnostico-rubeola-congenita', name: 'Rubeola congénita' },
                    { id: 'diagnostico-rubeola', name: 'Rubeola' },
                    { id: 'diagnostico-sarampion', name: 'Sarampión' },
                    { id: 'diagnostico-tos-ferina', name: 'Tos ferina' },
                    { id: 'diagnostico-varicela', name: 'Varicela' },
                    { id: 'diagnostico-parotiditis', name: 'Parotiditis y sus complicaciones' },
                    { id: 'diagnostico-meningitis-meningococica', name: 'Meningitis meningocócica' },
                    { id: 'diagnostico-influenza', name: 'Enfermedad tipo Influenza' },
                    { id: 'diagnostico-polio', name: 'Poliomielitis aguda (Parálisis flácida aguda)' },
                ]},
                { id: 'diagnostico-tuberculosis-group', name: 'Tuberculosis', subLayers: [
                    { id: 'diagnostico-tuberculosis', name: 'Tuberculosis' },
                    { id: 'diagnostico-metales-pesados', name: 'Efecto tóxico de metales pesados' },
                ]},
                { id: 'diagnostico-ira-eda-etc', name: 'IRA/EDA/Febriles/SGB', subLayers: [
                    { id: 'diagnostico-iras', name: 'Infecciones respiratorias agudas' },
                    { id: 'diagnostico-neumonias', name: 'Neumonías' },
                    { id: 'diagnostico-covid-19', name: 'COVID-19' },
                    { id: 'diagnostico-sob-asma', name: 'SOB/ASMA' },
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
                    { id: 'diagnostico-muerte-neonatal-fetal', name: 'Muerte neonatal/Muerte fetal' },
                    { id: 'diagnostico-gvi', name: 'Gestante vacunada inadvertidamente (GVI)' },
                    { id: 'diagnostico-muerte-materna-inmediata', name: 'Muerte materna inmediata' },
                    { id: 'diagnostico-morbilidad-materna-extrema', name: 'Morbilidad materna extrema' },
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
  const [map, setMap] = useState<any>(null);
  const [suggestionResults, setSuggestionResults] = useState<string[]>([]);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [isBaseMapSelectorOpen, setBaseMapSelectorOpen] = useState(false);
  const [currentBaseMap, setCurrentBaseMap] = useState<BaseMap>(BASE_MAPS[0]);
  const position: [number, number] = [-12.08, -77.02];
  const zoomLevel = 12;

    // Casos por distrito (mapa dinámico)
    const [casosPorDistrito, setCasosPorDistrito] = useState<Record<string, number>>({});
  // Estado para diagnóstico seleccionado
  const [diagnosticoSeleccionado, setDiagnosticoSeleccionado] = useState<string[]>([]);

console.log("🟦 diagnosticoSeleccionado TYPE:", typeof diagnosticoSeleccionado);
console.log("🟦 diagnosticoSeleccionado VALUE:", diagnosticoSeleccionado);
console.log("🟦 diagnosticoSeleccionado IS ARRAY:", Array.isArray(diagnosticoSeleccionado));


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

const [casosDetallePorDistrito, setCasosDetallePorDistrito] = useState<
  Record<
    string,
    {
      total: number;
      detalle: { tipo_dx: string; cantidad: number }[];
    }
  >
>({});

const cargarCasosPorDiagnostico = async (diagnostico: string) => {
  if (!allDistricts) return;

  console.log(`============================`);
  console.log(`🔍 Diagnóstico seleccionado: ${diagnostico}`);
  console.log(`============================`);

  const resultados: Record<string, number> = {};
  const detalles: Record<
    string,
    {
      total: number;
      detalle: { tipo_dx: string; cantidad: number }[];
    }
  > = {};

  for (const feature of allDistricts.features) {
    const distrito = feature.properties.NM_DIST;
    const url = `http://localhost:5000/api/casos_enfermedad?distrito=${distrito}&enfermedad=${diagnostico}`;

    console.log(`🌐 Consultando backend para distrito: ${distrito}`);
    console.log(`URL → ${url}`);

    try {
      const res = await fetch(url);

      if (!res.ok) {
        console.error(`❌ Error HTTP (${res.status}) en distrito ${distrito}`);

        resultados[distrito.toUpperCase()] = 0;
        detalles[distrito.toUpperCase()] = {
          total: 0,
          detalle: []
        };
        continue;
      }

      const data = await res.json();

      console.log(
        `📁 Respuesta para ${distrito}: ${JSON.stringify(data)}`
      );

      resultados[distrito.toUpperCase()] = data.total || 0;

      detalles[distrito.toUpperCase()] = {
        total: data.total || 0,
        detalle: data.detalle || []
      };

    } catch (err) {
      console.error(`❌ Error de conexión en distrito ${distrito}`, err);

      resultados[distrito.toUpperCase()] = 0;
      detalles[distrito.toUpperCase()] = {
        total: 0,
        detalle: []
      };
    }
  }

  console.log(`============================`);
  console.log(`📊 RESULTADO FINAL: ${diagnostico}`);
  console.log(`============================`);

  Object.entries(resultados).forEach(([dist, total]) => {
    console.log(`🏙  ${dist}: ${total} casos`);
  });

  setCasosPorDistrito(resultados);
  setCasosDetallePorDistrito(detalles); // ⭐ Nuevo

  console.log(`============================`);
};

// En App.tsx
const handleDiagnosticoSelect = (diagnostico: string, checked: boolean) => {
  setDiagnosticoSeleccionado(prev => {
    let nuevo;
    if (checked) {
      // evitar duplicados
      nuevo = prev.includes(diagnostico) ? prev : [...prev, diagnostico];
    } else {
      nuevo = prev.filter(d => d !== diagnostico);
    }

    // ⭐ CORRECCIÓN: Llamar a cargarCasosPorDiagnostico con UN SOLO diagnóstico (el último)
    // Si hay diagnósticos seleccionados, usamos el último para colorear el mapa.
    const diagnosticoParaPintar = nuevo.length > 0 ? nuevo[nuevo.length - 1] : '';

    if (diagnosticoParaPintar) {
      cargarCasosPorDiagnostico(diagnosticoParaPintar); // ✅ Ahora envía un string
    } else {
      setCasosPorDistrito({}); // Si no hay nada seleccionado, limpia los colores
    }

    return nuevo;
  });
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

  const getSubLayerIds = (layer: Layer): string[] => {
    let ids: string[] = [layer.id];
    if (layer.subLayers) {
      layer.subLayers.forEach(sub => {
        ids = [...ids, ...getSubLayerIds(sub)];
      });
    }
    return ids;
  };

  const handleLayerSelection = (layerId: string, isSelected: boolean) => {
    const newSelectedLayers = new Set(selectedLayers);

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

    setSelectedLayers(newSelectedLayers);
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
      const lat = foundDistrict.properties.auxiliar_1;
      const lng = foundDistrict.properties.auxiliary_;

      if (lat && lng) {
        map.flyTo([lat, lng], 14);
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
      const lat = foundDistrict.properties.auxiliar_1;
      const lng = foundDistrict.properties.auxiliary_;

      if (lat && lng) {
        map.flyTo([lat, lng], 14);
        setSearchedDistrictId(`${foundDistrict.properties.NM_DIST?.toUpperCase()}`);
      }
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
  const isSearched = searchedDistrictId === distrito; // Estado de búsqueda de la barra superior
  
  // 🚨 ESTILO BASE
  const baseStyle = {
    weight: 1,
    color: "#555",
    fillOpacity: 0.7,
    fillColor: "#D3D3D3",
  };

  // --- 1. RESALTE DE BÚSQUEDA (MÁXIMA PRIORIDAD) ---
  if (isSearched) {
    return {
      ...baseStyle,
      color: "#00BFFF", // Azul Cian brillante
      weight: 3, // Borde más grueso
      fillOpacity: 0.9,
      fillColor: "#00BFFF",
    };
  }

  // --- 2. RESALTE POR CASOS (Prioridad Media) ---
  const casos = casosPorDistrito[distrito] ?? 0;

  if (casos === 0) {
    return {
      ...baseStyle,
      fillOpacity: 0.2,
      fillColor: "#E0E0E0",
    };
  }

  // Escala simple (se mantiene tu lógica)
  const escala = casos > 50 ? "#800026" :
                 casos > 20 ? "#BD0026" :
                 casos > 10 ? "#E31A1C" :
                 casos > 5  ? "#FC4E2A" :
                 casos > 1  ? "#FD8D3C" :
                              "#FEB24C";

  return {
    ...baseStyle,
    fillColor: escala,
    fillOpacity: 0.8,
  };
};

const onEachDistrict = (feature: any, layer: LeafletLayer) => {
  const districtName = feature.properties.NM_DIST;

  if (!districtName) return;

  // ⭐ NUEVO: Efectos visuales de HOVER
  layer.on({
    mouseover: (e) => {
      // Resaltar el borde del distrito
      e.target.setStyle({
        weight: 3, 
        color: '#666', 
        dashArray: '',
        fillOpacity: 0.9
      });

      // Asegurarse de que el distrito "flote" por encima de los demás
      e.target.bringToFront(); 
    },
    mouseout: (e) => {
      // Restablecer el estilo al salir del hover (pide a Leaflet que recalcule el estilo)
      e.target.setStyle(getDistrictStyle(feature));
    },
    click: async () => {
      // 1. población
      const dataPoblacion = await obtenerPoblacion(districtName);

      // 2. total de casos
      const caseCount = await obtenerCasosTotales(districtName);

      // 3. detalles múltiples diagnósticos
      const detalleDiagnostico: Record<string, any> = {};

      for (const diag of diagnosticoSeleccionado) {
        const data = await obtenerCasosEnfermedad(districtName, diag);

        detalleDiagnostico[diag] = {
          total: data.total || 0,
          detalle: data.detalle || [],
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

  return (
  <div className="app-container">
    <header className="header">
      <div className="logo-container">
        <img src="/logo.png" alt="Logo DIRIS-LC" />
        <span className="brand-text">DIRIS-LC</span>
        <span className="separator"></span>
        <h1>Plataforma de Datos Georreferenciados Epi Perú</h1>
      </div>
    </header>

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
          <div
            className="sidebar-header"
            onClick={() => setSidebarOpen(!isSidebarOpen)}
          >
            <h3>CAPAS</h3>
            <button className="sidebar-toggle-button">
              {isSidebarOpen ? "◀" : "▶"}
            </button>
          </div>

          {isSidebarOpen && (
            <>
              {/* BUSCADOR DE CAPAS */}
              <div className="layer-search">
                <input
                  type="text"
                  placeholder="Busca la capa que necesitas"
                  value={layerSearchTerm}
                  onChange={(e) => setLayerSearchTerm(e.target.value)}
                />
                <button>🔍</button>
              </div>

              {/* LISTA DE CAPAS */}
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

        {/* BUSCADOR EN MAPA con Autocompletado */}
        <div 
          ref={mapSearchBarRef} 
          className="map-search-bar-container" // ⭐ Nuevo contenedor para posicionamiento
        >
          <div className="map-search-bar">
            <input
              type="text"
              placeholder="Departamento, provincia o distrito"
              value={mapSearchTerm}
              onChange={handleMapSearchChange}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleMapSearch(); // Mantiene la funcionalidad de Enter
                }
              }}
              // Añade un evento para cerrar las sugerencias al perder el foco
              onBlur={() => setTimeout(() => setIsSuggestionsOpen(false), 200)} 
              onFocus={() => {
                  if (suggestionResults.length > 0) setIsSuggestionsOpen(true);
              }}
            />
            <button onClick={handleMapSearch}>🔍</button>
          </div>

          {/* ⭐ MENÚ DE SUGERENCIAS */}
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
          <button title="Estadísticas">📊</button>
          <button title="Reportes">📄</button>
          <button title="Cargar Externo">📤</button>
          <button title="Dibujar/Medir">✏️</button>
          <button title="Descargar">📥</button>
          <button title="Ubicar Coordenada">📍</button>
          <button title="Imprimir">🖨️</button>
          <button title="Compartir">🔗</button>
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
      </MapContainer>

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
  </div>
);

}

export default App;

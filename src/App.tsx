import { useState, useEffect, useMemo } from 'react';
import ReactDOMServer from 'react-dom/server';
import { MapContainer, TileLayer, GeoJSON, useMapEvents } from 'react-leaflet';
import { DomEvent, Layer as LeafletLayer, Feature } from 'leaflet';
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
                { id: 'zoonosis', name: 'Zoonosis', subLayers: [
                    { id: 'fasciolosis-humana', name: 'Fasciolosis humana' },
                    { id: 'carbunco', name: 'Carbunco' },
                    { id: 'peste', name: 'Peste' },
                    { id: 'rabia-humana', name: 'Rabia humana urbana y silvestre' },
                    { id: 'leptospirosis', name: 'Leptospirosis' },
                    { id: 'ofidismo', name: 'Ofidismo' },
                ]},
                {
                  id: 'metaxenicas',
                  name: 'Metaxénicas',
                  subLayers: [
                      {
                          id: 'arbovirosis',
                          name: 'Arbovirosis',
                          subLayers: [
                              { id: 'carrion-aguda', name: 'Enfermedad de Carrión Aguda' },
                              { id: 'carrion-eruptiva', name: 'Enfermedad de Carrión Eruptiva' },
                              { id: 'carrion-no-deter', name: 'Enfermedad de Carrión No Determinada' },

                              { id: 'chikungunya', name: 'Fiebre de Chikungunya' },
                              { id: 'chikungunya-grave', name: 'Fiebre de Chikungunya Grave' },

                              { id: 'zika', name: 'Zika' },
                              { id: 'zika-gestantes', name: 'Zika en gestantes' },
                              { id: 'zika-asintomatico', name: 'Zika asintomático' },
                              { id: 'zika-asintomatico-gestantes', name: 'Zika asintomático en gestantes' },

                              { id: 'dengue-sin-signos', name: 'Dengue sin signos de alarma' },
                              { id: 'dengue-con-signos', name: 'Dengue con signos de alarma' },
                              { id: 'dengue-grave', name: 'Dengue grave' },

                              { id: 'malaria-falciparum', name: 'Malaria P. falciparum' },
                              { id: 'malaria-vivax', name: 'Malaria por P. vivax' },
                              { id: 'malaria-malariae', name: 'Malaria por P. malariae' },
                              { id: 'malaria-ovale', name: 'Malaria por P. ovale' },

                              { id: 'leishmaniasis-cutanea', name: 'Leishmaniasis cutánea' },
                              { id: 'leishmaniasis-mucocutanea', name: 'Leishmaniasis mucocutánea' },

                              { id: 'chagas', name: 'Enfermedad de Chagas' },

                              { id: 'mayaro', name: 'Mayaro' },
                              { id: 'oropuche', name: 'Oropuche' },
                          ]},
                  ]
              },
                { id: 'vih-sida-ets', name: 'VIH/SIDA/ETS', subLayers: [
                    { id: 'gonococica', name: 'Infección gonocócica' },
                    { id: 'hepatitis-b', name: 'Hepatitis B' },
                    { id: 'nino-expuesto-vih', name: 'Niño expuesto al VIH' },
                    { id: 'infeccion-vih', name: 'Infección por VIH' },
                    { id: 'sida', name: 'Sida' },
                    { id: 'sifilis', name: 'Sífilis' },
                ]},
                { id: 'inmunoprevenibles', name: 'Inmunoprevenibles', subLayers: [
                    { id: 'fiebre-amarilla', name: 'Fiebre amarilla selvática' },
                    { id: 'tetanos-neonatal', name: 'Tétanos neonatal' },
                    { id: 'viruela-mono', name: 'Viruela del mono' },
                    { id: 'esavi', name: 'ESAVI' },
                    { id: 'tetanos', name: 'Tétanos' },
                    { id: 'difteria', name: 'Difteria' },
                    { id: 'rubeola-congenita', name: 'Rubeola congénita' },
                    { id: 'rubeola', name: 'Rubeola' },
                    { id: 'sarampion', name: 'Sarampión' },
                    { id: 'tos-ferina', name: 'Tos ferina' },
                    { id: 'varicela', name: 'Varicela' },
                    { id: 'parotiditis', name: 'Parotiditis y sus complicaciones' },
                    { id: 'meningitis-meningococica', name: 'Meningitis meningocócica' },
                    { id: 'influenza', name: 'Enfermedad tipo Influenza' },
                    { id: 'polio', name: 'Poliomielitis aguda (Parálisis flácida aguda)' },
                ]},
                { id: 'tuberculosis-group', name: 'Tuberculosis', subLayers: [
                    { id: 'tuberculosis', name: 'Tuberculosis' },
                    { id: 'metales-pesados', name: 'Efecto tóxico de metales pesados' },
                ]},
                { id: 'ira-eda-etc', name: 'IRA/EDA/Febriles/SGB', subLayers: [
                    { id: 'iras', name: 'Infecciones respiratorias agudas' },
                    { id: 'neumonias', name: 'Neumonías' },
                    { id: 'covid-19', name: 'COVID-19' },
                    { id: 'sob-asma', name: 'SOB/ASMA' },
                    { id: 'febriles', name: 'Febriles' },
                    { id: 'sindrome-resp-agudo', name: 'Síndrome respiratorio agudo severo' },
                    { id: 'gripe-humana', name: 'Gripe humana causada por un nuevo subtipo de virus' },
                    { id: 'guillain-barre', name: 'Síndrome de Guillain Barré' },
                    { id: 'colera', name: 'Cólera' },
                    { id: 'edas', name: 'Enfermedades diarreicas agudas' },
                ]},
                { id: 'riesgos-alimentarios', name: 'Riesgos Alimentarios', subLayers: [
                    { id: 'eta', name: 'Enfermedades Transmitidas por Alimentos' }
                ]},
            ]
        },
        {
            id: 'enf-no-transmisibles', name: 'Enfermedades No Transmisibles', subLayers: [
                { id: 'salud-mental', name: 'Salud Mental', subLayers: [
                    { id: 'intento-suicidio', name: 'Intento de suicidio' },
                    { id: 'episodio-depresivo', name: 'Episodio depresivo' },
                    { id: 'primer-episodio-psicotico', name: 'Primer episodio psicótico' },
                    { id: 'violencia-familiar', name: 'Violencia familiar' },
                ]},
                { id: 'accidentes-transito', name: 'Accidentes de Tránsito', subLayers: [
                    { id: 'lesiones-transito', name: 'Lesiones por accidente de tránsito' }
                ]},
                { id: 'enf-cronicas', name: 'Enfermedades Crónicas', subLayers: [
                    { id: 'cancer', name: 'Cáncer' },
                    { id: 'diabetes-mellitus', name: 'Diabetes mellitus' },
                ]},
            ]
        },
        {
            id: 'vigilancia-hospitalaria', name: 'Vigilancia Hospitalaria', subLayers: [
                { id: 'iaas', name: 'Infecciones Asociadas a la Atención de la Salud', subLayers: [
                    { id: 'iaas-sub', name: 'Infecciones Asociadas a la Atención de la Salud' }
                ]},
            ]
        },
        {
            id: 'materno-perinatal', name: 'Materno Perinatal', subLayers: [
                { id: 'madre-nino', name: 'Madre Niño', subLayers: [
                    { id: 'muerte-neonatal-fetal', name: 'Muerte neonatal/Muerte fetal' },
                    { id: 'gvi', name: 'Gestante vacunada inadvertidamente (GVI)' },
                    { id: 'muerte-materna-inmediata', name: 'Muerte materna inmediata' },
                    { id: 'morbilidad-materna-extrema', name: 'Morbilidad materna extrema' },
                ]}
            ]
        },
        {
            id: 'riesgos-ambientales', name: 'Riesgos Ambientales', subLayers: [
                { id: 'plaguicidas-metales', name: 'Plaguicidas y Metales', subLayers: [
                    { id: 'efecto-plaguicidas', name: 'Efecto tóxico de plaguicidas' }
                ]}
            ]
        },
        {
            id: 'otras-vigilancias', name: 'Otras Vigilancias', subLayers: [
                { id: 'brotes-epidemias', name: 'Brotes, epidemias y emergencias sanitarias' },
                { id: 'cambio-climatico', name: 'Cambio Climático-Emergencias y Desastres' },
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
  const [isBaseMapSelectorOpen, setBaseMapSelectorOpen] = useState(false);
  const [currentBaseMap, setCurrentBaseMap] = useState<BaseMap>(BASE_MAPS[0]);
  const [poblacion, setPoblacion] = useState<any | null>(null);
  const position: [number, number] = [-12.08, -77.02];
  const zoomLevel = 12;
  // Diagnósticos dinámicos
  const [diagnosticos, setDiagnosticos] = useState<string[]>([]);
  const [casosPorDiagnostico, setCasosPorDiagnostico] = useState([]);

    // Casos por distrito (mapa dinámico)
    const [casosPorDistrito, setCasosPorDistrito] = useState<Record<string, number>>({});
  // Estado para diagnóstico seleccionado
  const [diagnosticoSeleccionado, setDiagnosticoSeleccionado] = useState(null);



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


const cargarCasosPorDiagnostico = async (diagnostico: string) => {
  if (!allDistricts) return;

  console.log(`============================`);
  console.log(`🔍 Diagnóstico seleccionado: ${diagnostico}`);
  console.log(`============================`);

  const resultados: Record<string, number> = {};

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
        continue;
      }

      const data = await res.json();

      console.log(
        `📁 Respuesta recibida para ${distrito}: ${JSON.stringify(data)}`
      );

      resultados[distrito.toUpperCase()] = data.total || 0;

    } catch (err) {
      console.error(`❌ Error de conexión en distrito ${distrito}`, err);
      resultados[distrito.toUpperCase()] = 0;
    }
  }

  console.log(`============================`);
  console.log(`📊 RESULTADO FINAL DEL DIAGNÓSTICO: ${diagnostico}`);
  console.log(`============================`);

  Object.entries(resultados).forEach(([dist, total]) => {
    console.log(`🏙  ${dist}: ${total} casos`);
  });

  console.log(`============================`);

  setCasosPorDistrito(resultados);
};


  const handleDiagnosticoSelect = async (diagnostico: string | null) => {
    setDiagnosticoSeleccionado(diagnostico);

    if (diagnostico) {
      await cargarCasosPorDiagnostico(diagnostico);  // ← 🔥 carga número de casos
    } else {
      setCasosPorDistrito({});                       // ← limpia mapa
    }
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
          id: `distrito-${feature.properties.CD_DIST}`,
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

const [enfermedades, setEnfermedades] = useState([]);

useEffect(() => {
  fetch("http://localhost:5000/api/enfermedades")
    .then(res => res.json())
    .then(data => {
      setEnfermedades(data.enfermedades || []);
      console.log("ENFERMEDADES CARGADAS:", data.enfermedades);
    });
}, []);



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
    else if (layerId.startsWith('distrito-')) {
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
        setSearchedDistrictId(`distrito-${foundDistrict.properties.CD_DIST}`);
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
        map.flyTo(position, zoomLevel);
    }
  };

  const districtsToDisplay = useMemo(() => {
    if (!allDistricts || !selectedLayers.has('distritos')) {
        return null;
    }
    return allDistricts;
  }, [allDistricts, selectedLayers]);

const getDistrictStyle = (feature) => {
  const distrito = feature.properties.NM_DIST?.toUpperCase();

  const baseStyle = {
    weight: 1,
    color: "#555",
    fillOpacity: 0.7,
    fillColor: "#D3D3D3",
  };

  if (!diagnosticoSeleccionado) return baseStyle;

  const casos = casosPorDistrito[distrito] ?? 0;

  if (casos === 0) {
    return {
      ...baseStyle,
      fillOpacity: 0.2,
      fillColor: "#E0E0E0",
    };
  }

  // Escala simple
  const escala = casos > 50 ? "#800026" :
                 casos > 20 ? "#BD0026" :
                 casos > 10 ? "#E31A1C" :
                 casos > 5  ? "#FC4E2A" :
                 casos > 1  ? "#FD8D3C" :
                              "#FEB24C";

  return {
    ...baseStyle,
    fillColor: escala,
    fillOpacity: 0.8,
  };
};

const onEachDistrict = (feature: Feature, layer: LeafletLayer) => {
  const districtName = feature.properties.NM_DIST;

  if (districtName) {
    layer.on('click', async () => {

      // 1. Obtener población
      const dataPoblacion = await obtenerPoblacion(districtName);

      // 2. Obtener casos totales reales del distrito
      const caseCount = await obtenerCasosTotales(districtName);

      // 3. Obtener casos por enfermedad (opcional)
      const enfermedad = "TOS FERINA";  
      const dataCasosEnfermedad = await obtenerCasosEnfermedad(districtName, enfermedad);

      // 4. Construir popup
      const popupContent = ReactDOMServer.renderToString(
        <DistrictPopup 
          districtName={districtName}
          caseCount={caseCount}
          poblacion={dataPoblacion}
          casosEnfermedad={dataCasosEnfermedad}
        />
      );

      layer.bindPopup(popupContent).openPopup();
    });
  }
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
              diagnosticoSeleccionado
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

                // 🔥 Necesarias para pintar mapa por diagnóstico
                onDiagnosticoSelect={handleDiagnosticoSelect}
                diagnosticoSeleccionado={diagnosticoSeleccionado}

                isSearchActive={isSearchActive}
              />
                ))}
              </ul>
            </>
          )}

        </div>

        {/* BUSCADOR EN MAPA */}
        <div ref={mapSearchBarRef} className="map-search-bar">
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
          />
          <button onClick={handleMapSearch}>🔍</button>
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

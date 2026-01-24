import React from 'react';
import './EstablecimientoPopup.css';

// Componente auxiliar pequeño para las filas de vida
const LifeStageRow: React.FC<{ icon: string, label: string, value: number | undefined }> = ({ icon, label, value }) => {
    const fmt = (num: number | undefined) => (num !== undefined ? num.toLocaleString('es-PE') : '0');
    
    return (
        <div className="life-stage-row">
            <div className="life-item">
                <span className="icon">{icon}</span>
                <span className="label">{label}</span>
                <span className="value">{fmt(value)}</span> 
            </div>
        </div>
    );
};

interface Poblacion {
  POBLACION_TOTAL: number;
  MASCULINO: number;
  FEMENINO: number;
  NIÑO: number;
  Adolescente: number;
  Joven: number;
  Adulto: number;
  Adulto_Mayor: number;
}

interface DiagnosticoDetalle {
  total: number;
  daa?: number;
  dis?: number;
  detalle?: {
    grupo_edad?: string;
    tipo_dx?: string;
    cantidad: number;
  }[];
  ira_no_neumonia?: number;
  sob_asma?: number;
  neumonia_grave?: number;
  neumonia?: number;
  TBC?: number;
  TIA_100k?: number;
}

interface EstablecimientoProps {
  establecimientoName: string;
  caseCount: number;
  poblacion?: Poblacion | null;
  diagnosticoSeleccionado: string[];
  detalleDiagnostico: Record<string, DiagnosticoDetalle>;
  propiedades: {
    jurisdiccion?: string;
    tipo?: string;
    direccion?: string;
    codigo?: string;
    categoria?: string;
    nivel_atencion?: string;
    [key: string]: any;
  };
  fuentesDiagnosticos?: Record<string, string>;
  fuentePoblacion?: string;
}

const EstablecimientoPopup: React.FC<EstablecimientoProps> = ({
  establecimientoName,
  caseCount,
  poblacion,
  diagnosticoSeleccionado = [],
  detalleDiagnostico = {},
  propiedades = {},
  fuentesDiagnosticos = {},
  fuentePoblacion = "Fuente: Estadística"
}) => {

  const fmt = (num: number | undefined) => (num !== undefined ? num.toLocaleString('es-PE') : '0');

  const obtenerFuente = (diagnosticoKey: string): string => {
    if (fuentesDiagnosticos[diagnosticoKey]) {
      return fuentesDiagnosticos[diagnosticoKey];
    }
    
    if (diagnosticoKey.toLowerCase().includes('diarre') || diagnosticoKey.toLowerCase().includes('edas')) {
      return "Fuente: Notiweb - EDAS";
    } else if (diagnosticoKey.toLowerCase().includes('feb')) {
      return "Fuente: Notiweb - Febriles";
    } else if (diagnosticoKey.toLowerCase().includes('ira')) {
      return "Fuente: Notiweb - IRAS";
    } else if (diagnosticoKey.toLowerCase().includes('tbc')) {
      return "Fuente: SIGTB";
    } else if (diagnosticoKey.toLowerCase().includes('depresion')) {
      return "Fuente: Vigilancia de Salud Mental";
    } else if (diagnosticoKey.toLowerCase().includes('violencia')) {
      return "Fuente: Notiweb - Violencia Familiar";
    } else if (diagnosticoKey.toLowerCase().includes('diabetes')) {
      return "Fuente: Notiweb - Diabetes";
    }
    
    return "Fuente: Notiweb";
  };

  const handleViewData = async () => {
    console.log("📌 [FRONT] Botón presionado para establecimiento:", establecimientoName);
    
    try {
        const payload = {
            establecimiento: establecimientoName,
            diagnosticos: diagnosticoSeleccionado
        };

        const response = await fetch("http://10.0.5.237:5001/exportar-datos-establecimiento", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const text = await response.text();
            console.error("❌ [FRONT] Backend respondió error:", text);
            alert("Error al exportar datos. Verifica que el endpoint exista en el backend.");
            return;
        }

        const contentType = response.headers.get("Content-Type") || "";
        if (!contentType.includes("application/vnd.openxmlformats-officedocument")) {
            const text = await response.text();
            console.error("❌ El backend devolvió HTML o un error:", text);
            alert("Error en el formato de respuesta del servidor");
            return;
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Datos_${establecimientoName.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
        a.click();
    } catch (error) {
        console.error("🔥 [FRONT] Error inesperado:", error);
        alert("Error al conectar con el servidor");
    }
  };

  return (
    <div className="establecimiento-popup-container">

      {/* HEADER */}
      <div className="establecimiento-popup-header">
        <span>DATOS DEL ESTABLECIMIENTO</span>
      </div>

      <div className="establecimiento-popup-content">

        {/* TÍTULO */}
        <h2 className="popup-title">{establecimientoName}</h2>
        <div className="popup-title-underline"></div>

        {/* INFORMACIÓN DEL ESTABLECIMIENTO */}
        <div className="info-section">
          <h3 className="section-title">Información del Establecimiento</h3>
          
          <div className="info-grid">
            {propiedades.jurisdiccion && (
              <div className="info-row">
                <span className="info-label">Jurisdicción:</span>
                <span className="info-value">{propiedades.jurisdiccion}</span>
              </div>
            )}
            
            {propiedades.categoria && (
              <div className="info-row">
                <span className="info-label">Categoría:</span>
                <span className="info-value">{propiedades.categoria}</span>
              </div>
            )}
            
            {propiedades.nivel_atencion && (
              <div className="info-row">
                <span className="info-label">Nivel de Atención:</span>
                <span className="info-value">{propiedades.nivel_atencion}</span>
              </div>
            )}
            
            {propiedades.tipo && (
              <div className="info-row">
                <span className="info-label">Tipo:</span>
                <span className="info-value">{propiedades.tipo}</span>
              </div>
            )}
            
            {propiedades.codigo && (
              <div className="info-row">
                <span className="info-label">Código:</span>
                <span className="info-value">{propiedades.codigo}</span>
              </div>
            )}
            
            {propiedades.direccion && (
              <div className="info-row">
                <span className="info-label">Dirección:</span>
                <span className="info-value">{propiedades.direccion}</span>
              </div>
            )}
            
            {/* Mostrar otras propiedades disponibles */}
            {Object.entries(propiedades).map(([key, value]) => {
              // Excluir propiedades ya mostradas
              const excludedKeys = ['jurisdiccion', 'categoria', 'nivel_atencion', 'tipo', 'codigo', 'direccion', 'layer', 'OBJECTID'];
              if (excludedKeys.includes(key) || !value || typeof value !== 'string') return null;
              
              return (
                <div key={key} className="info-row">
                  <span className="info-label">{key.replace(/_/g, ' ')}:</span>
                  <span className="info-value">{String(value)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* TARJETAS DE ESTADÍSTICAS */}
        <div className="stats-row">
          <div className="stat-box blue">
            <span className="stat-label">N° Casos Totales</span>
            <span className="stat-value">{fmt(caseCount)}</span>
            <div className="fuente-texto-small">
              Fuente: Notiweb
            </div>
          </div>

          {poblacion && (
            <div className="stat-box green">
              <span className="stat-label">Población Asignada</span>
              <span className="stat-value">{fmt(poblacion.POBLACION_TOTAL)}</span>
              <div className="fuente-texto-small">
                {fuentePoblacion}
              </div>
            </div>
          )}
        </div>

        {/* POBLACIÓN POR SEXO (si hay datos) */}
        {poblacion && (
          <div className="info-section">
            <h3 className="section-title">Población Asignada por Sexo</h3>
            <div className="sexo-grid">
              <div className="sexo-item">
                <span className="label">Masculino</span>
                <span className="value">{fmt(poblacion.MASCULINO)}</span>
              </div>
              <div className="sexo-item">
                <span className="label">Femenino</span>
                <span className="value">{fmt(poblacion.FEMENINO)}</span>
              </div>
            </div>
            <div className="fuente-texto">
              {fuentePoblacion}
            </div>
          </div>
        )}

        {/* POBLACIÓN POR CURSO DE VIDA (si hay datos) */}
        {poblacion && (
          <div className="info-section">
            <h3 className="section-title">Población por Curso de Vida</h3>
            <div className="life-stage-grid">
              <LifeStageRow icon="👦" label="Niños (0-11)" value={poblacion.NIÑO} />
              <LifeStageRow icon="👱" label="Adolescente (12-17)" value={poblacion.Adolescente} />
              <LifeStageRow icon="🧑" label="Joven (18-29)" value={poblacion.Joven} />
              <LifeStageRow icon="👨" label="Adulto (30-59)" value={poblacion.Adulto} />
              <LifeStageRow icon="👴" label="Adulto Mayor (60+)" value={poblacion.Adulto_Mayor} />
            </div>
            <div className="fuente-texto">
              {fuentePoblacion}
            </div>
          </div>
        )}

        {/* ==================== DETALLE DE DIAGNÓSTICOS ==================== */}
        {(diagnosticoSeleccionado?.length ?? 0) > 0 && (
          <div className="info-section">
            <h3 className="section-title">Casos por Diagnóstico</h3>

            {diagnosticoSeleccionado.map((diag) => {
              const data = detalleDiagnostico?.[diag] || { total: 0 };

              const isEDAS = diag === "diagnostico-edas";
              const isFEBRILES = diag.toLowerCase().includes("feb");
              const isIRAS = diag === "diagnostico-iras";
              const isTBCPulmonar = diag === "diagnostico-tbcpulmonar";
              const isTBC = diag.toLowerCase().includes("tbc") || diag.toLowerCase().includes("tia");

              const displayTitle = diag
                .replace("diagnostico-", "")
                .replace(/-/g, " ")
                .toUpperCase();

              return (
                <div key={diag} className="diag-item-container">
                  <div className="diag-header">
                    <span className="diag-name">{displayTitle}</span>
                    <span className="diag-total">{fmt(data.total)}</span>
                  </div>

                  {/* EDAS */}
                  {isEDAS && (
                    <div className="diag-details">
                      <div className="detail-row">
                        <span>DAA</span>
                        <strong>{fmt(data.daa)}</strong>
                      </div>
                      <div className="detail-row">
                        <span>DIS</span>
                        <strong>{fmt(data.dis)}</strong>
                      </div>
                    </div>
                  )}

                  {/* FEBRILES */}
                  {isFEBRILES && data.detalle && (
                    <div className="diag-details">
                      {data.detalle.map((d, i) => (
                        <div key={i} className="detail-row">
                          <span>{d.grupo_edad}</span>
                          <strong>{fmt(d.cantidad)}</strong>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* IRAS */}
                  {isIRAS && (
                    <div className="diag-details">
                      <div className="detail-row">
                        <span>IRA No Neumonía</span>
                        <strong>{fmt(data.ira_no_neumonia)}</strong>
                      </div>
                      <div className="detail-row">
                        <span>SOB/ASMA</span>
                        <strong>{fmt(data.sob_asma)}</strong>
                      </div>
                      <div className="detail-row">
                        <span>Neumonía Grave</span>
                        <strong>{fmt(data.neumonia_grave)}</strong>
                      </div>
                      <div className="detail-row">
                        <span>Neumonía</span>
                        <strong>{fmt(data.neumonia)}</strong>
                      </div>
                    </div>
                  )}

                  {/* TBC PULMONAR */}
                  {isTBCPulmonar && (
                    <div className="diag-details">
                      <div className="detail-row">
                        <span>Casos Confirmados</span>
                        <strong>{fmt(data.total)}</strong>
                      </div>
                    </div>
                  )}

                  {/* TBC / TIA */}
                  {isTBC && data.TIA_100k !== undefined && (
                    <div className="diag-details">
                      <div className="detail-row">
                        <span>TIA x 100,000 hab.</span>
                        <strong>{fmt(data.TIA_100k)}</strong>
                      </div>
                    </div>
                  )}

                  {/* OTROS DIAGNÓSTICOS */}
                  {!isEDAS && !isFEBRILES && !isIRAS && !isTBC && data.detalle && (
                    <div className="diag-details">
                      {data.detalle.map((d) => (
                        <div key={d.tipo_dx} className="detail-row">
                          <span>{d.tipo_dx}</span>
                          <strong>{fmt(d.cantidad)}</strong>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* FUENTE PARA CADA DIAGNÓSTICO */}
                  <div className="fuente-texto">
                    {obtenerFuente(diag)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* BOTÓN EXPORTAR */}
        <div className="data-button-container">
          <button
            className="view-data-button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleViewData();
            }}
          >
            Ver Datos <i className="fas fa-chart-bar"></i>
          </button>
        </div>

      </div>
    </div>
  );
};

export default EstablecimientoPopup;
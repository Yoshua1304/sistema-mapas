import React from 'react';
import './DistrictPopup.css';

// Componente auxiliar pequeño para las filas de vida (para no repetir código)
// Se redefinió como React.FC y acepta 'undefined' en el valor para consistencia.
const LifeStageRow: React.FC<{ icon: string, label: string, value: number | undefined }> = ({ icon, label, value }) => {
    // Helper para formatear números (ej: 1.000)
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

  // EDAS
  daa?: number;
  dis?: number;

  // FEBRILES
  detalle?: {
    grupo_edad?: string;
    tipo_dx?: string;
    cantidad: number;
  }[];

  // IRAS
  ira_no_neumonia?: number;
  sob_asma?: number;
  neumonia_grave?: number;
  neumonia?: number;
}



interface DistrictPopupProps {
  districtName: string;
  caseCount: number;
  poblacion?: Poblacion | null;
  diagnosticoSeleccionado: string[];
  detalleDiagnostico: Record<string, DiagnosticoDetalle>;
}

const DistrictPopup: React.FC<DistrictPopupProps> = ({
  districtName,
  caseCount,
  poblacion,
  diagnosticoSeleccionado = [],
  detalleDiagnostico = {}
}) => {

  // Helper para formatear números (ej: 1.000)
  const fmt = (num: number | undefined) => (num !== undefined ? num.toLocaleString('es-PE') : '0');

  return (
    <div className="district-popup-container">
      
      {/* HEADER ROJO */}
      <div className="district-popup-header">
        <span>DATOS DEL DISTRITO</span>
      </div>

      <div className="district-popup-content">

        {/* TÍTULO DISTRITO */}
        <h2 className="popup-title">{districtName}</h2>
        <div className="popup-title-underline"></div>

        {/* TARJETAS SUPERIORES (Casos y Población) */}
        <div className="stats-row">
          <div className="stat-box blue">
            <span className="stat-label">N° Casos Totales</span>
            <span className="stat-value">{fmt(caseCount)}</span>
          </div>

          {poblacion && (
            <div className="stat-box green">
              <span className="stat-label">Población Total</span>
              <span className="stat-value">{fmt(poblacion.POBLACION_TOTAL)}</span>
            </div>
          )}
        </div>

        {/* SECCIÓN: POBLACIÓN POR SEXO */}
        {poblacion && (
          <div className="info-section">
            <h3 className="section-title">Población por Sexo</h3>
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
          </div>
        )}

        {/* SECCIÓN: POBLACIÓN POR CURSO DE VIDA */}
        {poblacion && (
          <div className="info-section">
            <h3 className="section-title">Población por Curso de Vida</h3>

            <div className="life-stage-grid">
              {/* Se pasó la función fmt al componente LifeStageRow */}
              <LifeStageRow icon="👦" label="Niños (0-11)" value={poblacion.NIÑO} />
              <LifeStageRow icon="👱" label="Adolescente (12-17)" value={poblacion.Adolescente} />
              <LifeStageRow icon="🧑" label="Joven (18-29)" value={poblacion.Joven} />
              <LifeStageRow icon="👨" label="Adulto (30-59)" value={poblacion.Adulto} />
              <LifeStageRow icon="👴" label="Adulto Mayor (60+)" value={poblacion.Adulto_Mayor} />
            </div>
          </div>
        )}

        {/* ⭐⭐⭐ DETALLE MÚLTIPLES DIAGNÓSTICOS ⭐⭐⭐ */}
        {(diagnosticoSeleccionado?.length ?? 0) > 0 && (
          <div className="info-section">
            <h3 className="section-title">Detalle de Diagnósticos</h3>

            {diagnosticoSeleccionado.map((diag) => {
              
              const data = detalleDiagnostico?.[diag] || { total: 0 };

              const isEDAS =
                diag === "diagnostico-edas" ||
                diag === "EDAS" ||
                diag === "Enfermedades diarreicas agudas";

              const isFEBRILES =
                diag.toLowerCase().includes("feb") ||
                diag.toLowerCase().includes("fiebre");

              const isIRAS =
                diag === "diagnostico-iras" ||
                diag.toLowerCase().includes("ira") ||
                diag.toLowerCase().includes("respiratoria");


              // ⭐ CORRECCIÓN TS7006: Se tipó el parámetro 'code' como string y se tipó el objeto labels.
              const labelFebriles = (code: string) => {
                const labels: Record<string, string> = {
                  "feb_m1": "Menor de 1 año",
                  "feb_1_4": "1 a 4 años",
                  "feb_5_9": "5 a 9 años",
                  "feb_10_19": "10 a 19 años",
                  "feb_20_59": "20 a 59 años",
                  "feb_m60": "60 años a más",
                };
                return labels[code] || code;
              };

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

                  {/* 🔥 EDAS: DAA + DIS */}
                  {isEDAS && (
                    <div className="diag-details">
                      <div className="detail-row">
                        <span>DAA (Diarrea Aguda)</span>
                        <strong>{fmt(data.daa)}</strong>
                      </div>
                      <div className="detail-row">
                        <span>DIS (Disentería)</span>
                        <strong>{fmt(data.dis)}</strong>
                      </div>
                    </div>
                  )}

                  {/* 🔥 FEBRILES: grupos de edad */}
                  {isFEBRILES && data.detalle && (
                    <div className="diag-details">
                      {data.detalle.map((item, index) => (
                        <div key={index} className="detail-row">
                          {/* Se asume que item.grupo_edad es un string */}
                          <span>{labelFebriles(item.grupo_edad as string)}</span> 
                          <strong>{fmt(item.cantidad)}</strong>
                        </div>
                      ))}
                    </div>
                  )}

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

                  {/* 🟢 OTROS DIAGNÓSTICOS (tipo_dx) */}
                  {!isEDAS && !isFEBRILES &&!isIRAS && data.detalle && data.detalle.length > 0 && (
                    <div className="diag-details">
                      {data.detalle.map((d) => (
                        <div key={d.tipo_dx} className="detail-row">
                          <span>{d.tipo_dx}</span>
                          <strong>{fmt(d.cantidad)}</strong>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};

export default DistrictPopup;
import React from 'react';
import './DistrictPopup.css';

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
  detalle?: { tipo_dx: string; cantidad: number }[];
  daa?: number;  // ⭐ para EDAS
  dis?: number;  // ⭐ para EDAS
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
              <LifeStageRow icon="👦" label="Niños (0-11)" value={poblacion.NIÑO} />
              <LifeStageRow icon="👱" label="Adolescente (12-17)" value={poblacion.Adolescente} />
              <LifeStageRow icon="🧑" label="Joven (18-29)" value={poblacion.Joven} />
              <LifeStageRow icon="👨" label="Adulto (30-59)" value={poblacion.Adulto} />
              <LifeStageRow icon="👴" label="Adulto Mayor (60+)" value={poblacion.Adulto_Mayor} />
            </div>
          </div>
        )}

        {/* ⭐⭐⭐ MÚLTIPLES DIAGNÓSTICOS ⭐⭐⭐ */}
        {(diagnosticoSeleccionado?.length ?? 0) > 0 && (
          <div className="info-section">
            <h3 className="section-title">Detalle de Diagnósticos</h3>
            
            {diagnosticoSeleccionado.map((diag) => {
              const data = detalleDiagnostico?.[diag] || { total: 0 };
              
              const isEDAS =
                diag === "diagnostico-edas" ||
                diag === "EDAS" ||
                diag === "Enfermedades diarreicas agudas";

              // Limpiar nombre para visualización
              const displayTitle = diag.replace('diagnostico-', '').replace(/-/g, ' ').toUpperCase();

              return (
                <div key={diag} className="diag-item-container">
                  <div className="diag-header">
                    <span className="diag-name">{displayTitle}</span>
                    <span className="diag-total">{fmt(data.total)}</span>
                  </div>

                  {/* 🔥 Mostrar DAA + DIS SOLO para EDAS */}
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

                  {/* Para enfermedades normales: detalle de tipo_dx */}
                  {!isEDAS && data.detalle && data.detalle.length > 0 && (
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

// Componente auxiliar pequeño para las filas de vida (para no repetir código)
const LifeStageRow = ({ icon, label, value }: { icon: string, label: string, value: number }) => (
  <div className="life-stage-row">
    <div className="life-item">
      <span className="icon">{icon}</span>
      <span className="label">{label}</span>
      <span className="value">{value.toLocaleString('es-PE')}</span>
    </div>
  </div>
);

export default DistrictPopup;
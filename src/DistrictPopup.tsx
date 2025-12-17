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

  // TBC
  TBC?: number;

  // ⭐ AGREGAR ESTO:
  TIA_100k?: number;
}

interface DistrictPopupProps {
  districtName: string;
  caseCount: number;
  poblacion?: Poblacion | null;
  diagnosticoSeleccionado: string[];
  detalleDiagnostico: Record<string, DiagnosticoDetalle>;
  // ⭐ Puedes añadir una prop opcional para manejar el clic del botón, por ejemplo:
  // onDataViewClick?: (districtName: string) => void; 
}

const DistrictPopup: React.FC<DistrictPopupProps> = ({
  districtName,
  caseCount,
  poblacion,
  diagnosticoSeleccionado = [],
  detalleDiagnostico = {}
  // onDataViewClick
}) => {

  // Helper para formatear números (ej: 1.000)
  const fmt = (num: number | undefined) => (num !== undefined ? num.toLocaleString('es-PE') : '0');

  // ⭐ Función de ejemplo para el botón (puedes reemplazarla o eliminarla)
  // ⭐⭐⭐ FUNCIÓN CORRECTA PARA EXPORTAR EXCEL ⭐⭐⭐
// ⭐⭐⭐ FUNCIÓN CORRECTA PARA EXPORTAR EXCEL DINÁMICO ⭐⭐⭐
const handleViewData = async () => {
    console.log("📌 [FRONT] Botón presionado para distrito:", districtName);
    console.log("📦 Diagnósticos seleccionados:", diagnosticoSeleccionado);

    try {
        const payload = {
            distrito: districtName,
            diagnosticos: diagnosticoSeleccionado // ej: ["DENGUE GRAVE","TBC PULMONAR"]
        };

        console.log("📡 [FRONT] Enviando solicitud al backend...");

        const response = await fetch("http://10.0.5.181:5000/exportar-datos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        console.log("📥 [FRONT] Respuesta recibida:", response);

        if (!response.ok) {
            const text = await response.text();
            console.error("❌ [FRONT] Backend respondió error:", text);
            return;
        }

        const contentType = response.headers.get("Content-Type") || "";
        if (!contentType.includes("application/vnd.openxmlformats-officedocument")) {
            const text = await response.text();
            console.error("❌ El backend devolvió HTML o un error:", text);
            return;
        }

        // Recibir blob
        const blob = await response.blob();
        console.log("📄 [FRONT] Archivo recibido (blob):", blob);

        // Descargar archivo
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Datos_${districtName}.xlsx`;
        a.click();

        console.log(`✅ Archivo descargado correctamente: Datos_${districtName}.xlsx`);
    } catch (error) {
        console.error("🔥 [FRONT] Error inesperado:", error);
    }
};



  // Dentro de DistrictPopup.tsx, justo antes del return:

console.log("DEBUG POPUP →", {
  distrito: districtName,
  TIAx100: detalleDiagnostico["TBC TIA"]?.TIA_100k || detalleDiagnostico["TBC TIA"]?.TIA_100k || "SIN TIA",
  casos: detalleDiagnostico["TBC TIA"]?.total ?? "0"
});

console.log("💥 detalleDiagnostico COMPLETO:", detalleDiagnostico);
console.log("🔑 Claves disponibles:", Object.keys(detalleDiagnostico));


console.log("Valor recibido de districtName:", districtName);
console.log("🟦 DEBUG: districtName recibido por DistrictPopup:", districtName);

return (
  <div className="district-popup-container">

    {/* HEADER */}
    <div className="district-popup-header">
      <span>DATOS DEL DISTRITO</span>
    </div>

    <div className="district-popup-content">

      {/* TÍTULO */}
      <h2 className="popup-title">{districtName}</h2>
      <div className="popup-title-underline"></div>

      {/* TARJETAS SUPERIORES */}
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

      {/* POBLACIÓN POR SEXO */}
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

      {/* POBLACIÓN POR CURSO DE VIDA */}
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

      {/* ==================== DETALLE DE DIAGNÓSTICOS ==================== */}
      {(diagnosticoSeleccionado?.length ?? 0) > 0 && (
        <div className="info-section">
          <h3 className="section-title">Detalle de Diagnósticos</h3>

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

                {/* 🟣 OTROS (AQUÍ ENTRA DEPRESIÓN) */}
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

export default DistrictPopup;
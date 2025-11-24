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
  detalle: { tipo_dx: string; cantidad: number }[];
}

interface DistrictPopupProps {
  districtName: string;
  caseCount: number;
  poblacion?: Poblacion | null;

  // ⭐ Nuevos props correctos
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

  return (
    <div className="district-popup-container">
      <div className="district-popup-header">
        <span>DATOS</span>
      </div>

      <div className="district-popup-content">
        <h4>Distrito: {districtName}</h4>

        {/* CASOS Y POBLACIÓN */}
        <table className="district-popup-table">
          <thead>
            <tr>
              <th>N° Casos Totales</th>
              {poblacion && <th>Población Total</th>}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{caseCount}</td>
              {poblacion && (
                <td>{poblacion.POBLACION_TOTAL.toLocaleString()}</td>
              )}
            </tr>
          </tbody>
        </table>

        {/* SEXO */}
        {poblacion && (
          <>
            <h5>Población por Sexo</h5>
            <table className="district-popup-table">
              <tbody>
                <tr>
                  <td>Masculino</td>
                  <td>{poblacion.MASCULINO.toLocaleString()}</td>
                </tr>
                <tr>
                  <td>Femenino</td>
                  <td>{poblacion.FEMENINO.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            {/* CURSO DE VIDA */}
            <h5>Población por Curso de Vida</h5>
            <table className="district-popup-table">
              <tbody>
                <tr>
                  <td>Niño</td>
                  <td>{poblacion.NIÑO.toLocaleString()}</td>
                </tr>
                <tr>
                  <td>Adolescente</td>
                  <td>{poblacion.Adolescente.toLocaleString()}</td>
                </tr>
                <tr>
                  <td>Joven</td>
                  <td>{poblacion.Joven.toLocaleString()}</td>
                </tr>
                <tr>
                  <td>Adulto</td>
                  <td>{poblacion.Adulto.toLocaleString()}</td>
                </tr>
                <tr>
                  <td>Adulto Mayor</td>
                  <td>{poblacion.Adulto_Mayor.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </>
        )}

        {/* ⭐⭐⭐ MÚLTIPLES DIAGNÓSTICOS ⭐⭐⭐ */}
        {(diagnosticoSeleccionado?.length ?? 0) > 0 && (
          <>
            <h4>Diagnósticos Seleccionados</h4>

            {diagnosticoSeleccionado.map((diag) => (
              <div key={diag} className="diag-section">
                <h5>{diag}</h5>

                <table className="district-popup-table">
                  <tbody>
                    <tr>
                      <td>Total</td>
                      <td>{detalleDiagnostico?.[diag]?.total || 0}</td>
                    </tr>

                    {detalleDiagnostico?.[diag]?.detalle?.map((d) => (
                      <tr key={d.tipo_dx}>
                        <td>{d.tipo_dx}</td>
                        <td>{d.cantidad}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default DistrictPopup;

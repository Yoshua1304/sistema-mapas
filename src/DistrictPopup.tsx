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

interface DistrictPopupProps {
  districtName: string;
  caseCount: number; // TOTAL CASOS DEL DISTRITO
  poblacion?: Poblacion | null;
}

const DistrictPopup: React.FC<DistrictPopupProps> = ({
  districtName,
  caseCount,
  poblacion
}) => {
  return (
    <div className="district-popup-container">
      <div className="district-popup-header">
        <span>DATOS</span>
      </div>

      <div className="district-popup-content">
        
        {/* ENCABEZADO */}
        <h4>Distrito: {districtName}</h4>

        {/* CASOS + POBLACIÓN TOTAL */}
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

        {/* POBLACIÓN POR SEXO */}
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

      </div>
    </div>
  );
};

export default DistrictPopup;

import React from 'react';
import './Legend.css'; // Crearemos este archivo CSS

interface LegendItem {
    id: string;
    name: string;
    color: string; // Color para el símbolo en la leyenda
    type: 'layer' | 'district'; // Para diferenciar el icono
}

interface LegendProps {
    selectedLayerNames: string[]; // Nombres de capas (ej. "Fasciolosis humana")
    selectedDistrictNames: string[]; // Nombres de distritos (ej. "BREÑA")
    // Opcional: Si quieres mostrar los colores de la escala de casos, necesitarías pasarlos aquí
    // Por ahora, solo mostraremos los nombres.
}

const Legend: React.FC<LegendProps> = ({ selectedLayerNames, selectedDistrictNames }) => {
    const legendItems: LegendItem[] = [];

    // Añadir capas de enfermedades/diagnósticos
    selectedLayerNames.forEach(name => {
        // Aquí podrías definir un color específico para cada tipo de capa
        // Por simplicidad, usaremos un color general o un icono
        legendItems.push({ 
            id: name, 
            name: name, 
            color: '#1a96c1', // Color azul para capas de enfermedades (ej. el + de tu imagen)
            type: 'layer' 
        });
    });

    // Añadir distritos seleccionados (solo si hay al menos uno)
    if (selectedDistrictNames.length > 0) {
        selectedDistrictNames.forEach(name => {
            legendItems.push({
                id: name,
                name: name,
                color: '#f3b14fff', // Color naranja del resaltado del distrito
                type: 'district'
            });
        });
    }

    if (legendItems.length === 0) {
        return null; // No mostrar la leyenda si no hay elementos seleccionados
    }

    return (
        <div className="legend-container">
            <h4 className="legend-title">FILTROS</h4>
            <ul className="legend-list">
                {legendItems.map(item => (
                    <li key={item.id} className="legend-item">
                        {item.type === 'layer' ? (
                            <span className="legend-icon" style={{ backgroundColor: item.color }}>
                                +
                            </span>
                        ) : (
                            <span className="legend-icon district-icon">📍</span>
                        )}
                        <span className="legend-name">{item.name}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default Legend;
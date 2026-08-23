'use client';
import React from 'react';
import { MapContainer, TileLayer, Rectangle, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface CellData {
  id: string;
  bounds: [[number, number], [number, number]];
  speciesCount: number;
  selected: boolean;
  species?: string[];
}

interface MapViewProps {
  cells?: CellData[];
  selectedCellIds?: string[];
}

export default function MapView({ cells = [], selectedCellIds = [] }: MapViewProps) {
  const selectedSet = new Set(selectedCellIds);

  return (
    <div style={{ height: '100%', width: '100%', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
      <MapContainer center={[14.5, 76.0]} zoom={7} style={{ height: '100%', width: '100%' }} zoomControl={true}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> | CartoDB'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {cells.map((cell) => {
          const isSelected = selectedSet.size > 0 ? selectedSet.has(cell.id) : cell.selected;
          return (
            <Rectangle
              key={cell.id}
              bounds={cell.bounds}
              pathOptions={{
                color: isSelected ? '#2dd48c' : 'rgba(20, 112, 90, 0.5)',
                weight: isSelected ? 2 : 1,
                fillColor: isSelected ? '#2dd48c' : '#14705a',
                fillOpacity: isSelected ? 0.55 : Math.min(0.05 + (cell.speciesCount / 60) * 0.3, 0.35),
              }}
            >
              <Popup>
                <div style={{ color: '#333', minWidth: '140px' }}>
                  <strong style={{ fontSize: '0.9rem' }}>{cell.id}</strong><br />
                  Species: {cell.speciesCount}<br />
                  {isSelected && <span style={{ color: '#1a9d6e', fontWeight: 600 }}>✓ Selected Reserve</span>}
                  {cell.species && cell.species.length > 0 && (
                    <div style={{ marginTop: '4px', fontSize: '0.75rem', maxHeight: '80px', overflowY: 'auto' }}>
                      {cell.species.slice(0, 5).map(s => <div key={s} style={{ fontStyle: 'italic' }}>{s}</div>)}
                      {cell.species.length > 5 && <div>...and {cell.species.length - 5} more</div>}
                    </div>
                  )}
                </div>
              </Popup>
            </Rectangle>
          );
        })}
      </MapContainer>
    </div>
  );
}

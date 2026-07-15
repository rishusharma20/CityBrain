import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { api } from "../services/api";

// Fix Leaflet's default icon path issues in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

export default function MapView() {
  const [mapData, setMapData] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMap = async () => {
      try {
        const [densityRes, hotspotsRes] = await Promise.all([
          api.getComplaintDensity(),
          api.getHotspots()
        ]);
        if (densityRes.data.success) {
          // Fallback coordinate mappings if lat/lng are missing
          const mapped = densityRes.data.data.map((item) => {
            const lat = item.lat || 12.9716 + (Math.random() - 0.5) * 0.05;
            const lng = item.lng || 77.5946 + (Math.random() - 0.5) * 0.05;
            return { ...item, lat, lng };
          });
          setMapData(mapped);
        }
        if (hotspotsRes.data.success) {
          setHotspots(hotspotsRes.data.data);
        }
      } catch (err) {
        console.error("Failed to load map data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMap();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  // Calculate dynamic center coordinate
  const mapCenter = mapData.length > 0 ? [mapData[0].lat, mapData[0].lng] : [12.9716, 77.5946];

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800">Issue Heatmap & Map View</h2>
          <p className="text-sm text-slate-500 mt-1">Visualize ward-level ticket density and density circles on the live map.</p>
        </div>

        {hotspots.length > 0 && (
          <div className="flex items-center space-x-2 bg-red-50 border border-red-100 p-2.5 rounded-xl text-xs font-semibold text-red-700">
            <span>Critical Hotspots:</span>
            <div className="flex space-x-1">
              {hotspots.map((h, idx) => (
                <span key={idx} className="bg-red-200/50 px-2 py-0.5 rounded">
                  {h.ward} ({h.unresolvedCount})
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm relative z-0 min-h-[500px] overflow-hidden">
        <MapContainer center={mapCenter} zoom={12} style={{ height: "100%", width: "100%", borderRadius: "1rem" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {mapData.map((w, idx) => {
            const radius = w.weight * 120; // scale circle size
            return (
              <div key={idx}>
                {/* Density Circle */}
                <Circle
                  center={[w.lat, w.lng]}
                  radius={Math.max(radius, 150)}
                  pathOptions={{
                    color: w.weight > 10 ? "red" : w.weight > 5 ? "orange" : "green",
                    fillColor: w.weight > 10 ? "red" : w.weight > 5 ? "orange" : "green",
                    fillOpacity: 0.35,
                    weight: 0
                  }}
                />
                
                <Marker position={[w.lat, w.lng]}>
                  <Popup>
                    <div className="p-1 space-y-1">
                      <h3 className="font-bold text-sm text-slate-800">{w.ward}</h3>
                      <p className="text-xs text-slate-600">Active reported cases: <span className="font-bold text-blue-600">{w.weight}</span></p>
                    </div>
                  </Popup>
                </Marker>
              </div>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const NORWAY_CENTER = [64.5, 11.5];

// 🐄 storfe ikon
const cowIcon = L.divIcon({
  html: `<div style="background:#bbf7d0;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;">🐄</div>`,
  iconSize: [30, 30],
});

// 🏭 TINE ikon (annen farge)
const plantIcon = L.divIcon({
  html: `<div style="background:#93c5fd;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;">🏭</div>`,
  iconSize: [32, 32],
});

// ✅ HARDKODET TINE ANLEGG (kan utvides senere)

const tinePlants = [
  { name: "TINE Alta", lat: 69.97, lon: 23.29 },
  { name: "TINE Bergen", lat: 60.39, lon: 5.32 },
  { name: "TINE Brumunddal", lat: 60.88, lon: 10.94 },
  { name: "TINE Byrkjelo", lat: 61.89, lon: 6.51 },
  { name: "TINE Dovre", lat: 61.99, lon: 9.26 },
  { name: "TINE Elnesvågen", lat: 62.86, lon: 7.15 },
  { name: "TINE Frya", lat: 61.56, lon: 9.75 },
  { name: "TINE Haukeli", lat: 59.76, lon: 7.46 },
  { name: "TINE Jæren", lat: 58.78, lon: 5.73 },
  { name: "TINE Kristiansand", lat: 58.16, lon: 8.00 },
  { name: "TINE Lom & Skjåk", lat: 61.84, lon: 8.57 },
  { name: "TINE Oslo", lat: 59.94, lon: 10.86 },
  { name: "TINE Sandnessjøen", lat: 66.02, lon: 12.62 },
  { name: "TINE Selbu", lat: 63.22, lon: 11.04 },
  { name: "TINE Setesdal", lat: 58.72, lon: 7.30 },
  { name: "TINE Sømna", lat: 65.32, lon: 12.17 },
  { name: "TINE Storsteinnes", lat: 69.24, lon: 19.23 },
  { name: "TINE Tana", lat: 70.19, lon: 28.18 },
  { name: "TINE Tresfjord", lat: 62.59, lon: 7.25 },
  { name: "TINE Tunga (Trondheim)", lat: 63.43, lon: 10.47 },
  { name: "TINE Verdal", lat: 63.79, lon: 11.47 },
  { name: "TINE Vik i Sogn", lat: 61.09, lon: 6.57 },
  { name: "TINE Ørsta", lat: 62.20, lon: 6.13 },
  { name: "TINE Ålesund", lat: 62.47, lon: 6.15 }
];


export default function NorgeKart() {
  const [items, setItems] = useState([]);

  useEffect(() => {
  const CACHE_KEY = "storfeData_v1";
  const cached = localStorage.getItem(CACHE_KEY);

  if (cached) {
    try {
      const parsed = JSON.parse(cached);

      // ✅ valider cache (viktig!)
      if (Array.isArray(parsed) && parsed.length > 0) {
        setItems(parsed);
        return;
      }
    } catch (e) {
      console.log("Cache error, reloading data");
    }
  }

  // ✅ fallback: last CSV
  fetch("/storfe.csv", { cache: "force-cache" })
    .then((r) => r.text())
    .then((text) => {
      const lines = text.split(/\r?\n/).filter(Boolean);
      const rows = lines.slice(1);

      const data = rows
        .map((line) => {
          const parts = line.split(";");

          const id = parts[0];
          const name = parts[1];
          const address = parts[2];
          const lat = parseFloat(parts[3]);
          const lon = parseFloat(parts[4]);

          if (!lat || !lon) return null;

          return { id, name, address, lat, lon };
        })
        .filter(Boolean);

      setItems(data);

      // ✅ lagre kun hvis vi faktisk har data
      if (data.length > 0) {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      }
    });
}, []);
  
  return (
    <MapContainer center={NORWAY_CENTER} zoom={4} style={{ height: "100vh" }}>
      <TileLayer
        attribution="© OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* 🐄 GÅRDER */}
      {items.map((it) => (
        <Marker key={it.id} position={[it.lat, it.lon]} icon={cowIcon}>
          <Popup>
            <b>{it.name}</b>
            <br />
            {it.address}
          </Popup>
        </Marker>
      ))}

      {/* 🏭 TINE ANLEGG */}
      {tinePlants.map((plant, i) => (
        <Marker key={"plant-" + i} position={[plant.lat, plant.lon]} icon={plantIcon}>
          <Popup>
            <b>{plant.name}</b>
            <br />
            TINE anlegg
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

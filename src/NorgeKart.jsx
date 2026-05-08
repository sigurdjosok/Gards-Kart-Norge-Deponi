import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const NORWAY_CENTER = [64.5, 11.5];

function icon() {
  return L.divIcon({
    html: `<div style="background:#bbf7d0;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;">🐄</div>`,
    iconSize: [30, 30],
  });
}

export default function NorgeKart() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetch("/storfe.csv")
      .then((r) => r.text())
      .then(async (text) => {
        const rows = text.split("\n").slice(1);

        const data = await Promise.all(
          rows.map(async (r) => {
           const parts = r.split(";");
              const name = parts[1];
              const address = parts[2];
            if (!name || !address) return null;

            const res = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
            );
            const geo = await res.json();

            if (!geo.length) return null;

            return {
              name,
              address,
              lat: parseFloat(geo[0].lat),
              lon: parseFloat(geo[0].lon),
            };
          })
        );

        setItems(data.filter(Boolean));
      });
  }, []);

  return (
    <MapContainer center={NORWAY_CENTER} zoom={4} style={{ height: "100vh" }}>
      <TileLayer
        attribution="© OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {items.map((it, i) => (
        <Marker key={i} position={[it.lat, it.lon]} icon={icon()}>
          <Popup>
            <b>{it.name}</b>
            <br />
            {it.address}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

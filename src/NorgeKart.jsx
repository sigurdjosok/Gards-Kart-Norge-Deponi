import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const NORWAY_CENTER = [64.5, 11.5];

const cowIcon = L.divIcon({
  html: `<div style="background:#bbf7d0;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;">🐄</div>`,
  iconSize: [30, 30],
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default function NorgeKart() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const run = async () => {
      const text = await fetch("/storfe.csv").then((r) => r.text());

      const lines = text.split(/\r?\n/).filter(Boolean);
      const rows = lines.slice(1); // hopper over header

      const out = [];

      // DEBUG, start med en begrensning så vi ser punkter raskt
      const MAX = 150;

      for (let idx = 0; idx < rows.length && out.length < MAX; idx++) {
        const line = rows[idx];

        // CSV er id;name;address og address kan inneholde komma
        const parts = line.split(";");
        const id = (parts[0] || "").trim();
        const name = (parts[1] || "").trim();
        const address = (parts.slice(2).join(";") || "").trim();

        if (!name || !address) continue;

        try {
          const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
            address
          )}`;

          const res = await fetch(url);
          if (!res.ok) {
            // typisk 429, 403, 502 når du blir begrenset
            continue;
          }

          const geo = await res.json();
          if (!geo || !geo.length) continue;

          out.push({
            id,
            name,
            address,
            lat: parseFloat(geo[0].lat),
            lon: parseFloat(geo[0].lon),
          });

          // oppdater litt underveis så du ser punkter dukke opp
          if (out.length % 10 === 0) setItems([...out]);

          // viktig, pause mellom kall
          await sleep(1100);
        } catch (e) {
          // ignorer enkeltfeil, ellers blir alt tomt
          continue;
        }
      }

      setItems(out);
    };

    run();
  }, []);

  return (
    <MapContainer center={NORWAY_CENTER} zoom={4} style={{ height: "100vh" }}>
      <TileLayer
        attribution="© OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {items.map((it, i) => (
        <Marker key={it.id || i} position={[it.lat, it.lon]} icon={cowIcon}>
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

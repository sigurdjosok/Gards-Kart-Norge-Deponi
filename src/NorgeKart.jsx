import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const NORWAY_CENTER = [64.5, 11.5];

const cowIcon = L.divIcon({
  html: `<div style="background:#bbf7d0;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;">🐄</div>`,
  iconSize: [30, 30],
});

const plantIcon = L.divIcon({
  html: `<div style="background:#93c5fd;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;">🏭</div>`,
  iconSize: [32, 32],
});

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
  { name: "TINE Ålesund", lat: 62.47, lon: 6.15 },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default function NorgeKart() {
  const [items, setItems] = useState([]);

  const GEO_CACHE_KEY = "storfe_geoCache_v1";

  const geoCache = useMemo(() => {
    try {
      const raw = localStorage.getItem(GEO_CACHE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const saveCache = (obj) => {
      try {
        localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(obj));
      } catch {
        // localStorage kan bli full, da må vi leve uten cache
      }
    };

    const run = async () => {
      const text = await fetch("/storfe.csv", { cache: "no-store" }).then((r) => r.text());

      const lines = text.split(/\r?\n/).filter(Boolean);
      const rows = lines.slice(1);

      // Start med rådata uten coords
      const base = rows
        .map((line) => {
          const parts = line.split(";");
          const id = (parts[0] || "").trim();
          const name = (parts[1] || "").trim();
          const address = (parts.slice(2).join(";") || "").trim();

          if (!id || !name || !address) return null;

          const cached = geoCache[address];
          if (cached && cached.found && Number.isFinite(cached.lat) && Number.isFinite(cached.lon)) {
            return { id, name, address, lat: cached.lat, lon: cached.lon, fromCache: true };
          }

          return { id, name, address, lat: null, lon: null, fromCache: false };
        })
        .filter(Boolean);

      if (cancelled) return;

      setItems(base);

      // Nå, geokod kun de som mangler coords
      const cacheObj = { ...geoCache };

      for (let i = 0; i < base.length; i++) {
        if (cancelled) return;

        const it = base[i];
        if (it.lat != null && it.lon != null) continue;

        // Hvis vi allerede har forsøkt og fått found:false, hopp
        const cached = cacheObj[it.address];
        if (cached && cached.found === false) continue;

        try {
          const resp = await fetch(`/api/geocode?address=${encodeURIComponent(it.address)}`, {
            cache: "no-store",
          });

          if (!resp.ok) {
            // Backoff litt hvis upstream blir cranky
            await sleep(1500);
            continue;
          }

          const geo = await resp.json();

          if (geo && geo.ok && geo.found && Number.isFinite(geo.lat) && Number.isFinite(geo.lon)) {
            it.lat = geo.lat;
            it.lon = geo.lon;

            cacheObj[it.address] = { found: true, lat: geo.lat, lon: geo.lon };

            // Oppdater UI litt underveis
            if (i % 20 === 0) setItems([...base]);

            // Lagre cache gradvis
            if (i % 50 === 0) saveCache(cacheObj);
          } else {
            cacheObj[it.address] = { found: false };
            if (i % 50 === 0) saveCache(cacheObj);
          }

          // Viktig, hold deg nede på request rate [1](https://operations.osmfoundation.org/policies/nominatim/)
          await sleep(1100);
        } catch {
          await sleep(1500);
        }
      }

      if (cancelled) return;

      // Siste flush
      saveCache(cacheObj);
      setItems([...base]);
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [geoCache]);

  return (
    <MapContainer center={NORWAY_CENTER} zoom={4} style={{ height: "100vh" }}>
      <TileLayer attribution="© OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      {/* 🐄 GÅRDER, vis kun de som har coords */}
      {items
        .filter((it) => it.lat != null && it.lon != null)
        .map((it) => (
          <Marker key={it.id} position={[it.lat, it.lon]} icon={cowIcon}>
            <Popup>
              <b>{it.name}</b>
              <br />
              {it.address}
              <br />
              {it.fromCache ? "cached" : "new"}
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

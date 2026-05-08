export default async function handler(req, res) {
  try {
    const addressRaw = (req.query.address || "").toString().trim();

    if (!addressRaw || addressRaw.length < 5) {
      res.status(400).json({ ok: false, error: "Missing address" });
      return;
    }

    // Litt hygiene
    const address = addressRaw.slice(0, 200);

    // Nominatim policy, identifiser applikasjonen din
    const ua =
      process.env.NOMINATIM_USER_AGENT ||
      "TINE-StorfeKart/1.0 (contact: internal)";

    const url =
      "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=no&q=" +
      encodeURIComponent(address);

    const upstream = await fetch(url, {
      headers: {
        "User-Agent": ua,
        "Accept": "application/json",
      },
    });

    if (!upstream.ok) {
      // Viktig, returner status så frontend kan backoff
      res.status(upstream.status).json({ ok: false, error: "Upstream error" });
      return;
    }

    const data = await upstream.json();
    const first = Array.isArray(data) && data.length ? data[0] : null;

    if (!first) {
      // Cache negative result også, så du ikke hammer samme dårlige adresse
      res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=604800");
      res.status(200).json({ ok: true, found: false });
      return;
    }

    const lat = parseFloat(first.lat);
    const lon = parseFloat(first.lon);

    res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=604800");
    res.status(200).json({
      ok: true,
      found: Number.isFinite(lat) && Number.isFinite(lon),
      lat,
      lon,
      displayName: first.display_name || "",
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: "Server error" });
  }
}

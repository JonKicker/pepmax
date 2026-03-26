/**
 * beaconTrackingPage — Cloud Function (onRequest v2).
 *
 * Serves the public safety beacon tracking page.
 *
 * Routes (configured via Firebase Hosting rewrites):
 *   GET /beacon/:token       — full HTML page with Google Maps embed
 *   GET /beacon/:token/json  — JSON data endpoint (polled every 15s by the page)
 *
 * Required environment config:
 *   GOOGLE_MAPS_API_KEY   — browser-restricted Maps JS API key
 *
 * Token expiry: 24 hours after endedAt. Expired tokens return 404.
 */
import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import type { Request, Response } from 'express';

const mapsApiKey = defineSecret('GOOGLE_MAPS_API_KEY');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Beacon data fetch ───────────────────────────────────────────────────────

async function getBeacon(token: string): Promise<admin.firestore.DocumentData | null> {
  const snap = await admin.firestore().doc(`activeBeacons/${token}`).get();
  if (!snap.exists) return null;

  const data = snap.data()!;

  // Check 24h expiry after endedAt
  if (!data.active && data.endedAt) {
    const endedMs = data.endedAt.toMillis();
    const expiredMs = endedMs + 24 * 60 * 60 * 1000;
    if (Date.now() > expiredMs) return null;
  }

  return data;
}

// ─── JSON endpoint ────────────────────────────────────────────────────────────

async function handleJson(token: string, res: Response): Promise<void> {
  const data = await getBeacon(token);
  if (!data) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  res.json({
    active: data.active,
    firstName: data.firstName,
    activityType: data.activityType,
    lat: data.lastLocation?.latitude ?? null,
    lng: data.lastLocation?.longitude ?? null,
    locationTs: data.lastLocation?.timestamp ?? null,
    distance: data.distance ?? 0,
    elapsedActive: data.elapsedActive ?? 0,
  });
}

// ─── HTML page ────────────────────────────────────────────────────────────────

async function handleHtml(token: string, mapsKey: string, res: Response): Promise<void> {
  const data = await getBeacon(token);

  if (!data) {
    res.status(404).send(notFoundPage());
    return;
  }

  const { firstName, activityType, active } = data;
  const rawLat = data.lastLocation?.latitude;
  const rawLng = data.lastLocation?.longitude;
  // Fix #3: validate lat/lng are finite numbers before JS injection
  const lat = Number.isFinite(rawLat) ? (rawLat as number) : 37.7749;
  const lng = Number.isFinite(rawLng) ? (rawLng as number) : -122.4194;

  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(trackingPage({ token, firstName, activityType, active, lat, lng, mapsKey }));
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export const beaconTrackingPage = onRequest(
  {
    secrets: [mapsApiKey],
    region: 'us-central1',
    cors: false,
  },
  async (req: Request, res: Response) => {
    // URL pattern: /beacon/:token  or  /beacon/:token/json
    const pathParts = req.path.replace(/^\//, '').split('/');
    // pathParts[0] = "beacon", pathParts[1] = token, pathParts[2] = "json" (optional)
    const token = pathParts[1];
    const isJson = pathParts[2] === 'json';

    if (!token || token.length < 10) {
      res.status(400).send('Invalid beacon link.');
      return;
    }

    if (isJson) {
      await handleJson(token, res);
    } else {
      await handleHtml(token, mapsApiKey.value(), res);
    }
  },
);

// ─── HTML templates ───────────────────────────────────────────────────────────

function notFoundPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Beacon Not Found — PepMax</title>
<style>
  body { font-family: -apple-system, sans-serif; display: flex; align-items: center;
         justify-content: center; height: 100vh; margin: 0; background: #f5f5f5; }
  .card { background: white; border-radius: 16px; padding: 32px; text-align: center;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1); max-width: 320px; }
  h2 { color: #333; margin-top: 0; }
  p { color: #666; }
</style>
</head>
<body>
  <div class="card">
    <h2>Beacon not found</h2>
    <p>This tracking link may have expired or is invalid. Beacon links expire 24 hours after the workout ends.</p>
  </div>
</body>
</html>`;
}

interface TrackingPageProps {
  token: string;
  firstName: string;
  activityType: string;
  active: boolean;
  lat: number;
  lng: number;
  mapsKey: string;
}

function trackingPage(p: TrackingPageProps): string {
  const actLabel = capitalize(p.activityType);
  const title = p.active
    ? `Tracking ${p.firstName}'s ${actLabel} — PepMax`
    : `${p.firstName}'s ${actLabel} Complete — PepMax`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
         background: #0f0f0f; color: #fff; height: 100vh; display: flex;
         flex-direction: column; }
  #header { padding: 16px 20px; background: #1a1a1a; border-bottom: 1px solid #333;
            display: flex; align-items: center; justify-content: space-between; }
  #header h1 { font-size: 18px; font-weight: 700; }
  #header .logo { font-size: 13px; color: #888; font-weight: 600; letter-spacing: 1px; }
  #map { flex: 1; }
  #footer { padding: 14px 20px; background: #1a1a1a; border-top: 1px solid #333; }
  #stats { display: flex; gap: 20px; flex-wrap: wrap; }
  .stat { flex: 1; min-width: 80px; }
  .stat-value { font-size: 20px; font-weight: 700; color: #fff; }
  .stat-label { font-size: 11px; color: #888; text-transform: uppercase;
                letter-spacing: 0.5px; margin-top: 2px; }
  #status-pill { display: inline-flex; align-items: center; gap: 6px;
                 background: rgba(34,197,94,0.15); border: 1px solid #22c55e;
                 color: #22c55e; border-radius: 20px; padding: 4px 12px;
                 font-size: 12px; font-weight: 700; }
  #status-pill.inactive { background: rgba(156,163,175,0.15); border-color: #9ca3af;
                          color: #9ca3af; }
  .pulse { width: 8px; height: 8px; border-radius: 50%; background: #22c55e;
           animation: pulse 1.5s infinite; }
  .pulse.inactive { animation: none; background: #9ca3af; }
  @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.3)} }
  #completed-overlay { display: none; position: absolute; inset: 0; background: rgba(0,0,0,0.7);
                       align-items: center; justify-content: center; flex-direction: column; gap: 12px; }
  #completed-overlay.visible { display: flex; }
  #completed-overlay h2 { font-size: 22px; }
  #completed-overlay p { color: #aaa; font-size: 15px; }
  #map-wrap { flex: 1; position: relative; }
  #last-update { font-size: 11px; color: #666; margin-top: 6px; }
</style>
</head>
<body>
<div id="header">
  <h1 id="header-title">${escapeHtml(p.active ? `📍 ${p.firstName}'s ${actLabel}` : `✅ ${p.firstName}'s ${actLabel}`)}</h1>
  <span class="logo">PEPMAX</span>
</div>

<div id="map-wrap">
  <div id="map"></div>
  <div id="completed-overlay" class="${!p.active ? 'visible' : ''}">
    <h2>✅ Workout Complete</h2>
    <p>${escapeHtml(p.firstName)} is safe.</p>
  </div>
</div>

<div id="footer">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
    <div id="status-pill" class="${!p.active ? 'inactive' : ''}">
      <div class="pulse ${!p.active ? 'inactive' : ''}"></div>
      <span id="status-text">${p.active ? 'Live' : 'Ended'}</span>
    </div>
    <div id="last-update"></div>
  </div>
  <div id="stats">
    <div class="stat">
      <div class="stat-value" id="stat-distance">—</div>
      <div class="stat-label">Distance</div>
    </div>
    <div class="stat">
      <div class="stat-value" id="stat-duration">—</div>
      <div class="stat-label">Duration</div>
    </div>
    <div class="stat">
      <div class="stat-value" id="stat-activity">${escapeHtml(actLabel)}</div>
      <div class="stat-label">Activity</div>
    </div>
  </div>
</div>

<script>
  const TOKEN = ${JSON.stringify(p.token)};
  const POLL_INTERVAL = 15000;
  let map, marker, isActive = ${p.active ? 'true' : 'false'};

  function formatDist(m) {
    const km = m / 1000;
    return km >= 1 ? km.toFixed(2) + ' km' : Math.round(m) + ' m';
  }
  function formatDur(s) {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (h > 0) return h + ':' + String(m).padStart(2,'0') + ':' + String(sec).padStart(2,'0');
    return m + ':' + String(sec).padStart(2,'0');
  }
  function timeSince(ts) {
    const sec = Math.round((Date.now() - ts) / 1000);
    if (sec < 60) return sec + 's ago';
    return Math.round(sec / 60) + 'm ago';
  }

  async function poll() {
    try {
      const r = await fetch('/beacon/' + TOKEN + '/json');
      if (!r.ok) return;
      const d = await r.json();

      document.getElementById('stat-distance').textContent = formatDist(d.distance || 0);
      document.getElementById('stat-duration').textContent = formatDur(d.elapsedActive || 0);
      if (d.locationTs) {
        document.getElementById('last-update').textContent = 'Updated ' + timeSince(d.locationTs);
      }

      if (d.lat && d.lng && map) {
        const pos = { lat: d.lat, lng: d.lng };
        marker.setPosition(pos);
        if (isActive) map.panTo(pos);
      }

      if (!d.active && isActive) {
        isActive = false;
        document.getElementById('completed-overlay').classList.add('visible');
        document.getElementById('status-pill').classList.add('inactive');
        document.getElementById('status-text').textContent = 'Ended';
        document.querySelector('.pulse').classList.add('inactive');
        document.getElementById('header-title').textContent = '✅ ' + d.firstName + ' is safe';
      }
    } catch (e) { /* ignore network errors */ }
  }

  function initMap() {
    const center = { lat: ${p.lat}, lng: ${p.lng} };
    map = new google.maps.Map(document.getElementById('map'), {
      center,
      zoom: 15,
      mapTypeId: 'terrain',
      styles: [
        { elementType: 'geometry', stylers: [{ color: '#212121' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
        { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#373737' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000000' }] },
      ],
      disableDefaultUI: false,
      fullscreenControl: false,
    });

    marker = new google.maps.Marker({
      position: center,
      map,
      title: ${JSON.stringify(p.firstName)},
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#22c55e',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 2,
      },
    });

    // Initial data load
    poll();
    if (isActive) setInterval(poll, POLL_INTERVAL);
  }

  window.initMap = initMap;
</script>
<script async defer
  src="https://maps.googleapis.com/maps/api/js?key=${p.mapsKey}&callback=initMap">
</script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

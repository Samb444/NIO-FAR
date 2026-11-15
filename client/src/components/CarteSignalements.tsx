import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import { CENTRE_CARTE, categorieLabels, statutInfos } from '../lib/referentiel';
import type { SignalementPublic } from '../lib/types';

function iconeStatut(s: SignalementPublic): L.DivIcon {
  const couleur = statutInfos[s.statut].couleur;
  const ex = s.estExemple ? '<span style="position:absolute;top:-5px;right:-5px;background:#14231C;color:#F6F1E7;font-size:9px;font-weight:800;padding:1px 4px;border-radius:6px">EX</span>' : '';
  return L.divIcon({
    className: 'niofar-pin',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -16],
    html: `<div style="position:relative;width:34px;height:34px;border-radius:999px;background:${couleur};border:3px solid #fffdf8;box-shadow:0 6px 14px rgba(20,35,28,.35);display:grid;place-items:center;color:#fff;font-weight:800;font-size:12px">${s.confirmations > 0 ? s.confirmations : ''}${ex}</div>`,
  });
}

function echapper(t: string): string {
  return t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
}

/** Carte Leaflet avec regroupement (clusters) et marqueurs colorés par statut. */
export default function CarteSignalements({ items }: { items: SignalementPublic[] }) {
  const conteneur = useRef<HTMLDivElement>(null);
  const carte = useRef<L.Map | null>(null);
  const groupe = useRef<L.MarkerClusterGroup | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!conteneur.current || carte.current) return;
    const map = L.map(conteneur.current, { center: CENTRE_CARTE, zoom: 12, zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    const cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 48,
      iconCreateFunction: (c) =>
        L.divIcon({
          className: 'niofar-cluster',
          iconSize: [42, 42],
          html: `<div style="width:42px;height:42px;border-radius:999px;background:#0B6B4F;color:#F6F1E7;border:3px solid #E0A21B;display:grid;place-items:center;font-weight:800;font-size:14px;box-shadow:0 8px 18px rgba(20,35,28,.35)">${c.getChildCount()}</div>`,
        }),
    });
    map.addLayer(cluster);
    carte.current = map;
    groupe.current = cluster;
    return () => {
      map.remove();
      carte.current = null;
      groupe.current = null;
    };
  }, []);

  useEffect(() => {
    const cluster = groupe.current;
    const map = carte.current;
    if (!cluster || !map) return;
    cluster.clearLayers();
    const pts: L.LatLngExpression[] = [];
    for (const s of items) {
      if (s.latitude === null || s.longitude === null) continue;
      pts.push([s.latitude, s.longitude]);
      const m = L.marker([s.latitude, s.longitude], { icon: iconeStatut(s) });
      const info = statutInfos[s.statut];
      const div = document.createElement('div');
      div.style.minWidth = '200px';
      div.innerHTML = `
        ${s.estExemple ? '<p style="margin:0 0 4px;font-size:11px;font-weight:800;color:#E0A21B">EXEMPLE FICTIF</p>' : ''}
        <p style="margin:0;font-weight:800;font-size:14px">${echapper(categorieLabels[s.categorie])} · <span style="color:${info.couleur}">${echapper(info.label)}</span></p>
        <p style="margin:4px 0;font-size:12px;opacity:.8">${echapper(s.secteur)} · <strong style="font-family:monospace">${echapper(s.code)}</strong></p>
        <p style="margin:4px 0 8px;font-size:13px">${echapper(s.description || 'Sans description')}</p>
        <button type="button" data-id="${echapper(s.id)}" style="width:100%;min-height:40px;border-radius:999px;background:#0B6B4F;color:#fff;font-weight:700;font-size:13px;border:0;cursor:pointer;padding:6px 12px">Voir la fiche →</button>
      `;
      div.querySelector('button')?.addEventListener('click', () => navigate(`/signalements/${s.id}`));
      m.bindPopup(div);
      cluster.addLayer(m);
    }
    if (pts.length > 0) map.fitBounds(L.latLngBounds(pts), { padding: [36, 36], maxZoom: 14 });
  }, [items, navigate]);

  return <div ref={conteneur} className="h-[62svh] min-h-80 w-full rounded-4xl border border-line shadow-soft z-0" aria-label="Carte des signalements" />;
}

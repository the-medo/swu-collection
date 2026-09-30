import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from '@tanstack/react-router';
import { format, parseISO } from 'date-fns';
import { ExternalLink, House } from 'lucide-react';
import type { HomeLocation } from '../../../../../../../shared/lib/userHomeLocation.ts';
import {
  Map as LibreMap,
  Marker,
  Popup,
  NavigationControl,
  FullscreenControl,
  LngLatBounds,
  setWorkerUrl,
} from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import { cn } from '@/lib/utils.ts';
import { Badge } from '@/components/ui/badge.tsx';
import type { MapTournament } from '../../../../../../../types/TournamentMap.ts';
import { formatDataById } from '../../../../../../../types/Format.ts';
import {
  hasMapCoordinates,
  locationText,
  mapClusterBackground,
  mapPinColor,
  mapPinLogo,
  tournamentLinks,
  tournamentWeek,
} from './mapData.ts';
import { createMapClusters } from './mapClusters.ts';

setWorkerUrl(workerUrl);

function TournamentPinDetails({ tournaments }: { tournaments: MapTournament[] }) {
  return (
    <div className="max-h-72 space-y-3 overflow-y-auto pr-3" aria-label="Tournament details">
      {tournaments.map(t => (
        <article
          key={t.id}
          className="flex flex-col items-start gap-1 border-b pb-2 last:border-0 last:pb-0"
        >
          <Badge
            variant="outline"
            className={cn(
              'border-transparent leading-tight',
              t.format === 3 ? 'text-white' : 'text-neutral-900',
            )}
            style={{ backgroundColor: mapPinColor(t.format, 0, 12) }}
          >
            {formatDataById[t.format]?.name ?? 'Tournament'}
          </Badge>
          <Link
            to="/tournaments/$tournamentId"
            params={{ tournamentId: t.id }}
            className="block text-lg font-semibold leading-tight text-primary hover:underline"
          >
            {t.name}
          </Link>
          <p className="m-0 text-sm leading-snug!">
            {format(parseISO(t.date), 'EEE, MMM d, yyyy')}
          </p>
          <p className="m-0 text-sm leading-snug! text-muted-foreground">{locationText(t)}</p>
          {t.additionalInfo.locationPrecision === 'city' && (
            <p className="m-0 text-xs leading-snug! text-muted-foreground">
              Approximate city location — check the event website for the venue.
            </p>
          )}
          {t.additionalInfo.locationPrecision === 'street' && (
            <p className="m-0 text-xs leading-snug! text-muted-foreground">
              Approximate street location.
            </p>
          )}
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {tournamentLinks(t).map(link => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm leading-snug text-primary hover:underline"
              >
                {link.label}
                <ExternalLink className="h-3 w-3" />
              </a>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

export default function TournamentMapCanvas({
  tournaments,
  weeks,
  set,
  homeCoordinates,
}: {
  tournaments: MapTournament[];
  weeks: string[];
  set?: string;
  homeCoordinates: HomeLocation['coordinates'] | null;
}) {
  const map = useRef<LibreMap | null>(null);
  const activePopup = useRef<Popup | null>(null);
  const fittedSet = useRef<string | null>(null);
  const [popup, setPopup] = useState<{ node: HTMLDivElement; tournaments: MapTournament[] } | null>(
    null,
  );
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [homeNode] = useState(() => {
    const node = document.createElement('div');
    node.className = 'tournament-map-home z-[1]';
    return node;
  });
  const homeX = homeCoordinates?.x;
  const homeY = homeCoordinates?.y;

  const initializeMap = useCallback((container: HTMLDivElement | null) => {
    if (!container) return;
    const style = () =>
      `https://tiles.openfreemap.org/styles/${document.documentElement.classList.contains('dark') ? 'dark' : 'positron'}`;
    let instance: LibreMap;
    try {
      instance = new LibreMap({
        container,
        style: style(),
        center: [0, 25],
        zoom: 1.3,
        attributionControl: {
          compact: true,
          customAttribution: 'Event locations © OpenStreetMap contributors',
        },
      });
    } catch {
      setError(true);
      setLoading(false);
      return;
    }
    map.current = instance;
    instance.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    instance.addControl(new FullscreenControl(), 'top-right');
    instance.on('load', () => setLoading(false));
    instance.on('error', () => {
      setError(true);
      setLoading(false);
    });
    instance.on('idle', () => {
      setError(false);
      setLoading(false);
    });
    const resize = new ResizeObserver(() => instance.resize());
    resize.observe(container);
    const theme = new MutationObserver(() => instance.setStyle(style()));
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => {
      theme.disconnect();
      resize.disconnect();
      activePopup.current?.remove();
      instance.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current || homeX === undefined || homeY === undefined) return;
    const marker = new Marker({ element: homeNode, anchor: 'center' })
      .setLngLat([homeX, homeY])
      .addTo(map.current);
    return () => {
      marker.remove();
    };
  }, [homeNode, homeX, homeY]);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    activePopup.current?.remove();
    const index = createMapClusters(tournaments);
    let markers: Marker[] = [];
    const drawMarkers = () => {
      markers.forEach(marker => marker.remove());
      const features = index.getClusters([-180, -90, 180, 90], Math.floor(instance.getZoom()));
      markers = features.map(feature => {
        const clusterId =
          'cluster_id' in feature.properties ? Number(feature.properties.cluster_id) : undefined;
        const events: MapTournament[] =
          clusterId !== undefined
            ? index.getLeaves(clusterId, Infinity).flatMap(leaf => leaf.properties.tournaments)
            : feature.properties.tournaments;
        const coords: [number, number] = [
          feature.geometry.coordinates[0],
          feature.geometry.coordinates[1],
        ];
        const button = document.createElement('button');
        button.type = 'button';
        const grouped = events.length > 1;
        const logo = !grouped ? mapPinLogo(events[0].type) : undefined;
        const diamond = !grouped && events[0].type === 'open';
        const centered = grouped || !!logo || diamond;
        button.className = cn(
          'tournament-map-pin cursor-pointer border-0 bg-transparent p-[3px] focus-visible:rounded-md focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-ring',
          grouped
            ? 'tournament-map-cluster size-[46px]'
            : logo
              ? 'tournament-map-major size-[50px]'
              : diamond
                ? 'tournament-map-open flex size-[46px] items-center justify-center'
                : 'h-11 w-9',
        );
        const label =
          clusterId !== undefined
            ? `${events.length} tournaments — zoom in`
            : grouped
              ? `${events.length} tournaments at this venue`
              : events[0].name;
        button.setAttribute('aria-label', label);
        button.title = label;
        const colors = events.map(t =>
          mapPinColor(t.format, weeks.indexOf(tournamentWeek(t.date)), weeks.length),
        );
        const shape = document.createElement('span');
        shape.setAttribute('aria-hidden', 'true');
        shape.className = cn(
          'tournament-map-pin-shape flex items-center justify-center border-white text-neutral-900 shadow-[0_2px_5px_#0006]',
          grouped
            ? 'size-10 rounded-full border'
            : logo
              ? 'size-11 rounded-full border-2'
              : diamond
                ? 'size-[26px] -rotate-45 border-2'
                : 'size-[30px] -rotate-45 rounded-[50%_50%_50%_0] border-2',
        );
        shape.style.background = grouped ? mapClusterBackground(colors) : colors[0];
        const count = document.createElement('span');
        count.className = grouped
          ? 'flex size-[26px] items-center justify-center rounded-full bg-card text-xs font-bold text-card-foreground'
          : cn('text-[15px] font-bold', !logo && 'rotate-45');
        count.textContent = grouped ? String(events.length) : '•';
        if (logo) {
          const image = document.createElement('img');
          image.className = 'size-10 object-contain drop-shadow-[0_1px_2px_#0009]';
          image.alt = '';
          image.width = 40;
          image.height = 40;
          image.draggable = false;
          image.addEventListener('error', () => image.replaceWith(count), { once: true });
          image.src = logo;
          shape.append(image);
        } else {
          shape.append(count);
        }
        button.append(shape);
        button.addEventListener('click', event => {
          event.stopPropagation();
          activePopup.current?.remove();
          if (clusterId !== undefined) {
            instance.easeTo({
              center: coords,
              zoom: Math.min(instance.getMaxZoom(), index.getClusterExpansionZoom(clusterId)),
              duration: 350,
            });
            return;
          }
          const node = document.createElement('div');
          const detail = new Popup({
            offset: centered ? 26 : 32,
            maxWidth: '320px',
            className: 'tournament-map-popup',
          })
            .setLngLat(coords)
            .setDOMContent(node)
            .addTo(instance);
          detail.on('close', () => setPopup(null));
          activePopup.current = detail;
          setPopup({ node, tournaments: events });
        });
        return new Marker({ element: button, anchor: centered ? 'center' : 'bottom' })
          .setLngLat(coords)
          .addTo(instance);
      });
    };
    const bounds = new LngLatBounds();
    tournaments
      .filter(hasMapCoordinates)
      .forEach(t => bounds.extend([t.coordinates.x, t.coordinates.y]));
    if (homeX !== undefined && homeY !== undefined) bounds.extend([homeX, homeY]);
    const fitKey = `${set}:${homeX}:${homeY}`;
    // Preserve the user's zoom while filtering. Fit when the set first has pins.
    if (!bounds.isEmpty() && fittedSet.current !== fitKey) {
      instance.fitBounds(bounds, { padding: 65, maxZoom: 9, duration: 0 });
      fittedSet.current = fitKey;
    }
    drawMarkers();
    instance.on('zoomend', drawMarkers);
    return () => {
      instance.off('zoomend', drawMarkers);
      markers.forEach(marker => marker.remove());
      activePopup.current?.remove();
    };
  }, [tournaments, weeks, set, homeX, homeY]);

  return (
    <div className="relative">
      <div
        ref={initializeMap}
        aria-label="Map of tournament locations"
        className={cn(
          'tournament-map h-[65vh] min-h-[360px] w-full overflow-hidden rounded-lg border',
          'dark:[&_.maplibregl-canvas]:brightness-120 dark:[&_.maplibregl-canvas]:contrast-90',
          // MapLibre styles are unlayered; important utilities override its popup defaults.
          '[&_.maplibregl-popup-content]:rounded-lg! [&_.maplibregl-popup-content]:bg-card! [&_.maplibregl-popup-content]:p-4! [&_.maplibregl-popup-content]:text-card-foreground! [&_.maplibregl-popup-content]:shadow-[0_4px_20px_#0004]!',
          '[&_.maplibregl-popup-close-button]:px-[7px]! [&_.maplibregl-popup-close-button]:py-px! [&_.maplibregl-popup-close-button]:text-xl! [&_.maplibregl-popup-close-button]:text-foreground!',
          '[&_[class*=maplibregl-popup-anchor-bottom]_.maplibregl-popup-tip]:border-t-card!',
          '[&_[class*=maplibregl-popup-anchor-top]_.maplibregl-popup-tip]:border-b-card!',
          '[&_.maplibregl-popup-anchor-left_.maplibregl-popup-tip]:border-r-card!',
          '[&_.maplibregl-popup-anchor-right_.maplibregl-popup-tip]:border-l-card!',
        )}
      />
      {loading && (
        <p
          role="status"
          className="absolute left-3 top-3 rounded-md bg-background/95 p-3 text-sm shadow"
        >
          Loading map…
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="absolute left-3 top-3 max-w-[75%] rounded-md bg-background/95 p-3 text-sm shadow"
        >
          Map tiles could not load. Check your connection or reload the page.
        </p>
      )}
      {popup && createPortal(<TournamentPinDetails tournaments={popup.tournaments} />, popup.node)}
      {homeCoordinates &&
        createPortal(
          <div
            role="img"
            aria-label="Your home"
            title="Your home"
            className="flex size-10 items-center justify-center rounded-full border-2 border-white bg-sky-700 text-white shadow-lg"
          >
            <House className="size-6" aria-hidden="true" />
          </div>,
          homeNode,
        )}
    </div>
  );
}

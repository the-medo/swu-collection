import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react';
import { createPortal } from 'react-dom';
import { House } from 'lucide-react';
import type { HomeLocation } from '../../../../../../../shared/lib/userHomeLocation.ts';
import {
  Map as LibreMap,
  Marker,
  Popup,
  NavigationControl,
  FullscreenControl,
  LngLatBounds,
  LngLat,
  setWorkerUrl,
} from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import { cn } from '@/lib/utils.ts';
import type { MapTournament } from '../../../../../../../types/TournamentMap.ts';
import { hasMapCoordinates, mapClusterBackground, mapPinColor, mapPinLogo } from './mapData.ts';
import { TournamentPinDetails } from './TournamentPinDetails.tsx';
import { mapWeekIndex } from '../../../../../../../shared/lib/tournamentMapDates.ts';
import { createMapMarkers } from './mapClusters.ts';
import type { TournamentSaveStatus } from '../../../../../../../types/UserTournamentSave.ts';
import { savedTournamentMarkers } from './savedTournamentMarkers.ts';

setWorkerUrl(workerUrl);

const focusedMapZoom = 6;

export interface TournamentMapActions {
  focusTournament: (tournament: MapTournament) => void;
}

export default function TournamentMapCanvas({
  ref,
  tournaments,
  weeks,
  windowStart,
  homeCoordinates,
  savedTournamentStatuses,
  simpleRemoval,
  children,
}: {
  ref?: Ref<TournamentMapActions>;
  tournaments: MapTournament[];
  weeks: string[];
  windowStart?: string;
  homeCoordinates: HomeLocation['coordinates'] | null;
  savedTournamentStatuses: ReadonlyMap<string, TournamentSaveStatus>;
  simpleRemoval: boolean;
  children?: ReactNode;
}) {
  const map = useRef<LibreMap | null>(null);
  const activePopup = useRef<Popup | null>(null);
  const fittedWindow = useRef<string | null>(null);
  const savedStatuses = useRef(savedTournamentStatuses);
  const redrawMarkers = useRef<(() => void) | null>(null);
  const [popup, setPopup] = useState<{ node: HTMLDivElement; tournaments: MapTournament[] } | null>(
    null,
  );
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [homeNode] = useState(() => {
    const node = document.createElement('div');
    node.className = 'tournament-map-home';
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
    fittedWindow.current = null;
    instance.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    instance.addControl(
      new FullscreenControl({ container: container.parentElement ?? container }),
      'top-right',
    );
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

  const openPopup = useCallback(
    (events: MapTournament[], coords: [number, number], offset = 26) => {
      const instance = map.current;
      if (!instance) return;
      activePopup.current?.remove();
      const node = document.createElement('div');
      const detail = new Popup({ offset, maxWidth: '320px', className: 'tournament-map-popup' })
        .setLngLat(coords)
        .setDOMContent(node)
        .addTo(instance);
      detail.on('close', () => setPopup(null));
      activePopup.current = detail;
      setPopup({ node, tournaments: events });
    },
    [],
  );

  const focusTournament = useCallback(
    (tournament: MapTournament) => {
      const instance = map.current;
      if (!instance || !hasMapCoordinates(tournament)) return;
      const center: [number, number] = [tournament.coordinates.x, tournament.coordinates.y];
      instance.flyTo({ center, zoom: focusedMapZoom, duration: 800 });
      // Saved events outside the active filters can still be inspected at their location.
      openPopup([tournament], center);
    },
    [openPopup],
  );

  useImperativeHandle(ref, () => ({ focusTournament }), [focusTournament]);

  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    activePopup.current?.remove();
    let markerStatuses = savedStatuses.current;
    let getMarkers = createMapMarkers(tournaments, markerStatuses);
    let markers: Marker[] = [];
    const drawMarkers = () => {
      // Rebuild the partition after saves/removals without closing the active popup.
      if (markerStatuses !== savedStatuses.current) {
        markerStatuses = savedStatuses.current;
        getMarkers = createMapMarkers(tournaments, markerStatuses);
      }
      markers.forEach(marker => marker.remove());
      markers = getMarkers(instance.getZoom()).map(
        ({ tournaments: events, coordinates: coords, expansionZoom }) => {
          const button = document.createElement('button');
          button.type = 'button';
          const grouped = events.length > 1;
          const status = !grouped ? savedStatuses.current.get(events[0].id) : undefined;
          const saved = status !== undefined;
          const logo = !grouped && !saved ? mapPinLogo(events[0].type) : undefined;
          const diamond = !grouped && !saved && events[0].type === 'open';
          const centered = grouped || saved || !!logo || diamond;
          button.className = cn(
            'tournament-map-pin cursor-pointer border-0 bg-transparent p-[3px] focus-visible:rounded-md focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-ring',
            grouped
              ? 'tournament-map-cluster size-[46px]'
              : saved
                ? 'tournament-map-saved size-[46px]'
                : logo
                  ? 'tournament-map-major size-[50px]'
                  : diamond
                    ? 'tournament-map-open flex size-[46px] items-center justify-center'
                    : 'h-11 w-9',
          );
          const label =
            expansionZoom !== undefined
              ? `${events.length} tournaments — zoom in`
              : grouped
                ? `${events.length} tournaments at this venue`
                : `${status ? `${savedTournamentMarkers[status].label}: ` : ''}${events[0].name}`;
          button.setAttribute('aria-label', label);
          if (status) button.dataset.saveStatus = status;
          button.title = label;
          const colors = events.map(t =>
            mapPinColor(t.format, weeks.length ? mapWeekIndex(t.date, weeks[0]) : 0, weeks.length),
          );
          const shape = document.createElement('span');
          shape.setAttribute('aria-hidden', 'true');
          shape.className = cn(
            'tournament-map-pin-shape flex items-center justify-center border-white text-neutral-900',
            !saved && 'shadow-[0_2px_5px_#0006]',
            grouped
              ? 'size-10 rounded-full border'
              : saved
                ? 'size-10'
                : logo
                  ? 'size-11 rounded-full border-2'
                  : diamond
                    ? 'size-[26px] -rotate-45 border-2'
                    : 'size-[30px] -rotate-45 rounded-[50%_50%_50%_0] border-2',
          );
          if (!saved) shape.style.background = grouped ? mapClusterBackground(colors) : colors[0];
          const count = document.createElement('span');
          count.className = grouped
            ? 'flex size-[26px] items-center justify-center rounded-full bg-card text-xs font-bold text-card-foreground'
            : cn('text-[15px] font-bold', !logo && 'rotate-45');
          count.textContent = grouped ? String(events.length) : '•';
          if (status) {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('viewBox', '0 0 40 40');
            svg.setAttribute('class', 'size-10 overflow-visible drop-shadow-[0_2px_3px_#0008]');
            const glyph = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            glyph.setAttribute('d', savedTournamentMarkers[status].path);
            glyph.setAttribute('fill', colors[0]);
            glyph.setAttribute('stroke', 'white');
            glyph.setAttribute('stroke-width', '1.5');
            glyph.setAttribute('stroke-linejoin', 'round');
            svg.append(glyph);
            shape.append(svg);
          } else if (logo) {
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
            if (expansionZoom !== undefined) {
              instance.easeTo({
                center: coords,
                zoom: Math.min(instance.getMaxZoom(), expansionZoom),
                duration: 350,
              });
              return;
            }
            openPopup(events, coords, centered ? 26 : 32);
          });
          return new Marker({ element: button, anchor: centered ? 'center' : 'bottom' })
            .setLngLat(coords)
            .addTo(instance);
        },
      );
    };
    const bounds = new LngLatBounds();
    tournaments
      .filter(hasMapCoordinates)
      .forEach(t => bounds.extend([t.coordinates.x, t.coordinates.y]));
    const fitKey = `${windowStart}:${homeX}:${homeY}`;
    // Start near home when available, then preserve the camera while filtering.
    if (fittedWindow.current !== fitKey) {
      if (homeX !== undefined && homeY !== undefined) {
        instance.jumpTo({ center: [homeX, homeY], zoom: focusedMapZoom });
        fittedWindow.current = fitKey;
      } else if (!bounds.isEmpty()) {
        instance.fitBounds(bounds, { padding: 65, maxZoom: 9, duration: 0 });
        fittedWindow.current = fitKey;
      }
    }
    drawMarkers();
    redrawMarkers.current = drawMarkers;
    instance.on('zoomend', drawMarkers);
    return () => {
      redrawMarkers.current = null;
      instance.off('zoomend', drawMarkers);
      markers.forEach(marker => marker.remove());
      activePopup.current?.remove();
    };
  }, [tournaments, weeks, windowStart, homeX, homeY, openPopup]);

  // Saving changes marker shapes while keeping the open details card in place.
  useEffect(() => {
    savedStatuses.current = savedTournamentStatuses;
    redrawMarkers.current?.();
  }, [savedTournamentStatuses]);

  return (
    <div className="relative [&:is(:fullscreen,.maplibregl-pseudo-fullscreen)_.tournament-map]:h-full [&:is(:fullscreen,.maplibregl-pseudo-fullscreen)_.tournament-map]:rounded-none">
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
      {children}
      {loading && (
        <p
          role="status"
          className="absolute bottom-10 left-3 rounded-md bg-background/95 p-3 text-sm shadow"
        >
          Loading map…
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="absolute bottom-10 left-3 max-w-[75%] rounded-md bg-background/95 p-3 text-sm shadow"
        >
          Map tiles could not load. Check your connection or reload the page.
        </p>
      )}
      {popup &&
        createPortal(
          <TournamentPinDetails tournaments={popup.tournaments} simpleRemoval={simpleRemoval} />,
          popup.node,
        )}
      {homeCoordinates &&
        createPortal(
          <button
            type="button"
            aria-label="Zoom to your home"
            title="Zoom to your home"
            onClick={() =>
              map.current?.fitBounds(
                LngLatBounds.fromLngLat(new LngLat(homeCoordinates.x, homeCoordinates.y), 500_000),
                { padding: 40, duration: 800 },
              )
            }
            className="flex size-10 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-sky-700 text-white shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <House className="size-6" aria-hidden="true" />
          </button>,
          homeNode,
        )}
    </div>
  );
}

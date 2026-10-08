import { useId, useMemo } from 'react';
import type { BattlefieldItem } from '../../../../../shared/battlefield/catalog.ts';
import type { BattlefieldLightDirection } from '../../../../../shared/battlefield/lighting.ts';
import {
  battlefieldPlanetTextures,
  type BattlefieldPlanetTextureId,
} from '../../../../../shared/battlefield/planets.ts';
import {
  battlefieldPlanetTextureImages,
  battlefieldPlanetGrainImage,
} from './battlefieldPlanetTextureImages';
import { BattlefieldCapitalShipArt } from './BattlefieldCapitalShipArt';
import { BattlefieldDeathStarArt } from './BattlefieldDeathStarArt';

export function BattlefieldArt({
  item,
  color,
  frame,
  lightDirection,
  textureId = 'rocky',
}: {
  item: BattlefieldItem;
  color?: string;
  frame?: { x: number; y: number; width: number; height: number };
  lightDirection?: BattlefieldLightDirection;
  textureId?: BattlefieldPlanetTextureId;
}) {
  const id = useId().replace(/:/g, '');
  const planet = item.shape === 'planet';
  const sphere = planet || item.shape === 'death-star';
  const texture = battlefieldPlanetTextures[textureId];
  const paint = color ?? (planet ? texture.color : item.color) ?? '#a6b3bf';
  const accent = item.accentColor;
  const shade = 'url(#' + id + '-shade)';
  const metal = 'url(#' + id + '-metal)';
  const bounds =
    item.artBounds ??
    (item.shape === 'city'
      ? { x: -24, y: -24, width: 48, height: 48 }
      : item.shape === 'ion-cannon'
        ? { x: -14, y: -14, width: 40, height: 28 }
        : item.shape === 'mining-facility'
          ? { x: -25, y: -25, width: 50, height: 50 }
          : { x: -60, y: -60, width: 120, height: 120 });
  // A stretched drawing needs the gradient normal transformed along with it.
  const normalX =
    (lightDirection?.x ?? -Math.SQRT1_2) * ((frame?.width ?? item.width ?? 120) / bounds.width);
  const normalY =
    (lightDirection?.y ?? -Math.SQRT1_2) * ((frame?.height ?? item.height ?? 120) / bounds.height);
  const length = Math.hypot(normalX, normalY) || 1;
  const nx = normalX / length;
  const ny = normalY / length;
  const extent = sphere
    ? bounds.width / 2
    : (Math.abs(nx) * bounds.width + Math.abs(ny) * bounds.height) / 2;
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  const gradient = {
    gradientUnits: 'userSpaceOnUse' as const,
    x1: centerX + nx * extent,
    y1: centerY + ny * extent,
    x2: centerX - nx * extent,
    y2: centerY - ny * extent,
  };
  // Light movement changes gradient coordinates, not model geometry or palette.
  const shadeStops = useMemo(
    () =>
      sphere ? (
        // Ease the shading into the night side without sharp changes in brightness.
        Array.from({ length: 25 }, (_, i) => {
          const offset = i / 24;
          const t = Math.max(0, Math.min(1, (offset - 0.25) / 0.7));
          const darkness = t * t * (3 - 2 * t);
          return (
            <stop
              key={i}
              offset={offset}
              stopColor={`color-mix(in srgb, ${paint} ${(100 * (1 - darkness)).toFixed(2)}%, #060d18)`}
            />
          );
        })
      ) : (
        <>
          <stop stopColor={paint} />
          <stop offset=".38" stopColor={paint} />
          <stop offset=".76" stopColor="#132431" />
          <stop offset="1" stopColor="#060d18" />
        </>
      ),
    [sphere, paint],
  );
  const surface = useMemo(
    () => (
      <g id={id + '-surface'}>
        {planet && (
          <>
            <circle r="50" fill={shade} stroke={paint} strokeWidth=".5" />
            <g clipPath={'url(#' + id + '-planet-clip)'} style={{ mixBlendMode: 'soft-light' }}>
              <image
                x="-50"
                y="-50"
                width="100"
                height="100"
                href={battlefieldPlanetTextureImages[textureId]}
                opacity={texture.opacity}
              />
              <image
                x="-50"
                y="-50"
                width="100"
                height="100"
                href={battlefieldPlanetGrainImage}
                opacity=".08"
              />
            </g>
          </>
        )}
        {item.shape === 'death-star' && (
          <BattlefieldDeathStarArt id={id} paint={paint} shade={shade} />
        )}
        {item.shape === 'asteroid' && (
          <>
            <path
              d="M-49-15-33-41-10-49 15-36 35-40 48-15 41 15 23 35-3 44-36 26-48 4Z"
              fill={shade}
              stroke={paint}
              strokeWidth="1"
            />
            {[
              [-22, -18, 9],
              [12, -21, 12],
              [-8, 15, 10],
              [28, 8, 6],
            ].map(([x, y, r], i) => (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={r}
                fill="#101924"
                opacity=".36"
                stroke={paint}
                strokeWidth="1"
              />
            ))}
            <path
              d="M-33-36-23-24-30-5 M35-29 25-10 34 2"
              fill="none"
              stroke={paint}
              opacity=".4"
            />
          </>
        )}
        {item.shape === 'station' && (
          <g stroke={paint}>
            <circle r="39" fill="none" strokeWidth="10" />
            <circle r="34" fill="none" strokeWidth="1" />
            <circle r="45" fill="none" strokeWidth="1" />
            {[0, 45, 90, 135].map(a => (
              <path key={a} d="M-40 0H40" transform={'rotate(' + a + ')'} strokeWidth="3" />
            ))}
            <circle r="15" fill={metal} />
            <circle r="6" fill="#7bc9e6" stroke="none" />
            {[0, 90, 180, 270].map(a => (
              <g key={a} transform={'rotate(' + a + ')'}>
                <rect x="-7" y="-52" width="14" height="20" fill={metal} />
                <path d="M-4-45H4" stroke="#eac780" strokeWidth="2" />
              </g>
            ))}
          </g>
        )}
        {item.shape === 'outpost' && (
          <>
            <path
              d="M-45-31H-18V31H-45Z M18-31H45V31H18Z"
              fill="#263b58"
              stroke={paint}
              strokeWidth="2"
            />
            {[-36, -27, 27, 36].map(x => (
              <path key={x} d={'M' + x + '-30V30'} stroke="#6e90b0" strokeWidth="1" />
            ))}
            <path d="M-42 0H42" stroke={paint} strokeWidth="4" />
            <rect x="-12" y="-29" width="24" height="58" rx="6" fill={metal} />
            <circle r="7" fill="#a5e2f2" />
            <path d="M0-29V-49" stroke={paint} strokeWidth="2" />
            <circle cy="-49" r="2" fill="#f4b17c" />
          </>
        )}
        {(item.shape === 'tie' || item.shape === 'interceptor') && (
          <>
            {/* Overhead view: edge-on wings above/below the cockpit, nose to the right. */}
            <path d="M0-34V34" stroke="#253644" strokeWidth="10" />
            <path d="M0-34V34" stroke={paint} strokeWidth="6" />
            {[-1, 1].map(side => (
              <g key={side} transform={'scale(1 ' + side + ')'}>
                <path
                  d={
                    item.shape === 'tie'
                      ? 'M-44-42H44L48-38 44-34H-44L-48-38Z'
                      : 'M-43-42H14L53-35H-43Z'
                  }
                  fill="#17212b"
                  stroke={paint}
                  strokeWidth="1.5"
                />
                {[-30, -12, 8].map(x => (
                  <path
                    key={x}
                    d={'M' + x + '-41V-35'}
                    stroke={paint}
                    strokeWidth=".7"
                    opacity=".5"
                  />
                ))}
                {item.shape === 'interceptor' && (
                  <path d="M45-35H57" stroke={paint} strokeWidth="1.4" />
                )}
              </g>
            ))}
            <circle r="13" fill={metal} stroke={paint} strokeWidth="1" />
            <circle r="5" fill="#4c5d6c" stroke={paint} strokeWidth=".8" />
            <path d="M-3-3H3V3H-3Z" fill="#6d7d89" />
            <path
              d="M6-10Q16-8 16 0Q16 8 6 10L10 0Z"
              fill="#142431"
              stroke={paint}
              strokeWidth=".6"
            />
            <path d="M12-5H22M12 5H22" stroke={paint} strokeWidth="1.5" />
            <path d="M-15-3V3" stroke="#7bb9d0" strokeWidth="2" />
          </>
        )}
        {item.shape === 'x-wing' && (
          <>
            {/* Paired S-foils and engine pods seen from above. */}
            {[-1, 1].map(side => (
              <g key={side} transform={'scale(1 ' + side + ')'}>
                <path d="M-21-6-34-38-19-41 12-6Z" fill="#8897a0" stroke={paint} />
                <path d="M-17-6-28-43-13-45 16-6Z" fill={metal} stroke={paint} />
                <path d="M-22-29-12-31" stroke="#b85e56" strokeWidth="3" />
                <path d="M-23-44H31" stroke={paint} strokeWidth="2" />
                <path d="M25-44H35" stroke="#b85e56" strokeWidth="1.3" />
                {[-23, -14].map(y => (
                  <g key={y}>
                    <rect
                      x="-40"
                      y={y - 3}
                      width="26"
                      height="6"
                      rx="2.5"
                      fill={metal}
                      stroke={paint}
                      strokeWidth=".7"
                    />
                    <path d={'M-43 ' + y + 'H-39'} stroke="#81c9e7" strokeWidth="3" />
                    <path d={'M-20 ' + y + 'H-15'} stroke="#485d6b" strokeWidth="2" />
                  </g>
                ))}
              </g>
            ))}
            <path d="M-44-6 13-8 52 0 13 8-44 6Z" fill={metal} stroke={paint} strokeWidth="1" />
            <path d="M-8-4H8L14 0 8 4H-8Z" fill="#213845" stroke={paint} strokeWidth=".5" />
            <path d="M-1-4V4M8-3V3" stroke="#9ab0ba" strokeWidth=".7" />
            <path d="M-34-4V4" stroke="#b85e56" strokeWidth="3" />
            <path d="M27-3 45 0 27 3" stroke="#c46a61" fill="none" />
          </>
        )}
        {item.shape === 'corvette' && (
          <>
            <path d="M-35-16H-12L2-8H40V8H2L-12 16H-35Z" fill={metal} stroke={paint} />
            <rect x="-47" y="-27" width="20" height="54" rx="5" fill={metal} stroke={paint} />
            {[-20, -10, 0, 10, 20].map(y => (
              <g key={y}>
                <rect
                  x="-49"
                  y={y - 3}
                  width="21"
                  height="6"
                  rx="2"
                  fill={paint}
                  stroke="#758a95"
                  strokeWidth=".6"
                />
                <path d={'M-53 ' + y + 'H-49'} stroke="#88d9ff" strokeWidth="3" />
                <path d={'M-38 ' + y + 'H-30'} stroke="#667b86" strokeWidth="1" />
              </g>
            ))}
            <rect x="33" y="-23" width="17" height="46" rx="6" fill={metal} stroke={paint} />
            <rect x="49" y="-7" width="8" height="14" rx="3" fill={metal} stroke={paint} />
            <path d="M38-20V20M-16-13V13" stroke={accent ?? '#b75e59'} strokeWidth="2.5" />
            <rect
              x="-24"
              y="-5"
              width="41"
              height="10"
              rx="2"
              fill={paint}
              stroke="#758a95"
              strokeWidth=".7"
            />
            <path d="M-17-3H8M44-8V8" stroke="#6a7b82" strokeWidth="1" />
            <circle cx="-7" r="3" fill="#9caeb6" stroke="#596d78" strokeWidth=".8" />
            <rect x="43" y="-5" width="5" height="10" rx="1" fill="#304653" />
            {accent && <path d="M-20 0H30" stroke={accent} strokeWidth="2" />}
          </>
        )}
        {item.shape === 'destroyer' && (
          <>
            <path d="M-48-34 56 0-48 34-40 0Z" fill={metal} stroke={paint} />
            <path d="M-39-28 39 0-39 28-29 0Z" fill={paint} opacity=".22" />
            {accent && (
              <path
                d="M-36-23-8-14 21-5M-36 23-8 14 21 5"
                stroke={accent}
                strokeWidth="2"
                fill="none"
              />
            )}
            <path d="M-43 0H50M-25-28V28M-8-18V18M12-10V10" stroke="#2c3d4c" strokeWidth=".7" />
            <path d="M-38-14-14-7 19 0-14 7-38 14Z" fill={paint} opacity=".8" />
            <path d="M-37-7H-19V7H-37Z" fill="#6d8395" stroke={paint} strokeWidth=".6" />
            <rect
              x="-36"
              y="-17"
              width="6"
              height="34"
              rx="1"
              fill={paint}
              stroke="#3d5364"
              strokeWidth=".7"
            />
            <path d="M-31-14V14M-27-5H-20M-27 5H-20" stroke="#3f5668" strokeWidth=".7" />
            {[-20, -10, 0, 10, 20].map(y => (
              <path key={y} d={'M-48 ' + y + 'H-53'} stroke="#81bffa" strokeWidth="2.5" />
            ))}
            {[-22, -12, -2].map(x => (
              <g key={x} fill={paint} stroke="#3d5364" strokeWidth=".5">
                <rect x={x} y="-13" width="3" height="4" rx=".5" />
                <rect x={x} y="9" width="3" height="4" rx=".5" />
              </g>
            ))}
          </>
        )}
        {item.shape === 'executor' && (
          <>
            {/* Swept arrowhead hull, a long raised city spine, and the aft command tower. */}
            <path
              d="M60 0-38-19.5-60-15.6-52-5.2-58-1.95V1.95L-52 5.2-60 15.6-38 19.5Z"
              fill={metal}
              stroke={paint}
              strokeWidth=".5"
            />
            <path
              d="M55 0-37-17.55-55-14.3-46-3.25V3.25L-55 14.3-37 17.55Z"
              fill="none"
              stroke="#344858"
              strokeWidth=".6"
            />
            <path
              d="M-48 0H55M-39-16.25-29-5.2 30 0-29 5.2-39 16.25"
              fill="none"
              stroke="#536976"
              strokeWidth=".45"
            />
            <path
              d="M-47-4.55-32-8.45-7-6.5 32-1.95 43 0 32 1.95-7 6.5-32 8.45-47 4.55Z"
              fill="#607586"
              stroke={paint}
              strokeWidth=".5"
            />
            <path d="M-39-4.55-26-6.5 0-3.9 34 0 0 3.9-26 6.5-39 4.55Z" fill={paint} opacity=".7" />
            {Array.from({ length: 17 }, (_, i) => -32 + i * 4).map((x, i) => {
              const half = Math.max(0.65, 5.2 - (x + 32) * 0.065);
              return (
                <g key={x} stroke="#344957" strokeWidth=".35">
                  <rect
                    x={x}
                    y={-half}
                    width={i % 3 === 0 ? 3 : 2}
                    height={half * 2}
                    fill={i % 2 ? '#9dacb5' : '#778d9b'}
                  />
                  <path d={'M' + x + ' 0h3'} stroke="#d0d8db" strokeWidth=".3" />
                </g>
              );
            })}
            <path d="M-44-5.85H-38V5.85H-44Z" fill="#9aadb7" stroke="#2d4352" strokeWidth=".6" />
            <path d="M-44-4.55H-38M-44 4.55H-38" stroke="#d5dce0" strokeWidth=".6" />
            <circle cx="-41" cy="-5.85" r="1.2" fill={paint} stroke="#354b5b" strokeWidth=".4" />
            <circle cx="-41" cy="5.85" r="1.2" fill={paint} stroke="#354b5b" strokeWidth=".4" />
            {Array.from({ length: 13 }, (_, i) => (i - 6) * 2.6).map(y => (
              <g key={y}>
                <rect x="-59" y={y - 0.65} width="3" height="1.3" rx=".5" fill="#293d4a" />
                <path d={'M-60 ' + y + 'H-58'} stroke="#ef927d" strokeWidth="1" />
              </g>
            ))}
            {[-1, 1].map(side => (
              <g key={side} transform={'scale(1 ' + side + ')'}>
                <path
                  d="M-44-13-27-11.05 0-5.85 27-1.95"
                  fill="none"
                  stroke="#a3b2bc"
                  strokeWidth=".35"
                />
                {[-38, -30, -22, -14, -6].map(x => (
                  <rect
                    key={x}
                    x={x}
                    y={-14.3 - x * 0.13}
                    width="2.5"
                    height="1.1"
                    fill={paint}
                    stroke="#354b5b"
                    strokeWidth=".3"
                  />
                ))}
              </g>
            ))}
          </>
        )}
        {item.shape === 'vulture' && (
          <>
            {/* Flight configuration, seen from above; every ship faces right. */}
            {[-1, 1].map(side => (
              <g key={side} transform={'scale(1 ' + side + ')'}>
                <path d="M-17-4-31-18" stroke="#354957" strokeWidth="9" />
                <path d="M-17-4-31-18" stroke={paint} strokeWidth="5" />
                <path
                  d="M-49-27-27-34 12-29 48-16 54-9 44-8 8-18-30-14-49-18Z"
                  fill={metal}
                  stroke={paint}
                  strokeWidth="1"
                />
                <path d="M-39-25-25-29 10-25 29-18 5-20-30-18Z" fill="#375c78" />
                <path d="M-28-32-28-15M-7-29-7-17M16-25 13-16" stroke="#354956" strokeWidth=".8" />
                <path d="M39-13 50-10" stroke="#2a3a47" strokeWidth="2" />
                <path d="M-49-23H-53" stroke="#8fd9f7" strokeWidth="3" />
              </g>
            ))}
            <path d="M-31-6Q-40 0-31 6L13 10Q36 8 36 0Q36-8 13-10Z" fill={metal} stroke={paint} />
            <path d="M-28-3H2L12 0 2 3H-28Z" fill="#365771" />
            <path d="M-14-6V6M6-8V8" stroke="#344a59" strokeWidth=".8" />
            <path d="M23-5 30-3M23 5 30 3" stroke="#e49a75" strokeWidth="2" />
            <path d="M-36-2V2" stroke="#8fd9f7" strokeWidth="3" />
          </>
        )}
        {item.shape === 'providence' && (
          <>
            {[-1, 1].map(side => (
              <g key={side} transform={'scale(1 ' + side + ')'}>
                <path d="M-52-12-39-23-19-24-23-14Z" fill={metal} stroke={paint} />
                <rect x="-54" y="-22" width="18" height="8" rx="3" fill={metal} stroke={paint} />
                <path d="M-56-18H-53" stroke="#85d6f4" strokeWidth="4" />
              </g>
            ))}
            <path
              d="M-50-12-36-18-18-23 17-20 39-14Q58-10 57 0Q58 10 39 14L17 20-18 23-36 18-50 12Z"
              fill={metal}
              stroke={paint}
            />
            <path d="M-19-22H-9V22H-19Z" fill={accent ?? '#365d79'} />
            <path
              d="M-44 0H51M-32-18V18M1-21V21M23-18V18M42-12V12"
              stroke="#3b5060"
              strokeWidth=".7"
            />
            <path d="M-38-7H13L32 0 13 7H-38Z" fill={paint} stroke="#526875" strokeWidth=".8" />
            <rect x="-30" y="-5" width="18" height="10" rx="2" fill="#405d72" stroke={paint} />
            <rect x="-27" y="-3" width="12" height="6" rx="1" fill={paint} />
            <circle cx="-21" r="2.5" fill="#d9e3df" stroke="#4c6574" strokeWidth=".8" />
            <path d="M24-7H38L46 0 38 7H24Z" fill={paint} stroke="#526875" strokeWidth=".8" />
            <path d="M36-5H42V5H36Z" fill="#293e4b" />
            <path d="M43-3 49 0 43 3" fill="none" stroke={accent ?? '#e3d198'} strokeWidth=".8" />
            {[-25, -3, 16].map(x => (
              <g key={x} fill={paint} stroke="#384d5d" strokeWidth=".5">
                <rect x={x} y="-17" width="4" height="4" rx="1" />
                <rect x={x} y="13" width="4" height="4" rx="1" />
                <path d={'M' + (x + 2) + '-15h4M' + (x + 2) + ' 15h4'} strokeWidth="1" />
              </g>
            ))}
            <path d="M-53-7V7" stroke="#89daf6" strokeWidth="3" />
          </>
        )}
        {item.shape === 'lucrehulk' && (
          <>
            {/* An open horseshoe and rear pylons around the spherical command core. */}
            <path d="M-47-6H-14V6H-47Z" fill={metal} stroke={paint} />
            {[-1, 1].map(side => (
              <path
                key={side}
                d="M-12-14-28-35-35-29-18-8Z"
                transform={'scale(1 ' + side + ')'}
                fill={metal}
                stroke={paint}
              />
            ))}
            <path
              d="M45.9-26.5A53 53 0 1 0 45.9 26.5L31.18 18A36 36 0 1 1 31.18-18Z"
              fill={metal}
              stroke={paint}
              strokeWidth=".8"
            />
            <path
              d="M-38.97-22.5A45 45 0 0 0-38.97 22.5"
              fill="none"
              stroke="#3e5b74"
              strokeWidth="6"
            />
            {Array.from({ length: 9 }, (_, i) => (i + 2) * 30).map(angle => (
              <g key={angle} transform={'rotate(' + angle + ')'}>
                <path d="M36 0H53" stroke="#415664" strokeWidth=".7" />
                <path d="M39 3H49" stroke={paint} strokeWidth="1" />
              </g>
            ))}
            {[-1, 1].map(side => (
              <g key={side} transform={'scale(1 ' + side + ')'}>
                <path d="M42-30 56-24V-18L36-19Z" fill={metal} stroke={paint} strokeWidth=".8" />
                <path d="M43-24H54" stroke="#1c303f" strokeWidth="3" />
                <path d="M49-28V-18" stroke="#58788d" strokeWidth="1.5" />
                <path d="M-11-45H11" stroke="#365d79" strokeWidth="5" />
              </g>
            ))}
            {[60, 110, 160, 200, 250, 300].map(angle => (
              <g key={angle} transform={'rotate(' + angle + ') translate(45 0)'}>
                <circle r="3.3" fill={paint} stroke="#3d5365" strokeWidth=".7" />
                <circle r="1.5" fill="#466375" />
                <path d="M-2 0H2" stroke="#d2dcde" strokeWidth=".7" />
              </g>
            ))}
            <circle r="18" fill={shade} stroke={paint} strokeWidth=".8" />
            <circle r="12" fill="none" stroke={paint} strokeWidth=".7" />
            <circle cx="-3" r="7" fill={paint} stroke="#456071" strokeWidth=".8" />
            <circle cx="-3" r="3" fill="#365367" />
            <path d="M7-6V6M10-4V4" stroke="#e4d39b" strokeWidth="1" />
            <path d="M-53-9V-3M-53 3V9" stroke="#8ddafa" strokeWidth="2" />
          </>
        )}
        {item.shape === 'home-one' && (
          <>
            <path
              d="M-52-9Q-48-31-16-24L22-18Q59-15 54 0Q59 15 22 18L-16 24Q-48 31-52 9Z"
              fill={metal}
              stroke={paint}
            />
            <path d="M-39-5Q0-12 47 0Q0 12-39 5Z" fill={paint} opacity=".6" />
            {[-25, -8, 10, 25].map(x => (
              <g key={x}>
                <ellipse
                  cx={x}
                  cy="-12"
                  rx="7"
                  ry="4"
                  fill={paint}
                  stroke="#887f74"
                  strokeWidth=".5"
                />
                <ellipse
                  cx={x}
                  cy="12"
                  rx="7"
                  ry="4"
                  fill={paint}
                  stroke="#887f74"
                  strokeWidth=".5"
                />
                <path d={'M' + x + '-16V16'} stroke="#34424b" opacity=".35" />
              </g>
            ))}
            <ellipse cx="25" rx="10" ry="5" fill={paint} stroke="#807f77" strokeWidth=".8" />
            <ellipse cx="28" rx="4" ry="2" fill="#415b65" />
            {[-8, 0, 8].map(y => (
              <g key={y}>
                <rect
                  x="-52"
                  y={y - 2.5}
                  width="17"
                  height="5"
                  rx="2"
                  fill={paint}
                  stroke="#807f77"
                  strokeWidth=".6"
                />
                <path d={'M-55 ' + y + 'H-52'} stroke="#83d6f4" strokeWidth="2" />
              </g>
            ))}
            <path d="M-30-3H28" stroke="#f0daa0" strokeWidth="1" strokeDasharray="2 4" />
          </>
        )}
        <BattlefieldCapitalShipArt
          shape={item.shape}
          paint={paint}
          metal={metal}
          accent={accent ?? '#6d8291'}
        />
        {item.shape === 'city' && (
          <g>
            <path d="M-18-1H18M-1-14V17" fill="none" stroke="#30404a" strokeWidth="2" />
            {[
              [-15, -10, 5, 4],
              [-8, -10, 5, 6],
              [2, -9, 6, 3],
              [10, -8, 4, 6],
              [-15, -3, 6, 7],
              [-7, 0, 4, 5],
              [1, -2, 7, 6],
              [11, 1, 4, 6],
              [-13, 7, 5, 4],
              [-5, 8, 4, 6],
              [3, 7, 5, 5],
              [11, 10, 4, 4],
            ].map(([x, y, width, height], i) => (
              <g key={i}>
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  rx=".5"
                  fill={i % 3 ? paint : metal}
                  stroke="#263944"
                  strokeWidth=".5"
                />
                <rect
                  x={x + 1}
                  y={y + 1}
                  width={width - 2}
                  height={height - 2}
                  rx=".3"
                  fill="#8498a4"
                />
                <path
                  d={'M' + (x + 1) + ' ' + (y + height - 1) + 'h' + (width - 2)}
                  stroke="#efd09a"
                  strokeWidth=".7"
                />
              </g>
            ))}
          </g>
        )}
        {item.shape === 'ion-cannon' && (
          <g>
            <circle r="11" fill="#596d7b" stroke="#263a47" strokeWidth=".8" />
            <circle r="9" fill={paint} stroke="#8da3af" strokeWidth=".6" />
            <path d="M-6-3A7 7 0 0 1 3-6" fill="none" stroke="#edf2ef" strokeWidth="1.5" />
            <rect x="5" y="-3" width="5" height="6" rx="1.5" fill="#8b9eaa" />
            <rect
              x="8"
              y="-1.75"
              width="13"
              height="3.5"
              rx=".8"
              fill="#dbe3e3"
              stroke="#6e8795"
              strokeWidth=".5"
            />
            <path d="M20-1.5V1.5" stroke="#344d60" strokeWidth="1.5" />
          </g>
        )}
        {item.shape === 'mining-facility' && (
          <g>
            <path d="M-15 7V-7H-5V-18H6V-7H17V7Z" fill={paint} stroke="#253541" />
            <path d="M-4-16V6M-14 2H17" stroke="#c4af86" strokeWidth="2" />
            <path d="M-10-3H-6M7-3H11" stroke="#ffe5a0" strokeWidth="2" />
          </g>
        )}
      </g>
    ),
    [id, paint, planet, shade, metal, accent, item.shape, textureId, texture.opacity],
  );
  return (
    <svg
      viewBox={`${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`}
      preserveAspectRatio={item.category === 'Ships' ? 'xMidYMid meet' : 'none'}
      width="100%"
      height="100%"
      {...frame}
      overflow="visible"
      aria-hidden="true"
      style={{ pointerEvents: 'none' }}
    >
      <defs>
        {planet && (
          <>
            <clipPath id={id + '-planet-clip'}>
              <circle r="50" />
            </clipPath>
          </>
        )}
        <radialGradient
          id={id + '-shade'}
          cx={lightDirection ? `${50 + lightDirection.x * 28}%` : '32%'}
          cy={lightDirection ? `${50 + lightDirection.y * 28}%` : sphere ? '24%' : '16%'}
          r="83%"
        >
          {shadeStops}
        </radialGradient>
        {item.shape === 'death-star' && (
          <linearGradient
            id={id + '-death-star-dish'}
            gradientUnits="userSpaceOnUse"
            x1={17 - nx * 12.2}
            y1={-20 - ny * 12.2}
            x2={17 + nx * 12.2}
            y2={-20 + ny * 12.2}
          >
            {/* A concave dish is illuminated on the side opposite the convex hull. */}
            <stop stopColor={paint} />
            <stop offset=".45" stopColor={`color-mix(in srgb, ${paint} 72%, #263c4c)`} />
            <stop offset="1" stopColor="#162d3d" />
          </linearGradient>
        )}
        <linearGradient
          id={id + '-metal'}
          {...(lightDirection ? gradient : { x1: '0', y1: '0', x2: '0', y2: '1' })}
        >
          <stop stopColor={paint} />
          <stop offset=".5" stopColor={paint} />
          <stop offset="1" stopColor="#273747" />
        </linearGradient>
        {lightDirection && (
          <>
            <linearGradient id={id + '-lighting'} {...gradient}>
              <stop stopColor="#fff4d9" stopOpacity=".12" />
              <stop offset=".45" stopColor="#fff4d9" stopOpacity="0" />
              <stop offset=".55" stopColor="#030914" stopOpacity="0" />
              <stop offset="1" stopColor="#030914" stopOpacity=".4" />
            </linearGradient>
            <mask
              id={id + '-surface-mask'}
              maskUnits="userSpaceOnUse"
              {...bounds}
              style={{ maskType: 'alpha' }}
            >
              <use href={'#' + id + '-surface'} />
            </mask>
          </>
        )}
        {item.shape === 'city' && (
          <radialGradient id={id + '-city-glow'}>
            <stop stopColor="#ffd18a" stopOpacity=".35" />
            <stop offset=".45" stopColor="#ffd18a" stopOpacity=".14" />
            <stop offset="1" stopColor="#ffd18a" stopOpacity="0" />
          </radialGradient>
        )}
      </defs>
      {item.shape === 'city' && (
        <ellipse cx="0" cy="2" rx="24" ry="22" fill={'url(#' + id + '-city-glow)'} />
      )}
      {surface}
      {lightDirection && (
        <rect
          {...bounds}
          fill={'url(#' + id + '-lighting)'}
          mask={'url(#' + id + '-surface-mask)'}
        />
      )}
    </svg>
  );
}

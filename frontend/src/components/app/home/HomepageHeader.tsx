import { cn } from '@/lib/utils.ts';
import type { CSSProperties } from 'react';
import swubaseLogo from '@/assets/logo-dark-theme.svg';
import { headerArtworks, headerImageBaseUrl } from './header/headerArtworks.ts';
import { homepageHeaderLayers, type HeaderLayer } from './header/homepageHeaderArtwork.ts';
import { HeaderArtworkCredits } from './header/HeaderArtworkCredits.tsx';

function imageAttributes(layer: HeaderLayer) {
  const artwork = headerArtworks[layer.image];
  // Gallery thumbnails preserve aspect ratio inside a 400 × 400 bounding box.
  const thumbnailWidth = Math.round(
    artwork.width * Math.min(1, 400 / Math.max(artwork.width, artwork.height)),
  );
  // object-fit: cover may scale an image to the layer's height instead of its width.
  // These sizes mirror the stage's desktop clamp and 120px mobile height in CSS.
  const aspectRatio = artwork.width / artwork.height;
  const desktopHeightFactor = (layer.frame[3] / 100) * aspectRatio;
  const mobileCoverWidth = 120 * (layer.mobileFrame[3] / 100) * aspectRatio;
  const desktopCoverWidth = `clamp(${(160 * desktopHeightFactor).toFixed(2)}px, ${(15 * desktopHeightFactor).toFixed(2)}vw, ${(200 * desktopHeightFactor).toFixed(2)}px)`;
  return {
    src: `${headerImageBaseUrl}/${artwork.imageKey}`,
    srcSet: `${headerImageBaseUrl}/${artwork.thumbnailKey} ${thumbnailWidth}w, ${headerImageBaseUrl}/${artwork.imageKey} ${artwork.width}w`,
    sizes: `(max-width: 640px) max(${layer.mobileFrame[2]}vw, ${mobileCoverWidth.toFixed(2)}px), max(${layer.frame[2]}vw, ${desktopCoverWidth})`,
  };
}

function layerStyle(layer: HeaderLayer, index: number): CSSProperties {
  const [left, top, width, height, rotation] = layer.frame;
  const [mobileLeft, mobileTop, mobileWidth, mobileHeight, mobileRotation] = layer.mobileFrame;
  return {
    '--art-left': `${left}%`,
    '--art-top': `${top}%`,
    '--art-width': `${width}%`,
    '--art-height': `${height}%`,
    '--art-rotation': `${rotation}deg`,
    '--art-mobile-left': `${mobileLeft}%`,
    '--art-mobile-top': `${mobileTop}%`,
    '--art-mobile-width': `${mobileWidth}%`,
    '--art-mobile-height': `${mobileHeight}%`,
    '--art-mobile-rotation': `${mobileRotation}deg`,
    '--art-focus': `${layer.focus[0]}% ${layer.focus[1]}%`,
    opacity: layer.opacity,
    zIndex: index,
  } as CSSProperties;
}

export function HomepageHeader() {
  return (
    <header
      className={cn(
        'homepage-header w-full max-w-380 my-0 mx-auto py-0 px-4',
        'max-mobile:py-0 max-mobile:px-2',
      )}
    >
      <div
        className={cn(
          'homepage-header-stage [--header-background:#17352e] [--header-accent:#dce7a0] relative isolate',
          'h-[clamp(160px,_15vw,_200px)] overflow-hidden border border-border/45 rounded-[20px] text-[#fffaf0]',
          'bg-[var(--header-background)]',
          'max-mobile:h-30 max-mobile:rounded-[12px]',
        )}
      >
        <div
          className="homepage-header-art absolute inset-0 pointer-events-none -z-3"
          aria-hidden="true"
        >
          {homepageHeaderLayers.map((layer, index) => {
            const artwork = headerArtworks[layer.image];
            return (
              <div
                key={layer.image}
                className={cn(
                  'homepage-header-layer absolute left-[var(--art-left)] top-[var(--art-top)] w-[var(--art-width)]',
                  'h-[var(--art-height)] [transform:rotate(var(--art-rotation))] origin-center overflow-hidden',
                  '[mask-image:linear-gradient(90deg,_transparent,_#000_18%,_#000_82%,_transparent)]',
                  'max-mobile:left-[var(--art-mobile-left)] max-mobile:top-[var(--art-mobile-top)]',
                  'max-mobile:w-[var(--art-mobile-width)] max-mobile:h-[var(--art-mobile-height)]',
                  'max-mobile:[transform:rotate(var(--art-mobile-rotation))]',
                )}
                data-gallery-id={artwork.galleryId}
                style={layerStyle(layer, index)}
              >
                <img
                  {...imageAttributes(layer)}
                  alt=""
                  width={artwork.width}
                  height={artwork.height}
                  decoding="async"
                  fetchPriority={index === 0 ? 'high' : 'auto'}
                  onError={event => {
                    event.currentTarget.style.visibility = 'hidden';
                  }}
                  className="block w-full h-full object-cover object-[var(--art-focus)]"
                />
              </div>
            );
          })}
        </div>
        <div
          className={cn(
            'homepage-header-shade absolute inset-0 pointer-events-none -z-2',
            '[background:linear-gradient(_90deg,_transparent_0%,_#17352e38_18%,_#17352ef5_39%,_#17352e_50%,_#17352ee6_61%,_#17352e20_84%,_transparent_100%_)]',
            'max-mobile:[background:linear-gradient(_0deg,_var(--header-background)_0%,_color-mix(in_srgb,_var(--header-background)_96%,_transparent)_25%,_color-mix(in_srgb,_var(--header-background)_15%,_transparent)_80%,_transparent_100%_)]',
          )}
          aria-hidden="true"
        />
        <div
          className={cn(
            'homepage-header-copy flex items-center justify-center gap-4 absolute left-1/2 top-1/2',
            'w-[min(90%,_530px)] [transform:translate(-50%,_-50%)] text-center',
            'max-mobile:gap-3 max-mobile:top-[44%] max-mobile:bottom-auto max-mobile:left-3 max-mobile:right-3',
            'max-mobile:w-auto max-mobile:[transform:translateY(-50%)] max-mobile:text-center',
            'max-small-phone:gap-2',
          )}
        >
          <img
            className={cn(
              'homepage-header-logo shrink-0 w-[clamp(64px,_7vw,_92px)] h-[clamp(64px,_7vw,_92px)] object-contain',
              '[filter:brightness(0)_invert(1)]',
              'max-mobile:w-13.5 max-mobile:h-13.5',
              'max-small-phone:w-12.5 max-small-phone:h-12.5',
            )}
            src={swubaseLogo}
            alt=""
            width={92}
            height={92}
          />
          <div className="homepage-header-text min-w-0">
            <h1
              className={cn(
                'm-0! p-0! text-[clamp(40px,_4.8vw,_64px)]! leading-none! tracking-[-0.06em]! text-inherit',
                'max-mobile:text-[34px]!',
                'max-small-phone:text-[30px]!',
              )}
            >
              <span className="font-[350]!">SWU</span>
              <strong className="font-[750]!">BASE</strong>
            </h1>
            <p
              className={cn(
                'mx-0! mt-2! mb-0! text-inherit text-[clamp(12px,_1vw,_13px)]! font-normal! leading-[1.6]! opacity-85',
                'max-mobile:mt-1! max-mobile:text-[10px]!',
                'max-small-phone:text-[9px]!',
              )}
            >
              Your Ultimate Star Wars: Unlimited Companion
            </p>
          </div>
        </div>
        <HeaderArtworkCredits />
      </div>
    </header>
  );
}

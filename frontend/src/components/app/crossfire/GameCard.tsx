import { useContext, useState, type CSSProperties, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { Shield, ShieldCheck, Plus, Minus, ArrowUp, Orbit, Coins, StarOff } from 'lucide-react';
import { GameCatalog } from './gameCatalog.ts';
import { CardMarkers } from './CardMarkers.tsx';
import { CardBack } from './CardBack.tsx';
import { useCardInspection } from './useCardInspection.ts';
import { getCardImageUrl } from '@/components/app/global/cardImageLib.ts';
import { selectDefaultVariant } from '../../../../../server/lib/cards/selectDefaultVariant.ts';
import type { VisibleCard } from '../../../../../play/view/types.ts';
import { cn } from '@/lib/utils.ts';
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
  HoverCardPortal,
} from '@/components/ui/hover-card.tsx';
import { Popover, PopoverContent } from '@/components/ui/popover.tsx';
import { Anchor } from '@radix-ui/react-popover';

export function FaceImage({
  face,
  back,
  className,
}: {
  face: Pick<NonNullable<VisibleCard['face']>, 'cardId' | 'name' | 'side'>;
  back?: boolean;
  className?: string;
}) {
  const catalog = useContext(GameCatalog);
  const card = catalog?.[face.cardId];
  const variant = card && selectDefaultVariant(card);
  const images = card && variant ? card.variants[variant]?.image : undefined;
  const src = getCardImageUrl((back ?? face.side === 'back') ? images?.back : images?.front);
  return src ? (
    <img
      src={src}
      alt={face.name}
      className={cn('object-contain', className)}
      loading="lazy"
      draggable={false}
    />
  ) : (
    <span className="cf-art-fallback">{face.name}</span>
  );
}
export function GameCard({
  card,
  highlighted,
  selected,
  onSelect,
  onInspect,
  copy,
  available = false,
  targeting = false,
  amount = 0,
  menu,
  closeMenu,
  animated = true,
  handFan = false,
  resourceBack = false,
  capturedBack = false,
  allocation,
}: {
  card: VisibleCard;
  highlighted: boolean;
  selected: boolean;
  copy: number;
  onSelect: (id: string) => void;
  onInspect: (id: string) => void;
  available?: boolean;
  targeting?: boolean;
  amount?: number;
  menu?: ReactNode;
  closeMenu?: () => void;
  animated?: boolean;
  handFan?: boolean;
  resourceBack?: boolean;
  capturedBack?: boolean;
  allocation?: { plusDisabled: boolean; minusDisabled: boolean; change: (remove: boolean) => void };
}) {
  const face = card.face;
  const inspection = useCardInspection(card.id, onInspect, !!face);
  const [markerOpen, setMarkerOpen] = useState(false);
  const inPlay = ['ground', 'space', 'base'].includes(card.zone);
  const isUnit = inPlay && face?.kind === 'unit';
  const combat = isUnit;
  const token = face?.token
    ? {
        shield: { icon: Shield, text: 'Shield' },
        experience: { icon: Plus, text: 'Experience' },
        advantage: { icon: ArrowUp, text: 'Advantage' },
        weakness: { icon: Minus, text: 'Weakness' },
        'the-force': { icon: Orbit, text: 'Force' },
        credit: { icon: Coins, text: 'Credit' },
      }[face.cardId]
    : undefined;
  const hp = face?.hp != null ? face.hp - card.damage : null;
  const label = `${face?.name ?? 'Face-down resource'}, copy ${copy}${card.zone === 'captured' ? ', captured' : card.exhausted ? ', exhausted' : ', ready'}${card.damage ? `, ${card.damage} damage` : ''}${isUnit && face.sentinel ? ', Sentinel active' : ''}${available ? (targeting ? ', legal target' : ', action available') : ''}${face?.notes?.length ? `, Named: ${face.notes.join(', ')}` : ''}${face?.warnings?.length ? `, ${face.warnings.join(' ')}` : ''}`;
  const content = (
    <Popover
      open={!!menu}
      onOpenChange={open => {
        if (!open) closeMenu?.();
      }}
    >
      <HoverCard
        openDelay={650}
        closeDelay={100}
        open={
          markerOpen || menu || targeting || !face || handFan || resourceBack ? false : undefined
        }
      >
        <Anchor asChild>
          <HoverCardTrigger asChild>
            <motion.button
              // The hand fan owns its transforms. Layout projection would compound
              // its pointer translation each render and send the card off screen.
              layout={animated && !handFan}
              layoutId={animated && !handFan ? card.id : undefined}
              type="button"
              data-card-handle={card.id}
              data-highlighted={highlighted}
              data-zone={card.zone}
              data-available={available}
              data-target={targeting && available}
              data-exhausted={card.exhausted}
              data-sentinel={isUnit && !!face.sentinel}
              data-warning={!!face?.warnings?.length}
              aria-label={label}
              aria-pressed={selected || amount > 0}
              {...inspection}
              onClick={() => onSelect(card.id)}
              className={cn(
                'cf-card',
                resourceBack && 'cf-resource-back',
                capturedBack && 'cf-captured-back',
                token && `cf-token cf-token-${face?.cardId}`,
                card.zone === 'base' && 'cf-card-landscape',
                card.attachedTo && 'cf-card-upgrade',
                highlighted && 'cf-card-highlighted',
                (selected || amount > 0) && 'cf-card-selected',
                targeting && !available && !selected && 'cf-card-muted',
              )}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            >
              <span className="cf-card-art">
                {token ? (
                  <span className="cf-token-label">
                    <token.icon />
                    <span>{token.text}</span>
                  </span>
                ) : face ? (
                  <>
                    {(resourceBack || capturedBack) && <CardBack />}
                    <FaceImage face={face} className="h-full w-full" />
                  </>
                ) : (
                  <CardBack />
                )}
              </span>
              {face && (
                <CardMarkers
                  notes={face.notes}
                  warnings={face.warnings}
                  onOpenChange={setMarkerOpen}
                />
              )}
              {isUnit && face.power !== null && (
                <span className="cf-stat cf-power" aria-label={`${face.power} power`}>
                  {face.power}
                </span>
              )}
              {isUnit && face.sentinel && (
                <span
                  className="cf-sentinel"
                  aria-label="Sentinel active"
                  title="Sentinel: enemy units in this arena must attack a Sentinel unless they can ignore it."
                >
                  <ShieldCheck size={13} />
                  <span>Sentinel</span>
                </span>
              )}
              {combat && hp !== null && (
                <span className="cf-stat cf-hp" aria-label={`${hp} remaining HP`}>
                  {hp}
                </span>
              )}
              {card.damage > 0 && (
                <span className="cf-damage" aria-label={`${card.damage} damage`}>
                  {card.damage}
                </span>
              )}

              {card.limitedActions.some(action => action.used >= action.max) && (
                <span className="cf-epic-markers">
                  {card.limitedActions
                    .filter(action => action.used >= action.max)
                    .map(action => {
                      const spent = action.used >= action.max;
                      const name = action.deployment
                        ? 'Deployment'
                        : action.max === 1
                          ? 'Epic Action'
                          : action.id.replace(/-/g, ' ');
                      const description = `${name}: ${spent ? 'used' : `${action.max - action.used} use${action.max - action.used === 1 ? '' : 's'} remaining`}`;
                      return (
                        <span
                          key={action.id}
                          className="cf-epic-marker"
                          data-spent={spent}
                          title={description}
                          aria-label={description}
                        >
                          <StarOff />
                          {action.max > 1 && <small>{Math.max(0, action.max - action.used)}</small>}
                        </span>
                      );
                    })}
                </span>
              )}
              {amount > 0 && !allocation && <span className="cf-selected-amount">{amount}</span>}
              <span className="sr-only">
                {face?.leaderUnit ? 'Leader unit. ' : ''}
                {face?.traits.join(' · ')}
              </span>
            </motion.button>
          </HoverCardTrigger>
        </Anchor>
        {face && (
          <HoverCardPortal>
            <HoverCardContent
              side="right"
              className="cf-preview w-64 p-2 pointer-events-none"
              collisionPadding={16}
            >
              <FaceImage face={face} className="max-h-[65dvh] w-full" />
              <p className="mt-2 text-center text-xs">
                {card.exhausted ? 'Exhausted' : 'Ready'}
                {combat && hp !== null ? ` · ${hp} / ${face.hp} HP` : ''} · Press I to inspect
              </p>
            </HoverCardContent>
          </HoverCardPortal>
        )}
      </HoverCard>
      {menu && (
        <PopoverContent
          className="cf-card-menu w-64 p-2"
          side="top"
          collisionPadding={12}
          onCloseAutoFocus={e => {
            e.preventDefault();
          }}
          aria-label={`Actions for ${face?.name ?? 'card'}`}
        >
          {menu}
        </PopoverContent>
      )}
    </Popover>
  );
  return allocation ? (
    <div
      className={`cf-assignment-target ${card.zone === 'base' ? 'cf-assignment-base' : ''}`}
      data-assignment-card={card.id}
    >
      {content}
      <div
        className="cf-assignment-controls"
        data-count={amount}
        aria-label={`Assignment to ${face?.name ?? 'card'}`}
      >
        <button
          type="button"
          aria-label={`Remove assignment from ${face?.name ?? 'card'}`}
          disabled={allocation.minusDisabled}
          onClick={() => allocation.change(true)}
        >
          <Minus size={14} />
        </button>
        <output aria-label="Assigned amount" aria-live="polite">
          {amount}
        </output>
        <button
          type="button"
          aria-label={`Add assignment to ${face?.name ?? 'card'}`}
          disabled={allocation.plusDisabled}
          onClick={() => allocation.change(false)}
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  ) : (
    content
  );
}
export function HiddenHand({ count }: { count: number }) {
  return (
    <div
      className="cf-hidden-hand"
      aria-label={`${count} hidden ${count === 1 ? 'card' : 'cards'}`}
    >
      {Array.from({ length: Math.min(count, 12) }, (_, i) => (
        <span
          key={i}
          className="cf-hidden-card"
          style={
            {
              '--fan-angle': `${(i - (Math.min(count, 12) - 1) / 2) * 2}deg`,
              '--fan-drop': `${Math.pow(i - (Math.min(count, 12) - 1) / 2, 2) * 0.6}px`,
            } as CSSProperties
          }
        >
          <CardBack />
        </span>
      ))}
      <span className="cf-hand-count">{count} cards</span>
    </div>
  );
}

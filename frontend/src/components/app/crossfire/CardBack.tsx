// One public asset for every hidden card; never derive a back URL from card identity.
export const DEFAULT_CARD_BACK_URL =
  'https://images.swubase.com/crossfire/card-backs/swu-default-c012e36fb016.jpg';

export function CardBack() {
  return (
    <span className="cf-card-back" aria-hidden="true">
      <img
        src={DEFAULT_CARD_BACK_URL}
        alt=""
        width={216}
        height={302}
        draggable={false}
        decoding="async"
      />
    </span>
  );
}

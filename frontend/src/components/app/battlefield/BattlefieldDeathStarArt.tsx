// Sphere geometry stays static while BattlefieldArt moves the shared light gradients.
export function BattlefieldDeathStarArt({
  id,
  paint,
  shade,
}: {
  id: string;
  paint: string;
  shade: string;
}) {
  return (
    <>
      <defs>
        <clipPath id={id + '-death-star-clip'}>
          <circle r="50" />
        </clipPath>
        <pattern id={id + '-death-star-panels'} width="8" height="6" patternUnits="userSpaceOnUse">
          <path
            d="M0 .6H8M0 3.6H8M1 .6V3.6M5 3.6V6.6"
            fill="none"
            stroke="#20313f"
            strokeWidth=".2"
          />
          <path d="M2 1.5H6M.5 4.5H3M6 5H7.5" stroke="#dce6e9" strokeWidth=".25" />
          <rect x="1.4" y="2" width="2.5" height=".5" fill="#152635" />
          <rect x="5.7" y="4.1" width="1.2" height=".8" fill="#304553" />
        </pattern>
      </defs>
      <circle r="50" fill={shade} stroke={paint} strokeWidth=".4" />
      <g clipPath={'url(#' + id + '-death-star-clip)'}>
        <circle r="50" fill={'url(#' + id + '-death-star-panels)'} opacity=".3" />
        {[-37, -27, -14, 14, 27, 37].map(y => (
          <path
            key={y}
            d={`M-50 ${y}Q0 ${y + 9} 50 ${y}`}
            fill="none"
            stroke="#344958"
            strokeWidth={Math.abs(y) === 27 ? '.8' : '.4'}
            opacity=".65"
          />
        ))}
        {[-35, -20, 20, 35].map(x => (
          <path
            key={x}
            d={`M${x / 3} -50Q${x * 1.8} 0 ${x / 3} 50`}
            fill="none"
            stroke="#304351"
            strokeWidth=".3"
            opacity=".5"
          />
        ))}
        {/* Recessed equatorial trench; the solid sphere remains underneath it. */}
        <path d="M-50 1Q0 7 50 1V4Q0 10-50 4Z" fill="#182a39" stroke="#57717f" strokeWidth=".3" />
        <path d="M-50 1Q0 7 50 1" fill="none" stroke={paint} strokeWidth=".55" />
        {Array.from({ length: 25 }, (_, i) => -48 + i * 4).map(x => (
          <path
            key={x}
            d={`M${x} ${5 - (x * x) / 850}v1.6`}
            stroke="#91a5af"
            strokeWidth=".4"
            opacity=".65"
          />
        ))}
        {[-1, 1].map(side => (
          <g key={side} transform={'scale(1 ' + side + ')'}>
            <path
              d="M-36 18H-25M-31 19H-20M-22 29H-12M-9 39H4"
              stroke={paint}
              strokeWidth=".6"
              opacity=".55"
            />
            <path
              d="M-38 12H-26M7 14H22M-13 23H1M22 32H30"
              stroke="#263d4e"
              strokeWidth="1.1"
              opacity=".6"
            />
          </g>
        ))}
        {/* Draw the recessed dish last so hull panel lines cannot cross it. */}
        <circle cx="17" cy="-20" r="13.4" fill="#344a59" stroke={paint} strokeWidth=".6" />
        <circle cx="17" cy="-20" r="12.2" fill={'url(#' + id + '-death-star-dish)'} />
        <circle cx="17" cy="-20" r="9.7" fill="none" stroke="#5a7180" strokeWidth=".4" />
        {Array.from({ length: 8 }, (_, i) => i * 45).map(angle => (
          <path
            key={angle}
            d="M20-20H28.7"
            transform={`rotate(${angle} 17 -20)`}
            stroke="#49616f"
            strokeWidth=".45"
          />
        ))}
        <circle cx="17" cy="-20" r="3" fill="#213c4c" stroke="#859ba6" strokeWidth=".4" />
        <circle cx="17" cy="-20" r="1.1" fill="#9bb6b5" />
      </g>
    </>
  );
}

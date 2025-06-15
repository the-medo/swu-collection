import { DISCORD_LINK } from '../../../../../shared/consts/constants.ts';
import React from 'react';

const DiscordPing: React.FC = () => {
  return (
    <p>
      If you think that is an error, pinging <b>@Medo</b> on
      <a
        href={DISCORD_LINK}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Join our Discord"
        className="px-2 underline"
      >
        Discord
      </a>
      with additional data is the fastest way to get it fixed!
    </p>
  );
};

export default DiscordPing;

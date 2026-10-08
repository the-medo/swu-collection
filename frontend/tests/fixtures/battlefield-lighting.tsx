/* eslint-disable react-refresh/only-export-components -- Standalone browser fixture mounts its own root. */
import { StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BattlefieldCanvas } from '../../src/components/app/battlefield/BattlefieldCanvas';
import { useBattlefieldLightMotion } from '../../src/components/app/battlefield/useBattlefieldLightMotion';
import { defaultBattlefieldScene } from '../../../shared/types/battlefield.ts';

const scene = {
  ...defaultBattlefieldScene(),
  placements: [
    {
      ...defaultBattlefieldScene('00000000-0000-4000-8000-000000000002').placements[0],
      itemId: 'planet',
      x: 800,
      y: 200,
      rotation: 0,
      scale: 1,
    },
  ],
};

function ProfileMotion() {
  const viewport = useRef<SVGSVGElement>(null);
  const [anchor, setAnchor] = useState(scene.light);
  const light = useBattlefieldLightMotion(anchor, viewport);
  return (
    <section data-testid="profile">
      <BattlefieldCanvas
        ref={viewport}
        scene={{ ...scene, light: anchor }}
        light={light}
        decorative
      />
      <output aria-label="Runtime light">
        {light.x} {light.y}
      </output>
      <output aria-label="Saved light">
        {anchor.x} {anchor.y}
      </output>
      <button onClick={() => setAnchor({ x: 1400, y: 350 })}>Change anchor</button>
    </section>
  );
}

function App() {
  const [worldLight, setWorldLight] = useState({ x: 400, y: 250 });
  const [frameWidth, setFrameWidth] = useState(800);
  const [mounted, setMounted] = useState(true);
  return (
    <>
      <div style={{ position: 'relative', height: 500, width: 800 }}>
        <div data-testid="top" style={{ position: 'absolute', top: 0 }}>
          <BattlefieldCanvas
            scene={scene}
            light={worldLight}
            lightFrame={{ x: 0, y: 0, width: 800, height: 200 }}
          />
        </div>
        <div data-testid="bottom" style={{ position: 'absolute', top: 300 }}>
          <BattlefieldCanvas
            scene={scene}
            light={worldLight}
            lightFrame={{ x: 0, y: 300, width: frameWidth, height: 200 }}
          />
        </div>
      </div>
      <button onClick={() => setWorldLight({ x: 650, y: -100 })}>Move shared light</button>
      <button onClick={() => setFrameWidth(0)}>Clear board layout</button>
      <div data-testid="saved-pose" hidden>
        <BattlefieldCanvas scene={scene} />
      </div>
      <output aria-label="Saved scene">{JSON.stringify(scene)}</output>
      <button onClick={() => setMounted(value => !value)}>Toggle profile</button>
      {mounted && <ProfileMotion />}
      <div style={{ height: 2000 }} />
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

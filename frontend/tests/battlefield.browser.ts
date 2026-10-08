// BATTLEFIELD_BROWSER_TEST=1 bun --env-file=.env --env-file=.env.worktree frontend/tests/battlefield.browser.ts [scenario ...]
// With no scenario arguments, run all cases. Each case gets an isolated synthetic user.
import { withBattlefieldFixture } from './battlefield/fixture';
import { entryScenario } from './battlefield/entry';
import { catalogScenario } from './battlefield/catalog';
import { viewportScenario } from './battlefield/viewport';
import { transformsScenario } from './battlefield/transforms';
import { objectsScenario } from './battlefield/objects';
import { layersScenario } from './battlefield/layers';
import { persistenceScenario } from './battlefield/persistence';
import { lightingScenario } from './battlefield/lighting';
import { responsiveScenario } from './battlefield/responsive';

const scenarios = {
  entry: entryScenario,
  catalog: catalogScenario,
  viewport: viewportScenario,
  transforms: transformsScenario,
  objects: objectsScenario,
  layers: layersScenario,
  persistence: persistenceScenario,
  lighting: lightingScenario,
  responsive: responsiveScenario,
};
const requested = process.argv.slice(2);
const selected = requested.length ? requested : Object.keys(scenarios);
for (const name of selected)
  if (!Object.hasOwn(scenarios, name))
    throw new Error(
      `Unknown Battlefield scenario: ${name}. Choose from: ${Object.keys(scenarios).join(', ')}.`,
    );
for (const name of selected) {
  console.log(`Checking Battlefield scenario: ${name}.`);
  await withBattlefieldFixture(name, scenarios[name as keyof typeof scenarios]);
  console.log(`PASS: Battlefield ${name}.`);
}

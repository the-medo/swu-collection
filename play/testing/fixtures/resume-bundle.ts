import { resumeRetained } from '../../host/bundles.ts';
const { directory, versions, checkpoint, input } = await Bun.stdin.json();
console.log(JSON.stringify(await resumeRetained(directory, versions, checkpoint, input)));

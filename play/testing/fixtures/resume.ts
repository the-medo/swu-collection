import { advance } from '../../engine/advance.ts';
import { decodeState } from '../../engine/checkpoint.ts';

const { state, input } = await Bun.stdin.json();
console.log(JSON.stringify(advance(decodeState(state), input)));

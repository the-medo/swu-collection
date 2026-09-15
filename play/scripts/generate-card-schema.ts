// Generate the complete data contract from the author's TypeScript definitions.
// Only the generated data schema ships in the server; the compiler is a dev tool.
import { ENGINE_VERSION } from '../engine/release.ts';
import ts from '../../frontend/node_modules/typescript/lib/typescript.js';
import { resolve } from 'node:path';
const file = resolve(import.meta.dir, '../cards/definition.ts');
const program = ts.createProgram([file], {
  strict: true,
  target: ts.ScriptTarget.ESNext,
  skipLibCheck: true,
});
const checker = program.getTypeChecker();
const source = program.getSourceFile(file)!;
const symbol = checker
  .getExportsOfModule(checker.getSymbolAtLocation(source)!)
  .find(s => s.name === 'CardDefinition')!;
const nodes: Record<string, unknown>[] = [];
const seen = new Map<ts.Type, number>();
function schema(type: ts.Type): number {
  const found = seen.get(type);
  if (found !== undefined) return found;
  const id = nodes.length;
  seen.set(type, id);
  nodes.push({});
  let node: Record<string, unknown>;
  if (type.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Never)) node = { union: [] };
  else if (type.flags & ts.TypeFlags.StringLiteral)
    node = { literal: (type as ts.StringLiteralType).value };
  else if (type.flags & ts.TypeFlags.NumberLiteral)
    node = { literal: (type as ts.NumberLiteralType).value };
  else if (type.flags & ts.TypeFlags.BooleanLiteral)
    node = { literal: checker.typeToString(type) === 'true' };
  else if (type.flags & ts.TypeFlags.Null) node = { literal: null };
  else if (type.flags & ts.TypeFlags.String) node = { type: 'string' };
  else if (type.flags & ts.TypeFlags.Number) node = { type: 'number' };
  else if (type.flags & ts.TypeFlags.Boolean) node = { type: 'boolean' };
  else if (type.isUnion())
    node = { union: type.types.filter(t => !(t.flags & ts.TypeFlags.Undefined)).map(schema) };
  else if (type.isIntersection() && type.types.every(t => checker.isArrayType(t)))
    node = { array: schema(checker.getIndexTypeOfType(type, ts.IndexKind.Number)!) };
  else if (checker.isArrayType(type))
    node = { array: schema(checker.getTypeArguments(type as ts.TypeReference)[0]!) };
  else if (checker.isTupleType(type)) {
    const target = (type as ts.TypeReference).target as ts.TupleType;
    if (target.elementFlags.some(f => f !== ts.ElementFlags.Required))
      throw new Error('Unsupported variable card tuple');
    node = { tuple: checker.getTypeArguments(type as ts.TypeReference).map(schema) };
  } else if (type.flags & (ts.TypeFlags.Object | ts.TypeFlags.Intersection)) {
    if (checker.getSignaturesOfType(type, ts.SignatureKind.Call).length)
      throw new Error(`Executable card property: ${checker.typeToString(type)}`);
    const properties: Record<string, number> = {},
      required: string[] = [];
    for (const property of checker.getPropertiesOfType(type)) {
      try {
        properties[property.name] = schema(checker.getTypeOfSymbolAtLocation(property, source));
      } catch (error) {
        throw new Error(`${property.name} in ${checker.typeToString(type)}: ${error}`);
      }
      if (!(property.flags & ts.SymbolFlags.Optional)) required.push(property.name);
    }
    const index = checker.getIndexTypeOfType(type, ts.IndexKind.String);
    node = { properties, required, additional: index ? schema(index) : false };
  } else throw new Error(`Unsupported card contract: ${checker.typeToString(type)}`);
  nodes[id] = node;
  return id;
}
const root = schema(checker.getDeclaredTypeOfSymbol(symbol));
const text = JSON.stringify({ root, nodes }) + '\n';
const output = resolve(
  import.meta.dir,
  `../cards/contracts/${ENGINE_VERSION.split('.').slice(0, 2).join('.')}.json`,
);
if (process.argv.includes('--check')) {
  if ((await Bun.file(output).text()) !== text)
    throw new Error('Card schema is stale; run bun play/scripts/generate-card-schema.ts');
} else await Bun.write(output, text);
console.log(`Crossfire card data schema: ${nodes.length} nodes`);

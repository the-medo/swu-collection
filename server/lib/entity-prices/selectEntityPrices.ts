import { sql } from 'drizzle-orm';
import { entityPrice } from '../../db/schema/entity_price.ts';

// Reusable JSON object for a single entity_price row
export const entityPriceJsonObject = sql`json_build_object(
  'entityId', ${entityPrice.entityId},
  'sourceType', ${entityPrice.sourceType},
  'type', ${entityPrice.type},
  'updatedAt', ${entityPrice.updatedAt},
  'data', ${entityPrice.data},
  'dataMissing', ${entityPrice.dataMissing},
  'price', ${entityPrice.price},
  'priceMissing', ${entityPrice.priceMissing}
)`;

// Correlated subquery returning an array of entity_price rows for a given entity id
export const selectEntityPricesArrayFor = (entityIdExpr: unknown) =>
  sql`COALESCE((
    SELECT json_agg(${entityPriceJsonObject})
    FROM ${entityPrice}
    WHERE ${entityPrice.entityId} = ${entityIdExpr}
  ), '[]'::json)`;

# Bounded implementer: order lifecycle core

Read AGENTS, PHASE_5_PLAN, fixed source DECISIONS_AND_CONSTRAINTS, foundation types, inventoryEngine, projectOrders, orderSnapshots, productionRecipe and existing inventory tests. Scope ONLY new src/shared/lib/businessOrders.ts, src/shared/lib/inventoryEngine.ts, src/shared/types/foundation.ts, new tests/business-orders.test.ts. Root owns index types (Order.items, order_revision/order_archived already added), SQL/repository/API/UI. No commit/push/install/E2E/cloud/full test. Focused compile/test allowed. Send final contract early, then implement red/green.

Required exported contract:
```
type BusinessOrderCommand = {id:string;occurredAt:string} & (
 | {kind:'saveBusinessOrder';order:Order;items?:OrderItem[];expectedRevision:number;isNew:boolean}
 | {kind:'archiveBusinessOrders';orderIds:string[]}
 | {kind:'returnOrderFinished';orderItemId:string;quantity:number}
);
isBusinessOrderCommand({kind:string}): boolean typeguard
applyBusinessOrderCommand(state,command): FoundationState
reserveOrderItems(state,orderId,eventId,occurredAt): FoundationState
```

Head command/order JSON must not retain UI `items` field; snapshots and physical facts live in orderItems. Command IDs event-key stable, same replay no repeated inventory. Head order revision starts0/new then +1 per edit; mismatch throws BUSINESS_ORDER_REVISION_CONFLICT:<id>. Receipt replay handled root repo/SQL before stale checks, so pure retry only needs preserve idempotent stable command semantics when reasonable.

New save items must be full OrderItem drafts (id/owner/created/order IDs fixed root), calculate snapshot verification via central calculatePrintCost. Product snapshot is frozen, no later read/reprice. Existing save with items undefined preserves existing line snapshots/costs/physical facts. Explicit edits allowed only before any production; release previous reserve on changed/deleted items before reserving replacements, preserve archived item IDs/audit. No unintended metadata change on status/payment edit. Legacy items provenance legacy retain historical costs/quantity, no retroactive production during financial edits on already-later-status head; new business items may be produced by threshold. Expense head has no production.

Stock2/order5 immediately reserves2 at basis, remaining3 no error. Store reserved_quantity and returned_quantity (optional default0 fields on OrderItem), archived optional; fulfilled_quantity counts reserved/produced allocated units. Existing total_cost can represent actual reserved + frozen estimated remainder; before fulfill ensure inventoryEngine doesn't count estimate twice. Head cost sums actual reserved + remaining estimate, then entirely actual on production threshold. Threshold Печать and every listed later status, first reach/directskip only. Before printing fulfill should consume new available stock then produce remaining; correct provenance, production quantities, deficit floor0. Snapshots untouched. Support manual/null-product items producing frozen recipe via nullable product_id ProductionEvent (no fake catalog IDs/FKs). Existing inventoryEngine fulfill tests remain compatible.

Archive/production cancellation: retain head + archived marker and items/audit, do not return filament. If item has never produced, release reserved units at ORIGINAL actual basis; if produced, do not autoreturn allocated units. Explicit returnOrderFinished adds finished stock only for valid product, <= fulfilled-returned units and actual unit basis, finished_return ledger; return does not reopen production or erase original order cost/history.

Tests must cover stock2/order5+production_stock1→directГотово consumes only remaining2, mixed/current cost basis, repeatedstatus/no material return, directmanualrecipe, shortage, finance snapshot preservation/legacy laterstatus, staleorder revision, safe archive/explicitreturn/no duplicate, wrongowner/NaN/quantity validation. Do not weaken existing tests. Snapshot receipt/head monetary invariants remain.

Ruling: explicit quantity/recipe changes after printing rejected with actionable warning. User can create separate item/order instead; do not silently erase physical history. Preprint estimate frozen to opening calculation; new production current variant average. Legacy no-recipe item keeps historical cost and does not invent material recipe.

Write report .codex-tmp/phase-modernization/order-lifecycle-core-report.md, include exports, schema fields required, focused check results and limitations. Ask root only if contract cannot safely work; continue independent tests otherwise.

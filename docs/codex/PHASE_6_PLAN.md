# Final integration and complete backup implementation plan

> For agentic workers: use subagent-driven-development, bounded ownership and root gate. No intermediate commits or E2E; final push only after both complete npm commands pass.

Goal: complete stage6 without introducing new commercial rules, restore maintenance functionality for the coherent modern state and verify all integrations.
Architecture: BackupV3 contains the full same-owner FoundationState plus legacy resources/settings/goals, calculation draft and durable pending state. Import validates the complete bundle and references before mutation. Modern restore/reset uses a single owner-lock/CAS/receipt RPC; local atomic journal and durable maintenance intent preserve offline functionality until SQL is installed. Existing V1/V2 import remains compatible on legacy-only state; cannot replace new business history with an incomplete legacy backup. Direct order/catalog/ledger DML remains denied.
Tech stack: existing TypeScript/React/Next16, localStorage+WebLocks, Supabase/Postgres18. No dependencies.
Spec: new-qust/3d_labs_codex_instructions/docs/codex/06_PHASE_FINAL_QA.md, DECISIONS_AND_CONSTRAINTS.md, ACCEPTANCE_CHECKLIST.md; existing DataManagement workflows must remain usable with introduced business entities.

Global constraints: preserve all fixed calculations/payment-cost/snapshots/retail rules. Never apply cloudSQL. User authorized codex/business-modernization final push, main/test unchanged. Final npmtest+npmrun test:e2e bothpass, snapshotupdate permission still required. Automationdelete after allcomplete.

### Task1: full backup trust boundary and local atomic maintenance
Files: dataBackup.ts, new businessBackup.ts, atomicLocalSnapshot.ts, tests/data-backup and business-backup/local snapshot tests. Agent owns these only.
Interfaces: DataBackupV3 extends full legacy snapshot {version:3,exportedAt,business:FoundationState,calculationDraft?:unknown}; ParsedDataBackup adds business/calculationDraft. createDataBackup optional business choosesV3 elselegacyV2. parseV3 validates business full schema plus referenced IDs and financial/physical counters, consistent legacy heads/catalog arrays, nested owner boundaries; owner mustsame except legacyownerless resources. Export may include pendingInventory/conflictbackups as recovery facts; restored queue mustnot silently replay already-materialized physicalfacts after cloudrestore. Helpers copy inputs.
- [ ] meaningful red/green parser/owner/reference/history/pending preservation cases
- [ ] atomic local journal write with rollback on quota and recovery after interruption; input map key->string|null, Storage get/set/remove; commitLocalSnapshot/recoverLocalSnapshot. No application API modifications.
- [ ] review and focused checks, report

### Task2: root maintenance integration and SQL
Files: db.ts, inventoryRepository/Transport.ts, foundationStorage.ts if recovery bridge needed, InventoryProvider/context/DataProvider, supabase_migration_20261001_business_maintenance.sql+schema, tests/sql and maintenance integrationtests.
- [ ] design durable pendingMaintenance intent {id,occurredAt,expectedRemoteRevision,snapshot}, captured BEFORE destructive local replacement; old pending commands archived as recovery, not replayed twice after snapshotrestore
- [ ] same-owner restore RPC with receipt before CAS, checked complete bundle/foreign refs, transaction replaces only currentowner in correct FKorder, controlled immutable-delete allowance, monotonic revision. Preserve receipt evidence for late commands; generation check if required to reject pre-reset offline writes.
- [ ] offline same-owner replacement preserved as coherent journal/outbox, retry missingmigration, clear/reseed built as complete snapshot with safe financial-only backfill, server errors do not discard local priorstate
- [ ] V3export integrated API uses canonical heads/catalog including archive/audit plus full local state/draft, no incomplete screenprojection
- [ ] DataManagement export/reset/restore and app refresh coherent; explicit serverconflictaccept keeps local completebackup, no automatic overwrite
- [ ] disposableSQL repeatedmigration/rollback/owner/receipts/history/crossFK checks; no serverSQL

### Task3: bounded UI integration audit
Files: ProductsList KPI aggregation/helper tests, FinishedStockPanel manual-adjustreason interface if necessary, relevant labels only. Agent UI owns these; root owns maintenanceUI.
- [ ] stock KPI cost uses actual finished balance weightedbasis *onhand, retail unitprices dividebatch once; catalog price/profit are separate planned values. No changes to product savedvalues/history.
- [ ] ensure zero overrides are displayed as0 (no truthy base_cost fallback), minusprofit strings do not become'+-'; actualprofit labels/margins remain clear
- [ ] responsive/accessibility smoke regressions; report

### Task4: final gate and handoff
- [ ] independent scoped review, allchecklist rows evidence, migrate docs exactblocks
- [ ] fresh npmtest, tsc/lint/build, browser mainflows
- [ ] stop dev server if fullsuite uses its own prodserver, final npmtest+npmrun test:e2e; fixfailures and rerun both, never update snapshots without authorization
- [ ] commit/push only codex/business-modernization afterbothpass, attach PR onlyifcreated (notrequested)
- [ ] final conciseRussian report includes migrationsequence, testcounts+reportpath and material limits; delete automation3d-labs onlywhentaskcomplete

Ruling: same-owner V3 restore avoids silently inventing cross-owner historical identity; foreignowner import rejected with clearcopy. Complete backup canalways be exported locally before migration. Destructive same-owner local changes use recoverable journal and durablecloudintent, never silently replace newer serverrevision.

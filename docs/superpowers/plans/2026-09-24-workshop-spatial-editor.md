# Workshop spatial editor

Authorized scope: user requested implementation, branch test only, preserve improved scene appearance. No commit/push or remote migration. Existing unrelated changes remain untouched.

1. Domain: adjacent room attachment tree, derived world origins, overlap/resize validation; editable labels per room; migrate legacy separate rooms into an adjacent chain; preserve local furniture coordinates and occupied slots. Tests.
2. Scene: render all rooms together with shared partitions and decorative doors, projected in-scene add buttons and drag sizing for rooms/furniture, surface picking for labels. Camera: closer initial view; primary selects/drags, secondary pans, middle/Alt-primary orbits, wheel zoom, touch navigation. Keep rendering/light quality.
3. UI: remove room dropdown/create/edit modals. Room tools only in edit mode; inline contextual editor for room names and text/color/surface/size. Bridge scene actions to validated mutations and persistence. Tables sized on half-meter cells.
4. Storage: additive room metadata migration and canonical schema; prevent legacy RPC from silently dropping attachments/text; local fallback until migration. Never apply remotely.
5. Verification: targeted domain tests, browser authoring and reload, camera/touch, room collision and occupied-slot constraints, test and build, final review.

Data contract: Room.attachment?: {roomId:string, side:'north'|'east'|'south'|'west'}; room origin derives recursively from parent dimensions, centered along its edge. Room.labels?: {id,text,color,surface:'floor'|'north'|'east'|'south'|'west',u:number,v:number,size:number,rotation?:number}[]; u/v normalized 0..1. Furniture coordinates remain room-local. Optional metadata preserves old payload compatibility.

Rulings: one child per available side; minimum room 4m to preserve existing schema constraints. Tables use 0.5m cells. Resizes reject collisions and removal of occupied slots. Doors are decorative openings, not navigation. Existing rooms become a contiguous eastward chain on normalization; equipment stays in its room.

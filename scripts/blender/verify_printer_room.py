"""Independent glTF round-trip bounds, topology, primitive and material verification."""
import bpy,json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'public/models/printer-room';SRC=ROOT/'assets/blender/printer-room'
expected=json.loads((OUT/'stats.json').read_text());results={}
for name,record in expected.items():
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(OUT/f'{name}.glb'))
    objects=[o for o in bpy.context.scene.objects if o.type=='MESH'];points=[];triangles=0
    for o in objects:
        points.extend(o.matrix_world@Vector(v) for v in o.bound_box)
        o.data.calc_loop_triangles();triangles+=len(o.data.loop_triangles)
        assert all(len(p.vertices)>=3 for p in o.data.polygons)
    lo=[min(p[i] for p in points) for i in range(3)];hi=[max(p[i] for p in points) for i in range(3)]
    actual={'min':[lo[0],lo[2],-hi[1]],'max':[hi[0],hi[2],-lo[1]]}
    for bound in ['min','max']:
        assert all(abs(a-b)<.00001 for a,b in zip(actual[bound],record['bounds_gltf'][bound])),(name,actual,record)
    assert triangles==record['triangles'];assert len(objects)==record['meshes']
    results[name]={'roundtrip':'passed','triangles':triangles,'meshes':len(objects),'worldBounds':actual}
(SRC/'verification.json').write_text(json.dumps(results,indent=2));print(json.dumps(results))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(OUT/'a1.glb'))
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.world.color=(.20,.22,.25)
for name,loc,color,power in [('Key',(-2,-3,4),(1,.85,.7),250),('Fill',(2,1,3),(.65,.8,1),160)]:
    d=bpy.data.lights.new(name,'AREA');d.energy=power;d.color=color;d.size=3
    o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,.35))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(1,-1.6,1.05));cam=bpy.context.object;cam.rotation_euler=(Vector((.02,0,.37))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=1.07;scene.camera=cam
scene.render.resolution_x=900;scene.render.resolution_y=900;scene.render.resolution_percentage=100;scene.render.filepath=str(SRC/'a1-import-preview.png');scene.render.image_settings.file_format='PNG';bpy.ops.render.render(write_still=True)

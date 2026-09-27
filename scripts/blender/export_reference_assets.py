"""Export the ten reference assets, preserving editable native Blender masters."""
from pathlib import Path
import bpy, json, runpy, sys
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
HERE=Path(__file__).parent
api=runpy.run_path(str(HERE/'rebuild_workshop_assets.py'))
printers=runpy.run_path(str(HERE/'reference_printers.py'))
decor=runpy.run_path(str(HERE/'reference_decor.py'))
furniture=runpy.run_path(str(HERE/'reference_furniture.py'))
TASKS=[('printer-a1',printers['build_a1']),('printer-p1',printers['build_p1']),('filament-spool',printers['build_spool']),('filament-rack',furniture['build_filament_rack']),('workbench',furniture['build_workbench']),('printer-rack',furniture['build_printer_rack']),('packing-boxes',decor['build_boxes']),('plant',decor['build_plant']),('tool-cabinet',decor['build_cabinet']),('room-module',furniture['build_room'])]
PARTS={'filament-rack','workbench','printer-rack','room-module'}

def ensure_uv(obj):
    if obj.type!='MESH' or obj.data.uv_layers:return
    mesh=obj.data;uv=mesh.uv_layers.new(name='SurfaceUV')
    points=[v.co for v in mesh.vertices]
    if not points:return
    lo=[min(p[i] for p in points) for i in range(3)];hi=[max(p[i] for p in points) for i in range(3)]
    for face in mesh.polygons:
        normal=face.normal;dominant=max(range(3),key=lambda i:abs(normal[i]));axes=[i for i in range(3) if i!=dominant]
        for index in face.loop_indices:
            point=mesh.vertices[mesh.loops[index].vertex_index].co
            uv.data[index].uv=tuple((point[i]-lo[i])/max(.001,hi[i]-lo[i]) for i in axes)

def export(name,builder):
    api['reset']();builder(api);scene=bpy.context.scene
    for obj in scene.objects:ensure_uv(obj)
    scene['source']='Reference-specific native Blender revision 3'
    scene['reference']=dict(zip([item[0] for item in TASKS],range(1,11)))[name]
    scene['generator']='scripts/blender/export_reference_assets.py'
    scene['web_axis']='Z-up; export_yup=False'
    scene['editable']=True
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender'/f'workshop-{name}.blend'))
    bpy.ops.object.select_all(action='SELECT');bpy.context.view_layer.objects.active=next(iter(scene.objects))
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    bpy.ops.object.convert(target='MESH')
    if name not in PARTS:
        for obj in list(scene.objects):
            if len(set(p.material_index for p in obj.data.polygons))>1:
                bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
                bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.separate(type='MATERIAL');bpy.ops.object.mode_set(mode='OBJECT')
        buckets={}
        for obj in list(scene.objects):
            used=set(p.material_index for p in obj.data.polygons)
            assert len(used)==1,(name,obj.name,used)
            mat=obj.data.materials[next(iter(used))]
            obj.data.materials.clear();obj.data.materials.append(mat)
            for p in obj.data.polygons:p.material_index=0
            buckets.setdefault(mat.name,[]).append(obj)
        for mat,objects in buckets.items():
            bpy.ops.object.select_all(action='DESELECT')
            for obj in objects:obj.select_set(True)
            bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();bpy.context.object.name=mat
    for obj in scene.objects:
        bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
        bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
        scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    bpy.ops.object.select_all(action='SELECT')
    target=ROOT/'public/models/workshop'/f'{name}.glb'
    bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',use_selection=True,export_apply=True,export_yup=False,export_extras=True,export_image_format='AUTO')
    points=[];triangles=0;mats=set()
    for obj in scene.objects:
        obj.data.calc_loop_triangles();triangles+=len(obj.data.loop_triangles)
        points.extend(obj.matrix_world@Vector(p) for p in obj.bound_box)
        mats.update(m.name for m in obj.data.materials)
    size=[max(p[i] for p in points)-min(p[i] for p in points) for i in range(3)]
    assert triangles<90000,(name,triangles)
    return {'name':name,'triangles':triangles,'bytes':target.stat().st_size,'size_z_up':size,'materials':len(mats),'meshes':len(scene.objects),'reference':scene['reference']}

if __name__=='__main__':
    only=sys.argv[sys.argv.index('--only')+1].split(',') if '--only' in sys.argv else None
    path=ROOT/'public/models/workshop/metrics.json'
    results={item['name']:item for item in json.loads(path.read_text())} if path.exists() else {}
    for name,builder in TASKS:
        if not only or name in only:results[name]=export(name,builder)
    path.write_text(json.dumps([results[n] for n,_ in TASKS if n in results],indent=2)+'\n')
    print('REFERENCE_EXPORTS_COMPLETE',list(results))

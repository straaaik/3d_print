"""Reimport final web GLBs into clean scenes; validate and render the actual exports."""
import bpy, math, json, sys
from pathlib import Path
from mathutils import Matrix, Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'docs/workshop-renders';OUT.mkdir(parents=True,exist_ok=True)
metrics=json.loads((ROOT/'public/models/workshop/metrics.json').read_text())
checks=[]
for entry in metrics:
    if '--only' in sys.argv and entry['name'] not in sys.argv[sys.argv.index('--only')+1].split(','):continue
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/models/workshop'/f"{entry['name']}.glb"))
    objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
    transforms=[(o,Matrix.Rotation(-math.pi/2,4,'X')@o.matrix_world.copy()) for o in objects]
    for o,matrix in transforms:o.parent=None;o.matrix_world=matrix
    for o in list(bpy.context.scene.objects):
        if o.type!='MESH':bpy.data.objects.remove(o,do_unlink=True)
    bpy.context.view_layer.update()
    points=[o.matrix_world@Vector(c) for o in objects for c in o.bound_box]
    low=Vector([min(p[i] for p in points) for i in range(3)]);high=Vector([max(p[i] for p in points) for i in range(3)])
    size=high-low
    assert all(abs(size[i]-entry['size_z_up'][i])<.0001 for i in range(3)),entry['name']
    tris=0
    for o in objects:
        o.data.calc_loop_triangles();tris+=len(o.data.loop_triangles)
        assert not o.data.validate(),o.name
    assert tris==entry['triangles'],(entry['name'],tris)
    # Keep all objects grounded and center the asset for product-view comparison.
    center=(low+high)/2
    for o in objects:o.location-=Vector((center.x,center.y,low.z))
    scale=max(size)
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=True
    scene.render.resolution_x=800;scene.render.resolution_y=800;scene.render.resolution_percentage=100
    scene.world=bpy.data.worlds.new('Studio environment');scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.12,.16,.23,1)
    scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.22
    scene.view_settings.view_transform='AgX'
    scene.view_settings.look='AgX - Medium High Contrast'
    floor=bpy.data.materials.new('Studio slate');floor.use_nodes=True
    floor.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.027,.036,.05,1)
    floor.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.75
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.001));bpy.context.object.data.materials.append(floor)
    for name,loc,power,area in [('Key',(-2,-3,4),260,2.5),('Rim',(2,1,3),400,2),('Fill',(1,-2,1),65,2)]:
        data=bpy.data.lights.new(name,'AREA');data.energy=power*scale*scale;data.shape='DISK';data.size=area*scale
        obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=Vector(loc)*scale
        obj.rotation_euler=(Vector((0,0,size.z*.45))-obj.location).to_track_quat('-Z','Y').to_euler()
    data=bpy.data.cameras.new('Product camera');camera=bpy.data.objects.new('Product camera',data);scene.collection.objects.link(camera)
    view=(-1.8,-2.8,1.05) if entry['name']=='filament-spool' else (1.25,-2.7,1.00)
    if entry['name'] in ('workbench','room-module'):view=(1.8,-2.7,1.9)
    camera.location=Vector(view)*scale+Vector((0,0,size.z*.38))
    target=Vector((0,0,size.z*.49));camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
    data.type='ORTHO';scene.camera=camera
    bpy.context.view_layer.update()
    view_matrix=camera.matrix_world.inverted()
    projected=[view_matrix@(p-Vector((center.x,center.y,low.z))) for p in points]
    data.ortho_scale=max(max(p[i] for p in projected)-min(p[i] for p in projected) for i in (0,1))*1.14
    scene.render.filepath=str(OUT/f"{entry['name']}.png")
    bpy.ops.render.render(write_still=True)
    checks.append({'name':entry['name'],'triangles':tris,'dimensions_m':list(size),'reimport':'passed'})
(ROOT/'assets/blender/verification.json').write_text(json.dumps(checks,indent=2)+'\n')
print('VERIFIED_AND_RENDERED',len(checks))

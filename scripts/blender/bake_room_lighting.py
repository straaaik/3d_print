"""Render floor-only irradiance patches from real Blender Cycles lights/occluders.
Does not modify or regenerate any GLB. Run with Blender 5 --background --python.
Output: opaque sRGB PNG, Standard transform, exposure 0, no artistic tonemapping.
PNG left/right = world -X/+X. PNG top/bottom = glTF -Z/+Z.
"""
import bpy, math, hashlib
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'public/models/printer-room'; SRC=ROOT/'assets/blender/printer-room'
hashes={name:hashlib.sha256((OUT/name).read_bytes()).hexdigest() for name in ['a1.glb','a1-lod.glb']}

def clear():
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)

def import_occluder(name,x=0,y=0):
    before=set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(OUT/f'{name}.glb'))
    for o in set(bpy.context.scene.objects)-before:
        if not o.parent:o.location.x+=x;o.location.y+=y
        if o.type=='MESH':o.visible_camera=False

def strip(name,x,y,z,power,width,depth=.06):
    data=bpy.data.lights.new(name,'AREA');data.energy=power
    data.color=(1.0,.61,.28);data.shape='RECTANGLE';data.size=width;data.size_y=depth
    o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.location=(x,y,z)
    # Default area light emits along -Z, directly down towards floor.
    return o

def scene_setup(width,depth,resx,resy):
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=192
    scene.cycles.use_denoising=True;scene.cycles.max_bounces=8
    scene.world.use_nodes=True
    w=scene.world.node_tree.nodes.get('Background');w.inputs['Color'].default_value=(.72,.78,.85,1);w.inputs['Strength'].default_value=.15
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.003));floor=bpy.context.object;floor.name='White diffuse irradiance receiver'
    mat=bpy.data.materials.new('Unit white Lambert receiver');mat.use_nodes=True
    nodes=mat.node_tree.nodes;nodes.clear();d=nodes.new('ShaderNodeBsdfDiffuse');d.inputs['Color'].default_value=(1,1,1,1);d.inputs['Roughness'].default_value=0
    out=nodes.new('ShaderNodeOutputMaterial');mat.node_tree.links.new(d.outputs[0],out.inputs['Surface']);floor.data.materials.append(mat)
    bpy.ops.object.camera_add(location=(0,0,5));cam=bpy.context.object;cam.name='Top down floor patch';cam.rotation_euler=(0,0,0)
    cam.data.type='ORTHO';cam.data.sensor_fit='VERTICAL';cam.data.ortho_scale=depth;scene.camera=cam
    scene.render.resolution_x=resx;scene.render.resolution_y=resy;scene.render.resolution_percentage=100
    scene.render.pixel_aspect_x=(width/depth)/(resx/resy);scene.render.pixel_aspect_y=1
    scene.view_settings.view_transform='Standard';scene.view_settings.look='None';scene.view_settings.exposure=0;scene.view_settings.gamma=1
    scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGB';scene.render.image_settings.color_depth='8';scene.render.film_transparent=False
    return scene

clear()
scene=scene_setup(1.45,2.2,256,384)
for x in [-2.90,-1.45,0,1.45,2.90]:
    import_occluder('workbench',x)
    for y in [-.49,.49]:strip('Continuous warm apron strip',x,y,.705,3.0,1.33,.06)
scene.render.filepath=str(OUT/'bench-lightmap.png');bpy.ops.render.render(write_still=True)
# Keep bench setup separately in the same editable .blend as the shelf study.
bench_collection=bpy.data.collections.new('Bench floor lighting setup');scene.collection.children.link(bench_collection)
for o in list(scene.objects):
    for c in list(o.users_collection):c.objects.unlink(o)
    bench_collection.objects.link(o)
bench_collection.hide_render=True;bench_collection.hide_viewport=True

scene=scene_setup(2.8,1.6,448,256)
import_occluder('shelf',0,.55)
for x in [-2.8,2.8]:import_occluder('shelf',x,.55)
for x in [-2.8,0,2.8]:
    # Shelf lower light washes forward, and upper shelves add soft bounced light.
    strip('Shelf toe kick warm wash',x,.285,.16,.65,2.66,.08)
    strip('Shelf upper warm spill',x,.24,.69,2.1,2.66,.10)
scene.render.filepath=str(OUT/'shelf-lightmap.png');bpy.ops.render.render(write_still=True)
scene.render.filepath=str(SRC/'lighting-study.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(SRC/'lighting-study.blend'))
for name,expected in hashes.items():
    actual=hashlib.sha256((OUT/name).read_bytes()).hexdigest()
    assert actual==expected,(name,expected,actual)
    print('PRINTER_UNCHANGED',name,actual)
print('LIGHTMAP_CONTRACT bench: 1.45 x 2.2m, 256x384; shelf 2.8 x 1.6m, 448x256; sRGB Standard exposure 0; top -Z, bottom +Z; pure Lambert radiance.')

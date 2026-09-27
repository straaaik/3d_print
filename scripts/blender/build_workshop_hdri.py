"""Render a small, original studio HDRI for local workshop reflections (no downloads)."""
import bpy
import math
from pathlib import Path

root = Path(__file__).resolve().parents[2]
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = 32
scene.cycles.use_denoising = True
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.16, .19, .25, 1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value = .25

def panel(name, location, scale, color, emission=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    material = bpy.data.materials.new(name)
    material.diffuse_color = (*color, 1)
    material.use_nodes = True
    shader = material.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Roughness'].default_value = .8
    shader.inputs['Emission Color'].default_value = (*color, 1)
    shader.inputs['Emission Strength'].default_value = emission
    obj.data.materials.append(material)

panel('Neutral studio floor', (0, 0, -.1), (18, 16, .2), (.14, .15, .18))
panel('Cool rear wall', (0, 8, 3.5), (18, .1, 7), (.25, .29, .38))
panel('Warm side wall', (-9, 0, 3.5), (.1, 16, 7), (.36, .32, .28))
panel('Broad warm key softbox', (-4, -2, 6.4), (5, 3, .08), (1, .85, .66), 5)
panel('Cool vertical reflection', (5, 2, 3.2), (.08, 3, 4), (.69, .8, 1), 3)
panel('Ceiling diffusion', (1, 3, 6.8), (4, 2, .08), (1, .96, .9), 3)
panel('Front reflector', (0, -6, 3.2), (5, .08, 3), (.6, .64, .7), .5)

bpy.ops.object.camera_add(location=(0, 0, 2.1), rotation=(math.pi / 2, 0, 0))
camera = bpy.context.object
camera.data.type = 'PANO'
camera.data.panorama_type = 'EQUIRECTANGULAR'
scene.camera = camera
scene.render.resolution_x = 1024
scene.render.resolution_y = 512
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'HDR'
scene.render.image_settings.color_mode = 'RGB'
scene.render.filepath = str(root / 'public/images/workshop/studio-softbox.hdr')
bpy.context.preferences.filepaths.save_version = 0
bpy.ops.wm.save_as_mainfile(filepath=str(root / 'assets/blender/workshop-lighting.blend'))
bpy.ops.render.render(write_still=True)
print('WORKSHOP_HDRI_RENDERED')

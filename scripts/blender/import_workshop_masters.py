"""Create editable Blender masters from the current reference-derived GLBs.

Run in a separate background Blender process. Never modifies web GLBs.
The project GLBs deliberately store Z-up coordinates; undo the standard glTF
import axis conversion before saving metric, Z-up Blender meshes.
"""
import json
import math
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'public/models/workshop'
OUTPUT = ROOT / 'assets/blender/imported'
OUTPUT.mkdir(parents=True, exist_ok=True)
metrics = json.loads((SOURCE / 'metrics.json').read_text(encoding='utf-8-sig'))
verified = []

for entry in metrics:
    # This script is explicitly run in an isolated background process.
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.unit_settings.system = 'METRIC'
    bpy.context.scene.unit_settings.scale_length = 1.0
    bpy.ops.import_scene.gltf(filepath=str(SOURCE / (entry['name'] + '.glb')))
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    correction = Matrix.Rotation(-math.pi / 2, 4, 'X')
    transforms = [(obj, correction @ obj.matrix_world.copy()) for obj in meshes]
    for obj, transform in transforms:
        obj.parent = None
        obj.matrix_world = transform
    for obj in list(bpy.context.scene.objects):
        if obj.type != 'MESH':
            bpy.data.objects.remove(obj, do_unlink=True)
    bpy.context.view_layer.update()
    points = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
    minimum = Vector([min(p[i] for p in points) for i in range(3)])
    maximum = Vector([max(p[i] for p in points) for i in range(3)])
    dimensions = maximum - minimum
    assert all(abs(dimensions[i] - entry['size_z_up'][i]) < 0.0001 for i in range(3)), entry['name']
    for obj in meshes:
        obj.location.z -= minimum.z
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.context.scene.cursor.location = (0, 0, 0)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    triangles = 0
    for obj in meshes:
        obj.data.calc_loop_triangles()
        triangles += len(obj.data.loop_triangles)
        assert obj.data.validate() is False, obj.name
    assert triangles == entry['triangles'], entry['name']
    bpy.context.scene['source'] = 'Reference-derived GLB from scripts/generate-workshop-models.mjs'
    bpy.context.scene['web_axis'] = 'Z-up; preserve project loader convention when exporting'
    path = OUTPUT / ('workshop-' + entry['name'] + '.blend')
    bpy.ops.wm.save_as_mainfile(filepath=str(path))
    bpy.ops.wm.open_mainfile(filepath=str(path))
    assert len([obj for obj in bpy.context.scene.objects if obj.type == 'MESH']) == len(meshes)
    verified.append({'file': path.name, 'triangles': triangles, 'dimensions_m': list(dimensions)})

(OUTPUT / 'verification.json').write_text(json.dumps(verified, indent=2) + '\n', encoding='utf-8')
print('WORKSHOP_MASTERS_VERIFIED', len(verified))

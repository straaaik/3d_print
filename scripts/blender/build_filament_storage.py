"""Build the two filament assets only, retaining separate editable native parts.

Run: blender --background --python scripts/blender/build_filament_storage.py
Z-up metres; rack rear +Y; spool axis X; both origins at their support plane.
The web export is deliberately Z-up, matching the workshop loader.
"""
from pathlib import Path
import bpy
import json
import math
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/models/workshop'
NATIVE = ROOT / 'assets/blender'
PROOF = ROOT / 'assets/blender/filament-storage-proof'
PI = math.pi
M = {}


def material(name, color, metal=0, rough=.38):
    m = bpy.data.materials.new(name)
    rgb = [int(color[i:i+2], 16)/255 for i in (0, 2, 4)]
    rgb = [v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in rgb]
    m.diffuse_color = (*rgb, 1)
    m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*rgb, 1)
    bs.inputs['Metallic'].default_value = metal
    bs.inputs['Roughness'].default_value = rough
    return m


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.filepaths.save_version = 0
    bpy.context.scene.unit_settings.system = 'METRIC'
    M.clear()
    M.update(graphite=material('Rack_Powdercoat_Graphite', '30343b', .55, .31),
             steel=material('Rack_Satin_Steel', 'b7c0cd', .86, .26),
             rubber=material('Rack_Black_Collars', '151920', .15, .38),
             black=material('Spool_Black_Polymer', '17191e', .08, .31),
             filament=material('Filament_Windings', 'ffffff', .0, .27))


def finish(obj, name, mat, bevel=0):
    obj.name = name
    obj.data.materials.append(M[mat])
    if bevel:
        mod = obj.modifiers.new('Editable manufactured edge radius', 'BEVEL')
        mod.width = bevel
        mod.segments = 2
        mod.harden_normals = True
        mod = obj.modifiers.new('Weighted corner normals', 'WEIGHTED_NORMAL')
        mod.keep_sharp = True
    return obj


def box(name, dims, loc, mat='graphite', bevel=.001):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, mat, bevel)


def cylinder(name, radius, depth, loc, mat='steel', axis='X', vertices=32):
    rot = (0, PI/2, 0) if axis == 'X' else (PI/2, 0, 0)
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc, rotation=rot)
    obj = finish(bpy.context.object, name, mat)
    for p in obj.data.polygons:
        p.use_smooth = len(p.vertices) == 4
    return obj


def mesh(name, verts, faces, mat):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    return finish(obj, name, mat)


def lathe(name, profile, mat, segments=52, closed=True):
    # Profile is (axial X, radius); axis center is Z=.18.
    verts = [(x, r*math.cos(i*2*PI/segments), .18+r*math.sin(i*2*PI/segments)) for x, r in profile for i in range(segments)]
    faces = []
    for j in range(len(profile) if closed else len(profile)-1):
        k = (j+1) % len(profile)
        for i in range(segments):
            n = (i+1) % segments
            faces.append((j*segments+i, j*segments+n, k*segments+n, k*segments+i))
    obj = mesh(name, verts, faces, mat)
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj


def ring(name, x, outer, inner, depth, mat='black', segments=56):
    return lathe(name, [(x-depth/2, inner), (x-depth/2, outer), (x+depth/2, outer), (x+depth/2, inner)], mat, segments)


def build_spool():
    ring('Hollow_Core_Tube', 0, .059, .039, .19)
    for side, x in enumerate((-.096, .096)):
        ring(f'Flange_{side}_Outer_Rim', x, .18, .158, .008)
        ring(f'Flange_{side}_Axle_Lip', x, .068, .039, .008)
        # Real open wedge spaces remain between eight swept tapered spokes.
        for spoke in range(8):
            a = spoke*2*PI/8
            points = [(r*math.cos(a+offset), .18+r*math.sin(a+offset))
                      for r, offset in ((.064, -.13), (.164, -.09), (.164, .075), (.064, .19))]
            verts = [(xx, y, z) for xx in (x-.003, x+.003) for y, z in points]
            faces = [(3, 2, 1, 0), (4, 5, 6, 7)] + [(i, (i+1)%4, (i+1)%4+4, i+4) for i in range(4)]
            mesh(f'Flange_{side}_Open_Spoke_{spoke:02}', verts, faces, 'black')
    # 28 tightly wound ridges are actual geometry, not an image or flat decal.
    profile = [(-.091, .059)]
    for i in range(28):
        x = -.091 + i*.182/28
        profile.extend([(x, .1578), (x+.182/28*.33, .1602), (x+.182/28*.67, .1602)])
    profile.extend([(.091, .1578), (.091, .059)])
    lathe('Filament_Continuous_Fine_Windings', profile, 'filament')


def beam(name, a, b, width=.036, thick=.018):
    a, b = Vector(a), Vector(b)
    obj = box(name, (thick, width, (b-a).length), (a+b)/2, bevel=.002)
    obj.rotation_euler = (b-a).to_track_quat('Z', 'X').to_euler()
    return obj


def bolt(name, x, y, z, axis='Y'):
    cylinder(name+'_Washer', .018, .004, (x, y, z), 'rubber', axis)
    direction = Vector((1 if x > 0 else -1, 0, 0)) if axis == 'X' else Vector((0, -1, 0))
    loc = Vector((x, y, z))
    cylinder(name+'_Hex_Head', .012, .008, loc+direction*.005, 'steel', axis, 6)
    cylinder(name+'_Dark_Socket', .005, .0006, loc+direction*.0092, 'rubber', axis, 6)


def build_wall():
    rod_z_offset = .18 - math.sqrt((.18+.014)**2-.11**2)
    for side, x in enumerate((-.565, .565)):
        box(f'Wall_Strip_{side}', (.065, .018, 1.2), (x, .151, .6), bevel=.003)
        for z in (.04, .62, 1.16):
            bolt(f'Wall_Mount_{side}_{z}', x, .138, z)
        for row, bottom in enumerate((.18, .78)):
            zz = bottom+rod_z_offset
            rear_top = (x, .133, bottom+.38)
            front = (x, -.145, zz)
            rear_low = (x, .133, bottom-.11)
            beam(f'Bracket_{side}_{row}_Upper_Diagonal', rear_top, front, .037)
            beam(f'Bracket_{side}_{row}_Lower_Diagonal', front, rear_low, .039)
            beam(f'Bracket_{side}_{row}_Open_Cross_Brace', (x, .133, zz), front, .023)
            for y in (-.145, .075):
                cylinder(f'Rod_Seat_{side}_{row}_{y}', .027, .027, (x, y, zz), 'graphite')
                cylinder(f'Rod_Collar_{side}_{row}_{y}', .021, .006, (x+(.017 if side else -.017), y, zz), 'rubber')
                bolt(f'Rod_End_{side}_{row}_{y}', x+(.023 if side else -.023), y, zz, 'X')
    for row, bottom in enumerate((.18, .78)):
        for y in (-.145, .075):
            cylinder(f'Satin_Steel_Rod_{row}_{y}', .014, 1.13, (0, y, bottom+rod_z_offset), 'steel', vertices=48)


def export(name, builder, limit):
    reset()
    builder()
    scene = bpy.context.scene
    scene['generator'] = 'scripts/blender/build_filament_storage.py'
    scene['web_axis'] = 'Z-up; export_yup=False; bottom origin'
    scene['editable_native_parts'] = True
    bpy.ops.wm.save_as_mainfile(filepath=str(NATIVE/f'workshop-{name}.blend'))
    bpy.ops.object.select_all(action='SELECT')
    bpy.context.view_layer.objects.active = next(iter(scene.objects))
    bpy.ops.object.convert(target='MESH')
    buckets = {}
    for obj in list(scene.objects):
        buckets.setdefault(obj.data.materials[0].name, []).append(obj)
    for label, parts in buckets.items():
        bpy.ops.object.select_all(action='DESELECT')
        for obj in parts:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = parts[0]
        bpy.ops.object.join()
        obj = bpy.context.object
        obj.name = label
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        scene.cursor.location = (0, 0, 0)
        bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    bpy.ops.object.select_all(action='SELECT')
    path = OUT/f'{name}.glb'
    bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', use_selection=True, export_apply=True, export_yup=False)
    points = []
    tris = 0
    for obj in scene.objects:
        obj.data.calc_loop_triangles()
        tris += len(obj.data.loop_triangles)
        points.extend(obj.matrix_world@Vector(p) for p in obj.bound_box)
    assert tris <= limit, (name, tris, limit)
    bounds = [[min(p[i] for p in points), max(p[i] for p in points)] for i in range(3)]
    return dict(name=name, triangles=tris, meshes=len(scene.objects), bytes=path.stat().st_size, bounds_z_up=bounds,
                size_z_up=[b-a for a, b in bounds], textures=0)


def load_parts(path):
    with bpy.data.libraries.load(str(path), link=False) as (source, target):
        target.objects = source.objects
    for obj in target.objects:
        if obj:
            bpy.context.collection.objects.link(obj)
    return [obj for obj in target.objects if obj]


COLORS = ['ff2626', 'ff841a', 'ffcf12', '4ed428', '00a7ed', '1456ed', '9135e0', 'ededee']


def place_spools(rows, columns, pitch, bottom, row_pitch, y=0):
    parts = load_parts(NATIVE/'workshop-filament-spool.blend')
    for row in range(rows):
        for col in range(columns):
            tint = material(f'Proof_Color_{row}_{col}', COLORS[(row*columns+col)%len(COLORS)], rough=.27)
            for source in parts:
                obj = source.copy()
                obj.data = source.data.copy()
                bpy.context.collection.objects.link(obj)
                obj.location += Vector(((col-(columns-1)/2)*pitch, y, bottom+row*row_pitch))
                if 'Filament' in source.name:
                    obj.data.materials.clear()
                    obj.data.materials.append(tint)
    for obj in parts:
        bpy.data.objects.remove(obj, do_unlink=True)


def stage_render(name, target, camera, ortho, wall=True, size=1100):
    scene = bpy.context.scene
    M['backdrop'] = material('Proof_Backdrop', '192334', rough=.8)
    if wall:
        box('Proof_Wall', (200, .04, 200), (0, .199, 0), 'backdrop', 0)
    else:
        box('Proof_Floor', (200, 200, .02), (0, 0, -.04), 'backdrop', 0)
    world = bpy.data.worlds.new('Proof_Studio')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (.14, .18, .25, 1)
    world.node_tree.nodes['Background'].inputs[1].default_value = .45
    scene.world = world
    for loc, power, area in [((-3, -4, 5), 650, 4), ((3, -2, 3), 420, 3), ((-1, 1, 4), 700, 3)]:
        bpy.ops.object.light_add(type='AREA', location=loc)
        light = bpy.context.object
        light.data.energy = power
        light.data.shape = 'DISK'
        light.data.size = area
        light.rotation_euler = (Vector(target)-light.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.ops.object.camera_add(location=camera)
    cam = bpy.context.object
    cam.rotation_euler = (Vector(target)-cam.location).to_track_quat('-Z', 'Y').to_euler()
    cam.data.type = 'ORTHO'
    cam.data.ortho_scale = ortho
    scene.camera = cam
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 32
    scene.cycles.use_denoising = True
    scene.render.resolution_x = scene.render.resolution_y = size
    scene.render.resolution_percentage = 100
    scene.view_settings.view_transform = 'AgX'
    scene.render.image_settings.file_format = 'PNG'
    scene.render.filepath = str(PROOF/f'{name}.png')
    bpy.ops.render.render(write_still=True)


def proofs():
    reset()
    load_parts(NATIVE/'workshop-wall-filament-rack.blend')
    place_spools(2, 4, .27, .18, .60, -.035)
    stage_render('wall-rack-loaded', (0, 0, .62), (-2.2, -3.7, 2.1), 1.70)
    image = bpy.data.images.get('Render Result')
    image.save_render(str(ROOT/'public/images/workshop/wall-filament-rack.png'))
    reset()
    load_parts(NATIVE/'workshop-wall-filament-rack.blend')
    stage_render('wall-rack-empty', (0, 0, .62), (-2.2, -3.7, 2.1), 1.70)
    reset()
    build_spool()
    for obj in bpy.context.scene.objects:
        if 'Filament' in obj.name:
            obj.data.materials[0] = material('Proof_Blue', '037bed', rough=.25)
    stage_render('spool-detail', (0, 0, .18), (-1.1, -1.5, .95), .49, False)
    # Unmodified old source geometry, rendered at its native size with six columns.
    reset()
    load_parts(NATIVE/'workshop-filament-rack.blend')
    place_spools(3, 6, .207, .160, .530)
    stage_render('existing-rack-loaded', (0, 0, .79), (2.9, -4.1, 3.1), 2.0, False)


if __name__ == '__main__':
    PROOF.mkdir(parents=True, exist_ok=True)
    results = [export('wall-filament-rack', build_wall, 20000), export('filament-spool', build_spool, 12000)]
    (PROOF/'metrics.json').write_text(json.dumps(results, indent=2)+'\n')
    proofs()
    print('FILAMENT_STORAGE_COMPLETE', json.dumps(results))


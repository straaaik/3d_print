from pathlib import Path
import bpy, math
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
BLEND_DIR = ROOT / 'assets' / 'blender'
OUT_DIR = ROOT / 'public' / 'models' / 'workshop'
BLEND_DIR.mkdir(parents=True, exist_ok=True)
OUT_DIR.mkdir(parents=True, exist_ok=True)

TAG='workshop_generator_v1'

def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials):
        pass

def mat(name, color, metallic=0.0, roughness=0.5, alpha=1.0, emission=None, emission_strength=0.0):
    m=bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes=True
    bsdf=m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value=(*color,1)
    bsdf.inputs['Metallic'].default_value=metallic
    bsdf.inputs['Roughness'].default_value=roughness
    bsdf.inputs['Alpha'].default_value=alpha
    if 'Emission Color' in bsdf.inputs and emission:
        bsdf.inputs['Emission Color'].default_value=(*emission,1)
        bsdf.inputs['Emission Strength'].default_value=emission_strength
    elif 'Emission' in bsdf.inputs and emission:
        bsdf.inputs['Emission'].default_value=(*emission,1)
    m.diffuse_color=(*color,alpha)
    if alpha < 1:
        try: m.surface_render_method='DITHERED'
        except Exception: pass
    return m

def cube(name, dims, loc, material, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(location=loc)
    o=bpy.context.object; o.name=name; o.dimensions=dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel>0:
        mod=o.modifiers.new('Bevel','BEVEL'); mod.width=bevel; mod.segments=2
    o.data.materials.append(material); o['generator']=TAG
    return o

def cylinder(name, radius, depth, loc, material, rotate_y=0.0, vertices=20):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc, rotation=(0,rotate_y,0))
    o=bpy.context.object; o.name=name; o.data.materials.append(material); o['generator']=TAG
    return o

def select_only(objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    if objs: bpy.context.view_layer.objects.active=objs[0]

def save_and_export(objs, blend_path, glb_path):
    select_only(objs)
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    bpy.ops.export_scene.gltf(filepath=str(glb_path), export_format='GLB', use_selection=True, export_apply=True)

def build_a1():
    clear_scene()
    light=mat('LightBody',(0.82,0.84,0.86),0.1,0.45)
    dark=mat('DarkMechanics',(0.05,0.06,0.07),0.55,0.33)
    bed=mat('BuildPlate',(0.10,0.11,0.12),0.2,0.58)
    accent=mat('AccentBlue',(0.10,0.42,1.0),0.1,0.32)
    filament=mat('Filament',(0.20,0.75,0.40),0.0,0.36)
    objs=[]
    objs += [cube('A1_Base',(0.52,0.46,0.055),(0,0,0.0275),light,0.01)]
    objs += [cube('A1_Bed',(0.34,0.34,0.026),(0,0.005,0.085),bed,0.004)]
    objs += [cube('A1_Pillar_L',(0.042,0.055,0.64),(-0.215,0.085,0.36),light,0.005)]
    objs += [cube('A1_Pillar_R',(0.042,0.055,0.64),(0.215,0.085,0.36),light,0.005)]
    objs += [cube('A1_Top',(0.47,0.06,0.05),(0,0.085,0.67),light,0.006)]
    objs += [cube('A1_XRail',(0.40,0.045,0.035),(0,0.055,0.45),dark,0.004)]
    objs += [cube('A1_Head',(0.07,0.075,0.08),(0.05,0.035,0.405),dark,0.005)]
    objs += [cube('A1_Display',(0.09,0.04,0.065),(0.18,-0.22,0.13),accent,0.005)]
    objs += [cylinder('A1_Spool_A',0.10,0.025,(-0.03,0.16,0.82),dark,math.pi/2)]
    objs += [cylinder('A1_Spool_Filament',0.074,0.06,(0.0,0.16,0.82),filament,math.pi/2)]
    objs += [cylinder('A1_Spool_B',0.10,0.025,(0.03,0.16,0.82),dark,math.pi/2)]
    return objs

def build_p1():
    clear_scene()
    graphite=mat('P1_Graphite',(0.07,0.08,0.10),0.55,0.38)
    dark=mat('P1_Mechanics',(0.03,0.035,0.04),0.65,0.30)
    bed=mat('P1_BuildPlate',(0.10,0.11,0.12),0.2,0.58)
    glass=mat('P1_Glass',(0.08,0.14,0.18),0.0,0.18,0.28)
    accent=mat('P1_Display',(0.10,0.42,1.0),0.1,0.3)
    objs=[]
    objs += [cube('P1_Base',(0.48,0.48,0.06),(0,0,0.03),graphite,0.008)]
    objs += [cube('P1_Top',(0.48,0.48,0.06),(0,0,0.62),graphite,0.008)]
    for xi,x in enumerate((-0.22,0.22)):
        for yi,y in enumerate((-0.22,0.22)):
            objs += [cube(f'P1_Post_{xi}_{yi}',(0.04,0.04,0.56),(x,y,0.34),graphite,0.004)]
    objs += [cube('P1_Bed',(0.34,0.34,0.025),(0,0,0.12),bed,0.004)]
    objs += [cube('P1_XRail',(0.34,0.045,0.03),(0,0.05,0.46),dark,0.004)]
    objs += [cube('P1_Head',(0.075,0.075,0.075),(0.04,0.03,0.42),dark,0.005)]
    objs += [cube('P1_FrontGlass',(0.39,0.012,0.48),(0,-0.235,0.35),glass,0.002)]
    objs += [cube('P1_Display',(0.09,0.035,0.055),(0.185,-0.255,0.58),accent,0.004)]
    return objs

def build_spool():
    clear_scene()
    hub=mat('Spool_Hub',(0.07,0.08,0.09),0.45,0.42)
    filament=mat('Spool_Filament',(0.2,0.75,0.4),0.0,0.35)
    return [
        cylinder('Spool_Flange_L',0.105,0.022,(-0.038,0,0),hub,math.pi/2),
        cylinder('Spool_Filament',0.078,0.065,(0,0,0),filament,math.pi/2),
        cylinder('Spool_Flange_R',0.105,0.022,(0.038,0,0),hub,math.pi/2),
    ]

if __name__=='__main__':
    a1=build_a1(); save_and_export(a1,BLEND_DIR/'workshop-printer-a1.blend',OUT_DIR/'printer-a1.glb')
    p1=build_p1(); save_and_export(p1,BLEND_DIR/'workshop-printer-p1.blend',OUT_DIR/'printer-p1.glb')
    sp=build_spool(); save_and_export(sp,BLEND_DIR/'workshop-filament-spool.blend',OUT_DIR/'filament-spool.glb')
    print('Workshop assets generated:', OUT_DIR)

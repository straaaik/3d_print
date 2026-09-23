"""Blender 5 background generator. Units metres; Blender -Y becomes glTF +Z.
Run: blender --background --python scripts/blender/build_printer_room.py
Only generated objects/files in the printer-room asset directories are replaced.
"""
import bpy, math, json, os, shutil
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'public/models/printer-room'
SRC=ROOT/'assets/blender/printer-room'
OUT.mkdir(parents=True,exist_ok=True); SRC.mkdir(parents=True,exist_ok=True)
if not bpy.app.background:
    raise RuntimeError('Run this generator with Blender --background; it must not replace an interactive scene.')
master = SRC/'printer-room.blend'
if master.exists():
    shutil.copy2(master, SRC/'printer-room.previous.blend')
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
for d in list(bpy.data.materials): bpy.data.materials.remove(d)

def material(name,color,metal=0,rough=.42,emission=0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Metallic'].default_value=metal; p.inputs['Roughness'].default_value=rough
    if emission: p.inputs['Emission Color'].default_value=(*color,1); p.inputs['Emission Strength'].default_value=emission
    return m
silver=material('Brushed aluminum',(.48,.54,.60),.72,.3)
white=material('Porcelain polymer',(.69,.72,.72),.12,.35)
dark=material('Graphite frame',(.046,.058,.071),.6,.33)
black=material('Rubber and belts',(.009,.014,.020),.12,.52)
gold=material('Textured gold PEI',(.48,.31,.115),.65,.52)
green=material('Bambu mint',(.12,.72,.34),.05,.3, .15)
filament=material('Warm white filament',(.72,.69,.60),0,.65)
screen=material('Display glass',(.025,.18,.24),.3,.2,.7)
led=material('Warm linear light', (1,.66,.32),0,.3,2.4)
tile=material('Concrete floor',(.34,.37,.40),.06,.77)
blue=material('Ocean blue filament',(.055,.28,.48),0,.62)
orange=material('Copper filament',(.64,.22,.07),0,.6)

def box(name,loc,size,mat,bevel=.004):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc); o=bpy.context.object; o.name=name
    o.dimensions=size; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(mat)
    if bevel:
        mod=o.modifiers.new('Manufactured edge','BEVEL'); mod.width=bevel; mod.segments=1
        bpy.context.view_layer.objects.active=o; bpy.ops.object.modifier_apply(modifier=mod.name)
    return o
def cyl(name,loc,r,depth,mat,axis='Z',verts=16):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=r,depth=depth,location=loc)
    o=bpy.context.object;o.name=name
    if axis=='X': o.rotation_euler[1]=math.pi/2
    if axis=='Y': o.rotation_euler[0]=math.pi/2
    o.data.materials.append(mat)
    return o
def tube(name,coords,r,mat):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=6;c.bevel_depth=r;c.bevel_resolution=1
    s=c.splines.new('BEZIER');s.bezier_points.add(len(coords)-1)
    for p,co in zip(s.bezier_points,coords): p.co=co;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
    o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.data.materials.append(mat)
    bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
    return o

def printer(lod=False):
    edge=0 if lod else .003
    box('A1 sculpted base',(0,0,.042),(.42,.39,.07),white,edge)
    box('Y motion rail',(0,-.025,.088),(.12,.45,.035),dark,edge)
    for x in [-.165,.165]:
        for y in [-.15,.15]: box('Isolation foot',(x,y,.01),(.055,.065,.02),black,0)
    box('Moving bed carrier',(0,-.083,.123),(.285,.30,.025),dark,edge)
    box('Gold PEI build plate',(0,-.092,.139),(.278,.285,.009),gold,.001 if not lod else 0)
    box('PEI lift tab',(0,-.245,.137),(.056,.025,.007),gold,0)
    for x in [-.188,.188]:
        box('Tall silver gantry',(x,.055,.31),(.037,.047,.49),silver,edge)
        box('Black linear guide',(x,-.001,.326),(.014,.008,.409),black,0)
        box('White gantry foot',(x,.045,.10),(.062,.092,.13),white,edge)
        if not lod: cyl('Z lead screw',(x+.020,.024,.32),.0045,.43,silver,verts=8)
    box('Top gantry bridge',(0,.055,.564),(.431,.054,.041),white,edge)
    box('X moving aluminum bridge',(0,-.005,.339),(.413,.033,.035),silver,edge)
    box('X belt',(0,-.024,.342),(.387,.006,.009),black,0)
    box('Toolhead carriage',(.027,-.037,.336),(.087,.043,.075),dark,edge)
    box('White toolhead shroud',(.027,-.069,.323),(.071,.047,.062),white,edge)
    box('Black fan grille',(.027,-.094,.324),(.05,.006,.036),black,0)
    box('Mint toolhead accent',(.049,-.099,.332),(.010,.004,.027),green,0)
    box('X left motor',(-.219,.01,.342),(.039,.055,.056),dark,edge)
    box('X right cap',(.219,.01,.342),(.029,.055,.053),white,edge)
    if not lod:
        for z in [.315,.322,.329]: box('Fan louvre',(.02,-.099,z),(.025,.002,.002),silver,0)
        cyl('Hotend nozzle',(.027,-.063,.283),.005,.023,gold,verts=8)
        for x in [-.188,.188]:
            for z in [.12,.53]: cyl('Gantry screw',(x,-.006,z),.005,.003,dark,'Y',8)
    # Display is genuinely angled towards operator, at front right.
    box('Display arm',(.231,-.095,.080),(.085,.035,.023),white,edge)
    d=box('Angled touchscreen bezel',(.266,-.12,.110),(.092,.018,.063),dark,edge); d.rotation_euler.x=math.radians(28)
    d=box('Touchscreen',(.266,-.130,.111),(.076,.002,.047),screen,0); d.rotation_euler.x=math.radians(28)
    # Top-mounted spool has a real hub and flange silhouette.
    box('Spool mast',(.115,.069,.621),(.022,.025,.10),dark,edge)
    cyl('Spool axle',(.08,.07,.681),.014,.15,silver,'X',12)
    n=12 if lod else 24
    cyl('Filament winding',(.059,.07,.681),.070,.055,filament,'X',n)
    for x in [.026,.092]: cyl('Spool flange',(x,.07,.681),.081,.009,dark,'X',n)
    for x in [.020,.098]: cyl('Spool hub',(x,.07,.681),.022,.012,silver,'X',12)
    if not lod:
        tube('PTFE filament arc',[(.09,.07,.697),(.155,.065,.737),(.231,.020,.646),(.13,-.039,.478),(.029,-.04,.379)],.0035,white)
        tube('Toolhead wire loom',[(-.175,.074,.55),(-.135,.081,.418),(.025,.007,.378)],.005,black)

def bench():
    box('Bench work surface',(0,0,.821),(1.45,1.15,.046),dark,.009)
    box('Inset top',(0,0,.846),(1.40,1.10,.008),black,.003)
    for x in [-.645,.645]:
        for y in [-.495,.495]: box('Steel leg',(x,y,.405),(.044,.044,.81),dark,.003)
        box('Low side brace',(x,0,.19),(.033,1.0,.035),silver,.002)
    for y in [-.50,.50]:
        box('Apron',(0,y,.764),(1.31,.029,.079),dark,.003)
        box('Underside LED',(0,y,.718),(1.25,.025,.009),led,.002)

def shelf():
    for x in [-1.375,1.375]: box('Shelf end',(x,0,1.05),(.05,.50,2.1),dark,.008)
    box('Shelf backing',(0,.23,1.05),(2.7,.025,2.1),dark,.003)
    for z in [.08,.72,1.36,2.06]:
        box('Shelf plank',(0,0,z),(2.75,.5,.06),dark,.004)
        if z>.1: box('Shelf strip',(0,-.23,z-.04),(2.64,.015,.012),led,.001)
    for row,z in enumerate([.33,.97,1.61]):
        for i in range(13):
            x=-1.23+i*.204; mat=[filament,filament,black,blue,filament,orange,black][(i+row*2)%7]
            cyl('Stored filament',(x,-.035,z),.174,.130,mat,'X',16)
            for dx in [-.076,.076]: cyl('Stored spool flange',(x+dx,-.035,z),.192,.016,black,'X',16)
            for dx in [-.086,.086]: cyl('Stored spool hub',(x+dx,-.035,z),.041,.010,silver,'X',12)

def selected_meshes(): return [o for o in bpy.context.scene.objects if o.type=='MESH']
def merge_materials(objects,prefix):
    groups={}
    for o in objects: groups.setdefault(o.data.materials[0].name,[]).append(o)
    merged=[]
    for i,(name,group) in enumerate(groups.items()):
        bpy.ops.object.select_all(action='DESELECT')
        for o in group: o.select_set(True)
        bpy.context.view_layer.objects.active=group[0];bpy.ops.object.join();o=bpy.context.object
        bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
        o.name=f'{prefix}_{name.replace(" ","_")}';merged.append(o)
    return merged
stats={};assets={}
for name,fn in [('a1',lambda:printer()),('a1-lod',lambda:printer(True)),('workbench',bench),('shelf',shelf),('room-kit',lambda:box('FloorTile',(0,0,-.045),(1,1,.09),tile,.002))]:
    bpy.ops.object.select_all(action='DESELECT')
    before=set(bpy.context.scene.objects);fn(); objects=merge_materials(list(set(bpy.context.scene.objects)-before),name)
    if name=='room-kit': objects[0].name='FloorTile'
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    path=OUT/f'{name}.glb'
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_texcoords=False,export_normals=True,export_materials='EXPORT',export_cameras=False,export_lights=False)
    points=[o.matrix_world@Vector(c) for o in objects for c in o.bound_box]
    mn=[min(p[i] for p in points) for i in range(3)];mx=[max(p[i] for p in points) for i in range(3)]
    tris=0
    for o in objects:o.data.calc_loop_triangles();tris+=len(o.data.loop_triangles)
    stats[name]={'meshes':len(objects),'materials':len(objects),'triangles':tris,'bytes':path.stat().st_size,'bounds_gltf':{'min':[mn[0],mn[2],-mx[1]],'max':[mx[0],mx[2],-mn[1]]},'dimensions':[mx[0]-mn[0],mx[2]-mn[2],mx[1]-mn[1]]}
    assets[name]=objects
    for o in objects:o.hide_render=True;o.hide_set(True)

def copy_asset(name,loc):
    for src in assets[name]:
        o=src.copy();o.data=src.data;bpy.context.collection.objects.link(o);o.hide_render=False;o.hide_set(False);o.location=loc
for ix in range(4):
    for iy in range(3):
        x=(ix-1.5)*1.62;y=(iy-1)*1.75
        copy_asset('workbench',(x,y,0));copy_asset('a1',(x,y,.85))
for x in [-1.55,1.55]:copy_asset('shelf',(x,3.0,0))
for ix in range(8):
    for iy in range(8):copy_asset('room-kit',(ix-3.5,iy-3.0,0))
box('Platform fascia',(0,.5,-.19),(8,8,.28),dark,.025)

scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32
scene.world.color=(.12,.15,.2)
def area(name,loc,color,power,size):
    d=bpy.data.lights.new(name,'AREA');d.energy=power;d.color=color;d.shape='DISK';d.size=size
    o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
area('Warm key',(-5,-4,9),(1,.81,.61),1600,7)
area('Cool fill',(5,3,7),(.56,.73,1),1100,6)
for ix in range(4):
    for iy in range(3):area('Bench reflected warm light',((ix-1.5)*1.62,(iy-1)*1.75,.72),(1,.57,.26),12,1)
bpy.ops.object.camera_add(location=(9,-12,11));cam=bpy.context.object
cam.rotation_euler=(Vector((0,.5,.55))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=12.4;scene.camera=cam
scene.render.resolution_x=1500;scene.render.resolution_y=1200;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG';scene.render.filepath=str(SRC/'preview.png')
lighting={'ambient':{'color':'#b7c8de','intensity':.65},'hemisphere':{'skyColor':'#c5d9ee','groundColor':'#34313a','intensity':1.1},'key':{'color':'#ffe1b7','intensity':3.2,'position':[-6,12,8]},'fill':{'color':'#a9cfff','intensity':1.5,'position':[8,7,-5]},'benchEmission':{'color':'#ffd69b','intensity':2.4},'colorManagement':{'toneMapping':'ACESFilmic','exposure':1}}
(OUT/'lighting.json').write_text(json.dumps(lighting,indent=2));(OUT/'stats.json').write_text(json.dumps(stats,indent=2))
bpy.ops.wm.save_as_mainfile(filepath=str(SRC/'printer-room.blend'))
bpy.ops.render.render(write_still=True)
print('ASSET_STATS '+json.dumps(stats))

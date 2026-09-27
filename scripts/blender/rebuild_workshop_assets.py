"""Reference-native Blender assets. Run in a separate background process.
Metric Z-up GLB matches the existing workshop loader. No external packages.
"""
from pathlib import Path
import bpy, math, json, random, runpy
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'public/models/workshop'
MASTERS=ROOT/'assets/blender'
PI=math.pi
M={}

def material(name,hex_color,metal=0,rough=.4,alpha=1):
    rgb=[int(hex_color[i:i+2],16)/255 for i in (0,2,4)]
    rgb=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb]
    m=bpy.data.materials.new(name);m.diffuse_color=(*rgb,alpha);m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF')
    for key,value in [('Base Color',(*rgb,1)),('Metallic',metal),('Roughness',rough),('Alpha',alpha)]:bs.inputs[key].default_value=value
    if alpha<1:m.surface_render_method='DITHERED'
    return m

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.unit_settings.system='METRIC';bpy.context.scene.unit_settings.scale_length=1
    bpy.context.preferences.filepaths.save_version=0
    M.clear()
    for key,args in {
        'light':('Shell_Pearl','c6c9cf',.3,.32),'dark':('Graphite','292f3a',.45,.34),
        'black':('Mechanics','141920',.25,.4),'steel':('Machined_Aluminium','a4aebc',.75,.27),
        'bed':('Textured_BuildPlate','363b43',.12,.72),'glass':('Glass_Smoke','334d70',.05,.13,.18),
        'blue':('Screen_Blue','2378e8',.15,.3),'brass':('Nozzle_Brass','bf8d32',.65,.3),
        'wood':('Honey_Beech','d6a566',0,.43),'wood2':('Beech_Endgrain','b98b51',0,.49),
        'card':('Kraft_Cardboard','be945f',0,.72),'tape':('Packing_Tape','977045',0,.45),
        'leaf':('Leaf_Green','377411',0,.65),'leaf2':('Leaf_Light','6e9f24',0,.61),
        'soil':('Soil','393027',0,.95),'filament':('Spool_Filament','075bea',.0,.28),
    }.items():M[key]=material(*args)
    runpy.run_path(str(Path(__file__).with_name('reference_materials.py')))['apply_surfaces'](M)

def finish(obj,name,mat,bevel=0):
    obj.name=name;obj.data.materials.append(M[mat])
    if bevel:
        mod=obj.modifiers.new('Manufactured edge radius','BEVEL');mod.width=bevel;mod.segments=3;mod.limit_method='ANGLE'
        mod.harden_normals=True
        for polygon in obj.data.polygons:polygon.use_smooth=True
        mod=obj.modifiers.new('Weighted normals','WEIGHTED_NORMAL');mod.keep_sharp=True
    return obj

def box(name,dims,loc,mat='dark',bevel=.002):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);obj=bpy.context.object;obj.dimensions=dims
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return finish(obj,name,mat,min(bevel,min(dims)*.3))

def cylinder(name,radius,depth,loc,mat='steel',axis='Z',vertices=24):
    rot=(0,PI/2,0) if axis=='X' else ((PI/2,0,0) if axis=='Y' else (0,0,0))
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=loc,rotation=rot)
    obj=finish(bpy.context.object,name,mat)
    for f in obj.data.polygons:f.use_smooth=len(f.vertices)==4
    return obj

def tube(name,points,radius,mat='black'):
    curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D';curve.resolution_u=10;curve.bevel_depth=radius;curve.bevel_resolution=2
    spline=curve.splines.new('BEZIER');spline.bezier_points.add(len(points)-1)
    for p,co in zip(spline.bezier_points,points):p.co=co;p.handle_left_type=p.handle_right_type='AUTO'
    obj=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(obj);curve.materials.append(M[mat]);return obj

def ring(name,outer,inner,depth,loc,mat='black',axis='X',segments=48):
    verts=[];faces=[];n=segments
    for axial in (-depth/2,depth/2):
        for radius in (outer,inner):
            for i in range(n):
                a=2*PI*i/n;xyz=(axial,math.cos(a)*radius,math.sin(a)*radius)
                if axis=='Y':xyz=(xyz[1],xyz[0],xyz[2])
                verts.append(tuple(xyz[j]+loc[j] for j in range(3)))
    for i in range(n):
        j=(i+1)%n
        faces.extend([(i,j,2*n+j,2*n+i),(n+j,n+i,3*n+i,3*n+j),(j,i,n+i,n+j),(2*n+i,2*n+j,3*n+j,3*n+i)])
    if axis=='Y':faces=[tuple(reversed(face)) for face in faces]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);mesh.materials.append(M[mat])
    for i,f in enumerate(mesh.polygons):f.use_smooth=i%4<2
    return obj

def screw(x,y,z,r=.003):
    cylinder('Recessed screw',r,.0018,(x,y,z),'black','Y',12)
    box('Screw slot',(r*.9,.0005,.0006),(x,y-.001,z),'steel',0)

def head(x,y,z):
    box('Head carriage',(.095,.056,.115),(x,y+.025,z),'black',.009)
    box('Head pearl face',(.087,.04,.108),(x,y-.018,z+.004),'light',.01)
    cylinder('Fan recess',.026,.003,(x,y-.040,z-.004),'black','Y',32)
    ring('Fan metal rim',.027,.025,.002,(x,y-.043,z-.004),'steel','Y',32)
    for i in range(9):
        a=i*2*PI/9
        blade=box('Fan blade',(.008,.0018,.019),(x+math.sin(a)*.014,y-.044,z-.004+math.cos(a)*.014),'dark',.001);blade.rotation_euler.y=a+.35
    cylinder('Fan hub',.009,.003,(x,y-.046,z-.004),'black','Y')
    for dx in (-.033,.033):
        for dz in (-.038,.038):screw(x+dx,y-.040,z+dz)
    box('Hotend shroud',(.06,.044,.018),(x,y-.008,z-.059),'black',.004)
    cylinder('Brass nozzle',.006,.012,(x,y-.012,z-.074),'brass')
    for dx in (-.017,.017):box('Cooling duct',(.02,.04,.022),(x+dx,y-.006,z-.068),'black',.003)
    box('Filament connector',(.026,.025,.024),(x,y-.003,z+.068),'light',.004)
    cylinder('PTFE fitting',.008,.008,(x,y-.003,z+.084),'black')
    for i in range(4):box('Head side vent',(.002,.004,.027),(x+.044,y-.025+i*.008,z+.015),'black',0)

def feet(w,d):
    for x in (-w/2+.035,w/2-.035):
        for y in (-d/2+.035,d/2-.035):box('Rubber foot',(.055,.055,.019),(x,y,.01),'black',.007)

def a1():
    feet(.49,.44)
    box('A1 lower chassis seam',(.505,.448,.025),(0,0,.035),'black',.01)
    box('A1 pearl base',(.52,.46,.067),(0,0,.072),'light',.016)
    for x in (-.122,.122):
        box('Y motion channel',(.04,.36,.02),(x,-.015,.116),'black',.003)
        cylinder('Y polished guide',.006,.345,(x,-.015,.132),'steel','Y')
        box('Bed carriage',(.05,.115,.029),(x,-.04,.151),'black',.003)
    box('Bed heater',(.353,.333,.021),(0,-.042,.169),'black',.004)
    box('Bed spring steel edge',(.364,.346,.006),(0,-.05,.184),'steel',.004)
    box('Textured print surface',(.358,.34,.003),(0,-.05,.189),'bed',.003)
    for x in (-.164,.164):
        for y in (-.199,.097):cylinder('Bed fastener',.004,.001,(x,y,.191),'steel')
    for x in (-.214,.214):
        box('Vertical aluminium extrusion',(.058,.059,.478),(x,.107,.354),'light',.006)
        box('Z inset channel',(.012,.061,.448),(x+(.018 if x<0 else -.018),.101,.351),'black',.001)
        cylinder('Z screw',.004,.439,(x+(.032 if x<0 else -.032),.106,.351),'steel')
        box('Top dark endcap',(.063,.065,.046),(x,.107,.605),'dark',.008)
        box('X end carriage',(.062,.079,.091),(x,.074,.365),'dark',.006)
    box('Top cross member',(.378,.046,.034),(0,.107,.601),'light',.005)
    box('Horizontal gantry body',(.475,.035,.049),(0,.052,.371),'light',.004)
    box('Gantry rail inset',(.465,.005,.01),(0,.032,.371),'black',.001)
    for x in [-.19+i*.038 for i in range(11)]:screw(x,.027,.372,.0025)
    head(.015,.006,.363)
    tube('Sweeping white PTFE',[(.015,.002,.45),(.023,.06,.632),(.10,.10,.704),(.227,.12,.604),(.244,.13,.419)],.0045,'light')
    tube('Right cable loom',[(.238,.139,.125),(.249,.137,.303),(.242,.139,.425)],.008,'black')
    box('Right gantry cap',(.049,.069,.077),(.235,.058,.373),'light',.007)
    screen=box('Angled display housing',(.103,.026,.108),(.206,-.208,.132),'light',.009);screen.rotation_euler.x=math.radians(-24)
    for name,dims,offset,mat in [('Display bezel',(.091,.004,.095),(0,-.015,0),'black'),('Display sleeping glass',(.076,.002,.076),(0,-.018,.002),'bed')]:
        obj=box(name,dims,(0,0,0),mat,.004);obj.parent=screen;obj.location=offset
    for i in range(7):box('Base cooling slit',(.017,.002,.002),(.17+i*.006,.231,.068),'black',0)

def p1():
    feet(.48,.48)
    box('P1 lower body',(.48,.48,.071),(0,0,.054),'dark',.009)
    box('P1 inside floor',(.412,.41,.009),(0,0,.094),'black',.002)
    for x in (-.218,.218):
        for y in (-.218,.218):box('P1 chamfered pillar',(.045,.046,.55),(x,y,.353),'dark',.008)
    for y in (-.217,.217):box('P1 upper fascia',(.443,.047,.072),(0,y,.594),'dark',.009)
    for x in (-.218,.218):box('P1 top side rail',(.045,.393,.048),(x,0,.606),'dark',.007)
    box('P1 rear enclosure',(.393,.011,.485),(0,.231,.34),'black',.002)
    for x in (-.231,.231):
        box('P1 side smoked glass',(.003,.394,.466),(x,0,.326),'glass',.001)
        for z in (.099,.559):box('Side window gasket',(.006,.395,.009),(x,0,z),'black',.001)
    box('Door glass',(.382,.003,.444),(0,-.235,.322),'glass',.001)
    for x in (-.197,.197):box('Door side gasket',(.012,.009,.461),(x,-.235,.323),'black',.002)
    for z in (.092,.553):box('Door top bottom gasket',(.397,.011,.012),(0,-.235,z),'black',.002)
    box('Door handle',(.018,.027,.115),(.183,-.251,.312),'black',.005)
    for z in (.147,.489):box('Door hinge',(.023,.018,.037),(-.19,-.242,z),'black',.003)
    for x in (-.17,.17):
        cylinder('Vertical bed lead screw',.0045,.43,(x,.172,.321),'steel')
        box('Bed lift shoe',(.039,.045,.038),(x,.164,.177),'black',.003)
        cylinder('Y rail',.005,.345,(x,0,.49),'steel','Y')
    box('Bed support',(.347,.345,.025),(0,-.004,.184),'black',.004)
    box('Steel print plate',(.357,.355,.004),(0,-.015,.202),'steel',.004)
    box('Textured print sheet',(.349,.347,.003),(0,-.015,.206),'bed',.003)
    for z in (.452,.478):cylinder('CoreXY gantry rod',.004,.362,(0,.012,z),'steel','X')
    head(.027,-.018,.463)
    tube('Head cable chain',[(.028,.025,.549),(.01,.085,.581),(-.07,.161,.57),(-.16,.178,.533)],.007,'black')
    box('P1 control bezel',(.127,.012,.055),(.131,-.246,.592),'black',.005)
    box('P1 screen',(.071,.002,.037),(.11,-.253,.594),'bed',.002)
    for x in (.093,.126):
        for z in (.585,.604):box('Control icon tile',(.025,.001,.014),(x,-.255,z),'blue',.001)
    cylinder('Control dial',.014,.009,(.173,-.255,.594),'dark','Y')
    for x in (-.201,.201):box('Interior light diffuser',(.004,.25,.003),(x,0,.552),'light',0)

def spool():
    for x in (-.039,.039):
        ring('Spool continuous flange',.105,.031,.008,(x,0,.105),'dark')
        ring('Spool lip highlight',.105,.102,.002,(x+math.copysign(.0045,x),0,.105),'steel')
        ring('Spool axle rim',.039,.029,.011,(x,0,.105),'black')
        for i in range(6):
            a=i*PI/3
            obj=box('Flange inset',(.001,.023,.052),(x+math.copysign(.0047,x),math.sin(a)*.069,.105+math.cos(a)*.069),'black',.002);obj.rotation_euler.x=-a
    ring('Hollow winding core',.048,.029,.072,(0,0,.105),'black')
    ring('Spool_Filament body',.089,.046,.069,(0,0,.105),'filament')
    for i in range(29):
        bpy.ops.mesh.primitive_torus_add(major_segments=32,minor_segments=4,location=(-.0336+i*.0024,0,.105),rotation=(0,PI/2,0),major_radius=.0888,minor_radius=.00115)
        finish(bpy.context.object,'Spool_Filament winding','filament')
        for poly in bpy.context.object.data.polygons:poly.use_smooth=True

def boxes():
    for x,y,z,w,d,h in [(-.24,.06,.16,.32,.32,.32),(-.26,.06,.415,.26,.28,.19),(.075,.12,.14,.32,.34,.28),(.075,.12,.435,.32,.34,.30)]:
        box('Cardboard carton',(w,d,h),(x,y,z),'card',.005)
        box('Fold seam',(.001,d,.0007),(x,y,z+h/2+.0005),'tape',0)
        box('Top tape',(.048,d+.002,.001),(x,y,z+h/2+.001),'tape',0)
        box('Tape folded over front',(.048,.001,.054),(x,y-d/2-.0006,z+h/2-.026),'tape',0)
        for dx in (-.022,0,.022):box('Shipping mark',(.003,.001,.022),(x+dx,y-d/2-.001,z-h/2+.042),'dark',0)
    for x,y,w,d,h in [(.265,-.115,.29,.27,.31),(-.045,-.245,.31,.25,.19)]:
        box('Storage crate',(w,d,h),(x,y,h/2),'dark',.009)
        box('Crate lid',(w+.012,d+.012,.029),(x,y,h+.008),'dark',.006)
        box('Recessed lid',(w-.032,d-.032,.002),(x,y,h+.024),'black',.003)
        box('Inventory label',(.10,.002,.039),(x,y-d/2-.002,h*.5),'steel',.002)
        for dx in (-w*.33,w*.33):box('Lid latch',(.019,.014,.04),(x+dx,y-d/2-.005,h-.01),'black',.002)
        for sign in (-1,1):box('Crate handle',(.012,.1,.021),(x+sign*w/2,y,h*.8),'black',.003)

def plant():
    verts=[]
    for z,r in [(0,.135),(.335,.177),(.335,.159),(.30,.151)]:verts.extend([(-r,-r,z),(r,-r,z),(r,r,z),(-r,r,z)])
    faces=[]
    for level in range(3):
        for i in range(4):faces.append((level*4+i,level*4+(i+1)%4,(level+1)*4+(i+1)%4,(level+1)*4+i))
    mesh=bpy.data.meshes.new('Planter');mesh.from_pydata(verts,[],faces);mesh.update()
    obj=bpy.data.objects.new('Tapered graphite planter',mesh);bpy.context.collection.objects.link(obj);finish(obj,obj.name,'dark',.003)
    box('Soil',(.3,.3,.018),(0,0,.305),'soil',.002)
    rng=random.Random(12)
    for i in range(20):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=rng.uniform(.012,.024),location=(rng.uniform(-.13,.13),rng.uniform(-.13,.13),.322))
        finish(bpy.context.object,'Planter stone','soil')
    for i,(angle,length,spread,width) in enumerate([(0,.86,.12,.145),(1.2,.69,.32,.13),(2.5,.65,.30,.135),(3.8,.50,.37,.11),(5.1,.49,.38,.11),(2,.91,.04,.135),(4.6,.73,.19,.125)]):
        direction=Vector((math.cos(angle),math.sin(angle),0));side=Vector((-direction.y,direction.x,0))
        start=Vector((direction.x*.035,direction.y*.035,.32));tip=start+direction*spread+Vector((0,0,length))
        tube('Leaf stem',[start,start+direction*.04+Vector((0,0,.20)),start+direction*spread*.4+Vector((0,0,length*.54))],.008,'leaf')
        points=[start+Vector((0,0,.13))]
        for t,half in [(.35,width*.68),(.62,width),(.82,width*.58)]:
            center=start+direction*(spread*t*t)+Vector((0,0,length*t));points.extend([center-side*half,center+direction*.024,center+side*half])
        points.append(tip);faces=[(0,1,2),(0,2,3)]
        for base in (1,4):faces.extend([(base,base+3,base+1),(base+1,base+3,base+4),(base+1,base+4,base+2),(base+2,base+4,base+5)])
        faces.extend([(7,10,8),(8,10,9)])
        mesh=bpy.data.meshes.new('Faceted leaf');mesh.from_pydata(points,[],faces);mesh.update()
        obj=bpy.data.objects.new('Broad sculpted leaf',mesh);bpy.context.collection.objects.link(obj)
        mesh.materials.append(M['leaf']);mesh.materials.append(M['leaf2'])
        for face in mesh.polygons:face.material_index=(face.index+i)%2
        mod=obj.modifiers.new('Leaf thickness','SOLIDIFY');mod.thickness=.001

def cabinet():
    for x in (-.32,.32):
        for y in (-.19,.19):
            cylinder('Caster tire',.055,.034,(x,y,.059),'black','X')
            cylinder('Caster hub',.027,.038,(x,y,.059),'steel','X')
            box('Caster fork',(.047,.028,.058),(x,y,.107),'steel',.005)
    box('Cabinet chassis',(.78,.48,.66),(0,0,.473),'dark',.01)
    for x in (-.366,.366):box('Cabinet front pillar',(.039,.036,.674),(x,-.231,.473),'black',.004)
    for h,z in [(.119,.735),(.119,.607),(.119,.479),(.212,.305)]:
        box('Individual drawer',(.686,.024,h),(0,-.251,z),'dark',.004)
        box('Drawer aluminium pull',(.60,.023,.018),(0,-.273,z+h*.27),'steel',.004)
        for x in (-.307,.307):box('Pull endcap',(.015,.025,.022),(x,-.272,z+h*.27),'black',.003)
    box('Beech worktop',(.80,.51,.041),(0,0,.826),'wood',.005)
    for i in range(6):box('Worktop grain',(.8,.001,.0005),(0,-.20+i*.077,.847),'wood2',0)
    box('Pegboard',(.71,.024,.44),(0,.205,1.075),'dark',.004)
    for x in (-.374,.374):box('Pegboard side support',(.033,.046,.465),(x,.205,1.078),'black',.004)
    for x in range(14):
        for z in range(8):box('Pegboard recess',(.009,.001,.009),(-.32+x*.049,.192,.9+z*.049),'black',0)
    for x in (-.23,-.08):
        for sign in (-1,1):
            tube('Pliers blue grip',[(x+sign*.017,.175,1.04),(x+sign*.029,.169,1.095),(x+sign*.014,.168,1.143)],.009,'blue')
            jaw=box('Pliers jaws',(.012,.012,.046),(x+sign*.009,.171,1.176),'steel',.002);jaw.rotation_euler.y=sign*-.2
        cylinder('Pliers joint',.011,.015,(x,.169,1.143),'steel','Y')
    cylinder('Screwdriver handle',.011,.063,(.074,.174,1.18),'blue')
    cylinder('Screwdriver shaft',.003,.084,(.074,.174,1.105),'steel')
    box('Scraper wood blade',(.072,.012,.083),(.237,.175,1.18),'wood',.005)
    box('Scraper handle',(.025,.019,.08),(.237,.175,1.095),'black',.005)
    tube('Side push handle',[(.389,-.18,.74),(.447,-.18,.74),(.447,.17,.74),(.389,.17,.74)],.015,'dark')

def export_asset(name,build):
    reset();build();scene=bpy.context.scene
    scene['source']='Native Blender geometry rebuilt from codex_workshop_pack/assets PNG references'
    scene['generator']='scripts/blender/rebuild_workshop_assets.py';scene['web_axis']='Z-up; export_yup=False'
    bpy.ops.wm.save_as_mainfile(filepath=str(MASTERS/f'workshop-{name}.blend'))
    bpy.ops.object.select_all(action='SELECT')
    bpy.context.view_layer.objects.active=next(iter(scene.objects))
    bpy.ops.object.convert(target='MESH')
    # Named parts/modifiers remain editable in master. Web copies merge by material.
    for obj in list(scene.objects):
        if len(obj.data.materials)>1:
            bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
            bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.separate(type='MATERIAL');bpy.ops.object.mode_set(mode='OBJECT')
    buckets={}
    for obj in list(scene.objects):buckets.setdefault(obj.data.materials[0].name,[]).append(obj)
    for mat,objs in buckets.items():
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objs:obj.select_set(True)
        bpy.context.view_layer.objects.active=objs[0];bpy.ops.object.join();bpy.context.object.name=mat
        bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
        scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    bpy.ops.object.select_all(action='SELECT');path=OUT/f'{name}.glb'
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_apply=True,export_yup=False)
    triangles=0;points=[]
    for obj in scene.objects:
        obj.data.calc_loop_triangles();triangles+=len(obj.data.loop_triangles)
        points.extend([obj.matrix_world@Vector(corner) for corner in obj.bound_box])
    size=[max(p[i] for p in points)-min(p[i] for p in points) for i in range(3)]
    assert triangles<40000,(name,triangles)
    assert len(buckets)<=9,(name,len(buckets))
    return {'name':name,'triangles':triangles,'bytes':path.stat().st_size,'size_z_up':size,'materials':len(buckets)}

if __name__=='__main__':
    for folder in (OUT,MASTERS):folder.mkdir(parents=True,exist_ok=True)
    metrics=[export_asset(name,build) for name,build in [('printer-a1',a1),('printer-p1',p1),('filament-spool',spool),('packing-boxes',boxes),('plant',plant),('tool-cabinet',cabinet)]]
    (OUT/'metrics.json').write_text(json.dumps(metrics,indent=2)+'\n',encoding='utf-8')
    print('WORKSHOP_NATIVE_BLENDER_COMPLETE',json.dumps(metrics))

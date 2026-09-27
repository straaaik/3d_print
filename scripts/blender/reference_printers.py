"""Printer silhouettes rebuilt against the user's A1/P1/spool references."""
import bpy, math
from mathutils import Vector
PI=math.pi

def build_a1(api):
    b,c,t=api['box'],api['cylinder'],api['tube']
    for x in (-.215,.215):
        for y in (-.175,.175):b('A1_Foot',(.065,.065,.025),(x,y,.015),'black',.012)
    b('A1_LowerGasket',(.505,.455,.025),(0,0,.035),'black',.011)
    b('A1_CastBase',(.52,.46,.071),(0,0,.078),'light',.019)
    # Y-axis rails sit above the base; separate sled and heater reveal real depth.
    for x in (-.125,.125):
        b('A1_YBearingTrack',(.039,.385,.026),(x,-.015,.126),'black',.003)
        c('A1_YGuide',.006,.368,(x,-.015,.144),'steel','Y',32)
        for y in (-.19,.16):b('A1_YRailEndBlock',(.042,.023,.030),(x,y,.138),'black',.004)
        b('A1_Sled',(.05,.18,.023),(x,-.045,.162),'black',.004)
    b('A1_BedHeater',(.351,.325,.026),(0,-.04,.185),'black',.006)
    b('A1_SpringSteelPlate',(.363,.343,.006),(0,-.049,.203),'steel',.004)
    b('A1_TexturedPrintPlate',(.357,.337,.0025),(0,-.049,.207),'bed',.004)
    for x in (-.164,.164):
        for y in (-.202,.103):
            c('A1_BedMountPad',.012,.011,(x,y,.179),'black')
            c('A1_BedMountScrew',.004,.001,(x,y,.209),'steel',vertices=16)
    for x in (-.217,.217):
        b('A1_ExtrusionColumn',(.060,.065,.481),(x,.118,.36),'light',.006)
        b('A1_ColumnInnerChannel',(.009,.068,.458),(x-math.copysign(.023,x),.117,.356),'black',.001)
        c('A1_ZLeadScrew',.0045,.456,(x-math.copysign(.035,x),.107,.354),'steel',vertices=24)
        b('A1_ZBearingTop',(.022,.036,.035),(x-math.copysign(.029,x),.1,.571),'black',.004)
        b('A1_ColumnEndcap',(.064,.068,.044),(x,.118,.612),'dark',.008)
        b('A1_GantrySideCarriage',(.059,.079,.084),(x,.072,.385),'dark',.005)
        for z in (.358,.415):api['screw'](x,.031,z)
    b('A1_TopCrossmember',(.385,.049,.039),(0,.118,.61),'light',.004)
    b('A1_XStructuralExtrusion',(.480,.035,.052),(0,.043,.388),'light',.003)
    b('A1_XLinearRail',(.455,.007,.023),(0,.022,.388),'steel',.001)
    b('A1_XBeltGroove',(.450,.002,.005),(0,.017,.376),'black',0)
    b('A1_XUpperTrack',(.450,.004,.006),(0,.017,.409),'steel',.001)
    for i in range(11):api['screw'](-.20+i*.04,.016,.389,.0028)
    api['head'](.02,-.006,.385)
    b('A1_XMotorShell',(.052,.072,.086),(.245,.051,.388),'light',.009)
    b('A1_MotorTopInset',(.028,.025,.002),(.245,.05,.432),'black',.003)
    c('A1_MotorPTFEGrommet',.009,.014,(.247,.068,.438),'black')
    t('A1_PTFE_Arch',[(.02,-.008,.472),(.029,.015,.658),(.106,.043,.724),(.229,.072,.644),(.247,.069,.446)],.0048,'light')
    t('A1_BraidedMotorLoom',[(.25,.151,.123),(.252,.15,.30),(.247,.123,.418)],.0085,'black')
    # Distinct overhanging display cradle, not an embedded dark sticker.
    b('A1_DisplayCradle',(.138,.096,.022),(.213,-.24,.04),'light',.01)
    stand=b('A1_DisplayStand',(.105,.035,.079),(.216,-.236,.089),'light',.008);stand.rotation_euler.x=-.40
    screen=b('A1_DisplayHousing',(.125,.024,.133),(.219,-.246,.119),'light',.008);screen.rotation_euler.x=-.40
    for name,size,loc,mat in [('A1_DisplayGasket',(.113,.004,.122),(0,-.014,0),'black'),('A1_DisplayGlass',(.094,.0015,.100),(0,-.017,.003),'bed')]:
        o=b(name,size,(0,0,0),mat,.005);o.parent=screen;o.location=loc
    for i in range(8):b('A1_BaseVent',(.001,.016,.002),(.261,.066+i*.013,.071),'black',0)

def glass_plane(api,name,corners):
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(corners,[],[(0,1,2,3)]);mesh.update()
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);mesh.materials.append(api['M']['glass'])
    # A single optical surface avoids compounded opaque layers in instanced WebGL.
    return obj

def build_p1(api):
    b,c,t=api['box'],api['cylinder'],api['tube']
    for x in (-.205,.205):
        for y in (-.205,.205):b('P1_RubberFoot',(.054,.06,.021),(x,y,.013),'black',.009)
    b('P1_BaseShell',(.480,.480,.063),(0,0,.052),'dark',.012)
    b('P1_ChamberFloor',(.4,.407,.012),(0,.006,.09),'black',.003)
    for x in (-.215,.215):
        for y in (-.217,.217):b('P1_ExtrudedCorner',(.050,.046,.526),(x,y,.344),'dark',.008)
    b('P1_FrontFascia',(.436,.043,.082),(0,-.218,.59),'dark',.007)
    b('P1_RearHeader',(.436,.044,.064),(0,.218,.599),'dark',.008)
    for x in (-.216,.216):
        b('P1_TopSideFrame',(.048,.399,.045),(x,0,.607),'dark',.006)
        b('P1_InnerRoofLip',(.009,.367,.014),(x-math.copysign(.021,x),0,.623),'black',.002)
    b('P1_BackPanel',(.389,.008,.475),(0,.234,.327),'black',.004)
    glass_plane(api,'P1_FrontSmokedGlass',[(-.19,-.237,.092),(.19,-.237,.092),(.19,-.237,.548),(-.19,-.237,.548)])
    for x in (-.233,.233):
        glass_plane(api,'P1_SideSmokedGlass',[(x,-.195,.098),(x,.195,.098),(x,.195,.548),(x,-.195,.548)])
        for z in (.097,.551):b('P1_SideWindowSeal',(.006,.394,.010),(x,0,z),'black',.002)
    for x in (-.196,.196):b('P1_DoorSealVertical',(.012,.010,.466),(x,-.237,.325),'black',.002)
    for z in (.09,.553):b('P1_DoorSealHorizontal',(.397,.009,.010),(0,-.237,z),'black',.002)
    b('P1_DoorHandle',(.016,.025,.112),(.181,-.249,.314),'black',.005)
    for z in (.139,.501):
        b('P1_Hinge',(.018,.014,.032),(-.192,-.246,z),'black',.003)
        api['screw'](-.192,-.254,z,.003)
    for x in (-.177,.177):
        c('P1_ZLeadScrew',.0045,.425,(x,.161,.319),'steel',vertices=32)
        c('P1_ZSmoothRod',.005,.415,(x,-.166,.316),'steel',vertices=32)
        b('P1_BedLiftBracket',(.034,.052,.055),(x,.155,.178),'black',.004)
        b('P1_YRailHousing',(.022,.357,.035),(x,0,.478),'black',.003)
        c('P1_YLinearRod',.004,.338,(x,0,.494),'steel','Y',32)
        b('P1_CoreXYSideCarriage',(.048,.052,.066),(x,-.022,.456),'black',.006)
    b('P1_GantryExtrusion',(.346,.025,.031),(0,-.008,.462),'black',.003)
    for z in (.445,.471):c('P1_XGuideRod',.0045,.353,(0,-.029,z),'steel','X',32)
    # Smaller P1 head, fully below the header with attached side carriages.
    before=set(bpy.context.scene.objects);api['head'](0,0,0)
    for o in set(bpy.context.scene.objects)-before:
        o.location=Vector((.024,-.053,.432))+o.location*.78;o.scale*=.78
    t('P1_FilamentTube',[(.025,-.055,.499),(.024,.01,.552),(.087,.10,.57),(.161,.154,.545)],.0035,'light')
    t('P1_CableChain',[(.032,.015,.485),(.020,.060,.562),(-.054,.12,.573),(-.160,.162,.534)],.007,'black')
    b('P1_BedUnderframe',(.352,.344,.032),(0,-.001,.179),'black',.004)
    b('P1_BedSteelEdge',(.357,.353,.004),(0,-.005,.201),'steel',.003)
    b('P1_TexturedPlate',(.350,.346,.0025),(0,-.005,.205),'bed',.003)
    for x in (-.155,.155):
        for y in (-.154,.14):
            c('P1_BedSpring',.009,.019,(x,y,.151),'steel',vertices=20)
            c('P1_BedAdjustmentKnob',.014,.007,(x,y,.139),'black',vertices=24)
    b('P1_ControlHousing',(.131,.015,.059),(.126,-.244,.592),'black',.007)
    b('P1_LCDBezel',(.087,.002,.044),(.105,-.253,.593),'bed',.003)
    for x in (.088,.124):
        for z in (.583,.604):
            b('P1_LCDButton',(.027,.001,.016),(x,-.255,z),'blue',.001)
            b('P1_LCDGlyph',(.008,.0005,.0015),(x,-.256,z),'light',0)
    c('P1_ControlEncoder',.014,.009,(.171,-.255,.594),'dark','Y',32)
    for x in (-.197,.197):b('P1_LEDStrip',(.006,.30,.004),(x,0,.54),'light',.001)

def build_spool(api):
    M=api['M'];ring=api['ring'];segments=96
    # Front profiles consist of true inset tapered sectors, with lip and rounded shoulders.
    radii=[.029,.034,.041,.046,.052,.086,.092,.099,.105]
    for sign in (-1,1):
        verts=[];faces=[];indices=[]
        for r in radii:
            for i in range(segments):
                a=2*PI*i/segments;sector=a%(PI/3)
                angular=max(0,min(1,(sector-.10)/.07,(PI/3-.10-sector)/.07))
                radial=max(0,min(1,(r-.043)/.007,(.095-r)/.007))
                pocket=angular*radial
                verts.append((sign*(.044-.004*pocket),math.cos(a)*r,.105+math.sin(a)*r))
        for j in range(len(radii)-1):
            for i in range(segments):
                nxt=(i+1)%segments;face=(j*segments+i,j*segments+nxt,(j+1)*segments+nxt,(j+1)*segments+i)
                faces.append(tuple(reversed(face)) if sign>0 else face)
                a=2*PI*(i+.5)/segments%(PI/3);indices.append(1 if .17<a<PI/3-.17 and j in (3,4,5) else 0)
        mesh=bpy.data.meshes.new('Moulded six-pocket flange');mesh.from_pydata(verts,[],faces);mesh.update()
        obj=bpy.data.objects.new('Spool_RecessedFlange',mesh);bpy.context.collection.objects.link(obj)
        mesh.materials.append(M['dark']);mesh.materials.append(M['black'])
        for f,idx in zip(mesh.polygons,indices):f.material_index=idx
        ring('Spool_RimEdge',.105,.100,.007,(sign*.0405,0,.105),'dark',segments=96)
        ring('Spool_AxleLip',.041,.029,.010,(sign*.041,0,.105),'dark',segments=96)
        ring('Spool_BackFlange',.100,.032,.002,(sign*.037,0,.105),'dark',segments=96)
    ring('Spool_HollowHub',.047,.029,.078,(0,0,.105),'black',segments=64)
    ring('Spool_FilamentCore',.086,.046,.073,(0,0,.105),'filament',segments=64)
    for i in range(24):
        bpy.ops.mesh.primitive_torus_add(major_segments=64,minor_segments=6,location=(-.035+i*.00305,0,.105),rotation=(0,PI/2,0),major_radius=.0873,minor_radius=.00150)
        api['finish'](bpy.context.object,'Spool_FilamentWinding','filament')
        for p in bpy.context.object.data.polygons:p.use_smooth=True

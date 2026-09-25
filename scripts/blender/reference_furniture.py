"""Editable workshop furniture modelled from supplied references 4/5/6/10.

All dimensions are metres, front is -Y, and the support plane is Z=0.
Named parts intentionally remain separate for runtime parameter assembly.
"""
import math
import bpy
from mathutils import Vector


def _bolt(api, name, loc, axis='Y', radius=.007):
    """Washer, low hex head and real dark hex socket, facing the viewer."""
    cylinder = api['cylinder']
    direction = Vector((1, 0, 0) if axis == 'X' else (0, -1, 0))
    p = Vector(loc)
    cylinder(name + '_Washer', radius * 1.28, .0015, p, 'black', axis, 20)
    cylinder(name + '_Head', radius, .003, p + direction * .0015, 'steel', axis, 16)
    cylinder(name + '_Socket', radius * .39, .0006, p + direction * .0032, 'black', axis, 6)


def _foot(api, label, x, y, size=.057):
    box = api['box']
    box('Foot_' + label + '_RubberSole', (size + .012, size + .012, .018), (x, y, .009), 'black', .003)
    box('Foot_' + label + '_Cap', (size + .010, size + .010, .016), (x, y, .025), 'dark', .002)


def _rail(api, name, dims, loc):
    return api['box'](name, dims, loc, 'dark', .0025)


def _shelf(api, name, width, depth, z, thickness=.036):
    """A continuous beech slab with a subtly recessed underside."""
    api['box']('Shelf_' + name + '_Wood', (width, depth, thickness), (0, 0, z - thickness / 2), 'wood', .0035)
    api['box']('Shelf_' + name + '_Underlip', (width - .01, depth - .01, .004), (0, 0, z - thickness - .001), 'wood2', .001)


def _rack(api, width, depth, height, levels, label):
    box = api['box']
    post = .060
    px, py = width / 2 - post / 2, depth / 2 - post / 2
    for i, x in enumerate((-px, px)):
        for j, y in enumerate((-py, py)):
            tag = label + '_' + str(i) + str(j)
            _foot(api, tag, x, y, post)
            box('Leg_' + tag + '_Upright', (post, post, height - .033), (x, y, (height + .021) / 2), 'dark', .003)
            box('Frame_' + tag + '_Endcap', (post + .001, post + .001, .006), (x, y, height - .003), 'bed', .002)
            for level, z in enumerate(levels):
                # Both bolt rows are on the joint, rather than floating on wood.
                for row, dz in enumerate((-.004, -.040)):
                    _bolt(api, 'Bolt_' + tag + '_Shelf' + str(level) + '_' + str(row), (x, y - post / 2 - .001, z + dz))
                _bolt(api, 'Bolt_' + tag + '_Side' + str(level), (x + post / 2 + .001, y, z - .025), 'X')
    for n, z in enumerate(levels):
        tag = label + '_' + str(n)
        _shelf(api, tag, width - post * 1.50, depth - .008, z)
        for j, y in enumerate((-py, py)):
            _rail(api, 'Frame_' + tag + '_LongApron' + str(j), (width - post, .041, .056), (0, y, z - .065))
        for i, x in enumerate((-px, px)):
            _rail(api, 'Frame_' + tag + '_SideApron' + str(i), (.043, depth - post, .060), (x, 0, z - .065))
        # Two hidden-but-useful ribs keep editable load-bearing construction real.
        for i, x in enumerate((-width * .23, width * .23)):
            _rail(api, 'Frame_' + tag + '_CrossSupport' + str(i), (.03, depth - .08, .03), (x, 0, z - .056))


def build_filament_rack(api):
    _rack(api, 1.40, .45, 1.45, (.160, .690, 1.220), 'Filament')
    # Upper lateral guard rails, recognisable in reference 4.
    for i, x in enumerate((-.670, .670)):
        _rail(api, 'Frame_Filament_UpperGuard' + str(i), (.039, .39, .055), (x, 0, 1.377))


def build_printer_rack(api):
    _rack(api, 2.20, .75, 1.20, (.205, 1.155), 'Printer')


def _polygon_prism(api, name, polygon, z, thick, mat):
    area = sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(polygon, polygon[1:] + polygon[:1]))
    if area < 0:
        polygon = list(reversed(polygon))
    count = len(polygon)
    verts = [(x, y, z - thick / 2) for x, y in polygon] + [(x, y, z + thick / 2) for x, y in polygon]
    faces = [tuple(reversed(range(count))), tuple(range(count, count * 2))]
    faces += [(i, (i + 1) % count, (i + 1) % count + count, i + count) for i in range(count)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return api['finish'](obj, name, mat, .001)


def _pliers(api, name, x, y, z, needle=False):
    """Cutters/long-nose pliers: separated curved rubber grips and steel jaws."""
    tube, cylinder = api['tube'], api['cylinder']
    before = set(bpy.context.scene.objects)
    for side in (-1, 1):
        points = [(x + side * .034, y - .086, z), (x + side * .035, y - .054, z), (x + side * .018, y - .018, z)]
        tube('Decor_' + name + '_SteelArm' + str(side), points + [(x, y + .014, z)], .006, 'steel')
        tube('Decor_' + name + '_BlueGrip' + str(side), points, .010, 'blue')
        tube('Decor_' + name + '_GripInset' + str(side), [(a + side * .002, b, c + .008) for a, b, c in points], .0026, 'black')
        length = .067 if needle else .036
        shape = [(x + side * .003, y + .012), (x + side * .002, y + length), (x + side * (.011 if needle else .032), y + length * .91), (x + side * .028, y + .012)]
        if side < 0:
            shape.reverse()
        _polygon_prism(api, 'Decor_' + name + '_SteelJaw' + str(side), shape, z, .009, 'steel')
    cylinder('Decor_' + name + '_Pivot', .015, .012, (x, y + .009, z), 'dark', vertices=24)
    cylinder('Decor_' + name + '_PivotRivet', .0065, .0128, (x, y + .009, z), 'steel', vertices=16)
    # Reference tools are normal full-size 20–23 cm hand tools.
    origin = Vector((x, y, z))
    for obj in set(bpy.context.scene.objects) - before:
        # Prisms/curves store absolute coordinates; primitives use local vertices.
        from mathutils import Matrix
        obj.matrix_world = Matrix.Translation(origin) @ Matrix.Diagonal((1.40, 1.40, 1.0, 1.0)) @ Matrix.Translation(-origin) @ obj.matrix_world


def _cutting_mat(api):
    box = api['box']
    # A glTF-compatible material; geometric rules stay crisp at all texture sizes.
    mat = api['M']['leaf'].copy()
    mat.name = 'Cutting_Mat_Teal'
    mat.diffuse_color = (.006, .13, .12, 1)
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (.006, .13, .12, 1)
    bsdf.inputs['Roughness'].default_value = .72
    obj = box('Decor_CuttingMat_Base', (.61, .395, .004), (-.355, -.052, .852), 'black', .004)
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    # The ruler lines are one native mesh instead of hundreds of draw calls.
    verts, faces = [], []
    def line(a, b, width=.00075):
        d = Vector((b[0] - a[0], b[1] - a[1], 0)).normalized()
        p = Vector((-d.y, d.x, 0)) * width / 2
        start, end = Vector((a[0], a[1], .8542)), Vector((b[0], b[1], .8542))
        base = len(verts)
        verts.extend([start - p, end - p, end + p, start + p])
        faces.append((base, base + 1, base + 2, base + 3))
    x0, x1, y0, y1 = -.645, -.065, -.237, .133
    for i in range(21):
        x = x0 + (x1 - x0) * i / 20
        line((x, y0), (x, y1), .001 if i % 5 == 0 else .00065)
    for i in range(14):
        y = y0 + (y1 - y0) * i / 13
        line((x0, y), (x1, y), .001 if i in (0, 13) else .00065)
    line((x0, y0), (x1, y1))
    line((x0, y1), (x1, y0))
    mesh = bpy.data.meshes.new('Decor_CuttingMat_Grid')
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new('Decor_CuttingMat_Grid', mesh)
    bpy.context.collection.objects.link(obj)
    mesh.materials.append(api['M']['light'])


def build_workbench(api):
    box, cylinder, tube = api['box'], api['cylinder'], api['tube']
    _shelf(api, 'Workbench_Top', 1.60, .75, .85, .048)
    for i, x in enumerate((-.726, .726)):
        for j, y in enumerate((-.304, .304)):
            label = 'Workbench_' + str(i) + str(j)
            _foot(api, label, x, y, .056)
            box('Leg_' + label, (.056, .056, .773), (x, y, .4185), 'dark', .003)
            box('Frame_' + label + '_CornerCollar', (.060, .060, .067), (x, y, .770), 'dark', .002)
            _bolt(api, 'Bolt_' + label + '_Front', (x, y - .031, .767))
            _bolt(api, 'Bolt_' + label + '_Side', (x + .031, y, .767), 'X')
            _bolt(api, 'Bolt_' + label + '_Foot', (x, y - .029, .052), radius=.003)
        _rail(api, 'Frame_Workbench_LowerSideRail' + str(i), (.044, .61, .058), (x, 0, .217))
        _rail(api, 'Frame_Workbench_UpperSideRail' + str(i), (.044, .61, .072), (x, 0, .762))
    for j, y in enumerate((-.304, .304)):
        _rail(api, 'Frame_Workbench_LongApron' + str(j), (1.45, .042, .079), (0, y, .7595))
    _rail(api, 'Frame_Workbench_CentreSupport', (.039, .61, .05), (0, 0, .775))
    _cutting_mat(api)
    # Open parts tray in the back-right corner; actual inner floor and rim.
    x, y, w, d, h = .537, .182, .32, .24, .13
    box('Decor_PartsTray_Floor', (w, d, .009), (x, y, .858), 'black', .003)
    for side in (-1, 1):
        box('Decor_PartsTray_Side' + str(side), (.008, d, h), (x + side * (w / 2 - .004), y, .85 + h / 2), 'dark', .002)
        box('Decor_PartsTray_FrontBack' + str(side), (w, .008, h), (x, y + side * (d / 2 - .004), .85 + h / 2), 'dark', .002)
        box('Decor_PartsTray_RimSide' + str(side), (.019, d + .02, .016), (x + side * w / 2, y, .85 + h), 'dark', .003)
        box('Decor_PartsTray_RimCross' + str(side), (w, .019, .016), (x, y + side * d / 2, .85 + h), 'dark', .003)
        for offset in (-.108, .108):
            box('Decor_PartsTray_Rib' + str(side) + '_' + str(offset), (.009, .013, h - .012), (x + offset, y + side * d / 2, .852 + h / 2), 'black', .001)
    # Hollow square tool cup.
    x, y = .202, .211
    box('Decor_ToolCup_Base', (.105, .095, .009), (x, y, .857), 'dark', .003)
    for side in (-1, 1):
        box('Decor_ToolCup_Side' + str(side), (.006, .095, .122), (x + side * .0495, y, .916), 'dark', .002)
        box('Decor_ToolCup_Cross' + str(side), (.099, .006, .122), (x, y + side * .0445, .916), 'dark', .002)
    for i, (dx, dy, height, tilt) in enumerate([(-.028, -.012, .205, -.17), (.014, .016, .238, .10), (.032, -.018, .183, .23), (-.01, .024, .245, -.045)]):
        base = Vector((x + dx, y + dy, .861))
        tip = base + Vector((tilt * height, .016, height))
        tube('Decor_ToolCup_Tool' + str(i) + '_Shaft', [base, tip], .0045, 'steel')
        tube('Decor_ToolCup_Tool' + str(i) + '_Grip', [base.lerp(tip, .53), base.lerp(tip, .91)], .009, 'blue' if i < 2 else 'black')
        cylinder('Decor_ToolCup_Tool' + str(i) + '_Cap', .007, .006, tip, 'steel', vertices=12)
    _pliers(api, 'DiagonalCutters', .106, -.142, .866)
    _pliers(api, 'LongNosePliers', .321, -.171, .866, True)
    # Precision driver lies on tabletop, steel tip towards the front.
    cylinder('Decor_Driver_Shaft', .0032, .176, (.527, -.179, .867), 'steel', 'Y', 16)
    cylinder('Decor_Driver_Handle', .013, .091, (.527, -.144, .867), 'blue', 'Y', 24)
    cylinder('Decor_Driver_Grip', .014, .052, (.527, -.141, .867), 'black', 'Y', 24)
    cylinder('Decor_Driver_Endcap', .015, .009, (.527, -.095, .867), 'blue', 'Y', 24)


def build_room(api):
    """Two demountable wall panels, 3x3 tile floor and wall lamp, reference 10."""
    box = api['box']
    box('FloorTile_Subfloor', (1.92, 1.92, .068), (0, 0, .034), 'dark', .004)
    # Narrow perimeter metal frame, with true grout gaps between nine slabs.
    for side in (-1, 1):
        box('FloorTile_EdgeX' + str(side), (.079, 2, .085), (side * .9605, 0, .0425), 'steel', .004)
        box('FloorTile_EdgeY' + str(side), (1.842, .079, .085), (0, side * .9605, .0425), 'steel', .004)
    pitch = 1.842 / 3
    for i in range(3):
        for j in range(3):
            box('FloorTile_' + str(i) + '_' + str(j), (pitch - .007, pitch - .007, .028), ((i - 1) * pitch, (j - 1) * pitch, .071), 'light', .0018)
    # Corner at rear-left: each panel occupies its own nominal wall bay.
    for label, x, y in [('Corner', -.929, .929), ('LeftEnd', -.929, -.929), ('BackEnd', .929, .929)]:
        box('Pylon_' + label + '_Base', (.142, .142, .092), (x, y, .046), 'steel', .006)
        top = 1.70 if label == 'Corner' else 1.645
        box('Pylon_' + label, (.133, .133, top - .089), (x, y, (top + .071) / 2), 'steel', .005)
        box('Pylon_' + label + '_Cap', (.134, .134, .009), (x, y, top - .0045), 'steel', .003)
    # Back and left panels use light painted sheet metal with dark shadow reveals.
    for label, loc, dims in [('Back', (0, .940, .869), (1.73, .053, 1.49)), ('Left', (-.940, 0, .869), (.053, 1.73, 1.49))]:
        box('Panel_' + label + '_Core', dims, loc, 'dark', .002)
    box('Panel_Back_Face', (1.711, .017, 1.36), (0, .902, .912), 'light', .003)
    box('Panel_Left_Face', (.017, 1.711, 1.36), (-.902, 0, .912), 'light', .003)
    box('Panel_Back_TopRail', (1.735, .085, .052), (0, .935, 1.599), 'steel', .003)
    box('Panel_Left_TopRail', (.085, 1.735, .052), (-.935, 0, 1.599), 'steel', .003)
    for label, dims, loc in [('Back', (1.729, .045, .137), (0, .890, .167)), ('Left', (.045, 1.729, .137), (-.890, 0, .167))]:
        box('Skirting_' + label, dims, loc, 'dark', .003)
    # Panel seams/rim stay geometry, rather than image outlines.
    for s in (-1, 1):
        box('Panel_Back_Edge' + str(s), (.012, .019, 1.36), (s * .842, .891, .912), 'steel', .001)
        box('Panel_Left_Edge' + str(s), (.019, .012, 1.36), (-.891, s * .842, .912), 'steel', .001)
        for z in (.281, 1.548):
            _bolt(api, 'Panel_Back_Fastener' + str(s) + '_' + str(z), (s * .805, .889, z), radius=.008)
            _bolt(api, 'Panel_Left_Fastener' + str(s) + '_' + str(z), (-.889, s * .805, z), 'X', radius=.008)
    # The lamp has a real inset diffuser and end-cap screws, no baked light plane.
    box('LampBody_BackMount', (.708, .031, .126), (.11, .875, 1.39), 'black', .005)
    box('LampBody_Housing', (.702, .067, .112), (.11, .846, 1.393), 'dark', .008)
    box('LampBody_Inset', (.636, .004, .068), (.11, .811, 1.393), 'black', .003)
    diffuser = box('LampDiffuser_Front', (.613, .005, .057), (.11, .808, 1.393), 'light', .003)
    mat = api['M']['light'].copy()
    mat.name = 'Lamp_Warm_Diffuser'
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (1, .89, .69, 1)
    bsdf.inputs['Emission Color'].default_value = (1, .86, .61, 1)
    bsdf.inputs['Emission Strength'].default_value = 1.3
    diffuser.data.materials.clear()
    diffuser.data.materials.append(mat)
    for x in (-.219, .439):
        for z in (1.355, 1.430):
            _bolt(api, 'LampBody_Screw' + str(x) + '_' + str(z), (x, .810, z), radius=.0024)

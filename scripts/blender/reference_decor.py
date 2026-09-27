"""Editable workshop props modelled against reference PNGs 7, 8 and 9.

Builders receive the shared primitive/material API; they never reset or export.
Front is -Y, up is Z, dimensions are metres. No reference-image geometry.
"""
import math
import random
import bpy
from mathutils import Vector


def mesh_part(api, name, vertices, faces, material, bevel=0):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return api['finish'](obj, name, material, bevel)


def plate(api, name, outline, y, thickness, material, bevel=0):
    """Extrude a closed X/Z silhouette; preserves tool and print shapes."""
    n = len(outline)
    vertices = [(x, y - thickness / 2, z) for x, z in outline]
    vertices += [(x, y + thickness / 2, z) for x, z in outline]
    faces = [tuple(range(n - 1, -1, -1)), tuple(range(n, 2 * n))]
    faces += [(i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n)]
    return mesh_part(api, name, vertices, faces, material, bevel)


def closed_line(api, name, coords, radius=.0006, material='dark'):
    # Straight segments avoid the bulging interpolation of Bezier pictograms.
    vertices, faces = [], []
    for start, end in zip(coords, coords[1:]):
        a, b = Vector(start), Vector(end)
        d = b - a
        side = Vector((d.z, 0, -d.x)).normalized() * radius
        base = len(vertices)
        vertices += [a - side, a + side, b + side, b - side]
        faces.append(tuple(base + i for i in range(4)))
    return mesh_part(api, name, vertices, faces, material)


def shipping_marks(api, x, y, z, size):
    """Three actual shipping pictograms: upright, fragile, keep dry."""
    b = api['box']
    for index in range(3):
        cx = x + index * size * 1.22
        coords = [(cx + dx * size, y, z + dz * size) for dx, dz in
                  [(-.47, -.57), (.47, -.57), (.47, .57), (-.47, .57), (-.47, -.57)]]
        closed_line(api, 'Printed handling icon border', coords, size * .023)
        if index == 0:
            for dx in (-.19, .19):
                poly = [(cx + (dx + a) * size, z + v * size) for a, v in
                        [(-.045, -.26), (.045, -.26), (.045, .20), (.13, .20), (0, .43), (-.13, .20), (-.045, .20)]]
                plate(api, 'This way up arrow', poly, y, .00025, 'dark')
            b('Arrow baseline', (size * .64, .0003, size * .05), (cx, y, z - size * .37), 'dark', 0)
        elif index == 1:
            poly = [(cx + a * size, z + v * size) for a, v in
                    [(-.25, .39), (.25, .39), (.24, .02), (.15, -.10), (.035, -.13),
                     (.035, -.35), (.20, -.35), (.20, -.40), (-.20, -.40), (-.20, -.35),
                     (-.035, -.35), (-.035, -.13), (-.15, -.10), (-.24, .02)]]
            plate(api, 'Fragile wineglass print', poly, y, .00025, 'dark')
        else:
            poly = [(cx + math.cos(a) * size * .36, z + math.sin(a) * size * .33)
                    for a in [math.pi * i / 8 for i in range(9)]]
            poly += [(cx - size * .18, z + size * .06), (cx, z), (cx + size * .18, z + size * .06)]
            plate(api, 'Keep dry umbrella canopy', poly, y, .00025, 'dark')
            closed_line(api, 'Umbrella handle', [(cx, y, z + size * .03), (cx, y, z - size * .30),
                                               (cx - size * .05, y, z - size * .37),
                                               (cx - size * .14, y, z - size * .35)], size * .025)


def cube_logo(api, x, y, z, s):
    points = [(0, .52), (.45, .27), (.45, -.27), (0, -.53), (-.45, -.27), (-.45, .27), (0, .52)]
    def line(name, arr):
        closed_line(api, name, [(x + a * s, y, z + b * s) for a, b in arr], s * .035)
    line('Printed shipping cube outline', points)
    line('Printed shipping cube top edges', [(-.45, .27), (0, 0), (.45, .27)])
    line('Printed shipping cube vertical edge', [(0, 0), (0, -.53)])


def build_boxes(api):
    b = api['box']
    # Four cartons at the back, two reusable transport crates at the front.
    cartons = [(-.232, .073, 0, .322, .322, .300),
               (-.221, .085, .302, .274, .282, .197),
               (.112, .132, 0, .342, .348, .304),
               (.112, .132, .306, .342, .348, .340)]
    for index, (x, y, bottom, w, d, h) in enumerate(cartons):
        top = bottom + h
        b('Carton %d corrugated body' % index, (w, d, h - .004), (x, y, bottom + h / 2 - .002), 'card', .0022)
        # Two distinct closed flaps make the middle fold and perimeter legible.
        for sign in (-1, 1):
            b('Carton folded top flap', (w / 2 - .001, d - .001, .0028),
              (x + sign * w / 4, y, top - .0012), 'card', .0006)
        b('Packing tape longitudinal', (.045, d, .0007), (x, y, top + .0006), 'tape', .0001)
        b('Packing tape cross strip', (w, .036, .0008), (x, y + .027, top + .001), 'tape', .0001)
        for sign in (-1, 1):
            b('Packing tape folded over end', (.045, .0007, .068), (x, y + sign * (d / 2 + .0005), top - .033), 'tape', .0001)
            b('Packing tape folded over side', (.0007, .036, .061), (x + sign * (w / 2 + .0005), y + .027, top - .030), 'tape', .0001)
        if index in (0, 3):
            cube_logo(api, x - w * .25, y - d / 2 - .0013, bottom + h * .48, w * .205)
        shipping_marks(api, x - w * .018, y - d / 2 - .0015, bottom + h * .155, w * .10)
    for index, (x, y, w, d, h) in enumerate([(.298, -.037, .244, .293, .414), (.010, -.224, .331, .259, .242)]):
        # Slightly tapered bin with moulded raised corner columns.
        verts = []
        for z, sx, sy in [(.005, w * .475, d * .475), (h - .020, w / 2, d / 2)]:
            verts += [(x - sx, y - sy, z), (x + sx, y - sy, z), (x + sx, y + sy, z), (x - sx, y + sy, z)]
        mesh_part(api, 'Transport crate moulded body %d' % index, verts,
                  [(0, 3, 2, 1), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7), (4, 5, 6, 7)], 'dark', .004)
        for sx in (-1, 1):
            b('Crate corner reinforcing rib', (.012, d - .014, h - .037),
              (x + sx * (w / 2 - .011), y, h / 2), 'dark', .003)
        b('Lid separate lower seam', (w + .005, d + .005, .004), (x, y, h - .016), 'black', .001)
        b('Lid recessed flat centre', (w - .025, d - .026, .012), (x, y, h + .002), 'dark', .002)
        for sy in (-1, 1):
            b('Lid raised front rear rim', (w + .016, .025, .029), (x, y + sy * (d / 2 - .003), h + .004), 'dark', .004)
        for sx in (-1, 1):
            b('Lid raised side rim', (.025, d - .025, .029), (x + sx * (w / 2 - .003), y, h + .004), 'dark', .004)
        fy = y - d / 2 - .001
        for sx in (-1, 1):
            bx = x + sx * w * .31
            b('Lid latch folded shoulder', (.027, .028, .009), (bx, fy + .002, h + .017), 'dark', .002)
            b('Lid latch drop', (.023, .009, .051), (bx, fy - .007, h - .006), 'dark', .002)
        b('Crate label inset socket', (.108, .002, .054), (x, fy - .0012, h * .47), 'black', .002)
        b('Crate blank inventory plate', (.103, .002, .049), (x, fy - .0025, h * .47), 'steel', .0015)
        b('Inventory label upper rule', (.083, .0007, .0012), (x, fy - .0037, h * .47 + .016), 'dark', 0)
        for sx in (-1, 1):
            b('Side carry handle inset', (.002, .100, .041), (x + sx * (w / 2 + .0005), y, h - .059), 'black', .005)
            b('Side carry handle upper grip', (.011, .103, .020), (x + sx * (w / 2 + .004), y, h - .045), 'dark', .003)


def build_plant(api):
    b, c, t = api['box'], api['cylinder'], api['tube']
    vertices = []
    # Hollow square planter, tapered bottom and a substantial rolled top lip.
    for z, r in [(.003, .121), (.326, .166), (.326, .147), (.285, .141)]:
        vertices += [(-r, -r, z), (r, -r, z), (r, r, z), (-r, r, z)]
    faces = [(0, 3, 2, 1)]
    for level in range(3):
        for i in range(4):
            faces.append((level * 4 + i, level * 4 + (i + 1) % 4,
                          (level + 1) * 4 + (i + 1) % 4, (level + 1) * 4 + i))
    mesh_part(api, 'Tapered folded steel planter', vertices, faces, 'dark', .0017)
    for x in (-1, 1):
        for y in (-1, 1):
            t('Planter corner folded seam', [(x * .121, y * .121, .008), (x * .166, y * .166, .324)], .001, 'steel')
    b('Recessed dark soil', (.281, .281, .018), (0, 0, .286), 'soil', .002)
    rng = random.Random(811)
    for i in range(36):
        px, py = rng.uniform(-.126, .126), rng.uniform(-.126, .126)
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=rng.uniform(.013, .024), location=(px, py, .302))
        ob = bpy.context.object
        ob.scale.z = rng.uniform(.40, .70)
        api['finish'](ob, 'Faceted planter soil pebble', 'soil')
    # Five carefully posed broad leaves, matching the tall centre / two tiers
    # of outward-pointing leaves in reference 8. Each has a raised centre vein.
    leaf_specs = [
        ((-.017, .018, .304), (.048, .040, 1.20), .115, .26, -.10),
        ((-.038, .027, .304), (-.255, .005, .95), .107, .28, -.23),
        ((.032, .032, .304), (.293, .074, .99), .106, .26, .15),
        ((-.059, -.047, .304), (-.324, -.044, .648), .078, .25, -.20),
        ((.051, -.060, .304), (.326, -.034, .689), .084, .26, .10),
    ]
    for index, (root, tip, width, stem_fraction, twist) in enumerate(leaf_specs):
        root, tip = Vector(root), Vector(tip)
        delta = tip - root
        # Leaf face points towards the front with a modest alternating twist.
        lateral = Vector((1, twist, -delta.x / max(delta.z, .1))).normalized()
        face_normal = delta.cross(lateral).normalized()
        if face_normal.y > 0:
            face_normal = -face_normal
        stem_fraction *= .43
        width *= 1.32
        start = root + delta * stem_fraction
        t('Leaf thick petiole', [root, root + delta * .07, start + delta * .05], .009, 'leaf')
        verts = [tuple(start)]
        for f, amount in [(.23, .69), (.52, 1.0), (.79, .72)]:
            center = start.lerp(tip, f)
            verts += [tuple(center - lateral * width * amount),
                      tuple(center + face_normal * width * .30),
                      tuple(center + lateral * width * amount)]
        verts += [tuple(tip)]
        faces = [(0, 1, 2), (0, 2, 3)]
        for k in (1, 4):
            faces += [(k, k + 3, k + 1), (k + 1, k + 3, k + 4),
                      (k + 1, k + 4, k + 2), (k + 2, k + 4, k + 5)]
        faces += [(7, 10, 8), (8, 10, 9)]
        ob = mesh_part(api, 'Broad spear leaf %d' % index, verts, faces, 'leaf')
        ob.data.materials.append(api['M']['leaf2'])
        # Large purposeful planes, not random light/dark triangular noise.
        for poly in ob.data.polygons:
            poly.material_index = 1 if poly.index in (0, 2, 3, 6, 7, 10) else 0
        mod = ob.modifiers.new('Organic leaf thickness', 'SOLIDIFY')
        mod.thickness = .0012
        # Raised midrib is subtle and follows the sculpted facet ridge.
        t('Leaf raised midrib', [start, Vector(verts[2]), Vector(verts[5]), Vector(verts[8]), tip], .00085, 'leaf2')


def pegboard(api):
    """Single watertight perforated mesh: holes have real inner walls."""
    x0, x1, z0, z1 = -.349, .349, .864, 1.338
    yf, yb, gap = .216, .230, .0095
    xs = [x0] + [v for i in range(13) for v in (-.313 + i * .052 - gap / 2, -.313 + i * .052 + gap / 2)] + [x1]
    zs = [z0] + [v for i in range(8) for v in (.897 + i * .058 - gap / 2, .897 + i * .058 + gap / 2)] + [z1]
    vertices, faces = [], []
    # Adjacent rectangles share vertices; front/back apertures stay open.
    for yy in (yf, yb):
        vertices += [(xx, yy, zz) for zz in zs for xx in xs]
    nx, nz, offset = len(xs), len(zs), len(xs) * len(zs)
    for iz in range(nz - 1):
        for ix in range(nx - 1):
            a = iz * nx + ix
            if ix % 2 == 1 and iz % 2 == 1:
                for p, q in [(a, a + 1), (a + 1, a + 1 + nx), (a + 1 + nx, a + nx), (a + nx, a)]:
                    faces.append((p, q, q + offset, p + offset))
            else:
                faces += [(a, a + nx, a + nx + 1, a + 1),
                          (a + offset, a + 1 + offset, a + nx + 1 + offset, a + nx + offset)]
    for row in (0, nz - 1):
        for ix in range(nx - 1):
            a = row * nx + ix
            faces.append((a, a + 1, a + 1 + offset, a + offset))
    for col in (0, nx - 1):
        for iz in range(nz - 1):
            a = iz * nx + col
            faces.append((a, a + nx, a + nx + offset, a + offset))
    mesh_part(api, 'Pegboard with 104 open square perforations', vertices, faces, 'bed')


def pliers(api, x, y, z, needle=False):
    t, c = api['tube'], api['cylinder']
    for sign in (-1, 1):
        points = [(x + sign * .017, y, z - .020), (x + sign * .031, y, z - .067),
                  (x + sign * .034, y, z - .117), (x + sign * .027, y, z - .149)]
        t('Pliers black moulded grip', points, .0122, 'black')
        # Visible blue insert follows the entire grip front, black edge remains.
        t('Pliers blue grip insert', [(xx, yy - .007, zz) for xx, yy, zz in points[1:]], .0078, 'blue')
        local = [(.004, -.033), (.022, -.046), (.029, -.015), (.014, .012),
                 (.022, .034), (.010 if needle else .022, .085 if needle else .057),
                 (.003, .086 if needle else .064), (.002, .031), (-.010, .010)]
        outline = [(x + sign * xx, z + zz) for xx, zz in local]
        plate(api, 'Needle nose jaw' if needle else 'Combination pliers jaw', outline, y, .012, 'steel', .0012)
    c('Pliers pivot disc', .013, .016, (x, y - .002, z), 'steel', 'Y', 20)
    c('Pliers pivot pin', .005, .018, (x, y - .003, z), 'dark', 'Y', 12)
    api['box']('Pliers pivot screw slot', (.006, .0008, .001), (x, y - .0125, z), 'steel', 0)


def build_cabinet(api):
    b, c, t, ring = api['box'], api['cylinder'], api['tube'], api['ring']
    for x in (-.329, .329):
        for y in (-.192, .192):
            c('Caster rubber tread', .054, .041, (x, y, .056), 'black', 'X', 32)
            for sign in (-1, 1):
                ring('Caster moulded tire shoulder', .051, .037, .002, (x + sign * .021, y, .056), 'dark', 'X', 32)
                c('Caster wheel inner hub', .028, .002, (x + sign * .023, y, .056), 'black', 'X', 24)
                # Bracket is a tapered metal fork around the tire, not a block.
                outline = [(y - .027, .127), (y + .026, .127), (y + .022, .103),
                           (y + .010, .051), (y - .005, .047), (y - .020, .061)]
                ob = plate(api, 'Caster pressed steel fork', outline, -x - sign * .025, .006, 'steel', .002)
                ob.rotation_euler.z = math.pi / 2
                c('Caster axle bolt', .009, .003, (x + sign * .030, y, .056), 'steel', 'X', 12)
            c('Caster swivel bearing dark race', .038, .009, (x, y, .132), 'black')
            c('Caster swivel bearing chrome', .036, .007, (x, y, .140), 'steel')
            b('Caster chassis mounting plate', (.078, .065, .008), (x, y, .148), 'steel', .003)
            if y < 0:
                b('Caster brake pedal', (.024, .036, .006), (x - .025, y - .030, .100), 'steel', .002)
    b('Cabinet internal shadow shell', (.744, .474, .660), (0, 0, .491), 'black', .004)
    b('Cabinet rear panel', (.748, .015, .662), (0, .244, .492), 'dark', .003)
    for x in (-.378, .378):
        b('Cabinet recessed side sheet', (.012, .452, .597), (x, .003, .491), 'dark', .003)
        for y in (-.226, .229):
            b('Cabinet corner column', (.046, .048, .696), (x, y, .499), 'dark', .004)
        for z in (.184, .790):
            b('Side horizontal frame rail', (.024, .409, .044), (x + math.copysign(.006, x), .001, z), 'dark', .003)
    for z in (.182, .809):
        b('Cabinet front horizontal frame', (.711, .039, .040), (0, -.237, z), 'dark', .003)
    for index, (bottom, height) in enumerate([(.214, .197), (.419, .127), (.554, .116), (.678, .116)]):
        z = bottom + height / 2
        b('Drawer %d folded face' % index, (.692, .022, height), (0, -.250, z), 'dark', .003)
        b('Drawer recessed pull shadow', (.626, .003, .029), (0, -.262, bottom + height - .028), 'black', .001)
        for x in (-.304, .304):
            b('Drawer pull end mounting', (.018, .029, .027), (x, -.273, bottom + height - .029), 'black', .002)
        b('Drawer satin aluminium pull', (.592, .022, .022), (0, -.281, bottom + height - .028), 'steel', .0045)
    b('Worktop underlay', (.805, .530, .020), (0, 0, .839), 'black', .004)
    b('Beech butcher block worktop', (.748, .515, .041), (0, -.004, .861), 'wood', .004)
    # Narrow side guards bound the timber exactly as in the source image.
    for x in (-.391, .391):
        b('Worktop steel side guard', (.035, .530, .042), (x, 0, .862), 'dark', .004)
    # Real flush laminated staves with staggered end joints; restrained contrast.
    for row in range(5):
        yy = -.207 + row * .100
        split = (-.16, .07, -.04, .18, -.22)[row]
        for left, right in [(-.368, split), (split + .0006, .368)]:
            b('Worktop laminated beech stave', (right - left, .0994, .0008), ((left + right) / 2, yy, .882), 'wood', .0001)
    pegboard(api)
    for x in (-.371, .371):
        b('Pegboard square tubular upright', (.042, .048, .486), (x, .224, 1.107), 'dark', .003)
        b('Pegboard top endcap', (.044, .049, .004), (x, .224, 1.351), 'dark', .001)
    for x, needle in [(-.244, True), (-.124, False)]:
        pliers(api, x, .182, 1.214, needle)
        t('Pliers peg hook', [(x, .215, 1.240), (x, .179, 1.240), (x, .176, 1.218)], .0025, 'steel')
    # Full screwdriver: shaft, flattened tip, dark grip and blue insets.
    x, y = .007, .180
    c('Hanging screwdriver shaft', .0036, .132, (x, y, 1.074), 'steel', 'Z', 16)
    plate(api, 'Screwdriver flattened blade', [(x - .0035, 1.013), (x + .0035, 1.013), (x + .002, .999), (x - .002, .999)], y, .0018, 'steel')
    b('Screwdriver contoured black grip', (.033, .028, .130), (x, y, 1.203), 'black', .012)
    b('Screwdriver blue rubber insert', (.010, .003, .093), (x - .007, y - .014, 1.209), 'blue', .004)
    c('Screwdriver blue collar', .014, .005, (x, y, 1.136), 'blue')
    c('Screwdriver butt screw', .004, .001, (x - .007, y - .017, 1.247), 'black', 'Y', 12)
    # Broad scraper blade narrows smoothly into a ferrule and rounded handle.
    x, y = .197, .177
    blade = [(x - .074, 1.273), (x + .074, 1.273), (x + .068, 1.230),
             (x + .051, 1.160), (x + .023, 1.123), (x - .023, 1.123), (x - .051, 1.160), (x - .068, 1.230)]
    plate(api, 'Broad tapered beech scraper blade', blade, y, .012, 'wood', .002)
    b('Scraper thin metal working edge', (.150, .014, .007), (x, y, 1.274), 'steel', .001)
    plate(api, 'Scraper steel neck ferrule', [(x - .022, 1.126), (x + .022, 1.126), (x + .016, 1.098), (x - .016, 1.098)], y, .018, 'steel', .001)
    handle = [(x - .016, 1.103), (x + .016, 1.103), (x + .021, .989),
              (x + .014, .975), (x, .970), (x - .014, .975), (x - .021, .989)]
    plate(api, 'Scraper black shaped handle', handle, y, .025, 'black', .003)
    c('Scraper handle hanging hole dark inset', .008, .001, (x, y - .014, .994), 'bed', 'Y', 20)
    ring('Scraper hanging hole rim', .009, .007, .001, (x, y - .015, .994), 'steel', 'Y', 20)
    c('Scraper ferrule fastener', .003, .002, (x, y - .014, 1.084), 'steel', 'Y', 12)
    # Open tool cup and two additional screwdrivers on the worktop.
    cx, cy = -.261, .118
    b('Tool cup base', (.127, .105, .010), (cx, cy, .889), 'dark', .002)
    for sx in (-1, 1):
        b('Tool cup side wall', (.007, .105, .105), (cx + sx * .060, cy, .942), 'dark', .002)
    for sy in (-1, 1):
        b('Tool cup front back wall', (.116, .007, .105), (cx, cy + sy * .049, .942), 'dark', .002)
        b('Tool cup rolled lip', (.134, .010, .009), (cx, cy + sy * .051, .997), 'dark', .001)
    for xx, material, height in [(cx - .027, 'black', 1.065), (cx + .018, 'blue', 1.072)]:
        c('Cup screwdriver shaft', .003, .085, (xx, cy, .986), 'steel', 'Z', 12)
        b('Cup screwdriver grip', (.016, .018, .055), (xx, cy, height - .027), material, .005)
        b('Cup screwdriver grip groove', (.003, .002, .022), (xx, cy - .009, height - .020), 'black', .0006)
    # Solid industrial side push handle and two offset rectangular brackets.
    for yy in (-.166, .178):
        b('Push bar standoff block', (.071, .034, .053), (.427, yy, .764), 'dark', .004)
        c('Push bar bracket fastener', .008, .002, (.463, yy, .764), 'black', 'X', 12)
    b('Push bar rounded hand grip', (.035, .374, .048), (.460, .006, .768), 'dark', .012)

"""Reusable rounded furniture profiles for dimension-driven workshop furniture."""
import runpy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
ns=runpy.run_path(str(Path(__file__).with_name('rebuild_workshop_assets.py')))
bpy=ns['bpy'];ns['reset']()
for name,x,mat,radius in [('Furniture_Shelf',-1.3,'wood',.018),('Furniture_Frame',0,'dark',.045),('Furniture_Fastener',1.3,'steel',.20)]:
    ns['box'](name,(1,1,1),(x,0,.5),mat,radius)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/blender/workshop-furniture-profiles.blend'))
bpy.ops.object.select_all(action='SELECT');bpy.context.view_layer.objects.active=next(iter(bpy.context.scene.objects))
bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models/workshop/furniture-profiles.glb'),export_format='GLB',use_selection=True,export_apply=True,export_yup=False)

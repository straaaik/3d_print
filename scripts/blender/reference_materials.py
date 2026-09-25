"""Tileable material maps for actual GLB PBR (no baked lighting, no dependencies)."""
import math, struct, zlib
from pathlib import Path
import bpy
import numpy as np
ROOT=Path(__file__).resolve().parents[2]
DIR=ROOT/'assets/textures/workshop'

def png(path,array):
    h,w,c=array.shape
    def chunk(tag,data):return struct.pack('!I',len(data))+tag+data+struct.pack('!I',zlib.crc32(tag+data)&0xffffffff)
    raw=b''.join(b'\x00'+array[y].tobytes() for y in range(h))
    path.write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!2I5B',w,h,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(raw,9))+chunk(b'IEND',b''))

def apply_surfaces(materials):
    DIR.mkdir(parents=True,exist_ok=True)
    n=512;rng=np.random.default_rng(7024)
    yy,xx=np.mgrid[0:n,0:n]/n
    noise=rng.random((n,n))-.5
    for key,base,style,strength in [
        ('wood','bf8845','wood',.18),('wood2','ab793d','wood',.18),
        ('card','bc8a4f','card',.22),('tape','987249','card',.045),
        ('dark','2e3442','powder',.12),('black','151921','powder',.10),
        ('bed','31343b','powder',.35),('light','c2c4cb','powder',.065),
        ('soil','30271e','card',.25),
    ]:
        mat=materials[key];bs=mat.node_tree.nodes.get('Principled BSDF')
        rgb=np.array([int(base[i:i+2],16)/255 for i in (0,2,4)])
        if style=='wood':
            # Fine longitudinal fibers plus staggered strips of laminated beech.
            wave=np.sin(2*math.pi*(yy*67+.7*np.sin(xx*2*math.pi)+.1*np.sin(xx*12*math.pi)))
            fine=np.sin(2*math.pi*(yy*197+.8*np.sin(xx*4*math.pi)))
            plank=np.floor(yy*5).astype(int)
            factor=1+.025*wave+.014*fine+.045*noise+np.array([-.04,.035,-.012,.055,-.025])[plank]
            seams=np.minimum((yy*5)%1,1-(yy*5)%1)<.006
            factor[seams]*=.85
            height=.2*wave+.04*fine+.10*noise
        elif style=='card':
            factor=1+.09*noise+.013*np.sin(yy*math.pi*310)
            height=noise*.28
        else:
            factor=1+noise*(.035 if key=='light' else .065)
            height=noise*.30
        albedo=np.clip(rgb[None,None,:]*factor[:,:,None]*255,0,255).astype(np.uint8)
        gx=(np.roll(height,-1,1)-np.roll(height,1,1))*strength
        gy=(np.roll(height,-1,0)-np.roll(height,1,0))*strength
        normal=np.stack([-gx,-gy,np.ones_like(gx)],axis=-1);normal/=np.linalg.norm(normal,axis=-1)[:,:,None]
        normal=np.clip((normal*.5+.5)*255,0,255).astype(np.uint8)
        for suffix,pixels,space in [('base',albedo,'sRGB'),('normal',normal,'Non-Color')]:
            path=DIR/f'{key}-{suffix}.png';png(path,pixels)
            image=bpy.data.images.load(str(path),check_existing=True);image.colorspace_settings.name=space;image.pack()
            node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=image;node.interpolation='Linear';node.extension='REPEAT'
            if suffix=='base':
                bs.inputs['Base Color'].default_value=(1,1,1,1);mat.node_tree.links.new(node.outputs['Color'],bs.inputs['Base Color'])
            else:
                normal_node=mat.node_tree.nodes.new('ShaderNodeNormalMap');normal_node.inputs['Strength'].default_value=.7
                mat.node_tree.links.new(node.outputs['Color'],normal_node.inputs['Color']);mat.node_tree.links.new(normal_node.outputs['Normal'],bs.inputs['Normal'])

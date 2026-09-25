"""Supported entry point: rebuild all ten assets from the supplied references."""
from pathlib import Path
import runpy
if __name__=='__main__':
    runpy.run_path(str(Path(__file__).with_name('export_reference_assets.py')),run_name='__main__')

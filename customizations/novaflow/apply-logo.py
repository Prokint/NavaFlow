"""Install prepared NovaFlow artwork into a local macOS application, after it has exited."""
from pathlib import Path
import argparse
import copy
import hashlib
import json
import plistlib
import re
import shutil
import struct

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--app', type=Path, required=True)
parser.add_argument('--icns', type=Path, required=True)
parser.add_argument('--backup', type=Path, required=True)
args = parser.parse_args()
repo = Path(__file__).resolve().parents[2]
resources = args.app.resolve() / 'Contents/Resources'
archive = resources / 'app.asar'
args.backup.mkdir(parents=True, exist_ok=False)
for name in ['app.asar', 'icon.icns', 'icon.png']:
    shutil.copy2(resources / name, args.backup / name)
shutil.copy2(args.app / 'Contents/Info.plist', args.backup / 'Info.plist')

def digest(data):
    return hashlib.sha256(data).hexdigest()

def walk(tree, prefix=''):
    for name, value in tree.get('files', {}).items():
        path = (prefix + '/' + name).lstrip('/')
        if 'files' in value:
            yield from walk(value, path)
        else:
            yield path, value

source = (repo / 'packages/client/ui-brand-official/src/client/mark-image.ts').read_text()
new_mark = re.search(r"data:image/webp;base64,[A-Za-z0-9+/=]+", source).group()
with archive.open('rb') as src:
    fields = struct.unpack('<4I', src.read(16))
    tree = json.loads(src.read(fields[3]))
    base = 8 + fields[1]
    packed = [(name, node, copy.deepcopy(node)) for name, node in walk(tree) if 'offset' in node]
    changes = {}
    brand_path = 'dsh/node_modules/@deepseek-ai/dsh-client-ui-brand-official/lib/client.js'
    favicon_path = 'dsh/node_modules/@deepseek-ai/dsh-web-frontend/dist/favicon.svg'
    for name, node, old in packed:
        if name == brand_path:
            src.seek(base + int(old['offset']))
            data = src.read(old['size']).decode()
            updated, count = re.subn(
                r'(HALLUCODEX_MARK_IMAGE\s*=\s*[\'\"])data:image/webp;base64,[A-Za-z0-9+/=]+',
                lambda match: match[1] + new_mark, data)
            assert count == 1, 'Expected one embedded product mark'
            changes[name] = updated.encode()
        elif name == favicon_path:
            changes[name] = (repo / 'apps/web/public/favicon.svg').read_bytes()
    assert brand_path in changes and favicon_path in changes
    manifest_name = 'dsh/desktop-runtime.json'
    old = next(old for name, node, old in packed if name == manifest_name)
    src.seek(base + int(old['offset']))
    manifest = json.loads(src.read(old['size']))
    def refresh(value):
        if isinstance(value, dict):
            path = value.get('path')
            data = changes.get('dsh/' + path) if isinstance(path, str) else None
            if data is not None:
                for key in ['hash', 'sha256']:
                    if key in value and isinstance(value[key], str) and len(value[key]) == 64:
                        value[key] = digest(data)
                if 'size' in value:
                    value['size'] = len(data)
            for child in value.values():
                refresh(child)
        elif isinstance(value, list):
            for child in value:
                refresh(child)
    refresh(manifest)
    changes[manifest_name] = (json.dumps(manifest, ensure_ascii=False, indent=2) + '\n').encode()
    offset = 0
    for name, node, old in packed:
        if name in changes:
            data = changes[name]
            node['size'] = len(data)
            block_size = node.get('integrity', {}).get('blockSize', 4194304)
            node['integrity'] = {
                'algorithm': 'SHA256', 'hash': digest(data), 'blockSize': block_size,
                'blocks': [digest(data[i:i + block_size]) for i in range(0, len(data), block_size)],
            }
        node['offset'] = str(offset)
        offset += node['size']
    header = json.dumps(tree, ensure_ascii=False, separators=(',', ':')).encode()
    payload_size = (4 + len(header) + 3) // 4 * 4
    temporary = archive.with_suffix('.asar.tmp')
    with temporary.open('wb') as out:
        out.write(struct.pack('<4I', 4, payload_size + 4, payload_size, len(header)))
        out.write(header)
        out.write(b'\0' * (payload_size - 4 - len(header)))
        for name, node, old in packed:
            if name in changes:
                out.write(changes[name])
            else:
                src.seek(base + int(old['offset']))
                remaining = old['size']
                while remaining:
                    data = src.read(min(remaining, 1024 * 1024))
                    assert data, name
                    out.write(data)
                    remaining -= len(data)
    temporary.replace(archive)
plist_path = args.app / 'Contents/Info.plist'
plist = plistlib.loads(plist_path.read_bytes())
plist['ElectronAsarIntegrity']['Resources/app.asar']['hash'] = digest(header)
plist['CFBundleIconFile'] = 'novaflow.icns'
plist_path.write_bytes(plistlib.dumps(plist))
shutil.copy2(args.icns, resources / 'icon.icns')
shutil.copy2(args.icns, resources / 'novaflow.icns')
shutil.copy2(repo / 'apps/desktop/resources/icon-windows.png', resources / 'icon.png')
print('Updated native icon, in-app mark, favicon and ASAR integrity. Sign the application before launching.')

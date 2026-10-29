"""Install built first-party modules into a stopped local NovaFlow macOS package."""
from pathlib import Path
import argparse
import copy
import hashlib
import json
import plistlib
import shutil
import struct

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--app', type=Path, required=True)
parser.add_argument('--backup', type=Path, required=True)
args = parser.parse_args()
repo = Path(__file__).resolve().parents[2]
archive = args.app / 'Contents/Resources/app.asar'
plist_path = args.app / 'Contents/Info.plist'
args.backup.mkdir(parents=True, exist_ok=False)
shutil.copy2(archive, args.backup / 'app.asar')
shutil.copy2(plist_path, args.backup / 'Info.plist')

def digest(data):
    return hashlib.sha256(data).hexdigest()

def walk(tree, prefix=''):
    for name, node in tree.get('files', {}).items():
        path = (prefix + '/' + name).lstrip('/')
        if 'files' in node:
            yield from walk(node, path)
        else:
            yield path, node

changes = {}
for filename in ['main.js', 'preload-app.cjs']:
    changes['lib/' + filename] = (repo / 'apps/desktop/lib' / filename).read_bytes()
for package, source, filenames in [
    ('dsh-desktop-host', 'apps/desktop-host', ['index.js', 'hallucodex.js', 'hallucodex.patch.yml']),
    ('dsh-client-ui-brand-official', 'packages/client/ui-brand-official', ['client.js']),
    ('dsh-client-ui-settings-general', 'packages/client/ui-settings-general', ['client.js']),
    ('dsh-client-ui-settings-models', 'packages/client/ui-settings-models', ['client.js']),
]:
    for filename in filenames:
        changes[f'dsh/node_modules/@deepseek-ai/{package}/lib/{filename}'] = (repo / source / 'lib' / filename).read_bytes()

with archive.open('rb') as src:
    fields = struct.unpack('<4I', src.read(16))
    tree = json.loads(src.read(fields[3]))
    base = 8 + fields[1]
    packed = [(name, node, copy.deepcopy(node)) for name, node in walk(tree) if 'offset' in node]
    assert set(changes) <= {name for name, _, _ in packed}, 'A built module is absent from the package'
    manifest_name = 'dsh/desktop-runtime.json'
    old = next(old for name, _, old in packed if name == manifest_name)
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
        for name, _, old in packed:
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

info = plistlib.loads(plist_path.read_bytes())
info['ElectronAsarIntegrity']['Resources/app.asar']['hash'] = digest(header)
plist_path.write_bytes(plistlib.dumps(info))
print(json.dumps({'updated': list(changes), 'backup': str(args.backup)}, indent=2))

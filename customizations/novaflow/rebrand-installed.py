"""Rebrand the local desktop copy; keep protocol IDs, data, attribution and images."""
from pathlib import Path
import argparse
import copy
import hashlib
import json
import plistlib
import struct
import subprocess
import tempfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source-app', type=Path, required=True)
parser.add_argument('--output-app', type=Path, required=True)
parser.add_argument('--source-name', required=True, help='Display name used by the source application')
args = parser.parse_args()
SOURCE_APP = args.source_app.resolve()
APP = args.output_app.resolve()
source_name = args.source_name
if not source_name or '/' in source_name or '\\' in source_name:
    parser.error('source-name must be a nonempty application display name')
source_bytes = source_name.encode()
if SOURCE_APP == APP:
    parser.error('source and output applications must differ')
if APP.exists():
    parser.error('output application already exists; select a new path')
subprocess.run(['ditto', str(SOURCE_APP), str(APP)], check=True)
ROOT = APP.parent
SOURCE = SOURCE_APP / 'Contents/Resources/app.asar'
TARGET = APP / 'Contents/Resources/app.asar'

def digest(data):
    return hashlib.sha256(data).hexdigest()

def entries(tree, prefix=''):
    for name, node in tree.get('files', {}).items():
        path = (prefix + '/' + name).lstrip('/')
        if 'files' in node:
            yield from entries(node, path)
        else:
            yield path, node

with SOURCE.open('rb') as src:
    fields = struct.unpack('<4I', src.read(16))
    original_header = src.read(fields[3])
    tree = json.loads(original_header)
    original_base = 8 + fields[1]
    packed = [(name, node, copy.deepcopy(node)) for name, node in entries(tree) if 'offset' in node]
    changes = {}
    report = []
    for name, node, old in packed:
        first_party = name.startswith(('lib/', 'dsh/node_modules/@deepseek-ai/')) or name == 'package.json'
        if not first_party or not name.endswith(('.js', '.cjs', '.json', '.html', '.yml', '.css')):
            continue
        src.seek(original_base + int(old['offset']))
        data = src.read(old['size'])
        if source_bytes not in data:
            continue
        updated = data.replace(source_bytes, b'NovaFlow')
        if name == 'lib/main.js':
            # Disable the original release source on this local custom build.
            marker = b'checkForRelease = (manual) => {'
            assert updated.count(marker) == 1
            notice = '''
        if (manual) return ordinaryMessageBox({type: "info", title: "NovaFlow",
            message: "NovaFlow 本地定制版 / Local build",
            detail: "此版本暂不检查上游更新，以保留 NovaFlow 定制。 / Upstream updates are disabled for this custom build."
        }).then(() => {});
        return Promise.resolve();
'''.encode()
            updated = updated.replace(marker, marker + notice)
        if name.endswith(('.js', '.cjs')):
            with tempfile.NamedTemporaryFile(suffix='.cjs' if name.endswith('.cjs') else '.mjs') as check:
                check.write(updated)
                check.flush()
                subprocess.run(['node', '--check', check.name], check=True, capture_output=True)
        changes[name] = updated
        report.append({'path': name, 'replacements': data.count(source_bytes), 'sha256': digest(updated)})

    # Refresh the shipped runtime manifest for changed first-party modules.
    manifest_name = 'dsh/desktop-runtime.json'
    manifest_node = next(old for name, node, old in packed if name == manifest_name)
    src.seek(original_base + int(manifest_node['offset']))
    manifest = json.loads(src.read(manifest_node['size']))
    def refresh(value):
        if isinstance(value, dict):
            path = value.get('path')
            data = changes.get('dsh/' + path) if isinstance(path, str) else None
            if data is not None:
                for key in ('sha256', 'hash'):
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
            node['integrity'] = {'algorithm': 'SHA256', 'hash': digest(data), 'blockSize': block_size,
                                 'blocks': [digest(data[i:i+block_size]) for i in range(0, len(data), block_size)]}
        node['offset'] = str(offset)
        offset += node['size']
    header = json.dumps(tree, ensure_ascii=False, separators=(',', ':')).encode()
    payload_size = (4 + len(header) + 3) // 4 * 4
    header_size = 4 + payload_size
    with TARGET.with_suffix('.asar.tmp').open('wb') as out:
        out.write(struct.pack('<4I', 4, header_size, payload_size, len(header)))
        out.write(header)
        out.write(b'\0' * (payload_size - 4 - len(header)))
        for name, node, old in packed:
            if name in changes:
                out.write(changes[name])
            else:
                src.seek(original_base + int(old['offset']))
                remaining = old['size']
                while remaining:
                    data = src.read(min(remaining, 1024 * 1024))
                    assert data, name
                    out.write(data)
                    remaining -= len(data)
    TARGET.with_suffix('.asar.tmp').replace(TARGET)

plist_path = APP / 'Contents/Info.plist'
plist = plistlib.loads(plist_path.read_bytes())
plist['CFBundleDisplayName'] = 'NovaFlow'
plist['CFBundleName'] = 'NovaFlow'
plist['CFBundleExecutable'] = 'NovaFlow'
plist['NSMicrophoneUsageDescription'] = plist['NSMicrophoneUsageDescription'].replace(source_name, 'NovaFlow')
plist['ElectronAsarIntegrity']['Resources/app.asar']['hash'] = digest(header)
plist_path.write_bytes(plistlib.dumps(plist))
original_executable = APP / 'Contents/MacOS' / source_name
if original_executable.exists():
    original_executable.rename(original_executable.with_name('NovaFlow'))
for helper in (APP / 'Contents/Frameworks').glob(f'{source_name} Helper*.app'):
    helper_plist = helper / 'Contents/Info.plist'
    meta = plistlib.loads(helper_plist.read_bytes())
    old_executable = meta['CFBundleExecutable']
    for key in ('CFBundleExecutable', 'CFBundleName', 'CFBundleDisplayName'):
        if key in meta:
            meta[key] = meta[key].replace(source_name, 'NovaFlow')
    helper_plist.write_bytes(plistlib.dumps(meta))
    exe = helper / 'Contents/MacOS' / old_executable
    exe.rename(exe.with_name(meta['CFBundleExecutable']))
    helper.rename(helper.with_name(helper.name.replace(source_name, 'NovaFlow')))
update = APP / 'Contents/Resources/app-update.yml'
if update.exists():
    update.rename(update.with_suffix('.yml.disabled'))
(ROOT / 'changes.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print(f'Rebranded {len(report)} resources. Original images, data paths and authentication protocol retained.')

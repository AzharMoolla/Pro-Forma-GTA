#!/usr/bin/env python3
"""Verify that no files in the handoff differ from MANIFEST.json. Python stdlib only."""
from pathlib import Path
import hashlib, json, sys
root=Path(__file__).resolve().parents[1]
manifest=json.loads((root/'MANIFEST.json').read_text(encoding='utf-8'))
failures=[]
for item in manifest['files']:
    p=root/item['path']
    if not p.is_file(): failures.append('missing: '+str(p)); continue
    raw=p.read_bytes()
    if len(raw)!=item['size_bytes'] or hashlib.sha256(raw).hexdigest()!=item['sha256']:
        failures.append('different: '+str(p))
expected={item['path'] for item in manifest['files']}|{'MANIFEST.json'}
actual={str(p.relative_to(root)).replace('\\','/') for p in root.rglob('*') if p.is_file()}
for e in sorted(actual-expected): failures.append('extra file: '+e)
print('Verified',len(manifest['files']),'files; errors:',len(failures))
for v in failures: print(v)
sys.exit(bool(failures))

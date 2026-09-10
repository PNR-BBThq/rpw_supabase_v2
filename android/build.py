#!/usr/bin/env python3
"""Dependency-free SDK build. Debug APKs use a separate application ID and key."""
import argparse
import hashlib
import os
from pathlib import Path
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET
import zipfile

parser = argparse.ArgumentParser()
parser.add_argument('--debug', action='store_true', help='Isolated installable test APK; never updates the release app')
parser.add_argument('--unsigned', action='store_true', help='Validate release packaging without access to signing keys')
args = parser.parse_args()
if args.debug and args.unsigned:
    parser.error('Choose debug or unsigned, not both')
root = Path(__file__).resolve().parent
sdk_value = os.environ.get('ANDROID_SDK_ROOT') or os.environ.get('ANDROID_HOME')
if not sdk_value:
    sys.exit('Set ANDROID_SDK_ROOT to an SDK containing platform 35 and build-tools 35.0.0.')
sdk = Path(sdk_value)
tools = sdk / 'build-tools/35.0.0'
platform = sdk / 'platforms/android-35/android.jar'
for path in [platform, *(tools / name for name in ['aapt2', 'd8', 'zipalign', 'apksigner'])]:
    if not path.exists():
        sys.exit(f'Missing Android SDK component: {path}')
if not shutil.which('java'):
    sys.exit('JDK 17 is required.')
if not args.debug and not args.unsigned:
    for env in ['PNR_SIGNING_STORE', 'PNR_SIGNING_PASSWORD']:
        if not os.environ.get(env):
            sys.exit(f'Missing {env}. Release signing never falls back to a debug key.')
source = root / 'app/src/main'
variant = 'debug' if args.debug else 'release'
build = root / 'build' / variant
shutil.rmtree(build, ignore_errors=True)
for name in ['classes', 'dex', 'generated']:
    (build / name).mkdir(parents=True, exist_ok=True)

def run(*argv):
    subprocess.run([str(a) for a in argv], check=True)

manifest = ET.parse(source / 'AndroidManifest.xml')
ns = '{http://schemas.android.com/apk/res/android}'
version = manifest.getroot().get(ns + 'versionName')
if args.debug:
    manifest.find('application').set(ns + 'debuggable', 'true')
    manifest.find('application').set(ns + 'label', 'PNR V2 Ujian')
    ET.SubElement(manifest.getroot(), 'instrumentation', {ns + 'name': 'my.pnr.digital.v2.NativeChecks', ns + 'targetPackage': 'my.pnr.digital.v2.debug'})
else:
    manifest.find('application').set(ns + 'debuggable', 'false')
manifest.write(build / 'AndroidManifest.xml', encoding='utf-8', xml_declaration=True)
run(tools / 'aapt2', 'compile', '--dir', source / 'res', '-o', build / 'resources.zip')
extra = ['--rename-manifest-package', 'my.pnr.digital.v2.debug'] if args.debug else []
run(tools / 'aapt2', 'link', '-o', build / 'unsigned.apk', '-I', platform,
    '--manifest', build / 'AndroidManifest.xml', '-A', source / 'assets',
    '--custom-package', 'my.pnr.digital.v2', '--java', build / 'generated', *extra, build / 'resources.zip')
java = sorted((source / 'java').rglob('*.java')) + sorted((build / 'generated').rglob('*.java'))
if args.debug:
    java += sorted((root / 'app/src/debug/java').rglob('*.java'))
compiler = ['javac'] if shutil.which('javac') else ['java', '-m', 'jdk.compiler/com.sun.tools.javac.Main']
run(*compiler, '-source', '8', '-target', '8', '-encoding', 'UTF-8', '-classpath', platform, '-d', build / 'classes', *java)
run(tools / 'd8', '--lib', platform, '--min-api', '29', '--output', build / 'dex', *sorted((build / 'classes').rglob('*.class')))
with zipfile.ZipFile(build / 'unsigned.apk', 'a', compression=zipfile.ZIP_DEFLATED) as archive:
    for dex in sorted((build / 'dex').glob('*.dex')):
        archive.write(dex, dex.name)
output = build / f'PNR-Digital-V2-{version}-{variant}{"-unsigned" if args.unsigned else ""}.apk'
run(tools / 'zipalign', '-f', '-p', '4', build / 'unsigned.apk', build / 'aligned.apk')
if args.unsigned:
    shutil.copy2(build / 'aligned.apk', output)
else:
    if args.debug:
        key = root / '.debug-keystore.jks'
        if not key.exists():
            run('keytool', '-genkeypair', '-keystore', key, '-alias', 'androiddebugkey', '-storepass', 'android', '-keypass', 'android', '-dname', 'CN=PNR Debug', '-keyalg', 'RSA', '-validity', '3650')
        signing = ['--ks', key, '--ks-key-alias', 'androiddebugkey', '--ks-pass', 'pass:android']
    else:
        signing = ['--ks', os.environ['PNR_SIGNING_STORE'], '--ks-key-alias', os.environ.get('PNR_SIGNING_ALIAS', 'pnr-v2'), '--ks-pass', 'env:PNR_SIGNING_PASSWORD']
    run(tools / 'apksigner', 'sign', *signing, '--out', output, build / 'aligned.apk')
    run(tools / 'apksigner', 'verify', '--verbose', '--print-certs', output)
run(tools / 'zipalign', '-c', '-p', '4', output)
output.with_suffix('.apk.sha256').write_text(hashlib.sha256(output.read_bytes()).hexdigest() + '  ' + output.name + '\n')
print('APK:', output)

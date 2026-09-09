#!/usr/bin/env python3
"""Build signed APK using Android SDK 35 + JDK 17, without Gradle dependencies."""
import os, pathlib, subprocess, shutil, zipfile
root=pathlib.Path(__file__).resolve().parent
sdk=pathlib.Path(os.environ['ANDROID_SDK_ROOT'])
tools=sdk/'build-tools/35.0.0'; platform=sdk/'platforms/android-35/android.jar'
source=root/'app/src/main'; build=root/'build'; build.mkdir(exist_ok=True)
for name in ['classes','dex','generated']:
 shutil.rmtree(build/name,ignore_errors=True)
 (build/name).mkdir(exist_ok=True)
def run(*args):subprocess.run([str(a) for a in args],check=True)
run(tools/'aapt2','compile','--dir',source/'res','-o',build/'resources.zip')
run(tools/'aapt2','link','-o',build/'unsigned.apk','-I',platform,'--manifest',source/'AndroidManifest.xml','-A',source/'assets','--java',build/'generated',build/'resources.zip')
java=list((source/'java').rglob('*.java'))+list((build/'generated').rglob('*.java'))
run(*(['javac'] if shutil.which('javac') else ['java','-m','jdk.compiler/com.sun.tools.javac.Main']),'-source','8','-target','8','-encoding','UTF-8','-classpath',platform,'-d',build/'classes',*java)
run(tools/'d8','--lib',platform,'--min-api','29','--output',build/'dex',*list((build/'classes').rglob('*.class')))
with zipfile.ZipFile(build/'unsigned.apk','a',compression=zipfile.ZIP_DEFLATED) as archive:
 for dex in (build/'dex').glob('*.dex'):archive.write(dex,dex.name)
run(tools/'zipalign','-f','-p','4',build/'unsigned.apk',build/'aligned.apk')
output=build/'PNR-Digital-V2-Native-2.0.0.apk'
run(tools/'apksigner','sign','--ks',os.environ['PNR_SIGNING_STORE'],'--ks-key-alias','pnr-v2','--ks-pass','env:PNR_SIGNING_PASSWORD','--out',output,build/'aligned.apk')
run(tools/'apksigner','verify','--verbose',output)
print('APK:',output)

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Builder = void 0;
var cp = require("child_process");
var process_1 = require("process");
var fs = require("fs-extra");
var path = require("path");
var _ = require("lodash");
var Builder = /** @class */ (function () {
    function Builder() {
    }
    Builder.prototype.start = function (projectPath, platform, gameid, buildApk) {
        process.chdir(projectPath);
        var projectFilesRoot = path.join(projectPath, 'build/projectfiles', platform);
        var patchPath = path.join(projectFilesRoot, 'patch');
        var cfgPath = path.join(projectFilesRoot, 'common/cfg.json');
        var cfgContent = fs.readFileSync(cfgPath, 'utf-8');
        var cfgDscb = JSON.parse(cfgContent);
        var cfgJson = cfgDscb[gameid];
        if (!cfgJson) {
            console.error('no cfg found: %d', gameid);
        }
        // 读取全局配置
        var globalCfg = cfgDscb['global'];
        // 合并配置
        cfgJson = _.assign(globalCfg, cfgJson);
        console.log(cfgJson);
        // 先打layadcc
        var dccOutPath = path.join(cfgJson.output_path, cfgJson.projName, 'dcc');
        fs.ensureDirSync(dccOutPath);
        fs.emptyDirSync(dccOutPath);
        var dccCmd = 'layadcc ' + cfgJson.res_path + ' -cache -url ' + cfgJson.url + ' -cout ' + path.resolve(dccOutPath);
        console.log('start layadcc: %s', dccCmd);
        var startAt = _.now();
        console.log(cp.execSync(dccCmd, { encoding: 'utf-8' }));
        console.log('layadcc finished, %d s costed.', Math.floor(_.now() - startAt) / 1000);
        var dccCachePath = path.join(dccOutPath, 'cache');
        var dirChilds = fs.readdirSync(dccCachePath);
        var dccCacheFilesRoot = path.join(dccCachePath, dirChilds[0]);
        var builtInCacheRoot = path.join(cfgJson.output_path, cfgJson.projName, 'builtin');
        fs.ensureDirSync(builtInCacheRoot);
        fs.emptyDirSync(builtInCacheRoot);
        // 筛选需要打进包内的资源
        if (cfgJson.builtin) {
            var builtinPath = path.join(projectFilesRoot, cfgJson.builtin);
            var builtinLines = fs.readFileSync(builtinPath, 'utf-8').split(/[\r\n]+/);
            var builtinCnt = builtinLines.length;
            if (builtinCnt > 0) {
                var allfilesPath = path.join(dccCacheFilesRoot, 'allfiles.txt');
                var allfilesLines = fs.readFileSync(allfilesPath, 'utf-8').split(/[\r\n]+/);
                var filetablePath = path.join(dccCacheFilesRoot, 'filetable.txt');
                var filetableLines = fs.readFileSync(filetablePath, 'utf-8').split(/[\r\n]+/);
                var StartLineNum = 3;
                // builtin.txt按照文件顺序写的，也就是说和allfiles.txt顺序是一致的，动态调整循环匹配的起始行，比每次都从第一个进行匹配效率高
                var startMatchIdx = 0;
                // allfiles.txt前3行校验用
                for (var i = StartLineNum, len = allfilesLines.length; i < len; i++) {
                    var oneFile = allfilesLines[i];
                    var needBuiltin = false;
                    var s = startMatchIdx;
                    for (var j = s; j < builtinCnt; j++) {
                        if (oneFile.startsWith(builtinLines[j])) {
                            needBuiltin = true;
                            startMatchIdx = j;
                            break;
                        }
                    }
                    if (!needBuiltin) {
                        for (var j = 0; j < s; j++) {
                            if (oneFile.startsWith(builtinLines[j])) {
                                needBuiltin = true;
                                break;
                            }
                        }
                    }
                    if (needBuiltin) {
                        var cacheFileName = filetableLines[i + StartLineNum].split(/\s+/)[0];
                        var cacheFilePath = path.join(dccCacheFilesRoot, cacheFileName);
                        fs.copyFileSync(cacheFilePath, path.join(builtInCacheRoot, cacheFileName));
                        fs.copyFileSync(cacheFilePath, path.join(patchPath, cacheFileName));
                    }
                }
            }
        }
        // 输出android工程
        if (buildApk) {
            var androidProjPath = path.join(cfgJson.output_path, cfgJson.projName, cfgJson.platform);
            fs.removeSync(androidProjPath);
            // cmd = 'layanative createapp [-f res_path] [--path output_path] [-s sdk_path | -v version] [-p all|ios|android_eclipse|android_studio] [-t 0|1|2] [-u url] [-n project_name] [-a app_name] [--package_name package_name]'
            var nativeCmd = 'layanative createapp --path ' + cfgJson.output_path + ' -v ' + cfgJson.sdkver + ' -p ' + cfgJson.platform + ' -u ' + cfgJson.url + ' -n ' + cfgJson.projName + ' -a ' + cfgJson.appName + ' --package_name ' + cfgJson.package_name + ' -d ' + cfgJson.dememsionType;
            console.log('start create app: %s', nativeCmd);
            startAt = _.now();
            console.log(cp.execSync(nativeCmd, { encoding: 'utf-8' }));
            console.log('createapp finished, %d s costed.', Math.floor((_.now() - startAt) / 1000));
            // 资源替换
            var projectReplaces = ['default', gameid + ''];
            for (var _i = 0, projectReplaces_1 = projectReplaces; _i < projectReplaces_1.length; _i++) {
                var oneReplace = projectReplaces_1[_i];
                var projectReplaceRoot = path.join(projectFilesRoot, 'android_studio', oneReplace);
                if (fs.existsSync(projectReplaceRoot)) {
                    console.log('replace project files from %s to %s', projectFilesRoot, androidProjPath);
                    fs.copySync(projectReplaceRoot, androidProjPath);
                }
                else {
                    console.log('replace root not exists: %s', projectReplaceRoot);
                }
            }
            // 读取版本号
            var oldVer = 0;
            var versionFile = path.join(projectFilesRoot, 'version.txt');
            if (fs.existsSync(versionFile)) {
                oldVer = Number(fs.readFileSync(versionFile, 'utf-8'));
            }
            var newVer = oldVer + 1;
            var newVerName = '1.0.0.' + newVer;
            fs.writeFileSync(versionFile, newVer.toString(), 'utf-8');
            // 修改版本号
            var manifestFile = path.join(androidProjPath, 'app/src/main/AndroidManifest.xml');
            var manifestContent = fs.readFileSync(manifestFile, 'utf-8');
            manifestContent = manifestContent.replace(/(?<=versionCode=")\d+(?=")/, newVer.toString());
            manifestContent = manifestContent.replace(/(?<=versionName=")\S+(?=")/, newVerName);
            // 覆盖gradle脚本，增加签名信息、扩大jvm内存
            var appGradleContent = fs.readFileSync(path.join(__dirname, 'assets/build.gradle'), 'utf-8');
            for (var rkey in cfgJson.replacement) {
                appGradleContent = appGradleContent.replace('{' + rkey + '}', cfgJson.replacement[rkey]);
            }
            var appGradlePath = path.join(androidProjPath, 'app/build.gradle');
            fs.writeFileSync(appGradlePath, appGradleContent, 'utf-8');
            // 拷贝包内资源
            fs.copySync(builtInCacheRoot, path.join(androidProjPath, 'app/src/main/assets/cache', dirChilds[0]));
            // 拷贝local.properties、gradle.properties
            var coverFiles = ['local.properties', 'gradle.properties'];
            for (var _a = 0, coverFiles_1 = coverFiles; _a < coverFiles_1.length; _a++) {
                var oneCoverFile = coverFiles_1[_a];
                var localPropertiesPath = path.join(__dirname, 'assets', oneCoverFile);
                fs.copySync(localPropertiesPath, path.join(androidProjPath, oneCoverFile));
            }
            // 打包
            process.chdir(androidProjPath);
            console.log('now we are %s', process.cwd());
            var gradleCmd = cfgJson.gradleTool + '/gradlew assembleRelease';
            console.log('start gradle: %s', gradleCmd);
            startAt = _.now();
            console.log(cp.execSync(gradleCmd, { encoding: 'utf-8' }));
            console.log('assemble finished, %d s costed.', Math.floor((_.now() - startAt) / 1000));
            process.chdir(projectPath);
            // 拷贝apk到增量包
            var apkPath = path.join(androidProjPath, 'app/build/outputs/apk/release/app-release.apk');
            var targetApkPath = path.join(patchPath, 'apk', cfgJson.package_name + '.v' + newVerName + '.apk');
            this.copyFileEnsureExists(apkPath, targetApkPath);
        }
    };
    Builder.prototype.copyFileEnsureExists = function (src, dest) {
        if (!fs.existsSync(src)) {
            console.error('Could not find apk: %s!', src);
            process_1.exit(1);
        }
        var dirname = path.dirname(dest);
        if (!fs.existsSync(dirname)) {
            fs.mkdirpSync(dirname);
        }
        fs.copyFileSync(src, dest);
    };
    return Builder;
}());
exports.Builder = Builder;

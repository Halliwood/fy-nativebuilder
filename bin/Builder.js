"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Builder = void 0;
var cp = require("child_process");
var process_1 = require("process");
var fs = require("fs-extra");
var path = require("path");
var _ = require("lodash");
var tkit = __importStar(require("./tkit/Tkit"));
var Builder = /** @class */ (function () {
    function Builder() {
    }
    Builder.prototype.start = function (options) {
        var _a = options.platform.split(':'), projName = _a[0], pf = _a[1], publishMode = _a[2];
        // 先读取默认环境配置
        var envCfg = fs.readJSONSync(path.join(__dirname, 'assets/localEnv.json'), { encoding: 'utf-8' });
        if (options.localEnv) {
            // 再读取本地环境配置
            var localEnv = fs.readJSONSync(options.localEnv, { encoding: 'utf-8' });
            envCfg = _.assign(envCfg, localEnv);
        }
        process.chdir(options.project);
        var projectFilesRoot = path.join(options.project, 'build/projectfiles', pf);
        // 清空patch文件夹
        var patchPath = path.join(projectFilesRoot, 'patch');
        fs.ensureDirSync(patchPath);
        fs.emptyDirSync(patchPath);
        var cfgPath = path.join(projectFilesRoot, 'common/cfg.json');
        var cfgDscb = fs.readJSONSync(cfgPath, { encoding: 'utf-8' });
        var cfgJson = cfgDscb[options.gameid];
        if (!cfgJson) {
            console.error('no cfg found: %d', options.gameid);
        }
        // 读取全局配置
        var globalCfg = cfgDscb['global'];
        // 合并配置
        cfgJson = _.assign(globalCfg, cfgJson);
        // 替换配置中的local变量
        tkit.FillJsonValues(cfgJson, envCfg);
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
        // 拷贝dcc资源到增量包
        var StartLineNum = 3;
        var resCfgRootParent = path.join(envCfg.h5BuildConfigRoot, projName, pf);
        var resCfgRoot = path.join(resCfgRootParent, publishMode);
        var savedFiletablePath = path.join(resCfgRoot, 'filetable.txt');
        if (fs.existsSync(resCfgRootParent)) {
            tkit.svn.revert(resCfgRoot);
            tkit.svn.update(resCfgRoot);
        }
        else {
            fs.mkdirpSync(resCfgRoot);
            fs.writeFileSync(savedFiletablePath, '', 'utf-8');
            tkit.svn.add(resCfgRootParent);
            tkit.svn.commit(resCfgRootParent, 'init commit by Builder');
        }
        // 先读取上次的dcc资源列表
        var savedFileMap = {};
        if (fs.existsSync(savedFiletablePath)) {
            var savedFiletableLines = fs.readFileSync(savedFiletablePath, 'utf-8').split(/[\r\n]+/);
            for (var i = StartLineNum, len = savedFiletableLines.length; i < len; i++) {
                var saveFilePair = savedFiletableLines[i].split(/\s+/);
                savedFileMap[saveFilePair[0]] = saveFilePair[1];
            }
        }
        else {
            fs.writeFileSync(savedFiletablePath, '', 'utf-8');
            tkit.svn.add(savedFiletablePath);
            tkit.svn.commit(savedFiletablePath, 'init commit by Builder');
        }
        // 遍历dcc资源，将新资源拷贝到增量包
        var filetablePath = path.join(dccCacheFilesRoot, 'filetable.txt');
        var filetableLines = fs.readFileSync(filetablePath, 'utf-8').split(/[\r\n]+/);
        for (var i = StartLineNum, len = filetableLines.length; i < len; i++) {
            var cacheFileName = filetableLines[i].split(/\s+/)[0];
            if (!savedFileMap[cacheFileName]) {
                fs.copyFileSync(path.join(dccCacheFilesRoot, cacheFileName), path.join(patchPath, cacheFileName));
            }
        }
        // 拷贝几个dcc文件到增量包
        var staticFiles = ['allfiles.txt', 'assetsid.txt', 'filetable.bin', 'filetable.txt'];
        for (var _i = 0, staticFiles_1 = staticFiles; _i < staticFiles_1.length; _i++) {
            var filename = staticFiles_1[_i];
            fs.copyFileSync(path.join(dccCacheFilesRoot, filename), path.join(patchPath, filename));
        }
        // 保存本次的filetable.txt，将在资源外发时上传svn
        fs.copyFileSync(filetablePath, savedFiletablePath);
        // 筛选需要打进包内的资源
        if (cfgJson.builtin) {
            var builtinPath = path.join(projectFilesRoot, cfgJson.builtin);
            var builtinLines = fs.readFileSync(builtinPath, 'utf-8').split(/[\r\n]+/);
            var builtinCnt = builtinLines.length;
            if (builtinCnt > 0) {
                var allfilesPath = path.join(dccCacheFilesRoot, 'allfiles.txt');
                var allfilesLines = fs.readFileSync(allfilesPath, 'utf-8').split(/[\r\n]+/);
                // builtin.txt按照文件顺序写的，也就是说和allfiles.txt顺序是一致的，动态调整循环匹配的起始行，比每次都从第一个进行匹配效率高
                var startMatchIdx = 0;
                // allfiles.txt前3行校验用
                for (var i = 0, len = allfilesLines.length; i < len; i++) {
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
        if (options.buildApk) {
            var androidProjPath = path.join(cfgJson.output_path, cfgJson.projName, cfgJson.platform);
            fs.removeSync(androidProjPath);
            // cmd = 'layanative createapp [-f res_path] [--path output_path] [-s sdk_path | -v version] [-p all|ios|android_eclipse|android_studio] [-t 0|1|2] [-u url] [-n project_name] [-a app_name] [--package_name package_name]'
            var nativeCmd = 'layanative createapp --path ' + cfgJson.output_path + ' -v ' + cfgJson.sdkver + ' -p ' + cfgJson.platform + ' -u ' + cfgJson.url + ' -n ' + cfgJson.projName + ' -a ' + cfgJson.appName + ' --package_name ' + cfgJson.package_name + ' -d ' + cfgJson.dememsionType;
            console.log('start create app: %s', nativeCmd);
            startAt = _.now();
            console.log(cp.execSync(nativeCmd, { encoding: 'utf-8' }));
            console.log('createapp finished, %d s costed.', Math.floor((_.now() - startAt) / 1000));
            // 资源替换
            var projectReplaces = ['default', options.gameid + ''];
            for (var _b = 0, projectReplaces_1 = projectReplaces; _b < projectReplaces_1.length; _b++) {
                var oneReplace = projectReplaces_1[_b];
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
            for (var rkey in cfgJson) {
                appGradleContent = appGradleContent.replace('{' + rkey + '}', cfgJson[rkey]);
            }
            var appGradlePath = path.join(androidProjPath, 'app/build.gradle');
            fs.writeFileSync(appGradlePath, appGradleContent, 'utf-8');
            // 拷贝包内资源
            fs.copySync(builtInCacheRoot, path.join(androidProjPath, 'app/src/main/assets/cache', dirChilds[0]));
            // 拷贝local.properties、gradle.properties
            var coverFiles = ['local.properties', 'gradle.properties'];
            for (var _c = 0, coverFiles_1 = coverFiles; _c < coverFiles_1.length; _c++) {
                var oneCoverFile = coverFiles_1[_c];
                var localPropertiesPath = path.join(__dirname, 'assets', oneCoverFile);
                fs.copySync(localPropertiesPath, path.join(androidProjPath, oneCoverFile));
            }
            // 打包
            process.chdir(androidProjPath);
            console.log('now we are %s', process.cwd());
            var gradleCmd = path.join(envCfg.gradleToolPath, 'gradlew') + ' assembleRelease';
            console.log('start gradle: %s', gradleCmd);
            startAt = _.now();
            console.log(cp.execSync(gradleCmd, { encoding: 'utf-8' }));
            console.log('assemble finished, %d s costed.', Math.floor((_.now() - startAt) / 1000));
            process.chdir(options.project);
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

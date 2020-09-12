import cp = require('child_process');
import { exit } from 'process';
import fs = require('fs-extra');
import path = require('path');
import { CfgDescriber, CmdOptions, LocalEnv } from './Declares';
import _ = require('lodash');
import * as tkit from './tkit/Tkit';
import { option } from 'commander';

export class Builder {
    start(options: CmdOptions) {
        let [projName, pf, publishMode] = options.platform.split(':');

        // 先读取默认环境配置
        let envCfg = fs.readJSONSync(path.join(__dirname, 'assets/localEnv.json'), {encoding: 'utf-8'}) as LocalEnv;
        if(options.localEnv) {
            // 再读取本地环境配置
            let localEnv = fs.readJSONSync(options.localEnv, {encoding: 'utf-8'}) as LocalEnv;
            envCfg = _.assign(envCfg, localEnv);
        }

        process.chdir(options.project);

        let projectFilesRoot = path.join(options.project, 'build/projectfiles', pf);
        // 清空patch文件夹
        let patchPath = path.join(projectFilesRoot, 'patch');
        fs.ensureDirSync(patchPath);
        fs.emptyDirSync(patchPath);
        
        let cfgPath = path.join(projectFilesRoot, 'common/cfg.json');
        let cfgDscb = fs.readJSONSync(cfgPath, {encoding: 'utf-8'}) as CfgDescriber;
        let cfgJson = cfgDscb[options.gameid];        
        if(!cfgJson) {
            console.error('no cfg found: %d', options.gameid);
        }

        // 读取全局配置
        let globalCfg = cfgDscb['global'];
        // 合并配置
        cfgJson = _.assign(globalCfg, cfgJson);
        // 替换配置中的local变量
        tkit.FillJsonValues(cfgJson, envCfg);
        console.log(cfgJson);

        // 先打layadcc
        let builtInCacheRoot: string;
        if(options.dcc) {
            let dccOutPath = path.join(cfgJson.output_path, cfgJson.projName, 'dcc');
            fs.ensureDirSync(dccOutPath);
            fs.emptyDirSync(dccOutPath);
    
            let dccCmd = 'layadcc ' + cfgJson.res_path + ' -cache -url ' + cfgJson.url + ' -cout ' + path.resolve(dccOutPath);
            console.log('start layadcc: %s', dccCmd);
            let startAt = _.now();
            console.log(cp.execSync(dccCmd, {encoding: 'utf-8'}));
            console.log('layadcc finished, %d s costed.', Math.floor(_.now() - startAt) / 1000);
    
            let dccCacheFilesRoot = path.join(dccOutPath, 'cache', this.getCacheFolder(cfgJson.url));
    
            builtInCacheRoot = path.join(cfgJson.output_path, cfgJson.projName, 'builtin');
            fs.ensureDirSync(builtInCacheRoot);
            fs.emptyDirSync(builtInCacheRoot);
    
            // 拷贝dcc资源到增量包
            const StartLineNum = 3;
            let resCfgRootParent = path.join(envCfg.h5BuildConfigRoot, projName, pf);
            let resCfgRoot = path.join(resCfgRootParent, publishMode);
            let savedFiletablePath = path.join(resCfgRoot, 'filetable.txt');
            if(fs.existsSync(resCfgRootParent)) {
                tkit.svn.revert(resCfgRoot);
                tkit.svn.update(resCfgRoot);
            } else {
                fs.mkdirpSync(resCfgRoot);
                fs.writeFileSync(savedFiletablePath, '', 'utf-8');
                tkit.svn.add(resCfgRootParent);
                tkit.svn.commit(resCfgRootParent, 'init commit by Builder');
            }
    
            // 先读取上次的dcc资源列表
            let savedFileMap: {[filename: string]: string} = {};
            if(fs.existsSync(savedFiletablePath)) {
                let savedFiletableLines = fs.readFileSync(savedFiletablePath, 'utf-8').split(/[\r\n]+/);
                for(let i = StartLineNum, len = savedFiletableLines.length; i < len; i++) {
                    let saveFilePair = savedFiletableLines[i].split(/\s+/);
                    savedFileMap[saveFilePair[0]] = saveFilePair[1];
                }
            } else {
                fs.writeFileSync(savedFiletablePath, '', 'utf-8');
                tkit.svn.add(savedFiletablePath);
                tkit.svn.commit(savedFiletablePath, 'init commit by Builder');
            }
    
            // 遍历dcc资源，将新资源拷贝到增量包
            let filetablePath = path.join(dccCacheFilesRoot, 'filetable.txt');
            let filetableLines = fs.readFileSync(filetablePath, 'utf-8').split(/[\r\n]+/);
            for(let i = StartLineNum, len = filetableLines.length; i < len; i++) {
                let cacheFileName = filetableLines[i].split(/\s+/)[0];
                if(!savedFileMap[cacheFileName]) {
                    fs.copyFileSync(path.join(dccCacheFilesRoot, cacheFileName), path.join(patchPath, cacheFileName));
                }
            }
            // 拷贝几个dcc文件到增量包
            let staticFiles = ['allfiles.txt', 'assetsid.txt', 'filetable.bin', 'filetable.txt'];
            for(let filename of staticFiles) {
                fs.copyFileSync(path.join(dccCacheFilesRoot, filename), path.join(patchPath, filename));
            }
            // 保存本次的filetable.txt，将在资源外发时上传svn
            fs.copyFileSync(filetablePath, savedFiletablePath);
    
            // 筛选需要打进包内的资源
            if(cfgJson.builtin) {
                let builtinPath = path.join(projectFilesRoot, cfgJson.builtin);
                let builtinLines = fs.readFileSync(builtinPath, 'utf-8').split(/[\r\n]+/);
                let builtinCnt = builtinLines.length;
                if(builtinCnt > 0) {
                    let allfilesPath = path.join(dccCacheFilesRoot, 'allfiles.txt');
                    let allfilesLines = fs.readFileSync(allfilesPath, 'utf-8').split(/[\r\n]+/);                
        
                    // builtin.txt按照文件顺序写的，也就是说和allfiles.txt顺序是一致的，动态调整循环匹配的起始行，比每次都从第一个进行匹配效率高
                    let startMatchIdx = 0;
                    // allfiles.txt前3行校验用
                    for(let i = 0, len = allfilesLines.length; i < len; i++) {
                        let oneFile = allfilesLines[i];
                        let needBuiltin = false;
                        let s = startMatchIdx;
                        for(let j = s; j < builtinCnt; j++) {
                            if(oneFile.startsWith(builtinLines[j])) {
                                needBuiltin = true;
                                startMatchIdx = j;
                                break;
                            }
                        }
                        if(!needBuiltin) {
                            for(let j = 0; j < s; j++) {
                                if(oneFile.startsWith(builtinLines[j])) {
                                    needBuiltin = true;
                                    break;
                                }
                            }
                        }
                        if(needBuiltin) {
                            let cacheFileName = filetableLines[i + StartLineNum].split(/\s+/)[0];
                            let cacheFilePath = path.join(dccCacheFilesRoot, cacheFileName);
                            fs.copyFileSync(cacheFilePath, path.join(builtInCacheRoot, cacheFileName));
                            fs.copyFileSync(cacheFilePath, path.join(patchPath, cacheFileName));
                        }
                    }
                }
            }
        }        
        
        // 输出android工程
        if(options.buildApk) {
            let androidProjPath = path.join(cfgJson.output_path, cfgJson.projName, cfgJson.platform);
            fs.removeSync(androidProjPath);
            // cmd = 'layanative createapp [-f res_path] [--path output_path] [-s sdk_path | -v version] [-p all|ios|android_eclipse|android_studio] [-t 0|1|2] [-u url] [-n project_name] [-a app_name] [--package_name package_name]'
            let nativeCmd = 'layanative createapp --path ' + cfgJson.output_path + ' -v ' + cfgJson.sdkver + ' -p ' + cfgJson.platform + ' -u ' + cfgJson.url + ' -n ' + cfgJson.projName + ' -a ' + cfgJson.appName + ' --package_name ' + cfgJson.package_name + ' -d ' + cfgJson.dememsionType;
            console.log('start create app: %s', nativeCmd);
            let startAt = _.now();
            console.log(cp.execSync(nativeCmd, {encoding: 'utf-8'}));
            console.log('createapp finished, %d s costed.', Math.floor((_.now() - startAt) / 1000));
            
            // 资源替换
            let projectReplaces = ['default', options.gameid + ''];
            for(let oneReplace of projectReplaces) {
                let projectReplaceRoot = path.join(projectFilesRoot, 'android_studio', oneReplace);
                if(fs.existsSync(projectReplaceRoot)) {
                    console.log('replace project files from %s to %s', projectFilesRoot, androidProjPath);
                    fs.copySync(projectReplaceRoot, androidProjPath);
                } else {
                    console.log('replace root not exists: %s', projectReplaceRoot);
                }
            }
            
            // 读取版本号
            let oldVer = 0;
            let versionFile = path.join(projectFilesRoot, 'version.txt');
            if(fs.existsSync(versionFile)) {
                oldVer = Number(fs.readFileSync(versionFile, 'utf-8'));
            }
            let newVer = oldVer + 1;
            let newVerName = '1.0.0.' + newVer;
            fs.writeFileSync(versionFile, newVer.toString(), 'utf-8');
            // 修改版本号
            let manifestFile = path.join(androidProjPath, 'app/src/main/AndroidManifest.xml');
            let manifestContent = fs.readFileSync(manifestFile, 'utf-8');
            manifestContent = manifestContent.replace(/(?<=versionCode=")\d+(?=")/, newVer.toString());
            manifestContent = manifestContent.replace(/(?<=versionName=")\S+(?=")/, newVerName);
            
            // 覆盖gradle脚本，增加签名信息、扩大jvm内存
            let appGradleContent = fs.readFileSync(path.join(__dirname, 'assets/build.gradle'), 'utf-8');
            for(let rkey in cfgJson) {
                appGradleContent = appGradleContent.replace('{' + rkey + '}', cfgJson[rkey]);
            }
            let appGradlePath = path.join(androidProjPath, 'app/build.gradle');
            fs.writeFileSync(appGradlePath, appGradleContent, 'utf-8');

            if(options.dcc) {
                // 拷贝包内资源
                fs.copySync(builtInCacheRoot, path.join(androidProjPath, 'app/src/main/assets/cache', this.getCacheFolder(cfgJson.url)));
            }
            
            // 拷贝local.properties、gradle.properties
            let coverFiles = ['local.properties', 'gradle.properties'];
            for(let oneCoverFile of coverFiles) {
                let coverContent = fs.readFileSync(path.join(__dirname, 'assets', oneCoverFile), 'utf-8');
                for(let envkey in envCfg) {
                    coverContent = coverContent.replace('{' + envkey + '}', envCfg[envkey]);
                }
                fs.writeFileSync(path.join(androidProjPath, oneCoverFile), coverContent, 'utf-8');
            }
            
            // 打包
            process.chdir(androidProjPath);

            console.log('now we are %s', process.cwd());
            let gradleCmd = path.join(envCfg.gradleToolPath, 'gradlew') + ' assembleRelease';
            console.log('start gradle: %s', gradleCmd);
            startAt = _.now();
            console.log(cp.execSync(gradleCmd, {encoding: 'utf-8'}));
            console.log('assemble finished, %d s costed.', Math.floor((_.now() - startAt) / 1000));
            
            process.chdir(options.project);
            // 拷贝apk到增量包
            let apkPath = path.join(androidProjPath, 'app/build/outputs/apk/release/app-release.apk');
            let targetApkPath = path.join(patchPath, 'apk', cfgJson.package_name + '.v' + newVerName + '.apk');
            this.copyFileEnsureExists(apkPath, targetApkPath);
        }
    }

    /**这段代码摘自layadcc源码 */
    private getCacheFolder(url: string): string {
        let cacheOut = url;
        cacheOut = cacheOut.replace('http://', '');
        let index = cacheOut.indexOf('?');
        if (index > 0) {
            cacheOut = cacheOut.substring(0, index);
        }
        index = cacheOut.lastIndexOf('/');
        if (index > 0) {
            cacheOut = cacheOut.substring(0, index);
        }
        cacheOut = cacheOut.replace(/:/g, '.');
        cacheOut = cacheOut.replace(/\\/g, '_');
        cacheOut = cacheOut.replace(/\//g, '_');
        return cacheOut;
    }

    private copyFileEnsureExists(src: string, dest: string) {
        if(!fs.existsSync(src)) {
            console.error('Could not find apk: %s!', src);
            exit(1);
        }

        let dirname = path.dirname(dest);
        if(!fs.existsSync(dirname)) {
            fs.mkdirpSync(dirname);
        }
        fs.copyFileSync(src, dest);
    }
}
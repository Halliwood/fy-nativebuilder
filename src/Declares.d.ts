export type PlatformTypes = 'all' | 'ios' | 'android_eclipse' | 'android_studio';
export type ProjectTypes = 0 | 1 | 2;
export type DememsionTypes = '2D' | '3D';

export interface ProjectCfg {
    gameid: number, 
    sdkver: string, 
    dememsionType: DememsionTypes, 
    res_path: string, 
    output_path: string, 
    platform: string, 
    projType: ProjectTypes, 
    url: string, 
    projName: string, 
    appName: string, 
    package_name: string, 
    replacement: {
        keyAlias: string, 
        keyPassword: string, 
        keystoreFile: string, 
        storePassword: string
    }
    gradleTool: string, 
    builtin: string
}

export interface CfgDescriber {
    "global": ProjectCfg, 
    [gameid: string]: ProjectCfg
}
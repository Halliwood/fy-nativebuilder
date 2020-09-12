import {TSvn} from './svn';
/**
 * 替换JSON值中形如{xxx}的可变变量
 * @param jdata 
 * @param src 
 */
function FillJsonValues(jdata: object, src: object) {
    for(let srcKey in src) {
        for(let jkey in jdata) {
            let jvalue = jdata[jkey];
            let jvType = typeof(jvalue);
            if(jvType == 'object') {
                FillJsonValues(jvalue, src);
            } else if(jvType == 'string') {
                jdata[jkey] = (<string>jvalue).replace('{' + srcKey + '}', src[srcKey]);
            }
        }
    }
}

let svn = new TSvn();

export {FillJsonValues, svn}
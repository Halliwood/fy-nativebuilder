"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.svn = exports.FillJsonValues = void 0;
var svn_1 = require("./svn");
/**
 * 替换JSON值中形如{xxx}的可变变量
 * @param jdata
 * @param src
 */
function FillJsonValues(jdata, src) {
    for (var srcKey in src) {
        for (var jkey in jdata) {
            var jvalue = jdata[jkey];
            var jvType = typeof (jvalue);
            if (jvType == 'object') {
                FillJsonValues(jvalue, src);
            }
            else if (jvType == 'string') {
                jdata[jkey] = jvalue.replace('{' + srcKey + '}', src[srcKey]);
            }
        }
    }
}
exports.FillJsonValues = FillJsonValues;
var svn = new svn_1.TSvn();
exports.svn = svn;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TSvn = void 0;
var cp = require("child_process");
var TSvn = /** @class */ (function () {
    function TSvn() {
    }
    TSvn.prototype.setClient = function (username, pswd) {
        this.username = username;
        this.pswd = pswd;
    };
    TSvn.prototype.add = function (svnPath) {
        this.execCmd('add ' + svnPath);
    };
    TSvn.prototype.addUnversioned = function (svnPath) {
        this.execCmd('add --force --parents --no-ignore ' + svnPath);
    };
    TSvn.prototype.update = function (svnPath) {
        this.execCmd('up ' + svnPath);
    };
    // getVersion(svnPath) {
    //     let command = svntool + " log "+ svnPath + ' -l 1';
    //     let info = this.execCmd(command);
    //     return re.search('r(\d+)', info).group(1);
    // }
    TSvn.prototype.commit = function (svnPath, message) {
        this.execCmd('ci ' + svnPath + ' -m "' + message + '"');
    };
    TSvn.prototype.revert = function (svnPath) {
        this.execCmd('revert ' + svnPath + ' -R');
    };
    TSvn.prototype.cleanup = function (svnPath) {
        this.execCmd('cleanup ' + svnPath);
    };
    TSvn.prototype.cleanupunversioned = function (svnPath) {
        this.execCmd('cleanup ' + svnPath + ' --remove-unversioned');
    };
    TSvn.prototype.copy = function (src, dst, msg, add) {
        this.execCmd('copy --parents ' + src + ' ' + dst + ' -m "' + msg + '"' + ' ' + add);
    };
    TSvn.prototype.delete = function (src, msg, add) {
        this.execCmd('delete ' + src + ' -m "' + msg + '"' + ' ' + add);
    };
    TSvn.prototype.lock = function (src) {
        this.execCmd('lock ' + src);
    };
    TSvn.prototype.unlock = function (src) {
        this.execCmd('unlock ' + src);
    };
    TSvn.prototype.execCmd = function (cmd) {
        cp.execSync('svn ' + cmd, { encoding: 'utf-8' });
    };
    return TSvn;
}());
exports.TSvn = TSvn;

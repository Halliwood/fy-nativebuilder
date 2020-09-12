import cp = require('child_process');
export class TSvn {
    private username: string;
    private pswd: string;

    setClient(username: string, pswd: string) {
        this.username = username;
        this.pswd = pswd;
    }

    add(svnPath: string) {
        this.execCmd('add ' + svnPath);
    }

    addUnversioned(svnPath: string) {
        this.execCmd('add --force --parents --no-ignore ' + svnPath);
    }

    update(svnPath: string) {
        this.execCmd('up ' + svnPath);
    }

    // getVersion(svnPath) {
    //     let command = svntool + " log "+ svnPath + ' -l 1';
    //     let info = this.execCmd(command);
    //     return re.search('r(\d+)', info).group(1);
    // }

    commit(svnPath: string, message: string) {
        this.execCmd('ci ' + svnPath + ' -m "' + message + '"');
    }

    revert(svnPath: string) {
        this.execCmd('revert ' + svnPath + ' -R');
    }

    cleanup(svnPath: string) {
        this.execCmd('cleanup ' + svnPath);
    }

    cleanupunversioned(svnPath: string) {
        this.execCmd('cleanup ' + svnPath + ' --remove-unversioned');
    }

    copy(src: string, dst: string, msg: string, add: string) {
        this.execCmd('copy --parents ' + src + ' ' + dst + ' -m "' + msg + '"' + ' ' + add);
    }

    delete(src: string, msg: string, add: string) {
        this.execCmd('delete ' + src + ' -m "' + msg + '"' + ' ' + add);
    }

    lock(src: string) {
        this.execCmd('lock ' + src);
    }

    unlock(src: string) {
        this.execCmd('unlock ' + src);
    }

    private execCmd(cmd: string) {
        cp.execSync('svn ' + cmd, {encoding: 'utf-8'})
    }
}
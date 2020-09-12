import program = require('commander');
import { Builder } from './Builder';
import { isNumber } from 'lodash';
import { CmdOptions } from './Declares';

const myPackage = require('../package.json');

const getPath = (val: string): string => {
    let rst = val.match(/(['"])(.+)\1/);
    if(rst) return rst[2];

    return val;
}
const getGameId = (val: string): number => {
    return Number(val);
}

program
	.version(myPackage.version, "-v, --version")
    .option("-p, --project <path>", "[MUST] Project root path. Directory.", getPath)
    .option("--platform <string>", "[MUST] Platform name. String.")
	.option("--gameid <number>", "[MUST] Game id.", getGameId)
	.option("--buildApk", "Build apk.")
	.option("--dcc", "Build dcc.")
    .option("--localEnv", "Local environment setting file. String.", getPath)
    .parse(process.argv);

let options = program as any as CmdOptions;
if(!options.project) {
    console.warn("The --project option is MUST.");
    program.help();
}

if(!options.platform) {
    console.warn("The --platform option is MUST.");
    program.help();
}

if(!isNumber(options.gameid)) {
    console.warn("The --gameid option is MUST.");
    program.help();
}

let builder = new Builder();
builder.start(options);

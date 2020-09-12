"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var program = require("commander");
var Builder_1 = require("./Builder");
var lodash_1 = require("lodash");
var myPackage = require('../package.json');
var getPath = function (val) {
    var rst = val.match(/(['"])(.+)\1/);
    if (rst)
        return rst[2];
    return val;
};
var getGameId = function (val) {
    return Number(val);
};
program
    .version(myPackage.version, "-v, --version")
    .requiredOption("-p, --project <path>", "[MUST] Project root path. Directory.", getPath)
    .requiredOption("--platform <string>", "[MUST] Platform name. String.")
    .requiredOption("--gameid <number>", "[MUST] Game id.", getGameId)
    .option("--buildApk", "Build apk.")
    .option("--dcc", "Build dcc.")
    .option("--localEnv <string>", "Local environment setting file. String.", getPath)
    .parse(process.argv);
var options = program;
if (!options.project) {
    console.warn("The --project option is MUST.");
    program.help();
}
if (!options.platform) {
    console.warn("The --platform option is MUST.");
    program.help();
}
if (!lodash_1.isNumber(options.gameid)) {
    console.warn("The --gameid option is MUST.");
    program.help();
}
var builder = new Builder_1.Builder();
builder.start(options);

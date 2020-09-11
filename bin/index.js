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
program
    .version(myPackage.version, "-v, --version")
    .option("-p, --project <path>", "[MUST] Project root path. Directory.", getPath)
    .option("--platform <string>", "[MUST] Platform name. String.")
    .option("--gameid <number>", "[MUST] Game id.")
    .option("--buildApk", "Build apk.")
    .option("--dcc", "Build dcc.")
    .parse(process.argv);
var projectPath = program.project;
if (!projectPath) {
    console.warn("The --project option is MUST.");
    program.help();
}
var platform = program.platform;
if (!platform) {
    console.warn("The --platform option is MUST.");
    program.help();
}
var gameid = Number(program.gameid);
if (!lodash_1.isNumber(gameid)) {
    console.warn("The --gameid option is MUST.");
    program.help();
}
var builder = new Builder_1.Builder();
builder.start(projectPath, platform, gameid, program.buildApk);

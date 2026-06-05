}"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InitialOverrideConfigString = exports.InitialDefaultConfigString = void 0;
// NEEDED TO ALWAYS BE AT THE TOP
if (process.env.PROCESS_NAME === undefined) {
    process.env.PROCESS_NAME = 'MAIN_PROCESS';
}
const sourceMapSupport = require("source-map-support");
const parseArgs = require("yargs-parser");
// NOTE: Needed so each process installs the source maps, so when an error is presented,
//   it can be mapped to the typescript file and line
sourceMapSupport.install();
const electron_1 = require("electron");
const fs = require("fs");
const lodash_1 = require("lodash");
const HealthManager_1 = require("./health/HealthManager");
const ProcessController_1 = require("./processes/controller/ProcessController");
const processHandler = require("./processes/ProcessHandler");
const LoggerUtils_1 = require("./tools/utils/LoggerUtils");
exports.InitialDefaultConfigString = fs.readFileSync('configuration/default.json').toString().replace(/\r?\n|\r/g, '');
exports.InitialOverrideConfigString = fs.readFileSync('configuration/override.json').toString().replace(/\r?\n|\r/g, '');
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    LoggerUtils_1.LoggerUtils.createLogDirectoryIfNotExists();
    yield ProcessController_1.ProcessController.Instance.start();
    // const debugWindow = new DebugWindow();
    // debugWindow.toggle();
    // create the health module. Needs to be done after mainProcess because mainProcess initializes the config module
    const healthManager = new HealthManager_1.HealthManager();
    healthManager.startTasks();
    // Stops all current running processes
    // setTimeout(() => {
    //   healthManager.stopTasks();
    //   process.exit();
    // }, 30000);
});
const setup = () => {
    const configJSON = readConfigFiles();
    let i = 0;
    while (configJSON[`main.switches.${i}.key`]) {
        // TODO log each switch
        const switchKey = configJSON[`main.switches.${i}.key`];
        const switchValue = configJSON[`main.switches.${i}.value`];
        electron_1.app.commandLine.appendSwitch(switchKey, switchValue);
        i++;
    }
};
const readConfigFiles = () => {
    const defaultJSON = JSON.parse(exports.InitialDefaultConfigString);
    const overrideJSON = JSON.parse(exports.InitialOverrideConfigString);
    return (0, lodash_1.merge)(defaultJSON, overrideJSON);
};
const args = parseArgs(process.argv);
const fidsProcess = args['fids-process'];
if (fidsProcess === undefined) {
    setup();
    electron_1.app.on('ready', () => {
        main()
            .catch((err) => {
            console.warn('Error starting main process, exiting...', err);
            process.exit(-1);
        });
    });
}
else if (processHandler[fidsProcess] !== undefined) {
    const processInstance = new processHandler[fidsProcess]();
    processInstance.create();
}
else {
    console.error(`Process parameter [${fidsProcess}] is not defined in ProcessHandler.`);
    process.exit(-1);
}
//# sourceMappingURL=Main.js.ma
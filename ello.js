var fs = require('fs');

function init() {
    let projectRoot = process.env.PROJECT_ROOT;
    if (!projectRoot) {
        notifyError("PROJECT_ROOT 환경변수를 설정해 주세요.");
        return
    }
    if (!fs.existsSync(projectRoot)) {
        fs.mkdirSync(projectRoot);
    }
}
init();

function notify(text) {
    let notifier = document.getElementById("notifier");
    notifier.style.backgroundColor = "";
    notifier.innerText = text;
}

function notifyError(text) {
    let notifier = document.getElementById("notifier");
    notifier.style.backgroundColor = "#ef5350";
    notifier.innerText = text;
}

let projectDirs = [
    "asset",
    "doc",
    "doc/cglist",
    "doc/credit",
    "doc/droid",
    "edit",
    "ref",
    "input",
    "input/lut",
    "input/src",
    "input/scan",
    "review",
    "output",
    "vendor",
    "vendor/input",
    "vendor/output",
    "shot",
];

let tasks = [
    "model",
    "track",
    "rig",
    "ani",
    "light",
    "fx",
    "matte",
    "motion",
    "comp",
];

let shotDirs = [
    "plate",
    "src",
    "ref",
    "pub",
    "pub/cam",
    "pub/geo",
    "pub/char",
    "task",
    "render",
];

function createDirs(curdir, dirs) {
    if (!dirs) {
        return;
    }
    if (!fs.existsSync(curdir)) {
        throw "current directory not exist";
    }
    for (let i in dirs) {
        let d = dirs[i];
        let child = curdir + "/" + d;
        if (fs.existsSync(child)) {
            throw "child directory already exist";
        }
        fs.mkdirSync(child);
    }
}

function createProject(prjname) {
    let prjDir = projectRoot + "/" + prjname;
    if (fs.existsSync(prjDir)) {
        throw "project directory already exist";
    }
    fs.mkdirSync(prjDir);
    createDirs(prjDir, projectDirs);
}

exports.addTaskMenuItems = function() {
    let menu = document.getElementById("task-menu");
    if (!menu) {
        throw Error("not found task-menu")
    }
    for (let i in tasks) {
        let t = tasks[i];
        let opt = document.createElement("option");
        opt.text = t;
        menu.add(opt);
    }
}

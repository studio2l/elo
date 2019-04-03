var fs = require('fs');

let projectRoot = "";

function init() {
    projectRoot = process.env.PROJECT_ROOT;
    if (!projectRoot) {
        notify("Ello를 사용하시기 전, 우선 PROJECT_ROOT 환경변수를 설정해 주세요.");
        disableAll();
        return;
    }
    if (!fs.existsSync(projectRoot)) {
        fs.mkdirSync(projectRoot);
    }
}

init();

function notify(text) {
    let notifier = document.getElementById("notifier");
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
        notify("current directory not exist");
        return;
    }
    for (let i in dirs) {
        let d = dirs[i];
        let child = curdir + "/" + d;
        if (fs.existsSync(child)) {
            notify("child directory already exist");
            return;
        }
        fs.mkdirSync(child);
    }
}

function createProject(prjname) {
    let prjDir = projectRoot + "/" + prjname;
    if (fs.existsSync(prjDir)) {
        notify("project directory already exist");
        return;
    }
    fs.mkdirSync(prjDir);
    createDirs(prjDir, projectDirs);
}

exports.addTaskMenuItems = function() {
    let menu = document.getElementById("task-menu");
    if (!menu) {
        notify("not found task-menu");
        return;
    }
    for (let i in tasks) {
        let t = tasks[i];
        let opt = document.createElement("option");
        opt.text = t;
        menu.add(opt);
    }
}

function projects() {
    let prjs = Array();
    fs.readdirSync(projectRoot).forEach(f => {
        let isDir = fs.lstatSync(projectRoot + "/" + f).isDirectory();
        if (isDir) {
            prjs.push(f);
        }
    });
    return prjs;
}

function selectProject(id) {
    let items = document.getElementsByClassName("project-item");
    for (let item of items) {
        item.classList.remove("selected");
    }
    let selected = document.getElementById(id);
    selected.classList.add("selected");
}

exports.addProjectItems = function() {
    let prjs = projects();
    let pbox = document.getElementById("project-box");
    if (!pbox) {
        notify("project-box가 없습니다.");
        return;
    }
    for (let i in prjs) {
        let p = prjs[i];
        let div = document.createElement("div");
        div.id = "project-" + p;
        div.className = "project-item";
        div.innerText = p;
        div.addEventListener("click", function() { selectProject(div.id); });
        pbox.append(div);
    }
}

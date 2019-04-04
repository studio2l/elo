var fs = require('fs');

let projectRoot = "";

function init() {
    projectRoot = process.env.PROJECT_ROOT;
    if (!projectRoot) {
        notify("Elo를 사용하시기 전, 우선 PROJECT_ROOT 환경변수를 설정해 주세요.");
        disableAll();
        return;
    }
    if (!fs.existsSync(projectRoot)) {
        fs.mkdirSync(projectRoot);
    }
}

init();

function openModal(kind) {
    let m = document.getElementById("modal");
    m.style.display = "block";
    let input = document.getElementById("modal-input");
    input.innerText = "";
    input.placeholder = "생성 할 " + kind + " 이름";
    let apply = document.getElementById("modal-apply");
    apply.onclick = function() { createItem(kind); };
}

exports.openModal = openModal;

function createItem(kind) {
    let name = document.getElementById("modal-input").value;
    if (kind == "프로젝트") {
        createProject(name);
        reloadProjects();
    } else if (kind == "샷") {
    } else if (kind == "태스크") {
    } else if (kind == "버전") {
    }
    closeModal();
}

exports.createItem = createItem;

function closeModal() {
    let m = document.getElementById("modal");
    m.style.display = "none";
}

exports.closeModal = closeModal;

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

function addTaskMenuItems() {
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

exports.addTaskMenuItems = addTaskMenuItems;

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

function reloadProjects() {
    let prjs = projects();
    let pbox = document.getElementById("project-box");
    if (!pbox) {
        notify("project-box가 없습니다.");
        return;
    }
    pbox.innerText = "";
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

exports.reloadProjects = reloadProjects;

var fs = require("fs");
var proc = require("child_process");

let projectRoot = "";

function init() {
    projectRoot = process.env.PROJECT_ROOT;
    if (!projectRoot) {
        notify("Elo를 사용하시기 전, 우선 PROJECT_ROOT 환경변수를 설정해 주세요.");
        return;
    }
    if (!fs.existsSync(projectRoot)) {
        fs.mkdirSync(projectRoot);
    }
}

init();

function openModal(kind) {
    if (kind == "shot" && !currentProject()) {
        notify("아직 프로젝트를 선택하지 않았습니다.");
        return;
    }
    if (kind == "task" && !currentShot()) {
        notify("아직 샷을 선택하지 않았습니다.");
        return;
    }
    if (kind == "version" && !currentTask()) {
        notify("아직 태스크를 선택하지 않았습니다.");
        return;
    }
    let m = document.getElementById("modal");
    m.style.display = "block";
    let input = document.getElementById("modal-input");
    input.value = "";
    kor = {
        "project": "프로젝트",
        "shot": "샷",
        "task": "태스크",
        "version": "버전",
    }
    input.placeholder = "생성 할 " + kor[kind] + " 이름";
    input.onkeydown = function(ev) {
        if (ev.key == "Enter") {
            closeModal();
            createItem(kind);
        }
    }
    input.focus();
    let apply = document.getElementById("modal-apply");
    apply.onclick = function() {
        closeModal();
        createItem(kind);
    };
}

exports.openModal = openModal;

function createItem(kind) {
    let name = document.getElementById("modal-input").value;
    if (!name) {
        notify("생성할 항목의 이름을 설정하지 않았습니다.");
        return;
    }
    if (kind == "project") {
        createProject(name);
    } else if (kind == "shot") {
        createShot(currentProject(), name);
    } else if (kind == "task") {
        createTask(currentProject(), currentShot(), name);
    } else if (kind == "version") {
        createVersion(currentProject(), currentShot(), currentTask(), name);
    }
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

function clearNotify() {
    let notifier = document.getElementById("notifier");
    notifier.innerText = "";
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

let taskDirs = {
    "fx": [
        "backup",
        "geo",
        "precomp",
        "preview",
        "render",
        "temp",
    ],
}

let defaultProgram = {
    "fx": "houdini",
}

// createScene은 씬 생성에 필요한 정보를 받아들여 씬을 생성하는 함수이다.
function createScene(prj, shot, task, elem, prog) {
    if (!tasks.includes(task)) {
        notify("해당 태스크가 없습니다.");
        throw Error("task directory not found");
    }
    let d = taskPath(prj, shot, task)
    if (!d) {
        notify("태스크 디렉토리가 없습니다.");
        throw Error("task directory not found");
    }
    if (!elem) {
        notify("요소를 선택하지 않았습니다.");
        throw Error("please set element");
    }
    if (!prog) {
        notify("프로그램을 선택하지 않았습니다.");
        throw Error("please set program");
    }
    let exec = function(cmd, args) {
        try {
            proc.execFileSync(cmd, args);
        } catch(e) {
            if (e.errno == "ENOENT") {
                notify(prog + " 씬 생성을 위한 " + cmd + " 명령어가 없습니다.");
                throw Error("program not found");
            }
            notify(prog + " 씬 생성중 에러가 났습니다: " + e.message);
            throw Error("run error");
        }
    }
    if (task == "fx") {
        if (prog == "houdini") {
            let s = d + "/" + prj + "_" + shot + "_" + elem + "_v001.hip";
            exec("hython", ["-c", `hou.hipFile.save('${s}')`]);
            return;
        }
    }
    notify(prog + "는 " + task + "내에 씬 생성방법이 정의되지 않은 프로그램입니다.");
    throw Error("program not defined");
}

function createDirs(parentd, dirs) {
    if (!parentd) {
        notify("부모 디렉토리는 비어있을 수 없습니다.");
        throw Error("parent directory should not be empty");
    }
    if (!dirs) {
        return;
    }
    if (!fs.existsSync(parentd)) {
        // TODO: 부모 디렉토리 생성할 지 물어보기
    }
    for (let d of dirs) {
        let child = parentd + "/" + d;
        if (fs.existsSync(child)) {
            continue;
        }
        fs.mkdirSync(child, { recursive: true });
    }
}

function createProject(prj) {
    let prjDir = projectRoot + "/" + prj;
    if (fs.existsSync(prjDir)) {
        notify("프로젝트 디렉토리가 이미 존재합니다.");
        return;
    }
    fs.mkdirSync(prjDir, { recursive: true });
    createDirs(prjDir, projectDirs);
    reloadProjects();
    selectProject(prj);
}

function createShot(prj, shot) {
    let d = shotPath(prj, shot);
    if (fs.existsSync(d)) {
        notify("샷 디렉토리가 이미 존재합니다.");
        return;
    }
    fs.mkdirSync(d, { recursive: true });
    createDirs(d, shotDirs);
    reloadShots(currentProject());
    selectShot(prj, shot);
}

function createTask(prj, shot, task) {
    let d = taskPath(prj, shot, task);
    if (fs.existsSync(d)) {
        notify("태스크 디렉토리가 이미 존재합니다.");
        return;
    }
    fs.mkdirSync(d, { recursive: true });
    let subdirs = taskDirs[task];
    if (!subdirs) {
        return;
    }
    for (let s of subdirs) {
        let sd = d + "/" + s;
        fs.mkdirSync(sd);
    }
    reloadTasks(currentProject(), currentShot());
    selectTask(prj, shot, task);
    let prog = defaultProgram[task];
    if (!prog) {
        return;
    }
    createScene(prj, shot, task, "main", prog);
}

function createVersion(prj, shot, task, version) {
    // TODO
    reloadVersions(currentProject(), currentShot(), currentTask());
}

function addTaskMenuItems() {
    let menu = document.getElementById("task-menu");
    if (!menu) {
        notify("task-menu가 없습니다.");
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

function childDirs(d) {
    if (!fs.existsSync(d)) {
        notify(d + " 디렉토리가 존재하지 않습니다.");
        throw Error(d + " not exists");
    }
    let cds = Array();
    fs.readdirSync(d).forEach(f => {
        let isDir = fs.lstatSync(d + "/" + f).isDirectory();
        if (isDir) {
            cds.push(f);
        }
    });
    return cds;
}

function projectPath(prj) {
    return projectRoot + "/" + prj;
}

function shotPath(prj, shot) {
    return projectRoot + "/" + prj + "/shot/" + shot;
}

function taskPath(prj, shot, task) {
    return projectRoot + "/" + prj + "/shot/" + shot + "/task/" + task;
}

function versionPath(prj, shot, task) {
    // TODO: 디자인 필요
    return null;
}

function projects() {
    let d = projectRoot;
    return childDirs(d);
}

function shotsOf(prj) {
    let d = projectPath(prj) + "/shot";
    return childDirs(d);
}

function tasksOf(prj, shot) {
    let d = shotPath(prj, shot) + "/task";
    return childDirs(d);
}

function versionsOf(prj, shot, task, prog) {
    // TODO: 디자인 필요
    return Array();
}

function selectProject(prj) {
    clearNotify();
    clearShots();
    clearTasks();
    clearVersions();
    let items = document.getElementsByClassName("project-item");
    for (let item of items) {
        item.classList.remove("selected");
    }
    let selected = document.getElementById("project-" + prj);
    selected.classList.add("selected");
    reloadShots(prj);
}

function selectShot(prj, shot) {
    clearNotify();
    clearTasks();
    clearVersions();
    let items = document.getElementsByClassName("shot-item");
    for (let item of items) {
        item.classList.remove("selected");
    }
    let selected = document.getElementById("shot-" + shot);
    selected.classList.add("selected");
    reloadTasks(prj, shot);
}

function selectTask(prj, shot, task) {
    clearNotify();
    clearVersions();
    let items = document.getElementsByClassName("task-item");
    for (let item of items) {
        item.classList.remove("selected");
    }
    let selected = document.getElementById("task-" + task);
    selected.classList.add("selected");
    reloadVersions(prj, shot, task);
}

function selectVersion(prj, shot, task, version) {
    clearNotify();
    let items = document.getElementsByClassName("version-item");
    for (let item of items) {
        item.classList.remove("selected");
    }
    let selected = document.getElementById("version-" + version);
    selected.classList.add("selected");
}

function currentProject() {
    let items = document.getElementsByClassName("project-item");
    if (!items) {
        notify("project-item이 없습니다.");
        throw Error("project-item not found");
    }
    for (let item of items) {
        if (item.classList.contains("selected")) {
            return item.innerText;
        }
    }
}

function currentShot() {
    let items = document.getElementsByClassName("shot-item");
    if (!items) {
        notify("shot-item이 없습니다.");
        throw Error("shot-item not found");
    }
    for (let item of items) {
        if (item.classList.contains("selected")) {
            return item.innerText;
        }
    }
}

function currentTask() {
    let items = document.getElementsByClassName("task-item");
    if (!items) {
        notify("task-item이 없습니다.");
        throw Error("task-item not found");
    }
    for (let item of items) {
        if (item.classList.contains("selected")) {
            return item.innerText;
        }
    }
}

function currentVersion() {
    let items = document.getElementsByClassName("version-item");
    if (!items) {
        notify("version-item이 없습니다.");
        throw Error("project-item not found");
    }
    for (let item of items) {
        if (item.classList.contains("selected")) {
            return item.innerText;
        }
    }
}

function reloadProjects() {
    let prjs = projects();
    let pbox = document.getElementById("project-box");
    if (!pbox) {
        notify("project-box가 없습니다.");
        throw Error("project-box not found");
    }
    pbox.innerText = "";
    for (let prj of prjs) {
        let div = document.createElement("div");
        div.id = "project-" + prj;
        div.classList.add("project-item", "item");
        div.innerText = prj;
        div.addEventListener("click", function() { selectProject(prj); });
        pbox.append(div);
    }
}

exports.reloadProjects = reloadProjects;

function reloadShots(prj) {
    if (!prj) {
        notify("선택된 프로젝트가 없습니다.");
        return;
    }
    let sbox = document.getElementById("shot-box");
    if (!sbox) {
        notify("shot-box가 없습니다.");
        throw Error("shot-box not found");
    }
    sbox.innerText = "";
    for (let s of shotsOf(prj)) {
        let div = document.createElement("div");
        div.id = "shot-" + s;
        div.classList.add("shot-item", "item");
        div.innerText = s;
        div.addEventListener("click", function() { selectShot(prj, s); });
        sbox.append(div);
    }
}

function reloadTasks(prj, shot) {
    if (!prj) {
        notify("선택된 프로젝트가 없습니다.");
        return;
    }
    if (!shot) {
        notify("선택된 샷이 없습니다.");
        return;
    }
    let tbox = document.getElementById("task-box");
    if (!tbox) {
        notify("task-box가 없습니다.");
        throw Error("task-box not found");
    }
    tbox.innerText = "";
    for (let t of tasksOf(prj, shot)) {
        let div = document.createElement("div");
        div.id = "task-" + t;
        div.classList.add("task-item", "item");
        div.innerText = t;
        div.addEventListener("click", function() { selectTask(prj, shot, t); });
        tbox.append(div);
    }
}

function reloadVersions(prj, shot, task) {
    if (!prj) {
        notify("선택된 프로젝트가 없습니다.");
        return;
    }
    if (!shot) {
        notify("선택된 샷이 없습니다.");
        return;
    }
    if (!task) {
        notify("선택된 태스크가 없습니다.");
        return;
    }
    let vbox = document.getElementById("version-box");
    if (!vbox) {
        notify("version-box가 없습니다.");
        throw Error("version-box not found");
    }
    vbox.innerText = "";
    for (let v of versionsOf(prj, shot, task)) {
        let div = document.createElement("div");
        div.id = "version-" + v;
        div.classList.add("version-item", "item");
        div.innerText = v;
        div.addEventListener("click", function() { selectVersion(prj, shot, task, v); });
        vbox.append(div);
    }
}

function clearBox(id) {
    let box = document.getElementById(id);
    if (!box) {
        notify(id + "가 없습니다.");
        throw Error(id + " not found");
    }
    box.innerText = "";
}

function clearShots() {
    clearBox("version-box");
}

function clearTasks() {
    clearBox("task-box");
}

function clearVersions() {
    clearBox("version-box");
}

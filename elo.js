const fs = require("fs");
const proc = require("child_process");
const user = require("./user.js");
const { remote } = require("electron");
const { Menu, MenuItem } = remote;

let projectRoot = "";
let pinnedProject = {}
let pinnedShot = {}

function init() {
    projectRoot = process.env.PROJECT_ROOT;
    if (!projectRoot) {
        throw Error("Elo를 사용하시기 전, 우선 PROJECT_ROOT 환경변수를 설정해 주세요.");
    }
    if (!fs.existsSync(projectRoot)) {
        fs.mkdirSync(projectRoot);
    }

    ensureConfigDirExist();
    loadPinnedProject();
    loadPinnedShot();

    ensureElementExist("project-box");
    ensureElementExist("shot-box");
    ensureElementExist("task-box");
    ensureElementExist("version-box");

    addTaskMenuItems();
    reloadProjects();

    window.addEventListener("contextmenu", function(ev) {
        ev.preventDefault();
        function parentById(ev, id) {
            for (let p of ev.path) {
                if (p.id == id) {
                    return p;
                }
            }
            return null;
        }
        function parentByClassName(ev, cls) {
            for (let p of ev.path) {
                if (p.classList.contains(cls)) {
                    return p;
                }
            }
            return null;
        }
        if (parentById(ev, "project-box")) {
            let prj = parentByClassName(ev, "item").id.split("-")[1];
            let projectMenu = new Menu();
            let pinProjectMenuItem = new MenuItem({
                label: "상단에 고정",
                click: function() {
                    try {
                        pinProject(prj);
                        reloadProjects();
                    } catch(err) {
                        notify(err.message);
                    }
                },
            });
            let unpinProjectMenuItem = new MenuItem({
                label: "상단에서 제거",
                click: function() {
                    try {
                        unpinProject(prj);
                        reloadProjects();
                    } catch(err) {
                        notify(err.message);
                    }
                },
            });
            if (pinnedProject[prj]) {
                projectMenu.append(unpinProjectMenuItem);
            } else {
                projectMenu.append(pinProjectMenuItem);
            }
            projectMenu.popup(remote.getCurrentWindow());
            return;
        }
        if (parentById(ev, "shot-box")) {
            let prj = currentProject();
            let shot = parentByClassName(ev, "item").id.split("-")[1];
            let shotMenu = new Menu();
            let pinShotMenuItem = new MenuItem({
                label: "상단에 고정",
                click: function() {
                    try {
                        pinShot(prj, shot);
                        reloadShots(prj);
                    } catch(err) {
                        notify(err.message);
                    }
                },
            });
            let unpinShotMenuItem = new MenuItem({
                label: "상단에서 제거",
                click: function() {
                    try {
                        unpinShot(prj, shot);
                        reloadShots(prj);
                    } catch(err) {
                        notify(err.message);
                    }
                },
            });
            if (pinnedShot[prj] && pinnedShot[prj][shot]) {
                shotMenu.append(unpinShotMenuItem);
            } else {
                shotMenu.append(pinShotMenuItem);
            }
            shotMenu.popup(remote.getCurrentWindow());
            return;
        }
    });
}

function ensureElementExist(id) {
    let el = document.getElementById(id);
    if (!el) {
        throw Error(id + "가 존재하지 않습니다.");
    }
}

exports.openModalEv = function(kind) {
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
    try {
        openModal(kind);
    } catch(err) {
        notify(err.message);
    }
}

function openModal(kind) {
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
            try {
                closeModal();
                createItem(kind);
            } catch(err) {
                notify(err.message);
            }
        }
    }
    input.focus();
    let apply = document.getElementById("modal-apply");
    apply.onclick = function() {
        try {
            closeModal();
            createItem(kind);
        } catch(err) {
            notify(err.message);
        }
    }
}

exports.createItemEv = function(kind) {
    try {
        createItem(kind);
    } catch(err) {
        notify(err.message);
    }
}

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

exports.closeModalEv = function() {
    try {
        closeModal();
    } catch(err) {
        notify(err.message);
    }
}

function closeModal() {
    let m = document.getElementById("modal");
    m.style.display = "none";
}

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
    if (!tasksOf(prj, shot).includes(task)) {
        throw Error("해당 태스크가 없습니다.");
    }
    let d = taskPath(prj, shot, task)
    if (!d) {
        throw Error("태스크 디렉토리가 없습니다.");
    }
    if (!elem) {
        throw Error("요소를 선택하지 않았습니다.");
    }
    if (!prog) {
        throw Error("프로그램을 선택하지 않았습니다.");
    }
    function exec(cmd, args) {
        try {
            proc.execFileSync(cmd, args);
        } catch(err) {
            if (err.errno == "ENOENT") {
                throw Error(prog + " 씬 생성을 위한 " + cmd + " 명령어가 없습니다.");
            }
            throw Error(prog + " 씬 생성중 에러가 났습니다: " + err.message);
        }
    }
    if (task == "fx") {
        if (prog == "houdini") {
            let s = d + "/" + prj + "_" + shot + "_" + elem + "_v001.hip";
            exec("hython", ["-c", `hou.hipFile.save('${s}')`]);
            return;
        }
    }
    throw Error(prog + "는 " + task + "내에 씬 생성방법이 정의되지 않은 프로그램입니다.");
}

function createDirs(parentd, dirs) {
    if (!parentd) {
        throw Error("부모 디렉토리는 비어있을 수 없습니다.");
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
        throw Error("프로젝트 디렉토리가 이미 존재합니다.");
    }
    fs.mkdirSync(prjDir, { recursive: true });
    createDirs(prjDir, projectDirs);
    reloadProjects();
    selectProject(prj);
}

function createShot(prj, shot) {
    let d = shotPath(prj, shot);
    if (fs.existsSync(d)) {
        throw Error("샷 디렉토리가 이미 존재합니다.");
    }
    fs.mkdirSync(d, { recursive: true });
    createDirs(d, shotDirs);
    reloadShots(currentProject());
    selectShot(prj, shot);
}

function createTask(prj, shot, task) {
    let d = taskPath(prj, shot, task);
    if (fs.existsSync(d)) {
        throw Error("태스크 디렉토리가 이미 존재합니다.");
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
        throw Error("task-menu가 없습니다.");
    }
    for (let t of tasks) {
        let opt = document.createElement("option");
        opt.text = t;
        menu.add(opt);
    }
}

function childDirs(d) {
    if (!fs.existsSync(d)) {
        throw Error(d + " 디렉토리가 존재하지 않습니다.");
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

function selectProjectEv(prj) {
    try {
        selectProject(prj)
    } catch(err) {
        notify(err.message);
    }
}

function selectProject(prj) {
    clearNotify();
    clearShots();
    clearTasks();
    clearVersions();
    let box = document.getElementById("project-box");
    let item = box.getElementsByClassName("selected");
    if (item.length != 0) {
        item[0].classList.remove("selected");
    }
    let selected = document.getElementById("project-" + prj);
    selected.classList.add("selected");
    reloadShots(prj);
}

function selectShotEv(prj, shot) {
    try {
        selectShot(prj, shot)
    } catch(err) {
        notify(err.message);
    }
}

function selectShot(prj, shot) {
    clearNotify();
    clearTasks();
    clearVersions();
    let box = document.getElementById("shot-box");
    let item = box.getElementsByClassName("selected");
    if (item.length != 0) {
        item[0].classList.remove("selected");
    }
    let selected = document.getElementById("shot-" + shot);
    selected.classList.add("selected");
    reloadTasks(prj, shot);
}

function selectTaskEv(prj, shot, task) {
    try {
        selectTask(prj, shot, task)
    } catch(err) {
        notify(err.message);
    }
}

function selectTask(prj, shot, task) {
    clearNotify();
    clearVersions();
    let box = document.getElementById("task-box");
    let item = box.getElementsByClassName("selected");
    if (item.length != 0) {
        item[0].classList.remove("selected");
    }
    let selected = document.getElementById("task-" + task);
    selected.classList.add("selected");
    reloadVersions(prj, shot, task);
}

function selectVersionEv(prj, shot, task, version) {
    try {
        selectVersion(prj, shot, task, version)
    } catch(err) {
        notify(err.message);
    }
}

function selectVersion(prj, shot, task, version) {
    clearNotify();
    let box = document.getElementById("version-box");
    let item = box.getElementsByClassName("selected");
    if (item.length != 0) {
        item[0].classList.remove("selected");
    }
    let selected = document.getElementById("version-" + prj);
    selected.classList.add("selected");
}

function currentProject() {
    return selectedItemValue("project-box");
}

function currentShot() {
    return selectedItemValue("shot-box");
}

function currentTask() {
    return selectedItemValue("task-box");
}

function currentVersion() {
    return selectedItemValue("version-box");
}

function selectedItemValue(boxId) {
    let box = document.getElementById(boxId);
    if (!box) {
        throw Error(boxId + "가 없습니다.");
    }
    let items = box.getElementsByClassName("item");
    if (!items) {
        return null
    }
    for (let item of items) {
        if (item.classList.contains("selected")) {
            return itemValue(item);
        }
    }
    return null;
}

function itemValue(item) {
    let el = item.getElementsByClassName("item-val")
    if (!el) {
        throw Error("item-val이 없습니다.");
    }
    return el[0].textContent;
}

function reloadProjects() {
    let box = document.getElementById("project-box");
    box.innerText = "";
    let tmpl = document.getElementById("item-tmpl");
    let prjs = projects();
    let pinned = []
    let unpinned = []
    for (let prj of prjs) {
        if (pinnedProject[prj]) {
            pinned.push(prj)
        } else {
            unpinned.push(prj)
        }
    }
    prjs = pinned.concat(unpinned);
    for (let prj of prjs) {
        let frag = document.importNode(tmpl.content, true);
        let div = frag.querySelector("div");
        div.id = "project-" + prj;
        div.classList.add("pinnable-item");
        div.getElementsByClassName("item-val")[0].textContent = prj;
        if (pinned.includes(prj)) {
            div.getElementsByClassName("item-pin")[0].textContent = "*";
        }
        div.addEventListener("click", function() { selectProjectEv(prj); });
        box.append(div);
    }
}

function reloadShots(prj) {
    if (!prj) {
        throw Error("선택된 프로젝트가 없습니다.");
    }
    let box = document.getElementById("shot-box");
    box.innerText = "";

    let shots = shotsOf(prj);
    let pinned = []
    let unpinned = []
    for (let shot of shots) {
        if (pinnedShot[prj] && pinnedShot[prj][shot]) {
            pinned.push(shot)
        } else {
            unpinned.push(shot)
        }
    }
    shots = pinned.concat(unpinned);
    let tmpl = document.getElementById("item-tmpl");
    for (let shot of shots) {
        let frag = document.importNode(tmpl.content, true);
        let div = frag.querySelector("div");
        div.id = "shot-" + shot;
        div.classList.add("pinnable-item");
        div.getElementsByClassName("item-val")[0].textContent = shot;
        if (pinned.includes(shot)) {
            div.getElementsByClassName("item-pin")[0].textContent = "*";
        }
        div.addEventListener("click", function() { selectShotEv(prj, shot); });
        box.append(div);
    }
}

function reloadTasks(prj, shot) {
    if (!prj) {
        throw Error("선택된 프로젝트가 없습니다.");
    }
    if (!shot) {
        throw Error("선택된 샷이 없습니다.");
    }
    let box = document.getElementById("task-box");
    box.innerText = "";
    let tmpl = document.getElementById("item-tmpl");
    for (let t of tasksOf(prj, shot)) {
        let frag = document.importNode(tmpl.content, true);
        let div = frag.querySelector("div");
        div.id = "task-" + t;
        div.getElementsByClassName("item-val")[0].textContent = t;
        div.addEventListener("click", function() { selectTaskEv(prj, shot, t); });
        box.append(div);
    }
}

function reloadVersions(prj, shot, task) {
    if (!prj) {
        throw Error("선택된 프로젝트가 없습니다.");
    }
    if (!shot) {
        throw Error("선택된 샷이 없습니다.");
    }
    if (!task) {
        throw Error("선택된 태스크가 없습니다.");
    }
    let box = document.getElementById("version-box");
    box.innerText = "";
    let tmpl = document.getElementById("item-tmpl");
    for (let v of versionsOf(prj, shot, task)) {
        let frag = document.importNode(tmpl.content, true);
        let div = frag.querySelector("div");
        div.id = "version-" + v;
        div.getElementsByClassName("item-val")[0].textContent = v;
        div.addEventListener("click", function() { selectVersionEv(prj, shot, task, v); });
        box.append(div);
    }
}

function clearBox(id) {
    let box = document.getElementById(id);
    if (!box) {
        throw Error(id + "가 없습니다.");
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

function configDir() {
    return user.configDir() + "/elo";
}

function ensureConfigDirExist() {
    let dir = configDir();
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
}

function loadPinnedProject() {
    let fname = configDir() + "/pinned_project.json";
    if (!fs.existsSync(fname)) {
        pinnedProject = {};
        return;
    }
    let data = fs.readFileSync(fname);
    pinnedProject = JSON.parse(data);
}

function pinProject(prj) {
    pinnedProject[prj] = true;
    let fname = configDir() + "/pinned_project.json";
    let data = JSON.stringify(pinnedProject);
    fs.writeFileSync(fname, data);
}

function unpinProject(prj) {
    delete pinnedProject[prj];
    let fname = configDir() + "/pinned_project.json";
    let data = JSON.stringify(pinnedProject);
    fs.writeFileSync(fname, data);
}

function loadPinnedShot() {
    let fname = configDir() + "/pinned_shot.json";
    if (!fs.existsSync(fname)) {
        pinnedShot = {};
        return;
    }
    let data = fs.readFileSync(fname);
    pinnedShot = JSON.parse(data);
}

function pinShot(prj, shot) {
    if (!pinnedShot[prj]) {
        pinnedShot[prj] = {};
    }
    pinnedShot[prj][shot] = true;
    let fname = configDir() + "/pinned_shot.json";
    let data = JSON.stringify(pinnedShot);
    fs.writeFileSync(fname, data);
}

function unpinShot(prj, shot) {
    delete pinnedShot[prj][shot];
    if (Object.keys(pinnedShot[prj]).length == 0) {
        delete pinnedShot[prj];
    }
    let fname = configDir() + "/pinned_shot.json";
    let data = JSON.stringify(pinnedShot);
    fs.writeFileSync(fname, data);
}

try {
    init();
} catch(err) {
    notify(err.message);
}

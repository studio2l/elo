var fs = require("fs");
var proc = require("child_process");
var user = require("./user.js");
var site = require("./site.js");
var remote = require("electron").remote;
var Menu = remote.Menu, MenuItem = remote.MenuItem;
var projectRoot = "";
var pinnedProject = {};
var pinnedGroup = {};
var pinnedUnit = {};
var SelectionTree = /** @class */ (function () {
    function SelectionTree() {
        this.sel = "";
        this.sub = {};
    }
    SelectionTree.prototype.Select = function (k) {
        this.sel = k;
        if (!this.sub[this.sel]) {
            this.sub[this.sel] = new SelectionTree();
        }
        return this.sub[this.sel];
    };
    SelectionTree.prototype.Selected = function () {
        return this.sel;
    };
    return SelectionTree;
}());
var selection = new SelectionTree();
// init은 elo를 초기화 한다.
// 실행은 모든 함수가 정의되고 난 마지막에 하게 된다.
function init() {
    site.Init();
    ensureDirExist(configDir());
    loadPinnedProject();
    loadPinnedGroup();
    loadPinnedUnit();
    ensureElementExist("project-box");
    ensureElementExist("unit-box");
    ensureElementExist("part-box");
    ensureElementExist("task-box");
    ensureElementExist("category-menu");
    ensureElementExist("my-part-menu");
    addCategoryMenuItems();
    loadCategory();
    reloadMyPartMenuItems();
    loadMyPart();
    reloadProjects();
    loadSelection();
    uiEvent(function () {
        // 원래 있던 항목들이 사라지는 경우 아래 함수는 에러가 난다.
        // 이런 경우에 elo가 멈춰서는 안된다.
        restoreProjectSelection();
    })();
}
window.addEventListener("contextmenu", function (ev) {
    ev.preventDefault();
    function parentById(ev, id) {
        for (var _i = 0, _a = ev.path; _i < _a.length; _i++) {
            var p = _a[_i];
            if (p.id == id) {
                return p;
            }
        }
        return null;
    }
    function parentByClassName(ev, cls) {
        for (var _i = 0, _a = ev.path; _i < _a.length; _i++) {
            var p = _a[_i];
            if (p.classList.contains(cls)) {
                return p;
            }
        }
        return null;
    }
    if (parentById(ev, "project-box")) {
        var prj_1 = parentByClassName(ev, "item").id.split("-")[1];
        var projectMenu = new Menu();
        var pinProjectMenuItem = new MenuItem({
            label: "상단에 고정",
            click: uiEvent(function () {
                var cur = currentProject();
                pinProject(prj_1);
                reloadProjects();
                selectProject(cur);
                restoreGroupSelection(cur);
            })
        });
        var unpinProjectMenuItem = new MenuItem({
            label: "상단에서 제거",
            click: uiEvent(function () {
                var cur = currentProject();
                unpinProject(prj_1);
                reloadProjects();
                selectProject(cur);
                restoreGroupSelection(cur);
            })
        });
        if (isPinnedProject(prj_1)) {
            projectMenu.append(unpinProjectMenuItem);
        }
        else {
            projectMenu.append(pinProjectMenuItem);
        }
        var openProjectDir = new MenuItem({
            label: "디렉토리 열기",
            click: uiEvent(function () {
                openDir(site.ProjectDir(prj_1));
            })
        });
        projectMenu.append(openProjectDir);
        projectMenu.popup(remote.getCurrentWindow());
        return;
    }
    if (parentById(ev, "group-box")) {
        var prj_2 = currentProject();
        var ctg_1 = currentCategory();
        var grp_1 = parentByClassName(ev, "item").id.split("-")[1];
        var groupMenu = new Menu();
        var pinGroupMenuItem = new MenuItem({
            label: "상단에 고정",
            click: uiEvent(function () {
                pinGroup(prj_2, ctg_1, grp_1);
                reloadGroups();
                restoreGroupSelection(prj_2);
            })
        });
        var unpinGroupMenuItem = new MenuItem({
            label: "상단에서 제거",
            click: uiEvent(function () {
                unpinGroup(prj_2, ctg_1, grp_1);
                reloadGroups();
                restoreGroupSelection(prj_2);
            })
        });
        if (isPinnedGroup(prj_2, ctg_1, grp_1)) {
            groupMenu.append(unpinGroupMenuItem);
        }
        else {
            groupMenu.append(pinGroupMenuItem);
        }
        var openGroupDir = new MenuItem({
            label: "디렉토리 열기",
            click: uiEvent(function () {
                openDir(site.Categ(ctg_1).GroupDir(prj_2, grp_1));
            })
        });
        groupMenu.append(openGroupDir);
        groupMenu.popup(remote.getCurrentWindow());
        return;
    }
    if (parentById(ev, "unit-box")) {
        var prj_3 = currentProject();
        var ctg_2 = currentCategory();
        var grp_2 = currentGroup();
        var unit_1 = parentByClassName(ev, "item").id.split("-")[1];
        var unitMenu = new Menu();
        var pinUnitMenuItem = new MenuItem({
            label: "상단에 고정",
            click: uiEvent(function () {
                pinUnit(prj_3, ctg_2, grp_2, unit_1);
                reloadUnits();
                restoreUnitSelection(prj_3, ctg_2, grp_2);
            })
        });
        var unpinUnitMenuItem = new MenuItem({
            label: "상단에서 제거",
            click: uiEvent(function () {
                unpinUnit(prj_3, ctg_2, grp_2, unit_1);
                reloadUnits();
                restoreUnitSelection(prj_3, ctg_2, grp_2);
            })
        });
        if (isPinnedUnit(prj_3, ctg_2, grp_2, unit_1)) {
            unitMenu.append(unpinUnitMenuItem);
        }
        else {
            unitMenu.append(pinUnitMenuItem);
        }
        var openUnitDir = new MenuItem({
            label: "디렉토리 열기",
            click: uiEvent(function () {
                openDir(site.Categ(ctg_2).UnitDir(prj_3, grp_2, unit_1));
            })
        });
        unitMenu.append(openUnitDir);
        unitMenu.popup(remote.getCurrentWindow());
        return;
    }
    if (parentById(ev, "part-box")) {
        var prj_4 = currentProject();
        var ctg_3 = currentCategory();
        var grp_3 = currentGroup();
        var unit_2 = currentUnit();
        var task_1 = parentByClassName(ev, "item").id.split("-")[1];
        var taskMenu = new Menu();
        var openPartDir = new MenuItem({
            label: "디렉토리 열기",
            click: uiEvent(function () {
                openDir(site.Categ(ctg_3).PartDir(prj_4, grp_3, unit_2, task_1));
            })
        });
        taskMenu.append(openPartDir);
        taskMenu.popup(remote.getCurrentWindow());
        return;
    }
    if (parentById(ev, "task-box")) {
        var prj = currentProject();
        var grp = currentGroup();
        var unit = currentUnit();
        var task = currentPart();
        var div = parentByClassName(ev, "item");
        var dir_1 = div.dataset.dir;
        var taskMenu = new Menu();
        var openTaskDir = new MenuItem({
            label: "디렉토리 열기",
            click: uiEvent(function () {
                openDir(dir_1);
            })
        });
        taskMenu.append(openTaskDir);
        taskMenu.popup(remote.getCurrentWindow());
        return;
    }
});
// uiEvent 함수는 받아들인 함수를 이벤트 함수로 만들어 반환한다.
// 즉, 실행한 결과에 문제가 있었을 때 상태줄에 표시하고 로그로 기록하게 한다.
function uiEvent(f) {
    return function () {
        try {
            f();
        }
        catch (err) {
            console.log(err);
            notify(err.message);
        }
    };
}
// ensureElementExist는 해당 HTML 엘리먼트가 존재하는지 검사한다.
// 존재하지 않는다면 에러를 낸다.
function ensureElementExist(id) {
    var el = document.getElementById(id);
    if (!el) {
        throw Error(id + "가 존재하지 않습니다.");
    }
}
exports.openLogEv = function () {
    uiEvent(function () {
        openLog();
    })();
};
function openLog() {
    var m = document.getElementById("log");
    m.style.display = "flex";
}
exports.closeLogEv = function () {
    uiEvent(function () {
        closeLog();
    })();
};
function closeLog() {
    var m = document.getElementById("log");
    m.style.display = "none";
}
// openModalEv는 사용자가 항목 추가 버튼을 눌렀을 때 그에 맞는 모달 창을 연다.
exports.openModalEv = function (kind) {
    if (kind == "group" && !currentProject()) {
        notify("아직 프로젝트를 선택하지 않았습니다.");
        return;
    }
    if (kind == "unit" && !currentGroup()) {
        notify("아직 그룹을 선택하지 않았습니다.");
        return;
    }
    if (kind == "part" && !currentUnit()) {
        notify("아직 샷을 선택하지 않았습니다.");
        return;
    }
    if (kind == "task" && !currentPart()) {
        notify("아직 태스크를 선택하지 않았습니다.");
        return;
    }
    uiEvent(function () {
        openModal(kind);
    })();
};
// openModal은 생성할 항목의 종류에 맞는 모달 창을 연다.
function openModal(kind) {
    var m = document.getElementById("modal");
    m.style.display = "block";
    var input = document.getElementById("modal-input");
    input.value = "";
    var progInput = document.getElementById("modal-prog-input");
    progInput.hidden = true;
    var ctg = currentCategory();
    if (kind == "task") {
        progInput.hidden = false;
        progInput.innerText = "";
        var progs = Array();
        try {
            progs = site.Categ(ctg).ProgramsOf(currentProject(), currentGroup(), currentUnit(), currentPart());
        }
        catch (err) {
            m.style.display = "none";
            throw err;
        }
        for (var p in progs) {
            var opt = document.createElement("option");
            opt.text = p;
            progInput.add(opt);
        }
    }
    var ctgLabel = site.Categ(ctg).Label;
    var kor = {
        "project": "프로젝트",
        "group": "그룹",
        "unit": ctgLabel,
        "part": ctgLabel + " 파트",
        "task": ctgLabel + " 태스크"
    };
    input.placeholder = "생성 할 " + kor[kind] + " 이름";
    function createItem() {
        closeModal();
        var input = document.getElementById("modal-input");
        var name = input.value;
        if (!name) {
            notify("생성할 항목의 이름을 설정하지 않았습니다.");
            return;
        }
        if (kind == "project") {
            createProject(name);
        }
        else if (kind == "group") {
            createGroup(currentProject(), ctg, name);
        }
        else if (kind == "unit") {
            createUnit(currentProject(), ctg, currentGroup(), name);
        }
        else if (kind == "part") {
            createPart(currentProject(), ctg, currentGroup(), currentUnit(), name);
        }
        else if (kind == "task") {
            var progInput_1 = document.getElementById("modal-prog-input");
            var prog = progInput_1.value;
            createTask(currentProject(), ctg, currentGroup(), currentUnit(), currentPart(), name, "v001", prog);
        }
    }
    input.onkeydown = function (ev) {
        if (ev.key == "Enter") {
            uiEvent(function () {
                createItem();
                saveSelection();
            })();
        }
    };
    input.focus();
    var apply = document.getElementById("modal-apply");
    apply.onclick = uiEvent(function () {
        createItem();
        saveSelection();
    });
}
// closeModalEv는 모달 사용중 사용자가 닫음 버튼을 눌렀을 때 모달을 닫는다.
exports.closeModalEv = function () {
    uiEvent(function () {
        closeModal();
    })();
};
// closeModal은 모달을 보이지 않도록 한다.
function closeModal() {
    var m = document.getElementById("modal");
    m.style.display = "none";
}
// notify는 아래쪽 표시줄에 text를 표시한다.
function notify(text) {
    var logContent = document.getElementById("log-content");
    var pre = document.createElement("pre");
    pre.style.color = "black";
    pre.innerText = text;
    logContent.appendChild(pre);
    // notifier는 한줄의 메세지만 보일 수 있다.
    // 마지막 줄을 보이기로 한다.
    var line = text.trim().split("\n");
    var notifier = document.getElementById("notifier");
    notifier.innerText = line;
}
// clearNotify는 아래쪽 표시줄에 기존에 표시된 내용을 지운다.
function clearNotify() {
    var notifier = document.getElementById("notifier");
    notifier.innerText = "";
}
// loadCategory는 설정 디렉토리에 저장된 내 파트 값을 불러온다.
function loadCategory() {
    var menu = document.getElementById("category-menu");
    var fname = configDir() + "/category.json";
    if (!fs.existsSync(fname)) {
        var ctg_4 = site.Categories[0];
        menu.value = ctg_4;
        document.getElementById("unit-label").innerText = site.Categ(ctg_4).Label;
        return;
    }
    var data = fs.readFileSync(fname);
    var ctg = data.toString("utf8");
    menu.value = ctg;
    document.getElementById("unit-label").innerText = site.Categ(ctg).Label;
}
// saveCategory는 내 파트로 설정된 값을 설정 디렉토리에 저장한다.
function saveCategory() {
    var menu = document.getElementById("category-menu");
    var ctg = menu.value;
    document.getElementById("unit-label").innerText = site.Categ(ctg).Label;
    var fname = configDir() + "/category.json";
    fs.writeFileSync(fname, ctg);
    reloadMyPartMenuItems();
    loadMyPart();
    selectProject(currentProject());
}
exports.saveCategory = saveCategory;
// myPart는 현재 내 파트로 설정된 값을 반환한다.
function myPart() {
    var menu = document.getElementById("my-part-menu");
    return menu.value;
}
// loadMyPart는 설정 디렉토리에 저장된 현재 카테고리에 대한 내 파트 값을 불러온다.
function loadMyPart() {
    var ctg = currentCategory();
    if (!ctg) {
        return;
    }
    var menu = document.getElementById("my-part-menu");
    var fname = configDir() + "/my-" + ctg + "-part.json";
    if (!fs.existsSync(fname)) {
        menu.value = "";
        return;
    }
    var data = fs.readFileSync(fname);
    menu.value = data.toString("utf8");
}
// saveMyPart는 현재 카테고리에서 내 파트로 설정된 값을 설정 디렉토리에 저장한다.
function saveMyPart() {
    var ctg = currentCategory();
    if (!ctg) {
        return;
    }
    var menu = document.getElementById("my-part-menu");
    var fname = configDir() + "/my-" + ctg + "-part.json";
    fs.writeFileSync(fname, menu.value);
}
exports.saveMyPart = saveMyPart;
// selectionTreeFromJSON은 json 오브젝트를 참조하여 SelectionTree 클래스를 만든다.
function selectionTreeFromJSON(tree, json) {
    tree.sel = json.sel;
    tree.sub = {};
    for (var s in json.sub) {
        tree.sub[s] = new SelectionTree();
        selectionTreeFromJSON(tree.sub[s], json.sub[s]);
    }
    return tree;
}
// loadSelection는 파일에서 마지막으로 선택했던 항목들을 다시 불러온다.
function loadSelection() {
    var fname = configDir() + "/selection.json";
    if (!fs.existsSync(fname)) {
        return;
    }
    selection = selectionTreeFromJSON(selection, JSON.parse(fs.readFileSync(fname)));
}
// saveSelection는 현재 선택된 항목들을 파일로 저장한다.
function saveSelection() {
    selectionChanged();
    var data = JSON.stringify(selection, null, 2);
    var fname = configDir() + "/selection.json";
    fs.writeFileSync(fname, data);
}
function selectionChanged() {
    var prj = currentProject();
    if (!prj) {
        return;
    }
    var prjSel = selection.Select(prj);
    var ctg = currentCategory();
    if (!ctg) {
        return;
    }
    var ctgSel = prjSel.Select(ctg);
    var grp = currentGroup();
    if (!grp) {
        return;
    }
    var grpSel = ctgSel.Select(grp);
    var unit = currentUnit();
    if (!unit) {
        return;
    }
    var unitSel = grpSel.Select(unit);
    var part = currentPart();
    if (!part) {
        return;
    }
    var partSel = unitSel.Select(part);
    var task = currentTask();
    if (!task) {
        return;
    }
    var taskSel = partSel.Select(task);
    var ver = currentVersion();
    // 버전은 빈 문자열일 수도 있다.
    taskSel.Select(ver);
}
// createProject는 하나의 프로젝트를 생성한다.
function createProject(prj) {
    site.CreateProject(prj);
    reloadProjects();
    selectProject(prj);
}
// createGroup은 하나의 그룹을 생성한다.
function createGroup(prj, ctg, grp) {
    site.Categ(ctg).CreateGroup(prj, grp);
    reloadGroups();
    selectGroup(grp);
}
// createUnit은 하나의 샷을 생성한다.
function createUnit(prj, ctg, grp, unit) {
    site.Categ(ctg).CreateUnit(prj, grp, unit);
    reloadUnits();
    selectUnit(unit);
}
// createPart는 하나의 샷 태스크를 생성한다.
function createPart(prj, ctg, grp, unit, part) {
    site.Categ(ctg).CreatePart(prj, grp, unit, part);
    reloadParts();
    selectPart(part);
}
// createTask는 하나의 샷 요소를 생성한다.
function createTask(prj, ctg, grp, unit, part, task, ver, prog) {
    site.Categ(ctg).CreateTask(prj, grp, unit, part, task, ver, prog);
    reloadTasks();
    selectTask(task, "");
}
// addCategoryMenuItems는 사용가능한 카테고리들을 내 태스크 메뉴에 추가한다.
function addCategoryMenuItems() {
    var menu = document.getElementById("category-menu");
    if (!menu) {
        throw Error("category-menu가 없습니다.");
    }
    for (var _i = 0, _a = site.Categories; _i < _a.length; _i++) {
        var ctg = _a[_i];
        var opt = document.createElement("option");
        opt.text = ctg;
        menu.add(opt);
    }
}
// reloadMyPartMenuItems는 현재 카테고리의 사용 가능한 태스크들을 내 태스크 메뉴에 추가한다.
function reloadMyPartMenuItems() {
    var ctg = currentCategory();
    if (!ctg) {
        return;
    }
    var menu = document.getElementById("my-part-menu");
    if (!menu) {
        throw Error("my-part-menu가 없습니다.");
    }
    menu.innerText = "";
    var opt = document.createElement("option");
    opt.text = "없음";
    opt.value = "";
    menu.add(opt);
    for (var _i = 0, _a = site.Categ(ctg).Parts; _i < _a.length; _i++) {
        var part = _a[_i];
        var opt_1 = document.createElement("option");
        opt_1.text = part;
        menu.add(opt_1);
    }
}
// selectProjectEv는 사용자가 프로젝트를 선택했을 때 그에 맞는 샷 리스트를 보인다.
function selectProjectEv(prj) {
    uiEvent(function () {
        selectProject(prj);
        restoreGroupSelection(prj);
        saveSelection();
    })();
}
// selectProject는 사용자가 프로젝트를 선택했을 때 그에 맞는 샷 리스트를 보인다.
function selectProject(prj) {
    clearNotify();
    clearGroups();
    clearUnits();
    clearParts();
    clearTasks();
    var box = document.getElementById("project-box");
    var item = box.getElementsByClassName("selected");
    if (item.length != 0) {
        item[0].classList.remove("selected");
    }
    var selected = document.getElementById("project-" + prj);
    selected.classList.add("selected");
    reloadGroups();
}
// restoreProjectSelection은 마지막으로 선택되었던 프로젝트로 선택을 되돌린다.
// 기억된 하위 요소들도 함께 되돌린다.
function restoreProjectSelection() {
    var prj = selection.Selected();
    if (!prj) {
        return;
    }
    selectProject(prj);
    restoreGroupSelection(prj);
}
// restoreGroupSelection은 해당 프로젝트에서 마지막으로 선택되었던 그룹으로 선택을 되돌린다.
// 기억된 하위 요소들도 함께 되돌린다.
function restoreGroupSelection(prj) {
    var ctg = currentCategory();
    var ctgSel = selection.Select(prj).Select(ctg);
    var grp = ctgSel.Selected();
    if (!grp) {
        return;
    }
    selectGroup(grp);
    restoreUnitSelection(prj, ctg, grp);
}
// restoreUnitSelection은 해당 그룹에서 마지막으로 선택되었던 유닛으로 선택을 되돌린다.
// 기억된 하위 요소들도 함께 되돌린다.
function restoreUnitSelection(prj, ctg, grp) {
    var grpSel = selection.Select(prj).Select(ctg).Select(grp);
    var unit = grpSel.Selected();
    if (!unit) {
        return;
    }
    selectUnit(unit);
    restorePartSelection(prj, ctg, grp, unit);
}
// restorePartSelection은 해당 유닛에서 마지막으로 선택되었던 파트로 선택을 되돌린다.
// 기억된 하위 요소들도 함께 되돌린다.
function restorePartSelection(prj, ctg, grp, unit) {
    var unitSel = selection.Select(prj).Select(ctg).Select(grp).Select(unit);
    var part = unitSel.Selected();
    if (!part) {
        part = myPart();
        if (!site.Categ(ctg).PartsOf(prj, grp, unit).includes(part)) {
            return;
        }
    }
    if (!part) {
        return;
    }
    selectPart(part);
    restoreTaskSelection(prj, ctg, grp, unit, part);
}
// restoreTaskSelection은 해당 파트에서 마지막으로 선택되었던 (버전 포함) 태스크로 선택을 되돌린다.
function restoreTaskSelection(prj, ctg, grp, unit, part) {
    var partSel = selection.Select(prj).Select(ctg).Select(grp).Select(unit).Select(part);
    var task = partSel.Selected();
    if (!task) {
        return;
    }
    var taskSel = partSel.Select(task);
    var ver = taskSel.Selected();
    // 버전은 빈 문자열일 수도 있다.
    if (ver) {
        toggleVersionVisibility(task);
    }
    selectTask(task, ver);
}
// selectGroupEv는 사용자가 그룹을 선택했을 때 그에 맞는 유닛 리스트를 보인다.
function selectGroupEv(grp) {
    uiEvent(function () {
        selectGroup(grp);
        saveSelection();
        restoreUnitSelection(currentProject(), currentCategory(), grp);
    })();
}
// selectGroup은 사용자가 그룹을 선택했을 때 그에 맞는 유닛 리스트를 보인다.
function selectGroup(grp) {
    clearNotify();
    clearUnits();
    clearParts();
    clearTasks();
    var box = document.getElementById("group-box");
    var item = box.getElementsByClassName("selected");
    if (item.length != 0) {
        item[0].classList.remove("selected");
    }
    var selected = document.getElementById("group-" + grp);
    selected.classList.add("selected");
    reloadUnits();
}
// selectUnitEv는 사용자가 샷을 선택했을 때 그에 맞는 태스크 리스트를 보인다.
// 추가로 내 태스크가 설정되어 있다면 그 태스크를 자동으로 선택해 준다.
function selectUnitEv(unit) {
    uiEvent(function () {
        selectUnit(unit);
        saveSelection();
        restorePartSelection(currentProject(), currentCategory(), currentGroup(), unit);
    })();
}
// selectUnit은 사용자가 샷을 선택했을 때 그에 맞는 태스크 리스트를 보인다.
// 추가로 내 태스크로 설정된 값이 있다면 그 태스크를 자동으로 선택해 준다.
function selectUnit(unit) {
    clearNotify();
    clearParts();
    clearTasks();
    var box = document.getElementById("unit-box");
    var item = box.getElementsByClassName("selected");
    if (item.length != 0) {
        item[0].classList.remove("selected");
    }
    var selected = document.getElementById("unit-" + unit);
    selected.classList.add("selected");
    reloadParts();
}
// selectPartEv는 태스크를 선택했을 때 그 안의 요소 리스트를 보인다.
function selectPartEv(part) {
    uiEvent(function () {
        selectPart(part);
        saveSelection();
        restoreTaskSelection(currentProject(), currentCategory(), currentGroup(), currentUnit(), part);
    })();
}
// selectPart는 태스크를 선택했을 때 그 안의 요소 리스트를 보인다.
function selectPart(part) {
    clearNotify();
    clearTasks();
    var box = document.getElementById("part-box");
    var item = box.getElementsByClassName("selected");
    if (item.length != 0) {
        item[0].classList.remove("selected");
    }
    var selected = document.getElementById("part-" + part);
    selected.classList.add("selected");
    reloadTasks();
}
// selectTaskEv는 요소를 선택했을 때 그 선택을 표시한다.
function selectTaskEv(task, ver) {
    uiEvent(function () {
        selectTask(task, ver);
        saveSelection();
    })();
}
// selectTask는 요소를 선택했을 때 그 선택을 표시한다.
function selectTask(task, ver) {
    clearNotify();
    var box = document.getElementById("task-box");
    var item = box.getElementsByClassName("selected");
    if (item.length != 0) {
        item[0].classList.remove("selected");
    }
    var id = "task-" + task;
    if (ver) {
        id += "-" + ver;
    }
    var selected = document.getElementById(id);
    selected.classList.add("selected");
}
// currentProject는 현재 선택된 프로젝트 이름을 반환한다.
function currentProject() {
    return selectedItemValue("project-box");
}
// currentCategory는 현재 선택된 카테고리 이름을 반환한다.
function currentCategory() {
    var menu = document.getElementById("category-menu");
    return menu.value;
}
// currentGroup은 현재 선택된 그룹 이름을 반환한다.
function currentGroup() {
    return selectedItemValue("group-box");
}
// currentUnit은 현재 선택된 샷 이름을 반환한다.
function currentUnit() {
    return selectedItemValue("unit-box");
}
// currentPart는 현재 선택된 샷 태스크 이름을 반환한다.
function currentPart() {
    return selectedItemValue("part-box");
}
// currentTask는 현재 선택된 샷 엘리먼트 이름을 반환한다.
function currentTask() {
    var val = selectedItemValue("task-box");
    if (!val) {
        return null;
    }
    // val은 "{task}" 또는 "{task}-{version}"이다.
    return val.split("-")[0];
}
// currentVersion은 현재 선택된 샷 버전을 반환한다.
function currentVersion() {
    var val = selectedItemValue("task-box");
    if (!val) {
        return null;
    }
    // val은 "{task}" 또는 "{task}-{version}"이다.
    var vals = val.split("-");
    if (vals.length == 1) {
        return "";
    }
    return vals[1];
}
// selectedItemValue는 특정 'item-box' HTML 요소에서 선틱된 값을 반환한다.
function selectedItemValue(boxId) {
    var box = document.getElementById(boxId);
    if (!box) {
        throw Error(boxId + "가 없습니다.");
    }
    var items = box.getElementsByClassName("item");
    if (!items) {
        return null;
    }
    for (var i in items) {
        var item = items[i];
        if (item.classList.contains("selected")) {
            return itemValue(item);
        }
    }
    return null;
}
// itemValue는 특정 'item' HTML 요소에 저장된 값을 반환한다.
function itemValue(item) {
    return item.dataset.val;
}
// newBoxItem은 box 클래스 안에서 사용될 item HTML 요소를 생성한다.
// 받아들이는 두 인수는 각각 왼쪽(메인)과 오른쪽(서브)에 적힐 내용이다.
function newBoxItem(val, sub) {
    var tmpl = document.getElementById("item-tmpl");
    var frag = document.importNode(tmpl.content, true);
    var item = frag.querySelector("div");
    item.getElementsByClassName("item-val")[0].textContent = val;
    item.getElementsByClassName("item-pin")[0].textContent = sub;
    return item;
}
// reloadProjects는 프로젝트를 다시 부른다.
function reloadProjects() {
    var box = document.getElementById("project-box");
    box.innerText = "";
    var prjs = site.Projects();
    var byPin = function (a, b) {
        if (isPinnedProject(a)) {
            return -1;
        }
        if (isPinnedProject(b)) {
            return 1;
        }
        return 0;
    };
    prjs.sort(byPin);
    var _loop_1 = function (prj) {
        var mark = "";
        if (isPinnedProject(prj)) {
            mark = "*";
        }
        var div = newBoxItem(prj, mark);
        div.id = "project-" + prj;
        div.dataset.val = prj;
        div.onclick = function () { selectProjectEv(prj); };
        box.append(div);
    };
    for (var _i = 0, prjs_1 = prjs; _i < prjs_1.length; _i++) {
        var prj = prjs_1[_i];
        _loop_1(prj);
    }
}
// reloadGroups는 해당 프로젝트의 그룹을 다시 부른다.
function reloadGroups() {
    var prj = currentProject();
    if (!prj) {
        throw Error("선택된 프로젝트가 없습니다.");
    }
    var ctg = currentCategory();
    var box = document.getElementById("group-box");
    box.innerText = "";
    var groups = site.Categ(ctg).GroupsOf(prj);
    var byPin = function (a, b) {
        if (isPinnedGroup(prj, ctg, a)) {
            return -1;
        }
        if (isPinnedGroup(prj, ctg, b)) {
            return 1;
        }
        return 0;
    };
    groups.sort(byPin);
    var _loop_2 = function (grp) {
        var mark = "";
        if (isPinnedGroup(prj, ctg, grp)) {
            mark = "*";
        }
        var div = newBoxItem(grp, mark);
        div.id = "group-" + grp;
        div.dataset.val = grp;
        div.onclick = function () { selectGroupEv(grp); };
        box.append(div);
    };
    for (var _i = 0, groups_1 = groups; _i < groups_1.length; _i++) {
        var grp = groups_1[_i];
        _loop_2(grp);
    }
}
// reloadUnits는 해당 프로젝트의 샷을 다시 부른다.
function reloadUnits() {
    var prj = currentProject();
    if (!prj) {
        throw Error("선택된 프로젝트가 없습니다.");
    }
    var ctg = currentCategory();
    var grp = currentGroup();
    if (!grp) {
        throw Error("선택된 그룹이 없습니다.");
    }
    var box = document.getElementById("unit-box");
    box.innerText = "";
    var units = site.Categ(ctg).UnitsOf(prj, grp);
    var byPin = function (a, b) {
        if (isPinnedUnit(prj, ctg, grp, a)) {
            return -1;
        }
        if (isPinnedUnit(prj, ctg, grp, b)) {
            return 1;
        }
        return 0;
    };
    units.sort(byPin);
    var _loop_3 = function (unit) {
        var mark = "";
        if (isPinnedUnit(prj, ctg, grp, unit)) {
            mark = "*";
        }
        var div = newBoxItem(unit, mark);
        div.id = "unit-" + unit;
        div.dataset.val = unit;
        div.onclick = function () { selectUnitEv(unit); };
        box.append(div);
    };
    for (var _i = 0, units_1 = units; _i < units_1.length; _i++) {
        var unit = units_1[_i];
        _loop_3(unit);
    }
}
// reloadParts는 해당 샷의 태스크를 다시 부른다.
function reloadParts() {
    var prj = currentProject();
    if (!prj) {
        throw Error("선택된 프로젝트가 없습니다.");
    }
    var ctg = currentCategory();
    var grp = currentGroup();
    if (!grp) {
        throw Error("선택된 그룹이 없습니다.");
    }
    var unit = currentUnit();
    if (!unit) {
        throw Error("선택된 샷이 없습니다.");
    }
    var box = document.getElementById("part-box");
    box.innerText = "";
    var _loop_4 = function (part) {
        var div = newBoxItem(part, "");
        div.id = "part-" + part;
        div.dataset.val = part;
        div.onclick = function () { selectPartEv(part); };
        box.append(div);
    };
    for (var _i = 0, _a = site.Categ(ctg).PartsOf(prj, grp, unit); _i < _a.length; _i++) {
        var part = _a[_i];
        _loop_4(part);
    }
}
// reloadTasks는 해당 태스크의 요소를 다시 부른다.
function reloadTasks() {
    var prj = currentProject();
    if (!prj) {
        throw Error("선택된 프로젝트가 없습니다.");
    }
    var ctg = currentCategory();
    var grp = currentGroup();
    if (!grp) {
        throw Error("선택된 그룹이 없습니다.");
    }
    var unit = currentUnit();
    if (!unit) {
        throw Error("선택된 샷이 없습니다.");
    }
    var part = currentPart();
    if (!part) {
        throw Error("선택된 태스크가 없습니다.");
    }
    var box = document.getElementById("task-box");
    box.innerText = "";
    var tasks = site.Categ(ctg).TasksOf(prj, grp, unit, part);
    var _loop_5 = function (task) {
        var t = tasks[task];
        var lastver = t.Versions[t.Versions.length - 1];
        var div = newBoxItem(task, lastver + ", " + t.Program.Name);
        div.id = "task-" + task;
        div.dataset.val = task;
        div.dataset.dir = t.Program.Dir;
        div.onclick = function () { selectTaskEv(task, ""); };
        div.ondblclick = function () { openTaskEv(prj, ctg, grp, unit, part, task, t.Program.Name, lastver); };
        var toggle = newVersionToggle(task);
        div.insertBefore(toggle, div.firstChild);
        box.append(div);
        var _loop_6 = function (ver) {
            var div_1 = newBoxItem(ver, "");
            div_1.classList.add("task-" + task + "-versions");
            div_1.id = "task-" + task + "-" + ver;
            div_1.dataset.val = task + "-" + ver;
            div_1.dataset.dir = t.Program.Dir;
            div_1.onclick = function () { selectTaskEv(task, ver); };
            div_1.ondblclick = function () { openTaskEv(prj, ctg, grp, unit, part, task, t.Program.Name, ver); };
            div_1.style.display = "none";
            box.append(div_1);
        };
        for (var _i = 0, _a = t.Versions.reverse(); _i < _a.length; _i++) {
            var ver = _a[_i];
            _loop_6(ver);
        }
    };
    for (var task in tasks) {
        _loop_5(task);
    }
}
// newVersionToggle은 해당 태스크의 버전을 열고 닫을 수 있는 토글을 생성한다.
function newVersionToggle(task) {
    var toggle = document.createElement("div");
    toggle.classList.add("toggle");
    toggle.textContent = "▷";
    toggle.dataset.hideVersions = "t";
    toggle.onclick = function (ev) {
        ev.stopPropagation();
        toggleVersionVisibility(task);
    };
    toggle.ondblclick = function (ev) {
        ev.stopPropagation();
    };
    return toggle;
}
// toggleVersionVisibility는 특정 요소의 버전을 보이거나 숨긴다.
function toggleVersionVisibility(task) {
    var div = document.getElementById("task-" + task);
    var toggle = div.getElementsByClassName("toggle")[0];
    if (toggle.dataset.hideVersions == "t") {
        toggle.dataset.hideVersions = "f";
    }
    else {
        toggle.dataset.hideVersions = "t";
    }
    if (toggle.dataset.hideVersions == "t") {
        toggle.textContent = "▷";
    }
    else {
        toggle.textContent = "▽";
    }
    var vers = document.getElementsByClassName("task-" + task + "-versions");
    for (var i in vers) {
        var v = vers[i];
        if (toggle.dataset.hideVersions == "t") {
            v.style.display = "none";
        }
        else {
            v.style.display = "flex";
        }
    }
}
// openTaskEv는 해당 요소의 한 버전을 연다.
function openTaskEv(prj, ctg, grp, unit, part, task, prog, ver) {
    var handleError = function (err, stdout, stderr) {
        if (err) {
            if (err.errno == "ENOENT") {
                err = Error(prog + " 씬을 열기 위한 명령어가 없습니다.");
            }
            console.log(err);
            notify(err.message);
        }
    };
    site.Categ(ctg).OpenTask(prj, grp, unit, part, task, prog, ver, handleError);
}
// clearBox는 'item-box' HTML 요소 안의 내용을 모두 지운다.
function clearBox(id) {
    var box = document.getElementById(id);
    if (!box) {
        throw Error(id + "가 없습니다.");
    }
    box.innerText = "";
}
// clearProjects는 프로젝트 박스의 내용을 지운다.
function clearProjects() {
    clearBox("project-box");
}
// clearGroups는 그룹 박스의 내용을 지운다.
function clearGroups() {
    clearBox("group-box");
}
// clearUnits는 샷 박스의 내용을 지운다.
function clearUnits() {
    clearBox("unit-box");
}
// clearParts는 태스크 박스의 내용을 지운다.
function clearParts() {
    clearBox("part-box");
}
// clearTasks는 요소 박스의 내용을 지운다.
function clearTasks() {
    clearBox("task-box");
}
// clearAll은 모든 박스 및 알림 바의 내용을 지운다.
function clearAll() {
    clearNotify();
    clearProjects();
    clearGroups();
    clearUnits();
    clearParts();
    clearTasks();
}
// configDir은 elo의 설정 디렉토리 경로를 반환한다.
function configDir() {
    return user.configDir() + "/elo";
}
// ensureDirExist는 해당 디렉토리가 없을 때 생성한다.
function ensureDirExist(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
}
// loadPinnedProject는 사용자가 상단에 고정한 프로젝트를 설정 디렉토리에서 찾아 부른다.
function loadPinnedProject() {
    var fname = configDir() + "/pinned_project.json";
    if (!fs.existsSync(fname)) {
        pinnedProject = {};
        return;
    }
    var data = fs.readFileSync(fname);
    pinnedProject = JSON.parse(data);
}
// pinProject는 특정 프로젝트를 상단에 고정한다.
// 변경된 내용은 설정 디렉토리에 저장되어 다시 프로그램을 열 때 반영된다.
function pinProject(prj) {
    pinnedProject[prj] = true;
    var fname = configDir() + "/pinned_project.json";
    var data = JSON.stringify(pinnedProject);
    fs.writeFileSync(fname, data);
}
// unpinProject는 특정 프로젝트의 상단 고정을 푼다.
// 변경된 내용은 설정 디렉토리에 저장되어 다시 프로그램을 열 때 반영된다.
function unpinProject(prj) {
    delete pinnedProject[prj];
    var fname = configDir() + "/pinned_project.json";
    var data = JSON.stringify(pinnedProject);
    fs.writeFileSync(fname, data);
}
function isPinnedProject(prj) {
    if (pinnedProject[prj] == true) {
        return true;
    }
    return false;
}
// loadPinnedGroup은 사용자가 상단에 고정한 샷을 설정 디렉토리에서 찾아 부른다.
function loadPinnedGroup() {
    var fname = configDir() + "/pinned_group.json";
    if (!fs.existsSync(fname)) {
        pinnedGroup = {};
        return;
    }
    var data = fs.readFileSync(fname);
    pinnedGroup = JSON.parse(data);
}
// pinGroup은 특정 샷을 상단에 고정한다.
// 변경된 내용은 설정 디렉토리에 저장되어 다시 프로그램을 열 때 반영된다.
function pinGroup(prj, ctg, grp) {
    if (!pinnedGroup[prj]) {
        pinnedGroup[prj] = {};
    }
    if (!pinnedGroup[prj][ctg]) {
        pinnedGroup[prj][ctg] = {};
    }
    pinnedGroup[prj][ctg][grp] = true;
    var fname = configDir() + "/pinned_group.json";
    var data = JSON.stringify(pinnedGroup);
    fs.writeFileSync(fname, data);
}
// unpinGroup은 특정 샷의 상단 고정을 푼다.
// 변경된 내용은 설정 디렉토리에 저장되어 다시 프로그램을 열 때 반영된다.
function unpinGroup(prj, ctg, grp) {
    delete pinnedGroup[prj][ctg][grp];
    if (Object.keys(pinnedGroup[prj][ctg]).length == 0) {
        delete pinnedGroup[prj][ctg];
    }
    if (Object.keys(pinnedGroup[prj]).length == 0) {
        delete pinnedGroup[prj];
    }
    var fname = configDir() + "/pinned_group.json";
    var data = JSON.stringify(pinnedUnit);
    fs.writeFileSync(fname, data);
}
function isPinnedGroup(prj, ctg, grp) {
    try {
        if (pinnedGroup[prj][ctg][grp]) {
            return true;
        }
        return false;
    }
    catch (err) {
        return false;
    }
}
// loadPinnedUnit은 사용자가 상단에 고정한 샷을 설정 디렉토리에서 찾아 부른다.
function loadPinnedUnit() {
    var fname = configDir() + "/pinned_unit.json";
    if (!fs.existsSync(fname)) {
        pinnedUnit = {};
        return;
    }
    var data = fs.readFileSync(fname);
    pinnedUnit = JSON.parse(data);
}
// pinUnit은 특정 샷을 상단에 고정한다.
// 변경된 내용은 설정 디렉토리에 저장되어 다시 프로그램을 열 때 반영된다.
function pinUnit(prj, ctg, grp, unit) {
    if (!pinnedUnit[prj]) {
        pinnedUnit[prj] = {};
    }
    if (!pinnedUnit[prj][ctg]) {
        pinnedUnit[prj][ctg] = {};
    }
    if (!pinnedUnit[prj][ctg][grp]) {
        pinnedUnit[prj][ctg][grp] = {};
    }
    pinnedUnit[prj][ctg][grp][unit] = true;
    var fname = configDir() + "/pinned_unit.json";
    var data = JSON.stringify(pinnedUnit);
    fs.writeFileSync(fname, data);
}
// unpinUnit은 특정 샷의 상단 고정을 푼다.
// 변경된 내용은 설정 디렉토리에 저장되어 다시 프로그램을 열 때 반영된다.
function unpinUnit(prj, ctg, grp, unit) {
    delete pinnedUnit[prj][ctg][grp][unit];
    if (Object.keys(pinnedUnit[prj][ctg][grp]).length == 0) {
        delete pinnedUnit[prj][ctg][grp];
    }
    if (Object.keys(pinnedUnit[prj][ctg]).length == 0) {
        delete pinnedUnit[prj][ctg];
    }
    if (Object.keys(pinnedUnit[prj]).length == 0) {
        delete pinnedUnit[prj];
    }
    var fname = configDir() + "/pinned_unit.json";
    var data = JSON.stringify(pinnedUnit);
    fs.writeFileSync(fname, data);
}
function isPinnedUnit(prj, ctg, grp, unit) {
    try {
        if (pinnedUnit[prj][ctg][grp][unit]) {
            return true;
        }
        return false;
    }
    catch (err) {
        return false;
    }
}
// openDir은 받은 디렉토리 경로를 연다.
// 만일 해당 디렉토리가 존재하지 않는다면 에러를 낸다.
function openDir(dir) {
    if (!fs.existsSync(dir)) {
        throw Error(dir + "디렉토리가 존재하지 않습니다.");
    }
    if (process.platform == "win32") {
        proc.execFile("explorer", [dir.replace(/\//g, "\\")]);
        return;
    }
    else {
        // 리눅스 - 배포판에 맞는 파일탐색기 명령을 찾는다.
        var maybeCmds = ["thunar", "nautilus"];
        for (var _i = 0, maybeCmds_1 = maybeCmds; _i < maybeCmds_1.length; _i++) {
            var cmd = maybeCmds_1[_i];
            try {
                proc.execFileSync("which", [cmd]);
            }
            catch (err) {
                if (err.errno == "ENOENT") {
                    throw Error("which 명령어가 없습니다.");
                }
                // 해당 명령어 없음
                continue;
            }
            var handleError = function (err, stdout, stderr) {
                if (err) {
                    console.log(err);
                    notify(err.message);
                }
            };
            proc.execFile(cmd, [dir], null, handleError);
            return;
        }
    }
    throw Error("파일 탐색기를 찾지 못했습니다.");
}
// 초기화 실행
try {
    init();
}
catch (err) {
    clearAll();
    console.log(err);
    notify("초기화에 실패: " + err.message);
}

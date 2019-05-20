const fs = require("fs")
const proc = require("child_process")
const user = require("./user.js")
const site = require("./site.js")
const { remote } = require("electron")
const { Menu, MenuItem } = remote

let projectRoot = ""
let pinnedProject = {}
let pinnedShot = {}

// init은 elo를 초기화 한다.
// 실행은 모든 함수가 정의되고 난 마지막에 하게 된다.
function init() {
    site.Init()

    ensureDirExist(configDir())
    loadPinnedProject()
    loadPinnedShot()

    ensureElementExist("project-box")
    ensureElementExist("unit-box")
    ensureElementExist("part-box")
    ensureElementExist("task-box")
    ensureElementExist("my-part-menu")

    addMyPartMenuItems()
    loadMyPart()

    reloadProjects()
    loadSelected()

    window.addEventListener("contextmenu", function(ev) {
        ev.preventDefault()
        function parentById(ev, id) {
            for (let p of ev.path) {
                if (p.id == id) {
                    return p
                }
            }
            return null
        }
        function parentByClassName(ev, cls) {
            for (let p of ev.path) {
                if (p.classList.contains(cls)) {
                    return p
                }
            }
            return null
        }
        if (parentById(ev, "project-box")) {
            let prj = parentByClassName(ev, "item").id.split("-")[1]
            let projectMenu = new Menu()
            let pinProjectMenuItem = new MenuItem({
                label: "상단에 고정",
                click: function() {
                    try {
                        pinProject(prj)
                        reloadProjects()
                    } catch(err) {
                        console.log(err)
                        notify(err.message)
                    }
                },
            })
            let unpinProjectMenuItem = new MenuItem({
                label: "상단에서 제거",
                click: function() {
                    try {
                        unpinProject(prj)
                        reloadProjects()
                    } catch(err) {
                        console.log(err)
                        notify(err.message)
                    }
                },
            })
            if (pinnedProject[prj]) {
                projectMenu.append(unpinProjectMenuItem)
            } else {
                projectMenu.append(pinProjectMenuItem)
            }
            let openProjectDir = new MenuItem({
                label: "디렉토리 열기",
                click: function() {
                    try {
                        openDir(site.ProjectDir(prj))
                    } catch(err) {
                        console.log(err)
                        notify(err.message)
                    }
                }
            })
            projectMenu.append(openProjectDir)
            projectMenu.popup(remote.getCurrentWindow())
            return
        }
        if (parentById(ev, "group-box")) {
            let prj = currentProject()
            let grp = parentByClassName(ev, "item").id.split("-")[1]
            let groupMenu = new Menu()
            let pinGroupMenuItem = new MenuItem({
                label: "상단에 고정",
                click: function() {
                    try {
                        pinGroup(prj, grp)
                        reloadShots()
                    } catch(err) {
                        console.log(err)
                        notify(err.message)
                    }
                },
            })
            let unpinGroupMenuItem = new MenuItem({
                label: "상단에서 제거",
                click: function() {
                    try {
                        unpinGroup(prj, grp)
                        reloadShots()
                    } catch(err) {
                        console.log(err)
                        notify(err.message)
                    }
                },
            })
            if (pinnedGroup[prj] && pinnedGroup[prj][grp]) {
                shotMenu.append(unpinGroupMeknuItem)
            } else {
                shotMenu.append(pinGroupMenuItem)
            }
            let openUnitDir = new MenuItem({
                label: "디렉토리 열기",
                click: function() {
                    try {
                        openDir(site.CurrentCategory().UnitDir(prj, grp, shot))
                    } catch(err) {
                        console.log(err)
                        notify(err.message)
                    }
                }
            })
            shotMenu.append(openUnitDir)
            shotMenu.popup(remote.getCurrentWindow())
            return
        }
        if (parentById(ev, "unit-box")) {
            let prj = currentProject()
            let grp = currentGroup()
            let shot = parentByClassName(ev, "item").id.split("-")[1]
            let shotMenu = new Menu()
            let pinShotMenuItem = new MenuItem({
                label: "상단에 고정",
                click: function() {
                    try {
                        pinShot(prj, grp, shot)
                        reloadShots()
                    } catch(err) {
                        console.log(err)
                        notify(err.message)
                    }
                },
            })
            let unpinShotMenuItem = new MenuItem({
                label: "상단에서 제거",
                click: function() {
                    try {
                        unpinShot(prj, grp, shot)
                        reloadShots()
                    } catch(err) {
                        console.log(err)
                        notify(err.message)
                    }
                },
            })
            if (pinnedShot[prj] && pinnedShot[prj][grp] && pinnedShot[prj][grp][shot]) {
                shotMenu.append(unpinShotMenuItem)
            } else {
                shotMenu.append(pinShotMenuItem)
            }
            let openUnitDir = new MenuItem({
                label: "디렉토리 열기",
                click: function() {
                    try {
                        openDir(site.CurrentCategory().UnitDir(prj, grp, shot))
                    } catch(err) {
                        console.log(err)
                        notify(err.message)
                    }
                }
            })
            shotMenu.append(openUnitDir)
            shotMenu.popup(remote.getCurrentWindow())
            return
        }
        if (parentById(ev, "part-box")) {
            let prj = currentProject()
            let grp = currentGroup()
            let shot = currentUnit()
            let task = parentByClassName(ev, "item").id.split("-")[1]
            let taskMenu = new Menu()
            let openPartDir = new MenuItem({
                label: "디렉토리 열기",
                click: function() {
                    try {
                        openDir(site.CurrentCategory().PartDir(prj, grp, shot, task))
                    } catch(err) {
                        console.log(err)
                        notify(err.message)
                    }
                }
            })
            taskMenu.append(openPartDir)
            taskMenu.popup(remote.getCurrentWindow())
            return
        }
        if (parentById(ev, "task-box")) {
            let prj = currentProject()
            let grp = currentGroup()
            let shot = currentUnit()
            let task = currentPart()
            let div = parentByClassName(ev, "item")
            let dir = div.dataset.dir
            let elemMenu = new Menu()
            let openElemDir = new MenuItem({
                label: "디렉토리 열기",
                click: function() {
                    try {
                        openDir(dir)
                    } catch(err) {
                        console.log(err)
                        notify(err.message)
                    }
                }
            })
            elemMenu.append(openElemDir)
            elemMenu.popup(remote.getCurrentWindow())
            return
        }
    })
}

// ensureElementExist는 해당 HTML 엘리먼트가 존재하는지 검사한다.
// 존재하지 않는다면 에러를 낸다.
function ensureElementExist(id) {
    let el = document.getElementById(id)
    if (!el) {
        throw Error(id + "가 존재하지 않습니다.")
    }
}

// openModalEv는 사용자가 항목 추가 버튼을 눌렀을 때 그에 맞는 모달 창을 연다.
// 예외적으로 자동으로 생성할 수 있다고 판단하는 몇 몇의 경우에는 창은 열리지 않고
// 해당 항목을 자동으로 만든다.
exports.openModalEv = function(kind) {
    if (kind == "group" && !currentProject()) {
        notify("아직 프로젝트를 선택하지 않았습니다.")
        return
    }
    if (kind == "unit" && !currentGroup()) {
        notify("아직 그룹을 선택하지 않았습니다.")
        return
    }
    if (kind == "part" && !currentUnit()) {
        notify("아직 샷을 선택하지 않았습니다.")
        return
    }
    if (kind == "task" && !currentPart()) {
        notify("아직 태스크를 선택하지 않았습니다.")
        return
    }

    try {
        openModal(kind)
    } catch(err) {
        console.log(err)
        notify(err.message)
    }
}

// openModal은 생성할 항목의 종류에 맞는 모달 창을 연다.
function openModal(kind) {
    let m = document.getElementById("modal")
    m.style.display = "block"
    let input = document.getElementById("modal-input")
    input.value = ""
    let progInput = document.getElementById("modal-prog-input")
    progInput.hidden = true
    if (kind == "task") {
        progInput.hidden = false
        progInput.innerText = ""
        let progs = Array()
        try {
            progs = site.CurrentCategory().ProgramsOf(currentProject(), currentGroup(), currentUnit(), currentPart())
        } catch(err) {
            m.style.display = "none"
            throw err
        }
        for (let p in progs) {
            let opt = document.createElement("option")
            opt.text = p
            progInput.add(opt)
        }
    }
    kor = {
        "project": "프로젝트",
        "group": "그룹",
        "unit": "샷",
        "part": "파트",
        "task": "태스크",
    }
    input.placeholder = "생성 할 " + kor[kind] + " 이름"
    function createItem() {
        closeModal()
        let name = document.getElementById("modal-input").value
        if (!name) {
            notify("생성할 항목의 이름을 설정하지 않았습니다.")
            return
        }
        if (kind == "project") {
            createProject(name)
        } else if (kind == "unit") {
            createUnit(currentProject(), name)
        } else if (kind == "part") {
            createPart(currentProject(), currentUnit(), name)
        } else if (kind == "task") {
            let prog = document.getElementById("modal-prog-input").value
            createTask(currentProject(), currentUnit(), currentPart(), name, "v001", prog)
        }
    }
    input.onkeydown = function(ev) {
        if (ev.key == "Enter") {
            try {
                createItem()
            } catch(err) {
                notify(err.message)
                throw err
            }
        }
    }
    input.focus()
    let apply = document.getElementById("modal-apply")
    apply.onclick = function() {
        try {
            createItem()
        } catch(err) {
            notify(err.message)
            throw err
        }
    }
}

// closeModalEv는 모달 사용중 사용자가 닫음 버튼을 눌렀을 때 모달을 닫는다.
exports.closeModalEv = function() {
    try {
        closeModal()
    } catch(err) {
        console.log(err)
        notify(err.message)
    }
}

// closeModal은 모달을 보이지 않도록 한다.
function closeModal() {
    let m = document.getElementById("modal")
    m.style.display = "none"
}

// notify는 아래쪽 표시줄에 text를 표시한다.
function notify(text) {
    let notifier = document.getElementById("notifier")
    notifier.innerText = text
}

// clearNotify는 아래쪽 표시줄에 기존에 표시된 내용을 지운다.
function clearNotify() {
    let notifier = document.getElementById("notifier")
    notifier.innerText = ""
}

// myPart는 현재 내 파트로 설정된 값을 반환한다.
function myPart() {
    let menu = document.getElementById("my-part-menu")
    return menu.value
}

// loadMyPart는 설정 디렉토리에 저장된 내 파트 값을 불러온다.
function loadMyPart() {
    let menu = document.getElementById("my-part-menu")
    let fname = configDir() + "/my-part.json"
    if (!fs.existsSync(fname)) {
        menu.value = ""
        return
    }
    let data = fs.readFileSync(fname)
    menu.value = data.toString("utf8")
}

// saveMyPart는 내 파트로 설정된 값을 설정 디렉토리에 저장한다.
function saveMyPart() {
    let menu = document.getElementById("my-part-menu")
    let fname = configDir() + "/my-part.json"
    fs.writeFileSync(fname, menu.value)
}
exports.saveMyPart = saveMyPart

// loadSelected는 파일에서 마지막으로 선택했던 항목들을 다시 불러온다.
function loadSelected() {
    let fname = configDir() + "/selected.json"
    if (!fs.existsSync(fname)) {
        return
    }
    let data = JSON.parse(fs.readFileSync(fname))
    if (!data.project) {
        return
    }
    try {
        selectProject(data["project"])
    } catch(err) {
        console.log(err)
        return
    }
    if (!data["shot"]) {
        return
    }
    try {
        selectUnit(data["shot"])
    } catch(err) {
        console.log(err)
        return
    }
    if (!data["part"]) {
        return
    }
    try {
        selectPart(data["part"])
    } catch(err) {
        console.log(err)
        return
    }
    if (!data["task"]) {
        return
    }
    try {
        selectTask(data["task"], data["version"])
        if (data["version"]) {
            toggleVersionVisibility(data["task"])
        }
    } catch(err) {
        console.log(err)
        return
    }
}

// saveSelected는 현재 선택된 항목들을 파일로 저장한다.
function saveSelected() {
    let data = JSON.stringify({
        "project": currentProject(),
        "group": currentGroup(),
        "shot": currentUnit(),
        "part": currentPart(),
        "task": currentTask(),
        "version": currentVersion(),
    })
    let fname = configDir() + "/selected.json"
    fs.writeFileSync(fname, data)
}

// createProject는 하나의 프로젝트를 생성한다.
function createProject(prj) {
    site.CreateProject(prj)
    reloadProjects()
    selectProject(prj)
}

// createGroup은 하나의 그룹을 생성한다.
function createGroup(prj, grp) {
    site.CurrentCategory().CreateGroup(grp)
    reloadGroups()
    selectGroup(grp)
}

// createUnit은 하나의 샷을 생성한다.
function createUnit(prj, grp, shot) {
    site.CurrentCategory().CreateUnit(prj, grp, shot)
    reloadUnits()
    selectUnit(shot)
}

// createPart는 하나의 샷 태스크를 생성한다.
function createPart(prj, grp, shot, part) {
    site.CurrentCategory().CreatePart(prj, grp, shot, part)
    reloadParts()
    selectPart(part)
    reloadTasks()
}

// createTask는 하나의 샷 요소를 생성한다.
function createTask(prj, grp, shot, part, task, ver, prog) {
    site.CurrentCategory().CreateTask(prj, grp, shot, part, task, ver, prog)
    reloadTasks()
    selectTask(task, "")
}

// addMyPartMenuItems는 사용가능한 태스크들을 내 태스크 메뉴에 추가한다.
function addMyPartMenuItems() {
    let menu = document.getElementById("my-part-menu")
    if (!menu) {
        throw Error("my-part-menu가 없습니다.")
    }
    let opt = document.createElement("option")
    opt.text = "없음"
    opt.value = ""
    menu.add(opt)
    for (let part of site.CurrentCategory().Parts) {
        let opt = document.createElement("option")
        opt.text = part
        menu.add(opt)
    }
}

// selectProjectEv는 사용자가 프로젝트를 선택했을 때 그에 맞는 샷 리스트를 보인다.
function selectProjectEv(prj) {
    try {
        selectProject(prj)
        saveSelected()
    } catch(err) {
        console.log(err)
        notify(err.message)
    }
}

// selectProject는 사용자가 프로젝트를 선택했을 때 그에 맞는 샷 리스트를 보인다.
function selectProject(prj) {
    clearNotify()
    if (prj == currentProject()) {
        return
    }
    clearGroups()
    clearUnits()
    clearParts()
    clearTasks()
    let box = document.getElementById("project-box")
    let item = box.getElementsByClassName("selected")
    if (item.length != 0) {
        item[0].classList.remove("selected")
    }
    let selected = document.getElementById("project-" + prj)
    selected.classList.add("selected")
    reloadUnits()
}

// selectGroupEv는 사용자가 샷을 선택했을 때 그에 맞는 태스크 리스트를 보인다.
// 추가로 내 태스크가 설정되어 있다면 그 태스크를 자동으로 선택해 준다.
function selectGroupEv(shot) {
    try {
        selectGroup(shot)
        saveSelected()
    } catch(err) {
        console.log(err)
        notify(err.message)
    }
}

// selectGroup은 사용자가 샷을 선택했을 때 그에 맞는 태스크 리스트를 보인다.
// 추가로 내 태스크로 설정된 값이 있다면 그 태스크를 자동으로 선택해 준다.
function selectGroup(grp) {
    clearNotify()
    if (grp == currentGroup()) {
        return
    }
    clearUnits()
    clearParts()
    clearTasks()
    let box = document.getElementById("group-box")
    let item = box.getElementsByClassName("selected")
    if (item.length != 0) {
        item[0].classList.remove("selected")
    }
    let selected = document.getElementById("group-" + grp)
    selected.classList.add("selected")
    reloadUnits()
}

// selectUnitEv는 사용자가 샷을 선택했을 때 그에 맞는 태스크 리스트를 보인다.
// 추가로 내 태스크가 설정되어 있다면 그 태스크를 자동으로 선택해 준다.
function selectUnitEv(shot) {
    try {
        selectUnit(shot)
        saveSelected()
    } catch(err) {
        console.log(err)
        notify(err.message)
    }
}

// selectUnit은 사용자가 샷을 선택했을 때 그에 맞는 태스크 리스트를 보인다.
// 추가로 내 태스크로 설정된 값이 있다면 그 태스크를 자동으로 선택해 준다.
function selectUnit(shot) {
    clearNotify()
    if (shot == currentUnit()) {
        return
    }
    clearParts()
    clearTasks()
    let box = document.getElementById("unit-box")
    let item = box.getElementsByClassName("selected")
    if (item.length != 0) {
        item[0].classList.remove("selected")
    }
    let selected = document.getElementById("unit-" + shot)
    selected.classList.add("selected")
    reloadParts()

    let part = myPart()
    if (!part) {
        return
    }
    let prj = currentProject()
    if (!site.CurrentCategory().PartsOf(prj, grp, shot).includes(part)) {
        return
    }
    try {
        selectPart(part)
    } catch(err) {
        console.log(err)
        notify(err.message)
    }
}

// selectPartEv는 태스크를 선택했을 때 그 안의 요소 리스트를 보인다.
function selectPartEv(part) {
    try {
        selectPart(part)
        saveSelected()
    } catch(err) {
        console.log(err)
        notify(err.message)
    }
}

// selectPart는 태스크를 선택했을 때 그 안의 요소 리스트를 보인다.
function selectPart(part) {
    clearNotify()
    if (part == currentPart()) {
        return
    }
    clearTasks()
    let box = document.getElementById("part-box")
    let item = box.getElementsByClassName("selected")
    if (item.length != 0) {
        item[0].classList.remove("selected")
    }
    let selected = document.getElementById("part-" + part)
    selected.classList.add("selected")
    reloadTasks()
}

// selectTaskEv는 요소를 선택했을 때 그 선택을 표시한다.
function selectTaskEv(task, ver) {
    try {
        selectTask(task, ver)
        saveSelected()
    } catch(err) {
        console.log(err)
        notify(err.message)
    }
}

// selectTask는 요소를 선택했을 때 그 선택을 표시한다.
function selectTask(task, ver) {
    clearNotify()
    if (task == currentTask() && ver == currentVersion()) {
        return
    }
    let box = document.getElementById("task-box")
    let item = box.getElementsByClassName("selected")
    if (item.length != 0) {
        item[0].classList.remove("selected")
    }
    let id = "task-" + task
    if (ver) {
        id += "-" + ver
    }
    let selected = document.getElementById(id)
    selected.classList.add("selected")
}

// currentProject는 현재 선택된 프로젝트 이름을 반환한다.
function currentProject() {
    return selectedItemValue("project-box")
}

// currentUnit은 현재 선택된 샷 이름을 반환한다.
function currentUnit() {
    return selectedItemValue("unit-box")
}

// currentPart는 현재 선택된 샷 태스크 이름을 반환한다.
function currentPart() {
    return selectedItemValue("part-box")
}

// currentTask는 현재 선택된 샷 엘리먼트 이름을 반환한다.
function currentTask() {
    let val = selectedItemValue("task-box")
    if (!val) {
        return null
    }
    // val은 "{task}" 또는 "{task}-{version}"이다.
    return val.split("-")[0]
}

// currentVersion은 현재 선택된 샷 버전을 반환한다.
function currentVersion() {
    let val = selectedItemValue("task-box")
    if (!val) {
        return null
    }
    // val은 "{task}" 또는 "{task}-{version}"이다.
    let vals = val.split("-")
    if (vals.length == 1) {
        return ""
    }
    return vals[1]
}

// selectedItemValue는 특정 'item-box' HTML 요소에서 선틱된 값을 반환한다.
function selectedItemValue(boxId) {
    let box = document.getElementById(boxId)
    if (!box) {
        throw Error(boxId + "가 없습니다.")
    }
    let items = box.getElementsByClassName("item")
    if (!items) {
        return null
    }
    for (let item of items) {
        if (item.classList.contains("selected")) {
            return itemValue(item)
        }
    }
    return null
}

// itemValue는 특정 'item' HTML 요소에 저장된 값을 반환한다.
function itemValue(item) {
    return item.dataset.val
}

// reloadProjects는 프로젝트를 다시 부른다.
function reloadProjects() {
    let box = document.getElementById("project-box")
    box.innerText = ""
    let tmpl = document.getElementById("item-tmpl")
    let prjs = site.Projects()
    let pinned = []
    let unpinned = []
    for (let prj of prjs) {
        if (pinnedProject[prj]) {
            pinned.push(prj)
        } else {
            unpinned.push(prj)
        }
    }
    prjs = pinned.concat(unpinned)
    for (let prj of prjs) {
        let frag = document.importNode(tmpl.content, true)
        let div = frag.querySelector("div")
        div.id = "project-" + prj
        div.dataset.val = prj
        div.classList.add("pinnable-item")
        div.getElementsByClassName("item-val")[0].textContent = prj
        if (pinned.includes(prj)) {
            div.getElementsByClassName("item-pin")[0].textContent = "*"
        }
        div.addEventListener("click", function() { selectProjectEv(prj) })
        box.append(div)
    }
}

// reloadGroups는 해당 프로젝트의 그룹을 다시 부른다.
function reloadGroups() {
    let prj = currentProject()
    if (!prj) {
        throw Error("선택된 프로젝트가 없습니다.")
    }
    let box = document.getElementById("group-box")
    box.innerText = ""

    let groups = site.CurrentCategory().GroupsOf(prj)
    let pinned = []
    let unpinned = []
    for (let grp of groups) {
        if (pinnedGroup[prj] && pinnedGroup[prj][grp]) {
            pinned.push(shot)
        } else {
            unpinned.push(shot)
        }
    }
    groups = pinned.concat(unpinned)
    let tmpl = document.getElementById("item-tmpl")
    for (let grp of groups) {
        let frag = document.importNode(tmpl.content, true)
        let div = frag.querySelector("div")
        div.id = "group-" + grp
        div.dataset.val = grp
        div.classList.add("pinnable-item")
        div.getElementsByClassName("item-val")[0].textContent = grp
        if (pinned.includes(grp)) {
            div.getElementsByClassName("item-pin")[0].textContent = "*"
        }
        div.addEventListener("click", function() { selectGroupEv(grp) })
        box.append(div)
    }
}

// reloadUnits는 해당 프로젝트의 샷을 다시 부른다.
function reloadUnits() {
    let prj = currentProject()
    if (!prj) {
        throw Error("선택된 프로젝트가 없습니다.")
    }
    let grp = currentGroup()
    if (!grp) {
        throw Error("선택된 그룹이 없습니다.")
    }
    let box = document.getElementById("unit-box")
    box.innerText = ""

    let shots = site.CurrentCategory().UnitsOf(prj, grp)
    let pinned = []
    let unpinned = []
    for (let shot of shots) {
        if (pinnedShot[prj] && pinnedShot[prj][grp] && pinnedShot[prj][grp][shot]) {
            pinned.push(shot)
        } else {
            unpinned.push(shot)
        }
    }
    shots = pinned.concat(unpinned)
    let tmpl = document.getElementById("item-tmpl")
    for (let shot of shots) {
        let frag = document.importNode(tmpl.content, true)
        let div = frag.querySelector("div")
        div.id = "unit-" + shot
        div.dataset.val = shot
        div.classList.add("pinnable-item")
        div.getElementsByClassName("item-val")[0].textContent = shot
        if (pinned.includes(shot)) {
            div.getElementsByClassName("item-pin")[0].textContent = "*"
        }
        div.addEventListener("click", function() { selectUnitEv(shot) })
        box.append(div)
    }
}

// reloadParts는 해당 샷의 태스크를 다시 부른다.
function reloadParts() {
    let prj = currentProject()
    if (!prj) {
        throw Error("선택된 프로젝트가 없습니다.")
    }
    let grp = currentGroup()
    if (!grp) {
        throw Error("선택된 그룹이 없습니다.")
    }
    let shot = currentUnit()
    if (!shot) {
        throw Error("선택된 샷이 없습니다.")
    }
    let box = document.getElementById("part-box")
    box.innerText = ""
    let tmpl = document.getElementById("item-tmpl")
    for (let part of site.CurrentCategory().PartsOf(prj, grp, shot)) {
        let frag = document.importNode(tmpl.content, true)
        let div = frag.querySelector("div")
        div.id = "part-" + part
        div.dataset.val = part
        div.getElementsByClassName("item-val")[0].textContent = part
        div.addEventListener("click", function() { selectPartEv(part) })
        box.append(div)
    }
}

// reloadTasks는 해당 태스크의 요소를 다시 부른다.
function reloadTasks() {
    let prj = currentProject()
    if (!prj) {
        throw Error("선택된 프로젝트가 없습니다.")
    }
    let grp = currentGroup()
    if (!grp) {
        throw Error("선택된 그룹이 없습니다.")
    }
    let shot = currentUnit()
    if (!shot) {
        throw Error("선택된 샷이 없습니다.")
    }
    let task = currentPart()
    if (!task) {
        throw Error("선택된 태스크가 없습니다.")
    }
    let box = document.getElementById("task-box")
    box.innerText = ""
    let tmpl = document.getElementById("item-tmpl")
    let tasks = site.CurrentCategory().TasksOf(prj, grp, shot, task)
    for (let task in tasks) {
        let t = tasks[task]
        let frag = document.importNode(tmpl.content, true)
        let div = frag.querySelector("div")
        div.id = "task-" + task
        div.dataset.val = task
        div.dataset.dir = t.Program.Dir
        let lastver = t.Versions[t.Versions.length - 1]
        div.getElementsByClassName("item-val")[0].textContent = task
        div.getElementsByClassName("item-pin")[0].textContent = lastver + ", " +  t.Program.Name
        div.addEventListener("click", function() { selectTaskEv(task, "") })
        div.addEventListener("dblclick", function() { openVersionEv(prj, shot, part, task, t.Program.Name, lastver) })
        let toggle = document.createElement("div")
        toggle.classList.add("toggle")
        toggle.textContent = "▷"
        toggle.dataset.hideVersions = "t"
        toggle.addEventListener("click", function(ev) {
            ev.stopPropagation()
            toggleVersionVisibility(task)
        })
        toggle.addEventListener("dblclick", function(ev) {
            ev.stopPropagation()
        })
        div.insertBefore(toggle, div.firstChild)
        box.append(div)
        for (let ver of t.Versions.reverse()) {
            let frag = document.importNode(tmpl.content, true)
            let div = frag.querySelector("div")
            div.classList.add("task-" + task + "-versions")
            div.id = "task-" + task + "-" + ver
            div.dataset.val = task + "-" + ver
            div.dataset.dir = t.Program.Dir
            div.getElementsByClassName("item-val")[0].textContent = ver
            div.addEventListener("click", function() { selectTaskEv(task, ver) })
            div.addEventListener("dblclick", function() { openVersionEv(prj, shot, part, task, t.Program.Name, ver) })
            div.style.display = "none"
            box.append(div)
        }
    }
}

// toggleVersionVisibility는 특정 요소의 버전을 보이거나 숨긴다.
function toggleVersionVisibility(task) {
    let div = document.getElementById("task-" + task)
    let toggle = div.getElementsByClassName("toggle")[0]
    if (toggle.dataset.hideVersions == "t") {
        toggle.dataset.hideVersions = "f"
    } else {
        toggle.dataset.hideVersions = "t"
    }
    if (toggle.dataset.hideVersions == "t") {
        toggle.textContent = "▷"
    } else {
        toggle.textContent = "▽"
    }
    let vers = document.getElementsByClassName("task-" + task + "-versions")
    for (let v of vers) {
        if (toggle.dataset.hideVersions == "t") {
            v.style.display = "none"
        } else {
            v.style.display = "flex"
        }
    }
}

// openVersionEv는 해당 요소의 한 버전을 연다.
function openVersionEv(prj, grp, shot, part, task, prog, ver) {
    let handleError = function(err, stdout, stderr) {
        if (err) {
            if (err.errno == "ENOENT") {
                err = Error(p.name + " 씬을 열기 위한 명령어가 없습니다.")
            }
            console.log(err)
            notify(err.message)
        }
    }
    site.CurrentCategory().OpenTask(prj, grp, shot, part, task, prog, ver, handleError)
}

// clearBox는 'item-box' HTML 요소 안의 내용을 모두 지운다.
function clearBox(id) {
    let box = document.getElementById(id)
    if (!box) {
        throw Error(id + "가 없습니다.")
    }
    box.innerText = ""
}

// clearGroups는 그룹 박스의 내용을 지운다.
function clearGroups() {
    clearBox("group-box")
}

// clearUnits는 샷 박스의 내용을 지운다.
function clearUnits() {
    clearBox("unit-box")
}

// clearParts는 태스크 박스의 내용을 지운다.
function clearParts() {
    clearBox("part-box")
}

// clearTasks는 요소 박스의 내용을 지운다.
function clearTasks() {
    clearBox("task-box")
}

// configDir은 elo의 설정 디렉토리 경로를 반환한다.
function configDir() {
    return user.configDir() + "/elo"
}

// ensureDirExist는 해당 디렉토리가 없을 때 생성한다.
function ensureDirExist(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir)
    }
}

// loadPinnedProject는 사용자가 상단에 고정한 프로젝트를 설정 디렉토리에서 찾아 부른다.
function loadPinnedProject() {
    let fname = configDir() + "/pinned_project.json"
    if (!fs.existsSync(fname)) {
        pinnedProject = {}
        return
    }
    let data = fs.readFileSync(fname)
    pinnedProject = JSON.parse(data)
}

// pinProject는 특정 프로젝트를 상단에 고정한다.
// 변경된 내용은 설정 디렉토리에 저장되어 다시 프로그램을 열 때 반영된다.
function pinProject(prj) {
    pinnedProject[prj] = true
    let fname = configDir() + "/pinned_project.json"
    let data = JSON.stringify(pinnedProject)
    fs.writeFileSync(fname, data)
}

// unpinProject는 특정 프로젝트의 상단 고정을 푼다.
// 변경된 내용은 설정 디렉토리에 저장되어 다시 프로그램을 열 때 반영된다.
function unpinProject(prj) {
    delete pinnedProject[prj]
    let fname = configDir() + "/pinned_project.json"
    let data = JSON.stringify(pinnedProject)
    fs.writeFileSync(fname, data)
}

// loadPinnedShot은 사용자가 상단에 고정한 샷을 설정 디렉토리에서 찾아 부른다.
function loadPinnedShot() {
    let fname = configDir() + "/pinned_shot.json"
    if (!fs.existsSync(fname)) {
        pinnedShot = {}
        return
    }
    let data = fs.readFileSync(fname)
    pinnedShot = JSON.parse(data)
}

// pinShot은 특정 샷을 상단에 고정한다.
// 변경된 내용은 설정 디렉토리에 저장되어 다시 프로그램을 열 때 반영된다.
function pinShot(prj, shot) {
    if (!pinnedShot[prj]) {
        pinnedShot[prj] = {}
    }
    if (!pinnedShot[prj][grp]) {
        pinnedShot[prj][grp] = {}
    }
    pinnedShot[prj][shot] = true
    let fname = configDir() + "/pinned_shot.json"
    let data = JSON.stringify(pinnedShot)
    fs.writeFileSync(fname, data)
}

// unpinShot은 특정 샷의 상단 고정을 푼다.
// 변경된 내용은 설정 디렉토리에 저장되어 다시 프로그램을 열 때 반영된다.
function unpinShot(prj, grp, shot) {
    delete pinnedShot[prj][grp][shot]
    if (Object.keys(pinnedShot[prj][grp]).length == 0) {
        delete pinnedShot[prj][grp]
    }
    if (Object.keys(pinnedShot[prj]).length == 0) {
        delete pinnedShot[prj]
    }
    let fname = configDir() + "/pinned_shot.json"
    let data = JSON.stringify(pinnedShot)
    fs.writeFileSync(fname, data)
}

// openDir은 받은 디렉토리 경로를 연다.
// 만일 해당 디렉토리가 존재하지 않는다면 에러를 낸다.
function openDir(dir) {
    if (!fs.existsSync(dir)) {
        throw Error(d + "디렉토리가 존재하지 않습니다.")
    }
    if (process.platform == "win32") {
        proc.execFile("explorer", [dir.replace(/\//g, "\\")])
        return
    } else {
        // 리눅스 - 배포판에 맞는 파일탐색기 명령을 찾는다.
        let maybeCmds = ["thunar", "nautilus"]
        for (let cmd of maybeCmds) {
            try {
                proc.execFileSync("which", [cmd])
            } catch(err) {
                if (err.errno == "ENOENT") {
                    throw Error("which 명령어가 없습니다.")
                }
                // 해당 명령어 없음
                continue
            }
            let handleError = function(err, stdout, stderr) {
                if (err) {
                    console.log(err)
                    notify(err.message)
                }
            }
            proc.execFile(cmd, [dir], null, handleError)
            return
        }
    }
    throw Error("파일 탐색기를 찾지 못했습니다.")
}

// 초기화 실행
try {
    init()
} catch(err) {
    console.log(err)
    notify(err.message)
}

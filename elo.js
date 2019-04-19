const fs = require("fs")
const proc = require("child_process")
const user = require("./user.js")
const site = require("./site.js")
const { remote } = require("electron")
const { Menu, MenuItem } = remote

let projectRoot = ""
let pinnedProject = {}
let pinnedShot = {}

function init() {
    projectRoot = site.projectRoot()
    if (!projectRoot) {
        throw Error("Elo를 사용하시기 전, 우선 PROJECT_ROOT 환경변수를 설정해 주세요.")
    }
    ensureDirExist(projectRoot)
    ensureDirExist(configDir())
    loadPinnedProject()
    loadPinnedShot()

    ensureElementExist("project-box")
    ensureElementExist("shot-box")
    ensureElementExist("task-box")
    ensureElementExist("element-box")

    addTaskMenuItems()
    reloadProjects()

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
            projectMenu.popup(remote.getCurrentWindow())
            return
        }
        if (parentById(ev, "shot-box")) {
            let prj = currentProject()
            let shot = parentByClassName(ev, "item").id.split("-")[1]
            let shotMenu = new Menu()
            let pinShotMenuItem = new MenuItem({
                label: "상단에 고정",
                click: function() {
                    try {
                        pinShot(prj, shot)
                        reloadShots(prj)
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
                        unpinShot(prj, shot)
                        reloadShots(prj)
                    } catch(err) {
                        console.log(err)
                        notify(err.message)
                    }
                },
            })
            if (pinnedShot[prj] && pinnedShot[prj][shot]) {
                shotMenu.append(unpinShotMenuItem)
            } else {
                shotMenu.append(pinShotMenuItem)
            }
            shotMenu.popup(remote.getCurrentWindow())
            return
        }
    })
}

function ensureElementExist(id) {
    let el = document.getElementById(id)
    if (!el) {
        throw Error(id + "가 존재하지 않습니다.")
    }
}

exports.openModalEv = function(kind) {
    if (kind == "shot" && !currentProject()) {
        notify("아직 프로젝트를 선택하지 않았습니다.")
        return
    }
    if (kind == "task" && !currentShot()) {
        notify("아직 샷을 선택하지 않았습니다.")
        return
    }
    if (kind == "element" && !currentTask()) {
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

function openModal(kind) {
    let m = document.getElementById("modal")
    m.style.display = "block"
    let input = document.getElementById("modal-input")
    input.value = ""
    let progInput = document.getElementById("modal-prog-input")
    progInput.hidden = true
    if (kind == "element") {
        progInput.hidden = false
        progInput.innerText = ""
        let progs = Array()
        try {
            progs = site.taskPrograms(currentProject(), currentShot(), currentTask())
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
        "shot": "샷",
        "task": "태스크",
        "element": "요소",
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
        } else if (kind == "shot") {
            createShot(currentProject(), name)
        } else if (kind == "task") {
            createTask(currentProject(), currentShot(), name)
        } else if (kind == "element") {
            let prog = document.getElementById("modal-prog-input").value
            createElement(currentProject(), currentShot(), currentTask(), name, prog)
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

exports.closeModalEv = function() {
    try {
        closeModal()
    } catch(err) {
        console.log(err)
        notify(err.message)
    }
}

function closeModal() {
    let m = document.getElementById("modal")
    m.style.display = "none"
}

function notify(text) {
    let notifier = document.getElementById("notifier")
    notifier.innerText = text
}

function clearNotify() {
    let notifier = document.getElementById("notifier")
    notifier.innerText = ""
}

function createProject(prj) {
    site.createProject(prj)
    reloadProjects()
    selectProject(prj)
}

function createShot(prj, shot) {
    site.createShot(prj, shot)
    reloadShots(currentProject())
    selectShot(prj, shot)
}

function createTask(prj, shot, task) {
    site.createTask(prj, shot, task)
    reloadTasks(currentProject(), currentShot())
    selectTask(prj, shot, task)
}

function createElement(prj, shot, task, elem, prog) {
    site.createElement(prj, shot, task, elem, prog)
    reloadElements(currentProject(), currentShot(), currentTask())
    selectElement(prj, shot, task, elem, "")
}

function addTaskMenuItems() {
    let menu = document.getElementById("task-menu")
    if (!menu) {
        throw Error("task-menu가 없습니다.")
    }
    for (let t of site.tasks) {
        let opt = document.createElement("option")
        opt.text = t
        menu.add(opt)
    }
}

function selectProjectEv(prj) {
    try {
        selectProject(prj)
    } catch(err) {
        console.log(err)
        notify(err.message)
    }
}

function selectProject(prj) {
    clearNotify()
    clearShots()
    clearTasks()
    clearElements()
    let box = document.getElementById("project-box")
    let item = box.getElementsByClassName("selected")
    if (item.length != 0) {
        item[0].classList.remove("selected")
    }
    let selected = document.getElementById("project-" + prj)
    selected.classList.add("selected")
    reloadShots(prj)
}

function selectShotEv(prj, shot) {
    try {
        selectShot(prj, shot)
    } catch(err) {
        console.log(err)
        notify(err.message)
    }
}

function selectShot(prj, shot) {
    clearNotify()
    clearTasks()
    clearElements()
    let box = document.getElementById("shot-box")
    let item = box.getElementsByClassName("selected")
    if (item.length != 0) {
        item[0].classList.remove("selected")
    }
    let selected = document.getElementById("shot-" + shot)
    selected.classList.add("selected")
    reloadTasks(prj, shot)
}

function selectTaskEv(prj, shot, task) {
    try {
        selectTask(prj, shot, task)
    } catch(err) {
        console.log(err)
        notify(err.message)
    }
}

function selectTask(prj, shot, task) {
    clearNotify()
    clearElements()
    let box = document.getElementById("task-box")
    let item = box.getElementsByClassName("selected")
    if (item.length != 0) {
        item[0].classList.remove("selected")
    }
    let selected = document.getElementById("task-" + task)
    selected.classList.add("selected")
    reloadElements(prj, shot, task)
}

function selectElementEv(prj, shot, task, elem, ver) {
    try {
        selectElement(prj, shot, task, elem, ver)
    } catch(err) {
        console.log(err)
        notify(err.message)
    }
}

function selectElement(prj, shot, task, elem, ver) {
    clearNotify()
    let box = document.getElementById("element-box")
    let item = box.getElementsByClassName("selected")
    if (item.length != 0) {
        item[0].classList.remove("selected")
    }
    let id = "element-" + elem
    if (ver) {
        id += "-" + ver
    }
    let selected = document.getElementById(id)
    selected.classList.add("selected")
}

function currentProject() {
    return selectedItemValue("project-box")
}

function currentShot() {
    return selectedItemValue("shot-box")
}

function currentTask() {
    return selectedItemValue("task-box")
}

function currentElement() {
    return selectedItemValue("element-box")
}

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

function itemValue(item) {
    let el = item.getElementsByClassName("item-val")
    if (!el) {
        throw Error("item-val이 없습니다.")
    }
    return el[0].textContent
}

function reloadProjects() {
    let box = document.getElementById("project-box")
    box.innerText = ""
    let tmpl = document.getElementById("item-tmpl")
    let prjs = site.projects()
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
        div.classList.add("pinnable-item")
        div.getElementsByClassName("item-val")[0].textContent = prj
        if (pinned.includes(prj)) {
            div.getElementsByClassName("item-pin")[0].textContent = "*"
        }
        div.addEventListener("click", function() { selectProjectEv(prj) })
        box.append(div)
    }
}

function reloadShots(prj) {
    if (!prj) {
        throw Error("선택된 프로젝트가 없습니다.")
    }
    let box = document.getElementById("shot-box")
    box.innerText = ""

    let shots = site.shotsOf(prj)
    let pinned = []
    let unpinned = []
    for (let shot of shots) {
        if (pinnedShot[prj] && pinnedShot[prj][shot]) {
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
        div.id = "shot-" + shot
        div.classList.add("pinnable-item")
        div.getElementsByClassName("item-val")[0].textContent = shot
        if (pinned.includes(shot)) {
            div.getElementsByClassName("item-pin")[0].textContent = "*"
        }
        div.addEventListener("click", function() { selectShotEv(prj, shot) })
        box.append(div)
    }
}

function reloadTasks(prj, shot) {
    if (!prj) {
        throw Error("선택된 프로젝트가 없습니다.")
    }
    if (!shot) {
        throw Error("선택된 샷이 없습니다.")
    }
    let box = document.getElementById("task-box")
    box.innerText = ""
    let tmpl = document.getElementById("item-tmpl")
    for (let t of site.tasksOf(prj, shot)) {
        let frag = document.importNode(tmpl.content, true)
        let div = frag.querySelector("div")
        div.id = "task-" + t
        div.getElementsByClassName("item-val")[0].textContent = t
        div.addEventListener("click", function() { selectTaskEv(prj, shot, t) })
        box.append(div)
    }
}

function reloadElements(prj, shot, task) {
    if (!prj) {
        throw Error("선택된 프로젝트가 없습니다.")
    }
    if (!shot) {
        throw Error("선택된 샷이 없습니다.")
    }
    if (!task) {
        throw Error("선택된 태스크가 없습니다.")
    }
    let box = document.getElementById("element-box")
    box.innerText = ""
    let tmpl = document.getElementById("item-tmpl")
    let elems = site.elementsOf(prj, shot, task)
    for (let elem in elems) {
        e = elems[elem]
        let frag = document.importNode(tmpl.content, true)
        let div = frag.querySelector("div")
        div.id = "element-" + elem
        let lastver = e.versions[e.versions.length - 1]
        div.getElementsByClassName("item-val")[0].textContent = elem
        div.getElementsByClassName("item-pin")[0].textContent = lastver + "@" +  e.program
        div.addEventListener("click", function() { selectElementEv(prj, shot, task, elem, "") })
        div.addEventListener("dblclick", function() { openVersionEv(prj, shot, task, elem, e.program, lastver) })
        let toggleVersion = document.createElement("div")
        toggleVersion.textContent = "▷"
        toggleVersion.style.width = "1.5em"
        let hideVersion = true
        toggleVersion.addEventListener("click", function(ev) {
            ev.stopPropagation()
            hideVersion = !hideVersion
            if (hideVersion) {
                toggleVersion.textContent = "▷"
            } else {
                toggleVersion.textContent = "▽"
            }
            let vers = document.getElementsByClassName("element-" + elem + "-versions")
            for (let v of vers) {
                if (hideVersion) {
                    v.style.display = "none"
                } else {
                    v.style.display = "flex"
                }
            }
        })
        toggleVersion.addEventListener("dblclick", function(ev) {
            ev.stopPropagation()
        })
        div.insertBefore(toggleVersion, div.firstChild)
        box.append(div)
        for (let ver of e.versions.reverse()) {
            let frag = document.importNode(tmpl.content, true)
            let div = frag.querySelector("div")
            div.classList.add("element-" + elem + "-versions")
            div.id = "element-" + elem + "-" + ver
            div.getElementsByClassName("item-val")[0].textContent = ver
            div.addEventListener("click", function() { selectElementEv(prj, shot, task, elem, ver) })
            div.addEventListener("dblclick", function() { openVersionEv(prj, shot, task, elem, e.program, ver) })
            div.style.display = "none"
            box.append(div)
        }
    }
}

function openVersionEv(prj, shot, task, elem, prog, ver) {
    try {
        p = site.program(prj, shot, task, prog)
        p.openVersion(prj, shot, task, elem, ver)
    } catch(err) {
        console.log(err)
        notify(err.message)
    }
}

function clearBox(id) {
    let box = document.getElementById(id)
    if (!box) {
        throw Error(id + "가 없습니다.")
    }
    box.innerText = ""
}

function clearShots() {
    clearBox("shot-box")
}

function clearTasks() {
    clearBox("task-box")
}

function clearElements() {
    clearBox("element-box")
}

function configDir() {
    return user.configDir() + "/elo"
}

function ensureDirExist(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir)
    }
}

function loadPinnedProject() {
    let fname = configDir() + "/pinned_project.json"
    if (!fs.existsSync(fname)) {
        pinnedProject = {}
        return
    }
    let data = fs.readFileSync(fname)
    pinnedProject = JSON.parse(data)
}

function pinProject(prj) {
    pinnedProject[prj] = true
    let fname = configDir() + "/pinned_project.json"
    let data = JSON.stringify(pinnedProject)
    fs.writeFileSync(fname, data)
}

function unpinProject(prj) {
    delete pinnedProject[prj]
    let fname = configDir() + "/pinned_project.json"
    let data = JSON.stringify(pinnedProject)
    fs.writeFileSync(fname, data)
}

function loadPinnedShot() {
    let fname = configDir() + "/pinned_shot.json"
    if (!fs.existsSync(fname)) {
        pinnedShot = {}
        return
    }
    let data = fs.readFileSync(fname)
    pinnedShot = JSON.parse(data)
}

function pinShot(prj, shot) {
    if (!pinnedShot[prj]) {
        pinnedShot[prj] = {}
    }
    pinnedShot[prj][shot] = true
    let fname = configDir() + "/pinned_shot.json"
    let data = JSON.stringify(pinnedShot)
    fs.writeFileSync(fname, data)
}

function unpinShot(prj, shot) {
    delete pinnedShot[prj][shot]
    if (Object.keys(pinnedShot[prj]).length == 0) {
        delete pinnedShot[prj]
    }
    let fname = configDir() + "/pinned_shot.json"
    let data = JSON.stringify(pinnedShot)
    fs.writeFileSync(fname, data)
}

try {
    init()
} catch(err) {
    console.log(err)
    notify(err.message)
}

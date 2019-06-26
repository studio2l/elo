import * as fs from "fs"
import * as proc from "child_process"
import * as user from "./user.js"
import * as site from "./site.js"
import * as seltree from "./seltree.js"
import { remote } from "electron"
const { Menu, MenuItem } = remote

let showRoot = ""
let pinnedShow = {}
let pinnedGroup = {}
let pinnedUnit = {}

let selection = seltree.New()

// init은 elo를 초기화 한다.
// 실행은 모든 함수가 정의되고 난 마지막에 하게 된다.
function init() {
    site.Init()

    ensureDirExist(configDir())
    loadPinnedShow()
    loadPinnedGroup()
    loadPinnedUnit()

    ensureElementExist("show-box")
    ensureElementExist("unit-box")
    ensureElementExist("part-box")
    ensureElementExist("task-box")
    ensureElementExist("category-menu")

    addCategoryMenuItems()
    loadCategory()

    reloadShows()
    loadSelection()

    uiEvent(function() {
        // 원래 있던 항목들이 사라지는 경우 아래 함수는 에러가 난다.
        // 이런 경우에 elo가 멈춰서는 안된다.
        restoreShowSelection()
    })()
}

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
    if (parentById(ev, "show-box")) {
        let show = parentByClassName(ev, "item").id.split("-")[1]
        let showMenu = new Menu()
        let pinShowMenuItem = new MenuItem({
            label: "상단에 고정",
            click: uiEvent(function() {
                let cur = currentShow()
                pinShow(show)
                reloadShows()
                selectShow(cur)
                restoreGroupSelection(cur)
            }),
        })
        let unpinShowMenuItem = new MenuItem({
            label: "상단에서 제거",
            click: uiEvent(function() {
                let cur = currentShow()
                unpinShow(show)
                reloadShows()
                selectShow(cur)
                restoreGroupSelection(cur)
            }),
        })
        if (isPinnedShow(show)) {
            showMenu.append(unpinShowMenuItem)
        } else {
            showMenu.append(pinShowMenuItem)
        }
        let openShowDir = new MenuItem({
            label: "디렉토리 열기",
            click: uiEvent(function() {
                openDir(site.Show(show).Dir)
            }),
        })
        showMenu.append(openShowDir)
        showMenu.popup()
        return
    }
    if (parentById(ev, "group-box")) {
        let show = currentShow()
        let ctg = currentCategory()
        let grp = parentByClassName(ev, "item").id.split("-")[1]
        let groupMenu = new Menu()
        let pinGroupMenuItem = new MenuItem({
            label: "상단에 고정",
            click: uiEvent(function() {
                pinGroup(show, ctg, grp)
                reloadGroups()
                restoreGroupSelection(show)
            }),
        })
        let unpinGroupMenuItem = new MenuItem({
            label: "상단에서 제거",
            click: uiEvent(function() {
                unpinGroup(show, ctg, grp)
                reloadGroups()
                restoreGroupSelection(show)
            }),
        })
        if (isPinnedGroup(show, ctg, grp)) {
            groupMenu.append(unpinGroupMenuItem)
        } else {
            groupMenu.append(pinGroupMenuItem)
        }
        let openGroupDir = new MenuItem({
            label: "디렉토리 열기",
            click: uiEvent(function() {
                openDir(site.Show(show).Category(ctg).Group(grp).Dir)
            }),
        })
        groupMenu.append(openGroupDir)
        groupMenu.popup()
        return
    }
    if (parentById(ev, "unit-box")) {
        let show = currentShow()
        let ctg = currentCategory()
        let grp = currentGroup()
        let unit = parentByClassName(ev, "item").id.split("-")[1]
        let unitMenu = new Menu()
        let pinUnitMenuItem = new MenuItem({
            label: "상단에 고정",
            click: uiEvent(function() {
                pinUnit(show, ctg, grp, unit)
                reloadUnits()
                restoreUnitSelection(show, ctg, grp)
            }),
        })
        let unpinUnitMenuItem = new MenuItem({
            label: "상단에서 제거",
            click: uiEvent(function() {
                unpinUnit(show, ctg, grp, unit)
                reloadUnits()
                restoreUnitSelection(show, ctg, grp)
            }),
        })
        if (isPinnedUnit(show, ctg, grp, unit)) {
            unitMenu.append(unpinUnitMenuItem)
        } else {
            unitMenu.append(pinUnitMenuItem)
        }
        let openUnitDir = new MenuItem({
            label: "디렉토리 열기",
            click: uiEvent(function() {
                openDir(site.Show(show).Category(ctg).Group(grp).Unit(unit).Dir)
            }),
        })
        unitMenu.append(openUnitDir)
        unitMenu.popup()
        return
    }
    if (parentById(ev, "part-box")) {
        let show = currentShow()
        let ctg = currentCategory()
        let grp = currentGroup()
        let unit = currentUnit()
        let part = parentByClassName(ev, "item").id.split("-")[1]
        let partMenu = new Menu()
        let openPartDir = new MenuItem({
            label: "디렉토리 열기",
            click: uiEvent(function() {
                openDir(site.Show(show).Category(ctg).Group(grp).Unit(unit).Part(part).Dir)
            }),
        })
        partMenu.append(openPartDir)
        partMenu.popup()
        return
    }
    if (parentById(ev, "task-box")) {
        let show = currentShow()
        let grp = currentGroup()
        let unit = currentUnit()
        let task = currentPart()
        let div = parentByClassName(ev, "item")
        let dir = div.dataset.dir
        let taskMenu = new Menu()
        let openTaskDir = new MenuItem({
            label: "디렉토리 열기",
            click: uiEvent(function() {
                openDir(dir)
            }),
        })
        taskMenu.append(openTaskDir)
        taskMenu.popup()
        return
    }
})

// uiEvent 함수는 받아들인 함수를 이벤트 함수로 만들어 반환한다.
// 즉, 실행한 결과에 문제가 있었을 때 상태줄에 표시하고 로그로 기록하게 한다.
function uiEvent(f: () => void): () => void {
    return function(): void {
        try {
            f()
        } catch(err) {
            console.log(err)
            notify(err.message)
        }
    }
}

// ensureElementExist는 해당 HTML 엘리먼트가 존재하는지 검사한다.
// 존재하지 않는다면 에러를 낸다.
function ensureElementExist(id) {
    let el = document.getElementById(id)
    if (!el) {
        throw Error(id + "가 존재하지 않습니다.")
    }
}

export function openLogEv() {
    uiEvent(function() {
        openLog()
    })()
}

function openLog() {
    let m = document.getElementById("log")
    m.style.display = "flex"
}

export function closeLogEv() {
    uiEvent(function() {
        closeLog()
    })()
}

function closeLog() {
    let m = document.getElementById("log")
    m.style.display = "none"
}

// openModalEv는 사용자가 항목 추가 버튼을 눌렀을 때 그에 맞는 모달 창을 연다.
export function openModalEv(kind: string) {
    if (kind == "group" && !currentShow()) {
        notify("아직 쇼를 선택하지 않았습니다.")
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

    uiEvent(function() {
        openModal(kind)
    })()
}

// openModal은 생성할 항목의 종류에 맞는 모달 창을 연다.
function openModal(kind) {
    let m = document.getElementById("modal")
    m.style.display = "block"
    let input = <HTMLInputElement>document.getElementById("modal-input")
    input.hidden = false
    input.value = ""
    let menuInput = <HTMLSelectElement>document.getElementById("modal-menu-input")
    menuInput.hidden = true
    menuInput.style.minWidth = "5rem"
    let ctg = currentCategory()
    if (kind == "part") {
        input.hidden = true
        menuInput.hidden = false
        menuInput.innerText = ""
        menuInput.style.minWidth = "10rem"
        let parts = site.ValidParts(currentCategory())
        for (let p of parts) {
            let opt = document.createElement("option")
            opt.text = p
            menuInput.add(opt)
        }
    } else if (kind == "task") {
        menuInput.hidden = false
        menuInput.innerText = ""
        let progs = Array()
        try {
            progs = site.ValidPrograms(currentCategory(), currentPart())
        } catch(err) {
            m.style.display = "none"
            throw err
        }
        for (let p of progs) {
            let opt = document.createElement("option")
            opt.text = p
            menuInput.add(opt)
        }
    }
    let ctgLabel = site.CategoryLabel(ctg)
    let kor = {
        "show": "쇼",
        "group": "그룹",
        "unit": ctgLabel,
        "part": ctgLabel + " 파트",
        "task": ctgLabel + " 태스크",
    }
    input.placeholder = "생성 할 " + kor[kind] + " 이름"
    function createItem() {
        closeModal()
        let input = <HTMLInputElement>document.getElementById("modal-input")
        let name = input.value
        if (!name) {
            // 파트의 경우는 menuInput의 값을 사용하기 때문에 괜찮음
            if (kind != "part") {
                notify("생성할 항목의 이름을 설정하지 않았습니다.")
                return
            }
        }
        if (kind == "show") {
            createShow(name)
        } else if (kind == "group") {
            createGroup(currentShow(), ctg, name)
        } else if (kind == "unit") {
            createUnit(currentShow(), ctg, currentGroup(), name)
        } else if (kind == "part") {
            let menuInput = <HTMLInputElement>document.getElementById("modal-menu-input")
            name = menuInput.value
            createPart(currentShow(), ctg, currentGroup(), currentUnit(), name)
        } else if (kind == "task") {
            let menuInput = <HTMLInputElement>document.getElementById("modal-menu-input")
            let prog = menuInput.value
            createTask(currentShow(), ctg, currentGroup(), currentUnit(), currentPart(), prog, name, "v001")
        }
    }
    let applyEv = uiEvent(function() {
        createItem()
        saveSelection()
    })
    input.onkeydown = function(ev) { if (ev.key == "Enter") { applyEv() } }
    menuInput.onkeydown = function(ev) { if (ev.key == "Enter") { applyEv() } }
    if (kind == "part") {
        menuInput.focus()
    } else {
        input.focus()
    }
    let apply = document.getElementById("modal-apply")
    apply.onclick = applyEv
}

// closeModalEv는 모달 사용중 사용자가 닫음 버튼을 눌렀을 때 모달을 닫는다.
export function closeModalEv() {
    uiEvent(function() {
        closeModal()
    })()
}

// closeModal은 모달을 보이지 않도록 한다.
function closeModal() {
    let m = document.getElementById("modal")
    m.style.display = "none"
}

// notify는 아래쪽 표시줄에 text를 표시한다.
function notify(text: string) {
    let logContent = document.getElementById("log-content")
    let pre = document.createElement("pre")
    pre.style.color = "black"
    pre.innerText = text
    logContent.appendChild(pre)
    // notifier는 한줄의 메세지만 보일 수 있다.
    // 마지막 줄을 보이기로 한다.
    let lines = text.trim().split("\n")
    let line = lines[lines.length - 1]
    let notifier = document.getElementById("notifier")
    notifier.innerText = line
}

// clearNotify는 아래쪽 표시줄에 기존에 표시된 내용을 지운다.
function clearNotify() {
    let notifier = document.getElementById("notifier")
    notifier.innerText = ""
}

// loadCategory는 설정 디렉토리에 저장된 내 파트 값을 불러온다.
function loadCategory() {
    let menu = <HTMLSelectElement>document.getElementById("category-menu")
    let fname = configDir() + "/category.json"
    if (!fs.existsSync(fname)) {
        let ctg = site.ValidCategories()[0]
        menu.value = ctg
        document.getElementById("unit-label").innerText = site.CategoryLabel(ctg)
        return
    }
    let data = fs.readFileSync(fname)
    let ctg = data.toString("utf8")
    menu.value = ctg
    document.getElementById("unit-label").innerText = site.CategoryLabel(ctg)
}

// saveCategory는 내 파트로 설정된 값을 설정 디렉토리에 저장한다.
export function saveCategory() {
    let menu = <HTMLSelectElement>document.getElementById("category-menu")
    let ctg = menu.value
    document.getElementById("unit-label").innerText = site.CategoryLabel(ctg)
    let fname = configDir() + "/category.json"
    fs.writeFileSync(fname, ctg)
    selectShowEv(currentShow())
}

// loadSelection는 파일에서 마지막으로 선택했던 항목들을 다시 불러온다.
function loadSelection() {
    let fname = configDir() + "/selection.json"
    if (!fs.existsSync(fname)) {
        return
    }
    let data = fs.readFileSync(fname)
    selection = seltree.FromJSON(selection, JSON.parse(data.toString("utf8")))
}

// saveSelection는 현재 선택된 항목들을 파일로 저장한다.
function saveSelection() {
    selectionChanged()
    let data = JSON.stringify(selection, null, 2)
    let fname = configDir() + "/selection.json"
    fs.writeFileSync(fname, data)
}

function selectionChanged() {
    let show = currentShow()
    if (!show) {
        return
    }
    let showSel = selection.Select(show)
    let ctg = currentCategory()
    if (!ctg) {
        return
    }
    let ctgSel = showSel.Select(ctg)
    let grp = currentGroup()
    if (!grp) {
        return
    }
    let grpSel = ctgSel.Select(grp)
    let unit = currentUnit()
    if (!unit) {
        return
    }
    let unitSel = grpSel.Select(unit)
    let part = currentPart()
    if (!part) {
        return
    }
    let partSel = unitSel.Select(part)
    let task = currentTask()
    if (!task) {
        return
    }
    let taskSel = partSel.Select(task)
    let ver = currentVersion()
    // 버전은 빈 문자열일 수도 있다.
    taskSel.Select(ver)
}

// createShow는 하나의 쇼를 생성한다.
function createShow(show) {
    site.CreateShow(show)
    reloadShows()
    selectShow(show)
}

// createGroup은 하나의 그룹을 생성한다.
function createGroup(show, ctg, grp) {
    site.Show(show).Category(ctg).CreateGroup(grp)
    reloadGroups()
    selectGroup(grp)
}

// createUnit은 하나의 샷을 생성한다.
function createUnit(show, ctg, grp, unit) {
    site.Show(show).Category(ctg).Group(grp).CreateUnit(unit)
    reloadUnits()
    selectUnit(unit)
}

// createPart는 하나의 샷 태스크를 생성한다.
function createPart(show, ctg, grp, unit, part) {
    site.Show(show).Category(ctg).Group(grp).Unit(unit).CreatePart(part)
    reloadParts()
    selectPart(part)
}

// createTask는 하나의 샷 요소를 생성한다.
function createTask(show, ctg, grp, unit, part, prog, task, ver) {
    site.Show(show).Category(ctg).Group(grp).Unit(unit).Part(part).CreateTask(prog, task, ver)
    reloadTasks()
    selectTask(task, "")
}

// addCategoryMenuItems는 사용가능한 카테고리들을 내 태스크 메뉴에 추가한다.
function addCategoryMenuItems() {
    let menu = <HTMLSelectElement>document.getElementById("category-menu")
    if (!menu) {
        throw Error("category-menu가 없습니다.")
    }
    for (let ctg of site.ValidCategories()) {
        let opt = document.createElement("option")
        opt.text = ctg
        menu.add(opt)
    }
}

// selectShowEv는 사용자가 쇼를 선택했을 때 그에 맞는 샷 리스트를 보인다.
function selectShowEv(show) {
    uiEvent(function() {
        selectShow(show)
        restoreGroupSelection(show)
        saveSelection()
    })()
}

// selectShow는 사용자가 쇼를 선택했을 때 그에 맞는 샷 리스트를 보인다.
function selectShow(show) {
    clearNotify()
    clearGroups()
    clearUnits()
    clearParts()
    clearTasks()
    let box = document.getElementById("show-box")
    let item = box.getElementsByClassName("selected")
    if (item.length != 0) {
        item[0].classList.remove("selected")
    }
    let selected = document.getElementById("show-" + show)
    selected.classList.add("selected")
    reloadGroups()
}

// restoreShowSelection은 마지막으로 선택되었던 쇼로 선택을 되돌린다.
// 기억된 하위 요소들도 함께 되돌린다.
function restoreShowSelection() {
    let show = selection.Selected()
    if (!show) {
        return
    }
    selectShow(show)
    restoreGroupSelection(show)
}

// restoreGroupSelection은 해당 쇼에서 마지막으로 선택되었던 그룹으로 선택을 되돌린다.
// 기억된 하위 요소들도 함께 되돌린다.
function restoreGroupSelection(show) {
    let ctg = currentCategory()
    let ctgSel = selection.Select(show).Select(ctg)
    let grp = ctgSel.Selected()
    if (!grp) {
        return
    }
    selectGroup(grp)
    restoreUnitSelection(show, ctg, grp)
}

// restoreUnitSelection은 해당 그룹에서 마지막으로 선택되었던 유닛으로 선택을 되돌린다.
// 기억된 하위 요소들도 함께 되돌린다.
function restoreUnitSelection(show, ctg, grp) {
    let grpSel = selection.Select(show).Select(ctg).Select(grp)
    let unit = grpSel.Selected()
    if (!unit) {
        return
    }
    selectUnit(unit)
    restorePartSelection(show, ctg, grp, unit)
}

// restorePartSelection은 해당 유닛에서 마지막으로 선택되었던 파트로 선택을 되돌린다.
// 기억된 하위 요소들도 함께 되돌린다.
function restorePartSelection(show, ctg, grp, unit) {
    let unitSel = selection.Select(show).Select(ctg).Select(grp).Select(unit)
    let part = unitSel.Selected()
    if (!part) {
        return
    }
    selectPart(part)
    restoreTaskSelection(show, ctg, grp, unit, part)
}

// restoreTaskSelection은 해당 파트에서 마지막으로 선택되었던 (버전 포함) 태스크로 선택을 되돌린다.
function restoreTaskSelection(show, ctg, grp, unit, part) {
    let partSel = selection.Select(show).Select(ctg).Select(grp).Select(unit).Select(part)
    let task = partSel.Selected()
    if (!task) {
        return
    }
    let taskSel = partSel.Select(task)
    let ver = taskSel.Selected()
    // 버전은 빈 문자열일 수도 있다.
    if (ver) {
        toggleVersionVisibility(task)
    }
    selectTask(task, ver)
}

// selectGroupEv는 사용자가 그룹을 선택했을 때 그에 맞는 유닛 리스트를 보인다.
function selectGroupEv(grp) {
    uiEvent(function() {
        selectGroup(grp)
        saveSelection()
        restoreUnitSelection(currentShow(), currentCategory(), grp)
    })()
}

// selectGroup은 사용자가 그룹을 선택했을 때 그에 맞는 유닛 리스트를 보인다.
function selectGroup(grp) {
    clearNotify()
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
function selectUnitEv(unit) {
    uiEvent(function() {
        selectUnit(unit)
        saveSelection()
        restorePartSelection(currentShow(), currentCategory(), currentGroup(), unit)
    })()
}

// selectUnit은 사용자가 샷을 선택했을 때 그에 맞는 태스크 리스트를 보인다.
// 추가로 내 태스크로 설정된 값이 있다면 그 태스크를 자동으로 선택해 준다.
function selectUnit(unit) {
    clearNotify()
    clearParts()
    clearTasks()
    let box = document.getElementById("unit-box")
    let item = box.getElementsByClassName("selected")
    if (item.length != 0) {
        item[0].classList.remove("selected")
    }
    let selected = document.getElementById("unit-" + unit)
    selected.classList.add("selected")
    reloadParts()
}

// selectPartEv는 태스크를 선택했을 때 그 안의 요소 리스트를 보인다.
function selectPartEv(part) {
    uiEvent(function() {
        selectPart(part)
        saveSelection()
        restoreTaskSelection(currentShow(), currentCategory(), currentGroup(), currentUnit(), part)
    })()
}

// selectPart는 태스크를 선택했을 때 그 안의 요소 리스트를 보인다.
function selectPart(part) {
    clearNotify()
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
    uiEvent(function() {
        selectTask(task, ver)
        saveSelection()
    })()
}

// selectTask는 요소를 선택했을 때 그 선택을 표시한다.
function selectTask(task, ver) {
    clearNotify()
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

// currentShow는 현재 선택된 쇼 이름을 반환한다.
function currentShow(): string {
    return selectedItemValue("show-box")
}

// currentCategory는 현재 선택된 카테고리 이름을 반환한다.
function currentCategory(): string {
    let menu = <HTMLSelectElement>document.getElementById("category-menu")
    return menu.value
}

// currentGroup은 현재 선택된 그룹 이름을 반환한다.
function currentGroup(): string {
    return selectedItemValue("group-box")
}

// currentUnit은 현재 선택된 샷 이름을 반환한다.
function currentUnit(): string {
    return selectedItemValue("unit-box")
}

// currentPart는 현재 선택된 샷 태스크 이름을 반환한다.
function currentPart(): string {
    return selectedItemValue("part-box")
}

// currentTask는 현재 선택된 샷 엘리먼트 이름을 반환한다.
function currentTask(): string {
    let val = selectedItemValue("task-box")
    if (!val) {
        return null
    }
    // val은 "{task}" 또는 "{task}-{version}"이다.
    return val.split("-")[0]
}

// currentVersion은 현재 선택된 샷 버전을 반환한다.
function currentVersion(): string {
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
function selectedItemValue(boxId): string {
    let box = document.getElementById(boxId)
    if (!box) {
        throw Error(boxId + "가 없습니다.")
    }
    let items = Array.from(box.getElementsByClassName("item"))
    if (!items) {
        return null
    }
    for (let i in items) {
        let item = <HTMLElement>items[i]
        if (item.classList.contains("selected")) {
            return item.dataset.val
        }
    }
    return null
}

// newBoxItem은 box 클래스 안에서 사용될 item HTML 요소를 생성한다.
// 받아들이는 두 인수는 각각 왼쪽(메인)과 오른쪽(서브)에 적힐 내용이다.
function newBoxItem(val): HTMLElement {
    let tmpl = <HTMLTemplateElement>document.getElementById("item-tmpl")
    let frag = document.importNode(tmpl.content, true)
    let item = frag.querySelector("div")
    item.getElementsByClassName("item-val")[0].textContent = val
    return item
}

// reloadShows는 쇼를 다시 부른다.
function reloadShows() {
    let box = document.getElementById("show-box")
    box.innerText = ""
    let shows = names(site.Shows())
    let byPin = function(a, b) {
        if (isPinnedShow(a)) { return -1 }
        if (isPinnedShow(b)) { return 1 }
        return 0
    }
    shows.sort(byPin)
    for (let show of shows) {
        let div = newBoxItem(show)
        if (isPinnedShow(show)) {
            div.classList.add("pin")
        }
        div.id = "show-" + show
        div.dataset.val = show
        div.onclick = function() { selectShowEv(show) }
        box.append(div)
    }
}

// reloadGroups는 해당 쇼의 그룹을 다시 부른다.
function reloadGroups() {
    let show = currentShow()
    if (!show) {
        throw Error("선택된 쇼가 없습니다.")
    }
    let ctg = currentCategory()
    let box = document.getElementById("group-box")
    box.innerText = ""
    let groups = names(site.Show(show).Category(ctg).Groups())
    let byPin = function(a, b) {
        if (isPinnedGroup(show, ctg, a)) { return -1 }
        if (isPinnedGroup(show, ctg, b)) { return 1 }
        return 0
    }
    groups.sort(byPin)
    for (let grp of groups) {
        let div = newBoxItem(grp)
        div.id = "group-" + grp
        div.dataset.val = grp
        div.onclick = function() { selectGroupEv(grp) }
        box.append(div)
    }
}

// reloadUnits는 해당 쇼의 샷을 다시 부른다.
function reloadUnits() {
    let show = currentShow()
    if (!show) {
        throw Error("선택된 쇼가 없습니다.")
    }
    let ctg = currentCategory()
    let grp = currentGroup()
    if (!grp) {
        throw Error("선택된 그룹이 없습니다.")
    }
    let box = document.getElementById("unit-box")
    box.innerText = ""
    let units = names(site.Show(show).Category(ctg).Group(grp).Units())
    let byPin = function(a, b) {
        if (isPinnedUnit(show, ctg, grp, a)) { return -1 }
        if (isPinnedUnit(show, ctg, grp, b)) { return 1 }
        return 0
    }
    units.sort(byPin)
    for (let unit of units) {
        let div = newBoxItem(unit)
        div.id = "unit-" + unit
        div.dataset.val = unit
        div.onclick = function() { selectUnitEv(unit) }
        box.append(div)
    }
}

// reloadParts는 해당 샷의 태스크를 다시 부른다.
function reloadParts() {
    let show = currentShow()
    if (!show) {
        throw Error("선택된 쇼가 없습니다.")
    }
    let ctg = currentCategory()
    let grp = currentGroup()
    if (!grp) {
        throw Error("선택된 그룹이 없습니다.")
    }
    let unit = currentUnit()
    if (!unit) {
        throw Error("선택된 샷이 없습니다.")
    }
    let box = document.getElementById("part-box")
    box.innerText = ""
    for (let p of site.Show(show).Category(ctg).Group(grp).Unit(unit).Parts()) {
        let part = p.Name
        let div = newBoxItem(part)
        div.id = "part-" + part
        div.dataset.val = part
        div.onclick = function() { selectPartEv(part) }
        box.append(div)
    }
}

// reloadTasks는 해당 태스크의 요소를 다시 부른다.
function reloadTasks() {
    let show = currentShow()
    if (!show) {
        throw Error("선택된 쇼가 없습니다.")
    }
    let ctg = currentCategory()
    let grp = currentGroup()
    if (!grp) {
        throw Error("선택된 그룹이 없습니다.")
    }
    let unit = currentUnit()
    if (!unit) {
        throw Error("선택된 샷이 없습니다.")
    }
    let part = currentPart()
    if (!part) {
        throw Error("선택된 태스크가 없습니다.")
    }
    let box = document.getElementById("task-box")
    box.innerText = ""
    let p = site.Show(show).Category(ctg).Group(grp).Unit(unit).Part(part)
    for (let prog of p.Programs()) {
        let tasks = p.Tasks(prog)
        for (let t of tasks) {
            let task = t.Name
            let lastver = t.Versions[t.Versions.length - 1]
            let div = newBoxItem(prog + " - " + task)
            div.id = "task-" + task
            div.dataset.val = task
            div.dataset.dir = t.Dir
            div.onclick = function() { selectTaskEv(task, "") }
            div.ondblclick = function() { openTaskEv(show, ctg, grp, unit, part, prog, task, lastver) }
            let toggle = newVersionToggle(task)
            div.insertBefore(toggle, div.firstChild)
            box.append(div)
            for (let ver of t.Versions.reverse()) {
                let div = newBoxItem(ver)
                div.classList.add("task-" + task + "-versions")
                div.id = "task-" + task + "-" + ver
                div.dataset.val = task + "-" + ver
                div.dataset.dir = t.Dir
                div.onclick = function() { selectTaskEv(task, ver) }
                div.ondblclick = function() { openTaskEv(show, ctg, grp, unit, part, prog, task, ver) }
                div.style.display = "none"
                box.append(div)
            }
        }
    }
}

// newVersionToggle은 해당 태스크의 버전을 열고 닫을 수 있는 토글을 생성한다.
function newVersionToggle(task): HTMLElement {
    let toggle = document.createElement("div")
    toggle.classList.add("toggle")
    toggle.textContent = "▷"
    toggle.dataset.hideVersions = "t"
    toggle.onclick = function(ev) {
        ev.stopPropagation()
        toggleVersionVisibility(task)
    }
    toggle.ondblclick = function(ev) {
        ev.stopPropagation()
    }
    return toggle
}

// toggleVersionVisibility는 특정 요소의 버전을 보이거나 숨긴다.
function toggleVersionVisibility(task) {
    let div = document.getElementById("task-" + task)
    let toggle = <HTMLElement>div.getElementsByClassName("toggle")[0]
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
    let vers = Array.from(document.getElementsByClassName("task-" + task + "-versions"))
    for (let i in vers) {
        let v = <HTMLElement>vers[i]
        if (toggle.dataset.hideVersions == "t") {
            v.style.display = "none"
        } else {
            v.style.display = "flex"
        }
    }
}

// openTaskEv는 해당 요소의 한 버전을 연다.
function openTaskEv(show, ctg, grp, unit, part, prog, task, ver) {
    let handleError = function(err) {
        if (err) {
            console.log(err)
            notify(err.message)
        }
    }
    uiEvent(function() {
        site.Show(show).Category(ctg).Group(grp).Unit(unit).Part(part).OpenTask(prog, task, ver, handleError)
    })()
}

// clearBox는 'item-box' HTML 요소 안의 내용을 모두 지운다.
function clearBox(id) {
    let box = document.getElementById(id)
    if (!box) {
        throw Error(id + "가 없습니다.")
    }
    box.innerText = ""
}

// clearShows는 쇼 박스의 내용을 지운다.
function clearShows() {
    clearBox("show-box")
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

// clearAll은 모든 박스 및 알림 바의 내용을 지운다.
function clearAll() {
    clearNotify()
    clearShows()
    clearGroups()
    clearUnits()
    clearParts()
    clearTasks()
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

// loadPinnedShow는 사용자가 상단에 고정한 쇼를 설정 디렉토리에서 찾아 부른다.
function loadPinnedShow() {
    let fname = configDir() + "/pinned_show.json"
    if (!fs.existsSync(fname)) {
        pinnedShow = {}
        return
    }
    let data = fs.readFileSync(fname)
    pinnedShow = JSON.parse(data.toString("utf8"))
}

// pinShow는 특정 쇼를 상단에 고정한다.
// 변경된 내용은 설정 디렉토리에 저장되어 다시 프로그램을 열 때 반영된다.
function pinShow(show) {
    pinnedShow[show] = true
    let fname = configDir() + "/pinned_show.json"
    let data = JSON.stringify(pinnedShow)
    fs.writeFileSync(fname, data)
}

// unpinShow는 특정 쇼의 상단 고정을 푼다.
// 변경된 내용은 설정 디렉토리에 저장되어 다시 프로그램을 열 때 반영된다.
function unpinShow(show) {
    delete pinnedShow[show]
    let fname = configDir() + "/pinned_show.json"
    let data = JSON.stringify(pinnedShow)
    fs.writeFileSync(fname, data)
}

function isPinnedShow(show) {
    if (pinnedShow[show] == true) {
        return true
    }
    return false
}

// loadPinnedGroup은 사용자가 상단에 고정한 샷을 설정 디렉토리에서 찾아 부른다.
function loadPinnedGroup() {
    let fname = configDir() + "/pinned_group.json"
    if (!fs.existsSync(fname)) {
        pinnedGroup = {}
        return
    }
    let data = fs.readFileSync(fname)
    pinnedGroup = JSON.parse(data.toString("utf8"))
}

// pinGroup은 특정 샷을 상단에 고정한다.
// 변경된 내용은 설정 디렉토리에 저장되어 다시 프로그램을 열 때 반영된다.
function pinGroup(show, ctg, grp) {
    if (!pinnedGroup[show]) {
        pinnedGroup[show] = {}
    }
    if (!pinnedGroup[show][ctg]) {
        pinnedGroup[show][ctg] = {}
    }
    pinnedGroup[show][ctg][grp] = true
    let fname = configDir() + "/pinned_group.json"
    let data = JSON.stringify(pinnedGroup)
    fs.writeFileSync(fname, data)
}

// unpinGroup은 특정 샷의 상단 고정을 푼다.
// 변경된 내용은 설정 디렉토리에 저장되어 다시 프로그램을 열 때 반영된다.
function unpinGroup(show, ctg, grp) {
    delete pinnedGroup[show][ctg][grp]
    if (Object.keys(pinnedGroup[show][ctg]).length == 0) {
        delete pinnedGroup[show][ctg]
    }
    if (Object.keys(pinnedGroup[show]).length == 0) {
        delete pinnedGroup[show]
    }
    let fname = configDir() + "/pinned_group.json"
    let data = JSON.stringify(pinnedUnit)
    fs.writeFileSync(fname, data)
}

function isPinnedGroup(show, ctg, grp) {
    try {
        if (pinnedGroup[show][ctg][grp]) {
            return true
        }
        return false
    } catch (err) {
        return false
    }
}

// loadPinnedUnit은 사용자가 상단에 고정한 샷을 설정 디렉토리에서 찾아 부른다.
function loadPinnedUnit() {
    let fname = configDir() + "/pinned_unit.json"
    if (!fs.existsSync(fname)) {
        pinnedUnit = {}
        return
    }
    let data = fs.readFileSync(fname)
    pinnedUnit = JSON.parse(data.toString("utf8"))
}

// pinUnit은 특정 샷을 상단에 고정한다.
// 변경된 내용은 설정 디렉토리에 저장되어 다시 프로그램을 열 때 반영된다.
function pinUnit(show, ctg, grp, unit) {
    if (!pinnedUnit[show]) {
        pinnedUnit[show] = {}
    }
    if (!pinnedUnit[show][ctg]) {
        pinnedUnit[show][ctg] = {}
    }
    if (!pinnedUnit[show][ctg][grp]) {
        pinnedUnit[show][ctg][grp] = {}
    }
    pinnedUnit[show][ctg][grp][unit] = true
    let fname = configDir() + "/pinned_unit.json"
    let data = JSON.stringify(pinnedUnit)
    fs.writeFileSync(fname, data)
}

// unpinUnit은 특정 샷의 상단 고정을 푼다.
// 변경된 내용은 설정 디렉토리에 저장되어 다시 프로그램을 열 때 반영된다.
function unpinUnit(show, ctg, grp, unit) {
    delete pinnedUnit[show][ctg][grp][unit]
    if (Object.keys(pinnedUnit[show][ctg][grp]).length == 0) {
        delete pinnedUnit[show][ctg][grp]
    }
    if (Object.keys(pinnedUnit[show][ctg]).length == 0) {
        delete pinnedUnit[show][ctg]
    }
    if (Object.keys(pinnedUnit[show]).length == 0) {
        delete pinnedUnit[show]
    }
    let fname = configDir() + "/pinned_unit.json"
    let data = JSON.stringify(pinnedUnit)
    fs.writeFileSync(fname, data)
}

function isPinnedUnit(show, ctg, grp, unit) {
    try {
        if (pinnedUnit[show][ctg][grp][unit]) {
            return true
        }
        return false
    } catch (err) {
        return false
    }
}

// openDir은 받은 디렉토리 경로를 연다.
// 만일 해당 디렉토리가 존재하지 않는다면 에러를 낸다.
function openDir(dir) {
    if (!fs.existsSync(dir)) {
        throw Error(dir + "디렉토리가 존재하지 않습니다.")
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
            let handleError = function(err) {
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

interface Namer {
    Name: string
}

function names(vals: Namer[]): string[] {
    let ns: string[] = []
    for (let v of vals) {
        ns.push(v.Name)
    }
    return ns
}

// 초기화 실행
try {
    init()
} catch(err) {
    clearAll()
    console.log(err)
    notify("초기화에 실패: " + err.message)
}

import * as fs from "fs"
import * as proc from "child_process"

import * as program from "./program"

let siteRoot: string
let showRoot: string
let siteInfo: SiteInfo

export function Init() {
    siteRoot = process.env.SITE_ROOT
    if (!siteRoot) {
        throw Error("SITE_ROOT 환경변수가 설정되어 있지 않습니다.")
    }
    showRoot = siteRoot + "/show"
    if (process.env.SHOW_ROOT) {
        showRoot = process.env.SHOW_ROOT
    }
    let siteFile = siteRoot + "/site.json"
    if (!fs.existsSync(siteFile)) {
        throw Error("$SITE_ROOT에site.json 파일이 없습니다. example/site.json 파일을 복사해서 사용하셔도 됩니다.")
    }
    let data = fs.readFileSync(siteFile)
    siteInfo = JSON.parse(data.toString("utf8"))
    validateSiteInfo(siteInfo)
}

export function ValidCategories(): string[] {
    let ctgs = Object.keys(siteInfo["categories"])
    ctgs.sort()
    return ctgs
}

export function CategoryLabel(ctg: string): string {
    let ctgInfo = siteInfo["categories"][ctg]
    if (!ctgInfo) {
        throw Error("unknown category: " + ctg)
    }
    return ctgInfo["unit"].Label
}

export function ValidParts(ctg: string): string[] {
    let ctgInfo = siteInfo["categories"][ctg]
    if (!ctgInfo) {
        throw Error("unknown category: " + ctg)
    }
    let partInfo = ctgInfo["part"]
    let parts = []
    for (let p in partInfo) {
        parts.push(p)
    }
    parts.sort()
    return parts
}

export function ValidPrograms(ctg: string, part: string): string[] {
    let ctgInfo = siteInfo["categories"][ctg]
    if (!ctgInfo) {
        throw Error("unknown category: " + ctg)
    }
    let partInfo = ctgInfo["part"]
    if (!partInfo) {
        throw Error("no part information for category '" + ctg + "'")
    }
    let p = partInfo[part]
    if (!p) {
        throw Error("unknown part '" + part + "' for category '" + ctg + "'")
    }
    let names = []
    for (let name in p.ProgramDir) {
        names.push(name)
    }
    names.sort()
    return names
}

interface Branch {
    Parent: Branch | null
    Type: string
    Label: string
    Name: string
    Dir: string
    Subdirs: Dir[]
    ChildRoot: string
}

export function CreateShow(name: string) {
    let show = new ShowBranch(name)
    for (let d of show.Subdirs) {
        makeDir(show.Dir + "/" + d.Name, d.Perm)
    }
}

export function Show(name: string): ShowBranch {
    let show = new ShowBranch(name)
    if (!fs.existsSync(show.Dir)) {
        throw Error("show not exists: " + name)
    }
    return show
}

export function Shows(): ShowBranch[] {
    let children = []
    for (let d of listDirs(showRoot)) {
        children.push(this.Show(d))
    }
    return children
}

class ShowBranch implements Branch {
    Parent: null
    Type: string
    Label: string
    Name: string
    Dir: string
    Subdirs: Dir[]
    ChildRoot: string

    constructor(name: string) {
        this.Parent = null
        this.Type = "show"
        this.Label = "쇼"
        this.Name = name
        this.Dir = showRoot + "/" + name
        let showInfo = siteInfo["show"]
        this.Subdirs = showInfo.Subdirs
        this.ChildRoot = this.Dir
        if (showInfo.ChildRoot) {
            this.ChildRoot += "/" + showInfo.ChildRoot
        }
    }
    Category(name: string): CategoryBranch {
        return new CategoryBranch(this, name)
    }
    Categories(): CategoryBranch[] {
        let children = []
        for (let c of ValidCategories()) {
            children.push(this.Category(c))
        }
        children.sort(function(a, b) {
            return compare(a.Name, b.Name)
        })
        return children
    }
}

class CategoryBranch implements Branch {
    Parent: Branch
    Type: string
    Label: string
    Name: string
    Dir: string
    Subdirs: Dir[]
    ChildRoot: string

    constructor(parent: ShowBranch, name: string) {
        if (!ValidCategories().includes(name)) {
            throw Error("invalid category name: " + name)
        }
        this.Parent = parent
        this.Type = "category"
        this.Label = "카테고리"
        this.Name = name
        this.Dir = parent.ChildRoot + "/" + name
        let ctgInfo = siteInfo["category"]
        this.Subdirs = ctgInfo.Subdirs
        this.ChildRoot = this.Dir
        if (ctgInfo.ChildRoot) {
            this.ChildRoot += "/" + ctgInfo.ChildRoot
        }
    }
    CreateGroup(name: string) {
        let group = new GroupBranch(this, name)
        for (let d of group.Subdirs) {
            makeDir(group.Dir + "/" + d.Name, d.Perm)
        }
    }
    Group(name: string): GroupBranch {
        let group = new GroupBranch(this, name)
        if (!fs.existsSync(group.Dir)) {
            throw Error("no group: " + name)
        }
        return group
    }
    Groups(): GroupBranch[] {
        let children = []
        for (let d of listDirs(this.ChildRoot)) {
            children.push(this.Group(d))
        }
        return children
    }
}

class GroupBranch implements Branch {
    Parent: Branch
    Type: string
    Label: string
    Name: string
    Dir: string
    Subdirs: Dir[]
    ChildRoot: string

    constructor(parent: CategoryBranch, name: string) {
        this.Parent = parent
        this.Type = "group"
        this.Label = "그룹"
        this.Name = name
        this.Dir = parent.ChildRoot + "/" + name
        let ctg = getParent(this, "category").Name
        let ctgInfo = siteInfo["categories"][ctg]
        if (!ctgInfo) {
            throw Error("unknown category: " + ctg)
        }
        let grpInfo = ctgInfo["group"]
        this.Subdirs = grpInfo.Subdirs
        this.ChildRoot = this.Dir
        if (grpInfo.ChildRoot) {
            this.ChildRoot += "/" + grpInfo.ChildRoot
        }
    }
    CreateUnit(name: string) {
        let unit = new UnitBranch(this, name)
        for (let d of unit.Subdirs) {
            makeDir(unit.Dir + "/" + d.Name, d.Perm)
        }
    }
    Unit(name: string): UnitBranch {
        let unit = new UnitBranch(this, name)
        if (!fs.existsSync(unit.Dir)) {
            throw Error("no unit: " + name)
        }
        return unit
    }
    Units(): UnitBranch[] {
        let children = []
        for (let d of listDirs(this.ChildRoot)) {
            children.push(this.Unit(d))
        }
        return children
    }
}

class UnitBranch implements Branch {
    Parent: Branch
    Type: string
    Label: string
    Name: string
    Dir: string
    Subdirs: Dir[]
    ChildRoot: string

    constructor(parent: GroupBranch, name: string) {
        this.Parent = parent
        this.Type = "unit"
        this.Label = "유닛"
        this.Name = name
        this.Dir = parent.ChildRoot + "/" + name
        let ctg = getParent(this, "category").Name
        let ctgInfo = siteInfo["categories"][ctg]
        if (!ctgInfo) {
            throw Error("unknown category: " + ctg)
        }
        let unitInfo = ctgInfo["unit"]
        this.Subdirs = unitInfo.Subdirs
        this.ChildRoot = this.Dir
        if (unitInfo.ChildRoot) {
            this.ChildRoot += "/" + unitInfo.ChildRoot
        }
    }
    CreatePart(name: string) {
        let part = new PartBranch(this, name)
        for (let d of part.Subdirs) {
            makeDir(part.Dir + "/" + d.Name, d.Perm)
        }
    }
    Part(name: string): PartBranch {
        return new PartBranch(this, name)
    }
    Parts(): PartBranch[] {
        let children = []
        for (let d of listDirs(this.ChildRoot)) {
            children.push(this.Part(d))
        }
        return children
    }
}

class PartBranch implements Branch {
    Parent: Branch
    Type: string
    Label: string
    Name: string
    Dir: string
    Subdirs: Dir[]
    ChildRoot: string
    ProgramDir: { [k: string]: string }

    constructor(parent: UnitBranch, name: string) {
        this.Parent = parent
        this.Type = "part"
        this.Label = "파트"
        this.Name = name
        this.Dir = parent.ChildRoot + "/" + name
        let ctg = getParent(this, "category").Name
        let ctgInfo = siteInfo["categories"][ctg]
        if (!ctgInfo) {
            throw Error("unknown category: " + ctg)
        }
        let partInfo = ctgInfo["part"][this.Name]
        if (!partInfo) {
            throw Error("unknown part for " + ctg + " category: " + this.Name)
        }
        this.Subdirs = partInfo.Subdirs
        this.ChildRoot = this.Dir
        this.ProgramDir = partInfo.ProgramDir
    }
    ProgramAt(prog: string): string {
        if (!(prog in this.ProgramDir)) {
            throw Error("program '" + prog + "' not defined in " + this.Name)
        }
        return this.ProgramDir[prog]
    }
    Task(name: string): Task {
        for (let prog in this.ProgramDir) {
            let at = this.ProgramDir[prog]
            let dir = this.Dir
            if (at) {
                dir += "/" + at
            }
            let pg = program.Get(prog)
            let progTasks = this.ListTasks(dir, pg)
            for (let t of progTasks) {
                if (t.Name == name) {
                    return t
                }
            }
        }
        throw Error("no task: " + name)
    }
    Tasks(): Task[] {
        let tasks = []
        for (let prog in this.ProgramDir) {
            let at = this.ProgramDir[prog]
            let dir = this.Dir
            if (at) {
                dir += "/" + at
            }
            let pg = program.Get(prog)
            let progTasks = this.ListTasks(dir, pg)
            for (let t of progTasks) {
                tasks.push(t)
            }
        }
        return tasks
    }
    ListTasks(dir, pg): Task[] {
        let show = getParent(this, "show").Name
        let grp = getParent(this, "group").Name
        let unit = getParent(this, "unit").Name
        let part = this.Name
        let taskMap = {}
        let files = fs.readdirSync(dir)
        for (let f of files) {
            if (!fs.lstatSync(dir + "/" + f).isFile()) {
                continue
            }
            if (!f.endsWith(pg.Ext)) {
                continue
            }
            f = f.substring(0, f.length - pg.Ext.length)
            let prefix = show + "_" + grp + "_" + unit + "_" + part + "_"
            if (!f.startsWith(prefix)) {
                continue
            }
            f = f.substring(prefix.length, f.length)
            let ws = f.split("_")
            if (ws.length != 2) {
                continue
            }
            let [task, version] = ws
            if (!version.startsWith("v") || !parseInt(version.substring(1), 10)) {
                continue
            }
            if (!taskMap[task]) {
                taskMap[task] = new Task(task, pg.Name, dir)
            }
            taskMap[task].Versions.push(version)
        }
        let tasks = []
        for (let k in taskMap) {
            let t = taskMap[k]
            tasks.push(t)
        }
        tasks.sort(function(a, b) {
            return compare(a.Name, b.Name)
        })
        return tasks
    }
    CreateTask(prog: string, task: string, ver: string) {
        let at = this.ProgramAt(prog)
        let dir = this.Dir
        if (at) {
            dir += "/" + at
        }
        let pg = program.Get(prog)
        let scene = dir + "/" + this.SceneName(task, ver) + pg.Ext
        let env = this.Environ()
        pg.CreateScene(scene, env)
    }
    OpenTask(prog: string, task: string, ver: string, handleError: (err: Error) => void) {
        let at = this.ProgramAt(prog)
        let dir = this.Dir
        if (at) {
            dir += "/" + at
        }
        let pg = program.Get(prog)
        let scene = dir + "/" + this.SceneName(task, ver) + pg.Ext
        let env = this.Environ()
        pg.OpenScene(scene, env, handleError)
    }
    Environ(): { [k: string]: string } {
        let env = cloneEnv()
        env["SHOW_ROOT"] = showRoot
        let pshow = getParent(this, "show")
        env["SHOW"] = pshow.Name
        env["SHOWD"] = pshow.Dir
        env["ASSET_ROOT"] = pshow.Dir + "/asset"
        env["SHOT_ROOT"] = pshow.Dir + "/shot"
        let ctg = getParent(this, "category").Name
        let pgrp = getParent(this, "group")
        let punit = getParent(this, "unit")
        if (ctg == "asset") {
            env["ASSET_TYPE"] = pgrp.Name
            env["ASSET"] = punit.Name
            env["ASSETD"] = punit.Dir
        } else if (ctg == "shot") {
            env["SEQ"] = pgrp.Name
            env["SHOT"] = pgrp.Name + "_" + punit.Name
            env["SHOTD"] = punit.Dir
        }
        env["PART"] = this.Name
        env["PARTD"] = this.Dir
        return env
    }
    SceneName(task, ver): string {
        let show = getParent(this, "show").Name
        let grp = getParent(this, "group").Name
        let unit = getParent(this, "unit").Name
        let part = this.Name
        let scene = show + "_" + grp + "_" + unit + "_" + part + "_" + task + "_" + ver
        return scene
    }
}

class Task {
    Name: string
    Program: string
    Dir: string
    Versions: string[]

    constructor(name, prog, dir) {
        this.Name = name
        this.Program = prog
        this.Dir = dir
        this.Versions = []
    }
}

interface Dir {
    Name: string
    Perm: string
}

// createDirs는 부모 디렉토리에 하위 디렉토리들을 생성한다.
// 만일 생성하지 못한다면 에러가 난다.
function makeDir(d: string, perm: string) {
    fs.mkdirSync(d)
    fs.chmodSync(d, perm)
    if (process.platform == "win32") {
        // 윈도우즈에서는 위의 mode 설정이 먹히지 않기 때문에 모두에게 권한을 푼다.
        // 리눅스의 775와 윈도우즈의 everyone은 범위가 다르지만
        // 윈도우즈에서 가장 간단히 권한을 설정할 수 있는 방법이다.
        let specialBit = perm.substring(0, 1)
        let defaultBits = perm.substring(1, 4)
        if (defaultBits == "777" || defaultBits == "775") {
            let user = "everyone:(F)"
            if (specialBit == "2") {
                user = "everyone:(CI)(OI)(F)"
            }
            proc.execFileSync("icacls", [d.replace(/\//g, "\\"), "/grant", user])
        }
    }
}

// listDirs는 특정 디렉토리의 하위 디렉토리들을 검색하여 반환한다.
// 해당 디렉토리가 없거나 검사할 수 없다면 에러가 난다.
function listDirs(d): string[] {
    if (!fs.existsSync(d)) {
        throw Error(d + " 디렉토리가 존재하지 않습니다.")
    }
    let dirs: string[] = []
    for (let ent of fs.readdirSync(d)) {
        let isDir = fs.lstatSync(d + "/" + ent).isDirectory()
        if (isDir) {
            dirs.push(ent)
        }
    }
    dirs.sort()
    return dirs
}

// cloneEnv는 현재 프로세스의 환경을 복제한 환경을 생성한다.
// 요소를 생성하거나 실행할 때 프로그램에 맞게 환경을 수정할 때 사용한다.
function cloneEnv() {
    let env = {}
    for (let e in process.env) {
        env[e] = process.env[e]
    }
    return env
}

// compare는 두 값을 받아 비교한 후 앞의 값이 더 작으면 -1, 뒤의 값이 더 작으면 1, 같으면 0을 반환한다.
function compare(a, b): number {
    if (a < b) {
        return -1
    } else if (a > b) {
        return 1
    }
    return 0
}

function getParent(b: Branch, type: string): Branch {
    while (b.Parent) {
        b = b.Parent
        if (b.Type == type) {
            return b
        }
    }
    throw Error(name + " branch not found")
}

// mustHaveAttrs는 오브제트에 해당 어트리뷰트가 존재하는지 체크하고 없으면 에러를 낸다.
function mustHaveAttrs(label, obj, attrs) {
    for (let a of attrs) {
        if (!(a in obj)) {
            throw Error(label + ": does not have attribute: " + a)
        }
    }
}

// SiteInfo는 설정 파일에 정의되는 사이트 정보이다.
interface SiteInfo {
    show: ShowInfo
    category: CategoryInfo
    categories: { [k: string]: CategorySubInfo }
}

// validateSiteInfo는 설정 파일에서 불러온 사이트 정보에 문제가 없는지를
// 체크하고, 문제가 있을 때는 에러를 낸다.
function validateSiteInfo(info: SiteInfo) {
    mustHaveAttrs("site", info, ["show", "category", "categories"])
    validateShowInfo(info["show"])
    validateCategoryInfo(info["category"])
    for (let ctg in info["categories"]) {
        validateCategorySubInfo(info["categories"][ctg])
    }
}

// ShowInfo는 설정 파일에 정의되는 쇼 정보이다.
interface ShowInfo {
    Subdirs: Dir[]
    ChildRoot: string
}

// validateShowInfo는 설정 파일에서 불러온 쇼 정보에 문제가 없는지를
// 체크하고, 문제가 있을 때는 에러를 낸다.
function validateShowInfo(info: ShowInfo) {
    mustHaveAttrs("show", info, ["Subdirs", "ChildRoot"])
    for (let d of info.Subdirs) {
        validateDir(d)
    }
}

// CategoryInfo는 설정 파일에 정의되는 카테고리 정보이다.
interface CategoryInfo {
    Subdirs: Dir[]
    ChildRoot: string
}

// validateCategoryInfo는 설정 파일에서 불러온 카테고리 정보에 문제가 없는지를
// 체크하고, 문제가 있을 때는 에러를 낸다.
function validateCategoryInfo(info: CategoryInfo) {
    mustHaveAttrs("category", info, ["Subdirs", "ChildRoot"])
    for (let d of info.Subdirs) {
        validateDir(d)
    }
}

// CategorySubInfo는 설정 파일에 정의되는 카테고리 하위 정보이다.
interface CategorySubInfo {
    group: GroupInfo
    unit: UnitInfo
    part: { [k: string]: PartInfo }
}

// validateCategorySubInfo는 설정 파일에서 불러온 카테고리 하위 정보에 문제가 없는지를
// 체크하고, 문제가 있을 때는 에러를 낸다.
function validateCategorySubInfo(info: CategorySubInfo) {
    mustHaveAttrs("categories", info, ["group", "unit", "part"])
    validateGroupInfo(info["group"])
    validateUnitInfo(info["unit"])
    for (let part in info["part"]) {
        validatePartInfo(info["part"][part])
    }
}

// GroupInfo는 설정 파일에 정의되는 그룹 정보이다.
interface GroupInfo {
    Label: string
    Subdirs: Dir[]
    ChildRoot: string
}

// validateGroupInfo는 설정 파일에서 불러온 그룹 정보에 문제가 없는지를
// 체크하고, 문제가 있을 때는 에러를 낸다.
function validateGroupInfo(info: GroupInfo) {
    mustHaveAttrs("group", info, ["Label", "Subdirs", "ChildRoot"])
    for (let d of info.Subdirs) {
        validateDir(d)
    }
}

// GroupInfo는 설정 파일에 정의되는 유닛 정보이다.
interface UnitInfo {
    Label: string
    Subdirs: Dir[]
    ChildRoot: string
}

// validateUnitInfo는 설정 파일에서 불러온 유닛 정보에 문제가 없는지를
// 체크하고, 문제가 있을 때는 에러를 낸다.
function validateUnitInfo(info: UnitInfo) {
    mustHaveAttrs("unit", info, ["Label", "Subdirs", "ChildRoot"])
    for (let d of info.Subdirs) {
        validateDir(d)
    }
}

// GroupInfo는 설정 파일에 정의되는 파트 정보이다.
interface PartInfo {
    Subdirs: Dir[]
    ProgramDir: { [k: string]: string }
}

// validateUnitInfo는 설정 파일에서 불러온 파트 정보에 문제가 없는지를
// 체크하고, 문제가 있을 때는 에러를 낸다.
function validatePartInfo(info: PartInfo) {
    mustHaveAttrs("part", info, ["Subdirs", "ProgramDir"])
    for (let d of info.Subdirs) {
        validateDir(d)
    }
}

// validateDir은 설정 파일에서 불러온 디렉토리 정보에 문제가 없는지를
// 체크하고, 문제가 있을 때는 에러를 낸다.
function validateDir(d: Dir) {
    mustHaveAttrs("dir", d, ["Name", "Perm"])
    if (typeof d.Perm != "string" || d.Perm.length != 4) {
        throw("elo에서는 파일 디렉토리 권한에 4자리 문자열 만을 사용합니다")
    }
}

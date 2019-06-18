import * as fs from "fs"
import * as proc from "child_process"

import * as program from "./program"

let siteRoot: string
let siteInfo: any

export function Init() {
    siteRoot = process.env.SITE_ROOT
    if (!siteRoot) {
        throw Error("SITE_ROOT 환경변수가 설정되어 있지 않습니다.")
    }
    let siteFile = siteRoot + "/site.json"
    if (!fs.existsSync(siteFile)) {
        throw Error("SITE_ROOT/site.json 파일이 없습니다.")
    }
    let data = fs.readFileSync(siteFile)
    siteInfo = JSON.parse(data.toString("utf8"))
}

export function New(): Root {
    return new Root("2L")
}

export function ValidCategories(): string[] {
    let ctgs = []
    for (let c in siteInfo["categories"]) {
        ctgs.push(c)
    }
    ctgs.sort()
    return ctgs
}

export function CategoryLabel(c: string): string {
    let l = siteInfo["categories"][c]
    if (!l) {
        throw Error("no category info: " + c)
    }
    return l
}

export function PartInformation(ctg: string, part: string): PartInfo {
    let ctgInfo = siteInfo[ctg]
    if (!ctgInfo) {
        throw Error("unknown category")
    }
    let partInfo = ctgInfo["part"]
    if (!partInfo) {
        throw Error("no part information for category '" + ctg + "'")
    }
    let p = partInfo[part]
    if (!p) {
        throw Error("no part '" + part + "' in category '" + ctg + "'")
    }
    return p
}

export function ValidParts(ctg: string): string[] {
    let ctgInfo = siteInfo[ctg]
    if (!ctgInfo) {
        throw Error("unknown category")
    }
    let partInfo = ctgInfo["part"]
    if (!partInfo) {
        throw Error("no part information for category '" + ctg + "'")
    }
    let parts = []
    for (let p in partInfo) {
        parts.push(p)
    }
    parts.sort()
    return parts
}

export function Program(name: string): program.Program {
    if (name == "maya") {
        return program.Maya
    }
    if (name == "houdini") {
        return program.Houdini
    }
    if (name == "nuke") {
        return program.Nuke
    }
    throw Error("undefined program: " + name)
}

export function ValidPrograms(ctg: string, part: string): string[] {
    let ctgInfo = siteInfo[ctg]
    if (!ctgInfo) {
        throw Error("unknown category")
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

export class Root implements Branch {
    Parent: Branch
    Type: string
    Label: string
    Name: string
    Dir: string
    Subdirs: Dir[]
    ChildRoot: string

    constructor(name: string) {
        this.Parent = null
        this.Type = "site"
        this.Label = "사이트"
        this.Name = name
        this.Dir = siteRoot
        this.Subdirs = [
            dirEnt("", "0755"),
            dirEnt("runner", "0755"),
            dirEnt("show", "0755"),
        ]
        this.ChildRoot = this.Dir + "/show"
    }
    CreateShow(name: string) {
        let show = new Show(this, name)
        for (let d of show.Subdirs) {
            makeDirAt(show.Dir, d)
        }
    }
    Show(name: string): Show {
        let show = new Show(this, name)
        if (!fs.existsSync(show.Dir)) {
            throw Error("show not exists: " + name)
        }
        return show
    }
    Shows(): Show[] {
        let children = []
        for (let d of listDirs(this.ChildRoot)) {
            children.push(this.Show(d))
        }
        return children
    }
}

class Show implements Branch {
    Parent: Branch
    Type: string
    Label: string
    Name: string
    Dir: string
    Subdirs: Dir[]
    ChildRoot: string

    constructor(parent: Root, name: string) {
        this.Parent = parent
        this.Type = "show"
        this.Label = "쇼"
        this.Name = name
        this.Dir = parent.ChildRoot + "/" + name
        this.Subdirs = siteInfo["show"].Subdirs
        this.ChildRoot = this.Dir
    }
    Category(name: string): Category {
        return new Category(this, name)
    }
    Categories(): Category[] {
        let children = []
        for (let c of ValidCategories()) {
            children.push(this.Category(c))
        }
        return children
    }
}

let categories = {
    "asset": "애셋",
    "shot": "샷",
}

class Category {
    Parent: Branch
    Type: string
    Label: string
    Name: string
    Dir: string
    Subdirs: Dir[]
    ChildRoot: string

    constructor(parent: Show, name: string) {
        if (!categories[name]) {
            throw Error("invalid category name: " + name)
        }
        this.Parent = parent
        this.Type = "category"
        this.Label = "카테고리"
        this.Name = name
        this.Dir = parent.ChildRoot + "/" + name
        this.Subdirs = siteInfo[name]["category"].Subdirs
        this.ChildRoot = this.Dir
    }
    CreateGroup(name: string) {
        let unit = new Group(this, name)
        for (let d of unit.Subdirs) {
            makeDirAt(unit.Dir, d)
        }
    }
    Group(name: string): Group {
        let unit = new Group(this, name)
        if (!fs.existsSync(unit.Dir)) {
            throw Error("no group: " + name)
        }
        return unit
    }
    Groups(): Group[] {
        let children = []
        for (let d of listDirs(this.ChildRoot)) {
            children.push(this.Group(d))
        }
        return children
    }
}

class Group {
    Parent: Branch
    Type: string
    Label: string
    Name: string
    Dir: string
    Subdirs: Dir[]
    ChildRoot: string

    constructor(parent: Category, name) {
        this.Parent = parent
        this.Type = "group"
        this.Label = "그룹"
        this.Name = name
        this.Dir = parent.ChildRoot + "/" + name
        let ctg = getParent(this, "category").Name
        this.Subdirs = siteInfo[ctg]["group"].Subdirs
        this.ChildRoot = this.Dir
    }
    CreateUnit(name: string) {
        let unit = new Unit(this, name)
        for (let d of unit.Subdirs) {
            makeDirAt(unit.Dir, d)
        }
    }
    Unit(name: string): Unit {
        let unit = new Unit(this, name)
        if (!fs.existsSync(unit.Dir)) {
            throw Error("no unit: " + name)
        }
        return unit
    }
    Units(): Unit[] {
        let children = []
        for (let d of listDirs(this.ChildRoot)) {
            children.push(this.Unit(d))
        }
        return children
    }
}

class Unit {
    Parent: Branch
    Type: string
    Label: string
    Name: string
    Dir: string
    Subdirs: Dir[]
    ChildRoot: string

    constructor(parent: Group, name) {
        this.Parent = parent
        this.Type = "unit"
        this.Label = "유닛"
        this.Name = name
        this.Dir = parent.ChildRoot + "/" + name
        let ctg = getParent(this, "category").Name
        this.Subdirs = siteInfo[ctg]["unit"].Subdirs
        this.ChildRoot = this.Dir + "/wip"
    }
    CreatePart(name: string) {
        let part = new Part(this, name)
        for (let d of part.Subdirs) {
            makeDirAt(part.Dir, d)
        }
    }
    Part(name: string): Part {
        return new Part(this, name)
    }
    Parts(): Part[] {
        let children = []
        for (let d of listDirs(this.ChildRoot)) {
            children.push(this.Part(d))
        }
        return children
    }
}

interface PartInfo {
    Subdirs: Dir[]
    ProgramDir: { [k: string]: string }
}

class Part {
    Parent: Branch
    Type: string
    Label: string
    Name: string
    Dir: string
    Subdirs: Dir[]
    ChildRoot: string
    ProgramDir: { [k: string]: string }

    constructor(parent: Unit, name) {
        this.Parent = parent
        this.Type = "part"
        this.Label = "파트"
        this.Name = name
        this.Dir = parent.ChildRoot + "/" + name
        let ctg = getParent(this, "category").Name
        let partInfo = PartInformation(ctg, this.Name)
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
            let pg = Program(prog)
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
            let pg = Program(prog)
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
        let pg = Program(prog)
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
        let pg = Program(prog)
        let scene = dir + "/" + this.SceneName(task, ver) + pg.Ext
        let env = this.Environ()
        pg.OpenScene(scene, env, handleError)
    }
    Environ(): { [k: string]: string } {
        let env = cloneEnv()
        let psite = getParent(this, "site")
        env["SHOW_ROOT"] = psite.ChildRoot
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
    name: string
    perm: string
}

// dirEnt는 디렉토리의 이름과 권한을 하나의 오브젝트로 묶어 반환한다.
function dirEnt(name, perm): Dir {
    if (typeof perm != "string" || perm.length != 4) {
        throw("elo에서는 파일 디렉토리 권한에 4자리 문자열 만을 사용합니다")
    }
    return { name: name, perm: perm }
}

// createDirs는 부모 디렉토리에 하위 디렉토리들을 생성한다.
// 만일 생성하지 못한다면 에러가 난다.
function makeDirAt(parentd: string, di: Dir) {
    let path = parentd + "/" + di.name
    let perm = di.perm
    fs.mkdirSync(path)
    fs.chmodSync(path, perm)
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
            proc.execFileSync("icacls", [path.replace(/\//g, "\\"), "/grant", user])
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


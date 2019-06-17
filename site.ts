import * as fs from "fs"
import * as proc from "child_process"

import * as program from "./program"

let siteRoot = process.env.SITE_ROOT
if (!siteRoot) {
    throw Error("SITE_ROOT 환경변수가 설정되어 있지 않습니다.")
}

export function New(): Root {
    return new Root("2L")
}

export function ValidParts(ctg: string): string[] {
    let partMap = partInfo[ctg]
    if (!partMap) {
        throw Error("unknown category")
    }
    let parts = []
    for (let p in partMap) {
        parts.push(p)
    }
    parts.sort()
    return parts
}

export function ValidPrograms(ctg: string, part: string): string[] {
    let partMap = partInfo[ctg]
    if (!partMap) {
        throw Error("unknown category")
    }
    let p = partMap[part]
    if (!p) {
        throw Error("unknown part '" + part + "' for category '" + ctg + "'")
    }
    let names: string[] = []
    for (let name in p.Programs) {
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
    Env: { [k: string]: string }
}

class Root implements Branch {
    Parent: Branch
    Type: string
    Label: string
    Name: string
    Dir: string
    Subdirs: Dir[]
    ChildRoot: string
    Env: { [k: string]: string }

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
        this.Env = {
            "SHOW_ROOT": this.Dir + "/show"
        }
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
    Env: { [k: string]: string }

    constructor(parent: Root, name: string) {
        this.Parent = parent
        this.Type = "show"
        this.Label = "쇼"
        this.Name = name
        this.Dir = parent.ChildRoot + "/" + name
        this.Subdirs = [
            dirEnt("", "0755"),
            dirEnt("asset", "0755"),
            dirEnt("asset/char", "2775"),
            dirEnt("asset/env", "2775"),
            dirEnt("asset/prop", "2775"),
            dirEnt("doc", "0755"),
            dirEnt("doc/cglist", "0755"),
            dirEnt("doc/credit", "0755"),
            dirEnt("doc/droid", "0755"),
            dirEnt("data", "0755"),
            dirEnt("data/edit", "0755"),
            dirEnt("data/onset", "0755"),
            dirEnt("data/lut", "0755"),
            dirEnt("scan", "0755"),
            dirEnt("vendor", "0755"),
            dirEnt("vendor/in", "0755"),
            dirEnt("vendor/out", "0755"),
            dirEnt("review", "2775"),
            dirEnt("in", "0755"),
            dirEnt("out", "0755"),
            dirEnt("shot", "2775"),
        ]
        this.ChildRoot = this.Dir
        this.Env = {
            "SHOW": name,
            "SHOWD": this.Dir,
            "SHOT_ROOT": this.Dir + "/shot",
            "ASSET_ROOT": this.Dir + "/asset",
        }
    }
    Category(name: string): Category {
        return new Category(this, name)
    }
    Categories(): Category[] {
        let children = [
            this.Category("asset"),
            this.Category("shot"),
        ]
        return children
    }
}

export let Categories = ["asset", "shot"]

export let CategoryLabel = {
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
    Env: { [k: string]: string }

    constructor(parent: Show, name: string) {
        if (name != "asset" && name != "shot") {
            throw Error("only accept 'asset' or 'shot' as category name currently, got: " + name)
        }
        this.Parent = parent
        this.Type = "category"
        this.Label = "카테고리"
        this.Name = name
        this.Dir = parent.ChildRoot + "/" + name
        this.Subdirs = [
            dirEnt("", "2775"),
        ]
        this.ChildRoot = this.Dir
        this.Env = {}
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
    Env: { [k: string]: string }

    constructor(parent: Category, name) {
        this.Parent = parent
        this.Type = "group"
        this.Label = "그룹"
        this.Name = name
        this.Dir = parent.ChildRoot + "/" + name
        this.Subdirs = [
            dirEnt("", "2775"),
        ]
        this.ChildRoot = this.Dir
        this.Env = {}
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
    Env: { [k: string]: string }

    constructor(parent: Group, name) {
        this.Parent = parent
        this.Type = "unit"
        let ctg = getParent(this, "category").Name
        this.Label = "유닛"
        this.Name = name
        this.Dir = parent.ChildRoot + "/" + name
        if (ctg == "asset") {
            this.Subdirs = [
                dirEnt("", "2775")
            ]
        } else if (ctg == "shot") {
            this.Subdirs = [
                dirEnt("", "2775"),
                dirEnt("scan", "0755"),
                dirEnt("scan/base", "0755"),
                dirEnt("scan/source", "0755"),
                dirEnt("ref", "0755"),
                dirEnt("pub", "0755"),
                dirEnt("pub/cam", "2775"),
                dirEnt("pub/geo", "2775"),
                dirEnt("pub/char", "2775"),
                dirEnt("wip", "2775"),
            ]
        }
        this.ChildRoot = this.Dir + "/wip"
        if (ctg == "asset") {
            this.Env = {
                "ASSET": name,
                "ASSETD": this.Dir,
            }
        } else if (ctg == "shot") {
            this.Env = {
                "SHOT": getParent(this, "group").Name + "_" + name,
                "SHOTD": this.Dir,
            }
        }
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

class PartInfo {
    Subdirs: Dir[]
    Programs: { [k: string]: [program.Program, string] }

    constructor(opt) {
        this.Subdirs = opt.subdirs
        this.Programs = opt.Programs
    }
}

let partInfo = {
    "asset": {
        "model": new PartInfo({
            Subdirs: [
                dirEnt("", "2775"),
            ],
            Programs: {
                "maya": [program.Maya, ""],
            },
        }),
        "look": new PartInfo({
            Subdirs: [
                dirEnt("", "2775"),
            ],
            Programs: {
                "maya": [program.Maya, ""],
            },
        }),
        "rig": new PartInfo({
            Subdirs: [
                dirEnt("", "2775"),
            ],
            Programs: {
                "maya": [program.Maya, ""],
            },
        }),
    },
    "shot": {
        "lit": new PartInfo({
            Subdirs: [
                dirEnt("", "2775"),
            ],
            Programs: {
                "maya": [program.Maya, ""],
            },
        }),
        "fx": new PartInfo({
            Subdirs: [
                dirEnt("", "2775"),
                dirEnt("precomp", "2775"),
            ],
            Programs: {
                "houdini": [program.Houdini, ""],
                "nuke": [program.Nuke, "precomp"],
            },
        }),
        "comp": new PartInfo({
            Subdirs: [
                dirEnt("", "2775")
            ],
            Programs: {
                "nuke": [program.Nuke, ""],
            }
        }),
    },
}

class Part {
    Parent: Branch
    Type: string
    Label: string
    Name: string
    Dir: string
    Subdirs: Dir[]
    ChildRoot: string
    Env: { [k: string]: string }
    Programs: [program.Program, string][]

    constructor(parent: Unit, name) {
        this.Parent = parent
        this.Type = "part"
        this.Label = "파트"
        this.Name = name
        this.Dir = parent.ChildRoot + "/" + name
        let ctg = getParent(this, "category").Name
        this.Subdirs = partInfo[ctg][this.Name].Subdirs
        this.ChildRoot = this.Dir
        this.Env = {
            "PART": name,
            "PARTD": this.Dir,
        }
        this.Programs = partInfo[ctg][this.Name].Programs
    }
    Program(name: string): [program.Program, string] {
        let [p, at] = this.Programs[name]
        if (!p) {
            throw Error("no " + name + " program")
        }
        return [p, at]
    }
    Task(name: string): Task {
        for (let prog in this.Programs) {
            let [pg, at] = this.Programs[prog]
            let dir = this.Dir
            if (at) {
                dir += "/" + at
            }
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
        for (let prog in this.Programs) {
            let [pg, at] = this.Programs[prog]
            let dir = this.Dir
            if (at) {
                dir += "/" + at
            }
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
        let [pg, at] = this.Program(prog)
        let dir = this.Dir
        if (at) {
            dir += "/" + at
        }
        let scene = dir + "/" + this.SceneName(task, ver) + pg.Ext
        let env = getEnviron(this)
        pg.CreateScene(scene, env)
    }
    OpenTask(prog: string, task: string, ver: string, handleError: (err: Error) => void) {
        let [pg, at] = this.Program(prog)
        let dir = this.Dir
        if (at) {
            dir += "/" + at
        }
        let scene = dir + "/" + this.SceneName(task, ver) + pg.Ext
        let env = getEnviron(this)
        pg.OpenScene(scene, env, handleError)
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

function getEnviron(b: Branch): { [k: string]: string } {
    let env = cloneEnv()
    // 계층 아래의 환경변수가 우선이다
    while (true) {
        for (let k in b.Env) {
            if (!env[k]) {
                env[k] = b.Env[k]
            }
        }
        b = b.Parent
        if (!b) {
            break
        }
    }
    return env
}

import * as fs from "fs"
import * as proc from "child_process"

let Site: Root
let siteRoot = ""

// Init은 사이트 설정을 초기화한다.
export function Init() {
    siteRoot = process.env.SITE_ROOT
    if (!siteRoot) {
        throw Error("Elo를 사용하시기 전, 우선 SITE_ROOT 환경변수를 설정해 주세요.")
    }
    Site = new Root("2L")
}

export function Projects() {
    return Site.Shows()
}

export function CreateShow(prj: string) {
    return Site.CreateShow(prj)
}

export function GroupsOf(prj: string, ctg: string) {
    return Site.Show(prj).Groups(ctg)
}

export function CreateGroup(prj: string, ctg: string, grp: string) {
    return Site.Show(prj).CreateGroup(ctg, grp)
}

export function UnitsOf(prj: string, ctg: string, grp: string) {
    return Site.Show(prj).Group(ctg, grp).Units()
}

export function CreateUnit(prj: string, ctg: string, grp: string, unit: string) {
    return Site.Show(prj).Group(ctg, grp).CreateUnit(unit)
}

export function PartsOf(prj: string, ctg: string, grp: string, unit: string) {
    return Site.Show(prj).Group(ctg, grp).Unit(unit).Parts()
}

export function CreatePart(prj: string, ctg: string, grp: string, unit: string, part: string) {
    return Site.Show(prj).Group(ctg, grp).Unit(unit).CreatePart(part)
}


export function TasksOf(prj: string, ctg: string, grp: string, unit: string, part: string): Task[] {
    let programs = Site.Show(prj).Group(ctg, grp).Unit(unit).Part(part).Programs()
    let tasks = []
    for (let p of programs) {
        for (let t of p.ListTasks(prj, grp, unit, part)) {
            tasks.push(t)
        }
    }
    tasks.sort(function(a, b) {
        return compare(a.Name, b.Name)
    })
    return tasks
}

export function CreateTask(prj: string, ctg: string, grp: string, unit: string, part: string, task: string, prog: string) {
    let programs = Site.Show(prj).Group(ctg, grp).Unit(unit).Part(part).Programs()
    let p = programs[prog]
    let scene = p.SceneName(prj, grp, unit, part, task, "v001")
    let env = cloneEnv()
    let sceneEnv = this.SceneEnviron(prj, grp, unit, part, task)
    for (let e in sceneEnv) {
        env[e] = sceneEnv[e]
    }
    p.CreateScene(scene, env)
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

class Root implements Branch {
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

class Show {
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
    }
    categoryGroup(ctg: string, name: string): Group {
        if (ctg == "asset") {
            return new AssetGroup(this, name)
        }
        if (ctg == "shot") {
            return new ShotGroup(this, name)
        }
        throw Error("invalid category name: " + ctg)
    }
    CreateGroup(ctg: string, name: string) {
        let group = this.categoryGroup(ctg, name)
        for (let d of group.Subdirs) {
            makeDirAt(group.Dir, d)
        }
    }
    Group(ctg: string, name): Group {
        let group = this.categoryGroup(ctg, name)
        if (!fs.existsSync(group.Dir)) {
            throw Error("no group: " + name)
        }
        return group
    }
    Groups(ctg: string): Group[] {
        let children = []
        let groupRoot = this.ChildRoot + "/" + ctg
        for (let d in listDirs(groupRoot)) {
            children.push(this.Group(ctg, d))
        }
        return children
    }
}

type Group = AssetGroup | ShotGroup

class AssetGroup {
    Parent: Branch
    Type: string
    Label: string
    Name: string
    Dir: string
    Subdirs: Dir[]
    ChildRoot: string

    constructor(parent: Show, name) {
        this.Parent = parent
        this.Type = "group"
        this.Label = "그룹"
        this.Name = name
        this.Dir = parent.ChildRoot + "/asset/" + name
        this.Subdirs = [
            dirEnt("", "2775"),
        ]
        this.ChildRoot = this.Dir
    }
    CreateUnit() {
        let unit = new AssetUnit(this, name)
        for (let d of unit.Subdirs) {
            makeDirAt(unit.Dir, d)
        }
    }
    Unit(name: string): AssetUnit {
        let unit = new AssetUnit(this, name)
        if (!fs.existsSync(unit.Dir)) {
            throw Error("no unit: " + name)
        }
        return unit
    }
    Units(): AssetUnit[] {
        let children = []
        for (let d of listDirs(this.ChildRoot)) {
            children.push(this.Unit(d))
        }
        return children
    }
}

class AssetUnit {
    Parent: Branch
    Type: string
    Label: string
    Name: string
    Dir: string
    Subdirs: Dir[]
    ChildRoot: string

    constructor(parent: AssetGroup, name) {
        this.Parent = parent
        this.Type = "unit"
        this.Label = "애셋"
        this.Name = name
        this.Dir = parent.ChildRoot + "/" + name
        this.Subdirs = [
            dirEnt("", "2775"),
        ]
        this.ChildRoot = this.Dir + "/wip"
    }
    CreatePart(name: string) {
        let part = new AssetPart(this, name)
        for (let d of part.Subdirs) {
            makeDirAt(part.Dir, d)
        }
    }
    Part(name: string): AssetPart {
        return new AssetPart(this, name)
    }
    Parts(): AssetPart[] {
        let children = []
        for (let d of listDirs(this.ChildRoot)) {
            children.push(this.Part(d))
        }
        return children
    }
}

class AssetPart {
    Parent: Branch
    Type: string
    Label: string
    Name: string
    Dir: string
    Subdirs: Dir[]
    ChildRoot: string

    constructor(parent: AssetUnit, name) {
        this.Parent = parent
        this.Type = "part"
        this.Label = "파트"
        this.Name = name
        this.Dir = parent.ChildRoot + "/" + name
        this.Subdirs = [
            dirEnt("", "2775"),
        ]
        this.ChildRoot = this.Dir
    }
    Programs(): Program[] {
        let programs = assetPartPrograms[this.Name]
        if (!programs) {
            throw Error("unknown part for asset")
        }
        return programs
    }
}

let assetPartPrograms = {
    "model": {
        "maya": function(taskDir) { return newMayaAt(taskDir) },
    },
    "lookdev": {
        "nuke": function(taskDir) { return newMayaAt(taskDir) },
    },
    "rig": {
        "nuke": function(taskDir) { return newMayaAt(taskDir) },
    },
}

class ShotGroup {
    Parent: Branch
    Type: string
    Label: string
    Name: string
    Dir: string
    Subdirs: Dir[]
    ChildRoot: string

    constructor(parent: Show, name) {
        this.Parent = parent
        this.Type = "group"
        this.Label = "시퀀스"
        this.Name = name
        this.Dir = parent.ChildRoot + "/shot/" + name
        this.Subdirs = [
            dirEnt("", "2775"),
        ]
        this.ChildRoot = this.Dir
    }
    CreateUnit(name: string) {
        let unit = new ShotUnit(this, name)
        for (let d of unit.Subdirs) {
            makeDirAt(unit.Dir, d)
        }
    }
    Unit(name: string): ShotUnit {
        let unit = new ShotUnit(this, name)
        if (!fs.existsSync(unit.Dir)) {
            throw Error("no unit: " + unit.Dir)
        }
        return unit
    }
    Units(): ShotUnit[] {
        let children = []
        for (let d of listDirs(this.ChildRoot)) {
            children.push(this.Unit(d))
        }
        return children
    }
}

class ShotUnit {
    Parent: Branch
    Type: string
    Label: string
    Name: string
    Dir: string
    Subdirs: Dir[]
    ChildRoot: string

    constructor(parent: ShotGroup, name) {
        this.Parent = parent
        this.Type = "unit"
        this.Label = "샷"
        this.Name = name
        this.Dir = parent.ChildRoot + "/" + name
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
            dirEnt("work", "2775"),
        ]
        this.ChildRoot = this.Dir + "/wip"
    }
    CreatePart(name: string) {
        let part = new ShotPart(this, name)
        for (let d of this.Subdirs) {
            makeDirAt(this.Dir, d)
        }
    }
    Part(name: string): ShotPart {
        let part = new ShotPart(this, name)
        if (!fs.existsSync(part.Dir)) {
            throw Error("no part: " + part.Dir)
        }
        return part
    }
    Parts(): ShotPart[] {
        let children = []
        for (let d of listDirs(this.ChildRoot)) {
            children.push(this.Part(d))
        }
        return children
    }
}

class ShotPart implements Branch {
    Parent: Branch
    Type: string
    Label: string
    Name: string
    Dir: string
    Subdirs: Dir[]
    ChildRoot: string

    constructor(parent: ShotUnit, name) {
        this.Parent = parent
        this.Type = "part"
        this.Label = "파트"
        this.Name = name
        this.Dir = parent.ChildRoot + "/" + name
        this.Subdirs = [
            dirEnt("", "2775"),
        ]
        this.ChildRoot = this.Dir
    }
    Programs(): Program[] {
        let programs = shotPartPrograms[this.Name]
        if (!programs) {
            throw Error("unknown part for asset")
        }
        return programs
    }
}

class Task {
    Name: string
    Program: string
    Versions: string[]

    constructor(name, program) {
        this.Name = name
        this.Program = program
        this.Versions = []
    }
}

let shotPartPrograms = {
    "lit": {
        "maya": function(taskDir) { return newMayaAt(taskDir) },
    },
    "fx": {
        "houdini": function(taskDir) { return newHoudiniAt(taskDir) },
        "nuke": function(taskDir) { return newNukeAt(taskDir + "/precomp") },
    },
    "comp": {
        "nuke": function(taskDir) { return newNukeAt(taskDir) },
    },
}

// Program은 씬을 생성하고 실행할 프로그램이다.
class Program {
    Name: string
    Dir: string
    Ext: string
    CreateScene: (scene: string, env: { [k: string]: string }) => void
    OpenScene: (scene: string, env: { [k: string]: string }, handleError: object) => void
    constructor(name, dir, ext, CreateScene, OpenScene) {
        this.Name = name
        this.Dir = dir
        this.Ext = ext
        this.CreateScene = CreateScene
        this.OpenScene = OpenScene
    }
    SceneName(prj, grp, unit, part, task, ver): string {
        let scene = this.Dir + "/" + prj + "_" + grp + "_" + unit + "_" + part + "_" + task + "_" + ver + this.Ext
        return scene
    }
    ListTasks(prj, grp, unit, part): Task[] {
        let taskMap = {}
        let files = fs.readdirSync(this.Dir)
        for (let f of files) {
            if (!fs.lstatSync(this.Dir + "/" + f).isFile()) {
                continue
            }
            if (!f.endsWith(this.Ext)) {
                continue
            }
            f = f.substring(0, f.length - this.Ext.length)
            let prefix = prj + "_" + grp + "_" + unit + "_" + part + "_"
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
                taskMap[task] = new Task(task, this)
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
}

// newMayaAt은 지정된 위치에 마야 씬을 생성하거나 여는 프로그램을 반환한다.
function newMayaAt(dir: string): Program {
    let maya = new Program(
        // name
        "maya",
        // dir
        dir,
        // ext
        ".mb",
        // CreateScene
        function(scene, env) {
            let cmd = siteRoot + "/runner/maya_create.sh"
            if (process.platform == "win32") {
                cmd = siteRoot + "/runner/maya_create.bat"
            }
            proc.execFileSync(cmd, [scene], { "env": env })
        },
        // OpenScene
        function(scene, env, handleError) {
            let cmd = siteRoot + "/runner/maya_open.sh"
            if (process.platform == "win32") {
                cmd = siteRoot + "/runner/maya_open.bat"
            }
            mySpawn(cmd, [scene], { "env": env, "detached": true }, handleError)
        }
    )
    return maya
}

// newHoudiniAt은 지정된 위치에 후디니 씬을 생성하거나 여는 프로그램을 반환한다.
function newHoudiniAt(dir: string): Program {
    let houdini = new Program(
        // name
        "houdini",
        // dir
        dir,
        // ext
        ".hip",
        // CreateScene
        function(scene, env) {
            let cmd = siteRoot + "/runner/houdini_create.sh"
            if (process.platform == "win32") {
                cmd = siteRoot + "/runner/houdini_create.bat"
            }
            proc.execFileSync(cmd, [scene], { "env": env })
        },
        // OpenScene
        function(scene, env, handleError) {
            let cmd = siteRoot + "/runner/houdini_open.sh"
            if (process.platform == "win32") {
                cmd = siteRoot + "/runner/houdini_open.bat"
            }
            mySpawn(cmd, [scene], { "env": env, "detached": true }, handleError)
        }
    )
    return houdini
}

// newNukeAt은 지정된 위치에 누크 씬을 생성하거나 여는 프로그램을 반환한다.
function newNukeAt(dir: string): Program {
    let nuke = new Program(
        // name
        "nuke",
        // dir
        dir,
        // ext
        ".nk",
        // CreateScene
        function(scene, env) {
            let cmd = siteRoot + "/runner/nuke_create.sh"
            if (process.platform == "win32") {
                cmd = siteRoot + "/runner/nuke_create.bat"
            }
            proc.execFileSync(cmd, [scene], { "env": env })
        },
        // OpenScene
        function(scene, env, handleError) {
            let cmd = siteRoot + "/runner/nuke_open.sh"
            if (process.platform == "win32") {
                cmd = siteRoot + "/runner/nuke_open.bat"
            }
            mySpawn(cmd, [scene], { "env": env, "detached": true }, handleError)
        },
    )
    return nuke
}

function mySpawn(cmd: string, args: string[], opts: object, handleError: (err) => void) {
    let p = proc.spawn(cmd, args, opts)
    let stderr = ""
    p.stderr.on("data", (data) => {
        stderr += data
    })
    p.on("exit", (code) => {
        if (code != 0) {
            let err = new Error("exit with error " + code + ": " + stderr)
            handleError(err)
        }
    })
    p.on("error", (err) => {
        handleError(err)
    })
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
    let dirs: string[]
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

Init()


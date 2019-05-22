// site.js를 자신의 사이트(스튜디오)에 맞는 설정으로 수정하세요.
//
// 아래는 elo.js에서 불러서 사용 가능해야 하는 함수의 리스트입니다.
//
// Init()
//
// Projects() => []string
// CreateProject(prj)
// ProjectDir(prj)
//
// ShotsOf(prj) => []string
// CreateShot(prj, shot)
// ShotDir(prj, shot)
//
// ShotTasks() => []string
// ShotTasksOf(prj, shot) => []string
// CreateShotTask(prj, shot, part)
// ShotTaskDir(prj, shot)
//
// ShotElementsOf(prj, shot, part) => [string]Element
// CreateShotElement(prj, shot, part, task, prog)
//
// ShotProgramsOf(prj, shot, task) => [string]Program
//

const fs = require("fs")
const proc = require("child_process")

// Init은 사이트 설정을 초기화한다.
function Init() {
    let prjRoot = projectRoot()
    if (!prjRoot) {
        throw Error("Elo를 사용하시기 전, 우선 PROJECT_ROOT 또는 SITE_ROOT 환경변수를 설정해 주세요.")
    }
    if (!fs.existsSync(prjRoot)) {
        fs.mkdirSync(prjRoot)
    }
}
exports.Init = Init

// 루트

// projectRoot는 사이트의 프로젝트 루트를 반환한다.
// 만일 아직 잡혀있지 않다면 null을 반환한다.
function projectRoot() {
    if (process.env.PROJECT_ROOT) {
        return process.env.PROJECT_ROOT.replace(/\\/g, "/")
    }
    if (process.env.SITE_ROOT) {
        return process.env.SITE_ROOT.replace(/\\/g, "/") + "/project"
    }
    return null
}

// 프로젝트

// ProjectDir은 해당 프로젝트의 디렉토리 경로를 반환한다.
function ProjectDir(prj) {
    return projectRoot() + "/" + prj
}
exports.ProjectDir = ProjectDir

// Projects는 사이트의 프로젝트들을 반환한다.
function Projects() {
    let d = projectRoot()
    return childDirs(d)
}
exports.Projects = Projects

// CreateProject는 프로젝트를 생성한다. 생성할 권한이 없다면 에러가 난다.
function CreateProject(prj) {
    let prjDir = ProjectDir(prj)
    if (fs.existsSync(prjDir)) {
        throw Error("프로젝트 디렉토리가 이미 존재합니다.")
    }
    fs.mkdirSync(prjDir, { recursive: true })
    createDirs(prjDir, projectSubdirs)
}
exports.CreateProject = CreateProject

// projectSubdirs는 사이트의 프로젝트 디렉토리 구조를 정의한다.
let projectSubdirs = [
        subdir("asset", "0755"),
        subdir("asset/char", "2775"),
        subdir("asset/env", "2775"),
        subdir("asset/prop", "2775"),
        subdir("doc", "0755"),
        subdir("doc/cglist", "0755"),
        subdir("doc/credit", "0755"),
        subdir("doc/droid", "0755"),
        subdir("edit", "0755"),
        subdir("ref", "0755"),
        subdir("lut", "0755"),
        subdir("source", "0755"),
        subdir("scan", "0755"),
        subdir("vendor", "0755"),
        subdir("vendor/input", "0755"),
        subdir("vendor/output", "0755"),
        subdir("review", "2775"),
        subdir("output", "2775"),
        subdir("shot", "2775"),
]

// 카테고리

// Category는 샷, 애셋 같은 작업 카테고리를 의미한다.
class Category {
    constructor(opt) {
        this.Name = opt.Name
        this.groupRoot = opt.groupRoot
        this.unitRoot = opt.unitRoot
        this.unitSubdirs = opt.unitSubdirs
        this.Parts = opt.Parts
        this.partRoot = opt.partRoot
        this.partSubdirs = opt.partSubdirs
        this.defaultTasksInfo = opt.defaultTasksInfo
        this.programs = opt.programs
    }

    // 그룹
    GroupDir(prj, grp) {
        return this.groupRoot(prj) + "/" + grp
    }
    GroupsOf(prj) {
        let d = this.groupRoot(prj)
        return childDirs(d)
    }
    CreateGroup(prj, grp) {
        console.log(prj, grp)
        let d = this.GroupDir(prj, grp)
        console.log(d)
        fs.mkdirSync(d)
    }

    // 유닛
    UnitDir(prj, grp, unit) {
        return this.unitRoot(prj, grp) + "/" + unit
    }
    UnitsOf(prj, grp) {
        let d = this.unitRoot(prj, grp)
        return childDirs(d)
    }
    CreateUnit(prj, grp, unit) {
        let d = this.UnitDir(prj, grp, unit)
        fs.mkdirSync(d)
        createDirs(d, this.unitSubdirs)
    }

    // 파트
    PartDir(prj, grp, unit, part) {
        return this.partRoot(prj, grp, unit) + "/" + part
    }
    PartsOf(prj, grp, unit) {
        let d = this.partRoot(prj, grp, unit)
        return childDirs(d)
    }
    CreatePart(prj, grp, unit, part) {
        let d = this.PartDir(prj, grp, unit, part)
        fs.mkdirSync(d)
        let subdirs = this.partSubdirs[part]
        if (!subdirs) {
            return
        }
        createDirs(d, subdirs)
        // 해당 파트의 기본 태스크 생성
        let tasksInfo = this.defaultTasksInfo[part]
        if (tasksInfo) {
            for (let ti of tasksInfo) {
                this.CreateTask(prj, grp, unit, part, "v001", ti.name, ti.prog)
            }
        }
    }

    // 태스크
    TasksOf(prj, grp, unit, part) {
        let partdir = this.PartDir(prj, grp, unit, part)
        let progs = this.ProgramsOf(prj, grp, unit, part)
        if (!progs) {
            return {}
        }
        let tasks = {}
        for (let prog in progs) {
            let p = progs[prog]
            Object.assign(tasks, p.ListTasks(prj, grp, unit, part))
        }
        return tasks
    }
    CreateTask(prj, grp, unit, part, task, ver, prog) {
        if (!this.PartsOf(prj, grp, unit).includes(part)) {
            throw Error("해당 파트가 없습니다.")
        }
        let partdir = this.PartDir(prj, grp, unit, part)
        if (!partdir) {
            throw Error("파트 디렉토리가 없습니다.")
        }
        if (!task) {
            throw Error("태스크를 선택하지 않았습니다.")
        }
        if (!prog) {
            throw Error("프로그램을 선택하지 않았습니다.")
        }
        let progs = this.ProgramsOf(prj, grp, unit, part)
        let p = progs[prog]
        let scene = p.SceneName(prj, grp, unit, part, task, ver)
        let env = p.Env(prj, grp, unit, part, task)
        let sceneEnv = this.SceneEnviron(prj, grp, unit, part, task)
        p.CreateScene(scene, env, sceneEnv)
    }
    OpenTask(prj, grp, unit, part, task, prog, ver, handleError) {
        let progs = this.ProgramsOf(prj, grp, unit, part, prog)
        let p = progs[prog]
        if (!p) {
            notify(task + " 태스크에 " + prog + " 프로그램 정보가 등록되어 있지 않습니다.")
        }
        let scene = p.SceneName(prj, grp, unit, part, task, ver)
        let env = p.Env()
        let sceneEnv = this.SceneEnviron(prj, grp, unit, part, task)
        p.OpenScene(scene, env, sceneEnv, handleError)
    }

    // 씬 환경변수
    SceneEnviron(prj, grp, unit, part, task) {
        let env = {
            "PRJ": prj,
            "GROUP": grp,
            "SHOT": unit,
            "PART": part,
            "TASK": task,
            "PRJD": ProjectDir(prj),
            "GROUPD": this.GroupDir(prj, grp),
            "SHOTD": this.UnitDir(prj, grp, unit),
            "PARTD": this.PartDir(prj, grp, unit, part),
        }
        return env
    }

    // 프로그램
    ProgramsOf(prj, grp, unit, part) {
        // prj와 grp, unit은 아직 사용하지 않는다.
        let pgs = this.programs[part]
        if (!pgs) {
            throw Error("사이트에 " + part + " 파트가 정의되어 있지 않습니다.")
        }
        let partDir = this.PartDir(prj, grp, unit, part)
        let progs = {}
        for (let p in pgs) {
            let newProgramAt = pgs[p]
            progs[p] = newProgramAt(partDir)
        }
        return progs
    }
}

// Shot은 샷 카테고리이다.
let Shot = new Category({
    Name: "shot",
    groupRoot: function(prj) {
        return ProjectDir(prj) + "/shot"
    },
    unitRoot: function(prj, grp) {
        return ProjectDir(prj) + "/shot/" + grp + "/"
    },
    unitSubdirs: [
        subdir("scan", "0755"),
        subdir("scan/base", "0755"),
        subdir("scan/source", "0755"),
        subdir("ref", "0755"),
        subdir("pub", "0755"),
        subdir("pub/cam", "2775"),
        subdir("pub/geo", "2775"),
        subdir("pub/char", "2775"),
        subdir("render", "2775"),
        subdir("work", "2775"),
    ],
    Parts: [
        "fx",
        "comp",
    ],
    partRoot: function(prj, grp, unit) {
        return ProjectDir(prj) + "/shot/" + grp + "/" + unit + "/work"
    },
    partSubdirs: {
        "fx": [
            subdir("backup", "2775"),
            subdir("geo", "2775"),
            subdir("precomp", "2775"),
            subdir("preview", "2775"),
            subdir("render", "2775"),
            subdir("temp", "2775"),
        ],
        "comp": [
            subdir("render", "2775"),
            subdir("source", "2775"),
        ],
    },
    defaultTasksInfo: {
        "fx": [
            { name: "main", prog: "houdini" },
        ],
        "comp": [
            { name: "main", prog: "nuke" },
        ],
    },
    programs: {
        "fx": {
            "houdini": function(taskDir) { return newHoudiniAt(taskDir) },
            "nuke": function(taskDir) { return newNukeAt(taskDir + "/precomp") },
        },
        "comp": {
            "nuke": function(taskDir) { return newNukeAt(taskDir) },
        },
    },
})

// Asset은 애셋 카테고리이다.
let Asset = new Category({
    Name: "asset",
    groupRoot: function(prj) {
        return ProjectDir(prj) + "/asset"
    },
    unitRoot: function(prj, grp) {
        return ProjectDir(prj) + "/asset/" + grp + "/"
    },
    unitSubdirs: [
        subdir("work", "2775"),
        subdir("pub", "2775"),
    ],
    Parts: [
        "model",
        "lookdev",
        "rig",
    ],
    partRoot: function(prj, grp, unit) {
        return ProjectDir(prj) + "/asset/" + grp + "/" + unit + "/work"
    },
    partSubdirs: {
        "model": [
            subdir("high", "2775"),
            subdir("low", "2775"),
        ],
        "lookdev": [
            subdir("cache", "2775"),
        ],
        "rig": [
        ],
    },
    defaultTasksInfo: {
        "model": [
            // { name: "main", prog: "maya" },
        ],
        "lookdev": [
        ],
        "rig": [
        ],
    },
    programs: {
        "model": {
            "maya": function(taskDir) { return newMayaAt(taskDir) },
        },
        "lookdev": {
            "nuke": function(taskDir) { return newMayaAt(taskDir) },
        },
        "rig": {
            "nuke": function(taskDir) { return newMayaAt(taskDir) },
        },
    },
})

let Categories = ["shot", "asset"]
exports.Categories = Categories

let category = {
    "shot": Shot,
    "asset": Asset,
}

// current는 현재 선택된 카테고리이다.
let current = category[Categories[0]]

// Categ는 해당 카테고리를 반환한다.
function Categ(c) {
    let ctg = category[c]
    if (!ctg) {
        throw Error(c + "카테고리가 없습니다.")
    }
    return ctg
}
exports.Categ = Categ

class Task {
    constructor(name, program) {
        this.Name = name
        this.Program = program
        this.Versions = []
    }
}

// Program은 씬을 생성하고 실행할 프로그램이다.
class Program {
    constructor(name, dir, ext, Env, CreateScene, OpenScene) {
        this.Name = name
        this.Dir = dir
        this.Ext = ext
        this.Env = Env
        this.CreateScene = CreateScene
        this.OpenScene = OpenScene
    }
    SceneName(prj, unit, part, task, ver) {
        let scene = this.Dir + "/" + prj + "_" + unit + "_" + part + "_" + task + "_" + "v001" + this.Ext
        return scene
    }
    ListTasks(prj, unit, part) {
        let tasks = {}
        let files = fs.readdirSync(this.Dir)
        for (let f of files) {
            if (!fs.lstatSync(this.Dir + "/" + f).isFile()) {
                continue
            }
            if (!f.endsWith(this.Ext)) {
                continue
            }
            f = f.substring(0, f.length - this.Ext.length)
            let prefix = prj + "_" + unit + "_" + part + "_"
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
            if (!tasks[task]) {
                let vers = []
                tasks[task] = new Task(task, this, vers)
            }
            tasks[task].Versions.push(version)
        }
        return tasks
    }
}

// newMayaAt은 지정된 위치에 마야 프로그램을 생성한다.
function newMayaAt(dir) {
    let maya = new Program(
        // name
        "maya",
        // dir
        dir,
        // ext
        ".mb",
        // Env
        function() {
            if (process.platform == "win32") {
                let env = cloneEnv()
                env.PATH = "C:\\Program Files\\Autodesk\\Maya2018\\bin;" + env.PATH
                return env
            }
            return process.env
        },
        // CreateScene
        function(scene, env, sceneEnv) {
            let initScript = `
# encoding: utf-8

from maya import standalone
from maya import cmds

standalone.initialize(name="python")
cmds.file(rename="` + scene + `")
cmds.file(save=True)
`
            proc.execFileSync("mayapy", ["-c", initScript], { "env": env })
        },
        // OpenScene
        function(scene, env, sceneEnv, handleError) {
            for (let e in sceneEnv) {
                env[e] = sceneEnv[e]
            }
            proc.execFile("maya", [scene], { "env": env }, handleError)
        },
    )
    return maya
}

// newHoudiniAt은 지정된 위치에 후디니 프로그램을 생성한다.
function newHoudiniAt(dir) {
    let houdini = new Program(
        // name
        "houdini",
        // dir
        dir,
        // ext
        ".hip",
        // Env
        function() {
            if (process.platform == "win32") {
                let env = cloneEnv()
                env.PATH = "C:\\Program Files\\Side Effects Software\\Houdini 16.5.378\\bin;" + env.PATH
                return env
            }
            return process.env
        },
        // CreateScene
        function(scene, env, sceneEnv) {
            let initScript = ""
            for (let e in sceneEnv) {
                let v = sceneEnv[e]
                initScript += "\n"
                initScript += `hou.hscript("set -g ${e}=${v}")`
            }
            initScript += "\n"
            initScript += `hou.hipFile.save('${scene}')`
            proc.execFileSync("hython", ["-c", initScript], { "env": env })
        },
        // OpenScene
        function(scene, env, sceneEnv, handleError) {
            for (let e in sceneEnv) {
                env[e] = sceneEnv[e]
            }
            proc.execFile("houdini", [scene], { "env": env }, handleError)
        },
    )
    return houdini
}

// newNukeAt은 지정된 위치에 누크 프로그램을 생성한다.
function newNukeAt(dir) {
    let nuke = new Program(
        // name
        "nuke",
        // dir
        dir,
        // ext
        ".nk",
        // Env
        function() {
            if (process.platform == "win32") {
                let env = cloneEnv()
                env.PATH = "C:\\Program Files\\Nuke10.0v3;" + env.PATH
                return env
            }
            return process.env
        },
        // CreateScene
        function(scene, env, sceneEnv) {
            proc.execFileSync("python", ["-c", `import nuke;nuke.scriptSaveAs('${scene}')`], { "env": env })
        },
        // OpenScene
        function(scene, env, sceneEnv, handleError) {
            for (let e in sceneEnv) {
                env[e] = sceneEnv[e]
            }
            proc.execFile("Nuke10.0", ["--nukex", scene], { "env": env }, handleError)
        },
    )
    return nuke
}

// childDirs는 특정 디렉토리의 하위 디렉토리들을 검색하여 반환한다.
// 해당 디렉토리가 없거나 검사할 수 없다면 에러가 난다.
function childDirs(d) {
    if (!fs.existsSync(d)) {
        throw Error(d + " 디렉토리가 존재하지 않습니다.")
    }
    let cds = Array()
    fs.readdirSync(d).forEach(f => {
        let isDir = fs.lstatSync(d + "/" + f).isDirectory()
        if (isDir) {
            cds.push(f)
        }
    })
    return cds
}

// createDirs는 부모 디렉토리에 하위 디렉토리들을 생성한다.
// 만일 생성하지 못한다면 에러가 난다.
function createDirs(parentd, subdirs) {
    if (!parentd) {
        throw Error("부모 디렉토리는 비어있을 수 없습니다.")
    }
    if (subdirs.length == 0) {
        return
    }
    if (!fs.existsSync(parentd)) {
        // TODO: 부모 디렉토리 생성할 지 물어보기
    }
    for (let subd of subdirs) {
        let d = subd.name
        let perm = subd.perm
        let child = parentd + "/" + d
        fs.mkdirSync(child)
        fs.chmodSync(child, perm)
        if (process.platform == "win32") {
            // 윈도우즈에서는 위의 mode 설정이 먹히지 않기 때문에 모두에게 권한을 푼다.
            // 리눅스의 775와 윈도우즈의 everyone은 범위가 다르지만
            // 윈도우즈에서 가장 간단히 권한을 설정할 수 있는 방법이다.
            specialBit = perm.substring(0, 1)
            defaultBits = perm.substring(1, 4)
            if (defaultBits == "777" || defaultBits == "775") {
                let user = "everyone:(F)"
                if (specialBit == "2") {
                    user = "everyone:(CI)(OI)(F)"
                }
                proc.execFileSync("icacls", [child.replace(/\//g, "\\"), "/grant", user])
            }
        }
    }
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

// subdir은 서브 디렉토리의 이름과 권한을 하나의 오브젝트로 묶어 반환한다.
function subdir(name, perm) {
    if (typeof perm != "string" || perm.length != 4) {
        throw("elo에서는 파일 디렉토리 권한에 4자리 문자열 만을 사용합니다")
    }
    return { name: name, perm: perm }
}

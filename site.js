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
        subdir("asset/bg", "2775"),
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

// Shot은 (가상의) 카테고리 인터페이스를 구현한다.
class ShotCategory {
    constructor() {
        this.unitSubdirs = [
            subdir("scan", "0755"),
            subdir("scan/base", "0755"),
            subdir("scan/source", "0755"),
            subdir("ref", "0755"),
            subdir("pub", "0755"),
            subdir("pub/cam", "2775"),
            subdir("pub/geo", "2775"),
            subdir("pub/char", "2775"),
            subdir("render", "2775"),
            subdir("part", "2775"),
        ]
        this.Parts = [
            "fx",
            "comp",
        ]
        this.partSubdirs = {
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
        }
        this.defaultTasksInfo = {
            "fx": [
                { name: "main", prog: "houdini" },
            ],
            "comp": [
                { name: "main", prog: "nuke" },
            ],
        }
        this.programs = {
            "fx": {
                "houdini": function(taskDir, sceneEnvironFunc) { return newHoudiniAt(taskDir, sceneEnvironFunc) },
                "nuke": function(taskDir, sceneEnvironFunc) { return newNukeAt(taskDir + "/precomp", sceneEnvironFunc) },
            },
            "comp": {
                "nuke": function(taskDir, sceneEnvironFunc) { return newNukeAt(taskDir, sceneEnvironFunc) },
            },
        }
    }

    // 샷 유닛

    UnitDir(prj, shot) {
        return ProjectDir(prj) + "/shot/" + shot
    }

    UnitsOf(prj) {
        let d = ProjectDir(prj) + "/shot"
        return childDirs(d)
    }

    CreateUnit(prj, shot) {
        let d = this.UnitDir(prj, shot)
        fs.mkdirSync(d)
        createDirs(d, this.unitSubdirs)
    }

    // 샷 파트

    PartDir(prj, shot, part) {
        return this.UnitDir(prj, shot) + "/part/" + part
    }

    PartsOf(prj, shot) {
        let d = this.UnitDir(prj, shot) + "/part"
        return childDirs(d)
    }

    CreatePart(prj, shot, part) {
        let d = this.PartDir(prj, shot, part)
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
                this.CreateTask(prj, shot, part, ti.name, ti.prog)
            }
        }
    }

    // 샷 태스크

    TasksOf(prj, shot, part) {
        let partdir = this.PartDir(prj, shot, part)
        let progs = this.ProgramsOf(prj, shot, part)
        if (!progs) {
            return {}
        }
        let tasks = {}
        for (let prog in progs) {
            let p = progs[prog]
            Object.assign(tasks, p.ListTasks(prj, shot, part))
        }
        return tasks
    }

    CreateTask(prj, shot, part, task, ver, prog) {
        if (!this.PartsOf(prj, shot).includes(part)) {
            throw Error("해당 파트가 없습니다.")
        }
        let partdir = this.PartDir(prj, shot, part)
        if (!partdir) {
            throw Error("파트 디렉토리가 없습니다.")
        }
        if (!task) {
            throw Error("태스크를 선택하지 않았습니다.")
        }
        if (!prog) {
            throw Error("프로그램을 선택하지 않았습니다.")
        }
        let progs = this.ProgramsOf(prj, shot, part)
        let p = progs[prog]
        let scene = p.SceneName(prj, shot, part, task, ver)
        let env = p.Env(prj, shot, part, task)
        let sceneEnv = this.SceneEnviron(prj, shot, part, task)
        p.CreateScene(scene, env, sceneEnv)
    }

    OpenTask(prj, shot, part, task, prog, ver, handleError) {
        let progs = this.ProgramsOf(prj, shot, part, prog)
        let p = progs[prog]
        if (!p) {
            notify(task + " 태스크에 " + prog + " 프로그램 정보가 등록되어 있지 않습니다.")
        }
        let scene = p.SceneName(prj, shot, part, task, ver)
        let env = p.Env()
        let sceneEnv = this.SceneEnviron(prj, shot, part, task)
        p.OpenScene(scene, env, sceneEnv, handleError)
    }

    SceneEnviron(prj, shot, part, task) {
        let env = {
            "PRJ": prj,
            "SHOT": shot,
            "PART": part,
            "TASK": task,
            "PRJD": ProjectDir(prj),
            "SHOTD": this.UnitDir(prj, shot),
            "PARTD": this.PartDir(prj, shot, part),
        }
        return env
    }

    ProgramsOf(prj, shot, part) {
        // prj와 shot은 아직 사용하지 않는다.
        let pgs = this.programs[part]
        if (!pgs) {
            throw Error("사이트에 " + part + " 파트가 정의되어 있지 않습니다.")
        }
        let partDir = this.PartDir(prj, shot, part)
        let progs = {}
        for (let p in pgs) {
            let newProgramAt = pgs[p]
            progs[p] = newProgramAt(partDir)
        }
        return progs
    }
}

let Shot = new ShotCategory()
exports.Shot = Shot

let Categories = ["shot"]
exports.Categories = Categories

let category = {
    "shot": Shot,
}

// current는 현재 선택된 카테고리이다.
let current = category[Categories[0]]

// SetCurrentCategory는 카테고리를 선택한다.
function SetCurrentCategory(c) {
    let cur = category[c]
    if (!cur) {
        throw Error(c + "카테고리가 없습니다.")
    }
    current = cur
}
exports.SetCurrentCategory = SetCurrentCategory

// CurrentCategory는 현재 선택된 카테고리를 반환한다.
function CurrentCategory() {
    return current
}
exports.CurrentCategory = CurrentCategory

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
    SceneName(prj, shot, part, task, ver) {
        let scene = this.Dir + "/" + prj + "_" + shot + "_" + part + "_" + task + "_" + "v001" + this.Ext
        return scene
    }
    ListTasks(prj, shot, part) {
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
            let prefix = prj + "_" + shot + "_" + part + "_"
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

// site.js를 자신의 사이트(스튜디오)에 맞는 설정으로 수정하세요.
//
// 아래는 elo.js에서 불러서 사용 가능해야 하는 함수의 리스트입니다.
//
// projects() => []string
// createProject(prj)
//
// shotsOf(prj) => []string
// createShot(prj, shot)
//
// tasks() => []string
// tasksOf(prj, shot) => []string
// createTask(prj, shot, task)
//
// elementsOf(prj, shot, task) => [string]Element
// createElement(prj, shot, task, elem, prog)
// createDefaultElements(prj, shot, task)
//
// programsOf(prj, shot, task) => [string]Program
//

const fs = require("fs")
const proc = require("child_process")

function init() {
    let prjRoot = projectRoot()
    if (!prjRoot) {
        throw Error("Elo를 사용하시기 전, 우선 PROJECT_ROOT 또는 SITE_ROOT 환경변수를 설정해 주세요.")
    }
    if (!fs.existsSync(prjRoot)) {
        fs.mkdirSync(prjRoot)
    }
}
exports.init = init

// 루트

function projectRoot() {
    if (process.env.PROJECT_ROOT) {
        return process.env.PROJECT_ROOT
    }
    if (process.env.SITE_ROOT) {
        return process.env.SITE_ROOT + "/project"
    }
    return null
}

// 프로젝트

function projectPath(prj) {
    return projectRoot() + "/" + prj
}
exports.projectPath = projectPath

function projects() {
    let d = projectRoot()
    return childDirs(d)
}
exports.projects = projects

function createProject(prj) {
    let prjDir = projectPath(prj)
    if (fs.existsSync(prjDir)) {
        throw Error("프로젝트 디렉토리가 이미 존재합니다.")
    }
    fs.mkdirSync(prjDir, { recursive: true })
    createDirs(prjDir, projectDirs)
}
exports.createProject = createProject

projectDirs = [
    "asset",
    "doc",
    "doc/cglist",
    "doc/credit",
    "doc/droid",
    "edit",
    "ref",
    "lut",
    "source",
    "scan",
    "review",
    "output",
    "vendor",
    "vendor/input",
    "vendor/output",
    "shot",
]
exports.projectDirs = projectDirs

// 샷

function shotPath(prj, shot) {
    return projectPath(prj) + "/shot/" + shot
}
exports.shotPath = shotPath

function shotsOf(prj) {
    let d = projectPath(prj) + "/shot"
    return childDirs(d)
}
exports.shotsOf = shotsOf

function createShot(prj, shot) {
    let d = shotPath(prj, shot)
    if (fs.existsSync(d)) {
        throw Error("샷 디렉토리가 이미 존재합니다.")
    }
    fs.mkdirSync(d, { recursive: true })
    createDirs(d, shotDirs)
}
exports.createShot = createShot

shotDirs = [
    "plate",
    "source",
    "ref",
    "pub",
    "pub/cam",
    "pub/geo",
    "pub/char",
    "task",
    "render",
]
exports.shotDirs = shotDirs

// 태스크

function taskPath(prj, shot, task) {
    return shotPath(prj, shot) + "/task/" + task
}
exports.taskPath = taskPath

function tasksOf(prj, shot) {
    let d = shotPath(prj, shot) + "/task"
    return childDirs(d)
}
exports.tasksOf = tasksOf

function createTask(prj, shot, task) {
    let d = taskPath(prj, shot, task)
    if (fs.existsSync(d)) {
        throw Error("태스크 디렉토리가 이미 존재합니다.")
    }
    fs.mkdirSync(d, { recursive: true })
    let subdirs = taskDirs[task]
    if (subdirs) {
        for (let s of subdirs) {
            let sd = d + "/" + s
            fs.mkdirSync(sd)
        }
    }
}
exports.createTask = createTask

function tasks() {
    // 생성하거나 실행할 수 있는 프로그램이 정의된 태스크 전체를 반환한다.
    let ts = Array()
    for (let task in programs) {
        ts.push(task)
    }
    return ts
}
exports.tasks = tasks

taskDirs = {
    "fx": [
        "backup",
        "geo",
        "precomp",
        "preview",
        "render",
        "temp",
    ],
}
exports.taskDirs = taskDirs

// 엘리먼트

function elementsOf(prj, shot, task) {
    let taskdir = taskPath(prj, shot, task)
    let progs = programsOf(prj, shot, task)
    if (!progs) {
        return {}
    }
    let elems = {}
    for (let i in progs) {
        let p = progs[i]
        Object.assign(elems, p.listElements(prj, shot, task))
    }
    return elems
}
exports.elementsOf = elementsOf

function createElement(prj, shot, task, elem, prog) {
    if (!tasksOf(prj, shot).includes(task)) {
        throw Error("해당 태스크가 없습니다.")
    }
    let taskdir = taskPath(prj, shot, task)
    if (!taskdir) {
        throw Error("태스크 디렉토리가 없습니다.")
    }
    if (!elem) {
        throw Error("요소를 선택하지 않았습니다.")
    }
    if (!prog) {
        throw Error("프로그램을 선택하지 않았습니다.")
    }
    let progs = programsOf(prj, shot, task)
    let p = progs[prog]
    p.createElement(prj, shot, task, elem)
}
exports.createElement = createElement

function createDefaultElements(prj, shot, task) {
    let elems = defaultElements[task]
    if (elems) {
        for (let el of elems) {
            createElement(prj, shot, task, el.name, el.prog)
        }
    }
}
exports.createDefaultElements = createDefaultElements

defaultElements = {
    "fx": [
        {
            "name": "main",
            "prog": "houdini",
        },
    ],
}
exports.defaultElements = defaultElements

class Program {
    constructor(name, subdir, ext, env, createScene, openScene) {
        this.name = name
        this.subdir = subdir
        this.ext = ext
        this.env = env
        this.createScene = createScene
        this.openScene = openScene
    }
    sceneDir(prj, shot, task) {
        let dir = taskPath(prj, shot, task)
        if (this.subdir) {
            dir += "/" + this.subdir
        }
        return dir
    }
    listElements(prj, shot, task) {
        let elems = {}
        let dir = this.sceneDir(prj, shot, task)
        let files = fs.readdirSync(dir)
        for (let f of files) {
            if (!fs.lstatSync(dir + "/" + f).isFile()) {
                continue
            }
            if (!f.endsWith(this.ext)) {
                continue
            }
            f = f.substring(0, f.length - this.ext.length)
            let prefix = prj + "_" + shot + "_" + task + "_"
            if (!f.startsWith(prefix)) {
                continue
            }
            f = f.substring(prefix.length, f.length)
            let ws = f.split("_")
            if (ws.length != 2) {
                continue
            }
            let [elem, version] = ws
            if (!version.startsWith("v") || !parseInt(version.substring(1), 10)) {
                continue
            }
            if (!elems[elem]) {
                elems[elem] = {
                    "name": elem,
                    "program": this.name,
                    "versions": [],
                }
            }
            elems[elem].versions.push(version)
        }
        return elems
    }
    createElement(prj, shot, task, elem) {
        let scenedir = this.sceneDir(prj, shot, task)
        let scene = scenedir + "/" + prj + "_" + shot + "_" + task + "_" + elem + "_" + "v001" + this.ext
        let sceneEnv = {
            "PRJ": prj,
            "SHOT": shot,
            "TASK": task,
            "ELEM": elem,
        }
        try {
            this.createScene(scene, this.env(), sceneEnv)
        } catch(err) {
            if (err.errno == "ENOENT") {
                throw Error(this.name + " 씬을 만들기 위한 명령어가 없습니다.")
            }
            throw Error(this.name + " 씬 생성중 에러가 났습니다: " + err.message)
        }
    }
    openVersion(prj, shot, task, elem, ver, handleError) {
        let scenedir = this.sceneDir(prj, shot, task)
        let scene = scenedir + "/" + prj + "_" + shot + "_" + task + "_" + elem + "_" + ver + this.ext
        this.openScene(scene, this.env(), handleError)
    }
}

let FXHoudini = new Program(
    // name
    "houdini",
    // subdir
    "",
    // ext
    ".hip",
    // env
    function() {
        if (process.platform == "win32") {
            let env = cloneEnv()
            env.PATH = "C:\\Program Files\\Side Effects Software\\Houdini 16.5.378\\bin;" + env.PATH
            return env
        }
        return process.env
    },
    // createScene
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
    // openScene
    function(scene, env, handleError) {
        proc.execFile("houdini", [scene], { "env": env }, handleError)
    },
)

let FXNuke = new Program(
    // name
    "nuke",
    // subdir
    "precomp",
    // ext
    ".nk",
    // env
    function() {
        if (process.platform == "win32") {
            let env = cloneEnv()
            env.PATH = "C:\\Program Files\\Nuke10.0v3;" + env.PATH
            return env
        }
        return process.env
    },
    // createScene
    function(scene, env) {
        // 누크의 bin 디렉토리가 기본 파이썬 디렉토리 보다 PATH 앞에 잡혀있어야 함.
        proc.execFileSync("python", ["-c", `import nuke;nuke.scriptSaveAs('${scene}')`], { "env": env })
    },
    // openScene
    function(scene, env, handleError) {
        // 누크의 bin 디렉토리가 PATH에 잡혀있어야 함.
        proc.execFile("Nuke10.0", ["--nukex", scene], { "env": env }, handleError)
    },
)

programs = {
    "fx": {
        "houdini": FXHoudini,
        "nuke": FXNuke,
    },
}

function programsOf(prj, shot, task) {
    // prj와 shot은 아직 사용하지 않는다.
    let prog = programs[task]
    if (!prog) {
        throw Error("사이트에 " + task + " 태스크가 정의되어 있지 않습니다.")
    }
    return prog
}
exports.programsOf = programsOf

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

function createDirs(parentd, dirs) {
    if (!parentd) {
        throw Error("부모 디렉토리는 비어있을 수 없습니다.")
    }
    if (!dirs) {
        return
    }
    if (!fs.existsSync(parentd)) {
        // TODO: 부모 디렉토리 생성할 지 물어보기
    }
    for (let d of dirs) {
        let child = parentd + "/" + d
        if (fs.existsSync(child)) {
            continue
        }
        fs.mkdirSync(child, { recursive: true })
    }
}

function cloneEnv() {
    let env = {}
    for (let e in process.env) {
        env[e] = process.env[e]
    }
    return env
}
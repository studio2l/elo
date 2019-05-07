// site.js를 자신의 사이트(스튜디오)에 맞는 설정으로 수정하세요.
//
// 아래는 elo.js에서 불러서 사용 가능해야 하는 함수의 리스트입니다.
//
// projects() => []string
// createProject(prj)
// projectDir(prj)
//
// shotsOf(prj) => []string
// createShot(prj, shot)
// shotDir(prj, shot)
//
// tasks() => []string
// tasksOf(prj, shot) => []string
// createTask(prj, shot, task)
// taskDir(prj, shot)
//
// elementsOf(prj, shot, task) => [string]Element
// createElement(prj, shot, task, elem, prog)
// createDefaultElements(prj, shot, task)
//
// programsOf(prj, shot, task) => [string]Program
//

const fs = require("fs")
const proc = require("child_process")

// init은 사이트 설정을 초기화한다.
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

// projectDir은 해당 프로젝트의 디렉토리 경로를 반환한다.
function projectDir(prj) {
    return projectRoot() + "/" + prj
}
exports.projectDir = projectDir

// projects는 사이트의 프로젝트들을 반환한다.
function projects() {
    let d = projectRoot()
    return childDirs(d)
}
exports.projects = projects

// createProject는 프로젝트를 생성한다. 생성할 권한이 없다면 에러가 난다.
function createProject(prj) {
    let prjDir = projectDir(prj)
    if (fs.existsSync(prjDir)) {
        throw Error("프로젝트 디렉토리가 이미 존재합니다.")
    }
    fs.mkdirSync(prjDir, { recursive: true })
    for (let perm in projectDirs) {
        let dirs = projectDirs[perm]
        createDirs(prjDir, dirs, perm)
    }
}
exports.createProject = createProject

// projectDirs는 사이트의 프로젝트 디렉토리 구조를 정의한다.
let projectDirs = {
    "0755": [
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
        "vendor",
        "vendor/input",
        "vendor/output",
    ],
    "0775": [
        "asset/char",
        "asset/bg",
        "asset/prop",
        "review",
        "output",
        "shot",
    ],
}

// 샷

// shotDir은 해당 샷의 디렉토리 경로를 반환한다.
function shotDir(prj, shot) {
    return projectDir(prj) + "/shot/" + shot
}
exports.shotDir = shotDir

// shotsOf는 특정 프로젝트의 샷들을 반환한다.
function shotsOf(prj) {
    let d = projectDir(prj) + "/shot"
    return childDirs(d)
}
exports.shotsOf = shotsOf

// createShot은 특정 프로젝트에 샷을 생성한다. 생성할 권한이 없다면 에러가 난다.
function createShot(prj, shot) {
    let d = shotDir(prj, shot)
    if (fs.existsSync(d)) {
        throw Error("샷 디렉토리가 이미 존재합니다.")
    }
    fs.mkdirSync(d, { recursive: true })
    for (let perm in shotDirs) {
        let dirs = shotDirs[perm]
        createDirs(d, dirs, perm)
    }
}
exports.createShot = createShot

// shotDirs는 사이트의 샷 디렉토리 구조를 정의한다.
shotDirs = {
    "0755": [
        "scan",
        "scan/base",
        "scan/source",
        "ref",
        "pub",
        "pub/cam",
        "pub/geo",
        "pub/char",
        "task",
        "render",
    ],
}

// 태스크

// taskDir은 해당 태스크의 디렉토리 경로를 반환한다.
function taskDir(prj, shot, task) {
    return shotDir(prj, shot) + "/task/" + task
}
exports.taskDir = taskDir

// tasksOf는 특정 샷의 태스크들을 반환한다.
function tasksOf(prj, shot) {
    let d = shotDir(prj, shot) + "/task"
    return childDirs(d)
}
exports.tasksOf = tasksOf

// createTask는 특정 샷에 태스크를 생성한다. 생성할 권한이 없다면 에러가 난다.
function createTask(prj, shot, task) {
    let d = taskDir(prj, shot, task)
    if (fs.existsSync(d)) {
        throw Error("태스크 디렉토리가 이미 존재합니다.")
    }
    fs.mkdirSync(d, { recursive: true })
    let subdirs = taskDirs[task]
    if (!subdirs) {
        return
    }
    for (let perm in subdirs) {
        let dirs = subdirs[perm]
        createDirs(d, dirs, perm)
    }
}
exports.createTask = createTask

// tasks는 사이트에 정의된 태스크들을 반환한다.
function tasks() {
    // 생성하거나 실행할 수 있는 프로그램이 정의된 태스크 전체를 반환한다.
    let ts = Array()
    for (let task in programs) {
        ts.push(task)
    }
    return ts
}
exports.tasks = tasks

// taskDirs는 사이트의 태스크별 디렉토리 구조를 정의한다.
taskDirs = {
    "fx": {
        "0755": [
            "backup",
            "geo",
            "precomp",
            "preview",
            "render",
            "temp",
        ],
    },
    "comp": {
        "0755": [
            "render",
            "source",
        ],
    },
}
exports.taskDirs = taskDirs

// 요소

// elementsOf는 특정 태스크의 요소들을 반환한다.
// 반환값은 '[요소 이름]요소' 형식의 오브젝트이다.
function elementsOf(prj, shot, task) {
    let taskdir = taskDir(prj, shot, task)
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

// createElement는 특정 태스크에 요소를 생성한다.
// 요소를 생성할 때는 어떤 프로그램에 대한 요소인지도 알려주어야 한다.
// 요소를 생성할 권한이 없다면 에러가 난다.
function createElement(prj, shot, task, elem, prog) {
    if (!tasksOf(prj, shot).includes(task)) {
        throw Error("해당 태스크가 없습니다.")
    }
    let taskdir = taskDir(prj, shot, task)
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

// createDefaultElements는 특정 태스크에 미리 정의된 기본 요소들을 만든다.
// 요소를 생성할 권한이 없다면 에러가 난다.
function createDefaultElements(prj, shot, task) {
    let elems = defaultElements[task]
    if (elems) {
        for (let el of elems) {
            createElement(prj, shot, task, el.name, el.prog)
        }
    }
}
exports.createDefaultElements = createDefaultElements

// defaultElements는 태스크별 기본 요소들이다.
defaultElements = {
    "fx": [
        {
            "name": "main",
            "prog": "houdini",
        },
    ],
    "comp": [
        {
            "name": "main",
            "prog": "nuke",
        },
    ],
}
exports.defaultElements = defaultElements

// Program은 씬을 생성하고 실행할 프로그램이다.
class Program {
    constructor(name, subdir, ext, env, createScene, openScene) {
        this.name = name
        this.subdir = subdir
        this.ext = ext
        this.env = env
        this.createScene = createScene
        this.openScene = openScene
    }
    // sceneDir은 특정 프로젝트, 샷, 태스크라는 조건에서 해당 프로그램의 씬 디렉토리 경로를 반환한다.
    sceneDir(prj, shot, task) {
        // 아직 프로젝트, 샷은 씬 디렉토리 경로에 영향을 미치지 않지만 추후 사용할 가능성이 있다.
        let dir = taskDir(prj, shot, task)
        if (this.subdir) {
            dir += "/" + this.subdir
        }
        return dir
    }
    // listElements는 특정 태스크의 엘리먼트들을 찾아 반환한다.
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
                    "program": this,
                    "versions": [],
                }
            }
            elems[elem].versions.push(version)
        }
        return elems
    }
    // createElement는 해당 태스크에 엘리먼트를 생성한다. 생성할 권한이 없다면 에러가 난다.
    createElement(prj, shot, task, elem) {
        let scenedir = this.sceneDir(prj, shot, task)
        let scene = scenedir + "/" + prj + "_" + shot + "_" + task + "_" + elem + "_" + "v001" + this.ext
        let env = this.env()
        let sceneEnv = sceneEnviron(prj, shot, task, elem)
        try {
            this.createScene(scene, env, sceneEnv)
        } catch(err) {
            if (err.errno == "ENOENT") {
                throw Error(this.name + " 씬을 만들기 위한 명령어가 없습니다.")
            }
            throw Error(this.name + " 씬 생성중 에러가 났습니다: " + err.message)
        }
    }
    // openVersion은 해당 엘리먼트의 해당 버전을 연다.
    // 씬을 열기 전 작업과 관련된 환경변수를 설정한다.
    // 버전을 열 때 프로그램에서 떼어내야만 elo가 멈추지 않는다.
    // 따라서 프로그램 실행에서 에러가 났을 때 처리 방법도 이 함수에 함께 전달해야 한다.
    openVersion(prj, shot, task, elem, ver, handleError) {
        let scenedir = this.sceneDir(prj, shot, task)
        let scene = scenedir + "/" + prj + "_" + shot + "_" + task + "_" + elem + "_" + ver + this.ext
        let env = this.env()
        let sceneEnv = sceneEnviron(prj, shot, task, elem)
        for (let e in sceneEnv) {
            env[e] = sceneEnv[e]
        }
        this.openScene(scene, env, handleError)
    }
}

// sceneEnviron은 해당 요소 작업에 필요한 환경변수들을 반환한다.
function sceneEnviron(prj, shot, task, elem) {
    let env = {
        "PRJ": prj,
        "SHOT": shot,
        "TASK": task,
        "ELEM": elem,
        "PRJDIR": projectDir(prj),
        "SHOTDIR": shotDir(prj, shot),
        "TASKDIR": taskDir(prj, shot, task),
    }
    return env
}

// NewHoudiniAt은 지정된 위치에 후디니 프로그램을 생성한다.
function NewHoudiniAt(subdir) {
    let houdini = new Program(
        // name
        "houdini",
        // subdir
        subdir,
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
    return houdini
}

// NewNukeAt은 지정된 위치에 누크 프로그램을 생성한다.
function NewNukeAt(subdir) {
    let nuke = new Program(
        // name
        "nuke",
        // subdir
        subdir,
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
        function(scene, env, sceneEnv) {
            // 누크의 bin 디렉토리가 기본 파이썬 디렉토리 보다 PATH 앞에 잡혀있어야 함.
            proc.execFileSync("python", ["-c", `import nuke;nuke.scriptSaveAs('${scene}')`], { "env": env })
        },
        // openScene
        function(scene, env, handleError) {
            // 누크의 bin 디렉토리가 PATH에 잡혀있어야 함.
            proc.execFile("Nuke10.0", ["--nukex", scene], { "env": env }, handleError)
        },
    )
    return nuke
}

// programs는 사이트의 태스크별 프로그램 정보를 담고 있다.
programs = {
    "fx": {
        "houdini": NewHoudiniAt(""),
        "nuke": NewNukeAt("precomp"),
    },
    "comp": {
        "nuke": NewNukeAt(""),
    },
}

// programsOf는 특정 태스크의 프로그램들을 반환한다.
// 반환값은 '[프로그램 이름]프로그램' 형식의 오브젝트이다.
function programsOf(prj, shot, task) {
    // prj와 shot은 아직 사용하지 않는다.
    let prog = programs[task]
    if (!prog) {
        throw Error("사이트에 " + task + " 태스크가 정의되어 있지 않습니다.")
    }
    return prog
}
exports.programsOf = programsOf

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
function createDirs(parentd, dirs, perm) {
    if (!parentd) {
        throw Error("부모 디렉토리는 비어있을 수 없습니다.")
    }
    if (!dirs) {
        return
    }
    if (!perm) {
        throw Error("생성할 디렉토리 권한이 정의되지 않았습니다.")
    }
    if (!fs.existsSync(parentd)) {
        // TODO: 부모 디렉토리 생성할 지 물어보기
    }
    for (let d of dirs) {
        let child = parentd + "/" + d
        if (fs.existsSync(child)) {
            continue
        }
        fs.mkdirSync(child, { recursive: true, mode: perm })
        if (process.platform == "win32") {
            // 윈도우즈에서는 위의 mode 설정이 먹히지 않기 때문에 모두에게 권한을 푼다.
            // 리눅스의 0775와 윈도우즈의 everyone은 범위가 다르지만
            // 윈도우즈에서 가장 간단히 권한을 설정할 수 있는 방법이다.
            if (perm == "0777" || perm == "0775") {
                proc.execFileSync("icacls", [child.replace(/\//g, "\\"), "/grant", "everyone:f"])
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

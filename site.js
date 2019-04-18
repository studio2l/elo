const fs = require("fs")
const proc = require("child_process")

// 루트

function projectRoot() {
    return process.env.PROJECT_ROOT
}
exports.projectRoot = projectRoot

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
    "input",
    "input/lut",
    "input/src",
    "input/scan",
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
    "src",
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
    let elems = defaultElements[task]
    if (elems) {
        for (let el of elems) {
            createElement(prj, shot, task, el.name, el.prog)
        }
    }
}
exports.createTask = createTask

tasks = [
    "model",
    "track",
    "rig",
    "ani",
    "light",
    "fx",
    "matte",
    "motion",
    "comp",
]
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
    let progs = taskPrograms(prj, shot, task)
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
    let p = program(prj, shot, task, prog)
    try {
        p.createElement(prj, shot, task, elem)
    } catch(err) {
        if (err.errno == "ENOENT") {
            throw Error(prog + " 씬 생성을 위한 " + cmd + " 명령어가 없습니다.")
        }
        throw Error(prog + " 씬 생성중 에러가 났습니다: " + err.message)
    }
}
exports.createElement = createElement

function elemsInDir(dir, prog, ext) {
    let elems = {}
    let files = fs.readdirSync(dir)
    for (let f of files) {
        if (!fs.lstatSync(dir + "/" + f).isFile()) {
            continue
        }
        if (!f.endsWith(ext)) {
            continue
        }
        f = f.substring(0, f.length - ext.length)
        let ws = f.split("_")
        if (ws.length != 4) {
            continue
        }
        let [prj, shot, elem, version] = ws
        if (!version.startsWith("v") || !parseInt(version.substring(1), 10)) {
            continue
        }
        if (!elems[elem]) {
            elems[elem] = {
                "name": elem,
                "program": prog,
                "versions": [],
            }
        }
        elems[elem].versions.push(version)
    }
    return elems
}

defaultElements = {
    "fx": [
        {
            "name": "main",
            "prog": "houdini",
        },
    ],
}
exports.defaultElements = defaultElements

sitePrograms = {
    "": {
        "": {
            "fx": {
                "houdini": {
                    "listElements": function(prj, shot, task) {
                        let scenedir = taskPath(prj, shot, task)
                        let elems = elemsInDir(scenedir, "houdini", ".hip")
                        return elems
                    },
                    "createElement": function(prj, shot, task, elem) {
                        let scenedir = taskPath(prj, shot, task)
                        let scene = scenedir + "/" + prj + "_" + shot + "_" + elem + "_" + "v001" + ".hip"
                        proc.execFileSync("hython", ["-c", `hou.hipFile.save('${scene}')`])
                    },
                    "openVersion": function(prj, shot, task, elem, ver) {
                        let scenedir = taskPath(prj, shot, task)
                        let scene = scenedir + "/" + prj + "_" + shot + "_" + elem + "_" + ver + ".hip"
                        proc.execFileSync("houdini", [scene])
                    },
                },
            },
        },
    },
}

function taskPrograms(prj, shot, task) {
    if (!sitePrograms[prj]) {
        prj = ""
    }
    let projectPrograms = sitePrograms[prj]
    if (!projectPrograms[shot]) {
        shot = ""
    }
    let shotPrograms = projectPrograms[shot]
    if (!shotPrograms[task]) {
        throw Error("사이트에 " + task + " 태스크가 정의되어 있지 않습니다.")
    }
    return shotPrograms[task]
}
exports.taskPrograms = taskPrograms

function program(prj, shot, task, prog) {
    let programs = taskPrograms(prj, shot, task)
    if (!programs[prog]) {
        throw Error(task + " 태스크에 " + prog + " 프로그램 정보가 등록되어 있지 않습니다.")
    }
    return programs[prog]
}
exports.program = program

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

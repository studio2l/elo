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
    let progs = taskPrograms[task]
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

taskPrograms = {
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
                console.log(scene)
                proc.execFileSync("houdini", [scene])
            },
        },
    }
}
exports.taskPrograms = taskPrograms

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

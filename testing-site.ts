import * as fs from "fs"
import * as proc from "child_process"

let siteRoot = ""

// Init은 사이트 설정을 초기화한다.
export function Init() {
    siteRoot = process.env.SITE_ROOT
    if (!siteRoot) {
        throw Error("Elo를 사용하시기 전, 우선 SITE_ROOT 환경변수를 설정해 주세요.")
    }
}

let typeOrder = ["site", "show", "category", "group", "unit", "part", "task"]

class Branch {
    Parent: Branch | null
    Name: string
    Type: string
    Label: string
    Dir: Dir
    Subdirs: Dir[]
    Env: { [k: string]: string }
    ChildRoot: string

    constructor(opts) {
        this.Parent = opts.Parent
        this.Name = opts.Name
        this.Type = opts.Type
        this.Label = opts.Label
        this.Dir = opts.Dir
        this.Subdirs = opts.Subdirs
        this.Env = opts.Env
        this.ChildRoot = opts.ChildRoot
    }
    Create() {
        makeDir(this.Dir)
        for (let d of this.Subdirs) {
            makeDir(d)
        }
    }
    Children() {
        if (!this.ChildRoot) {
            throw Error("leaf")
        }
        return listDirs(this.ChildRoot)
    }
}

function newSite() {
    return new Branch({
        Parent: null,
        Name: "2L",
        Type: "site",
        Label: "사이트",
        Dir: dirEnt(siteRoot, "0755"),
        Subdirs: [
            dirEnt("runner", "0755"),
            dirEnt("show", "0755"),
        ],
        Env: {
            "PROJECT_ROOT": siteRoot + "/show",
        },
        ChildRoot: siteRoot + "/show"
    })
}

function newShow(parent, name) {
    let dir = parent.ChildRoot + "/" + name
    return new Branch({
        Parent: parent,
        Name: name,
        Type: "show",
        Label: "쇼",
        Env: {
            "SHOW": name,
            "SHOWD": dir,
            "ASSET_ROOT": dir + "/asset",
            "SHOT_ROOT": dir + "/shot",
        },
        Dir: dirEnt(dir, "0755"),
        Subdirs: [
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
        ],
        ChildRoot: dir,
    })
}

function newCategory(parent, name) {
    let dir = parent.ChildRoot + "/" + name
    return new Branch({
        Parent: parent,
        Name: name,
        Type: "category",
        Label: "카테고리",
        Env: {
        },
        Dir: dirEnt(dir, "0755"),
        Subdirs: [
        ],
        ChildRoot: dir,
    })
}

function newShotGroup(parent, name) {
    let dir = parent.ChildRoot + "/" + name
    return new Branch({
        Parent: parent,
        Name: name,
        Type: "group",
        Label: "시퀀스",
        Env: {
        },
        Dir: dirEnt(dir, "0755"),
        Subdirs: [
        ],
        ChildRoot: dir,
    })
}

function newShotUnit(parent, name) {
    let dir = parent.ChildRoot + "/" + name
    return new Branch({
        Parent: parent,
        Name: name,
        Type: "unit",
        Label: "샷",
        Env: {
            "SHOT": parent.Name + "_" + name,
            "SHOTD": dir
        },
        Dir: dirEnt(dir, "0755"),
        Subdirs: [
            dirEnt("scan", "0755"),
            dirEnt("scan/base", "0755"),
            dirEnt("scan/source", "0755"),
            dirEnt("ref", "0755"),
            dirEnt("pub", "0755"),
            dirEnt("pub/cam", "2775"),
            dirEnt("pub/geo", "2775"),
            dirEnt("pub/char", "2775"),
            dirEnt("wip", "2775"),
        ],
        ChildRoot: dir + "/wip"
    })
}

function newShotPart(parent, name) {
    let dir = parent.ChildRoot + "/" + name
    return new Branch({
        Parent: parent,
        Name: name,
        Type: "part",
        Label: "파트",
        Env: {
            "PART": name,
            "PARTD": dir
        },
        Dir: dirEnt(dir, "0755"),
        Subdirs: [
        ],
        ChildRoot: dir,
    })
}

function newAssetGroup(parent, name) {
    let dir = parent.ChildRoot + "/" + name
    return new Branch({
        Parent: parent,
        Name: name,
        Type: "group",
        Label: "애셋그룹",
        Env: {
            "ASSET_TYPE": name,
        },
        Dir: dirEnt(dir, "0755"),
        Subdirs: [
        ],
        ChildRoot: dir,
    })
}

function newAssetUnit(parent, name) {
    let dir = parent.ChildRoot + "/" + name
    return new Branch({
        Parent: parent,
        Name: name,
        Type: "unit",
        Label: "애셋",
        Env: {
            "ASSET": name,
            "ASSETD": dir
        },
        Dir: dirEnt(dir, "0755"),
        Subdirs: [
            dirEnt("pub", "0755"),
            dirEnt("wip", "2775"),
        ],
        ChildRoot: dir + "/wip"
    })
}

function newAssetPart(parent, name) {
    let dir = parent.ChildRoot + "/" + name
    return new Branch({
        Parent: parent,
        Name: name,
        Type: "part",
        Label: "파트",
        Env: {
            "PART": name,
            "PARTD": dir
        },
        Dir: dirEnt(dir, "0755"),
        Subdirs: [
        ],
        ChildRoot: dir,
    })
}

function newTask(parent, name, program) {
    let dir = parent.Dir
    if (program.Dir) {
        dir += "/" + program.Dir
    }
    return new Branch({
        Parent: parent,
        Name: name,
        Type: "task",
        Label: "태스크",
        Env: {
            "TASK": name,
            "TASKD": dir
        },
        Dir: dirEnt(dir, "0755"),
        Subdirs: program.Subdirs
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
function makeDir(d: Dir) {
    fs.mkdirSync(d.name)
    fs.chmodSync(d.name, d.perm)
    if (process.platform == "win32") {
        // 윈도우즈에서는 위의 mode 설정이 먹히지 않기 때문에 모두에게 권한을 푼다.
        // 리눅스의 775와 윈도우즈의 everyone은 범위가 다르지만
        // 윈도우즈에서 가장 간단히 권한을 설정할 수 있는 방법이다.
        let specialBit = d.perm.substring(0, 1)
        let defaultBits = d.perm.substring(1, 4)
        if (defaultBits == "777" || defaultBits == "775") {
            let user = "everyone:(F)"
            if (specialBit == "2") {
                user = "everyone:(CI)(OI)(F)"
            }
            proc.execFileSync("icacls", [d.name.replace(/\//g, "\\"), "/grant", user])
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

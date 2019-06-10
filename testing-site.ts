class Project {
    constructor(name) {
        this.Name = name,
        this.Type = "project",
        this.Label = "프로젝트"
        this.Subdirs = [
            subdir("asset", "0755"),
            subdir("asset/char", "2775"),
            subdir("asset/env", "2775"),
            subdir("asset/prop", "2775"),
            subdir("doc", "0755"),
            subdir("doc/cglist", "0755"),
            subdir("doc/credit", "0755"),
            subdir("doc/droid", "0755"),
            subdir("data", "0755"),
            subdir("data/edit", "0755"),
            subdir("data/onset", "0755"),
            subdir("data/lut", "0755"),
            subdir("scan", "0755"),
            subdir("vendor", "0755"),
            subdir("vendor/in", "0755"),
            subdir("vendor/out", "0755"),
            subdir("review", "2775"),
            subdir("in", "0755"),
            subdir("out", "0755"),
            subdir("shot", "2775"),
        ]
    }
    Dir() {
        return siteRoot + "/" + name
    }
    Env() {
        let env = {}
        return env
    }
    Child(name) {
        return newShotGroup(name)
    }
    Children() {
        let children = []
        let dirs = Dirs()
        for (let d in dirs) {
            children.append(Child(name))
        }
        return children
    }
}

function newProject(name) {
    return Branch(name, "show", "쇼", [], function(name) { return newShotGroup(name) })
}

function newCategory(name) {
    if (name == "shot") {
        return Branch("shot", "category", "카테고리", [], function(name) { return newShotGroup(name) })
    }
    if (name = "asset") {
        return Branch("asset", "category", "카테고리", [], function(name) { return newAssetGroup(name) })
    }
    throw Error("no!")
}

function newShotGroup(name) {
    return Branch(name, "group", "시퀀스", [], function(name) { return newShotUnit(name) }
}

function newShotUnit(name) {
    return Branch(name, "shot", "샷", [], function(name) { return newShotPart(name) }
}

function newShotPart(name) {
    return Branch(name, "part", "파트", [], function(name) { return newShotPart(name) }
}

function newShotTask(name) {
    return Branch(name, "task", "태스크", [], function(name) { return newShotTask(name) }
}


import * as proc from "child_process"
import * as path from "path"

// 만일 $SITE_ROOT가 없다면 아래 프로그램은 제대로 동작하지 않겠지만
// 그런 경우 elo가 열릴 때 경고를 하게 되어있다.
let siteRoot = process.env["SITE_ROOT"]
siteRoot = path.normalize(siteRoot)

export function Get(name: string): Program {
    if (name == "maya") {
        return Maya
    }
    if (name == "houdini") {
        return Houdini
    }
    if (name == "nuke") {
        return Nuke
    }
    throw Error("undefined program: " + name)
}

// Program은 씬을 생성하고 실행할 프로그램이다.
export class Program {
    Name: string
    Ext: string
    CreateScene: (scene: string, env: { [k: string]: string }) => void
    OpenScene: (scene: string, env: { [k: string]: string }, handleError: (err: Error) => void) => void
    constructor(opt) {
        this.Name = opt.Name
        this.Ext = opt.Ext
        this.CreateScene = opt.CreateScene
        this.OpenScene = opt.OpenScene
    }
}

export let Maya = new Program({
    Name: "maya",
    Ext: ".mb",
    CreateScene: function(scene, env) {
        let cmd = path.join(siteRoot, "runner", "maya_create.sh")
        if (process.platform == "win32") {
            cmd = path.join(siteRoot, "runner", "maya_create.bat")
        }
        proc.execFileSync(cmd, [scene], { "env": env })
    },
    OpenScene: function(scene, env, handleError) {
        let cmd = path.join(siteRoot, "runner", "maya_open.sh")
        if (process.platform == "win32") {
            cmd = path.join(siteRoot, "runner", "maya_open.bat")
        }
        mySpawn(cmd, [scene], { "env": env, "detached": true }, handleError)
    },
})

export let Houdini = new Program({
    Name: "houdini",
    Ext: ".hip",
    CreateScene: function(scene, env) {
        let cmd = path.join(siteRoot, "runner", "houdini_create.sh")
        if (process.platform == "win32") {
            cmd = path.join(siteRoot, "runner", "houdini_create.bat")
        }
        proc.execFileSync(cmd, [scene], { "env": env })
    },
    OpenScene: function(scene, env, handleError) {
        let cmd = path.join(siteRoot, "runner", "houdini_open.sh")
        if (process.platform == "win32") {
            cmd = path.join(siteRoot, "runner", "houdini_open.bat")
        }
        mySpawn(cmd, [scene], { "env": env, "detached": true }, handleError)
    },
})

export let Nuke = new Program({
    Name: "nuke",
    Ext: ".nk",
    CreateScene: function(scene, env) {
        let cmd = path.join(siteRoot, "runner", "nuke_create.sh")
        if (process.platform == "win32") {
            cmd = path.join(siteRoot, "runner", "nuke_create.bat")
        }
        proc.execFileSync(cmd, [scene], { "env": env })
    },
    OpenScene: function(scene, env, handleError) {
        let cmd = path.join(siteRoot, "runner", "nuke_open.sh")
        if (process.platform == "win32") {
            cmd = path.join(siteRoot, "runner", "nuke_open.bat")
        }
        mySpawn(cmd, [scene], { "env": env, "detached": true }, handleError)
    },
})

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

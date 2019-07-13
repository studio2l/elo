import * as process from "process"
import * as path from "path"
import * as fs from "fs"

import * as site from "./site"

let verbose = false

function RunTest() {
	if (process.argv[2] == "-v") {
		verbose = true
	}
	let tmpRoot = path.join(__dirname, "tmp")
	process.env.SITE_ROOT = tmpRoot
	process.env.SHOW_ROOT = path.join(tmpRoot, "show")
	try {
		fs.mkdirSync(process.env.SITE_ROOT)
		fs.mkdirSync(process.env.SHOW_ROOT)
		let exampleRoot = path.join(__dirname, "example")
		copyAll(exampleRoot, tmpRoot)
		Test()
	} catch (err) {
		console.log("test failed: " + err.message)
	}
	removeAll(process.env.SITE_ROOT)
}

function copyAll(src: string, dst: string) {
	if (verbose) {
		console.log("copy: " + src + " -> " + dst)
	}
	let isDir = fs.lstatSync(src).isDirectory()
	if (!isDir) {
		fs.copyFileSync(src, dst)
	} else {
		if (!fs.existsSync(dst)) {
			fs.mkdirSync(dst)
		}
		let ents = fs.readdirSync(src)
		for (let e of ents) {
			copyAll(path.join(src, e), path.join(dst, e))
		}
	}
}

function removeAll(pth: string) {
	if (!pth) {
		throw Error("path needs to be specified")
	}
	pth = path.resolve(pth)
	if (pth.substring(0, __dirname.length) != __dirname) {
		throw Error("won't remove outside of current directory")
	}
	if (path.basename(pth) == ".") {
		throw Error("cannot remove dot(.) file by convention")
	}
	if (!fs.existsSync(pth)) {
		throw Error(pth + " not exists")
	}

	function rm(pth: string) {
		let isDir = fs.lstatSync(pth).isDirectory()
		if (isDir) {
			let ents = fs.readdirSync(pth)
			for (let e of ents) {
				rm(path.join(pth, e))
			}
			if (verbose) {
				console.log("remove: " + pth)
			}
			fs.rmdirSync(pth)
		} else {
			if (verbose) {
				console.log("remove: " + pth)
			}
			fs.unlinkSync(pth)
		}
	}
	rm(pth)
}

let testSite = {
	"test": {
		"shot": {
			"cg": {
				"0010": {
					"fx": [
						["houdini", "main", "v001"],
					]
				}
			}
		}
	}
}

function Test() {
	site.Init()
	for (let show in testSite) {
		site.CreateShow(show)
		let categories = testSite[show]
		for (let ctg in categories) {
			let groups = categories[ctg]
			for (let grp in groups) {
				site.Show(show).Category(ctg).CreateGroup(grp)
				let units = groups[grp]
				for (let unit in units) {
					site.Show(show).Category(ctg).Group(grp).CreateUnit(unit)
					let parts = units[unit]
					for (let part in parts) {
						site.Show(show).Category(ctg).Group(grp).Unit(unit).CreatePart(part)
						let tasks = units[unit]
						for (let task of tasks) {
							let { prog, name, ver } = task
							site.Show(show).Category(ctg).Group(grp).Unit(unit).Part(part).CreateTask(prog, name, ver)
						}
					}
				}
			}
		}
	}
}

RunTest()

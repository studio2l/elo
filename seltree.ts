// SelectionTree는 하위 선택들과 마지막 선택을 기억한다.
export class SelectionTree {
    sel: string
    sub: { [s: string]: SelectionTree }

    constructor() {
        this.sel = ""
        this.sub = {}
    }
    Select(k: string) {
        this.sel = k
        if (!this.sub[this.sel]) {
            this.sub[this.sel] = new SelectionTree()
        }
        return this.sub[this.sel]
    }
    Selected(): string {
        return this.sel
    }
}

export function New(): SelectionTree {
	return new SelectionTree()
}

// FromJSON은 json 오브젝트를 참조하여 SelectionTree 클래스를 만든다.
export function FromJSON(tree: SelectionTree, json: any): SelectionTree {
    tree.sel = json.sel
    tree.sub = {}
    for (let s in json.sub) {
        tree.sub[s] = new SelectionTree()
        FromJSON(tree.sub[s], json.sub[s])
    }
    return tree
}

const MainStore = require("./mainStore.js")

const JudgeDataBase = module.exports

module.exports.categoryType = "Base"

module.exports.getDefaultConstants = function() {
    return {}
}

module.exports.JudgeDataBase = class {
    constructor() {
        if (this.constructor === JudgeDataBase.JudgeDataBase) {
            throw new Error("JudgeDataBase Abstract class being instantiated")
        }
    }
}

module.exports.judgeDataExports = {}

function validateJudgeDataExport(judgeDataExport) {
    if (judgeDataExport.categoryType === undefined) {
        throw new Error(`Faild to validate judgeDataExport ${judgeDataExport}`)
    }
}

function requireAll(r) {
    r.keys().forEach((k) => {
        const judgeDataExport = r(k)
        validateJudgeDataExport(judgeDataExport)

        JudgeDataBase.judgeDataExports[judgeDataExport.categoryType] = judgeDataExport

        MainStore.constants[judgeDataExport.categoryType] = judgeDataExport.getDefaultConstants()
    })
}
requireAll(require.context("./", true, /.*judgeData.+\.js$/))

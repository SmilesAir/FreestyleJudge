const MainStore = require("./mainStore.js")

require("./judgeDataBase.less")

const JudgeDataBase = module.exports

module.exports.categoryType = "Base"

module.exports.getDefaultConstants = function() {
    return {
        generalScaler: .25
    }
}

module.exports.JudgeDataBase = class {
    constructor(routineLengthSeconds, judgeData) {
        if (this.constructor === JudgeDataBase.JudgeDataBase) {
            throw new Error("JudgeDataBase Abstract class being instantiated")
        }

        if (routineLengthSeconds === undefined || routineLengthSeconds <= 0) {
            throw new Error(`Invalid routineLengthSeconds "${routineLengthSeconds}"`)
        }

        this.routineLengthSeconds = routineLengthSeconds
        this.data = {
            judgeKey: judgeData.judgeKey,
            general: judgeData.rawScores.general
        }
    }

    calcJudgeScoreTotal() {
        throw new Error("calcJudgeScoreTotal is not implemented in child")
    }

    calcJudgeScoreCategoryOnly() {
        throw new Error("calcJudgeScoreCategoryOnly is not implemented in child")
    }

    calcJudgeScoreGeneral() {
        return this.data.general * MainStore.constants.Base.generalScaler
    }

    getJudgeWidgetDetailed() {
        throw new Error("getJudgeWidgetDetailed is not implemented in child")
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
requireAll(require.context("./", false, /^\.\/judgeData.+\.js$/))

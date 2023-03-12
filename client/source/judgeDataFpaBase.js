const MainStore = require("./mainStore.js")
const JudgeDataBase = require("./judgeDataBase.js")

require("./judgeDataFpaBase.less")

const JudgeDataFpaBase = module.exports

module.exports.categoryType = "FpaBase"

module.exports.getDefaultConstants = function() {
    return {
        generalScaler: .25
    }
}

module.exports.JudgeDataFpaBase = class extends JudgeDataBase.JudgeDataBase {
    constructor(routineLengthSeconds, judgeData) {
        super()

        if (this.constructor === JudgeDataFpaBase.JudgeDataFpaBase) {
            throw new Error("JudgeDataFpaBase Abstract class being instantiated")
        }

        if (routineLengthSeconds === undefined || routineLengthSeconds <= 0) {
            throw new Error(`Invalid routineLengthSeconds "${routineLengthSeconds}"`)
        }

        this.routineLengthSeconds = routineLengthSeconds
        this.data = {
            judgeKey: judgeData.judgeKey,
            general: judgeData.rawScores && judgeData.rawScores.general || 0
        }
    }

    calcJudgeScoreCategoryOnly() {
        throw new Error("calcJudgeScoreCategoryOnly is not implemented in child")
    }

    calcJudgeScoreGeneral() {
        return this.data.general * MainStore.constants.FpaBase.generalScaler
    }

    getJudgeWidgetDetailed() {
        throw new Error("getJudgeWidgetDetailed is not implemented in child")
    }

    addJudgePreProcessData(preProcessData) {
        throw new Error("addJudgePreProcessData is not implemented in child")
    }

    calcJudgeScoreTotal() {
        return this.calcJudgeScoreCategoryOnly() + this.calcJudgeScoreGeneral()
    }

    calcJudgeScoreEx(judgePreProcessData) {
        throw new Error("calcJudgeScoreEx is not implemented in child")
    }

    updateJudgeData(teamIndex) {
        throw new Error("updateJudgeData is not implemented in child")
    }
}

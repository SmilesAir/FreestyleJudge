
const JudgeDataBase = require("./judgeDataBase.js")
const Common = require("./common.js")
const MainStore = require("./mainStore.js")

module.exports.getDefaultConstants = function() {
    return {}
}

module.exports.categoryType = "SimpleRanking"

module.exports.JudgeDataClass = class extends JudgeDataBase.JudgeDataBase {
    constructor(routineLengthSeconds, judgeData) {
        super(routineLengthSeconds, judgeData)

        this.data = {
            ranking: judgeData.rawScores && judgeData.rawScores.ranking || undefined
        }
    }

    updateJudgeData(teamIndex) {
        let judgeData = {
            judgeKey: MainStore.judgeKey,
            categoryType: JudgeData.categoryType,
            rawScores: {
                ranking: this.data.ranking
            }
        }

        Common.updateJudgeData(teamIndex, judgeData)
    }
}

const JudgeData = module.exports

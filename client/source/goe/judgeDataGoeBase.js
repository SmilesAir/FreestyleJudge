const Common = require("../common.js")
const JudgeDataBase = require("../judgeDataBase.js")

require("./judgeDataGoeBase.less")

const JudgeDataGoeBase = module.exports

module.exports.categoryType = "GoeBase"

module.exports.getDefaultConstants = function() {
    return {
        topScoresPerMinute: 2
    }
}

module.exports.JudgeDataGoeBase = class extends JudgeDataBase.JudgeDataBase {
    constructor(routineLengthSeconds, judgeData) {
        super()

        if (this.constructor === JudgeDataGoeBase.JudgeDataGoeBase) {
            throw new Error("JudgeDataGoeBase Abstract class being instantiated")
        }

        if (routineLengthSeconds === undefined || routineLengthSeconds <= 0) {
            throw new Error(`Invalid routineLengthSeconds "${routineLengthSeconds}"`)
        }

        this.routineLengthSeconds = routineLengthSeconds
        this.maxDiffCount = Math.round(this.routineLengthSeconds / 60 * 2)
        this.data = {
            judgeKey: judgeData.judgeKey
        }
    }

    calcScoreScaling(judgePreProcessData, inValue, category) {
        let judgeCountMulti = (judgePreProcessData.techScores ? judgePreProcessData.techScores.length : 1) +
            (judgePreProcessData.subScores ? judgePreProcessData.subScores.length : 1)
        return inValue / 100 * (180 / this.routineLengthSeconds) / judgeCountMulti
    }

    calcScoreDetailed(judgePreProcessData, diffScores, goeScores, category) {
        let details = []
        let firstDiffTime = diffScores.length > 0 ? diffScores[0].time : 0
        for (let diff of diffScores) {
            let diffTimeOffset = diff.time - firstDiffTime
            let closestDelta = Number.MAX_VALUE
            let closestGoe = undefined
            let firstGoeTime = goeScores.length > 0 ? goeScores[0].time : 0
            for (let goe of goeScores) {
                let goeTimeOffset = goe.time - firstGoeTime
                let delta = Math.abs(diffTimeOffset - goeTimeOffset)
                if (closestGoe === undefined) {
                    closestGoe = goe
                    closestDelta = delta
                } else if (delta < closestDelta) {
                    closestGoe = goe
                    closestDelta = delta
                }
            }

            if (closestGoe !== undefined) {
                let score = this.calcScoreScaling(judgePreProcessData, diff.value * closestGoe.value, category)
                let detail = {
                    diff: diff,
                    goe: closestGoe,
                    score: score
                }
                details.push(detail)
            }
        }

        let totalScore = 0
        let countedScores = []
        let sorted = details.slice().sort((a, b) => b.score - a.score)
        const topScoreCount = Math.round(Common.getSelectedPoolRoutineSeconds() / 60 * JudgeDataGoeBase.getDefaultConstants().topScoresPerMinute)
        for (let i = 0; i < topScoreCount && i < sorted.length; ++i) {
            totalScore += sorted[i].score
            countedScores.push(sorted[i])
        }

        return {
            details: details,
            countedScores: countedScores,
            score: totalScore
        }
    }

    getCategoryType() {
        throw new Error("getCategoryType is not implemented in child")
    }

    calcDetailsRaw(judgePreProcessData) {
        throw new Error("calcDetailsRaw is not implemented in child")
    }

    getFullCalcDetails(judgePreProcessData) {
        throw new Error("getFullCalcDetails is not implemented in child")
    }

    calcJudgeScoreCategoryOnly(judgePreProcessData) {
        let details = this.calcDetailsRaw(judgePreProcessData)

        if (details === undefined) {
            return 0
        }

        return details.score
    }

    getJudgeWidgetDetailed() {
        throw new Error("getJudgeWidgetDetailed is not implemented in child")
    }

    addJudgePreProcessData(preProcessData) {
        throw new Error("addJudgePreProcessData is not implemented in child")
    }

    calcJudgeScoreTotal() {
        return this.calcJudgeScoreCategoryOnly()
    }

    updateJudgeData(teamIndex) {
        throw new Error("updateJudgeData is not implemented in child")
    }
}

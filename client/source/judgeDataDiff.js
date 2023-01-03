const React = require("react")

const MainStore = require("./mainStore.js")

const JudgeDataBase = require("./judgeDataBase.js")

const epsilon = .01

module.exports.categoryType = "Diff"

module.exports.getDefaultConstants = function() {
    // https://www.desmos.com/calculator/fcipcuyc8f
    return {
        categoryType: module.exports.categoryType,
        diffScaler: 2,
        offset: 0,
        power: 1.5,
        scale: .5,
        topPerSecond: .066667,
        gradientLines: [
            {
                sCountPerSecond: 0,
                eCountPerSecond: 4 / 60,
                sY: 1,
                eY: 1
            },
            {
                sCountPerSecond: 4 / 60,
                eCountPerSecond: 8 / 60,
                sY: .3,
                eY: .1
            },
            {
                sCountPerSecond: 8 / 60,
                eCountPerSecond: 16 / 60,
                sY: .1,
                eY: 0
            },
            {
                sCountPerSecond: 0,
                eCountPerSecond: Infinity,
                sY: 0,
                eY: 0
            }
        ]
    }
}

module.exports.JudgeDataClass = class extends JudgeDataBase.JudgeDataBase {
    constructor(routineLengthSeconds, judgeData) {
        super(routineLengthSeconds, judgeData)

        this.data.diffScores = judgeData.diffScores
    }

    calcJudgeScoreTotal() {
        return this.calcJudgeScoreCategoryOnly() + this.calcJudgeScoreGeneral()
    }

    sortScores(inScores) {
        let scores = inScores.slice(0)
        scores.sort((a, b) => {
            return b - a
        })

        return scores
    }

    generateGradientArray(count) {
        let gradientArray = []
        for (let i = 0; i < count; ++i) {
            for (let line of MainStore.constants.Diff.gradientLines) {
                let sX = line.sCountPerSecond * this.routineLengthSeconds - epsilon
                let eX = line.eCountPerSecond * this.routineLengthSeconds + epsilon
                if (i >= sX && i < eX) {
                    let dx = i - sX
                    let slope = (line.eY - line.sY) / (eX - sX)
                    gradientArray.push(line.sY + slope * dx)
                    break
                }
            }
        }

        return gradientArray
    }

    getAdjustedScore(score) {
        let constants = MainStore.constants.Diff
        return Math.pow(Math.max(0, score + constants.offset), constants.power) * constants.scale
    }

    getGradientScore(diffScores, adjusted, reportTier1Only) {
        let sortedScores = this.sortScores(diffScores)
        let gradientArray = this.generateGradientArray(sortedScores.length)
        let totalScore = 0
        for (let i = 0; i < sortedScores.length; ++i) {
            if (reportTier1Only !== true || gradientArray[i] > .9) {
                let score = sortedScores[i]
                totalScore += (adjusted ? this.getAdjustedScore(score) : score) * gradientArray[i]
            }
        }

        return totalScore / (4 / 60 * this.routineLengthSeconds) * MainStore.constants.Diff.diffScaler
    }

    calcJudgeScoreCategoryOnly() {
        let score = this.getGradientScore(this.data.diffScores, true)
        return score
    }

    getJudgeWidgetDetailed() {
        return (
            <div key={Math.random()}>
                Detailed
            </div>
        )
    }
}

setTimeout(() => {
    let diff = new module.exports.JudgeDataClass(180, {
        diffScores: [ 5, 5, 5, 5 ],
        general: 5
    })

    console.log("3", diff.calcJudgeScoreCategoryOnly(), diff.calcJudgeScoreGeneral(), diff.calcJudgeScoreTotal())
}, 100)

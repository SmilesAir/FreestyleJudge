const React = require("react")

const MainStore = require("./mainStore.js")
const JudgeDataBase = require("./judgeDataBase.js")
const Common = require("./common.js")

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

        this.data.diffScores = judgeData.rawScores && judgeData.rawScores.diffScores || []
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
                let eX = line.eCountPerSecond * this.routineLengthSeconds - epsilon
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

    getAverage(scores, adjusted) {
        let avg = 0
        for (let score of scores) {
            avg += adjusted ? this.getAdjustedScore(score) : score
        }

        return avg / Math.max(1, scores.length)
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

    getSortedTier1Scores() {
        let sortedScores = this.sortScores(this.data.diffScores)
        let gradientArray = this.generateGradientArray(sortedScores.length)
        for (let gradient of gradientArray) {
            if (gradient < .9) {
                sortedScores.splice(sortedScores.length - 1, 1)
            }
        }

        return sortedScores
    }

    getArrayAverage(array) {
        if (array.length === 0) {
            return 0
        }

        let sum = 0
        for (let n of array) {
            sum += n
        }

        return sum / array.length
    }

    getJudgeWidgetDetailed() {
        let phrases = []
        let sortedTier1Scores = this.getSortedTier1Scores()
        let tier1Avg = Common.round2Decimals(this.getArrayAverage(sortedTier1Scores))
        for (let phrase of this.data.diffScores) {
            let tier1ScoreIndex = sortedTier1Scores.findIndex((score) => score === phrase)
            if (tier1ScoreIndex >= 0) {
                sortedTier1Scores.splice(tier1ScoreIndex, 1)

                phrases.push(<div key={Math.random()} className="markTier1">{phrase}</div>)
            } else {
                phrases.push(<div key={Math.random()} className="mark">{phrase}</div>)
            }
        }

        let categoryOnlyScore = this.calcJudgeScoreCategoryOnly()
        let tier1Score = this.getGradientScore(this.data.diffScores, true, true)

        return (
            <div key={Math.random()} className="judgeDataDetailed">
                <div className="rawScores">
                    <div className="judgeName">
                        {`${JudgeData.categoryType} - ${Common.getPlayerNameString(this.data.judgeKey)}`}
                    </div>
                    <div className="line">
                        <label>
                            Marks
                        </label>
                        <div className="phrases">
                            {phrases}
                        </div>
                    </div>
                    <div className="line">
                        <label>
                            Phrases
                        </label>
                        <div className="value">
                            {phrases.length}
                        </div>
                    </div>
                    <div className="line">
                        <label>
                            Details
                        </label>
                        <div className="subLine">
                            <div className="subLabel">
                                Raw Avg
                            </div>
                            <div className="value">
                                {this.getAverage(this.data.diffScores)}
                            </div>
                            <div className="subLabel">
                                Tier 1 Avg
                            </div>
                            <div className="value">
                                {tier1Avg}
                            </div>
                            <div className="subLabel">
                                Tier 1
                            </div>
                            <div className="value">
                                {Common.round2Decimals(tier1Score)}
                            </div>
                            <div className="subLabel">
                                Tail
                            </div>
                            <div className="value">
                                {Common.round2Decimals(categoryOnlyScore - tier1Score)}
                            </div>
                        </div>
                    </div>
                    <div className="lastLine">
                        <label>
                            General
                        </label>
                        <div className="value">
                            {this.data.general}
                        </div>
                    </div>
                </div>
                <div className="categoryOnlyScore">
                    {Common.round2Decimals(categoryOnlyScore)}
                </div>
            </div>
        )
    }

    addJudgePreProcessData(preProcessData) {
        if (preProcessData.phraseCount === undefined) {
            preProcessData.phraseCount = [ this.data.diffScores.length ]
        } else {
            preProcessData.phraseCount.push(this.data.diffScores.length)
        }
    }

    updateJudgeData(teamIndex) {
        let judgeData = {
            judgeKey: this.data.judgeKey,
            categoryType: JudgeData.categoryType,
            rawScores: {
                diffScores: this.data.diffScores,
                general: this.data.general
            }
        }

        Common.updateJudgeData(teamIndex, judgeData)
    }
}

const JudgeData = module.exports

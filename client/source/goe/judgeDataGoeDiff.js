const React = require("react")

const MainStore = require("../mainStore.js")
const JudgeDataGoeBase = require("./judgeDataGoeBase.js")
const Common = require("../common.js")

module.exports.categoryType = "GoeDiff"

module.exports.getDefaultConstants = function() {
    return {
        categoryType: module.exports.categoryType,
    }
}

module.exports.JudgeDataClass = class extends JudgeDataGoeBase.JudgeDataGoeBase {
    constructor(routineLengthSeconds, judgeData) {
        super(routineLengthSeconds, judgeData)

        this.data.diffScores = judgeData.rawScores && judgeData.rawScores.diffScores || []
    }

    getFullCalcDetails(judgePreProcessData) {
        return {
            categoryType: module.exports.categoryType,
            details: this.calcDetailsRaw(judgePreProcessData)
        }
    }

    calcDetailsRaw(judgePreProcessData) {
        return this.data.diffScores
    }

    calcJudgeScoreCategoryOnly() {
        if (this.data.diffScores.length === 0) {
            return 0
        }

        let score = 0
        let sorted = this.data.diffScores.slice().sort((a, b) => b.value - a.value)
        let count = Math.min(this.maxDiffCount, sorted.length)
        for (let i = 0; i < count; ++i) {
            score += sorted[i].value
        }

        return score / count
    }

    getJudgeWidgetDetailed() {
        let phrases = []
        for (let phrase of this.data.diffScores) {
            phrases.push(<div key={Math.random()} className="mark">{Common.round1Decimals(phrase.value)}</div>)
        }

        let totalAvg = 0
        if (this.data.diffScores.length > 0) {
            for (let score of this.data.diffScores) {
                totalAvg += score.value
            }
            totalAvg /= this.data.diffScores.length
        }

        let categoryOnlyScore = this.calcJudgeScoreCategoryOnly()

        return (
            <div key={Math.random()} className="judgeDataDetailed">
                <div className="rawScores">
                    <div className="judgeName">
                        {Common.getJudgeNameString(JudgeData.categoryType, this.data.judgeKey)}
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
                            Total Average
                        </label>
                        <div className="value">
                            {Common.round2Decimals(totalAvg)}
                        </div>
                        <label>
                            Phrases
                        </label>
                        <div className="value">
                            {phrases.length}
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
        if (preProcessData.diffScores === undefined) {
            preProcessData.diffScores = [ this.data.diffScores ]
        } else {
            preProcessData.diffScores.push(this.data.diffScores)
        }
    }

    updateJudgeData(teamIndex) {
        let judgeData = {
            judgeKey: this.data.judgeKey,
            categoryType: JudgeData.categoryType,
            rawScores: {
                diffScores: this.data.diffScores
            }
        }

        Common.updateJudgeData(teamIndex, judgeData)
    }
}

const JudgeData = module.exports

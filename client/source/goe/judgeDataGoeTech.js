const React = require("react")

const MainStore = require("../mainStore.js")
const JudgeDataGoeBase = require("./judgeDataGoeBase.js")
const Common = require("../common.js")

module.exports.categoryType = "GoeTech"

module.exports.getDefaultConstants = function() {
    return {
        categoryType: module.exports.categoryType,
    }
}

module.exports.JudgeDataClass = class extends JudgeDataGoeBase.JudgeDataGoeBase {
    constructor(routineLengthSeconds, judgeData) {
        super(routineLengthSeconds, judgeData)

        this.data.techScores = judgeData.rawScores && judgeData.rawScores.techScores || []
    }

    getFullCalcDetails(judgePreProcessData) {
        return {
            categoryType: module.exports.categoryType,
            details: this.calcDetailsRaw(judgePreProcessData)
        }
    }

    calcDetailsRaw(judgePreProcessData) {
        if (judgePreProcessData.diffScores.length === 0) {
            return []
        }

        let ret = []
        for (let diffScores of judgePreProcessData.techScores) {
            ret.push(this.calcScoreDetailed(judgePreProcessData, diffScores, this.data.techScores))
        }

        return ret
    }

    getJudgeWidgetDetailed(judgePreProcessData) {
        let phrases = []
        for (let phrase of this.data.techScores) {
            phrases.push(<div key={Math.random()} className="mark">{Common.round1Decimals(phrase.value)}</div>)
        }

        let totalAvg = 0
        if (this.data.techScores.length > 0) {
            for (let score of this.data.techScores) {
                totalAvg += score.value
            }
            totalAvg /= this.data.techScores.length
        }

        let categoryOnlyScore = this.calcJudgeScoreCategoryOnly(judgePreProcessData)

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
        if (preProcessData.techScores === undefined) {
            preProcessData.techScores = [ this.data.techScores ]
        } else {
            preProcessData.techScores.push(this.data.techScores)
        }
    }

    updateJudgeData(teamIndex) {
        let judgeData = {
            judgeKey: this.data.judgeKey,
            categoryType: JudgeData.categoryType,
            rawScores: {
                techScores: this.data.techScores
            }
        }

        Common.updateJudgeData(teamIndex, judgeData)
    }
}

const JudgeData = module.exports

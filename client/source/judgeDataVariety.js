const React = require("react")

const MainStore = require("./mainStore.js")
const JudgeDataBase = require("./judgeDataBase.js")
const Common = require("./common.js")

module.exports.categoryType = "Variety"

module.exports.getDefaultConstants = function() {
    return {
        categoryType: module.exports.categoryType,
        varietyScaler: 2,
        basePerSecond: 0.25
    }
}

module.exports.JudgeDataClass = class extends JudgeDataBase.JudgeDataBase {
    constructor(routineLengthSeconds, judgeData) {
        super(routineLengthSeconds, judgeData)

        this.data.quantity = judgeData.rawScores && judgeData.rawScores.quantity || 0
        this.data.quality = judgeData.rawScores && judgeData.rawScores.quality || 0
    }

    calcJudgeScoreCategoryOnly() {
        let constants = MainStore.constants.Variety
        let base = this.routineLengthSeconds * constants.basePerSecond
        return this.data.quality * this.data.quantity / base * constants.varietyScaler
    }

    getJudgeWidgetDetailed() {
        let categoryOnlyScore = this.calcJudgeScoreCategoryOnly()

        return (
            <div key={Math.random()} className="judgeDataDetailed">
                <div className="rawScores">
                    <div className="judgeName">
                        {`${JudgeData.categoryType} - ${Common.getPlayerNameString(this.data.judgeKey)}`}
                    </div>
                    <div className="line">
                        <label>
                            Quantity
                        </label>
                        <div className="value">
                            {this.data.quantity}
                        </div>
                    </div>
                    <div className="line">
                        <label>
                            Quality
                        </label>
                        <div className="value">
                            {this.data.quality}
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
        // Do nothing
    }

    updateJudgeData(teamIndex) {
        let judgeData = {
            judgeKey: this.data.judgeKey,
            categoryType: JudgeData.categoryType,
            rawScores: {
                quantity: this.data.quantity,
                quality: this.data.quality,
                general: this.data.general
            }
        }

        Common.updateJudgeData(teamIndex, judgeData)
    }
}

const JudgeData = module.exports

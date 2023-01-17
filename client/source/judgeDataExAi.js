const React = require("react")

const MainStore = require("./mainStore.js")
const JudgeDataBase = require("./judgeDataBase.js")
const Common = require("./common.js")

module.exports.categoryType = "ExAi"

module.exports.getDefaultConstants = function() {
    return {
        categoryType: module.exports.categoryType,
        exScaler: 3,
        aiScaler: 2,
        startCountPerSecond: 0.08,
        endCountPerSecond: 0.333,
        xScaler: 0.5,
        scaler: 1.5,
        minExScaler: .5
    }
}

module.exports.JudgeDataClass = class extends JudgeDataBase.JudgeDataBase {
    constructor(routineLengthSeconds, judgeData) {
        super(routineLengthSeconds, judgeData)

        this.data.point1 = judgeData.rawScores && judgeData.rawScores.point1 || 0
        this.data.point2 = judgeData.rawScores && judgeData.rawScores.point2 || 0
        this.data.point3 = judgeData.rawScores && judgeData.rawScores.point3 || 0
        this.data.music = judgeData.rawScores && judgeData.rawScores.music || 0
        this.data.teamwork = judgeData.rawScores && judgeData.rawScores.teamwork || 0
        this.data.form = judgeData.rawScores && judgeData.rawScores.form || 0
    }

    calcJudgeScoreCategoryOnly() {
        let constants = MainStore.constants.ExAi
        return (this.data.music + this.data.teamwork + this.data.form) / 3 * constants.aiScaler
    }

    //https://www.wolframalpha.com/input?i=y+%3D+%28%2845+-+%28x+-+14%29+%2F+.5%29+%2F+45%29+%5E+2%2C+x+%3D+14+to+50
    getExScaler(phraseCount) {
        if (phraseCount !== undefined && this.routineLengthSeconds !== undefined) {
            let constants = MainStore.constants.ExAi
            let start = this.routineLengthSeconds * constants.startCountPerSecond
            let end = this.routineLengthSeconds * constants.endCountPerSecond
            let delta = end - start

            if (phraseCount > start) {
                let exScaler = Math.pow((delta - Math.max(0, Math.min(end, phraseCount - start) / constants.xScaler)) / delta, 2)
                return Math.max(exScaler, constants.minExScaler || .5)
            }
        }

        return 1
    }

    calcJudgeScoreExRaw() {
        let constants = MainStore.constants.ExAi
        return -1 * (this.data.point1 * .1 + this.data.point2 * .2 + this.data.point3 * .3) * constants.exScaler
    }

    calcJudgeScoreEx(judgePreProcessData) {
        if (judgePreProcessData.phraseCount === undefined || judgePreProcessData.phraseCount.length === 0) {
            console.error("No phrase count in preprocess data")
            return 0
        }

        let phraseSum = 0
        for (let phrases of judgePreProcessData.phraseCount) {
            phraseSum += phrases
        }
        let phraseCount = phraseSum / judgePreProcessData.phraseCount.length
        return this.calcJudgeScoreExRaw() * this.getExScaler(phraseCount)
    }

    getJudgeWidgetDetailed(judgePreProcessData) {
        let categoryOnlyScore = this.calcJudgeScoreCategoryOnly()

        return (
            <div key={Math.random()} className="judgeDataDetailed">
                <div className="rawScores">
                    <div className="judgeName">
                        {`${JudgeData.categoryType} - ${Common.getPlayerNameString(this.data.judgeKey)}`}
                    </div>
                    <div className="line">
                        <label>
                            AI
                        </label>
                        <div className="subLine">
                            <div className="subLabel">
                                Music
                            </div>
                            <div className="value">
                                {this.data.music}
                            </div>
                        </div>
                        <div className="subLine">
                            <div className="subLabel">
                                Teamwork
                            </div>
                            <div className="value">
                                {this.data.teamwork}
                            </div>
                        </div>
                        <div className="subLine">
                            <div className="subLabel">
                                Form
                            </div>
                            <div className="value">
                                {this.data.form}
                            </div>
                        </div>
                    </div>
                    <div className="line">
                        <label>
                            Ex
                        </label>
                        <div className="subLine">
                            <div className="subLabel">
                                .1
                            </div>
                            <div className="value">
                                {this.data.point1}
                            </div>
                            <div className="subLabel">
                                .2
                            </div>
                            <div className="value">
                                {this.data.point2}
                            </div>
                            <div className="subLabel">
                                .3
                            </div>
                            <div className="value">
                                {this.data.point3}
                            </div>
                            <div className="subLabel">
                                Raw
                            </div>
                            <div className="value">
                                {Common.round2Decimals(this.calcJudgeScoreExRaw())}
                            </div>
                            <div className="subLabel">
                                Adjusted
                            </div>
                            <div className="value">
                                {Common.round2Decimals(this.calcJudgeScoreEx(judgePreProcessData))}
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
        // Do nothing
    }

    updateJudgeData(teamIndex) {
        let judgeData = {
            judgeKey: this.data.judgeKey,
            categoryType: JudgeData.categoryType,
            rawScores: {
                general: this.data.general,
                music: this.data.music,
                teamwork: this.data.teamwork,
                form: this.data.form,
                point1: this.data.point1,
                point2: this.data.point2,
                point3: this.data.point3
            }
        }

        Common.updateJudgeData(teamIndex, judgeData)
    }
}

const JudgeData = module.exports

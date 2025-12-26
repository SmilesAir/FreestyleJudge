/* eslint-disable no-loop-func */
/* eslint-disable no-lonely-if */

const React = require("react")
const { runInAction } = require("mobx")

const MainStore = require("../mainStore.js")
const Common = require("../common.js")
const JudgeWidgetGoeBase = require("./judgeWidgetGoeBase.js")
require("./judgeWidgetGoe.less")

let baselineArray = [
    { value: 0, label: "-0" },
    { value: 5, label: "-Gitis/Flaud/Crow" },
    { value: 10, label: "-Barrel Gitis" },
    { value: 20, label: "-Double Barrel Gitis" },
    { value: 30, label: "-Triple Barrel Gitis" },
    { value: 40, label: "-Super Hard Move" },
]
baselineArray.sort((a, b) => a.value - b.value)
const baselineValueMax = baselineArray[baselineArray.length - 1].value
MainStore.configData.diffValueMax = baselineValueMax

module.exports = class JudgeWidgetGoeDiff extends JudgeWidgetGoeBase {
    constructor() {
        super()

        this.state.editScoreIndex = undefined
        this.state.scoresEditIndexMark = undefined
        this.state.scoresEditIndexTeam = undefined
    }

    onBaselineClick(newMarkTime, value) {
        runInAction(() => {
            let diffScores = this.getJudgeData().data.diffScores
            diffScores.push({
                time: newMarkTime,
                value: value
            })

            this.updateJudgeData()
        })
    }

    getJudgeWidget() {
        if (this.state.teamIndex === undefined) {
            return (
                <h2>
                    No team selected by Head Judge
                </h2>
            )
        }

        let diffScores = this.getJudgeData().data.diffScores

        return (
            <div className="judgeWidgetGoe">
                {this.getHistoryWidget(diffScores, baselineValueMax)}
                {this.getBaselineWidget(baselineArray, baselineValueMax, true)}
            </div>
        )
    }

    scoresTeamWidget() {
        let poolData = Common.getSelectedPoolData()
        if (poolData === undefined || this.judgeDataArray === undefined) {
            return null
        }

        let widgets = []
        return (
            <div className="scoreTeams">
                <div className="teams">
                    {widgets}
                </div>
            </div>
        )
    }
}

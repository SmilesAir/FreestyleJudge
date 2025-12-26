/* eslint-disable no-loop-func */
/* eslint-disable no-lonely-if */

const React = require("react")
const { runInAction } = require("mobx")

const MainStore = require("../mainStore.js")
const Common = require("../common.js")
const JudgeWidgetGoeBase = require("./judgeWidgetGoeBase.js")
require("./judgeWidgetGoe.less")

let baselineArray = [
    { value: 0, label: "-Nothing of Value" },
    { value: 40, label: "Music" },
    { value: 50, label: "Form" },
    { value: 100, label: "-All Elements Perfect" },
]
baselineArray.sort((a, b) => a.value - b.value)
const baselineValueMax = baselineArray[baselineArray.length - 1].value
MainStore.configData.subValueMax = baselineValueMax

module.exports = class JudgeWidgetGoeTech extends JudgeWidgetGoeBase {
    constructor() {
        super()

        this.state.editScoreIndex = undefined
        this.state.scoresEditIndexMark = undefined
        this.state.scoresEditIndexTeam = undefined
    }

    onBaselineClick(newMarkTime, value) {
        runInAction(() => {
            let subScores = this.getJudgeData().data.subScores
            subScores.push({
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

        let subScores = this.getJudgeData().data.subScores

        return (
            <div className="judgeWidgetGoe">
                {this.getHistoryWidget(subScores, baselineValueMax)}
                {this.getBaselineWidget(baselineArray, baselineValueMax, false)}
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

/* eslint-disable no-loop-func */
/* eslint-disable no-lonely-if */

const React = require("react")
const { runInAction } = require("mobx")

const Common = require("./common.js")
const JudgeWidgetBase = require("./judgeWidgetBase.js")

module.exports = class JudgeWidgetDiff extends JudgeWidgetBase {
    constructor() {
        super()

        this.state.editScoreIndex = undefined
        this.state.scoresEditGeneral = false
        this.state.scoresEditIndexMark = undefined
        this.state.scoresEditIndexTeam = undefined
    }

    postInitFectchEventData() {
        this.state.editScoreIndex = this.getJudgeData().data.diffScores.length
    }

    onEditScore(scoreIndex) {
        if (scoreIndex === this.state.editScoreIndex) {
            this.state.editScoreIndex = this.getJudgeData().data.diffScores.length
        } else {
            this.state.editScoreIndex = scoreIndex
        }

        this.setState(this.state)

        this.clearStopEditingTimeout()
    }

    getPhrasesWidget() {
        let scores = this.judgeDataArray && this.judgeDataArray[this.state.teamIndex].data.diffScores || []
        let blocks = []
        const blockSize = 5
        for (let i = 0; i < scores.length; i += blockSize) {
            let newScores = []
            for (let j = 0; j < blockSize && i + j < scores.length; ++j) {
                let scoreIndex = i + j
                let score = scores[scoreIndex]
                let cn = `score noselect ${scoreIndex === this.state.editScoreIndex ? "editing" : ""}`
                newScores.push(
                    <div key={i + j} className={cn} onClick={() => this.onEditScore(scoreIndex)}>
                        {score}
                    </div>
                )
            }

            blocks.push(
                <div key={i} className="block">
                    {newScores}
                </div>
            )
        }

        return (
            <div id="phrasesWidget" className="phrasesWidget">
                {blocks}
            </div>
        )
    }

    getJudgeWidget() {
        if (this.state.teamIndex === undefined) {
            return (
                <h2>
                    No team selected by Head Judge
                </h2>
            )
        }

        return (
            <div className="judgeWidgetDiff">
                {this.getPhrasesWidget()}
                <div className="diffInputNumberWidget">
                    {this.getInputNumberWidget((e) => this.onInputNumberClicked(e))}
                </div>
            </div>
        )
    }

    runStopEditingTimeout() {
        this.stopEditingTimeoutId = setTimeout(() => {
            this.state.editScoreIndex = this.getJudgeData().data.diffScores.length
            this.setState(this.state)
        }, 2000)
    }

    clearStopEditingTimeout() {
        clearTimeout(this.stopEditingTimeoutId)
    }

    scrollToBottomOfScores() {
        setTimeout(() => {
            const element = document.getElementById("phrasesWidget")
            element.scrollTop = element.scrollHeight
        }, 1)
    }

    onInputNumberClicked(value) {
        runInAction(() => {
            let diffScores = this.getJudgeData().data.diffScores
            let score = diffScores[this.state.editScoreIndex]
            if (value === "X") {
                diffScores.splice(score === undefined ? diffScores.length - 1 : this.state.editScoreIndex, 1)
                this.state.editScoreIndex = diffScores.length

                this.updateJudgeData()
            } else if (value === ".5") {
                if (score !== undefined && score !== 10 && score !== 0) {
                    if (score === Math.floor(score)) {
                        diffScores[this.state.editScoreIndex] += .5
                    } else {
                        diffScores[this.state.editScoreIndex] = Math.floor(score)
                    }

                    if (this.state.editScoreIndex !== diffScores.length - 1) {
                        this.runStopEditingTimeout()
                    }

                    this.updateJudgeData()
                }
            } else {
                if (this.state.editScoreIndex === diffScores.length - 1) {
                    ++this.state.editScoreIndex
                    diffScores[this.state.editScoreIndex] = value

                    this.scrollToBottomOfScores()
                } else {
                    diffScores[this.state.editScoreIndex] = value

                    if (this.state.editScoreIndex !== diffScores.length - 1) {
                        this.runStopEditingTimeout()
                    } else {
                        this.scrollToBottomOfScores()
                    }
                }

                this.updateJudgeData()
            }

            this.setState(this.state)
        })
    }

    clearScoresEditingState() {
        this.state.scoresEditIndexTeam = undefined
        this.state.scoresEditIndexMark = undefined
        this.state.scoresEditGeneral = false

        this.setState(this.state)
    }

    onScoresMarkClicked(teamIndex, markIndex) {
        this.state.scoresEditGeneral = false

        if (this.state.scoresEditIndexTeam === teamIndex && this.state.scoresEditIndexMark === markIndex) {
            this.state.scoresEditIndexTeam = undefined
            this.state.scoresEditIndexMark = undefined
        } else {
            this.state.scoresEditIndexTeam = teamIndex
            this.state.scoresEditIndexMark = markIndex
        }
        this.setState(this.state)
    }

    onScoresGeneralClicked(teamIndex) {
        this.state.scoresEditIndexMark = undefined

        if (this.state.scoresEditIndexTeam === teamIndex && this.state.scoresEditGeneral) {
            this.clearScoresEditingState()
        } else {
            this.state.scoresEditIndexTeam = teamIndex
            this.state.scoresEditGeneral = true
        }
        this.setState(this.state)
    }

    onScoresInputNumberClicked(value) {
        runInAction(() => {
            if (this.state.scoresEditGeneral) {
                let judgeData = this.judgeDataArray[this.state.scoresEditIndexTeam]
                let general = judgeData.data.general || 0
                if (value === ".5") {
                    if (general !== undefined && general !== 10 && general !== 0) {
                        if (general === Math.floor(general)) {
                            judgeData.data.general += .5
                        } else {
                            judgeData.data.general = Math.floor(general)
                        }

                        this.updateJudgeData()
                    }
                } else if (value !== "X") {
                    judgeData.data.general = value

                    this.updateJudgeData()
                }
            } else {
                let diffScores = this.judgeDataArray[this.state.scoresEditIndexTeam].data.diffScores
                let score = diffScores[this.state.scoresEditIndexMark]
                if (value === "X") {
                    diffScores.splice(score === undefined ? diffScores.length - 1 : this.state.scoresEditIndexMark, 1)
                    this.updateJudgeData()
                    this.clearScoresEditingState()
                } else if (value === ".5") {
                    if (score !== undefined && score !== 10 && score !== 0) {
                        if (score === Math.floor(score)) {
                            diffScores[this.state.scoresEditIndexMark] += .5
                        } else {
                            diffScores[this.state.scoresEditIndexMark] = Math.floor(score)
                        }

                        this.updateJudgeData()
                    }
                } else {
                    diffScores[this.state.scoresEditIndexMark] = value

                    this.updateJudgeData()
                }
            }

            this.setState(this.state)
        })
    }

    getScoresInput() {
        if (this.state.scoresEditIndexTeam === undefined) {
            return null
        }

        return (
            <div className="scoresInput">
                {this.getInputNumberWidget((e) => this.onScoresInputNumberClicked(e))}
            </div>
        )
    }

    scoresTeamWidget() {
        let poolData = Common.getSelectedPoolData()
        if (poolData === undefined || this.judgeDataArray === undefined) {
            return null
        }

        let widgets = []
        for (let i = 0; i < poolData.teamData.length; ++i) {
            let teamData = poolData.teamData[i]
            let playerNames = Common.getPlayerFirstNamesString(teamData.players)
            let teamJudgeData = this.judgeDataArray[i]
            let general = teamJudgeData && teamJudgeData.data && teamJudgeData.data.general || 0
            let namesCN = `names ${this.state.teamIndex === i ? "selected" : ""}`
            let marks = []
            let diffMarksCount = teamJudgeData.data.diffScores.length
            for (let j = 0; j < diffMarksCount; ++j) {
                let mark = teamJudgeData.data.diffScores[j]
                let markCN = `mark ${this.state.scoresEditIndexTeam === i && this.state.scoresEditIndexMark === j ? "editing" : ""}`
                marks.push(
                    <div key={j} className={markCN} onClick={() => this.onScoresMarkClicked(i, j)}>
                        {mark}
                    </div>
                )
            }
            let newMarkCN = `newMark ${this.state.scoresEditIndexTeam === i && this.state.scoresEditIndexMark === diffMarksCount ? "editing" : ""}`
            marks.push(
                <div key={diffMarksCount} className={newMarkCN} onClick={() => this.onScoresMarkClicked(i, diffMarksCount)}>
                    +
                </div>
            )
            let generalCN = `general ${this.state.scoresEditIndexTeam === i && this.state.scoresEditGeneral ? "editing" : ""}`
            widgets.push(
                <div key={i} className="team">
                    <div className="header">
                        <div className={namesCN}>
                            {playerNames}
                        </div>
                        <div className={generalCN} onClick={() => this.onScoresGeneralClicked(i)}>
                            {general}
                        </div>
                        <div className="total">
                            {Common.round1Decimals(teamJudgeData.calcJudgeScoreCategoryOnly())}
                        </div>
                    </div>
                    <div className="marks">
                        {marks}
                    </div>
                </div>
            )
        }

        return (
            <div className="scoreTeams">
                <div className="teams">
                    {widgets}
                </div>
                {this.getScoresInput()}
            </div>
        )
    }
}

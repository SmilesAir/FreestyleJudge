/* eslint-disable no-lonely-if */

const React = require("react")
const { runInAction } = require("mobx")

const Common = require("./common.js")
const JudgeWidgetFpaBase = require("./judgeWidgetFpaBase.js")

module.exports = class JudgeWidgetVariety extends JudgeWidgetFpaBase {
    constructor() {
        super()

        this.state.editingQuality = false
        this.state.scoresEditGeneral = false
        this.state.scoresEditQuantity = false
        this.state.scoresEditQuality = false
        this.state.scoresEditIndexTeam = undefined
    }

    postInitFectchEventData() {
    }

    onTeamChanged() {
        this.state.editingQuality = false
        this.setState(this.state)
    }

    onInputIncrementClicked(value) {
        let judgeData = this.getJudgeData()
        judgeData.data.quantity = Math.max(0, judgeData.data.quantity + value)
        this.setState(this.state)

        this.updateJudgeData()
    }

    setEditingQuantity() {
        this.state.editingQuality = false
        this.setState(this.state)
    }

    setEditingQuality() {
        this.state.editingQuality = true
        this.setState(this.state)
    }

    getJudgeWidget() {
        let judgeData = this.getJudgeData()
        if (judgeData === undefined) {
            return (
                <h2>
                    No team selected by Head Judge
                </h2>
            )
        }

        let quantityCN = `number ${this.state.editingQuality ? "" : "editing"}`
        let qualityCN = `number ${this.state.editingQuality ? "editing" : ""}`
        return (
            <div className="judgeWidgetVariety">
                <div className="numbers">
                    <div className="header">
                        <label>
                            Quantity
                        </label>
                        <label>
                            Quality
                        </label>
                    </div>
                    <div className="varietyInputs">
                        <div className={quantityCN} onClick={() => this.setEditingQuantity()}>
                            {judgeData.data.quantity}
                        </div>
                        <div className={qualityCN} onClick={() => this.setEditingQuality()}>
                            {judgeData.data.quality}
                        </div>
                    </div>
                </div>
                <div className="input">
                    {this.state.editingQuality ? this.getInputNumberWidget((e) => this.onInputNumberClicked(e)) : this.getInputIncrementWidget((e) => this.onInputIncrementClicked(e))}
                </div>
            </div>
        )
    }


    onInputNumberClicked(value) {
        runInAction(() => {
            let judgeData = this.getJudgeData()
            let quality = judgeData.data.quality
            if (value === ".5") {
                if (quality !== undefined && quality !== 10 && quality !== 0) {
                    if (quality === Math.floor(quality)) {
                        judgeData.data.quality += .5
                    } else {
                        judgeData.data.quality = Math.floor(quality)
                    }

                    this.updateJudgeData()
                }
            } else if (value !== "X") {
                judgeData.data.quality = value

                this.updateJudgeData()
            }

            this.setState(this.state)
        })
    }

    clearScoresEditingState() {
        this.state.scoresEditGeneral = false
        this.state.scoresEditQuantity = false
        this.state.scoresEditQuality = false
        this.state.scoresEditIndexTeam = undefined

        this.setState(this.state)
    }

    onScoresGeneralClicked(teamIndex) {
        this.state.scoresEditQuantity = false
        this.state.scoresEditQuality = false

        if (this.state.scoresEditIndexTeam === teamIndex && this.state.scoresEditGeneral) {
            this.clearScoresEditingState()
        } else {
            this.state.scoresEditIndexTeam = teamIndex
            this.state.scoresEditGeneral = true
        }
        this.setState(this.state)
    }

    onScoresInputIncrementClicked(value) {
        let judgeData = this.judgeDataArray[this.state.scoresEditIndexTeam]
        let quantity = judgeData.data.quantity
        judgeData.data.quantity = Math.max(0, quantity + value)

        this.updateJudgeData()
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
                let judgeData = this.judgeDataArray[this.state.scoresEditIndexTeam]
                let quality = judgeData.data.quality
                if (value === ".5") {
                    if (quality !== undefined && quality !== 10 && quality !== 0) {
                        if (quality === Math.floor(quality)) {
                            judgeData.data.quality += .5
                        } else {
                            judgeData.data.quality = Math.floor(quality)
                        }

                        this.updateJudgeData()
                    }
                } else if (value !== "X") {
                    judgeData.data.quality = value

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
                {this.state.scoresEditQuantity ? this.getInputIncrementWidget((e) => this.onScoresInputIncrementClicked(e)) : this.getInputNumberWidget((e) => this.onScoresInputNumberClicked(e))}
            </div>
        )
    }

    onScoresQuantityClicked(teamIndex) {
        if (this.state.scoresEditIndexTeam === teamIndex && this.state.scoresEditQuantity) {
            this.clearScoresEditingState()
        } else {
            this.clearScoresEditingState()
            this.state.scoresEditIndexTeam = teamIndex
            this.state.scoresEditQuantity = true
        }
        this.setState(this.state)
    }

    onScoresQualityClicked(teamIndex) {
        if (this.state.scoresEditIndexTeam === teamIndex && this.state.scoresEditQuality) {
            this.clearScoresEditingState()
        } else {
            this.clearScoresEditingState()
            this.state.scoresEditIndexTeam = teamIndex
            this.state.scoresEditQuality = true
        }
        this.setState(this.state)
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
            let quantity = teamJudgeData && teamJudgeData.data && teamJudgeData.data.quantity || 0
            let quality = teamJudgeData && teamJudgeData.data && teamJudgeData.data.quality || 0
            let namesCN = `names ${this.state.teamIndex === i ? "selected" : ""}`
            let generalCN = `general ${this.state.scoresEditIndexTeam === i && this.state.scoresEditGeneral ? "editing" : ""}`
            let quantityCN = `input ${this.state.scoresEditIndexTeam === i && this.state.scoresEditQuantity ? "editing" : ""}`
            let qualityCN = `input ${this.state.scoresEditIndexTeam === i && this.state.scoresEditQuality ? "editing" : ""}`
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
                    <div className="varietyInputs">
                        <div className={quantityCN} onClick={() => this.onScoresQuantityClicked(i)}>
                            Quantity: {quantity}
                        </div>
                        <div className={qualityCN} onClick={() => this.onScoresQualityClicked(i)}>
                            Quality: {quality}
                        </div>
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

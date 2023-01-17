/* eslint-disable no-lonely-if */

const React = require("react")
const { runInAction } = require("mobx")

const Common = require("./common.js")
const JudgeWidgetBase = require("./judgeWidgetBase.js")

module.exports = class JudgeWidgetVariety extends JudgeWidgetBase {
    constructor() {
        super()

        this.state.editingPropName = undefined
        this.state.scoresEditPropName = undefined
        this.state.scoresEditIndexTeam = undefined
    }

    postInitFectchEventData() {
    }

    onInputIncrementPoint1Clicked(value) {
        let judgeData = this.getJudgeData()
        judgeData.data.point1 = Math.max(0, judgeData.data.point1 + value)
        this.setState(this.state)

        this.updateJudgeData()
    }

    onInputIncrementPoint2Clicked(value) {
        let judgeData = this.getJudgeData()
        judgeData.data.point2 = Math.max(0, judgeData.data.point2 + value)
        this.setState(this.state)

        this.updateJudgeData()
    }

    onInputIncrementPoint3Clicked(value) {
        let judgeData = this.getJudgeData()
        judgeData.data.point3 = Math.max(0, judgeData.data.point3 + value)
        this.setState(this.state)

        this.updateJudgeData()
    }

    toggleEditingProp(propName) {
        if (this.state.editingPropName === propName) {
            this.state.editingPropName = undefined
        } else {
            this.state.editingPropName = propName
        }

        this.setState(this.state)
    }

    getJudgeWidget() {
        let judgeData = this.getJudgeData()
        if (judgeData === undefined) {
            return null
        }

        let inputNumberWidget = this.state.editingPropName !== undefined ? (
            <div className="inputNumber">
                {this.getInputNumberWidget((e) => this.onInputNumberClicked(e, this.state.editingPropName))}
            </div>
        ) : null

        let musicCN = `number ${this.state.editingPropName === "music" ? "editing" : ""}`
        let teamworkCN = `number ${this.state.editingPropName === "teamwork" ? "editing" : ""}`
        let formCN = `number ${this.state.editingPropName === "form" ? "editing" : ""}`
        return (
            <div className="judgeWidgetExAi">
                <div className="ai">
                    <div className="header">
                        <label>
                            Music
                        </label>
                        <label>
                            Teamwork
                        </label>
                        <label>
                            Form
                        </label>
                    </div>
                    <div className="aiInputs">
                        <div className={musicCN} onClick={() => this.toggleEditingProp("music")}>
                            {judgeData.data.music}
                        </div>
                        <div className={teamworkCN} onClick={() => this.toggleEditingProp("teamwork")}>
                            {judgeData.data.teamwork}
                        </div>
                        <div className={formCN} onClick={() => this.toggleEditingProp("form")}>
                            {judgeData.data.form}
                        </div>
                    </div>
                </div>
                <div className="ex">
                    <div className="exRow">
                        <label>
                            .1
                        </label>
                        <div className="number">
                            {judgeData.data.point1}
                        </div>
                        <div className="exInput">
                            {this.getInputIncrementWidget((e) => this.onInputIncrementPoint1Clicked(e))}
                        </div>
                    </div>
                    <div className="exRow">
                        <label>
                            .2
                        </label>
                        <div className="number">
                            {judgeData.data.point2}
                        </div>
                        <div className="exInput">
                            {this.getInputIncrementWidget((e) => this.onInputIncrementPoint2Clicked(e))}
                        </div>
                    </div>
                    <div className="exRow">
                        <label>
                            .3
                        </label>
                        <div className="number">
                            {judgeData.data.point3}
                        </div>
                        <div className="exInput">
                            {this.getInputIncrementWidget((e) => this.onInputIncrementPoint3Clicked(e))}
                        </div>
                    </div>
                </div>
                {inputNumberWidget}
            </div>
        )
    }


    onInputNumberClicked(value, propName) {
        runInAction(() => {
            let judgeData = this.getJudgeData()
            let propValue = judgeData.data[propName]
            if (value === ".5") {
                if (propValue !== undefined && propValue !== 10 && propValue !== 0) {
                    if (propValue === Math.floor(propValue)) {
                        judgeData.data[propName] += .5
                    } else {
                        judgeData.data[propName] = Math.floor(propValue)
                    }

                    this.updateJudgeData()
                }
            } else if (value !== "X") {
                judgeData.data[propName] = value

                this.updateJudgeData()
            }

            this.setState(this.state)
        })
    }

    clearScoresEditingState() {
        this.state.scoresEditPropName = undefined
        this.state.scoresEditIndexTeam = undefined

        this.setState(this.state)
    }

    toggleScoresEditingProp(teamIndex, propName) {
        if (this.state.scoresEditPropName === propName) {
            this.state.scoresEditPropName = undefined
            this.state.scoresEditIndexTeam = undefined
        } else {
            this.state.scoresEditPropName = propName
            this.state.scoresEditIndexTeam = teamIndex
        }

        this.setState(this.state)
    }

    onScoresInputNumberClicked(value) {
        runInAction(() => {
            let judgeData = this.judgeDataArray[this.state.scoresEditIndexTeam]
            let score = judgeData.data[this.state.scoresEditPropName] || 0
            if (value === ".5") {
                if (score !== undefined && score !== 10 && score !== 0) {
                    if (score === Math.floor(score)) {
                        judgeData.data[this.state.scoresEditPropName] += .5
                    } else {
                        judgeData.data[this.state.scoresEditPropName] = Math.floor(score)
                    }

                    this.updateJudgeData()
                }
            } else if (value !== "X") {
                judgeData.data[this.state.scoresEditPropName] = value

                this.updateJudgeData()
            }

            this.setState(this.state)
        })
    }

    onScoresInputIncrementClicked(value) {
        let judgeData = this.judgeDataArray[this.state.scoresEditIndexTeam]
        let score = judgeData.data[this.state.scoresEditPropName] || 0
        judgeData.data[this.state.scoresEditPropName] = Math.max(0, score + value)

        this.updateJudgeData()
        this.setState(this.state)
    }

    getScoresInput() {
        if (this.state.scoresEditIndexTeam === undefined) {
            return null
        }

        let useInputIncrement = this.state.scoresEditPropName.startsWith("point")

        return (
            <div className="scoresInput">
                {useInputIncrement ? this.getInputIncrementWidget((e) => this.onScoresInputIncrementClicked(e)) : this.getInputNumberWidget((e) => this.onScoresInputNumberClicked(e))}
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
            let music = teamJudgeData && teamJudgeData.data && teamJudgeData.data.music || 0
            let teamwork = teamJudgeData && teamJudgeData.data && teamJudgeData.data.teamwork || 0
            let form = teamJudgeData && teamJudgeData.data && teamJudgeData.data.form || 0
            let point1 = teamJudgeData && teamJudgeData.data && teamJudgeData.data.point1 || 0
            let point2 = teamJudgeData && teamJudgeData.data && teamJudgeData.data.point2 || 0
            let point3 = teamJudgeData && teamJudgeData.data && teamJudgeData.data.point3 || 0
            let namesCN = `names ${this.state.teamIndex === i ? "selected" : ""}`
            let generalCN = `general ${this.state.scoresEditIndexTeam === i && this.state.scoresEditPropName === "general" ? "editing" : ""}`
            let musicCN = `input ${this.state.scoresEditIndexTeam === i && this.state.scoresEditPropName === "music" ? "editing" : ""}`
            let teamworkCN = `input ${this.state.scoresEditIndexTeam === i && this.state.scoresEditPropName === "teamwork" ? "editing" : ""}`
            let formCN = `input ${this.state.scoresEditIndexTeam === i && this.state.scoresEditPropName === "form" ? "editing" : ""}`
            let point1CN = `input ${this.state.scoresEditIndexTeam === i && this.state.scoresEditPropName === "point1" ? "editing" : ""}`
            let point2CN = `input ${this.state.scoresEditIndexTeam === i && this.state.scoresEditPropName === "point2" ? "editing" : ""}`
            let point3CN = `input ${this.state.scoresEditIndexTeam === i && this.state.scoresEditPropName === "point3" ? "editing" : ""}`
            widgets.push(
                <div key={i} className="team">
                    <div className="header">
                        <div className={namesCN}>
                            {playerNames}
                        </div>
                        <div className={generalCN} onClick={() => this.toggleScoresEditingProp(i, "general")}>
                            {general}
                        </div>
                        <div className="total">
                            {Common.round1Decimals(teamJudgeData.calcJudgeScoreCategoryOnly())}
                        </div>
                    </div>
                    <div className="exAi">
                        <div className="exAiInputs">
                            <div className={musicCN} onClick={() => this.toggleScoresEditingProp(i, "music")}>
                                M: {music}
                            </div>
                            <div className={teamworkCN} onClick={() => this.toggleScoresEditingProp(i, "teamwork")}>
                                T: {teamwork}
                            </div>
                            <div className={formCN} onClick={() => this.toggleScoresEditingProp(i, "form")}>
                                F: {form}
                            </div>
                        </div>
                        <div className="exAiInputs">
                            <div className={point1CN} onClick={() => this.toggleScoresEditingProp(i, "point1")}>
                                .1: {point1}
                            </div>
                            <div className={point2CN} onClick={() => this.toggleScoresEditingProp(i, "point2")}>
                                .2: {point2}
                            </div>
                            <div className={point3CN} onClick={() => this.toggleScoresEditingProp(i, "point3")}>
                                .3: {point3}
                            </div>
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

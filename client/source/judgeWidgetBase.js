
const React = require("react")
const MobxReact = require("mobx-react")
const { runInAction } = require("mobx")
const { Tab, Tabs, TabList, TabPanel } = require("react-tabs")

const MainStore = require("./mainStore.js")
const Common = require("./common.js")

require("./judgeWidgetBase.less")

module.exports = @MobxReact.observer class JudgeWidgetBase extends React.Component {
    constructor() {
        super()

        runInAction(() => {
            MainStore.judgeTabsSelectedIndex = parseInt(window.localStorage.getItem("judgeTabsSelectedIndex"), 10) || 0
        })

        this.state = {
            routineTimeString: "0:00",
            teamIndex: undefined,
            editGeneralIndex: undefined
        }

        Common.fetchEventData("8c14255f-9a96-45f1-b843-74e2a00d06cc").then(() => {
            this.onEventDataUpdatedBase()
        })
        Common.fetchPlayerData()

        this.eventDataUpdater = new Common.EventDataUpdateHelper(10, 1, false, () => this.onEventDataUpdatedBase(), () => this.onUpdateExpired())
        this.timeUpdater = new Common.TimeUpdateHelper(() => {
            let routineTimeSeconds = Common.getRoutineTimeSeconds()
            if (!Common.isRoutinePlaying() || routineTimeSeconds > 15 * 60) {
                this.timeUpdater.stopUpdate()
            }

            this.state.routineTimeString = Common.getRoutineTimeString(routineTimeSeconds)
            this.setState(this.state)
        })
    }

    onUpdateExpired() {
        this.setState(this.state)
    }

    onEventDataUpdatedBase() {
        runInAction(() => {
            Common.setSelectedPoolFromPoolKey(MainStore.eventData.eventState.activePoolKey)
            this.judgeDataArray = Common.getJudgeDataArrayForCurrentJudgeIndex()
            this.state.teamIndex = MainStore.eventData.controllerState.selectedTeamIndex
            this.eventDataUpdater.extendUpdateDeadline()

            this.postInitFectchEventData()

            this.timeUpdater.startUpdate()
        })
    }

    postInitFectchEventData() {
        // Do nothing
    }

    getJudgeWidget() {
        throw new Error("getJudgeWidget is not implemented in child")
    }

    getJudgeData() {
        if (this.judgeDataArray === undefined) {
            return undefined
        }

        return this.judgeDataArray[this.state.teamIndex]
    }

    clearScoresEditingState() {
        throw new Error("clearScoresEditingState is not implemented in child")
    }

    onJudgeTabsSelectedIndex(index) {
        runInAction(() => {
            this.clearScoresEditingState()

            MainStore.judgeTabsSelectedIndex = index
            window.localStorage.setItem("judgeTabsSelectedIndex", index)
        })
    }

    onJudgeClick(judgeIndex) {
        runInAction(() => {
            let url = new URL(window.location.href)
            url.searchParams.set("judgeIndex", judgeIndex)
            window.location.href = url.href
        })
    }

    getJudgeButtonsWidget() {
        if (MainStore.eventData === undefined) {
            return <h1>No Event Data</h1>
        }

        if (MainStore.eventData.eventState.activePoolKey === undefined) {
            return <h1>No Pool Set</h1>
        }

        let poolData = MainStore.eventData.eventData.poolMap[MainStore.eventData.eventState.activePoolKey]
        let sortedJudgeKeys = Common.getSortedJudgeKeyArray(poolData)
        let judges = []
        for (let [ judgeIndex, judgeKey ] of sortedJudgeKeys.entries()) {
            judges.push(
                <button key={judgeKey} onClick={() => this.onJudgeClick(judgeIndex)}>
                    {`${Common.getPlayerNameString(judgeKey)} - ${poolData.judges[judgeKey]}`}
                </button>
            )
        }

        return (
            <div className="judgeSelect">
                <h1>
                    Pick Judge
                </h1>
                {judges}
            </div>
        )
    }

    getInfoWidget() {
        return (
            <div className="infoWidget">
                <div className="teamNames">
                    {Common.getSelectedTeamFirstNameString()}
                </div>
                <div className="time">
                    {this.state.routineTimeString}
                </div>
            </div>
        )
    }

    gotoJudgeSelect() {
        let url = new URL(window.location.href)
        url.searchParams.delete("judgeIndex")
        window.location.href = url.href
    }

    scoresTeamWidget() {
        throw new Error("scoresTeamWidget is not implemented in child")
    }

    scoresWidget() {
        let judgeName = Common.getPlayerNameForCurrentJudgeIndex()

        return (
            <div className="scoresWidget">
                <div className="header">
                    <div className="judgeName">
                        {judgeName}
                    </div>
                    <button onClick={() => this.gotoJudgeSelect()}>Judge Select</button>
                </div>
                {this.scoresTeamWidget()}
            </div>
        )
    }

    onInputNumberClicked(value) {
        throw new Error("onInputNumberClicked is not implemented in child")
    }

    getInputNumberButtonWidget(value, callback) {
        return (
            <div className="cell">
                <button onClick={() => callback(value)}>{value}</button>
            </div>
        )
    }

    getInputNumberWidget(callback) {
        return (
            <div className="inputNumberWidget">
                <div className="row">
                    {this.getInputNumberButtonWidget(7, callback)}
                    {this.getInputNumberButtonWidget(8, callback)}
                    {this.getInputNumberButtonWidget(9, callback)}
                    {this.getInputNumberButtonWidget(10, callback)}
                </div>
                <div className="row">
                    {this.getInputNumberButtonWidget(4, callback)}
                    {this.getInputNumberButtonWidget(5, callback)}
                    {this.getInputNumberButtonWidget(6, callback)}
                    <div className="cell">
                    </div>
                </div>
                <div className="row">
                    {this.getInputNumberButtonWidget(1, callback)}
                    {this.getInputNumberButtonWidget(2, callback)}
                    {this.getInputNumberButtonWidget(3, callback)}
                    <div className="cell">
                    </div>
                </div>
                <div className="row">
                    {this.getInputNumberButtonWidget(0, callback)}
                    {this.getInputNumberButtonWidget(".5", callback)}
                    <div className="cell">
                    </div>
                    {this.getInputNumberButtonWidget("X", callback)}
                </div>
            </div>
        )
    }

    getInputIncrementWidget(callback) {
        return (
            <div className="inputIncrementWidget">
                <button onClick={() => callback(-1)}>
                    -
                </button>
                <button onClick={() => callback(1)}>
                    +
                </button>
            </div>
        )
    }

    updateJudgeData() {
        if (this.state.teamIndex !== undefined) {
            this.getJudgeData().updateJudgeData(this.state.teamIndex)
        }

        if (this.state.editGeneralIndex !== undefined) {
            this.judgeDataArray[this.state.editGeneralIndex].updateJudgeData(this.state.editGeneralIndex)
        }

        if (this.state.scoresEditIndexTeam !== undefined) {
            this.judgeDataArray[this.state.scoresEditIndexTeam].updateJudgeData(this.state.scoresEditIndexTeam)
        }

        this.eventDataUpdater.extendUpdateDeadline()
    }

    onInputGeneralNumber(value) {
        let score = this.judgeDataArray[this.state.editGeneralIndex].data.general || 0
        if (value === ".5") {
            if (score !== undefined && score !== 10 && score !== 0) {
                if (score === Math.floor(score)) {
                    this.judgeDataArray[this.state.editGeneralIndex].data.general += .5
                } else {
                    this.judgeDataArray[this.state.editGeneralIndex].data.general = Math.floor(score)
                }
            }
        } else {
            this.judgeDataArray[this.state.editGeneralIndex].data.general = value
        }

        this.setState(this.state)

        this.updateJudgeData()
    }

    onGeneralTeamClicked(index) {
        this.state.editGeneralIndex = index
        this.setState(this.state)
    }

    getGeneralWidget() {
        if (this.state.editGeneralIndex === undefined) {
            return null
        }

        let judgeData = this.getJudgeData()
        if (judgeData === undefined) {
            return null
        }

        let poolData = Common.getSelectedPoolData()
        let teamWidgets = []
        for (let i = 0; i < poolData.teamData.length; ++i) {
            let teamData = poolData.teamData[i]
            let playerNames = Common.getPlayerFirstNamesString(teamData.players)
            let teamJudgeData = this.judgeDataArray[i]
            let general = teamJudgeData && teamJudgeData.data && teamJudgeData.data.general || 0
            let teamCN = `team ${this.state.editGeneralIndex === i ? "editing" : ""}`
            teamWidgets.push(
                <div key={i} className={teamCN} onClick={() => this.onGeneralTeamClicked(i)}>
                    <div className="names">
                        {playerNames}
                    </div>
                    <div className="general">
                        {general}
                    </div>
                </div>
            )
        }

        return (
            <div className="generalWidget">
                <div className="teams">
                    {teamWidgets}
                    <button onClick={() => this.hideGeneralWidget()}>Done</button>
                </div>
                <div className="generalInputNumberWidget">
                    {this.getInputNumberWidget((e) => this.onInputGeneralNumber(e))}
                </div>
            </div>
        )
    }

    showGeneralWidget() {
        this.state.editGeneralIndex = this.state.teamIndex

        this.setState(this.state)
    }

    hideGeneralWidget() {
        this.state.editGeneralIndex = undefined

        this.setState(this.state)
    }

    getFinishedWidget() {
        let judgeData = this.getJudgeData()
        if (judgeData === undefined) {
            return null
        }

        let generalScore = judgeData.data.general || 0
        if (!Common.isRoutineFinished() || generalScore !== 0) {
            return null
        }

        return (
            <div className="finishedWidget">
                <button onClick={() => this.showGeneralWidget()}>Click To Finish</button>
            </div>
        )
    }

    render() {
        if (MainStore.eventData === undefined) {
            return <h1>No Event Data</h1>
        }

        if (MainStore.judgeIndex === undefined) {
            return this.getJudgeButtonsWidget()
        } else {
            let cn = `judgeWidgetBase kindleTest ${this.eventDataUpdater.isExpired() ? "expired" : ""}`
            return (
                <div className={cn}>
                    {Common.getExpiredWidget(this.eventDataUpdater)}
                    {this.getFinishedWidget()}
                    {this.getGeneralWidget()}
                    {this.getInfoWidget()}
                    <Tabs selectedIndex={MainStore.judgeTabsSelectedIndex} onSelect={(index) => this.onJudgeTabsSelectedIndex(index)}>
                        <TabList>
                            <Tab>Judge</Tab>
                            <Tab>Scores</Tab>
                        </TabList>
                        <TabPanel>
                            {this.getJudgeWidget()}
                        </TabPanel>
                        <TabPanel>
                            {this.scoresWidget()}
                        </TabPanel>
                    </Tabs>
                </div>
            )
        }
    }
}

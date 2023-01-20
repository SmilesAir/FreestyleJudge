
const React = require("react")
const MobxReact = require("mobx-react")
const { runInAction } = require("mobx")
const { Tab, Tabs, TabList, TabPanel } = require("react-tabs")
const ReactSelect = require("react-select").default

const MainStore = require("./mainStore.js")
const Common = require("./common.js")
const Results2020Widget = require("./results2020Widget.js")

require("./headJudgeWidget.less")

@MobxReact.observer class EventInfoWidget extends React.Component {
    constructor() {
        super()
    }

    onSeeResultsClick(divisionName, roundName, poolName) {
        runInAction(() => {
            MainStore.selectedDivision = {
                label: divisionName,
                value: divisionName
            }
            MainStore.selectedRound = {
                label: roundName,
                value: roundName
            }
            MainStore.selectedPool = {
                label: poolName,
                value: poolName
            }

            MainStore.topTabsSelectedIndex = 1
            MainStore.controlsTabsSelectedIndex = 1
        })
    }

    onSetActivePool(poolKey) {
        runInAction(() => {
            Common.setActivePool(poolKey)
        })
    }

    getPoolWidgets(divisionData, roundData) {
        let widgets = []
        for (let poolName of roundData.poolNames) {
            let poolKey = Common.makePoolKey(MainStore.eventData.key, divisionData.name, roundData.name, poolName)
            let poolData = MainStore.eventData.eventData.poolMap[poolKey]

            let teamsLines = poolData.teamData.map((team, index) => {
                return `${index + 1}. ` + Common.getPlayerNamesString(team.players)
            })
            let teamsText = teamsLines.join("\n")
            let isActive = Common.isPoolActive(poolKey)
            let sortedJudgeKeys = Common.getSortedJudgeKeyArray(poolData)
            let judgeStrings = sortedJudgeKeys.map((judgeKey) => {
                return `${Common.getPlayerNameString(judgeKey)} - ${poolData.judges[judgeKey]}`
            })
            let teamCountCN = `poolDetail ${poolData.teamData.length === 0 ? "error" : ""}`
            let judgeCountCN = `poolDetail ${judgeStrings.length === 0 ? "error" : ""}`
            let routineLengthCN = `${roundData.lengthSeconds === 0 ? "error" : ""}`

            widgets.push(
                <div key={poolName} className={`poolWidget ${isActive ? "poolWidgetActive" : ""}`}>
                    <button onClick={() => this.onSetActivePool(poolKey)} disabled={isActive || Common.isRoutinePlaying()}>Set Active Pool</button>
                    <h4>
                        Pool {poolName}
                    </h4>
                    <div>
                        <div className={teamCountCN} title={teamsText}>
                            Team Count: {poolData.teamData.length}
                        </div>
                        <div className={judgeCountCN} title={judgeStrings.join("\n")}>
                            Judge Count: {sortedJudgeKeys.length}
                        </div>
                        <div className={routineLengthCN}>
                            Routine Length: {Common.getRoutineTimeString(roundData.lengthSeconds)}
                        </div>
                    </div>
                    <button onClick={() => this.onSeeResultsClick(divisionData.name, roundData.name, poolName)}>See Results</button>
                </div>
            )
        }

        return widgets
    }

    getRoundWidgets(divisionData) {
        let widgets = []
        for (let roundKey in divisionData.roundData) {
            let roundData = divisionData.roundData[roundKey]
            widgets.push(
                <div key={roundKey}>
                    <h3>{roundKey}</h3>
                    {this.getPoolWidgets(divisionData, roundData)}
                </div>
            )
        }

        return widgets
    }

    getDivisionWidgets() {
        let widgets = []
        for (let divisionKey in MainStore.eventData.eventData.divisionData) {
            let divisionData = MainStore.eventData.eventData.divisionData[divisionKey]
            widgets.push(
                <div key={divisionKey}>
                    <h2>{divisionKey}</h2>
                    {this.getRoundWidgets(divisionData)}
                </div>
            )
        }

        return widgets
    }

    render() {
        return (
            <div>
                {this.getDivisionWidgets()}
            </div>
        )
    }
}

module.exports = @MobxReact.observer class HeadJudgeWidget extends React.Component {
    constructor() {
        super()

        runInAction(() => {
            MainStore.topTabsSelectedIndex = parseInt(window.localStorage.getItem("topTabsSelectedIndex"), 10) || 0
            MainStore.controlsTabsSelectedIndex = parseInt(window.localStorage.getItem("controlsTabsSelectedIndex"), 10) || 0
        })

        this.state = {
            routineTimeString: "0:00"
        }
        this.categoryOrder = [ "Diff", "Variety", "ExAi" ]

        Common.fetchEventData(MainStore.eventKey).then(() => {
            this.onEventDataUpdated()
        })
        Common.fetchPlayerData()

        this.eventDataUpdater = new Common.EventDataUpdateHelper(10, 1, true, () => this.onEventDataUpdated(), () => this.onUpdateExpired())
        this.timeUpdater = new Common.TimeUpdateHelper(() => this.onTimeUpdate())
    }

    onTimeUpdate() {
        let routineTimeSeconds = Common.getRoutineTimeSeconds()
        if (!Common.isRoutinePlaying() || routineTimeSeconds > 15 * 60) {
            this.timeUpdater.stopUpdate()
        }

        this.state.routineTimeString = Common.getRoutineTimeString(routineTimeSeconds)
        this.setState(this.state)
    }

    onUpdateExpired() {
        this.setState(this.state)
    }

    onEventDataUpdated() {
        runInAction(() => {
            this.runUpdateRoutineTimeString()
            this.eventDataUpdater.extendUpdateDeadline()

            this.setState(this.state)
        })
    }

    onSelectDivision(selected) {
        runInAction(() => {
            MainStore.selectedDivision = selected
            MainStore.selectedRound = null
            MainStore.selectedPool = null
        })
    }

    onSelectRound(selected) {
        runInAction(() => {
            MainStore.selectedRound = selected
            MainStore.selectedPool = null
        })
    }

    onSelectPool(selected) {
        runInAction(() => {
            MainStore.selectedPool = selected

            if (MainStore.controlsTabsSelectedIndex === 0) {
                Common.updateEventState({
                    activePoolKey: Common.getSelectedPoolKey()
                })
            }

            this.eventDataUpdater.extendUpdateDeadline()
        })
    }

    getDivisionOptions() {
        let options = []
        let eventDivisionData = MainStore.eventData.eventData.divisionData
        for (let divisionKey in eventDivisionData) {
            options.push({
                value: divisionKey,
                label: divisionKey
            })
        }

        return options
    }

    getRoundOptions() {
        let eventDivisionData = MainStore.eventData.eventData.divisionData
        let divisionData = MainStore.selectedDivision && eventDivisionData[MainStore.selectedDivision.value]
        if (divisionData === null) {
            return []
        }

        let options = []
        for (let roundKey in divisionData.roundData) {
            options.push({
                value: roundKey,
                label: roundKey
            })
        }

        return options
    }

    getPoolOptions() {
        let eventDivisionData = MainStore.eventData.eventData.divisionData
        let divisionData = MainStore.selectedDivision && eventDivisionData[MainStore.selectedDivision.value]
        if (divisionData === null) {
            return []
        }

        let roundData = MainStore.selectedRound && divisionData.roundData[MainStore.selectedRound.value]
        if (roundData === null) {
            return []
        }

        return roundData.poolNames.map((name) => {
            return {
                value: name,
                label: name
            }
        })
    }

    onTopTabsSelectedIndexChanged(index) {
        runInAction(() => {
            MainStore.topTabsSelectedIndex = index
            window.localStorage.setItem("topTabsSelectedIndex", index)
        })
    }

    onControlsTabsSelectedIndexChanged(index) {
        runInAction(() => {
            MainStore.controlsTabsSelectedIndex = index
            Common.setSelectedPoolFromPoolKey(MainStore.eventData.eventState.activePoolKey)
            window.localStorage.setItem("controlsTabsSelectedIndex", index)
        })
    }

    onTeamClicked(teamIndex) {
        if (Common.isRoutinePlaying()) {
            return
        }

        runInAction(() => {
            MainStore.eventData.controllerState.selectedTeamIndex = teamIndex

            Common.updateEventState(undefined, {
                selectedTeamIndex: teamIndex
            })

            this.eventDataUpdater.extendUpdateDeadline()
        })
    }

    getTeamsWidget() {
        let poolData = Common.getSelectedPoolData()
        if (poolData === undefined) {
            return null
        }

        let widgets = []
        let teamNumber = 1
        for (let teamData of poolData.teamData) {
            let selected = teamNumber - 1 === MainStore.eventData.controllerState.selectedTeamIndex
            let cn = `team ${selected ? "selected" : ""} ${Common.isRoutinePlaying() ? "disabled" : ""}`
            let teamIndex = teamNumber - 1
            widgets.push(
                <div key={teamNumber} className={cn} onClick={() => this.onTeamClicked(teamIndex)}>
                    {`${teamNumber}. ${Common.getPlayerNamesString(teamData.players)}`}
                </div>
            )
            ++teamNumber
        }

        return widgets
    }

    getJudgeWidget(judgeKey, categoryType) {
        return (
            <div key={judgeKey} className="judge">
                {`${categoryType}: ${Common.getPlayerNameString(judgeKey)}`}
            </div>
        )
    }

    getJudgesWidget() {
        let poolData = Common.getSelectedPoolData()
        if (poolData === undefined) {
            return null
        }

        let widgets = []
        for (let categoryType of this.categoryOrder) {
            for (let judgeKey in poolData.judges) {
                let judgeType = poolData.judges[judgeKey]
                if (judgeType === categoryType) {
                    widgets.push(this.getJudgeWidget(judgeKey, categoryType))
                }
            }
        }

        return (
            <div className="judges">
                {widgets}
            </div>
        )
    }

    onStartClicked() {
        runInAction(() => {
            MainStore.eventData.controllerState.routineStartTime = Date.now()
            Common.updateEventState(undefined, MainStore.eventData.controllerState)
            this.runUpdateRoutineTimeString()
        })

        this.eventDataUpdater.extendUpdateDeadline()
    }

    onCancelClicked() {
        runInAction(() => {
            MainStore.eventData.controllerState.routineStartTime = undefined
            Common.updateEventState(undefined, MainStore.eventData.controllerState)
            this.runUpdateRoutineTimeString()
        })

        this.eventDataUpdater.extendUpdateDeadline()
    }

    runUpdateRoutineTimeString() {
        let routineTimeSeconds = Common.getRoutineTimeSeconds()
        if (this.updateTimeStringInProgress !== true && Common.isRoutinePlaying() && routineTimeSeconds < 15 * 60) {
            this.updateTimeStringInProgress = true
            setTimeout(() => {
                this.updateTimeStringInProgress = false
                this.runUpdateRoutineTimeString()
            }, 1000)
        }

        this.state.routineTimeString = Common.getRoutineTimeString(Common.getRoutineTimeSeconds())
        this.setState(this.state)
    }

    getRunControls() {
        return (
            <div className="runControls">
                <h2>
                    {`Time: ${this.state.routineTimeString} / ${Common.getRoutineTimeString(Common.getSelectedPoolRoutineSeconds())} | `}
                    {`Playing: ${Common.getSelectedTeamNameString()}`}
                </h2>
                <div className="buttons">
                    <button onClick={() => this.onStartClicked()} disabled={Common.isRoutinePlaying()}>Click on First Throw</button>
                    <button onClick={() => this.onCancelClicked()} disabled={!Common.isRoutinePlaying()}>Cancel Routine</button>
                </div>
                <div className="details">
                    <div className="teams">
                        <h3>
                            Teams
                        </h3>
                        {this.getTeamsWidget()}
                    </div>
                    <div className="judges">
                        <h3>
                            Judges
                        </h3>
                        {this.getJudgesWidget()}
                    </div>
                </div>
                <hr/>
                <Results2020Widget />
            </div>
        )
    }

    render() {
        if (MainStore.eventData === undefined) {
            return <h1>No Event Data</h1>
        }

        if (MainStore.playerData === undefined) {
            return <h1>No Player Data</h1>
        }

        let selectDisabled = MainStore.controlsTabsSelectedIndex === 0 && Common.isRoutinePlaying()
        let headJudgeWidgetCN = `headJudgeWidget ${this.eventDataUpdater.isExpired() ? "expired" : ""}`
        return (
            <div className={headJudgeWidgetCN}>
                {Common.getExpiredWidget(this.eventDataUpdater)}
                <Tabs selectedIndex={MainStore.topTabsSelectedIndex} onSelect={(index) => this.onTopTabsSelectedIndexChanged(index)}>
                    <TabList>
                        <Tab>Event Info</Tab>
                        <Tab>Pool Controls</Tab>
                    </TabList>
                    <TabPanel>
                        <EventInfoWidget />
                    </TabPanel>
                    <TabPanel>
                        <Tabs selectedIndex={MainStore.controlsTabsSelectedIndex} onSelect={(index) => this.onControlsTabsSelectedIndexChanged(index)}>
                            <div className="poolSelectContainer">
                                <ReactSelect value={MainStore.selectedDivision} onChange={(e) => this.onSelectDivision(e)} options={this.getDivisionOptions()} placeholder="Choose Division" isLoading={MainStore.eventData === undefined} isDisabled={selectDisabled} />
                                <ReactSelect value={MainStore.selectedRound} onChange={(e) => this.onSelectRound(e)} options={this.getRoundOptions()} placeholder="Choose Round" isLoading={MainStore.eventData === undefined} isDisabled={selectDisabled} />
                                <ReactSelect value={MainStore.selectedPool} onChange={(e) => this.onSelectPool(e)} options={this.getPoolOptions()} placeholder="Choose Pool" isLoading={MainStore.eventData === undefined} isDisabled={selectDisabled} />
                            </div>
                            <TabList>
                                <Tab>Run Pool</Tab>
                                <Tab>Results</Tab>
                            </TabList>
                            <TabPanel>
                                {this.getRunControls()}
                            </TabPanel>
                            <TabPanel>
                                <Results2020Widget />
                            </TabPanel>
                        </Tabs>
                    </TabPanel>
                </Tabs>
            </div>
        )
    }
}

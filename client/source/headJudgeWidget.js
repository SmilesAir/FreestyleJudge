
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

            widgets.push(
                <div key={poolName} className={`poolWidget ${isActive ? "poolWidgetActive" : ""}`}>
                    <button onClick={() => this.onSetActivePool(poolKey)} disabled={isActive || Common.isRoutinePlaying()}>Set Active Pool</button>
                    <h4>
                        Pool {poolName}
                    </h4>
                    <div title={teamsText}>
                        Team Count: {poolData.teamData.length}
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

        Common.fetchEventData("8c14255f-9a96-45f1-b843-74e2a00d06cc").then(() => {
            this.runUpdateRoutineTimeString()
        })
        Common.fetchPlayerData()
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
    }

    onCancelClicked() {
        runInAction(() => {
            MainStore.eventData.controllerState.routineStartTime = undefined
            Common.updateEventState(undefined, MainStore.eventData.controllerState)
            this.runUpdateRoutineTimeString()
        })
    }

    runUpdateRoutineTimeString() {
        this.updateRoutineTimeString()

        let routineTimeSeconds = Common.getRoutineTimeSeconds()
        if (routineTimeSeconds > 0 && routineTimeSeconds < 15 * 60) {
            setTimeout(() => {
                this.runUpdateRoutineTimeString()
            }, 1000)
        } else {
            this.state.routineTimeString = "0:00"
            this.setState(this.state)
        }
    }

    updateRoutineTimeString() {
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

        return (
            <div className="headJudgeWidget">
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

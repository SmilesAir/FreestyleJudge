/* eslint-disable no-alert */

const React = require("react")
const MobxReact = require("mobx-react")
const { runInAction } = require("mobx")
const { Tab, Tabs, TabList, TabPanel } = require("react-tabs")
const ReactSelect = require("react-select").default
const CRC32 = require("crc-32")

const MainStore = require("./mainStore.js")
const Common = require("./common.js")
const ResultsWidget = require("./resultsWidget.js")

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

    generatePermalink(poolKey, isAnonJudges) {
        let url = new URL(window.location.href)
        url.searchParams.set("startup", "results")
        url.searchParams.set("pool", poolKey)
        url.searchParams.set("perma", "1")
        if (isAnonJudges !== true) {
            url.searchParams.set("showJudges", "1")
        }

        let parts = url.href.split("?")
        let paramsString = parts[1]
        let crc = CRC32.str(paramsString)

        Common.getSetPermalinkParams(crc, paramsString).then((resp) => {
            return resp.json()
        })

        let compressedUrl = new URL(window.location.origin)
        compressedUrl.searchParams.set("x", crc)
        return compressedUrl.href
    }

    copyPermalink(poolKey) {
        navigator.clipboard.writeText(this.generatePermalink(poolKey))
    }

    onPoolLockClicked(poolKey, isLocked) {
        if (isLocked) {
            Common.unlockPoolResults(poolKey)
        } else {
            Common.lockAndCalcPoolResults(poolKey)
        }
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

            let setActive = poolData.isLocked === true ?
                <h2>Locked</h2> :
                <button onClick={() => this.onSetActivePool(poolKey)} disabled={isActive || Common.isRoutinePlaying()}>Set Active Pool</button>

            widgets.push(
                <div key={poolName} className={`poolWidget ${isActive ? "poolWidgetActive" : ""}`}>
                    <div className="poolName">
                        Pool {poolName}
                    </div>
                    {setActive}
                    <button onClick={() => this.onPoolLockClicked(poolKey, poolData.isLocked)}>{poolData.isLocked ? "Unlock" : "Lock and Calc Results"}</button>
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
                    <button onClick={() => this.copyPermalink(poolKey)}>Copy Results Permalink</button>
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

    uploadDivisionResults(divisionData) {
        let resultsText = Common.getResultsTextForDivisionData(divisionData)
        Common.uploadResults(resultsText, divisionData.name)
    }

    getDivisionWidgets() {
        let widgets = []
        for (let divisionKey in MainStore.eventData.eventData.divisionData) {
            let divisionData = MainStore.eventData.eventData.divisionData[divisionKey]
            widgets.push(
                <div key={divisionKey} className="divisionWidget">
                    <div className="divisionHeader">
                        <div className="divisionName">{divisionKey}</div>
                        <button onClick={() => this.uploadDivisionResults(divisionData)} disabled={!Common.isDivisionLocked(divisionData)}>Upload Division Results</button>
                    </div>
                    {this.getRoundWidgets(divisionData)}
                </div>
            )
        }

        return widgets
    }

    getAllPoolsForRound(roundName, isAnonJudges) {
        let lines = []
        for (let divisionKey in MainStore.eventData.eventData.divisionData) {
            let divisionData = MainStore.eventData.eventData.divisionData[divisionKey]
            for (let roundKey in divisionData.roundData) {
                if (roundKey === roundName) {
                    let roundData = divisionData.roundData[roundKey]
                    for (let poolName of roundData.poolNames) {
                        let poolKey = Common.makePoolKey(MainStore.eventData.key, divisionKey, roundKey, poolName)
                        lines.push(`${divisionKey} ${roundKey} ${poolName}: ${this.generatePermalink(poolKey, isAnonJudges)}`)
                    }
                }
            }
        }

        return lines
    }

    copyAllRoundLinks(isAnonJudges) {
        let rounds = []
        for (let divisionKey in MainStore.eventData.eventData.divisionData) {
            let divisionData = MainStore.eventData.eventData.divisionData[divisionKey]
            let divisionRounds = []
            for (let roundKey of Common.roundNames.toReversed()) {
                if (divisionData.roundData[roundKey] !== undefined) {
                    divisionRounds.push(roundKey)
                }
            }

            if (divisionRounds.length > rounds.length) {
                rounds = divisionRounds
            }
        }

        let lines = []
        for (let roundKey of rounds) {
            lines = lines.concat(this.getAllPoolsForRound(roundKey, isAnonJudges))
            lines.push("")
        }

        navigator.clipboard.writeText(lines.join("\n"))
    }

    render() {
        return (
            <div>
                <button onClick={() => this.copyAllRoundLinks()}>Copy All Permalinks</button>
                <button onClick={() => this.copyAllRoundLinks(true)}>Copy All Anonymous Judges Permalinks</button>
                {this.getDivisionWidgets()}
            </div>
        )
    }
}

module.exports = @MobxReact.observer class HeadJudgeWidget extends React.Component {
    constructor(props) {
        super(props)

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

        let dataUpdaterInterval = this.props.resultsMode ? 10 : 1
        this.eventDataUpdater = new Common.EventDataUpdateHelper(10, dataUpdaterInterval, true, () => this.onEventDataUpdated(), () => this.onUpdateExpired())
        this.timeUpdater = new Common.TimeUpdateHelper(() => this.onTimeUpdate())
    }

    onTimeUpdate() {
        let routineTimeSeconds = Common.getRoutineTimeSeconds()
        if (!Common.isRoutinePlaying() && !Common.isRoutineFinished() || routineTimeSeconds > 30 * 60) {
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
            this.timeUpdater.startUpdate()

            this.setState(this.state)
        })
    }

    tryAutoSelectRoundAndPool() {
        let divisionData = MainStore.eventData.eventData.divisionData[MainStore.selectedDivision.value]
        if (divisionData === undefined || divisionData.roundData === undefined) {
            return
        }

        let roundKeys = Object.keys(divisionData.roundData)
        if (roundKeys.length === 1) {
            MainStore.selectedRound = {
                label: roundKeys[0],
                value: roundKeys[0]
            }
        }

        let roundData = divisionData.roundData[MainStore.selectedRound.value]
        if (roundData === undefined) {
            return
        }

        let poolKeys = roundData.poolNames
        if (poolKeys.length === 1) {
            MainStore.selectedPool = {
                label: poolKeys[0],
                value: poolKeys[0]
            }
        }
    }

    onSelectDivision(selected) {
        runInAction(() => {
            MainStore.selectedDivision = selected
            MainStore.selectedRound = null
            MainStore.selectedPool = null

            this.tryAutoSelectRoundAndPool()
        })
    }

    onSelectRound(selected) {
        runInAction(() => {
            MainStore.selectedRound = selected
            MainStore.selectedPool = null

            this.tryAutoSelectRoundAndPool()
        })
    }

    onSelectPool(selected) {
        runInAction(() => {
            MainStore.selectedPool = selected

            if (MainStore.controlsTabsSelectedIndex === 0 && !this.props.resultsMode) {
                Common.setActivePool(Common.getSelectedPoolKey())
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
            if (index === 2) {
                alert("DANGER! Restoring old results will overwite current results.")
            }
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
            let selected = teamNumber - 1 === MainStore.eventData.controllerState.selectedTeamIndex && !Common.isSelectedPoolLocked()
            let cn = `team ${selected ? "selected" : ""} ${Common.isRoutinePlaying() || Common.isSelectedPoolLocked() ? "disabled" : ""}`
            let teamIndex = teamNumber - 1
            let onClick = Common.isSelectedPoolLocked() ? undefined : () => this.onTeamClicked(teamIndex)
            widgets.push(
                <div key={teamNumber} className={cn} onClick={onClick}>
                    {`${teamNumber}. ${Common.getPlayerNamesString(teamData.players)}`}
                </div>
            )
            ++teamNumber
        }

        return widgets
    }

    getJudgeWidget(judgeKey, categoryType) {
        let status = "Disconnected"
        let statusCN = "disconnected"
        let judgeState = Common.getJudgeState(judgeKey)
        if (Date.now() - judgeState.updatedAt < 5 * 60 * 1000) {
            if (MainStore.eventData.controllerState.selectedTeamIndex === undefined) {
                status = "Connected"
                statusCN = "connected"
            } else if (judgeState.isFinished) {
                status = "Finished"
                statusCN = "finished"
            } else if (judgeState.isEditing) {
                status = "Editing"
                statusCN = "editingState"
            } else {
                status = "Connected"
                statusCN = "connected"
            }
        }
        return (
            <div key={judgeKey} className={`judge ${statusCN}`}>
                {`${categoryType}: ${Common.getPlayerNameString(judgeKey)} - ${status}`}
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

    setNextTeam() {
        if (Common.isRoutinePlaying() || Common.isSelectedPoolLocked()) {
            return
        }

        let poolData = Common.getSelectedPoolData()
        if (poolData === undefined) {
            return
        }

        if (MainStore.eventData.controllerState.selectedTeamIndex === undefined) {
            MainStore.eventData.controllerState.selectedTeamIndex = 0
        } else if (MainStore.eventData.controllerState.selectedTeamIndex >= poolData.teamData.length - 1) {
            MainStore.eventData.controllerState.selectedTeamIndex = undefined
        } else {
            ++MainStore.eventData.controllerState.selectedTeamIndex
        }

        Common.updateEventState(undefined, {
            selectedTeamIndex: MainStore.eventData.controllerState.selectedTeamIndex
        })
    }

    onStartClicked() {
        runInAction(() => {
            if (this.getAllJudgesFinished()) {
                this.setNextTeam()
            } else {
                MainStore.eventData.controllerState.routineStartTime = Date.now()
                Common.updateEventState(undefined, MainStore.eventData.controllerState)
                this.runUpdateRoutineTimeString()

                Common.backupResults()
                setTimeout(() => {
                    Common.backupResults()
                }, 1000 * 60 * 7)
            }
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

    getAllJudgesFinished() {
        let allJudgesFinished = true
        let atLeastOneJudge = false
        let poolData = Common.getSelectedPoolData()
        if (poolData !== undefined) {
            for (let judgeKey in poolData.judges) {
                atLeastOneJudge = true
                let judgeState = Common.getJudgeState(judgeKey)
                if (!judgeState.isFinished || judgeState.teamIndex !== MainStore.eventData.controllerState.selectedTeamIndex) {
                    allJudgesFinished = false
                    break
                }
            }
        }

        return atLeastOneJudge && allJudgesFinished && MainStore.eventData.controllerState.selectedTeamIndex !== undefined
    }

    getStartButtonText() {
        if (this.getAllJudgesFinished()) {
            let poolData = Common.getSelectedPoolData()
            if (MainStore.eventData.controllerState.selectedTeamIndex < poolData.teamData.length - 1) {
                return "Click to Set Next Team"
            } else {
                return "Click to Finish Pool"
            }
        } else {
            return "Click on First Throw"
        }
    }

    getRunControls() {
        return (
            <div className="runControls">
                <h2>
                    {`Time: ${this.state.routineTimeString} / ${Common.getRoutineTimeString(Common.getSelectedPoolRoutineSeconds())} | `}
                    {`Playing: ${Common.getSelectedTeamNameString()}`}
                </h2>
                <div className="buttons">
                    <button onClick={() => this.onStartClicked()} disabled={Common.isSelectedPoolLocked() || Common.isRoutinePlaying() || Common.isRoutineFinished() && !this.getAllJudgesFinished() || MainStore.eventData.controllerState.selectedTeamIndex === undefined}>{this.getStartButtonText()}</button>
                    <button onClick={() => this.onCancelClicked()} disabled={Common.isSelectedPoolLocked() || !Common.isRoutinePlaying() && !Common.isRoutineFinished()}>Cancel Routine</button>
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
                <ResultsWidget />
            </div>
        )
    }

    getConnectionStatusWidget() {
        let pingStr = "No Connection"
        let color = "red"
        if (MainStore.pingMs !== undefined && !this.eventDataUpdater.isExpired()) {
            pingStr = MainStore.pingMs + "ms"

            if (MainStore.pingMs < 700) {
                color = "green"
            } else if (MainStore.pingMs < 2000) {
                color = "orange"
            } else {
                color = "red"
                pingStr += " Bad Connection! Interface may be laggy"
            }
        }
        let style = {
            color: color
        }
        return (
            <div>Ping: <div className="pingMs" style={style}>{pingStr}</div></div>
        )
    }

    getTimeFromBackupKey(key) {
        let poolKey = Common.getSelectedPoolKey()
        return parseInt(key.replace(poolKey + "|", ""), 10)
    }

    restorePoolData(poolKey, poolData) {
        runInAction(() => {
            if (MainStore.eventData.eventData.poolMap[poolKey].isLocked) {
                alert("Notice! You can't restore a pool when it is locked")
                return
            }

            alert("Notice! After restoring results, you need to Lock and Calculate the pool to upload restored results to the internet")
            MainStore.eventData.eventData.poolMap[poolKey] = poolData
        })
    }

    getBackupsWidget() {
        let backupData = JSON.parse(localStorage.getItem("backupData")) || {}
        let poolKey = Common.getSelectedPoolKey()

        let dataKeys = Object.keys(backupData).filter((key) => {
            return key.startsWith(poolKey)
        })
        dataKeys = dataKeys.sort((a, b) => {
            return this.getTimeFromBackupKey(b) - this.getTimeFromBackupKey(a)
        })

        let backupWidgets = dataKeys.map((key, index) => {
            return (
                <div key={index} className="backup">
                    <div>{new Date(this.getTimeFromBackupKey(key)).toISOString()}</div>
                    <button onClick={() => this.restorePoolData(poolKey, backupData[key])}>Restore</button>
                </div>
            )
        })
        return(
            <div className="backupsContainer">
                {backupWidgets}
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

        if (this.props.resultsMode) {
            let headJudgeWidgetCN = `headJudgeWidget ${this.eventDataUpdater.isExpired() ? "expired" : ""}`
            return (
                <div className={headJudgeWidgetCN}>
                    {Common.getExpiredWidget(this.eventDataUpdater)}
                    <div className="poolSelectContainer">
                        <ReactSelect value={MainStore.selectedDivision} onChange={(e) => this.onSelectDivision(e)} options={this.getDivisionOptions()} placeholder="Choose Division" isLoading={MainStore.eventData === undefined} />
                        <ReactSelect value={MainStore.selectedRound} onChange={(e) => this.onSelectRound(e)} options={this.getRoundOptions()} placeholder="Choose Round" isLoading={MainStore.eventData === undefined} />
                        <ReactSelect value={MainStore.selectedPool} onChange={(e) => this.onSelectPool(e)} options={this.getPoolOptions()} placeholder="Choose Pool" isLoading={MainStore.eventData === undefined} />
                    </div>
                    <ResultsWidget />
                </div>
            )
        } else {
            let selectDisabled = MainStore.controlsTabsSelectedIndex === 0 && Common.isRoutinePlaying()
            let headJudgeWidgetCN = `headJudgeWidget ${this.eventDataUpdater.isExpired() ? "expired" : ""}`
            return (
                <div className={headJudgeWidgetCN}>
                    {Common.getExpiredWidget(this.eventDataUpdater)}
                    <Tabs selectedIndex={MainStore.topTabsSelectedIndex} onSelect={(index) => this.onTopTabsSelectedIndexChanged(index)}>
                        <TabList>
                            <Tab>Event Info</Tab>
                            <Tab>Pool Controls</Tab>
                            <Tab>{this.getConnectionStatusWidget()}</Tab>
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
                                    <Tab>Backups</Tab>
                                </TabList>
                                <TabPanel>
                                    {this.getRunControls()}
                                </TabPanel>
                                <TabPanel>
                                    <ResultsWidget />
                                </TabPanel>
                                <TabPanel>
                                    {this.getBackupsWidget()}
                                </TabPanel>
                            </Tabs>
                        </TabPanel>
                        <TabPanel></TabPanel>
                    </Tabs>
                </div>
            )
        }
    }
}

/* eslint-disable no-loop-func */
"use strict"

const React = require("react")
const { createRoot } = require("react-dom/client")
const MobxReact = require("mobx-react")
const { Tab, Tabs, TabList, TabPanel } = require("react-tabs")
const ReactSelect = require("react-select").default
const { runInAction } = require("mobx")

const MainStore = require("./mainStore.js")
const Common = require("./common.js")
require("./judgeDataBase.js")

require("react-tabs/style/react-tabs.css")
require("./index.less")

@MobxReact.observer class Main extends React.Component {
    constructor() {
        super()
    }

    getData(url) {
        return fetch(url, {
            method: "GET",
            mode: "cors",
            headers: {
                "Content-Type": "application/json"
            }
        }).then((response) => {
            return response.json()
        })
    }

    render() {
        return (
            <div>
                <HeadJudgeInterface />
            </div>
        )
    }
}

@MobxReact.observer class Results2020Widget extends React.Component {
    constructor() {
        super()

        this.categoryOrder = [ "Diff", "Variety", "ExAi" ]
        this.categoryName = {
            Diff: "Diff",
            Variety: "Vty",
            ExAi: "AI"
        }
    }

    getCategoryHeaderWidgets(poolData) {
        let widgets = []

        for (let categoryType of this.categoryOrder) {
            let typeCount = 1
            for (let judgeKey in poolData.judges) {
                let judgeType = poolData.judges[judgeKey]
                if (categoryType === judgeType) {
                    widgets.push(
                        <div key={Math.random()} className="subHeaderCategory">
                            {`${this.categoryName[judgeType]} ${typeCount}`}
                        </div>
                    )
                    ++typeCount
                }
            }
        }

        let typeCount = 1
        for (let judgeKey in poolData.judges) {
            let judgeType = poolData.judges[judgeKey]
            if (judgeType === "ExAi") {
                widgets.push(
                    <div key={Math.random()} className="subHeaderCategory">
                        {`Ex ${typeCount}`}
                    </div>
                )
                ++typeCount
            }
        }

        widgets.push(
            <div key={Math.random()} className="subHeaderCategoryBold">
                Diff
            </div>
        )
        widgets.push(
            <div key={Math.random()} className="subHeaderCategoryBold">
                Vty
            </div>
        )
        widgets.push(
            <div key={Math.random()} className="subHeaderCategoryBold">
                AI
            </div>
        )
        widgets.push(
            <div key={Math.random()} className="subHeaderCategoryBold">
                Ex
            </div>
        )
        widgets.push(
            <div key={Math.random()} className="subHeaderCategoryBold">
                Gen
            </div>
        )

        return widgets
    }

    calcSummaryScores(poolData) {
        let scores = {
            teamCategoryScores: [],
            teamSumScores: [],
            teamTotalScores: [],
            teamRanks: [],
            maxSumScores: [ 0, 0, 0, -Infinity, 0 ]
        }

        for (let teamData of poolData.teamData) {
            let teamCategoryScores = []
            let categorySums = {
                Diff: 0,
                Variety: 0,
                ExAi: 0,
                Ex: 0,
                General: 0
            }

            let judgeData = teamData.judgeData
            for (let categoryType of this.categoryOrder) {
                for (let judgeKey in poolData.judges) {
                    let judgeType = poolData.judges[judgeKey]
                    if (categoryType === judgeType) {
                        let judge = judgeData[judgeKey]
                        let score = judge !== undefined ? Common.calcJudgeScoreCategoryOnly(judge) : 0
                        categorySums[categoryType] = categorySums[categoryType] || 0 + score
                        categorySums.General += Common.calcJudgeScoreGeneral(judge)
                        teamCategoryScores.push(score)
                    }
                }
            }

            for (let judgeKey in poolData.judges) {
                let judgeType = poolData.judges[judgeKey]
                if (judgeType === "ExAi") {
                    let judge = judgeData[judgeKey]
                    let score = judge !== undefined ? Common.calcJudgeScoreCategoryOnly(judge) : 0
                    categorySums.Ex = categorySums.Ex || 0 + score
                    teamCategoryScores.push(score)
                }
            }

            scores.maxSumScores[0] = Math.max(scores.maxSumScores[0], categorySums.Diff || 0)
            scores.maxSumScores[1] = Math.max(scores.maxSumScores[1], categorySums.Variety || 0)
            scores.maxSumScores[2] = Math.max(scores.maxSumScores[2], categorySums.ExAi || 0)
            scores.maxSumScores[3] = Math.max(scores.maxSumScores[3], categorySums.Ex || 0)
            scores.maxSumScores[4] = Math.max(scores.maxSumScores[4], categorySums.General || 0)
            scores.teamCategoryScores.push(teamCategoryScores)
            scores.teamSumScores.push([
                categorySums.Diff,
                categorySums.Variety,
                categorySums.ExAi,
                categorySums.Ex,
                categorySums.General
            ])
            scores.teamTotalScores.push(categorySums.Diff +
                categorySums.Variety +
                categorySums.ExAi +
                categorySums.Ex +
                categorySums.General)
            scores.teamRanks.push(0)
        }

        // Should handle ties. Like 1, 3, 3, 4, ...
        let sortedTotals = scores.teamTotalScores.slice(0).sort((a, b) => b - a)
        let rank = 1
        for (let i = 0; i < sortedTotals.length; ++i) {
            let sortedTotal = sortedTotals[i]
            for (let j = 0; j < scores.teamRanks.length; ++j) {
                let total = scores.teamTotalScores[j]
                if (sortedTotal === total) {
                    scores.teamRanks[j] = rank
                }
            }

            ++rank
        }

        return scores
    }

    getCategoryScoreWidget(summaryScoreData, teamIndex) {
        let widgets = []
        let teamCategoryScores = summaryScoreData.teamCategoryScores[teamIndex]
        for (let score of teamCategoryScores) {
            widgets.push(
                <div key={Math.random()} className="score">
                    {Common.round2Decimals(score)}
                </div>
            )
        }

        let teamSumScores = summaryScoreData.teamSumScores[teamIndex]
        let scoreIndex = 0
        for (let score of teamSumScores) {
            let isHighestSum = score === summaryScoreData.maxSumScores[scoreIndex] && score !== 0
            let cn = `score ${isHighestSum ? "scoreHighest" : ""}`
            widgets.push(
                <div key={Math.random()} className={cn}>
                    {`${Common.round2Decimals(score)}${isHighestSum ? "*" : ""}`}
                </div>
            )

            ++scoreIndex
        }

        return (
            <div className="scores">
                {widgets}
            </div>
        )
    }

    getTeamsSummaryWidgets(summaryScoreData, poolData) {
        let widgets = []
        let teamIndex = 0
        for (let teamData of poolData.teamData) {
            widgets.push(
                <div key={Math.random()} className="team">
                    <div className="teamDetails">
                        <div className="teamName">
                            {`${Common.getPlayerNamesString(teamData.players)}`}
                        </div>
                        {this.getCategoryScoreWidget(summaryScoreData, teamIndex)}
                    </div>
                    <div className="totals">
                        <div className="total">
                            {Common.round2Decimals(summaryScoreData.teamTotalScores[teamIndex])}
                        </div>
                        <div className="rank">
                            {summaryScoreData.teamRanks[teamIndex]}
                        </div>
                    </div>
                </div>
            )
            ++teamIndex
        }

        return widgets
    }

    getSummaryWidget(poolKey, poolName) {
        let poolData = MainStore.eventData.eventData.poolMap[poolKey]
        let summaryScoreData = this.calcSummaryScores(poolData)

        if (summaryScoreData === undefined) {
            return null
        }

        return (
            <div className="resultsSummary">
                <div className="title">
                    {`${poolName} (Summary)`}
                </div>
                <div className="results">
                    <div className="header">
                        <div className="subHeaderDescriptions">
                            <div className="subHeaderTeam">
                                Team
                            </div>
                            <div className="subHeaderCategories">
                                {this.getCategoryHeaderWidgets(poolData)}
                            </div>
                        </div>
                        <div className="subHeaderTotal">
                            Total
                        </div>
                        <div className="subHeaderRank">
                            Rank
                        </div>
                    </div>
                    <div className="teams">
                        {this.getTeamsSummaryWidgets(summaryScoreData, poolData)}
                    </div>
                </div>
            </div>
        )
    }

    getDetailedWidget(poolKey) {
        let widgets = []
        let poolData = MainStore.eventData.eventData.poolMap[poolKey]
        let teamNumber = 1
        for (let teamData of poolData.teamData) {
            let detailedWidgets = []
            for (let judgeKey in teamData.judgeData) {
                let judgeData = teamData.judgeData[judgeKey]
                detailedWidgets.push(Common.getJudgeDataDetailedWidget(judgeData))
            }

            let teanNames = Common.getPlayerNamesString(teamData.players)

            widgets.push(
                <div key={teamNumber}>
                    <div>
                        {`Team ${teamNumber}: ${teanNames}`}
                    </div>
                    {detailedWidgets}
                </div>
            )

            ++teamNumber
        }

        return widgets
    }

    render() {
        if (MainStore.eventData === undefined) {
            return (
                <div>
                    <h2>
                        No Event Data
                    </h2>
                </div>
            )
        }

        if (MainStore.selectedDivision === null || MainStore.selectedRound === null || MainStore.selectedPool === null) {
            return (
                <div>
                    <h2>
                        Select Pool Above
                    </h2>
                </div>
            )
        }

        let poolKey = Common.getSelectedPoolKey()
        let poolName = Common.makePoolName(MainStore.selectedDivision.value, MainStore.selectedRound.value, MainStore.selectedPool.value)

        return (
            <div className="results2020">
                {this.getSummaryWidget(poolKey, poolName)}
                {this.getDetailedWidget(poolKey)}
            </div>
        )
    }
}

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

@MobxReact.observer class HeadJudgeInterface extends React.Component {
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
            let cn = `team ${selected ? "selected" : ""}`
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

        if (Common.getRoutineTimeSeconds() < 15 * 60) {
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
            <div className="headJudgeInterface">
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

const container = document.getElementById("mount")
const root = createRoot(container)

root.render(
    <Main />
)


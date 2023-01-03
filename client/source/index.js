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
    }

    getDetailedWidget(poolKey) {
        let widgets = []
        let poolData = MainStore.eventData.eventData.poolMap[poolKey]
        for (let teamData of poolData.teamData) {
            for (let judgeKey in teamData.judgeData) {
                let judgeData = teamData.judgeData[judgeKey]
                widgets.push(Common.getJudgeDataDetailedWidget(judgeData))
            }
        }

        return widgets
    }

    render() {
        if (MainStore.selectedDivision === null || MainStore.selectedRound === null || MainStore.selectedPool === null) {
            return (
                <div>
                    <h2>
                        Select Pool Above
                    </h2>
                </div>
            )
        }

        let poolKey = Common.makePoolKey(MainStore.eventData.key, MainStore.selectedDivision.value, MainStore.selectedRound.value, MainStore.selectedPool.value)

        return (
            <div>
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

    getPoolWidgets(divisionData, roundData) {
        let widgets = []
        for (let poolName of roundData.poolNames) {
            let poolKey = Common.makePoolKey(MainStore.eventData.key, divisionData.name, roundData.name, poolName)
            let poolData = MainStore.eventData.eventData.poolMap[poolKey]

            let teamsLines = poolData.teamData.map((team, index) => {
                return `${index + 1}. ` + team.players.map((playerKey) => {
                    let player = MainStore.playerData[playerKey]
                    return `${player.firstName} ${player.lastName}`
                }).join(" - ")
            })
            let teamsText = teamsLines.join("\n")
            let isActive = Common.isPoolActive(poolKey)

            widgets.push(
                <div key={poolName} className={`poolWidget ${isActive ? "poolWidgetActive" : ""}`}>
                    <button onClick={() => Common.setActivePool(poolKey)} disabled={isActive}>Set Active Pool</button>
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

        this.state = { }

        Common.fetchEventData("8c14255f-9a96-45f1-b843-74e2a00d06cc")
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
        })
    }

    onControlsTabsSelectedIndexChanged(index) {
        runInAction(() => {
            MainStore.controlsTabsSelectedIndex = index
        })
    }

    render() {
        if (MainStore.eventData === undefined) {
            return <h1>No Event Data</h1>
        }

        if (MainStore.playerData === undefined) {
            return <h1>No Player Data</h1>
        }

        return (
            <div className="headJudgeInterface">
                <h1>
                    {MainStore.eventData.eventName}
                </h1>
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
                                <ReactSelect value={MainStore.selectedDivision} onChange={(e) => this.onSelectDivision(e)} options={this.getDivisionOptions()} placeholder="Choose Division" isLoading={MainStore.eventData === undefined} />
                                <ReactSelect value={MainStore.selectedRound} onChange={(e) => this.onSelectRound(e)} options={this.getRoundOptions()} placeholder="Choose Round" isLoading={MainStore.eventData === undefined} />
                                <ReactSelect value={MainStore.selectedPool} onChange={(e) => this.onSelectPool(e)} options={this.getPoolOptions()} placeholder="Choose Pool" isLoading={MainStore.eventData === undefined} />
                            </div>
                            <TabList>
                                <Tab>Run Pool</Tab>
                                <Tab>Results</Tab>
                            </TabList>
                            <TabPanel>
                                <h2>Pool A</h2>
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


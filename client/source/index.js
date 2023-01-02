"use strict"

const React = require("react")
const { createRoot } = require("react-dom/client")
const MobxReact = require("mobx-react")
const { Tab, Tabs, TabList, TabPanel } = require("react-tabs")
const ReactSelect = require("react-select").default

const MainStore = require("./mainStore.js")
const Common = require("./common.js")

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

@MobxReact.observer class EventInfoWidget extends React.Component {
    constructor() {
        super()
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
                    <button>See Results</button>
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

        this.state = {
            selectedDivision: undefined,
            selectedRound: undefined,
            selectedPool: undefined
        }

        Common.fetchEventData("8c14255f-9a96-45f1-b843-74e2a00d06cc")
        Common.fetchPlayerData()
    }

    onSelectDivision(selected) {
        this.state.selectedDivision = selected
        this.setState(this.state)
    }

    onSelectRound(selected) {
        this.state.selectedRound = selected
        this.setState(this.state)
    }

    onSelectPool(selected) {
        this.state.selectedPool = selected
        this.setState(this.state)
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
        let divisionData = this.state.selectedDivision && eventDivisionData[this.state.selectedDivision.value]
        if (divisionData === undefined) {
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
        let divisionData = this.state.selectedDivision && eventDivisionData[this.state.selectedDivision.value]
        if (divisionData === undefined) {
            return []
        }

        let roundData = this.state.selectedRound && divisionData.roundData[this.state.selectedRound.value]
        if (roundData === undefined) {
            return []
        }

        return roundData.poolNames.map((name) => {
            return {
                value: name,
                label: name
            }
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
                <Tabs defaultIndex={0}>
                    <TabList>
                        <Tab>Event Info</Tab>
                        <Tab>Pool Controls</Tab>
                    </TabList>
                    <TabPanel>
                        <EventInfoWidget />
                    </TabPanel>
                    <TabPanel>
                        <Tabs>
                            <div className="poolSelectContainer">
                                <ReactSelect value={this.state.selectedDivision} onChange={(e) => this.onSelectDivision(e)} options={this.getDivisionOptions()} placeholder="Choose Division" isLoading={MainStore.eventData === undefined} />
                                <ReactSelect value={this.state.selectedRound} onChange={(e) => this.onSelectRound(e)} options={this.getRoundOptions()} placeholder="Choose Round" isLoading={MainStore.eventData === undefined} />
                                <ReactSelect value={this.state.selectedPool} onChange={(e) => this.onSelectPool(e)} options={this.getPoolOptions()} placeholder="Choose Pool" isLoading={MainStore.eventData === undefined} />
                            </div>
                            <TabList>
                                <Tab>Run Pool</Tab>
                                <Tab>Results</Tab>
                            </TabList>
                            <TabPanel>
                                <h2>Pool A</h2>
                            </TabPanel>
                            <TabPanel>
                                <h2>Results</h2>
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


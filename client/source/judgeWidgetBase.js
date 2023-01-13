
const React = require("react")
const MobxReact = require("mobx-react")
const { runInAction } = require("mobx")
const { Tab, Tabs, TabList, TabPanel } = require("react-tabs")
const ReactSelect = require("react-select").default

const MainStore = require("./mainStore.js")
const Common = require("./common.js")

require("./judgeWidgetBase.less")

module.exports = @MobxReact.observer class JudgeWidgetBase extends React.Component {
    constructor() {
        super()

        let url = new URL(window.location.href)
        let judgeIndexParam = url.searchParams.get("judgeIndex")
        if (judgeIndexParam !== null) {
            MainStore.judgeIndex = parseInt(judgeIndexParam, 10)
        }

        Common.fetchEventData("8c14255f-9a96-45f1-b843-74e2a00d06cc").then(() => {
            runInAction(() => {
                Common.setSelectedPoolFromPoolKey(MainStore.eventData.eventState.activePoolKey)
            })
        })
        Common.fetchPlayerData()
    }

    getJudgeWidget() {
        //throw new Error("getJudgeWidget is not implemented in child")
    }

    onJudgeTabsSelectedIndex(index) {
        runInAction(() => {
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

    render() {
        if (MainStore.eventData === undefined) {
            return <h1>No Event Data</h1>
        }

        if (MainStore.judgeIndex === undefined) {
            return this.getJudgeButtonsWidget()
        } else {
            return (
                <div className="judgeWidgetBase kindleTest">
                    <Tabs selectedIndex={MainStore.judgeTabsSelectedIndex} onSelect={(index) => this.onJudgeTabsSelectedIndex(index)}>
                        <TabList>
                            <Tab>Judge</Tab>
                            <Tab>Scores</Tab>
                        </TabList>
                        <TabPanel>
                            {this.getJudgeWidget()}
                        </TabPanel>
                        <TabPanel>
                            All team scores
                        </TabPanel>
                    </Tabs>
                </div>
            )
        }
    }
}


const React = require("react")
const MobxReact = require("mobx-react")

const MainStore = require("./mainStore.js")
const Common = require("./common.js")

require("./judgeWidgetBase.less")

module.exports = @MobxReact.observer class JudgeWidgetBase extends React.Component {
    constructor() {
        super()

        Promise.all([
            Common.fetchEventData(MainStore.eventKey),
            Common.fetchPlayerData()
        ]). then(() => {
            this.onEventDataUpdatedBase()
        })

        this.eventDataUpdater = new Common.EventDataUpdateHelper(10, 1, false, () => this.onEventDataUpdatedBase(), () => this.onUpdateExpired())
    }

    updateJudgeState() {
        throw new Error("updateJudgeState is not implemented in child")
    }

    onUpdateExpired() {
        this.setState(this.state)
    }

    onTeamChanged() {
        // Do nothing
    }

    onEventDataUpdatedBase() {
        throw new Error("onEventDataUpdatedBase is not implemented in child")
    }

    postInitFectchEventData() {
        // Do nothing
    }

    getJudgeWidget() {
        throw new Error("getJudgeWidget is not implemented in child")
    }

    getJudgeData() {
        throw new Error("getJudgeData is not implemented in child")
    }

    clearScoresEditingState() {
        throw new Error("clearScoresEditingState is not implemented in child")
    }

    render() {
        return (
            <h1>
                Judge Widget Base
            </h1>
        )
    }
}

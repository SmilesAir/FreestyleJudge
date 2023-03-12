
const React = require("react")
const MobxReact = require("mobx-react")

const MainStore = require("./mainStore.js")
const Common = require("./common.js")
const Results2020Widget = require("./results2020Widget.js")
const ResultsSimpleRankingWidget = require("./resultsSimpleRankingWidget.js")

module.exports = @MobxReact.observer class ResultsWidget extends React.Component {
    constructor(props) {
        super(props)
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

        switch (Common.getActiveDivisionRulesId()) {
        case "Fpa2020":
            return <Results2020Widget />
        case "SimpleRanking":
            return <ResultsSimpleRankingWidget />
        }

        return <h1>Cannot find Results Widget</h1>
    }
}


const React = require("react")
const MobxReact = require("mobx-react")

const MainStore = require("./mainStore.js")
const Common = require("./common.js")

require("./resultsSimpleRankingWidget.less")

module.exports = @MobxReact.observer class ResultsSimpleRankingWidget extends React.Component {
    constructor(props) {
        super(props)

        if (this.props.scoreboardMode === true) {
            Common.fetchEventData(MainStore.eventKey)
            Common.fetchPlayerData()

            this.eventDataUpdater = new Common.EventDataUpdateHelper(18 * 60, 5, true)
            setTimeout(() => {
                this.eventDataUpdater.extendUpdateDeadline()
            }, 5000)
        }
    }

    getCategoryHeaderWidgets(poolData) {
        let widgets = []

        for (let i = 0; i < poolData.teamData.length; ++i) {
            widgets.push(
                <div key={Math.random()} className="subHeaderCategoryBold">
                    {Common.getPlaceFromNumber(i + 1)}
                </div>
            )
        }

        return widgets
    }

    calcSummaryScores(poolData) {
        let scores = {
            teamRankScores: [],
            teamRankTotalScores: [],
            teamRanks: [],
            judgeCount: 0
        }

        for (let teamData of poolData.teamData) {
            let total = 0
            let ranks = new Array(poolData.teamData.length).fill(0)

            for (let judgeKey in teamData.judgeData) {
                let judgeData = teamData.judgeData[judgeKey]
                if (judgeData.categoryType === "SimpleRanking") {
                    total += judgeData.rawScores.ranking

                    if (scores.teamRanks.length === 0) {
                        ++scores.judgeCount
                    }
                }
                ++ranks[judgeData.rawScores.ranking - 1]
            }

            scores.teamRankTotalScores.push(total)
            scores.teamRankScores.push(ranks)
            scores.teamRanks.push(0)
        }

        // Handle ties. Like 1, 3, 3, 4, ...
        let sortedTotals = scores.teamRankTotalScores.slice(0).sort((a, b) => a - b)
        let rank = 1
        for (let i = 0; i < sortedTotals.length; ++i) {
            let sortedTotal = sortedTotals[i]
            for (let j = 0; j < scores.teamRanks.length; ++j) {
                let total = scores.teamRankTotalScores[j]
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
        let teamRankScores = summaryScoreData.teamRankScores[teamIndex]
        for (let score of teamRankScores) {
            widgets.push(
                <div key={Math.random()} className="score">
                    {score}
                </div>
            )
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
            let teamNameCN = `teamName ${this.props.scoreboardMode ? "scoreboard" : ""}`
            widgets.push(
                <div key={Math.random()} className="team">
                    <div className="teamDetails">
                        <div className={teamNameCN}>
                            {`${Common.getPlayerNamesString(teamData.players)}`}
                        </div>
                        {this.getCategoryScoreWidget(summaryScoreData, teamIndex)}
                    </div>
                    <div className="totals">
                        <div className="total">
                            {summaryScoreData.teamRankTotalScores[teamIndex]}
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
                                {`Team (Total Judge Count: ${summaryScoreData.judgeCount})`}
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

    printFullDetails() {
        window.print()
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

        if (this.props.scoreboardMode === true) {
            return (
                <div>
                    <div className="resultsSimpleRanking">
                        {this.getSummaryWidget(poolKey, poolName)}
                    </div>
                </div>
            )
        } else {
            return (
                <div>
                    <button onClick={() => this.printFullDetails()}>Print Ranking Results</button>
                    <div className="resultsSimpleRanking">
                        {this.getSummaryWidget(poolKey, poolName)}
                    </div>
                </div>
            )
        }
    }
}

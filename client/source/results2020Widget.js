
const React = require("react")
const MobxReact = require("mobx-react")

const MainStore = require("./mainStore.js")
const Common = require("./common.js")

require("./results2020Widget.less")

module.exports = @MobxReact.observer class Results2020Widget extends React.Component {
    constructor(props) {
        super(props)

        this.categoryOrder = [ "Diff", "Variety", "ExAi" ]
        this.categoryName = {
            Diff: "Diff",
            Variety: "Vty",
            ExAi: "AI"
        }

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
                        let score = judge !== undefined ? Common.calcJudgeScoreCategoryOnly(judgeKey, teamData) : 0
                        categorySums[categoryType] = categorySums[categoryType] || 0 + score
                        categorySums.General += judge !== undefined ? Common.calcJudgeScoreGeneral(judgeKey, teamData) : 0
                        teamCategoryScores.push(score)
                    }
                }
            }

            for (let judgeKey in poolData.judges) {
                let judgeType = poolData.judges[judgeKey]
                if (judgeType === "ExAi") {
                    let judge = judgeData[judgeKey]
                    let score = judge !== undefined ? Common.calcJudgeScoreEx(judgeKey, teamData) : 0
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

        // Handle ties. Like 1, 3, 3, 4, ...
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
        let judgeKeys = Common.getSortedJudgeKeyArray(poolData)
        for (let teamData of poolData.teamData) {
            let detailedWidgets = []
            for (let judgeKey of judgeKeys) {
                if (teamData.judgeData[judgeKey] !== undefined) {
                    detailedWidgets.push(Common.getJudgeDataDetailedWidget(judgeKey, teamData))
                }
            }

            let teanNames = Common.getPlayerNamesString(teamData.players)

            widgets.push(
                <div key={teamNumber} className="detailedContainer">
                    <div className="teamHeaderName">
                        {`Team ${teamNumber}: ${teanNames}`}
                    </div>
                    {detailedWidgets}
                </div>
            )

            ++teamNumber
        }

        return widgets
    }

    printFullDetails() {
        window.print()
    }

    getJudgesListWidget() {
        let poolData = Common.getSelectedPoolData()
        if (poolData === undefined) {
            return null
        }

        let sorted = {}
        let maxRows = 0
        let judgeCN = this.props.scoreboardMode ? "scoreboard" : ""
        for (let categoryType of this.categoryOrder) {
            for (let judgeKey in poolData.judges) {
                let judgeType = poolData.judges[judgeKey]
                if (judgeType === categoryType) {
                    sorted[categoryType] = sorted[categoryType] || []
                    sorted[categoryType].push(<div key={judgeKey} className={judgeCN}>
                        {`${categoryType}: ${Common.getPlayerNameString(judgeKey)}`}
                    </div>)
                    maxRows = Math.max(maxRows, sorted[categoryType].length)
                }
            }
        }

        let lines = []
        for (let judgePerCatIndex = 0; judgePerCatIndex < maxRows; ++judgePerCatIndex) {
            let judgesLine = []
            for (let categoryType of this.categoryOrder) {
                let judges = sorted[categoryType]
                if (judgePerCatIndex < judges.length) {
                    judgesLine.push(judges[judgePerCatIndex])
                } else {
                    judgesLine.push(<div />)
                }
            }

            lines.push(<div key={Math.random()} className="judgeListRow">
                {judgesLine}
            </div>)
        }

        return (
            <div>
                {lines}
            </div>
        )
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
                    <div className="results2020">
                        {this.getSummaryWidget(poolKey, poolName)}
                        {this.getJudgesListWidget()}
                    </div>
                </div>
            )
        } else {
            return (
                <div>
                    <button onClick={() => this.printFullDetails()}>Print Full Details</button>
                    <div className="results2020">
                        {this.getSummaryWidget(poolKey, poolName)}
                        {this.getJudgesListWidget()}
                        {this.getDetailedWidget(poolKey)}
                    </div>
                </div>
            )
        }
    }
}

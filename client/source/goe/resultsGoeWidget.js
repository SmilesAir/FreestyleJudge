
const React = require("react")
const MobxReact = require("mobx-react")

const MainStore = require("../mainStore.js")
const Common = require("../common.js")
const { runInAction } = require("mobx")

require("./resultsGoeWidget.less")

module.exports = @MobxReact.observer class ResultsGoeWidget extends React.Component {
    constructor(props) {
        super(props)

        this.categoryName = {
            GoeDiff: "Diff",
            GoeTech: "Tech",
            GoeSub: "Sub"
        }

        this.state = {
            isSummaryPrintOnly: false
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

        for (let categoryType of Common.categoryOrder) {
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

        widgets.push(
            <div key={Math.random()} className="subHeaderCategoryBold">
                Diff
            </div>
        )
        widgets.push(
            <div key={Math.random()} className="subHeaderCategoryBold">
                Tech
            </div>
        )
        widgets.push(
            <div key={Math.random()} className="subHeaderCategoryBold">
                Sub
            </div>
        )

        return widgets
    }

    calcSummaryScores(poolData, isHideScores) {
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
                GoeDiff: 0,
                GoeTech: 0,
                GoeSub: 0
            }

            if (!isHideScores) {
                let judgeData = teamData.judgeData
                for (let categoryType of Common.categoryOrder) {
                    for (let judgeKey in poolData.judges) {
                        let judgeType = poolData.judges[judgeKey]
                        if (categoryType === judgeType) {
                            let judge = judgeData[judgeKey]
                            let score = judge !== undefined ? Common.calcJudgeScoreCategoryOnly(judgeKey, teamData) : 0
                            categorySums[categoryType] = (categorySums[categoryType] || 0) + score
                            teamCategoryScores.push(score)
                        }
                    }
                }
            }

            scores.maxSumScores[0] = Math.max(scores.maxSumScores[0], categorySums.GoeDiff || 0)
            scores.maxSumScores[1] = Math.max(scores.maxSumScores[1], categorySums.GoeTech || 0)
            scores.maxSumScores[2] = Math.max(scores.maxSumScores[2], categorySums.GoeSub || 0)
            scores.teamCategoryScores.push(teamCategoryScores)
            scores.teamSumScores.push([
                categorySums.GoeDiff,
                categorySums.GoeTech,
                categorySums.GoeSub,
            ])
            scores.teamTotalScores.push(
                categorySums.GoeTech +
                categorySums.GoeSub
            )
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
        let summaryScoreData = this.calcSummaryScores(poolData, Common.getIsScoresHidden())

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

    getTeamGraph(teamData) {
        if (teamData === undefined || teamData.judgeInstances === undefined) {
            return null
        }

        let allScoreSumPerDiff = {
            GoeTech: [],
            GoeSub: [],
            GoeDiff: []
        }
        for (let judge of Object.values(teamData.judgeInstances)) {
            let judgeDetails = judge.getFullCalcDetails(teamData.judgePreProcessData)
            if (judgeDetails.categoryType === "GoeTech" || judgeDetails.categoryType === "GoeSub") {
                let scoreSumPerDiff = allScoreSumPerDiff[judgeDetails.categoryType]
                for (let perDiffDetails of judgeDetails.details) {
                    for (let [i, detail] of perDiffDetails.details.entries()) {
                        scoreSumPerDiff[i] = scoreSumPerDiff[i] || {
                            score: 0,
                            value: 0,
                            used: false,
                            count: 0
                        }
                        scoreSumPerDiff[i].value += detail.goe.value
                        scoreSumPerDiff[i].score += detail.score
                        scoreSumPerDiff[i].used |= perDiffDetails.countedScores.find((data) => data === detail) !== undefined
                        ++scoreSumPerDiff[i].count
                    }
                }
            } else if (judgeDetails.categoryType === "GoeDiff") {
                for (let [i, diff] of judgeDetails.details.entries()) {
                    allScoreSumPerDiff.GoeDiff[i] = allScoreSumPerDiff.GoeDiff[i] || {
                        time: diff.time - judgeDetails.details[0].time,
                        score: 0,
                        count: 0
                    }
                    allScoreSumPerDiff.GoeDiff[i].score += diff.value
                    ++allScoreSumPerDiff.GoeDiff[i].count
                }
            }
        }

        for (let category of Object.values(allScoreSumPerDiff)) {
            for (let diffEvent of category) {
                diffEvent.score /= diffEvent.count
                diffEvent.value /= diffEvent.count
            }
        }

        let renderDetails = []
        for (let i = 0; i < allScoreSumPerDiff.GoeDiff.length; ++i) {
            let diff = allScoreSumPerDiff.GoeDiff[i]
            let tech = allScoreSumPerDiff.GoeTech[i]
            let sub = allScoreSumPerDiff.GoeSub[i]
            renderDetails.push({
                time: diff.time,
                diff: diff.score,
                techScore: tech.score,
                techValue: tech.value,
                subScore: sub.score,
                subValue: sub.value,
                used: tech.used || sub.used
            })
        }

        let lastTime = renderDetails[renderDetails.length - 1].time
        let bars = renderDetails.map((data) => {
            let diffNormalized = data.diff / MainStore.configData.diffValueMax
            const maxBarHeight = 90
            const barWidth = 2
            let barStyle = {
                "left": `${5 + 90 * (data.time / lastTime)}%`,
                "height": `${maxBarHeight * diffNormalized}%`,
                "width": `${barWidth}em`
            }
            let techStyle = {
                "height": `${100 * data.techValue / MainStore.configData.techValueMax}%`
            }
            let subStyle = {
                "height": `${100 * data.subValue / MainStore.configData.subValueMax}%`
            }
            console.log(barStyle, techStyle)
            return (
                <div key={data.time} className={`bar ${data.used ? "used" : ""}`} style={barStyle}>
                    <div className="tech" style={techStyle}/>
                    <div className="sub" style={subStyle}/>
                </div>
            )
        })

        console.log(1, renderDetails)

        return (
            <div className="graph">
                {bars}
            </div>
        )
    }

    getDetailedWidget(poolKey) {
        if (Common.getIsScoresHidden()) {
            return null
        }

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
                <div key={teamNumber} className={`detailedContainer ${this.state.isSummaryPrintOnly ? "detailedContainerNone" : ""}`}>
                    <div className="teamHeaderName">
                        {`Team ${teamNumber}: ${teanNames}`}
                    </div>
                    {this.getTeamGraph(teamData)}
                    {detailedWidgets}
                </div>
            )

            ++teamNumber
        }

        return widgets
    }

    printFullDetails() {
        this.state.isSummaryPrintOnly = false
        this.setState(this.state)

        setTimeout(() => {
            window.print()
        }, 1)
    }

    printSummary() {
        this.state.isSummaryPrintOnly = true
        this.setState(this.state)

        setTimeout(() => {
            window.print()
        }, 1)
    }

    getJudgesListWidget() {
        if (MainStore.isAnonJudges === true || !Common.getIsScoresHidden()) {
            return null
        }

        let poolData = Common.getSelectedPoolData()
        if (poolData === undefined) {
            return null
        }

        let sorted = {}
        let maxRows = 0
        let judgeCN = this.props.scoreboardMode ? "scoreboard" : ""
        for (let categoryType of Common.categoryOrder) {
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
            for (let categoryType of Common.categoryOrder) {
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
            <div className={`${this.state.isSummaryPrintOnly ? "judgeSummaryNone" : ""}`}>
                {lines}
            </div>
        )
    }

    unlockPool() {
        runInAction(() => {
            let poolKey = Common.getSelectedPoolKey()
            Common.unlockPoolResults(poolKey)
        })
    }

    lockAndCalcResults() {
        runInAction(() => {
            let poolKey = Common.getSelectedPoolKey()
            Common.lockAndCalcPoolResults(poolKey)
        })
    }

    getLockAndCalcResultsWidget() {
        let poolKey = Common.getSelectedPoolKey()
        let poolData = MainStore.eventData.eventData.poolMap[poolKey]

        if (poolData.isLocked === true) {
            return <button onClick={() => this.unlockPool()}>Unlock Results</button>
        } else {
            return <button onClick={() => this.lockAndCalcResults()}>Lock and Calc Results</button>
        }
    }

    getResultsFilename() {
        return `${MainStore.eventData.eventName} - ${Common.makePoolName(MainStore.selectedDivision.value, MainStore.selectedRound.value, MainStore.selectedPool.value)}`
    }

    toggleAnonJudges() {
        MainStore.isAnonJudges = !MainStore.isAnonJudges
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
                    <div className="resultsGoe">
                        {this.getSummaryWidget(poolKey, poolName)}
                        {this.getJudgesListWidget()}
                    </div>
                </div>
            )
        } else {
            return (
                <div>
                    <button onClick={() => this.printSummary()}>Print Summary</button>
                    <button onClick={() => this.printFullDetails()}>Print Full Details</button>
                    {MainStore.isPermalink ? null : <button onClick={() => this.toggleAnonJudges()}>Toggle Anon Judges</button>}
                    {MainStore.isPermalink ? null : this.getLockAndCalcResultsWidget()}
                    <div id="results" className="resultsGoe">
                        {this.getSummaryWidget(poolKey, poolName)}
                        {this.getJudgesListWidget()}
                        {this.getDetailedWidget(poolKey)}
                    </div>
                </div>
            )
        }
    }
}

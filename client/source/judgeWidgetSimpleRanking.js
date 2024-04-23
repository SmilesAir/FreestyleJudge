/* eslint-disable no-lonely-if */

const React = require("react")
const { runInAction } = require("mobx")
const { v4: uuidv4 } = require("uuid")

const Common = require("./common.js")
const JudgeWidgetBase = require("./judgeWidgetBase.js")
const MainStore = require("./mainStore.js")

require("./judgeWidgetSimpleRanking.less")

module.exports = class JudgeWidgetSimpleRanking extends JudgeWidgetBase {
    constructor() {
        super()

        this.state = {
            judgeDataArray: undefined,
            localData: undefined,
            isEditing: true
        }
    }

    postInitFectchEventData() {
    }

    onEventDataUpdatedBase() {
        runInAction(() => {
            let localDataString = window.localStorage.getItem("simpleRankingData")
            this.state.localData = localDataString && JSON.parse(localDataString) || undefined
            console.log(this.state.localData)
            if (this.state.localData === undefined) {
                MainStore.judgeKey = uuidv4()
                this.state.localData = {
                    judgeKey: MainStore.judgeKey,
                    [MainStore.eventData.eventState.activePoolKey] : {
                        rankings: []
                    }
                }
            }
            if (this.state.localData.judgeKey === undefined) {
                MainStore.judgeKey = uuidv4()
                this.state.localData.judgeKey = MainStore.judgeKey
            }
            if (this.state.localData[MainStore.eventData.eventState.activePoolKey] === undefined) {
                this.state.localData[MainStore.eventData.eventState.activePoolKey] = {
                    rankings: [],
                    isEditing: true
                }
            }

            MainStore.judgeKey = this.state.localData.judgeKey
            window.localStorage.setItem("simpleRankingData", JSON.stringify(this.state.localData))

            Common.setSelectedPoolFromPoolKey(MainStore.eventData.eventState.activePoolKey)
            this.state.judgeDataArray = Common.getJudgeDataArrayByJudgeKey()
            this.state.isEditing = this.state.localData[MainStore.eventData.eventState.activePoolKey].isEditing
            this.state.isEditing = this.state.isEditing === undefined ? true : this.state.isEditing
            this.setState(this.state)

            this.eventDataUpdater.extendUpdateDeadline()

            this.postInitFectchEventData()

            let noneSet = true
            for (let data of this.state.judgeDataArray) {
                if (data.data.ranking !== undefined) {
                    noneSet = false
                    break
                }
            }

            if (noneSet) {
                for (let i = 0; i < this.state.judgeDataArray.length; ++i) {
                    let data = this.state.judgeDataArray[i].data
                    let rank = this.state.localData[MainStore.eventData.eventState.activePoolKey].rankings[i]
                    data.ranking = rank !== null ? rank : undefined
                }
            }
        })
    }

    adjustPlace(teamIndex, dir) {
        if (!this.state.isEditing) {
            return
        }

        let curRank = this.state.judgeDataArray[teamIndex].data.ranking
        if (dir > 0) {
            if (curRank === undefined) {
                for (let data of this.state.judgeDataArray) {
                    if (data.data.ranking !== undefined) {
                        ++data.data.ranking
                    }
                }
                this.state.judgeDataArray[teamIndex].data.ranking = 1
            } else if (curRank > 1) {
                for (let i = 0; i < this.state.judgeDataArray.length; ++i) {
                    let data = this.state.judgeDataArray[i].data
                    if (data.ranking === curRank - 1) {
                        ++data.ranking
                        break
                    }
                }

                --this.state.judgeDataArray[teamIndex].data.ranking
            }
        } else {
            if (curRank === undefined) {
                for (let i = 0; i < this.state.judgeDataArray.length; ++i) {
                    let data = this.state.judgeDataArray[i].data
                    if (data.ranking > 1) {
                        ++data.ranking
                    }
                }
                this.state.judgeDataArray[teamIndex].data.ranking = 2
            } else {
                let rankedCount = 0
                for (let data of this.state.judgeDataArray) {
                    if (data.data.ranking !== undefined) {
                        ++rankedCount
                    }
                }

                if (curRank < rankedCount) {
                    for (let i = 0; i < this.state.judgeDataArray.length; ++i) {
                        let data = this.state.judgeDataArray[i].data
                        if (data.ranking === curRank + 1) {
                            --data.ranking
                            break
                        }
                    }

                    ++this.state.judgeDataArray[teamIndex].data.ranking
                }
            }
        }

        this.state.localData[MainStore.eventData.eventState.activePoolKey] = {
            rankings: this.state.judgeDataArray.map((data) => {
                return data.data.ranking !== null ? data.data.ranking : undefined
            })
        }
        window.localStorage.setItem("simpleRankingData", JSON.stringify(this.state.localData))

        this.updateJudgeData()
        this.setState(this.state)
    }

    getIsAllSet() {
        if (this.state.judgeDataArray === undefined) {
            return false
        }

        let allSet = true
        for (let data of this.state.judgeDataArray) {
            if (data.data.ranking === undefined) {
                allSet = false
                break
            }
        }

        return allSet
    }

    updateJudgeData() {
        this.eventDataUpdater.extendUpdateDeadline()

        if (!this.getIsAllSet()) {
            return
        }

        for (let i = 0; i < this.state.judgeDataArray.length; ++i) {
            this.state.judgeDataArray[i].updateJudgeData(i)
        }
    }

    getTeamWidgets() {
        let poolData = Common.getSelectedPoolData()
        if (poolData === undefined || this.state.judgeDataArray === undefined) {
            return null
        }

        let widgets = []
        for (let i = 0; i < poolData.teamData.length; ++i) {
            let teamData = poolData.teamData[i]
            let playerNames = Common.getPlayerFirstNamesString(teamData.players)
            let ranking = this.state.judgeDataArray[i].data.ranking
            widgets.push(
                <div key={i} className="team">
                    <div className="names">
                        {playerNames}
                    </div>
                    <div className="controls">
                        <button className="down" disabled={!this.state.isEditing} onClick={() => this.adjustPlace(i, -1)}>⬇</button>
                        <div className="score">
                            {ranking ? Common.getPlaceFromNumber(ranking) : "-"}
                        </div>
                        <button className="up" disabled={!this.state.isEditing} onClick={() => this.adjustPlace(i, 1)}>⬆</button>
                    </div>
                </div>
            )
        }

        return widgets
    }

    onSubmitClick() {
        this.state.isEditing = !this.state.isEditing
        this.setState(this.state)

        this.state.localData[MainStore.eventData.eventState.activePoolKey].isEditing = this.state.isEditing
        window.localStorage.setItem("simpleRankingData", JSON.stringify(this.state.localData))
    }

    render() {
        let submitText = this.state.isEditing ? "Submit" : "Submitted | Click to Edit"
        let cn = `simpleRanking ${this.eventDataUpdater.isExpired() ? "expired" : ""}`
        return (
            <div className={cn}>
                {Common.getExpiredWidget(this.eventDataUpdater)}
                <div className="instructions">
                    <p>Use the arrow buttons to increase or decrease the Place of the team. 1st is the highest Place.<br />
                    Results are sent by pressing Submit once all teams have a rank.</p>
                </div>
                <div>
                    {this.getTeamWidgets()}
                </div>
                <div className="submit">
                    <button className="submit" onClick={() => this.onSubmitClick()} disabled={!this.getIsAllSet()} >{submitText}</button>
                </div>
            </div>
        )
    }
}

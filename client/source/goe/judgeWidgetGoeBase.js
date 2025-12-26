
const React = require("react")
const MobxReact = require("mobx-react")
const { runInAction } = require("mobx")
const { Tab, Tabs, TabList, TabPanel } = require("react-tabs")

const MainStore = require("../mainStore.js")
const Common = require("../common.js")
const JudgeWidgetBase = require("../judgeWidgetBase.js")

require("../judgeWidgetBase.less")

module.exports = class JudgeWidgetGoeBase extends JudgeWidgetBase {
    constructor() {
        super()

        runInAction(() => {
            MainStore.judgeTabsSelectedIndex = parseInt(window.localStorage.getItem("judgeTabsSelectedIndex"), 10) || 0
        })

        this.state = {
            routineTimeString: "0:00",
            teamIndex: undefined,
            sentRoutineStartedEvent: false,
            isFinished: false,
            windowTop: 0,
            windowBottom: 100,
            targetWindowTop: 0,
            targetWindowBottom: 100,
            sliderHeight: 100,
            sliderTop: 0,
            selectedEditMark: undefined,
            newMarkTime: undefined
        }

        this.timeUpdater = new Common.TimeUpdateHelper(() => this.onTimeUpdate())
    }

    onSliderControlClick(command) {
        const moveRatio = 1.7
        const zoomAmount = 20
        const maxBottom = 130
        let windowSize = this.state.windowBottom - this.state.windowTop
        if (command === "^") {
            let amount = Math.min(this.state.targetWindowTop, windowSize / moveRatio)
            this.state.targetWindowTop -= amount
            this.state.targetWindowBottom -= amount
        } else if (command === "v") {
            let amount = Math.min(Math.max(maxBottom - this.state.targetWindowBottom, 0), windowSize / moveRatio)
            this.state.targetWindowTop += amount
            this.state.targetWindowBottom += amount
        } else if (command === "+") {
            let mid = (this.state.windowBottom - this.state.windowTop) / 2
            let shrinkSize = windowSize / 2 - zoomAmount
            this.state.targetWindowTop = mid - shrinkSize
            this.state.targetWindowBottom = mid + shrinkSize
        } else if (command === "-") {
            let mid = (this.state.windowBottom - this.state.windowTop) / 2
            let expandSize = windowSize / 2 + zoomAmount
            this.state.targetWindowTop = mid - expandSize
            this.state.targetWindowBottom = mid + expandSize
        }

        if (this.state.targetWindowTop < 0) {
            this.state.targetWindowBottom -= this.state.targetWindowTop
            this.state.targetWindowTop = 0
        }

        windowSize = this.state.targetWindowBottom - this.state.targetWindowTop
        this.state.sliderHeight = Math.min(100, Math.max(20, windowSize))

        let actualMaxBottom = Math.max(maxBottom, this.state.targetWindowBottom)
        let emptySize = this.state.targetWindowTop + actualMaxBottom - this.state.targetWindowBottom
        let topOffest = 0
        if (emptySize > 0) {
            topOffest = this.state.targetWindowTop / emptySize * (100 - this.state.sliderHeight)
        }
        this.state.sliderTop = topOffest

        this.setState(this.state)

        this.updateWindowPos()
    }

    updateWindowPos() {
        const minMove = 1
        let deltaTop = this.state.targetWindowTop - this.state.windowTop
        if (Math.abs(deltaTop) <= minMove) {
            this.state.windowTop = this.state.targetWindowTop
        } else {
            this.state.windowTop += deltaTop / 3
        }

        let deltaBottom = this.state.targetWindowBottom - this.state.windowBottom
        if (Math.abs(deltaBottom) <= minMove) {
            this.state.windowBottom = this.state.targetWindowBottom
        } else {
            this.state.windowBottom += deltaBottom / 3
        }

        this.setState(this.state)

        if (this.state.targetWindowTop !== this.state.windowTop ||
            this.state.targetWindowBottom !== this.state.targetWindowBottom) {
            setTimeout(() => this.updateWindowPos(), 30)
        }
    }

    getBaselineControlWidget() {
        let style = {
            "height": `${this.state.sliderHeight}%`,
            "top": `${this.state.sliderTop}%`
        }

        return (
            <div className="control">
                <button onClick={() => this.onSliderControlClick("^")}>▲</button>
                <button onClick={() => this.onSliderControlClick("v")}>▼</button>
                <div className="sliderWidget">
                    <div className="slider" style={style}/>
                </div>
                <button onClick={() => this.onSliderControlClick("+")}>+</button>
                <button onClick={() => this.onSliderControlClick("-")}>-</button>
            </div>
        )
    }

    onBaselineClickBase(e, baselineValueMax) {
        if (this.state.newMarkTime === undefined && this.state.selectedEditMark === undefined) {
            this.setState({ newMarkTime: Date.now() })
            return
        }

        let rect = e.target.getBoundingClientRect()
        let yNormalized = (e.clientY - rect.top) / (rect.height - rect.top)
        let windowSize = this.state.windowBottom - this.state.windowTop
        let value = yNormalized * windowSize / 100 * baselineValueMax
        value += this.state.windowTop / 100 * baselineValueMax

        if (this.state.selectedEditMark !== undefined) {
            runInAction(() => {
                this.state.selectedEditMark.value = value
                this.updateJudgeData()
                this.setState(this.state)
            })
        } else {
            this.onBaselineClick(this.state.newMarkTime, value)
            this.setState({ newMarkTime: undefined })
        }
    }

    onBaselineClick(newMarkTime, value) {
        throw new Error("onBaselineClick is not implemented in child")
    }

    getBaselineWidget(baselineArray, baselineValueMax, allowZoom) {
        let moves = []
        for (let bv of baselineArray) {
            let normalizePos = bv.value / baselineValueMax * 100
            if (normalizePos >= this.state.windowTop && normalizePos <= this.state.windowBottom) {
                let pos = (normalizePos - this.state.windowTop) / (this.state.windowBottom - this.state.windowTop) * 100
                let style = {
                    "top": `${pos * .9}%`
                }
                moves.push(<div key={bv.label} className="baselineValue" style={style}>{bv.label}</div>)
            }
        }
        return (
            <div className="baseline">
                <div className="baselineValueWidget" onClick={(e) => this.onBaselineClickBase(e, baselineValueMax)}>
                    {moves}
                </div>
                {allowZoom ? this.getBaselineControlWidget() : null}
            </div>
        )
    }

    onEditMarkClick(data) {
        this.setState({
            newMarkTime: undefined,
            selectedEditMark: data
        })
    }

    closeMarkEditor() {
        this.setState({
            selectedEditMark: undefined
        })
    }

    removeMark(scores, mark) {
        runInAction(() => {
            let index = scores.indexOf(mark)
            if (index >= 0) {
                scores.splice(index, 1)
            }

            this.closeMarkEditor()

            this.updateJudgeData()
        })
    }

    moveMarkTime(scores, milliseconds) {
        runInAction(() => {
            this.state.selectedEditMark.time += milliseconds
            scores.sort((a, b) => a.time - b.time)

            this.updateJudgeData()
            this.setState(this.state)
        })
    }

    getEditMarkWidget(scores) {
        if (this.state.selectedEditMark === undefined) {
            return null
        }

        const moveTimeAmount = 5 * 1000

        return (
            <div className="edit">
                <button onClick={() => this.closeMarkEditor()}>Close</button>
                <div className="arrows">
                    <button onClick={() => this.moveMarkTime(scores, -moveTimeAmount)}>←</button>
                    <button onClick={() => this.moveMarkTime(scores, moveTimeAmount)}>→</button>
                </div>
                <div className="header">
                    <div>
                        {Math.round((this.state.selectedEditMark.time - scores[0].time) / 1000)}
                    </div>
                    <div>
                        {Common.round1Decimals(this.state.selectedEditMark.value)}
                    </div>
                </div>
                <button className="remove" onClick={() => this.removeMark(scores, this.state.selectedEditMark)}>Remove</button>
            </div>
        )
    }

    getEnterMarkWidget() {
        if (this.state.newMarkTime === undefined) {
            return null
        }

        return (
            <div className="enter">
                <button>Cancel Input</button>
            </div>
        )
    }

    getHistoryWidget(scores, baselineValueMax) {
        const widthInEm = 3
        const paddingInEm = .25
        let right = (scores.length - 1) * (widthInEm + paddingInEm)
        let widgets = scores.map((data) => {
            let style = {
                "top": `${data.value / baselineValueMax * 90}%`,
                "right": `${right}em`,
                "width": `${widthInEm}em`
            }
            right -= widthInEm + paddingInEm

            return (
                <div key={data.time} className="mark" style={style}>
                    <div>{Common.round1Decimals(data.value)}</div>
                    <button onClick={() => this.onEditMarkClick(data)}>✎</button>
                </div>
            )
        })

        return (
            <div className="history">
                {widgets}
                {this.getEditMarkWidget(scores)}
                {this.getEnterMarkWidget()}
            </div>
        )
    }

    updateJudgeState() {
        let judgeData = this.getJudgeData()
        if (judgeData === undefined) {
            return
        }
        judgeData = judgeData.data

        Common.updateJudgeState({
            judgeKey: judgeData.judgeKey,
            isFinished: Common.isRoutineFinished() && this.state.isFinished,
            isEditing: MainStore.judgeTabsSelectedIndex === 1,
            updatedAt: Date.now(),
            teamIndex: this.state.teamIndex
        })
    }

    onTimeUpdate() {
        let routineTimeSeconds = Common.getRoutineTimeSeconds()
        if (!Common.isRoutinePlaying() || routineTimeSeconds > 15 * 60) {
            this.timeUpdater.stopUpdate()
        }

        this.state.routineTimeString = Common.getRoutineTimeString(routineTimeSeconds)
        this.setState(this.state)
    }

    onUpdateExpired() {
        this.setState(this.state)
    }

    onTeamChanged() {
        // Do nothing
    }

    onRoutineStarted() {
        runInAction(() => {
            MainStore.judgeTabsSelectedIndex = 0
        })
    }

    onEventDataUpdatedBase() {
        runInAction(() => {
            Common.setSelectedPoolFromPoolKey(MainStore.eventData.eventState.activePoolKey)
            this.judgeDataArray = Common.getJudgeDataArrayForCurrentJudgeIndex()
            if (this.state.teamIndex !== MainStore.eventData.controllerState.selectedTeamIndex) {
                this.state.teamIndex = MainStore.eventData.controllerState.selectedTeamIndex
                this.onTeamChanged()
            }
            if (Common.isRoutinePlaying()) {
                if (!this.state.sentRoutineStartedEvent) {
                    this.state.sentRoutineStartedEvent = true
                    this.onRoutineStarted()
                }
            } else {
                this.state.sentRoutineStartedEvent = false
            }

            this.eventDataUpdater.extendUpdateDeadline()

            this.postInitFectchEventData()

            this.timeUpdater.startUpdate()

            this.updateJudgeState()
        })
    }

    postInitFectchEventData() {
        // Do nothing
    }

    getJudgeWidget() {
        throw new Error("getJudgeWidget is not implemented in child")
    }

    getJudgeData() {
        if (this.judgeDataArray === undefined) {
            return undefined
        }

        return this.judgeDataArray[this.state.teamIndex]
    }

    clearScoresEditingState() {
        throw new Error("clearScoresEditingState is not implemented in child")
    }

    onJudgeTabsSelectedIndex(index) {
        runInAction(() => {
            this.clearScoresEditingState()

            MainStore.judgeTabsSelectedIndex = index
            window.localStorage.setItem("judgeTabsSelectedIndex", index)

            this.updateJudgeState()
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
        if (poolData === undefined) {
            return <h1>Pool Data Missing</h1>
        }

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

    getInfoWidget() {
        return (
            <div className="infoWidget">
                <div className="teamNames">
                    {Common.getSelectedTeamFirstNameString()}
                </div>
                <div className="time">
                    {this.state.routineTimeString}
                </div>
            </div>
        )
    }

    gotoJudgeSelect() {
        let url = new URL(window.location.href)
        url.searchParams.delete("judgeIndex")
        window.location.href = url.href
    }

    scoresTeamWidget() {
        throw new Error("scoresTeamWidget is not implemented in child")
    }

    scoresWidget() {
        let judgeName = Common.getPlayerNameForCurrentJudgeIndex()

        return (
            <div className="scoresWidget">
                <div className="header">
                    <div className="judgeName">
                        {judgeName}
                    </div>
                    <button onClick={() => this.gotoJudgeSelect()}>Judge Select</button>
                </div>
                {this.scoresTeamWidget()}
            </div>
        )
    }

    updateJudgeData() {
        if (this.state.teamIndex !== undefined) {
            this.getJudgeData().updateJudgeData(this.state.teamIndex)
        }

        if (this.state.scoresEditIndexTeam !== undefined) {
            this.judgeDataArray[this.state.scoresEditIndexTeam].updateJudgeData(this.state.scoresEditIndexTeam)
        }

        this.eventDataUpdater.extendUpdateDeadline()
    }

    onFinish() {
        console.log("TODO")
    }

    getFinishedWidget() {
        let judgeData = this.getJudgeData()
        if (judgeData === undefined) {
            return null
        }

        if (!Common.isRoutineFinished() || this.state.isFinished) {
            return null
        }

        return (
            <div className="finishedWidget">
                <button onClick={() => this.onFinish()}>Click To Finish</button>
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
            //let cn = `judgeWidgetBase kindleTest ${this.eventDataUpdater.isExpired() ? "expired" : ""}`
            let cn = `judgeWidgetBase ${this.eventDataUpdater.isExpired() ? "expired" : ""}`
            return (
                <div className={cn}>
                    {Common.getExpiredWidget(this.eventDataUpdater)}
                    {this.getFinishedWidget()}
                    {this.getInfoWidget()}
                    <Tabs selectedIndex={MainStore.judgeTabsSelectedIndex} onSelect={(index) => this.onJudgeTabsSelectedIndex(index)}>
                        <TabList>
                            <Tab>Judge</Tab>
                            <Tab>Scores</Tab>
                        </TabList>
                        <TabPanel>
                            {this.getJudgeWidget()}
                        </TabPanel>
                        <TabPanel>
                            {this.scoresWidget()}
                        </TabPanel>
                    </Tabs>
                </div>
            )
        }
    }
}

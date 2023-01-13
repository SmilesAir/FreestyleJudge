
const React = require("react")
const MobxReact = require("mobx-react")
const { runInAction } = require("mobx")
const { Tab, Tabs, TabList, TabPanel } = require("react-tabs")
const ReactSelect = require("react-select").default

const MainStore = require("./mainStore.js")
const Common = require("./common.js")
const JudgeWidgetBase = require("./judgeWidgetBase.js")

module.exports = class JudgeWidgetDiff extends JudgeWidgetBase {
    constructor() {
        super()
    }

    getInputNumberWidget() {
        return (
            <div className="inputNumberWidget">
                <div className="row">
                    <div className="cell">
                        <button>7</button>
                    </div>
                    <div className="cell">
                        <button>8</button>
                    </div>
                    <div className="cell">
                        <button>9</button>
                    </div>
                    <div className="cell">
                        <button>10</button>
                    </div>
                </div>
                <div className="row">
                    <div className="cell">
                        <button>4</button>
                    </div>
                    <div className="cell">
                        <button>5</button>
                    </div>
                    <div className="cell">
                        <button>6</button>
                    </div>
                    <div className="cell">
                    </div>
                </div>
                <div className="row">
                    <div className="cell">
                        <button>1</button>
                    </div>
                    <div className="cell">
                        <button>2</button>
                    </div>
                    <div className="cell">
                        <button>3</button>
                    </div>
                    <div className="cell">
                    </div>
                </div>
                <div className="row">
                    <div className="cell">
                        <button>0</button>
                    </div>
                    <div className="cell">
                        <button>.5</button>
                    </div>
                    <div className="cell">
                    </div>
                    <div className="cell">
                        <button>X</button>
                    </div>
                </div>
            </div>
        )
    }

    getPhrasesWidget() {
        let testScores = [ 1, 2, 3, 4, 5, 6.5, 7, 8, 9, 10, 1, 2.5, 3, 4, 5, 6, 7, 8, 9.5, 10, 1, 2, 3, 4, 5, 6, 7.5, 8, 9, 10 ]

        let scores = testScores.slice(0)
        let blocks = []
        const blockSize = 5
        for (let i = 0; i < scores.length; i += blockSize) {
            let newScores = []
            for (let j = 0; j < blockSize && i + j < scores.length; ++j) {
                let score = scores[i + j]
                newScores.push(
                    <div key={i + j} className="score noselect">
                        {score}
                    </div>
                )
            }

            blocks.push(
                <div key={i} className="block">
                    {newScores}
                </div>
            )
        }

        return (
            <div className="phrasesWidget">
                {blocks}
            </div>
        )
    }

    getJudgeWidget() {
        return (
            <div className="judgeWidgetDiff">
                {this.getPhrasesWidget()}
                <div className="diffInputNumberWidget">
                    {this.getInputNumberWidget()}
                </div>
            </div>
        )
    }

    onJudgeTabsSelectedIndex(index) {
        runInAction(() => {
            MainStore.judgeTabsSelectedIndex = index
            window.localStorage.setItem("judgeTabsSelectedIndex", index)
        })
    }
}

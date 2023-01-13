/* eslint-disable no-loop-func */
"use strict"

const React = require("react")
const { createRoot } = require("react-dom/client")
const MobxReact = require("mobx-react")

const MainStore = require("./mainStore.js")
const Common = require("./common.js")
const HeadJudgeWidget = require("./headJudgeWidget.js")
const JudgeWidgetBase = require("./judgeWidgetBase.js")
const JudgeWidgetDiff = require("./judgeWidgetDiff.js")
require("./judgeDataBase.js")

require("react-tabs/style/react-tabs.css")
require("./index.less")

@MobxReact.observer class Main extends React.Component {
    constructor() {
        super()

        let url = new URL(window.location.href)
        let startupParam = url.searchParams.get("startup")
        if (startupParam !== null) {
            MainStore.currentWidgetName = startupParam
        }
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
        let widget = null
        switch(MainStore.currentWidgetName) {
        case "head":
            widget = <HeadJudgeWidget />
            break
        case "judge": {
            if (MainStore.judgeIndex !== undefined) {
                let judgeCategoryType = Common.getCategoryTypeForJudgeIndex(MainStore.judgeIndex)
                switch (judgeCategoryType) {
                case "Diff":
                    widget = <JudgeWidgetDiff />
                    break
                default:
                    widget = <JudgeWidgetBase />
                }
            } else {
                widget = <JudgeWidgetBase />
            }
            break
        }
        default:
            widget =
                <div>
                    No widget {MainStore.currentWidgetName}
                </div>
        }

        return widget
    }
}

const container = document.getElementById("mount")
const root = createRoot(container)

root.render(
    <Main />
)


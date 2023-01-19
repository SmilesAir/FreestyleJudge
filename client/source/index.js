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
const JudgeWidgetVariety = require("./judgeWidgetVariety.js")
const JudgeWidgetExAi = require("./judgeWidgetExAi.js")
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

        let judgeIndexParam = url.searchParams.get("judgeIndex")
        if (judgeIndexParam !== null) {
            MainStore.judgeIndex = parseInt(judgeIndexParam, 10)
        }

        Common.fetchEventData("8c14255f-9a96-45f1-b843-74e2a00d06cc").then(() => {
            Common.setSelectedPoolFromPoolKey(MainStore.eventData.eventState.activePoolKey)
        })
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
                case "Variety":
                    widget = <JudgeWidgetVariety />
                    break
                case "ExAi":
                    widget = <JudgeWidgetExAi />
                    break
                default:
                    widget =
                        <div>
                            {`Can't find judge for ${judgeCategoryType}`}
                        </div>
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


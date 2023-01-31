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

        let eventKeyParam = url.searchParams.get("eventKey")
        if (eventKeyParam !== null) {
            MainStore.eventKey = eventKeyParam
        }

        if (MainStore.eventKey !== undefined) {
            Common.fetchEventData(MainStore.eventKey).then(() => {
                Common.setSelectedPoolFromPoolKey(MainStore.eventData.eventState.activePoolKey)
            })
        } else {
            Common.fetchEventDirectory()
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
        case "eventCreator":
            widget = <iframe src="https://d1buigy8p55ler.cloudfront.net" allow="clipboard-write"/>
            break
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
            widget = <EventDirectoryWidget />
        }

        return widget
    }
}

const container = document.getElementById("mount")
const root = createRoot(container)

root.render(
    <Main />
)

@MobxReact.observer class EventDirectoryWidget extends React.Component {
    constructor() {
        super()
    }

    setUrl(eventKey, widgetName) {
        let url = new URL(window.location.href)
        if (eventKey !== undefined) {
            url.searchParams.set("eventKey", eventKey)
        }
        if (widgetName !== undefined) {
            url.searchParams.set("startup", widgetName)
        }
        window.location.href = url.href
    }

    render() {
        if (MainStore.eventDirectory === undefined) {
            return <h1>No Event Directory</h1>
        }

        let widgets = MainStore.eventDirectory.map((event) => {
            return (
                <div key={event.eventKey}>
                    <div>
                        <div>
                            <h1>
                                {event.eventName}
                            </h1>
                            <h4>
                                Last Imported: {new Date(event.modifiedAt).toISOString()}
                            </h4>
                        </div>
                        <button onClick={() => this.setUrl(event.eventKey, "head")}>
                            <h2>
                                Head Judge
                            </h2>
                        </button>
                        <button onClick={() => this.setUrl(event.eventKey, "judge")}>
                            <h2>
                                Judge
                            </h2>
                        </button>
                    </div>
                </div>
            )
        })

        return (
            <div>
                <button onClick={() => this.setUrl(undefined, "eventCreator")}>Event Creator</button>
                {widgets}
            </div>
        )
    }
}

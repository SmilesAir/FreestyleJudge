/* eslint-disable no-alert */
/* eslint-disable no-loop-func */
"use strict"

const React = require("react")
const { createRoot } = require("react-dom/client")
const MobxReact = require("mobx-react")
const { runInAction } = require("mobx")
const { AuthWidget } = require("react-cognito-auth-widget")
const { FreestyleAdminWidget } = require("freestyle-admin-widget")

const MainStore = require("./mainStore.js")
const Common = require("./common.js")
const Results2020Widget = require("./results2020Widget.js")
const HeadJudgeWidget = require("./headJudgeWidget.js")
const JudgeWidgetFpaBase = require("./judgeWidgetFpaBase.js")
const JudgeWidgetDiff = require("./judgeWidgetDiff.js")
const JudgeWidgetVariety = require("./judgeWidgetVariety.js")
const JudgeWidgetExAi = require("./judgeWidgetExAi.js")
const JudgeWidgetSimpleRanking = require("./judgeWidgetSimpleRanking.js")
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
                let startupPoolParam = url.searchParams.get("pool")
                if (startupPoolParam !== null) {
                    Common.setSelectedPoolFromPoolKey(startupPoolParam)
                } else {
                    Common.setSelectedPoolFromPoolKey(MainStore.eventData.eventState.activePoolKey)
                }
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
        case "adminTools":
            widget = <FreestyleAdminWidget />
            break
        case "head":
            widget = <HeadJudgeWidget />
            break
        case "scoreboard":
            widget = <Results2020Widget scoreboardMode={true} />
            break
        case "results":
            widget = <HeadJudgeWidget resultsMode={true} />
            break
        case "judge": {
            if (Common.getActiveDivisionRulesId() === "SimpleRanking") {
                return <JudgeWidgetSimpleRanking />
            } else if (MainStore.judgeIndex !== undefined) {
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
                            Can't find judge. No Event Data
                        </div>
                }
            } else {
                widget = <JudgeWidgetFpaBase />
            }
            break
        }
        default:
            widget = <EventDirectoryWidget />
        }

        return (
            <div>
                {widget}
            </div>
        )
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

    onRemoveClick(event) {
        if (confirm("Really remove event from Directory?")) {
            Common.removeEventFromDirectory(event.eventKey)
        }
    }

    getEventCreatorButton() {
        if (!Common.isUserAdmin()) {
            return null
        }

        return (
            <button onClick={() => this.setUrl(undefined, "eventCreator")}>
                <h2>
                    Event Creator
                </h2>
            </button>
        )
    }

    getAdminToolsButton() {
        if (!Common.isUserAdmin()) {
            return null
        }

        return (
            <button onClick={() => this.setUrl(undefined, "adminTools")}>
                <h2>
                    Admin Tools
                </h2>
            </button>
        )
    }

    onSignIn(username) {
        runInAction(() => {
            MainStore.username = username
            MainStore.isSignedIn = true

            Common.getUserPermissions()
        })
    }

    onSignOut() {
        runInAction(() => {
            MainStore.username = undefined
            MainStore.isSignedIn = false
            MainStore.userPermissions = undefined
        })
    }

    render() {
        if (MainStore.eventDirectory === undefined) {
            return <h1>No Event Directory</h1>
        }

        let widgets = MainStore.eventDirectory.map((event) => {
            if (Common.isUserAdmin()) {
                return (
                    <div key={event.eventKey}>
                        <div>
                            <div>
                                <h1>
                                    {event.eventName}
                                </h1>
                                <div className="line2">
                                    <button onClick={() => this.onRemoveClick(event)}>Remove</button>
                                    <div>
                                        Last Imported: {new Date(event.modifiedAt).toISOString()}
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => this.setUrl(event.eventKey, "head")}>
                                <h2>
                                    Head Judge
                                </h2>
                            </button>
                            <button onClick={() => this.setUrl(event.eventKey, "scoreboard")}>
                                <h2>
                                    Scoreboard
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
            } else {
                return (
                    <div key={event.eventKey}>
                        <button onClick={() => this.setUrl(event.eventKey, "judge")}>
                            <h2>
                                {`Judge ${event.eventName}`}
                            </h2>
                        </button>
                    </div>
                )
            }
        })

        let userPoolId = undefined
        let userPoolWebClientId = undefined
        if (__STAGE__ === "DEVELOPMENT") {
            userPoolId = "us-west-2_DnAgy1kCT"
            userPoolWebClientId = "4onf273p233bmj82iaj04f6j8m"
        } else {
            userPoolId = "us-west-2_fnvBKqmuc"
            userPoolWebClientId = "o8h8p0emlmrg3gmk07p5dgvdc"
        }

        let style = {
            position: "absolute",
            top: "5px",
            right: "5px",
            backgroundColor: "aliceblue"
        }

        return (
            <div className="eventDirectory">
                <AuthWidget
                    region={"us-west-2"}
                    userPoolId={userPoolId}
                    userPoolWebClientId={userPoolWebClientId}
                    signInCallback={(username) => this.onSignIn(username)}
                    signOutCallback={() => this.onSignOut()}
                    style={style}
                />
                {this.getEventCreatorButton()}
                {this.getAdminToolsButton()}
                {widgets}
            </div>
        )
    }
}

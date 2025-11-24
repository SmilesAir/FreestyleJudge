/* eslint-disable no-alert */
/* eslint-disable no-loop-func */
"use strict"

const React = require("react")
const { createRoot } = require("react-dom/client")
const MobxReact = require("mobx-react")
const { runInAction } = require("mobx")
const { AuthWidget } = require("react-cognito-auth-widget")
const { FreestyleAdminWidget } = require("freestyle-admin-widget")
const { BrowserRouter, Routes, Route, Link, useParams } = require("react-router-dom")

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

history.pushState(null, null, window.location.href)
history.back()
window.onpopstate = () => history.forward()

@MobxReact.observer class Main extends React.Component {
    constructor() {
        super()

        let url = new URL(window.location.href)

        let peramlinkCrc32 = url.searchParams.get("x")
        if (peramlinkCrc32 !== null) {
            Common.getSetPermalinkParams(peramlinkCrc32).then((resp) => {
                return resp.json()
            }).then((resp) => {

                let uncompressedUrl = window.location.origin + "/?" + resp.urlParams
                console.log(uncompressedUrl, resp)
                window.location.replace(uncompressedUrl)
            })

            return
        }

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

        MainStore.isAnonJudges = url.searchParams.get("showJudges") !== "1"
        MainStore.isPermalink = url.searchParams.get("perma") === "1"
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
        case "quickEventCreator":
            widget = <iframe src="https://d1buigy8p55ler.cloudfront.net/?startup=quick" allow="clipboard-write"/>
            break
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

        let links = []
        if (Common.isUserAdmin()) {
            links = [
                <Link key={1} to="/">Home</Link>, " | ",
                <Link key={2} to="/quick">Quick Event Creator</Link>, " | ",
                <Link key={3} to="/creator">Full Event Creator</Link>, " | ",
                <Link key={4} to="/admin">Admin Tools</Link>, " | ",
                <Link key={5} to="/viewer">View Players and Results</Link>
            ]
        } else {
            links = [
                <Link key={1} to="/">Home</Link>, " | ",
                <Link key={2} to="/quick">Quick Event Creator</Link>, " | ",
                <Link key={3} to="/viewer">View Players and Results</Link>
            ]
        }

        return (
            <BrowserRouter>
                <nav>
                    {links}
                </nav>

                <Routes>
                    <Route path="/" element={widget} />
                    <Route path="/quick" element={<iframe src="https://d1buigy8p55ler.cloudfront.net/?startup=quick" allow="clipboard-write"/>} />
                    <Route path="/creator" element={<iframe src="https://d1buigy8p55ler.cloudfront.net" allow="clipboard-write"/>} />
                    <Route path="/admin" element={<FreestyleAdminWidget />} />
                    <Route path="/viewer" element={<iframe src="https://d2dmp0z3wz2180.cloudfront.net" allow="clipboard-write"/>} />
                </Routes>
            </BrowserRouter>
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
        if (confirm("Really hide event from Directory?")) {
            Common.removeEventFromDirectory(event.eventKey)
        }
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
                                    <button onClick={() => this.onRemoveClick(event)}>Hide Event</button>
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
                <h1>
                    Active Events
                </h1>
                <div className="events">
                    {widgets}
                </div>
            </div>
        )
    }
}

/* eslint-disable no-alert */
const { runInAction } = require("mobx")
const React = require("react")
const { Auth } = require("aws-amplify")

const MainStore = require("./mainStore.js")
const { fetchEx, fetchAuth } = require("./endpoints.js")
const JudgeDataBase = require("./judgeDataBase.js")

const poolKeyPrefix = "pool|"
const Common = module.exports
const defaultRulesId = "Fpa2020"

module.exports.roundNames = [
    "Finals",
    "Semifinals",
    "Quarterfinals",
    "Preliminaries"
]

module.exports.categoryOrder = [ "Diff", "Variety", "ExAi" ]

module.exports.EventDataUpdateHelper = class {
    constructor(extendMinutes, updateIntervalSeconds, includeMinorUpdates, onUpdateCallback, onExpiredCallback) {
        this.extendMinutes = extendMinutes
        this.updateIntervalSeconds = updateIntervalSeconds
        this.includeMinorUpdates = includeMinorUpdates
        this.onUpdateCallback = onUpdateCallback
        this.onExpiredCallback = onExpiredCallback
        this.isChecking = false
        this.updateDeadlineAt = 0
    }

    extendUpdateDeadline(forced) {
        this.updateDeadlineAt = Date.now() + 1000 * 60 * this.extendMinutes

        this.runVersionCheck(forced)
    }

    runVersionCheck(forced) {
        Common.incrementalUpdate(this.includeMinorUpdates, forced).then((updated) => {
            if (updated && this.onUpdateCallback !== undefined) {
                this.onUpdateCallback()
            }
        })

        if (this.isChecking !== true) {
            if (Date.now() < this.updateDeadlineAt) {
                this.isChecking = true
                setTimeout(() => {
                    this.isChecking = false
                    this.runVersionCheck()
                }, 1000 * this.updateIntervalSeconds)
            } else if (this.onExpiredCallback !== undefined) {
                runInAction(() => {
                    MainStore.pingMs = undefined
                    MainStore.lastPingUpdateTime = undefined
                })
                this.onExpiredCallback()
            }
        }
    }

    isExpired() {
        return Date.now() > this.updateDeadlineAt
    }
}

module.exports.TimeUpdateHelper = class {
    constructor(onUpdateCallback) {
        this.onUpdateCallback = onUpdateCallback
    }

    startUpdate() {
        if (this.intervalId === undefined) {
            this.intervalId = setInterval(() => {
                this.onUpdateCallback()
            }, 1000)
        }
    }

    stopUpdate() {
        clearInterval(this.intervalId)
        this.intervalId = undefined
    }
}

module.exports.fetchEventDirectory = function() {
    return fetchEx("GET_EVENT_DIRECTORY", undefined, undefined, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    }).then((response) => {
        return response.json()
    }).then((response) => {
        runInAction(() => {
            MainStore.eventDirectory = response.eventDirectory
        })
        console.log("GET_EVENT_DIRECTORY", JSON.parse(JSON.stringify(MainStore.eventDirectory)))
    }).catch((error) => {
        console.error(`Trying to get event directory "${error}"`)
    })
}

module.exports.fetchEventData = function(eventKey) {
    return fetchEx("GET_EVENT_DATA", { eventKey: eventKey }, undefined, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    }).then((response) => {
        return response.json()
    }).then((response) => {
        runInAction(() => {
            MainStore.eventData = removeEmptyEventData(response.eventData)
            MainStore.lastUpdatedEventDataTime = Date.now()
            document.title = MainStore.eventData.eventName
            if (MainStore.currentWidgetName !== "results") {
                Common.setSelectedPoolFromPoolKey(MainStore.eventData.eventState.activePoolKey)
            }
        })
        console.log("GET_EVENT_DATA", JSON.parse(JSON.stringify(MainStore.eventData)))
    }).catch((error) => {
        console.error(`Trying to get event data "${error}"`)
    })
}

function removeEmptyEventData(eventData) {
    let eventDivisionData = eventData.eventData.divisionData
    for (let divisionKey in eventDivisionData) {
        let divisionData = eventDivisionData[divisionKey]
        let foundPoolInDivision = false
        for (let roundKey in divisionData.roundData) {
            let roundData = divisionData.roundData[roundKey]
            let foundPoolInRound = roundData.poolNames.length > 0
            foundPoolInDivision |= foundPoolInRound
            if (!foundPoolInRound) {
                delete divisionData.roundData[roundKey]
            }
        }

        if (!foundPoolInDivision) {
            delete eventDivisionData[divisionKey]
        }
    }

    return eventData
}

module.exports.setSelectedPoolFromPoolKey = function(poolKey) {
    if (poolKey === undefined || MainStore.eventData.eventData.poolMap[poolKey] === undefined) {
        return
    }

    let parts = poolKey.split("|")
    if (parts.length !== 5) {
        return
    }

    MainStore.selectedDivision = {
        label: parts[2],
        value: parts[2]
    }
    MainStore.selectedRound = {
        label: parts[3],
        value: parts[3]
    }
    MainStore.selectedPool = {
        label: parts[4],
        value: parts[4]
    }
}

module.exports.makePoolKey = function(eventKey, divisionName, roundName, poolName) {
    return `${poolKeyPrefix}${eventKey}|${divisionName}|${roundName}|${poolName}`
}

module.exports.fetchPlayerData = function() {
    return fetchEx("GET_PLAYER_DATA", undefined, undefined, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    }).then((response) => {
        return response.json()
    }).then((response) => {
        runInAction(() => {
            MainStore.playerData = response.players

            console.log("GET_PLAYER_DATA", response.players)
        })
    }).catch((error) => {
        console.error(`Trying to get event data "${error}"`)
    })
}

module.exports.fetchEssentialDatabaseData = function() {
    return fetchEx("GET_ESSENTIAL_DATABASE_DATA", { eventKey: MainStore.eventData.key }, undefined, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    }).then((response) => {
        return response.json()
    }).then((response) => {
        runInAction(() => {
            MainStore.playerData = response.players

            console.log("GET_ESSENTIAL_DATABASE_DATA", response.players)
        })
    }).catch((error) => {
        console.error(`Trying to get event data "${error}"`)
    })
}

module.exports.setActivePool = function(poolKey) {
    MainStore.eventData.eventState.activePoolKey = poolKey
    MainStore.topTabsSelectedIndex = 1
    MainStore.controlsTabsSelectedIndex = 0

    let controllerState = {}
    if (!Common.getPoolHasResults(poolKey) && getPoolHasTeams(poolKey)) {
        MainStore.eventData.controllerState.selectedTeamIndex = 0
        controllerState = {
            selectedTeamIndex: MainStore.eventData.controllerState.selectedTeamIndex
        }
    }

    return Common.updateEventState({
        activePoolKey: poolKey
    }, controllerState)
}

module.exports.updateEventState = function(eventState, controllerState) {
    if (MainStore.eventData === undefined) {
        console.error("Failed to update event state because no event is downloaded yet")
    }

    return fetchEx("UPDATE_EVENT_STATE", { eventKey: MainStore.eventData.key }, undefined, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            eventState: eventState,
            controllerState: controllerState
        })
    }).then((response) => {
        return response.json()
    }).then((response) => {
        console.log(response)
    }).then(() => {
        Common.fetchEventData(MainStore.eventData.key)
    }).catch((error) => {
        console.error(`Trying to update event/controller state "${error}"`)
    })
}

module.exports.uploadResults = function(resultsText, divisionName) {
    if (MainStore.eventData === undefined) {
        console.error("Failed to upload results since event is downloaded yet")
    }

    return fetchEx("CONVERT_TO_RESULTS_DATA", {
        eventKey: MainStore.eventData.key,
        divisionName: divisionName
    }, undefined, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: resultsText
    }).then((response) => {
        return response.json()
    }).then((response) => {
        if (response.success !== true) {
            throw new Error(`Error converting results: ${response.error}`)
        }

        return fetchEx("UPLOAD_RESULTS", {
            eventKey: MainStore.eventData.key,
            divisionName: divisionName
        }, undefined, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                resultsData: response.resultsData,
                rawText: resultsText,
                eventName: MainStore.eventData.eventName
            })
        })
    }).then((response) => {
        return response.json()
    }).then((response) => {
        alert(`Successfully uploaded ${divisionName}`)
        console.log(response)
    }).catch((error) => {
        console.error(`Error uploading results "${error}"`)
    })
}

module.exports.isPoolActive = function(poolKey) {
    if (MainStore.eventData === undefined || MainStore.eventData.eventState === undefined) {
        return false
    }

    return MainStore.eventData.eventState.activePoolKey === poolKey
}

module.exports.getSelectedPoolKey = function() {
    if (MainStore.eventData === undefined ||
        MainStore.selectedDivision === null ||
        MainStore.selectedRound === null ||
        MainStore.selectedPool === null) {
        return undefined
    }

    return Common.makePoolKey(MainStore.eventData.key, MainStore.selectedDivision.value, MainStore.selectedRound.value, MainStore.selectedPool.value)
}

module.exports.getSelectedPoolRoutineSeconds = function() {
    if (MainStore.eventData === undefined ||
        MainStore.selectedDivision === null ||
        MainStore.selectedRound === null) {
        return 0
    }

    let roundData = MainStore.eventData.eventData.divisionData[MainStore.selectedDivision.value].roundData[MainStore.selectedRound.value]
    return roundData.lengthSeconds
}

module.exports.getRoutineTimeSeconds = function() {
    if (MainStore.eventData === undefined ||
        MainStore.eventData.controllerState.routineStartTime === undefined) {
        return 0
    }

    return Math.floor((Date.now() - MainStore.eventData.controllerState.routineStartTime) / 1000)
}

module.exports.getRoutineTimeString = function(seconds) {
    if (seconds > 59 * 60) {
        return "---"
    } else if (seconds >= 10 * 60) {
        return new Date(seconds * 1000).toISOString().substring(14, 19)
    } else {
        return new Date(seconds * 1000).toISOString().substring(15, 19)
    }
}

function getJudgeDataObj(judgeData) {
    let judgeDataExport = undefined
    for (let categoryType in JudgeDataBase.judgeDataExports) {
        let jde = JudgeDataBase.judgeDataExports[categoryType]
        if (jde.categoryType === judgeData.categoryType) {
            judgeDataExport = jde
            break
        }
    }

    if (judgeDataExport !== undefined) {
        return new judgeDataExport.JudgeDataClass(Common.getSelectedPoolRoutineSeconds(), judgeData)
    }

    return undefined
}

module.exports.initJudgeDataForTeamData = function(teamData) {
    if (teamData === undefined || teamData.judgePreProcessData !== undefined && teamData.judgeInstances !== undefined) {
        return
    }

    teamData.judgePreProcessData = {}
    teamData.judgeInstances = {}

    for (let judgeKey in teamData.judgeData) {
        let judgeData = teamData.judgeData[judgeKey]

        let judgeDataObj = getJudgeDataObj(judgeData)
        if (judgeDataObj !== undefined && judgeDataObj.addJudgePreProcessData !== undefined) {
            judgeDataObj.addJudgePreProcessData(teamData.judgePreProcessData)
            teamData.judgeInstances[judgeKey] = judgeDataObj
        }
    }
}

module.exports.getJudgeDataDetailedWidget = function(judgeKey, teamData) {
    if (judgeKey === undefined || teamData === undefined) {
        return null
    }

    Common.initJudgeDataForTeamData(teamData)

    let judgeDataObj = teamData.judgeInstances[judgeKey]
    if (judgeDataObj !== undefined) {
        return judgeDataObj.getJudgeWidgetDetailed(teamData.judgePreProcessData)
    } else {
        console.error(`Can't find judge data for "${judgeKey}"`)
    }

    return null
}

module.exports.calcJudgeScoreCategoryOnly = function(judgeKey, teamData) {
    if (judgeKey === undefined || teamData === undefined) {
        return null
    }

    Common.initJudgeDataForTeamData(teamData)

    let judgeDataObj = teamData.judgeInstances[judgeKey]
    if (judgeDataObj !== undefined) {
        return judgeDataObj.calcJudgeScoreCategoryOnly(teamData.judgePreProcessData)
    } else {
        console.error(`Can't find judge data for "${judgeKey}"`)
    }

    return null
}

module.exports.calcJudgeScoreGeneral = function(judgeKey, teamData) {
    if (judgeKey === undefined || teamData === undefined) {
        return null
    }

    Common.initJudgeDataForTeamData(teamData)

    let judgeDataObj = teamData.judgeInstances[judgeKey]
    if (judgeDataObj !== undefined) {
        return judgeDataObj.calcJudgeScoreGeneral()
    } else {
        console.error(`Can't find judge data for "${judgeKey}"`)
    }

    return null
}

module.exports.calcJudgeScoreEx = function(judgeKey, teamData) {
    if (judgeKey === undefined || teamData === undefined) {
        return null
    }

    Common.initJudgeDataForTeamData(teamData)

    let judgeDataObj = teamData.judgeInstances[judgeKey]
    if (judgeDataObj !== undefined) {
        return judgeDataObj.calcJudgeScoreEx(teamData.judgePreProcessData)
    } else {
        console.error(`Can't find judge data for "${judgeKey}"`)
    }

    return null
}

module.exports.getJudgeNameString = function(categoryType, judgeKey) {
    let poolData = Common.getSelectedPoolData()
    if (MainStore.isAnonJudges === true || (MainStore.isPermalink && poolData && poolData.isLocked)) {
        return categoryType
    } else {
        return `${categoryType} - ${Common.getPlayerNameString(judgeKey)}`
    }
}

module.exports.getPlayerNameString = function(playerKey) {
    if (MainStore.playerData === undefined) {
        return "Unknown"
    }

    let playerData = MainStore.playerData[playerKey]
    let name = "Unknown"
    if (playerData !== undefined) {
        name = `${playerData.firstName} ${playerData.lastName}`
    }

    return name
}

module.exports.getPlayerNamesString = function(playerKeyArray) {
    if (MainStore.playerData === undefined) {
        return ""
    }

    return playerKeyArray.map((key) => {
        return Common.getPlayerNameString(key)
    }).join(" - ")
}

module.exports.round2Decimals = function(num) {
    return Math.round(num * 100) / 100
}

module.exports.round1Decimals = function(num) {
    return Math.round(num * 10) / 10
}

module.exports.makePoolName = function(divisionName, roundName, poolName) {
    if (roundName === "Finals") {
        return `${divisionName} ${roundName}`
    } else {
        return `${divisionName} ${roundName} ${poolName}`
    }
}

module.exports.getIsScoresHidden = function() {
    let poolData = Common.getSelectedPoolData()
    return poolData && MainStore.isPermalink && !poolData.isLocked
}

module.exports.getSelectedPoolData = function() {
    let poolKey = Common.getSelectedPoolKey()
    if (poolKey === undefined) {
        return undefined
    }

    return MainStore.eventData.eventData.poolMap[poolKey]
}

module.exports.getSelectedTeamData = function() {
    let poolData = Common.getSelectedPoolData()
    if (poolData === undefined || MainStore.eventData.controllerState.selectedTeamIndex === undefined) {
        return undefined
    }

    return poolData.teamData[MainStore.eventData.controllerState.selectedTeamIndex]
}

module.exports.getSelectedTeamNameString = function() {
    let teamData = Common.getSelectedTeamData()
    if (teamData === undefined) {
        return "No Team Selected"
    }

    return Common.getPlayerNamesString(teamData.players)
}

module.exports.getFirstName = function(playerKey) {
    let playerData = MainStore.playerData[playerKey]
    console.log(playerData, playerKey)
    return playerData !== undefined ? playerData.firstName : "Unknown"
}

module.exports.getPlayerFirstNamesString = function(playerKeyArray) {
    if (MainStore.playerData === undefined) {
        return ""
    }

    return playerKeyArray.map((key) => {
        return Common.getFirstName(key)
    }).join(" - ")
}

module.exports.getSelectedTeamFirstNameString = function() {
    let teamData = Common.getSelectedTeamData()
    if (teamData === undefined || MainStore.playerData === undefined) {
        return "No Team Selected"
    }

    return teamData.players.map((key) => {
        return Common.getFirstName(key)
    }).join(" - ")
}

module.exports.isSelectedPoolLocked = function() {
    let poolData = Common.getSelectedPoolData()
    return poolData && poolData.isLocked || false
}

module.exports.isRoutinePlaying = function() {
    return MainStore.eventData && MainStore.eventData.controllerState.routineStartTime && Common.getRoutineTimeSeconds() <= Common.getSelectedPoolRoutineSeconds()
}

module.exports.isRoutineFinished = function() {
    return MainStore.eventData && MainStore.eventData.controllerState.routineStartTime && Common.getRoutineTimeSeconds() > Common.getSelectedPoolRoutineSeconds() || false
}

module.exports.getSortedJudgeKeyArray = function(poolData) {
    let judges = []
    for (let judgeKey in poolData.judges) {
        judges.push({
            judgeKey: judgeKey,
            categoryType: poolData.judges[judgeKey]
        })
    }

    judges.sort((a, b) => {
        if (a.categoryType === b.categoryType) {
            return a.judgeKey.localeCompare(b.judgeKey)
        } else {
            return a.categoryType.localeCompare(b.categoryType)
        }
    })

    return judges.map((data) => data.judgeKey)
}

module.exports.getCategoryTypeForJudgeIndex = function(index) {
    if (index === undefined || MainStore.eventData === undefined) {
        return undefined
    }

    let poolData = Common.getSelectedPoolData()
    let sortedJudgeKeys = Common.getSortedJudgeKeyArray(poolData)
    let judgeKey = sortedJudgeKeys[index]

    return poolData.judges[judgeKey]
}

module.exports.getPlayerNameForCurrentJudgeIndex = function() {
    if (MainStore.judgeIndex === undefined || MainStore.eventData === undefined) {
        return "unknown"
    }

    let poolData = Common.getSelectedPoolData()
    let sortedJudgeKeys = Common.getSortedJudgeKeyArray(poolData)
    let judgeKey = sortedJudgeKeys[MainStore.judgeIndex]

    return Common.getPlayerNameString(judgeKey)
}

module.exports.getJudgeDataArrayForCurrentJudgeIndex = function() {
    if (MainStore.judgeIndex === undefined || MainStore.eventData === undefined) {
        return []
    }

    let poolData = Common.getSelectedPoolData()
    let sortedJudgeKeys = Common.getSortedJudgeKeyArray(poolData)
    let judgeKey = sortedJudgeKeys[MainStore.judgeIndex]

    return poolData.teamData.map((teamData) => {
        let judgeData = teamData.judgeData[judgeKey]
        return getJudgeDataObj(judgeData || {
            judgeKey: judgeKey,
            categoryType: poolData.judges[judgeKey]
        })
    })
}

module.exports.getJudgeDataArrayByJudgeKey = function() {
    if (MainStore.judgeKey === undefined || MainStore.eventData === undefined) {
        return []
    }

    let poolData = Common.getSelectedPoolData()
    return poolData.teamData.map((teamData) => {
        let judgeData = teamData.judgeData[MainStore.judgeKey]
        return getJudgeDataObj(judgeData || {
            judgeKey: MainStore.judgeKey,
            categoryType: "SimpleRanking" // This may need to be passed in if there are multiple judge types that aren't set in the EventCreator
        })
    })
}

module.exports.updateJudgeData = function(teamIndex, judgeData) {
    if (MainStore.eventData === undefined) {
        console.error("Failed to update judge data because no event is downloaded yet")
    }

    return fetchEx("UPDATE_JUDGE_DATA", {
        poolKey: Common.getSelectedPoolKey(),
        judgeKey: judgeData.judgeKey,
        teamIndex: teamIndex
    }, undefined, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(judgeData)
    }).then((response) => {
        return response.json()
    }).then((response) => {
        console.log(response)
    }).catch((error) => {
        console.error(`Trying to update judge data "${error}"`)
    })
}

module.exports.updatePoolLocked = function(poolKey, isLocked) {
    if (MainStore.eventData === undefined) {
        console.error("Failed to update pool data because no event is downloaded yet")
    }

    return fetchEx("UPDATE_POOL_LOCKED", {
        poolKey: poolKey,
        isLocked: isLocked
    }, undefined, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        }
    }).then((response) => {
        return response.json()
    }).then((response) => {
        console.log(response)
    }).catch((error) => {
        console.error(`Trying to lock/unlock pool data "${error}"`)
    })
}

module.exports.updatePoolData = function(poolKey, poolData) {
    if (MainStore.eventData === undefined) {
        console.error("Failed to update pool data because no event is downloaded yet")
    }

    return fetchEx("UPDATE_POOL_DATA", {
        poolKey: poolKey
    }, undefined, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(sanitizePoolData(poolData))
    }).then((response) => {
        return response.json()
    }).then((response) => {
        console.log(response)
    }).catch((error) => {
        console.error(`Trying to update pool data "${error}"`)
    })
}

// Removes temp data from poolData so the uploaded data remains clean
// This needs to be updated when new temp data is added
// In order to preseve existing functionality, this removes temp data instead of only copying valid data
function sanitizePoolData(poolData) {
    let newPoolData = JSON.parse(JSON.stringify(poolData))
    for (let teamData of newPoolData.teamData) {
        delete teamData.judgeInstances
        delete teamData.judgePreProcessData
    }

    return newPoolData
}

module.exports.updateJudgeState = function(judgeState) {
    if (MainStore.eventData === undefined) {
        console.error("Failed to update judge state because no event is downloaded yet")
    }

    return fetchEx("UPDATE_JUDGE_STATE", {
        eventKey: MainStore.eventData.key,
        judgeKey: judgeState.judgeKey
    }, undefined, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(judgeState)
    }).catch((error) => {
        console.error(`Trying to update judge state "${error}"`)
    })
}

module.exports.removeEventFromDirectory = function(eventKey) {
    return Auth.currentAuthenticatedUser().then((data) => {
        return fetchAuth("REMOVE_EVENT_FROM_DIRECTORY", {
            eventKey: eventKey
        }, undefined, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": data.signInUserSession.accessToken.jwtToken
            }
        }).catch((error) => {
            console.error(`Trying to remove event from directory "${error}"`)
        })
    })
}

module.exports.getUserPermissions = function() {
    return Auth.currentAuthenticatedUser().then((data) => {
        return fetchAuth("GET_USER_PERMISSIONS", undefined, undefined, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": data.signInUserSession.accessToken.jwtToken
            }
        }).then((response) => {
            return response.json()
        }).then((response) => {
            MainStore.userPermissions = response.permissions
        }).catch((error) => {
            console.error(`Trying to get user permissions "${error}"`)
        })
    })
}

module.exports.isUserAdmin = function() {
    return MainStore.isSignedIn && MainStore.userPermissions && MainStore.userPermissions.admin === true
}

module.exports.getJudgeState = function(judgeKey) {
    if (MainStore.eventData === undefined) {
        return {}
    }

    return MainStore.eventData.judgesState[judgeKey] || {}
}

module.exports.incrementalUpdate = function(includeMinorUpdates, forced) {
    if (MainStore.eventData === undefined) {
        console.error("Failed to update judge state because no event is downloaded yet")
    }

    let startTime = Date.now()
    return fetchEx("GET_EVENT_DATA_VERSION", { eventKey: MainStore.eventData.key }, undefined, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    }).then((response) => {
        return response.json()
    }).then((response) => {
        let now = Date.now()
        if (MainStore.lastPingUpdateTime === undefined || now - MainStore.lastPingUpdateTime > 7 * 1000) {
            runInAction(() => {
                MainStore.lastPingUpdateTime = now
                MainStore.pingMs = Date.now() - startTime
            })
        }
        let importantVersionUpdated = response.importantVersion !== undefined && response.importantVersion !== MainStore.eventData.importantVersion
        let minorVersionUpdated = response.minorVersion !== undefined && response.minorVersion !== MainStore.eventData.minorVersion
        if (forced || importantVersionUpdated || (includeMinorUpdates && minorVersionUpdated)) {
            //console.log("GET_EVENT_DATA_VERSION", response.importantVersion, MainStore.eventData.importantVersion, response.minorVersion, MainStore.eventData.minorVersion)
            return Common.fetchEventData(MainStore.eventData.key).then(() => {
                return true
            })
        }

        return false
    }).catch((error) => {
        console.error(`Trying to get event data "${error}"`)
    })
}

module.exports.getExpiredWidget = function(eventDataUpdater) {
    if (eventDataUpdater === undefined || !eventDataUpdater.isExpired()) {
        return null
    }

    return (
        <div className="expiredWidget" onClick={() => eventDataUpdater.extendUpdateDeadline(true)} />
    )
}

module.exports.getDivisionRulesId = function(poolKey) {
    if (MainStore.eventData === undefined) {
        return defaultRulesId
    }

    let parts = poolKey.split("|")
    if (parts.length !== 5) {
        return defaultRulesId
    }

    let divisionData = MainStore.eventData.eventData.divisionData[parts[2]]
    return divisionData.rulesId || defaultRulesId
}

module.exports.getActiveDivisionRulesId = function() {
    if (MainStore.eventData === undefined || MainStore.eventData.eventState.activePoolKey === undefined) {
        return defaultRulesId
    }

    return Common.getDivisionRulesId(MainStore.eventData.eventState.activePoolKey)
}

module.exports.getPlaceFromNumber = function(number) {
    switch (number) {
    case 1:
        return "1st"
    case 2:
        return "2nd"
    case 3:
        return "3rd"
    default:
        return `${number}th`
    }
}

module.exports.getDataVersion = function() {
    if (MainStore.eventData === undefined) {
        return 0
    }

    return MainStore.eventData.dataVersion || 0
}

module.exports.isDivisionLocked = function(divisionData) {
    if (divisionData === undefined) {
        return false
    }

    let hasPool = false
    for (let roundName in divisionData.roundData) {
        let roundData = divisionData.roundData[roundName]
        for (let poolName of roundData.poolNames) {
            let poolKey = Common.makePoolKey(MainStore.eventData.key, divisionData.name, roundName, poolName)
            let poolData = MainStore.eventData.eventData.poolMap[poolKey]
            hasPool = true
            if (poolData.isLocked !== true) {
                return false
            }
        }
    }

    return hasPool
}

function sortTeamsBasedOnRules(poolKey, inOutSortedTeams) {
    let rulesId = Common.getDivisionRulesId(poolKey)
    if (rulesId === "Fpa2020") {
        inOutSortedTeams.sort((a, b) => {
            if (a.teamScore === undefined && b.teamScore === undefined) {
                return 0
            } else if (a.teamScore === undefined) {
                return 1
            } else if (b.teamScore === undefined) {
                return -1
            } else {
                return b.teamScore - a.teamScore
            }
        })
    } else if (rulesId === "SimpleRanking") {
        inOutSortedTeams.sort((a, b) => {
            if (a.teamScore === undefined && b.teamScore === undefined) {
                return 0
            } else if (a.teamScore === undefined) {
                return 1
            } else if (b.teamScore === undefined) {
                return -1
            } else {
                return a.teamScore - b.teamScore
            }
        })
    }
}

module.exports.getResultsTextForDivisionData = function(divisionData) {
    let lines = [
        `start pools "${MainStore.eventData.eventName}" "${divisionData.name}"`
    ]

    let hasPool = false
    for (let roundName of Common.roundNames) {
        let roundData = divisionData.roundData[roundName]
        if (roundData !== undefined) {
            lines.push(`round ${Common.roundNames.findIndex((name) => name === roundData.name) + 1}`)
            for (let poolName of roundData.poolNames) {
                hasPool = true
                lines.push(`pool ${poolName}`)
                let poolKey = Common.makePoolKey(MainStore.eventData.key, divisionData.name, roundName, poolName)
                let poolData = MainStore.eventData.eventData.poolMap[poolKey]
                let sortedTeams = poolData.teamData.slice()
                sortTeamsBasedOnRules(poolKey, sortedTeams)

                let place = 0
                let lastScore = 0
                for (let [ i, teamData ] of sortedTeams.entries()) {
                    if (lastScore !== teamData.teamScore) {
                        place = i + 1
                    }
                    lastScore = teamData.score
                    let playerIds = teamData.players.join(" ")
                    lines.push(`${place} ${playerIds} ${teamData.teamScore}`)
                }
            }
        } else {
            break
        }
    }

    lines.push("end")
    return hasPool ? lines.join("\n") : undefined
}

module.exports.unlockPoolResults = function(poolKey) {
    runInAction(() => {
        let poolData = MainStore.eventData.eventData.poolMap[poolKey]
        poolData.isLocked = false

        Common.updatePoolLocked(poolKey, false)
    })
}

module.exports.lockAndCalcPoolResults = function(poolKey) {
    if (Date.now() - MainStore.lastUpdatedEventDataTime > 1000 * 60 * 5) {
        alert("Event Data is older than 5 minutes. Refresh page before calculating results. Aborting")
        return
    }


    runInAction(() => {
        let poolData = MainStore.eventData.eventData.poolMap[poolKey]
        let rulesId = Common.getDivisionRulesId(poolKey)
        poolData.isLocked = true

        if (rulesId === "Fpa2020") {

            if (Common.getDataVersion() > 0) {
                for (let teamData of poolData.teamData) {
                    let score = 0
                    for (let judgeKey in poolData.judges) {
                        let judge = teamData.judgeData[judgeKey]
                        score += judge !== undefined ? Common.calcJudgeScoreCategoryOnly(judgeKey, teamData) : 0
                        score += judge !== undefined ? Common.calcJudgeScoreGeneral(judgeKey, teamData) : 0

                        if (poolData.judges[judgeKey] === "ExAi") {
                            score += judge !== undefined ? Common.calcJudgeScoreEx(judgeKey, teamData) : 0
                        }
                    }

                    teamData.teamScore = score
                }
            } else {
                console.error(`Unsupported Data Version ${Common.getDataVersion()}`)
                // TODO: Need to skip upload
            }

            Common.updatePoolData(poolKey, poolData)
        } else if (rulesId === "SimpleRanking") {
            for (let teamData of poolData.teamData) {
                let total = 0
                let ranks = new Array(poolData.teamData.length).fill(0)

                for (let judgeKey in teamData.judgeData) {
                    let judgeData = teamData.judgeData[judgeKey]
                    if (judgeData.categoryType === "SimpleRanking") {
                        total += judgeData.rawScores.ranking
                    }
                    ++ranks[judgeData.rawScores.ranking - 1]
                }

                teamData.teamScore = total
            }

            Common.updatePoolData(poolKey, poolData)
        }
    })
}

module.exports.getSetPermalinkParams = function(crc32, urlParams) {
    return fetchEx("GET_SET_PERMALINK_PARAMS", { crc32: crc32 }, undefined, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            urlParams: urlParams
        })
    })
}

function getTeamHasResults(teamData) {
    return teamData.judgeData && Object.keys(teamData.judgeData).length > 0
}

function getPoolHasTeams(poolKey) {
    let poolData = MainStore.eventData.eventData.poolMap[poolKey]
    if (poolData !== undefined && poolData.teamData !== undefined) {
        return poolData.teamData.length > 0
    }

    return false
}

module.exports.getPoolHasResults = function(poolKey) {
    let poolData = MainStore.eventData.eventData.poolMap[poolKey]
    if (poolData !== undefined) {
        for (let team of poolData.teamData) {
            if (getTeamHasResults(team)) {
                return true
            }
        }
    }

    return false
}

module.exports.backupResults = function() {
    let backupData = localStorage.getItem("backupData")
    backupData = JSON.parse(backupData) || {}

    let poolKey = Common.getSelectedPoolKey()
    let dataKey = poolKey + `|${Date.now()}`
    backupData[dataKey] = MainStore.eventData.eventData.poolMap[poolKey]

    let keys = Object.keys(backupData)
    if (keys.length > 50) {
        keys = keys.sort((a, b) => {
            return parseInt(a.split("|")[5], 10) - parseInt(b.split("|")[5], 10)
        })

        let removeKey = keys[0]
        delete backupData[removeKey]
    }

    localStorage.setItem("backupData", JSON.stringify(backupData))
}

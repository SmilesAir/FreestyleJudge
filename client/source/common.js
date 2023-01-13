const { runInAction } = require("mobx")

const MainStore = require("./mainStore.js")
const { fetchEx, fetchAuth } = require("./endpoints.js")
const JudgeDataBase = require("./judgeDataBase.js")

const poolKeyPrefix = "pool|"
const Common = module.exports

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
            Common.setSelectedPoolFromPoolKey(MainStore.eventData.eventState.activePoolKey)
            document.title = MainStore.eventData.eventName
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
    if (poolKey === undefined) {
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
        })
    }).catch((error) => {
        console.error(`Trying to get event data "${error}"`)
    })
}

module.exports.setActivePool = function(poolKey) {
    MainStore.eventData.eventState.activePoolKey = poolKey
    MainStore.topTabsSelectedIndex = 1
    MainStore.controlsTabsSelectedIndex = 0

    return Common.updateEventState({
        activePoolKey: poolKey
    }, {})
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
    if (seconds >= 10 * 60) {
        return new Date(seconds * 1000).toISOString().substring(14, 19)
    } else {
        return new Date(seconds * 1000).toISOString().substring(15, 19)
    }
}

module.exports.initJudgeDataForTeamData = function(teamData) {
    if (teamData === undefined || teamData.judgePreProcessData !== undefined && teamData.judgeInstances !== undefined) {
        return
    }

    teamData.judgePreProcessData = {}
    teamData.judgeInstances = {}

    for (let judgeKey in teamData.judgeData) {
        let judgeData = teamData.judgeData[judgeKey]

        let judgeDataExport = undefined
        for (let categoryType in JudgeDataBase.judgeDataExports) {
            let jde = JudgeDataBase.judgeDataExports[categoryType]
            if (jde.categoryType === judgeData.categoryType) {
                judgeDataExport = jde
                break
            }
        }

        if (judgeDataExport !== undefined) {
            let judgeDataObj = new judgeDataExport.JudgeDataClass(Common.getSelectedPoolRoutineSeconds(), judgeData)
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

module.exports.makePoolName = function(divisionName, roundName, poolName) {
    if (roundName === "Finals") {
        return `${divisionName} ${roundName}`
    } else {
        return `${divisionName} ${roundName} ${poolName}`
    }
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

module.exports.isRoutinePlaying = function() {
    return MainStore.eventData && MainStore.eventData.controllerState.routineStartTime && Common.getRoutineTimeSeconds() <= Common.getSelectedPoolRoutineSeconds()
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

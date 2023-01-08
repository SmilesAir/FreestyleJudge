const { runInAction } = require("mobx")

const MainStore = require("./mainStore.js")
const { fetchEx, fetchAuth } = require("./endpoints.js")
const JudgeDataBase = require("./judgeDataBase.js")

const poolKeyPrefix = "pool-"
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

module.exports.makePoolKey = function(eventKey, divisionName, roundName, poolName) {
    return `${poolKeyPrefix}${eventKey}-${divisionName}-${roundName}-${poolName}`
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
    return Common.updateEventState({
        activePoolKey: poolKey
    }, undefined)
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

module.exports.getJudgeDataDetailedWidget = function(judgeData) {
    if (judgeData === undefined) {
        return null
    }

    let judgeDataExport = undefined
    for (let categoryType in JudgeDataBase.judgeDataExports) {
        let jde = JudgeDataBase.judgeDataExports[categoryType]
        if (jde.categoryType === judgeData.categoryType) {
            judgeDataExport = jde
            break
        }
    }

    if (judgeDataExport !== undefined) {
        let judgeDataObj = new judgeDataExport.JudgeDataClass(180, judgeData)

        return judgeDataObj.getJudgeWidgetDetailed()
    } else {
        console.error(`Can't find judge data for "${judgeData.categoryType}"`)
    }

    return null
}

module.exports.calcJudgeScoreCategoryOnly = function(judgeData) {
    if (judgeData === undefined) {
        return 0
    }

    let judgeDataExport = undefined
    for (let categoryType in JudgeDataBase.judgeDataExports) {
        let jde = JudgeDataBase.judgeDataExports[categoryType]
        if (jde.categoryType === judgeData.categoryType) {
            judgeDataExport = jde
            break
        }
    }

    if (judgeDataExport !== undefined) {
        let judgeDataObj = new judgeDataExport.JudgeDataClass(180, judgeData)

        return judgeDataObj.calcJudgeScoreCategoryOnly()
    } else {
        console.error(`Can't find judge data for "${judgeData.categoryType}"`)
    }

    return null
}

module.exports.calcJudgeScoreGeneral = function(judgeData) {
    if (judgeData === undefined) {
        return 0
    }

    let judgeDataExport = undefined
    for (let categoryType in JudgeDataBase.judgeDataExports) {
        let jde = JudgeDataBase.judgeDataExports[categoryType]
        if (jde.categoryType === judgeData.categoryType) {
            judgeDataExport = jde
            break
        }
    }

    if (judgeDataExport !== undefined) {
        let judgeDataObj = new judgeDataExport.JudgeDataClass(180, judgeData)

        return judgeDataObj.calcJudgeScoreGeneral()
    } else {
        console.error(`Can't find judge data for "${judgeData.categoryType}"`)
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


const MainStore = require("./mainStore.js")
const { fetchEx, fetchAuth } = require("./endpoints.js")
const mainStore = require("./mainStore.js")

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
        MainStore.eventData = removeEmptyEventData(response.eventData)
        console.log("GET_EVENT_DATA", JSON.parse(JSON.stringify(MainStore.eventData)))
    }).catch((error) => {
        console.error(`Trying to get event data "${error}"`)
    })
}

function removeEmptyEventData(eventData) {
    let eventDivisionData = eventData.eventData.divisionData
    console.log(eventDivisionData)
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
        MainStore.playerData = response.players
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

    return fetchEx("UPDATE_EVENT_STATE", { eventKey: mainStore.eventData.key }, undefined, {
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

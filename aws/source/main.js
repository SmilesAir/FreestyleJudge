const AWS = require("aws-sdk")
let docClient = new AWS.DynamoDB.DocumentClient()
const uuid = AWS.util.uuid


const Common = require("./common.js")

const eventManifestKey = "eventManifest"
const poolKeyPrefix = "pool|"

module.exports.importEventFromPoolCreator = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let eventKey = decodeURIComponent(event.pathParameters.eventKey)
    let request = JSON.parse(event.body) || {}
    let eventName = request.TournamentName

    validateEventKey(eventKey)

    if (eventName === undefined || eventName.length < 1) {
        throw `Bad Event Name "${eventName}"`
    }

    updateManifest(eventKey, eventName)

    let parsedData = await parseEventDataFromPoolCreator(eventKey, eventName, request)
    let newEventData = parsedData.eventData
    let newPoolMap = parsedData.poolMap

    let currentEventData = await getEventDataWithPoolData(eventKey)

    // conditionally update the event data
    if (currentEventData !== undefined) {
        newEventData.importantVersion = currentEventData.importantVersion + 1

        // merge the pools
        for (let poolKey in newPoolMap) {
            let newPoolData = newPoolMap[poolKey]
            let currentPoolData = currentEventData.eventData.poolMap[poolKey]
            if (currentPoolData !== undefined) {
                for (let currentTeam of currentPoolData.teamData) {
                    if (hasTeamResults(currentTeam)) {
                        let found = false
                        for (let newTeamIndex = 0; newTeamIndex < newPoolData.teamData.length; ++newTeamIndex) {
                            let newTeam = newPoolData.teamData[newTeamIndex]
                            if (hasSamePlayers(currentTeam, newTeam)) {
                                found = true
                                newPoolData.teamData[newTeamIndex] = currentTeam
                                break
                            }
                        }

                        if (!found) {
                            newPoolData.teamData.push(currentTeam)
                        }
                    }
                }
            }
        }
    }

    console.log(JSON.stringify(newPoolMap))
    console.log(JSON.stringify(newEventData))

    let putPromises = []
    let putNewEventParams = {
        TableName : process.env.DATA_TABLE,
        Item: newEventData
    }
    putPromises.push(docClient.put(putNewEventParams).promise().catch((error) => {
        throw error
    }))

    for (let poolKey in newPoolMap) {
        let newPoolData = newPoolMap[poolKey]
        let putNewPoolParams = {
            TableName : process.env.DATA_TABLE,
            Item: newPoolData
        }
        putPromises.push(docClient.put(putNewPoolParams).promise().catch((error) => {
            throw error
        }))
    }

    await Promise.all(putPromises)

    return {
        message: `"${eventName}" Imported Succesfully to V3`
    }
})}

function hasTeamResults(teamData) {
    return Object.keys(teamData.judgeData).length > 0
}

function hasSamePlayers(teamData1, teamData2) {
    if (teamData1.players.length !== teamData2.players.length) {
        return false
    }

    for (let i = 0; i < teamData1.players.length; ++i) {
        if (teamData1.players[i] !== teamData2.players[i]) {
            return false
        }
    }

    return true
}

function validateEventKey(eventKey) {
    if (eventKey === undefined || eventKey.length < 10) {
        throw `Bad Event Key "${eventKey}"`
    }
}

async function parseEventDataFromPoolCreator(eventKey, eventName, request) {
    let newEventData = {
        key: eventKey,
        eventName: eventName,
        importantVersion: 0,
        eventData: {
            playerData: {},
            divisionData: {},
            poolMap: {}
        },
        eventState: {},
        controllerState: {},
        judgesState: {}
    }
    let poolMap = {}

    for (let player of request.registeredPlayers) {
        newEventData.eventData.playerData[player.key] = {
            key: player.key,
            name: player.FullName
        }
    }

    for (let divisionIndex = 0; divisionIndex < request.divisions.length; ++divisionIndex) {
        let divisionData = request.divisions[divisionIndex]
        let divisionName = getPoolCreatorDivisionNameFromIndex(divisionIndex)
        let newDivisionData = {
            name: divisionName,
            headJudge: divisionData.headJudge,
            directors: divisionData.directors,
            roundData: {}
        }
        for (let roundIndex = 0; roundIndex < divisionData.rounds.length; ++roundIndex) {
            let roundData = divisionData.rounds[roundIndex]
            let roundName = getPoolCreatorRoundNameFromIndex(roundData.round)
            newDivisionData.roundData[roundName] = {
                name: roundName,
                lengthSeconds: roundData.routineLength * 60,
                poolNames:[]
            }
            for (let poolIndex = 0; poolIndex < roundData.pools.length; ++poolIndex) {
                let poolData = roundData.pools[poolIndex]
                let poolName = getPoolCreatorPoolNameFromIndex(poolIndex)
                if (poolData.teamList.teams.length > 0) {
                    newDivisionData.roundData[roundName].poolNames.push(poolName)

                    let newJudgeData = {}
                    for (let judgeCategory in poolData.judgesData) {
                        let judgeCategoryData = poolData.judgesData[judgeCategory]
                        for (let judgeData of judgeCategoryData) {
                            newJudgeData[judgeData.key] = getPoolCreatorJudgeCategory(judgeCategory)
                        }
                    }

                    let teamData = []
                    for (let team of poolData.teamList.teams) {
                        let players = []
                        for (let player of team.players) {
                            players.push(player.key)
                        }

                        teamData.push({
                            players: players,
                            judgeData: {}
                        })
                    }

                    let poolKey = makePoolKey(eventKey, divisionName, roundName, poolName)
                    let newPoolData = {
                        key: poolKey,
                        judges: newJudgeData,
                        teamData: teamData
                    }

                    poolMap[poolKey] = newPoolData
                }
            }
        }

        newEventData.eventData.divisionData[divisionName] = newDivisionData
    }

    return {
        eventData: newEventData,
        poolMap: poolMap
    }
}

function getPoolCreatorJudgeCategory(judgeCategory) {
    switch (judgeCategory) {
        case "judgesAi":
            return "Variety"
        case "judgesDiff":
            return "Diff"
        case "judgesEx":
            return "ExAi"
    }
}

function getPoolCreatorPoolNameFromIndex(index) {
    return String.fromCharCode("A".charCodeAt(0) + index)
}

function getPoolCreatorRoundNameFromIndex(index) {
    switch (index) {
        case 0:
            return "Finals"
        case 1:
            return "Semifinals"
        case 2:
            return "Quarterfinals"
        case 3:
            return "Preliminaries"
        default:
            return "Unknown Round"
    }
}

function getPoolCreatorDivisionNameFromIndex(index) {
    switch (index) {
        case 0:
            return "Open Pairs"
        case 1:
            return "Mixed Pairs"
        case 2:
            return "Open Co-op"
        case 3:
            return "Women Pairs"
        default:
            return "Unknown Division"
    }
}

async function updateManifest(eventKey, eventName) {
    let manifestData = undefined
    let getManifestParams = {
        TableName : process.env.DATA_TABLE,
        Key: {
            key: eventManifestKey
        }
    }
    await docClient.get(getManifestParams).promise().then((response) => {
        manifestData = response.Item
    }).catch((error) => {
        throw error
    })

    if (manifestData === undefined) {
        manifestData = {
            key: eventManifestKey,
            events: {}
        }
    }

    let eventManifestData = manifestData.events[eventKey]
    if (eventManifestData === undefined) {
        manifestData.events[eventKey] = {
            eventKey: eventKey,
            eventName: eventName,
            createdAt: Date.now(),
            modifiedAt: Date.now()
        }
    } else {
        eventManifestData.modifiedAt = Date.now()
    }

    let putParams = {
        TableName : process.env.DATA_TABLE,
        Item: manifestData
    }
    await docClient.put(putParams).promise().catch((error) => {
        throw error
    })
}

async function getEventData(eventKey) {
    let getEventParams = {
        TableName : process.env.DATA_TABLE,
        Key: {
            key: eventKey
        }
    }
    return await docClient.get(getEventParams).promise().then((response) => {
        return response.Item
    }).catch((error) => {
        throw error
    })
}

module.exports.getImportantVersion = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let eventKey = decodeURIComponent(event.pathParameters.eventKey)

    validateEventKey(eventKey)

    let eventData = await getEventData(eventKey)

    return {
        importantVersion: eventData.importantVersion
    }
})}


module.exports.getEventData = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let eventKey = decodeURIComponent(event.pathParameters.eventKey)

    validateEventKey(eventKey)

    return {
        eventData: await getEventDataWithPoolData(eventKey)
    }
})}

async function getEventDataWithPoolData(eventKey) {
    let eventData = await getEventData(eventKey)
    if (eventData === undefined) {
        throw `Can't find event for key "${eventKey}"`
    }

    let poolKeysToFetch = []
    for (let divisionName in eventData.eventData.divisionData) {
        let divisionData = eventData.eventData.divisionData[divisionName]
        for (let roundName in divisionData.roundData) {
            let roundData = divisionData.roundData[roundName]
            for (let poolName of roundData.poolNames) {
                poolKeysToFetch.push(makePoolKey(eventKey, divisionName, roundName, poolName))
            }
        }
    }

    let poolMap = eventData.eventData.poolMap
    let poolFetchPromises = poolKeysToFetch.map(async(poolKey) => {
        return getPoolData(poolKey, poolMap)
    })

    await Promise.all(poolFetchPromises)

    return eventData
}

function makePoolKey(eventKey, divisionName, roundName, poolName) {
    return `${poolKeyPrefix}${eventKey}|${divisionName}|${roundName}|${poolName}`
}

function getPoolData(poolKey, poolMap) {
    let getPoolParams = {
        TableName : process.env.DATA_TABLE,
        Key: {
            key: poolKey
        }
    }
    return docClient.get(getPoolParams).promise().then((response) => {
        if (poolMap !== undefined) {
            poolMap[poolKey] = response.Item
        }
        return response.Item
    }).catch((error) => {
        throw error
    })
}

module.exports.updateEventState = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let eventKey = decodeURIComponent(event.pathParameters.eventKey)
    let request = JSON.parse(event.body) || {}

    validateEventKey(eventKey)

    if (request.eventState === undefined && request.controllerState === undefined) {
        throw "Error, both eventState and controllerState are undefined"
    }

    let expressions = []
    if (request.eventState !== undefined) {
        expressions.push("eventState = :eventState")
    }

    if (request.controllerState !== undefined) {
        expressions.push("controllerState = :controllerState")
    }

    let updateParams = {
        TableName: process.env.DATA_TABLE,
        Key: {"key": eventKey},
        UpdateExpression: "set importantVersion = importantVersion + :one, " + expressions.join(", "),
        ExpressionAttributeValues: {
            ":eventState": request.eventState,
            ":controllerState": request.controllerState,
            ":one": 1
        },
        ReturnValues: "NONE"
    }
    await docClient.update(updateParams).promise().catch((error) => {
        throw error
    })

    return {
        message: `Updated "${eventKey}" Successful`
    }
})}

module.exports.updateJudgeState = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let poolKey = decodeURIComponent(event.pathParameters.poolKey)
    let judgeGuid = decodeURIComponent(event.pathParameters.judgeGuid)
    let teamIndex = parseInt(decodeURIComponent(event.pathParameters.teamIndex))

    let updateParams = {
        TableName: process.env.DATA_TABLE,
        Key: {"key": poolKey},
        UpdateExpression: "set teamData[:teamIndex].judgeData[:judgeGuid] = :judgeData",
        ExpressionAttributeValues: {
            ":teamIndex": teamIndex,
            ":judgeGuid": judgeGuid,
            ":judgeData": request
        },
        ReturnValues: "NONE"
    }
    await docClient.update(updateParams).promise().catch((error) => {
        throw error
    })
})}

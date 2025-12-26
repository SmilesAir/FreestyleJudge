const AWS = require("aws-sdk")
const fetch = require("node-fetch")
let docClient = new AWS.DynamoDB.DocumentClient()


const Common = require("./common.js")

const dataVersion = 1
const eventManifestKey = "eventManifest"
const poolKeyPrefix = "pool|"
const usernameKeyPrefix = "user|"

module.exports.importEventFromPoolCreator = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    return {
        success: false,
        message: "importEventFromPoolCreator is deprecated"
    }
})}

module.exports.importEventFromEventCreator = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let eventKey = decodeURIComponent(event.pathParameters.eventKey)
    let newEventData = JSON.parse(event.body) || {}
    let eventName = newEventData.eventName

    validateEventKey(eventKey)

    if (eventName === undefined || eventName.length < 1) {
        throw `Bad Event Name "${eventName}"`
    }

    updateManifest(eventKey, eventName)

    let currentEventData = await getEventDataWithPoolData(eventKey)
    let newPoolMap = newEventData.eventData.poolMap

    // conditionally update the event data
    if (currentEventData !== undefined) {
        newEventData.importantVersion = currentEventData.importantVersion + 1

        console.log("Current poolMap", JSON.stringify(currentEventData.eventData.poolMap))
        mergePoolMap(newEventData.eventData, currentEventData.eventData.poolMap, newPoolMap)
    }

    newEventData.eventData.poolMap = {}

    console.log("New poolMap", JSON.stringify(newPoolMap))
    console.log("New eventData", JSON.stringify(newEventData))

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

function getRulesIdForPool(eventData, poolKey) {
    let poolKeyParts = poolKey.split("|")
    if (poolKeyParts.length !== 5) {
        console.error(`Bad pool key ${poolKey}`)
    }

    let divisionName = poolKeyParts[2]
    let divisionData = eventData.divisionData[divisionName]
    if (divisionData !== undefined) {
        return divisionData.rulesId
    }

    return undefined
}

function mergePoolMap(eventData, currentPoolMap, newPoolMap) {
    for (let poolKey in newPoolMap) {
        let isSimpleRanking = getRulesIdForPool(eventData, poolKey) !== "SimpleRanking"
        let newPoolData = newPoolMap[poolKey]
        let currentPoolData = currentPoolMap[poolKey]
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

                    if (!found && !isSimpleRanking) {
                        newPoolData.teamData.push(currentTeam)
                    }
                }
            }
        }
    }
}

function hasTeamResults(teamData) {
    return teamData.judgeData && Object.keys(teamData.judgeData).length > 0
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

async function updateManifest(eventKey, eventName) {
    let manifestData = await getManifestData()
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
            modifiedAt: Date.now(),
            showInDirectory: true
        }
    } else {
        eventManifestData.modifiedAt = Date.now()
        eventManifestData.showInDirectory = true
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

module.exports.getEventDataVersion = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let eventKey = decodeURIComponent(event.pathParameters.eventKey)

    validateEventKey(eventKey)

    let eventData = await getEventData(eventKey)

    if (eventData === null || eventData === undefined) {
        return {
            importantVersion: 0,
            minorVersion: 0
        }
    }

    return {
        importantVersion: eventData.importantVersion,
        minorVersion: eventData.minorVersion
    }
})}


module.exports.getEventData = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let eventKey = decodeURIComponent(event.pathParameters.eventKey)

    validateEventKey(eventKey)

    return {
        eventData: await getEventDataWithPoolData(eventKey)
    }
})}

module.exports.getEssentialDatabaseData = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let eventKey = decodeURIComponent(event.pathParameters.eventKey)

    validateEventKey(eventKey)

    let eventData = await getEventDataWithPoolData(eventKey)

    let stage = event.requestContext.stage
    let getNameDataUrl = undefined
    if (stage === "production") {
        getNameDataUrl = "https://4wnda3jb78.execute-api.us-west-2.amazonaws.com/production/getAllPlayers"
    } else {
        getNameDataUrl = "https://tkhmiv70u9.execute-api.us-west-2.amazonaws.com/development/getAllPlayers"
    }

    let response = await fetch(getNameDataUrl)
    let playerData = await response.json()

    let essentialPlayerData = {}
    for (let playerKey in eventData.eventData.playerData) {
        let foundPlayerData = playerData.players[playerKey]
        if (foundPlayerData === undefined) {
            console.warn(`Could not find player data for key ${playerKey}`)
            continue
        }

        essentialPlayerData[playerKey] = foundPlayerData
    }

    return {
        players: essentialPlayerData
    }
})}

async function getEventDataWithPoolData(eventKey) {
    let eventData = await getEventData(eventKey)
    if (eventData === undefined) {
        console.warn(`Can't find event for key "${eventKey}"`)
        return undefined
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
    let eventKey = decodeURIComponent(event.pathParameters.eventKey)
    let judgeKey = decodeURIComponent(event.pathParameters.judgeKey)
    let request = JSON.parse(event.body) || {}

    let updateParams = {
        TableName: process.env.DATA_TABLE,
        Key: {"key": eventKey},
        UpdateExpression: "set judgesState.#judgeKey = :judgeState",
        ExpressionAttributeNames: {
            "#judgeKey": judgeKey
        },
        ExpressionAttributeValues: {
            ":judgeState": request
        },
        ReturnValues: "NONE"
    }
    await docClient.update(updateParams).promise().catch((error) => {
        throw error
    })

    await incrementMinorVersion(eventKey)

    return {
        message: `Updated "${eventKey}" Successful`
    }
})}

module.exports.updateJudgeData = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let poolKey = decodeURIComponent(event.pathParameters.poolKey)
    let judgeKey = decodeURIComponent(event.pathParameters.judgeKey)
    let teamIndex = parseInt(decodeURIComponent(event.pathParameters.teamIndex))
    let request = JSON.parse(event.body) || {}

    let updateParams = {
        TableName: process.env.DATA_TABLE,
        Key: {"key": poolKey},
        UpdateExpression: `set teamData[${teamIndex}].judgeData.#judgeKey = :judgeData`,
        ExpressionAttributeNames: {
            "#judgeKey": judgeKey
        },
        ExpressionAttributeValues: {
            ":judgeData": request
        },
        ReturnValues: "NONE"
    }
    await docClient.update(updateParams).promise().catch((error) => {
        throw error
    })

    await incrementMinorVersionByPoolKey(poolKey)

    return {
        message: `Updated "${poolKey}" Successful`
    }
})}

module.exports.updatePoolLocked = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let poolKey = decodeURIComponent(event.pathParameters.poolKey)
    let isLocked = decodeURIComponent(event.pathParameters.isLocked) === "1"

    let updateParams = {
        TableName: process.env.DATA_TABLE,
        Key: {"key": poolKey},
        UpdateExpression: `set isLocked = :locked`,
        ExpressionAttributeValues: {
            ":locked": isLocked
        },
        ReturnValues: "NONE"
    }
    await docClient.update(updateParams).promise().catch((error) => {
        throw error
    })

    await incrementMinorVersionByPoolKey(poolKey)

    return {
        message: `Updated "${poolKey}" Successful`
    }
})}

module.exports.updatePoolData = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let poolKey = decodeURIComponent(event.pathParameters.poolKey)
    let request = JSON.parse(event.body) || {}

    if (request === undefined) {
        throw `Can't find pool data for ${poolKey}`
    }

    let putNewPoolParams = {
        TableName : process.env.DATA_TABLE,
        Item: request
    }
    await docClient.put(putNewPoolParams).promise().catch((error) => {
        throw error
    })

    await incrementImportantVersionByPoolKey(poolKey)

    return {
        message: `Updated "${poolKey}" Successful`
    }
})}

function incrementMinorVersionByPoolKey(poolKey) {
    return incrementMinorVersion(poolKey.split("|")[1])
}

function incrementMinorVersion(eventKey) {
    let updateParams = {
        TableName: process.env.DATA_TABLE,
        Key: {"key": eventKey},
        UpdateExpression: `set minorVersion = minorVersion + :one`,
        ExpressionAttributeValues: {
            ":one": 1
        },
        ReturnValues: "NONE"
    }
    return docClient.update(updateParams).promise().catch((error) => {
        throw error
    })
}

function incrementImportantVersionByPoolKey(poolKey) {
    return incrementImportantVersion(poolKey.split("|")[1])
}

function incrementImportantVersion(eventKey) {
    let updateParams = {
        TableName: process.env.DATA_TABLE,
        Key: {"key": eventKey},
        UpdateExpression: "set importantVersion = importantVersion + :one",
        ExpressionAttributeValues: {
            ":one": 1
        },
        ReturnValues: "NONE"
    }
    return docClient.update(updateParams).promise().catch((error) => {
        throw error
    })
}

module.exports.getEventDirectory = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let manifestData = await getManifestData()
    if (manifestData === undefined) {
        throw "Can't find manifest data"
    }

    let directory = []
    for (let eventKey in manifestData.events) {
        let event = manifestData.events[eventKey]
        if (event.showInDirectory) {
            directory.push({
                eventKey: eventKey,
                eventName: event.eventName,
                modifiedAt: event.modifiedAt
            })
        }
    }

    return {
        eventDirectory: directory
    }
})}

module.exports.removeEventFromDirectory = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let eventKey = decodeURIComponent(event.pathParameters.eventKey)
    let username = event.requestContext.authorizer.jwt.claims.username

    let userItem = await getUserData(username)
    if (userItem === undefined || userItem.permissions === undefined || userItem.permissions.admin !== true) {
        console.log(`Can't find permissions for user ${username}`)
        throw `No valid permissions for ${username}`
    }

    let updateParams = {
        TableName: process.env.DATA_TABLE,
        Key: {key: eventManifestKey},
        UpdateExpression: "set events.#eventKey.showInDirectory = :false",
        ExpressionAttributeNames: {
            "#eventKey": eventKey
        },
        ExpressionAttributeValues: {
            ":false": false
        },
        ReturnValues: "NONE"
    }
    await docClient.update(updateParams).promise().catch((error) => {
        throw error
    })

    await incrementMinorVersion(eventKey)

    return {
        message: `Updated "${eventKey}" Successful`
    }
})}

module.exports.getUserPermissions = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let username = event.requestContext.authorizer.jwt.claims.username

    let userItem = await getUserData(username)
    if (userItem === undefined || userItem.permissions === undefined) {
        console.log(`Can't find permissions for user ${username}`)
        return {
            permissions: {}
        }
    }

    return {
        permissions: userItem.permissions
    }
})}

function getManifestData() {
    let getManifestParams = {
        TableName : process.env.DATA_TABLE,
        Key: {
            key: eventManifestKey
        }
    }
    return docClient.get(getManifestParams).promise().then((response) => {
        return response.Item
    }).catch((error) => {
        throw error
    })
}

async function getUserData(username) {
    let getEventParams = {
        TableName : process.env.DATA_TABLE,
        Key: {
            key: usernameKeyPrefix + username
        }
    }
    return await docClient.get(getEventParams).promise().then((response) => {
        return response.Item
    }).catch((error) => {
        throw error
    })
}

module.exports.getSetPermalinkParams = (e, c, cb) => { Common.handler(e, c, cb, async (event, context) => {
    let crc = decodeURIComponent(event.pathParameters.crc32)
    let request = JSON.parse(event.body) || {}

    if (crc === undefined) {
        throw "No crc specified"
    }

    const permalinkPrefix = "permalink+"
    let urlParams = undefined
    if (request.urlParams !== undefined) {
        urlParams = request.urlParams
        let putParams = {
            TableName : process.env.DATA_TABLE,
            Item: {
                key: permalinkPrefix + crc,
                urlParams: request.urlParams
            }
        }
        docClient.put(putParams).promise().catch((error) => {
            throw error
        })
    } else {
        let getEventParams = {
            TableName : process.env.DATA_TABLE,
            Key: {
                key: permalinkPrefix + crc
            }
        }
        await docClient.get(getEventParams).promise().then((response) => {
            urlParams = response.Item.urlParams
        }).catch((error) => {
            throw error
        })
    }

    return {
        crc32: crc,
        urlParams: urlParams
    }
})}
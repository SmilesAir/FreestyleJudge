
let urls = {
    GET_EVENT_DATA: "{path}/getEventData/{eventKey}",
    GET_PLAYER_DATA: "https://4wnda3jb78.execute-api.us-west-2.amazonaws.com/production/getAllPlayers",
    GET_ESSENTIAL_DATABASE_DATA: "{path}/getEssentialDatabaseData/{eventKey}",
    GET_EVENT_DATA_VERSION: "{path}/getEventDataVersion/{eventKey}",
    GET_EVENT_DIRECTORY: "{path}/getEventDirectory",
    UPDATE_EVENT_STATE: "{path}/updateEventState/{eventKey}",
    UPDATE_JUDGE_STATE: "{path}/updateJudgeState/{eventKey}/judgeKey/{judgeKey}",
    UPDATE_JUDGE_DATA: "{path}/updateJudgeData/{poolKey}/judgeKey/{judgeKey}/teamIndex/{teamIndex}",
    UPDATE_POOL_DATA: "{path}/updatePoolData/{poolKey}",
    UPDATE_POOL_LOCKED: "{path}/updatePoolLocked/{poolKey}/isLocked/{isLocked}",
    REMOVE_EVENT_FROM_DIRECTORY: "{path}/removeEventFromDirectory/{eventKey}",
    GET_USER_PERMISSIONS: "{path}/getUserPermissions",
    CONVERT_TO_RESULTS_DATA: "https://v869a98rf9.execute-api.us-west-2.amazonaws.com/production/convertToResultsData/{eventKey}/divisionName/{divisionName}",
    UPLOAD_RESULTS: "https://v869a98rf9.execute-api.us-west-2.amazonaws.com/production/setEventResults/{eventKey}/divisionName/{divisionName}",
    GET_SET_PERMALINK_PARAMS: "{path}/getSetPermalinkParams/{crc32}"
}

function buildUrl(isAuth, urlKey, pathParams, queryParams) {
    let path = undefined
    if (isAuth) {
        path = __STAGE__ === "DEVELOPMENT" ? "https://h3vgnn0x1j.execute-api.us-west-2.amazonaws.com" : "https://57wxmwdchh.execute-api.us-west-2.amazonaws.com"
    } else {
        path = __STAGE__ === "DEVELOPMENT" ? "https://8er0vxrmr4.execute-api.us-west-2.amazonaws.com/development" : "https://xf4cu1wy10.execute-api.us-west-2.amazonaws.com/production"
    }

    let url = urls[urlKey]
    for (let wildName in pathParams) {
        url = url.replace(`{${wildName}}`, encodeURIComponent(pathParams[wildName]))
    }

    url = url.replace("{path}", path)

    let firstQueryParam = true
    for (let paramName in queryParams) {
        let prefix = firstQueryParam ? "?" : "&"
        firstQueryParam = false

        url += `${prefix}${paramName}=${encodeURIComponent(queryParams[paramName])}`
    }

    return url
}

module.exports.fetchEx = function(key, pathParams, queryParams, options) {
    return fetch(buildUrl(false, key, pathParams, queryParams), options)
}

module.exports.fetchAuth = function(key, pathParams, queryParams, options) {
    return fetch(buildUrl(true, key, pathParams, queryParams), options)
}


let urls = {
    GET_EVENT_DATA: "{path}/getEventData/{eventKey}",
    GET_PLAYER_DATA: "https://4wnda3jb78.execute-api.us-west-2.amazonaws.com/production/getAllPlayers",
    GET_EVENT_DATA_VERSION: "{path}/getEventDataVersion/{eventKey}",
    UPDATE_EVENT_STATE: "{path}/updateEventState/{eventKey}",
    UPDATE_JUDGE_STATE: "{path}/updateJudgeState/{judgeKey}",
    UPDATE_JUDGE_DATA: "{path}/updateJudgeData/{poolKey}/judgeKey/{judgeKey}/teamIndex/{teamIndex}"
}

function buildUrl(isAuth, urlKey, pathParams, queryParams) {
    let path = undefined
    if (isAuth) {
        path = __STAGE__ === "DEVELOPMENT" ? "https://odnou7cv5a.execute-api.us-west-2.amazonaws.com" : "https://jz56qku4ll.execute-api.us-west-2.amazonaws.com"
    } else {
        path = __STAGE__ === "DEVELOPMENT" ? "https://8er0vxrmr4.execute-api.us-west-2.amazonaws.com/development" : "https://uj3vhwj8i1.execute-api.us-west-2.amazonaws.com/production"
    }

    let pathReplaceData = {
        "path": path
    }

    Object.assign(pathReplaceData, pathParams)

    let url = urls[urlKey]
    for (let wildName in pathReplaceData) {
        url = url.replace(`{${wildName}}`, pathReplaceData[wildName])
    }

    let firstQueryParam = true
    for (let paramName in queryParams) {
        let prefix = firstQueryParam ? "?" : "&"
        firstQueryParam = false

        url += `${prefix}${paramName}=${queryParams[paramName]}`
    }

    return url
}

module.exports.fetchEx = function(key, pathParams, queryParams, options) {
    return fetch(buildUrl(false, key, pathParams, queryParams), options)
}

module.exports.fetchAuth = function(key, pathParams, queryParams, options) {
    return fetch(buildUrl(true, key, pathParams, queryParams), options)
}

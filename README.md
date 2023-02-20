# FreestyleJudge

Simple backend and configurable frontend to handle Freestyle Frisbee judging needs

# Goals
1. Platform independant
2. Cloud server only
3. Cloud is source of truth
4. Able to modify pool with results
5. Easy to modify pool and update all devices

# Backend

## API
**Import Event** Used by PoolCreator to update event details. Players/Pools/Judges
1. Updates eventData
1. Handles team removed
   * Team with results gets hidden, but still exists
   * Team without results gets removed
1. Handles team added

**Get Event Data** Gets event details blob. Also gets all the pool data.

**Get Important Version** Gets only the Important Version. This is used to check if the client needs to call the more expensive GetEventData api

**Get Event Directory** Returns a list of event keys and names

**Update Event State** Used to update playing pool
1. Updates eventState
2. Updates controllerState
3. This updates the Important Version

**Update Judge State** Used to update scores for judges
1. Updates both judgeData in the teamData in poolData and judgesState in the event blob
2. Does not update the Important Version

---

## Data
Single DynamoDB table

### Names of stuff
| Attribute | Options | Description |
| --- | --- | --- |
| eventName | Ex. FPAW 2022| Name of the event. The key to everything |
| Division Name | Women Pairs, Open Pairs, Mixed Pairs, Open Co-op, ... | Name of the division |
| Round Name | Finals, Semifinals, Quaterfinals, Preliminaries, ... | Name of the round |
| Pool Name | A, B, C, D, ... | Name of the pool |
| Pool Key | See below | Unique key used for pools |

## Manifest Object
Keeps a list of all the events
```
{
    events: {
        [eventGuid]: {
            eventKey: guid,
            eventName: string,
            createdAt: int
        }, ...
    }
}
```

## Event Object
| Key | Data Blob | Data Blob Version | Data Blob Version Important |
| --- | --- | --- | --- |
| Tournament Name | JSON blob containing all the data for the tournament | Increments everytime the blob changes | Updates to Data Blob version when important data changes that all users should fully sync. Things like the head judge starts the routine, pools change |

### Schema
```
{
    key: guid,
    eventName: string,
    importantVersion: int,
    eventData: {
        playerData: {
            [playerKey]: {
                key: string,
                name: string,
            }, ...
        },
        divisionData: {
            [divisionName]: {
                name: string,
                headJudge: string,
                directors: [string, ...],
                roundData: {
                    [roundName]: {
                        name: string,
                        lengthSeconds: int,
                        poolNames: [string, ...]
                    }, ...
                }
            }, ...
        },
        // poolMap is fetched from different items to avoid the 400KB limit
        poolMap: {
            [poolKey]: {
                key: string,
                judges: {
                    [judgeKey]: string, // Category
                    ...
                }
                teamData: [{
                    players: [guid, ...]
                    judgeData: {
                        [guid]: {
                            judgeKey: guid,
                            categoryType: string, // Diff, Variety, ExAi, ...
                            rawScores: {
                                ...
                            },
                            lastCalculatedScore: float
                        }
                    }
                }, ...]
            }
        }
    }
    // This data is transient
    eventState: {
        activePoolKey: string
    }
    // This data is transient
    controllerState: {
        selectedTeamIndex: int,
        routineStartTime: int64
        ...
    },
    // Only used for current pool judges state. This data is transient
    judgesState: {
        [judgeKey]: {
            judgeKey: guid,
            isFinished: bool,
            isEditing: bool,
            updatedAt: int64
        }
    }
}
```

## Pool Object
| Key | Data Blob |
| --- | --- |
| pool|\<Event Key>|\<Division Name>|\<Round Name>|\<Pool Name> | JSON blob containing team list and judge scores |

### Schema
```
{
    key: string,
    judges: {
        [judgeKey]: string, // Category: Variety, Diff, ExAi
        ...
    },
    teamData: [{
        players: [guid, ...]
        judgeData: {
            [guid]: {
                judgeKey: guid,
                categoryType: string,
                rawScores: {
                    ...
                },
                lastCalculatedScore: float
            }
        }
    }, ...]
}
```

# Frontend
1. Important Version change resets client state from Cloud

## Requirements
1. Interface/styling
2. Calculate results
3. Display results
4. Export results to rankings
5. Control the pool, starting the routine

### Calculating Results
* Each judge stores raw scores in a single blob
* Abstract interface with stubs to calculate and display results
* Each category has its own child interface implementing all the stubs
* Each category has a type key, categoryKey. This is used to type the raw scores blob, the interface, and tunneables
* Each category has a tunneable blob for things that can be changed. This is typed using categoryType
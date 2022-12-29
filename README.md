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

**Update Pool** Used to 

**Get Event Data** Gets event details blob

**Update Event State** Used to update playing pool
1. Updates eventState
2. This updates the Important Version

**Update Controller State** Used to update playing team, routine start, etc...
1. Updates controllerState
2. This updates the Important Version

**Update Judge State** Used to update scores for judges
1. Updates both judgeData in the team data and judgesState in the event blob
2. Does not update the Important Version

---

## Data
Single DynamoDB table

## Event Object
| Key | Data Blob | Data Blob Version | Data Blob Version Important |
| --- | --- | --- | --- |
| Tournament Name | JSON blob containing all the data for the tournament | Increments everytime the blob changes | Updates to Data Blob version when important data changes that all users should fully sync. Things like the head judge starts the routine, pools change |

### Schema
```
{
    eventName: string,
    eventData: {
        playerData: [{
            name: string,
            country: string,
            rank: int,
            gender: string
        }, ...]
        divisionData: [{
            name: string,
            lengthSeconds: int,
            headJudge: string,
            directors: [string, ...],
            poolData: [{
                name: string,
                judgeData: [{
                    name: string,
                    category: string
                }, ...]
                teamData: [{
                    playerData: [int, ...],
                    isHidden: bool,
                    judgeData: {
                        [judgeName]: {
                            name: string,
                            scores: {
                                ...
                            }
                        }
                    }
                }, ...]
            }, ...]
        }, ...]
    }
    // This data is transient
    eventState: {
        activePool: string
    }
    // This data is transient
    controllerState: {
        ...
    },
    // Only used for current pool judges state. This data is transient
    judgesState: {
        [judgeName]: {
            name: string,
            isFinished: bool,
            isEditing: bool
        }
    }
}
```

## Pool Object
| Key | Data Blob |
| --- | --- |
| \<Tournament Name>-pool-\<Division Index>-\<Round Index>-\<Pool Index> | JSON blob containing team list and judge scores |

# Frontend
1. Important Version change resets client state from Cloud


# FreestyleJudge

Simple backend and configurable frontend to handle Freestyle Frisbee judging needs

# Backend

## API
**Import Event** Used by PoolCreator to update event details. Players/Pools/Judges
1. Updates eventData
1. Handles team removed
   * Team with results gets hidden, but still exists
   * Team without results gets removed
1. Handles team added

**Get Event Data** Gets event details blob

**Update Event State** Used to update playing pool
1. Updates eventState
2. This updates the Important version

**Update Controller State** Used to update playing team, routine start, etc...
1. Updates controllerState
2. This updates the Important version

**Update Judge State** Used to update scores for judges
1. Updates both judgeData in the team data and judgesState in the event blob
2. Does not update the Important version

---

## Data
Single DynamoDB table


| Key | Data Blob | Data Blob Version | Data Blob Version Important |
| --- | --- | --- | --- |
| Tournament Name | JSON blob containing all the data for the tournament | Increments everytime the blob changes | Updates to Data Blob version when important data changes that all users should fully sync. Things like the head judge starts the routine, pools change |

### Blob Schema
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
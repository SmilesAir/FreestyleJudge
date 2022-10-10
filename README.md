# FreestyleJudge

Simple backend and configurable frontend to handle Freestyle Frisbee judging needs

# Backend

## API
**Import Event** Used by PoolCreator to update event details. Players/Pools/Judges

**Get Event Data** Gets event details blob

**Update Event State** Used to update playing pool

**Update Controller State** Used to update playing team, routine start, etc...

**Update Judge State** Used to update scores for judges

---

## Data
Single DynamoDB table


| Key | Data Blob |
| --- | --- |
| Tournament Name | JSON blob containing all the data for the tournament |

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
                    playerData: [int, ...]
                }, ...]
            }, ...]
        }, ...]
    }
    eventState: {
        activePool: string
    }
    controllerState: {
        ...
    },
    judgesState: {
        [judgeName]: {
            name: string,
            isFinished: bool,
            isEditing: bool,
            scoreData: {
                ...
            }
        }
    }
}
```
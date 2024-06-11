# Torrent Trench

### Manage torrents by automating torrent client actions with filters, using simple but highly customisable configuration

<sub>**Currently only works with qBittorrent**, if there is interest in other clients I can look into implementing support for them</sub>

## Deployment

### Docker Compose

```dockerfile
version: '3'

services:
  nodejs:
    image: ghcr.io/nafdev/torrenttrench:1.0
    tty: true
    container_name: torrenttrench
    environment:
      - TT_CONFIG_PATH=/data
    volumes:
      - /path/to/folderwithconfigjson:/data:ro
```

#### Environment Variables

- TT_CONFIG_PATH: Path to your config file `torrent-trench.json` (default `/data`)
- LOG_LEVEL: `warn` `error` `info` `debug`, default is `info`

## Trench Configuration

This project works on a concept of `trenches` which consist of any number of `filters`, `actions`, or `forks` (which are other trenches), all defined under one configuration JSON.

### Configuration JSON

```json
// torrent-trench.json
{
  // Array of torrent client connections
  "connections": {
    "client": "qbit",
    "url": string,
    "username": string,
    "password": string
  }[],
  // Array of trench definitions
  "trenches": {
    "name": string,
    "enabled": boolean, // Enables trench schedule (doesn't affect forks)
    "schedule": "*/30 * * * *", // Cron expression, defaults to every 30th second,
    "trench": Trench[] // See trench definition schema
  } []
}
```

### Trench Definition Schema

```json
{
  "type": "filter" | "action" | "fork",
  "fork": string, // Name of another trench to run
  "filter": "tracker" | // string conditions
            "progress" | // numeric, out of 100
            "ratio" | // numeric
            "label" | // string
            "savePath" | // string
            "name" | // string
            "complete" | // boolean
            "seedTime" | // numeric, in seconds
            "timeActive", // numeric, in seconds
  // Filter conditions
  "condition": NumericConditions | StringConditions | boolean,

  "action": "resumeTorrent" |
            "pauseTorrent" |
            "recheckTorrent" |
            "reannounceTorrent" |
            "increasePriority" |
            "decreasePriority" |
            "maximisePriority" |
            "minimisePriority",
  "options": {
    // Options for actions
  }
}
```

### Numeric Conditions

```json
{
  // For numeric filters (progress, ratio, seedTime, timeActive)
  "lte": number,
  "gte": number
}
```

### String Conditions

```json
{
  // For string filters (tracker, label, savePath, name)
  "caseInsensitive": boolean, // if true, all comparisons are case insensitive (default false)
  "includes": string,
  "notIncludes": string,
  "startsWith": string,
  "notStartsWith": string,
  "endsWith": string,
  "notEndsWith": string,
  "match": Regex string
}
```

### Trench Action Options

#### deleteTorrent

```json
{
  "deleteFiles": boolean // default false
}
```

## Example configuration

This is a configuration with 1 trench, which runs every hour, and will remove any torrent (without deleting files) once it reaches a seed time of 1 day.

```json
{
  "version": 1,
  "connections": [
    {
      "client": "qbit",
      "url": "http://192.168.1.123:10096",
      "username": "admin",
      "password": "adminadmin"
    }
  ],
  "trenches": [
    {
      "name": "Delete after 1 hour seeded",
      "schedule": "*/60 * * * *",
      "enabled": true,
      "trench": [
        {
          "type": "filter",
          "filter": "complete",
          "condition": true
        },
        {
          "type": "filter",
          "filter": "seedTime",
          "condition": {
            "gte": 86400
          }
        },
        {
          "type": "action",
          "action": "delete"
        }
      ]
    }
  ]
}
```

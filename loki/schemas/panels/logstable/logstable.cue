package model

kind: "LogsTable"
spec: close({
    direction?:  "forward" | "backward"
    wrap?: bool
    enableDetails?: bool
    time?: bool
})
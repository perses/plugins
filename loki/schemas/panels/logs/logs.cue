package model

kind: "Logs"
spec: close({
    direction?:  "forward" | "backward"
    wrap?: bool
    enableDetails?: bool
    time?: bool
})
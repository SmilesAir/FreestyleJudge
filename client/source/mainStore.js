
const Mobx = require("mobx")


module.exports = Mobx.observable({
    eventData: undefined,
    playerData: undefined,
    constants: {},
    selectedDivision: { value: "Open Pairs", label: "Open Pairs" },
    selectedRound: { value: "Finals", label: "Finals" },
    selectedPool: { value: "A", label: "A" },
    topTabsSelectedIndex: 1,
    controlsTabsSelectedIndex: 1
})

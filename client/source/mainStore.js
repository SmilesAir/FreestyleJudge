
const Mobx = require("mobx")


module.exports = Mobx.observable({
    eventData: undefined,
    playerData: undefined,
    constants: {},
    selectedDivision: null,
    selectedRound: null,
    selectedPool: null,
    topTabsSelectedIndex: 0,
    controlsTabsSelectedIndex: 0
})


const Mobx = require("mobx")


module.exports = Mobx.observable({
    eventData: undefined,
    playerData: undefined,
    constants: {},
    selectedDivision: null,
    selectedRound: null,
    selectedPool: null,
    topTabsSelectedIndex: 0,
    controlsTabsSelectedIndex: 0,
    currentWidgetName: undefined,
    judgeTabsSelectedIndex: 0,
    judgeIndex: undefined,
    eventDirectory: undefined,
    eventKey: undefined //"8c14255f-9a96-45f1-b843-74e2a00d06cc"
})

import React from 'react';
import './tabs.css';
export var Tabs = function (_a) {
    var tabs = _a.tabs, selectedTab = _a.selectedTab, onSelectTab = _a.onSelectTab;
    return (React.createElement("div", { className: 'tabs' },
        React.createElement("div", { role: 'tablist' }, tabs.map(function (tab) { return (React.createElement("button", { role: 'tab', "aria-selected": tab.id === selectedTab, "aria-controls": "".concat(tab.id, "-panel"), id: tab.id, key: tab.id, onClick: function () { return onSelectTab === null || onSelectTab === void 0 ? void 0 : onSelectTab(tab.id); } }, tab.title)); })),
        tabs.map(function (tab) { return (React.createElement("div", { role: 'tabpanel', "aria-labelledby": tab.id, id: "".concat(tab.id, "-panel"), key: tab.id, "aria-hidden": tab.id !== selectedTab }, tab.content)); })));
};
//# sourceMappingURL=tabs.js.map
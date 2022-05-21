"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const React = require("react");
const ReactDOMClient = require("react-dom/client");
const react_helmet_1 = require("react-helmet");
function App() {
    return (<div className={"app"}>
            <react_helmet_1.default>
                <title>Communitty</title>
                <meta name="description" content="Engage with others on Communitty"/>
                <meta name="keywords" content="communitty, community, social media"/>
            </react_helmet_1.default>
        </div>);
}
const container = ReactDOMClient.createRoot(document.getElementById("root"));
container.render(<App />);
//# sourceMappingURL=index.jsx.map
module.exports = function (RED) {
    "use strict";
    var fs = require("fs");
    var path = require("path");
    var JsonDB = require("node-json-db");
    var defaultPath = path.join(RED.settings.userDir, "JsonDB");

    function JsonDBCollection(n) {
        RED.nodes.createNode(this, n);
        var collectionFilePath = path.join(defaultPath, n.collection + ".json");
        try {
            var oldFile = path.join(process.cwd(), "JsonDB_" + n.collection + ".json");
            var stats = fs.statSync(oldFile);
            try {
                stats = fs.statSync(defaultPath);
            } catch (error) {
                fs.mkdirSync(defaultPath);
            }

            fs.renameSync(oldFile, collectionFilePath);
            this.log("Moved old file from '" + oldFile + "' to '" + collectionFilePath + '"');
        } catch (error) {

        }
        this.db = new JsonDB(collectionFilePath, n.save);
        this.on("close", function () {
            try {
                this.db.save();
            } catch (error) {
            }
        });
    }

    RED.nodes.registerType("json-db-collection", JsonDBCollection);

    function DataIn(n) {
        RED.nodes.createNode(this, n);
        this.collection = RED.nodes.getNode(n.collection);
        this.dataPath = n.path;
        this.override = !n.update;
        var node = this;

        this.on("input", function (msg) {
            var path = msg.datapath || node.dataPath;
            try {
                node.collection.db.push(path, msg.payload, node.override);
            } catch (error) {
                node.error(error);
            }
        });

    }

    RED.nodes.registerType("DataIn", DataIn);


    function DataOut(n) {
        RED.nodes.createNode(this, n);
        /**
         * @var JsonDB
         */
        this.collection = RED.nodes.getNode(n.collection);
        this.dataPath = n.path;
        this.sendError = n.error;
        var node = this;

        this.on("input", function (msg) {
            var path = msg.datapath || node.dataPath;
            try {
                var data = node.collection.db.getData(path);
                msg.payload = data;
                node.status({ fill: "green", shape: "dot", text: "No Error" });
                node.send(msg);
            } catch (error) {
                if (node.sendError) {
                    msg.error = error.toString();
                    node.send(msg);
                    node.status({ fill: "yellow", shape: "ring", text: error.toString() });
                } else {
                    node.error(error);
                    node.status({ fill: "red", shape: "dot", text: error.toString() });
                }
            }
        });

    }

    RED.nodes.registerType("DataOut", DataOut);

}

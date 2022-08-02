/* global $CC, Utils, $SD */

/**
 * Here are a couple of wrappers we created to help you quickly setup
 * your plugin and subscribe to events sent by Stream Deck to your plugin.
 */

/**
 * The 'connected' event is sent to your plugin, after the plugin's instance
 * is registered with Stream Deck software. It carries the current websocket
 * and other information about the current environmet in a JSON object
 * You can use it to subscribe to events you want to use in your plugin.
 */

$SD.on('connected', (jsonObj) => connected(jsonObj));
var pluginUUID;
var globalSettings = {};

function connected(jsn) {
    // Subscribe to the willAppear and other events
    console.log('connected', jsn);
    pluginUUID = jsn.uuid;
    $SD.api.getGlobalSettings(pluginUUID);
    $SD.on('didReceiveGlobalSettings', (jsonObj) => onDidReceiveGlobalSettings(jsonObj));
    $SD.on('com.evanscreekdev.showplayer.action.willAppear', (jsonObj) => hilightAction.onWillAppear(jsonObj));
    $SD.on('com.evanscreekdev.showplayer.action.keyUp', (jsonObj) => hilightAction.onKeyUp(jsonObj));
    $SD.on('com.evanscreekdev.showplayer.action.sendToPlugin', (jsonObj) => hilightAction.onSendToPlugin(jsonObj));
    $SD.on('com.evanscreekdev.showplayer.action.didReceiveSettings', (jsonObj) => hilightAction.onDidReceiveSettings(jsonObj));
    $SD.on('com.evanscreekdev.showplayer.action.propertyInspectorDidAppear', (jsonObj) => {
        var context = jsonObj.context;
        $SD.api.sendToPropertyInspector(context, globalSettings, "com.evanscreekdev.showplayer.action");
        console.log('%c%s', 'color: white; background: black; font-size: 13px;', '[app.js]propertyInspectorDidAppear:');
    });
    $SD.on('com.evanscreekdev.showplayer.action.propertyInspectorDidDisappear', (jsonObj) => {
        console.log('%c%s', 'color: white; background: red; font-size: 13px;', '[app.js]propertyInspectorDidDisappear:');
    });

    $SD.on('com.evanscreekdev.showsponsor.action.willAppear', (jsonObj) => adAction.onWillAppear(jsonObj));
    $SD.on('com.evanscreekdev.showsponsor.action.keyUp', (jsonObj) => adAction.onAdKeyUp(jsonObj));
    $SD.on('com.evanscreekdev.showsponsor.action.sendToPlugin', (jsonObj) => adAction.onSendToPlugin(jsonObj));
    $SD.on('com.evanscreekdev.showsponsor.action.didReceiveSettings', (jsonObj) => adAction.onDidReceiveSettings(jsonObj));
    $SD.on('com.evanscreekdev.showsponsor.action.propertyInspectorDidAppear', (jsonObj) => {
        var context = jsonObj.context;
        $SD.api.sendToPropertyInspector(context, globalSettings, "com.evanscreekdev.showsponsor.action");
        console.log('%c%s', 'color: white; background: black; font-size: 13px;', '[app.js]propertyInspectorDidAppear:');
    });

    $SD.on('com.evanscreekdev.scoreboard.show.action.keyUp', (jsonObj) => scoreboardAction.onScoreboardKeyUp(jsonObj));
    $SD.on('com.evanscreekdev.scoreboard.show.action.sendToPlugin', (jsonObj) => scoreboardAction.onSendToPlugin(jsonObj));
    $SD.on('com.evanscreekdev.scoreboard.show.action.propertyInspectorDidAppear', (jsonObj) => {
        var context = jsonObj.context;
        $SD.api.sendToPropertyInspector(context, globalSettings, "com.evanscreekdev.scoreboard.show.action");
        console.log('%c%s', 'color: white; background: black; font-size: 13px;', '[app.js]propertyInspectorDidAppear:');
    });
};

function onDidReceiveGlobalSettings(jsonObj) {
    console.log('%c%s', 'color: white; background: black; font-size: 13px;', '[app.js]onDidReceiveGlobalSettings:' + JSON.stringify(jsonObj));
    globalSettings = Utils.getProp(jsonObj, 'payload.settings', {});
    if (!globalSettings.hasOwnProperty('playerImagePath')) {
        globalSettings.playerImagePath = 'players/images/';
    }
    if (!globalSettings.hasOwnProperty('sponsorImagePath')) {
        globalSettings.sponsorImagePath = 'sponsors/images/';
    }
    if (!globalSettings.hasOwnProperty('hilightTimeout')) {
        globalSettings.hilightTimeout = 5000;
    }
    if (!globalSettings.hasOwnProperty('adTimeout')) {
        globalSettings.adTimeout = 10000;
    }
    console.log("globalSettings: " + JSON.stringify(globalSettings));
    $SD.api.setGlobalSettings(pluginUUID, globalSettings);
};

// Called from each action's sendToPlugin to handle updates to the global settings
function updateGlobalSettings(payload) {
    console.log("Payload with global settings:", payload);
    if (payload.hasOwnProperty('baseurl')) {
        console.log("Received baseURL from Property Inspector:", payload.baseurl);
        globalSettings.baseurl = payload.baseurl;
        console.log("setGlobalSettings:", globalSettings);
        $SD.api.setGlobalSettings(pluginUUID, globalSettings);
    } else if (payload.hasOwnProperty('hilightTimeout')) {
        console.log("Received highlightTimeout from Property Inspector:", payload.hilightTimeout);
        globalSettings.hilightTimeout = payload.hilightTimeout;
        console.log("setGlobalSettings:", globalSettings);
        $SD.api.setGlobalSettings(pluginUUID, globalSettings);
    } else if (payload.hasOwnProperty('adTimeout')) {
        console.log("Received adTimeout from Property Inspector:", payload.adTimeout);
        globalSettings.adTimeout = payload.adTimeout;
        console.log("setGlobalSettings:", globalSettings);
        $SD.api.setGlobalSettings(pluginUUID, globalSettings);
    } else if (payload.hasOwnProperty('playerImagePath')) {
        console.log("Received playerImagePath from Property Inspector:", payload.playerImagePath);
        globalSettings.playerImagePath = payload.playerImagePath;
        console.log("setGlobalSettings:", globalSettings);
        $SD.api.setGlobalSettings(pluginUUID, globalSettings);
    } else if (payload.hasOwnProperty('sponsorImagePath')) {
        console.log("Received sponsorImagePath from Property Inspector:", payload.sponsorImagePath);
        globalSettings.sponsorImagePath = payload.sponsorImagePath;
        console.log("setGlobalSettings:", globalSettings);
        $SD.api.setGlobalSettings(pluginUUID, globalSettings);
    }
}

// Helper function for drawing source images to button faces

function drawCircle(ctx, x, y, radius) { 
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
    ctx.fillStyle = 'red';
    ctx.fill();
    ctx.moveTo(x+radius+5, y);
    ctx.arc(x, y, radius+5, 0, 2 * Math.PI);
    ctx.strokeStyle = 'red';
    ctx.stroke();
}

function drawImage(inContext, imageUrl) {
    let image = new Image();
    image.src = imageUrl;
    image.onload = function() {
        console.log("drawImage:", imageUrl);
        let canvas = document.createElement('canvas');
        let ctx = canvas.getContext('2d');
        canvas.width = 144;
        canvas.height = 144;
        let x = 0;
        let y = 0;
        let w = image.width;
        let h = image.height;
        if (w < h) {
            x = (w - h) / 2;
            w = h;
        } else {
            y = (h - w) / 2;
            h = w;
        }
        ctx.drawImage(image, x, y, w, h, 0, 0, 144, 144);
        let dataURL = canvas.toDataURL();
        $SD.api.setImage(inContext, dataURL, DestinationEnum.HARDWARE_AND_SOFTWARE, StateEnum.DISABLED);
        // add a darker overlay for the enabled state
        ctx.fillStyle = '#00000060';
        ctx.fillRect(0, 0, 144, 144);
        // add a red 'on-air' circle for the enabled state
        drawCircle(ctx, 35, 35, 15);
        dataURL = canvas.toDataURL();
        $SD.api.setImage(inContext, dataURL, DestinationEnum.HARDWARE_AND_SOFTWARE, StateEnum.ENABLED);
    }
}

// ACTIONS

const adAction = {
    settings:{},
    onDidReceiveSettings: function(jsn) {
        console.log('%c%s', 'color: white; background: red; font-size: 15px;', '[app.js]onDidReceiveSettings:');

        this.settings = Utils.getProp(jsn, 'payload.settings', {});
        console.log("settings: " + JSON.stringify(this.settings));
        let newSettings = {...this.settings, url: globalSettings.baseurl + "rest/db/sponsor/" + this.settings.sponsorid};
        // Call REST API to retreive full sponsor details, then update the title
        // and image from data returned from REST API
        console.log("newSettings: " + JSON.stringify(newSettings));
        fetch(newSettings.url)
        .then(function (response) {
            return response.json();
        }
        ).then(function (data) {
            console.log("data: " + JSON.stringify(data));
            $SD.api.setSettings(jsn.context, newSettings);
            $SD.api.setTitle(jsn.context, data.name);
            // Now load the image into a canvas scaled to 144x144, convert to base64 and send setImage
            drawImage(jsn.context, globalSettings.baseurl + "sponsors/images/" + data.image);
        })
        .catch(function (error) {
            console.log("error: " + error);
        });
    },

    /** 
     * The 'willAppear' event is the first event a key will receive, right before it gets
     * shown on your Stream Deck and/or in Stream Deck software.
     * We will use this event to set the title and image of the key from the web service.
     */

    onWillAppear: function (jsn) {
        this.settings = jsn.payload.settings;
        console.log("onWillAppear", jsn);
        if (this.settings.url && this.settings.url.length > 20) {
            fetch(this.settings.url)
            .then(function (response) {
                return response.json();
            }
            ).then(function (data) {
                $SD.api.setTitle(jsn.context, data.name);
                var restLoc = jsn.payload.settings.url.indexOf("rest");
                var baseUrl = jsn.payload.settings.url.substring(0, restLoc);
                // Now load the image into a canvas scaled to 144x144, convert to base64 and send setImage
                drawImage(jsn.context, baseUrl + "sponsors/images/" + data.image);
            })
            .catch(function (error) {
                $SD.api.showAlert(jsn.context);
                console.log("error: " + error);
            });
        }
    },

    onAdKeyUp: function (jsn) {
        // Pull baseURL from globalSettings, get playerID from inSettings
        // If inState is 1, then turn on the ad, otherwise turn it off
        // Ad is set by sending a PUT request to baseURL/rest/db/ad with 
        // body = {"id": sponsorID}, with sponsorID = 0 to turn ad off
        console.log("onKeyUp", jsn);
        let sponsorID = Utils.getProp(jsn, 'payload.settings.sponsorid', 0);
        const context = Utils.getProp(jsn, 'context', '');
        let state = Utils.getProp(jsn, 'payload.state', 0);
        let desiredState = Utils.getProp(jsn, 'payload.userDesiredState', 0);
        let multiAction = Utils.getProp(jsn, 'payload.isInMultiAction', false);
        if (multiAction) {
            state = !desiredState;
        }
        if (globalSettings.baseurl && sponsorID > 0) {
            let url = globalSettings.baseurl + 'rest/db/ad';
            let body = { id: state == 0 ? sponsorID : 0 };
            console.log("url: " + url + " body: " + JSON.stringify(body));
            fetch(url, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) })
            .then(function (response) {
                if (response.status == 200) {
                    // Request succeeded, start a timer to turn off the hilight after the specified timeout
                    // Set state to 1 to indicate that the hilight is on
                    console.log("PUT ad response: " + response.status);
                    if (state == 0) {
                        $SD.api.setState(context, 1);
                        var interval = setInterval(() => {
                            body = { id: 0 };
                            fetch(url, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) })
                            .then(function (response) {
                                if (response.ok) {
                                    console.log("Ad turned off");
                                    $SD.api.setState(context, 0);
                                }
                                clearInterval(interval);
                            })
                        }, globalSettings.hilightTimeout);
                    } else {
                        $SD.api.setState(context, 0);
                    }
                } else {
                    console.log("PUT ad response: " + response.status);
                    $SD.api.setState(context, 0);
                }

            })
            .catch(function (err) {
                console.log('error: ' + err);
            });
        }
    },

    onSendToPlugin: function (jsn) {
        /**
         * This is a message sent directly from the Property Inspector 
         */ 

        const sdpi_collection = Utils.getProp(jsn, 'payload.sdpi_collection', {});
        const payload = Utils.getProp(jsn, 'payload', {});
        if (sdpi_collection.value && sdpi_collection.value !== undefined) {
            console.log('onSendToPlugin', { [sdpi_collection.key] : sdpi_collection.value });      
        } else {
            updateGlobalSettings(payload);
        }
    },
};

const hilightAction = {
    settings:{},
    onDidReceiveSettings: function(jsn) {
        console.log('%c%s', 'color: white; background: red; font-size: 15px;', '[app.js]onDidReceiveSettings:');

        this.settings = Utils.getProp(jsn, 'payload.settings', {});
        console.log("settings: " + JSON.stringify(this.settings));
        // let newSettings = {};
        // newSettings.playerid  = this.settings.playerid;
        let newSettings = {...this.settings, url: globalSettings.baseurl + "rest/db/player/" + this.settings.playerid};
        // Call REST API to retreive full player details, then update the title
        // and image from data returned from REST API
        fetch(newsettings.url)
        .then(function (response) {
            return response.json();
        }
        ).then(function (data) {
            console.log("data: " + JSON.stringify(data));
            $SD.api.setSettings(jsn.context, newSettings);
            $SD.api.setTitle(jsn.context, data.jersey);
            // Now load the image into a canvas scaled to 144x144, convert to base64 and send setImage
            drawImage(jsn.context, globalSettings.baseurl + "players/images/" + data.image);
        })
        .catch(function (error) {
            console.log("error: " + error);
        });
    },

    /** 
     * The 'willAppear' event is the first event a key will receive, right before it gets
     * shown on your Stream Deck and/or in Stream Deck software.
     * We will use this event to set the title and image of the key from the web service.
     */

    onWillAppear: function (jsn) {
        this.settings = jsn.payload.settings;
        console.log("onWillAppear", jsn);
        if (this.settings.url && this.settings.url.length > 20) {
            fetch(this.settings.url)
            .then(function (response) {
                return response.json();
            }
            ).then(function (data) {
                $SD.api.setTitle(jsn.context, data.jersey);
                var restLoc = jsn.payload.settings.url.indexOf("rest");
                var baseUrl = jsn.payload.settings.url.substring(0, restLoc);
                // Now load the image into a canvas scaled to 72x72, convert to base64 and send setImage
                drawImage(jsn.context, baseUrl + "players/images/" + data.image);
            })
            .catch(function (error) {
                $SD.api.showAlert(jsn.context);
                console.log("error: " + error);
            });
        }
    },

    onKeyUp: function (jsn) {
        // Pull baseURL from globalSettings, get playerID from inSettings
        // If inState is 1, then turn on the hilight, otherwise turn it off
        // Hilight is set by sending a PUT request to baseURL/rest/db/hilight with 
        // body = {"id": playerID}, with playerID = 0 to turn hilight off
        console.log("onKeyUp", jsn);
        let playerID = Utils.getProp(jsn, 'payload.settings.playerid', 0);
        let context = Utils.getProp(jsn, 'context', '');
        let state = Utils.getProp(jsn, 'payload.state', 0);
        let desiredState = Utils.getProp(jsn, 'payload.userDesiredState', 0);
        let multiAction = Utils.getProp(jsn, 'payload.isInMultiAction', false);
        if (multiAction) {
            state = !desiredState;
        }
        if (globalSettings.baseurl && playerID > 0) {
            let url = globalSettings.baseurl + 'rest/db/hilight';
            let body = { id: state == 0 ? playerID : 0 };
            console.log("url: " + url + " body: " + JSON.stringify(body));
            fetch(url, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) })
            .then(function (response) {
                if (response.status == 200) {
                    // Request succeeded, start a timer to turn off the hilight after the specified timeout
                    // Set state to 1 to indicate that the hilight is on
                    console.log("PUT hilight response: " + response.status);
                    if (state == 0) {
                        $SD.api.setState(context, 1);
                        var interval = setInterval(() => {
                            body = { id: 0 };
                            fetch(url, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) })
                            .then(function (response) {
                                if (response.ok) {
                                    console.log("Player hilight turned off");
                                    $SD.api.setState(context, 0);
                                }
                                clearInterval(interval);
                            })
                        }, globalSettings.hilightTimeout);
                    }
                } else {
                    console.log("PUT hilight response: " + response.status);
                    $SD.api.setState(context, 0);
                }
            })
            .catch(function (err) {
                console.log('error: ' + err);
            });
        }
    },

    onSendToPlugin: function (jsn) {
        /**
         * This is a message sent directly from the Property Inspector 
         */ 

        const sdpi_collection = Utils.getProp(jsn, 'payload.sdpi_collection', {});
        const payload = Utils.getProp(jsn, 'payload', {});
        if (sdpi_collection.value && sdpi_collection.value !== undefined) {
            console.log('onSendToPlugin', { [sdpi_collection.key] : sdpi_collection.value });      
        } else {
            updateGlobalSettings(payload);
        }
    },
};

const scoreboardAction = {

    onScoreboardKeyUp: function (jsn) {
        // Pull baseURL from globalSettings, 
        // If inState is 0, then turn on the scoreboard, otherwise turn it off
        // Scoreboard is displayed by sending a PUT request to baseURL/rest/db/scoreboard 
        // with body = {"id": 1}, id = 0 to turn scoreboard off
        console.log("Scoreboard onKeyUp", jsn);
        const context = Utils.getProp(jsn, 'context', '');
        var state = Utils.getProp(jsn, 'payload.state', 0);
        const desiredState = Utils.getProp(jsn, 'payload.userDesiredState', 0);
        const multiAction = Utils.getProp(jsn, 'payload.isInMultiAction', false);
        if (multiAction) {
            state = !desiredState;
        }
        if (globalSettings.baseurl) {
            let url = globalSettings.baseurl + 'rest/db/scoreboard';
            let body = { id: state == 0 ? 1 : 0 };
            console.log("url: " + url + " body: " + JSON.stringify(body));
            fetch(url, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) })
            .then(function (response) {
                if (response.status == 204) {
                    // Set state to 1 to indicate that the scoreboard is on
                    console.log("PUT scoreboard response: " + response.status);
                    if (state == 0) {
                        $SD.api.setState(context, 1);
                    } else {
                        $SD.api.setState(context, 0);
                    }
                } else {
                    console.log("PUT ad response: " + response.status);
                    $SD.api.setState(context, 0);
                }

            })
            .catch(function (err) {
                console.log('error: ' + err);
            });
        } else {
            console.log("No baseurl", globalSettings);
        }
    },

    onSendToPlugin: function (jsn) {
        /**
         * This is a message sent directly from the Property Inspector 
         */ 

        const sdpi_collection = Utils.getProp(jsn, 'payload.sdpi_collection', {});
        const payload = Utils.getProp(jsn, 'payload', {});
        if (sdpi_collection.value && sdpi_collection.value !== undefined) {
            console.log('onSendToPlugin', { [sdpi_collection.key] : sdpi_collection.value });      
        } else {
            updateGlobalSettings(payload);
        }
    },
};


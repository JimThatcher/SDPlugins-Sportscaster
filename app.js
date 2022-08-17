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
var keysCache = {};
var eventSource = null;
var currentClock = "-:--";
var currentScore = {HomeScore: 0, GuestScore: 0};
var activeHilight = 0;
var activeAd = 0;
var isScoreboardShowing = false;
var isConsoleConnected = false;
var isClockRunning = false;

function onClockEvent(evt) {
    console.log('onClockEvent', evt);
    var eventJson = JSON.parse(evt.data);
    var changedState = false;
    if (eventJson.hasOwnProperty('isRunning')) {
        if (eventJson.isRunning !== isClockRunning) {
            changedState = true;
        }
        isClockRunning = eventJson.isRunning;
    }
    if (eventJson.hasOwnProperty('Clk')) {
        var periodLoc = eventJson["Clk"].lastIndexOf(".");
        var resultStr = "";
        if (periodLoc > 1) {
            resultStr = eventJson["Clk"].substring(0, periodLoc).trim();
        }
        else {
            resultStr = eventJson["Clk"].trim();
        }
        currentClock = resultStr;
        // Iterate through the active keys (in keysCache) and update the key images with the new clock on 
        // each active key listening to the clock event
        for (var key in keysCache) {
            if (keysCache[key].action === 'com.evanscreekdev.clock.action') {
                var args = {time: currentClock, state: isClockRunning};
                keysCache[key].drawKey(args);
                if (changedState) {
                    $SD.api.setState(key, isClockRunning ? 1 : 0);
                    console.log('ClockKey: setState', key, isClockRunning);
                }
            }
        }
    }
}

function onScoreEvent(evt) {
    console.log('onScoreEvent', evt);
    var eventJson = JSON.parse(evt.data);
    if (eventJson.hasOwnProperty('Hs')) {
        currentScore = eventJson;
        var home = currentScore["Hs"];
        var guest = currentScore["Gs"];
        console.log('onScoreEvent', home, guest);
        // Iterate through the active keys (in keysCache) and update the key images with the new score on 
        // each active key scoreboard key
        for (var key in keysCache) {
            if (keysCache[key].action === 'com.evanscreekdev.scoreboard.show.action') {
                var args = {home: home, guest: guest, state: isScoreboardShowing};
                keysCache[key].drawKey(args);
            }
        }
    }
}

// onAdEvent is called when an ad event is received from the server
function onAdEvent(evt) {
    console.log('onAdEvent', evt);
    var eventJson = JSON.parse(evt.data);
    if (eventJson.hasOwnProperty('id')) {
        activeAd = eventJson["id"];
        var state = activeAd === 0 ? 0 : 1;
        var context;
        if (eventJson.hasOwnProperty('requester')) {
            context = eventJson["requester"];
        } else {
            // Iterate through the active keys (in keysCache) and update the status of each key
            // that matches the ad's sponsor id
            if (activeAd !== 0) {
                for (var key in keysCache) {
                    if (keysCache[key].action === 'com.evanscreekdev.showsponsor.action') {
                        if (keysCache[key].payload.settings.sponsorid === activeAd) {
                            context = keysCache[key].context;
                            break;
                        }
                    }
                }
            }
        }
        if (context) {
            $SD.api.setState(context, state);
        }
    }
}

// onHilightEvent is called when an hilight event is received from the server
function onHilightEvent(evt) {
    console.log('onHilightEvent', evt);
    var eventJson = JSON.parse(evt.data);
    if (eventJson.hasOwnProperty('id')) {
        activeHilight = eventJson["id"];
        var state = activeHilight === 0 ? 0 : 1;
        var context;
        if (eventJson.hasOwnProperty('requester')) {
            context = eventJson["requester"];
        } else {
            // Iterate through the active keys (in keysCache) and update the status of each key
            // that matches the hilight's player id
            if (activeHilight !== 0) {
                for (var key in keysCache) {
                    if (keysCache[key].action === 'com.evanscreekdev.showplayer.action') {
                        if (keysCache[key].payload.settings.playerid === activeHilight) {
                            context = keysCache[key].context;
                            break;
                        }
                    }
                }
            }
        }
        if (context) {
            $SD.api.setState(context, state);
        }
    }
}

// If globalSettings.baseurl is set, let's try to set up server-sent events listener
function connectServerEvents() {
    console.log('connectServerEvents');
    if (eventSource === null) {
        console.log('connectServerEvents: eventSource is null');
        eventSource = new EventSource(globalSettings.baseurl + "events");
        eventSource.addEventListener('open', function(e) {
            console.log("Events Connected");
        }, false);

        eventSource.addEventListener('error', function(e) {
            if (e.target.readyState != EventSource.OPEN) {
                console.log("Events Disconnected");
            }
        }, false);
        eventSource.addEventListener('clock', onClockEvent, false);
        eventSource.addEventListener('score', onScoreEvent, false);
        eventSource.addEventListener('ad', onAdEvent, false);
        eventSource.addEventListener('hilight', onHilightEvent, false);
    }
}

function connected(jsn) {
    console.log('connected', jsn);
    pluginUUID = jsn.uuid;
    $SD.api.getGlobalSettings(pluginUUID);
    $SD.on('didReceiveGlobalSettings', (jsonObj) => onDidReceiveGlobalSettings(jsonObj));
    $SD.on('com.evanscreekdev.showplayer.action.willAppear', (jsonObj) => hilightAction.onHilightWillAppear(jsonObj));
    $SD.on('com.evanscreekdev.showplayer.action.keyUp', (jsonObj) => hilightAction.onHilightKeyUp(jsonObj));
    $SD.on('com.evanscreekdev.showplayer.action.sendToPlugin', (jsonObj) => hilightAction.onHilightSendToPlugin(jsonObj));
    $SD.on('com.evanscreekdev.showplayer.action.didReceiveSettings', (jsonObj) => hilightAction.onHilightDidReceiveSettings(jsonObj));
    $SD.on('com.evanscreekdev.showplayer.action.propertyInspectorDidAppear', (jsonObj) => {
        var context = jsonObj.context;
        if (globalSettings.hasOwnProperty('baseurl')) {
            connectServerEvents();
        }
        $SD.api.sendToPropertyInspector(context, globalSettings, "com.evanscreekdev.showplayer.action");
        console.log('%c%s', 'color: white; background: black; font-size: 13px;', '[app.js]propertyInspectorDidAppear:');
    });
    $SD.on('com.evanscreekdev.showplayer.action.propertyInspectorDidDisappear', (jsonObj) => {
        console.log('%c%s', 'color: white; background: red; font-size: 13px;', '[app.js]propertyInspectorDidDisappear:');
    });

    $SD.on('com.evanscreekdev.showsponsor.action.willAppear', (jsonObj) => adAction.onAdWillAppear(jsonObj));
    $SD.on('com.evanscreekdev.showsponsor.action.keyUp', (jsonObj) => adAction.onAdKeyUp(jsonObj));
    $SD.on('com.evanscreekdev.showsponsor.action.sendToPlugin', (jsonObj) => adAction.onAdSendToPlugin(jsonObj));
    $SD.on('com.evanscreekdev.showsponsor.action.didReceiveSettings', (jsonObj) => adAction.onAdDidReceiveSettings(jsonObj));
    $SD.on('com.evanscreekdev.showsponsor.action.propertyInspectorDidAppear', (jsonObj) => {
        var context = jsonObj.context;
        if (globalSettings.hasOwnProperty('baseurl')) {
            connectServerEvents();
        }
        $SD.api.sendToPropertyInspector(context, globalSettings, "com.evanscreekdev.showsponsor.action");
        console.log('%c%s', 'color: white; background: black; font-size: 13px;', '[app.js]propertyInspectorDidAppear:');
    });

    $SD.on('com.evanscreekdev.scoreboard.show.action.willDisappear', (jsonObj) => scoreboardAction.onScoreboardWillDisappear(jsonObj));
    $SD.on('com.evanscreekdev.scoreboard.show.action.willAppear', (jsonObj) => scoreboardAction.onScoreboardWillAppear(jsonObj));
    $SD.on('com.evanscreekdev.scoreboard.show.action.keyUp', (jsonObj) => scoreboardAction.onScoreboardKeyUp(jsonObj));
    $SD.on('com.evanscreekdev.scoreboard.show.action.sendToPlugin', (jsonObj) => scoreboardAction.onScoreboardSendToPlugin(jsonObj));
    $SD.on('com.evanscreekdev.scoreboard.show.action.propertyInspectorDidAppear', (jsonObj) => {
        var context = jsonObj.context;
        if (globalSettings.hasOwnProperty('baseurl')) {
            connectServerEvents();
        }
        $SD.api.sendToPropertyInspector(context, globalSettings, "com.evanscreekdev.scoreboard.show.action");
        console.log('%c%s', 'color: white; background: black; font-size: 13px;', '[app.js]propertyInspectorDidAppear:');
    });

    $SD.on('com.evanscreekdev.virtualkey.action.keyUp', (jsonObj) => virtualKeyAction.onVkeyKeyUp(jsonObj));
    $SD.on('com.evanscreekdev.virtualkey.action.sendToPlugin', (jsonObj) => virtualKeyAction.onVkeySendToPlugin(jsonObj));
    $SD.on('com.evanscreekdev.virtualkey.action.propertyInspectorDidAppear', (jsonObj) => {
        var context = jsonObj.context;
        if (globalSettings.hasOwnProperty('baseurl')) {
            connectServerEvents();
        }
        $SD.api.sendToPropertyInspector(context, globalSettings, "com.evanscreekdev.virtualkey.action");
        console.log('%c%s', 'color: white; background: black; font-size: 13px;', '[app.js]propertyInspectorDidAppear:');
    });

    $SD.on('com.evanscreekdev.clock.action.willDisappear', (jsonObj) => clockKeyAction.onClockWillDisappear(jsonObj));
    $SD.on('com.evanscreekdev.clock.action.willAppear', (jsonObj) => clockKeyAction.onClockWillAppear(jsonObj));
    $SD.on('com.evanscreekdev.clock.action.keyDown', (jsonObj) => clockKeyAction.onClockKeyDown(jsonObj));
    $SD.on('com.evanscreekdev.clock.action.keyUp', (jsonObj) => clockKeyAction.onClockKeyUp(jsonObj));
    $SD.on('com.evanscreekdev.clock.action.sendToPlugin', (jsonObj) => clockKeyAction.onClockSendToPlugin(jsonObj));
    $SD.on('com.evanscreekdev.clock.action.propertyInspectorDidAppear', (jsonObj) => {
        var context = jsonObj.context;
        if (globalSettings.hasOwnProperty('baseurl')) {
            connectServerEvents();
        }
        $SD.api.sendToPropertyInspector(context, globalSettings, "com.evanscreekdev.clock.action");
        console.log('%c%s', 'color: white; background: black; font-size: 13px;', '[app.js]propertyInspectorDidAppear:');
    });
};

function onDidReceiveGlobalSettings(jsonObj) {
    console.log('%c%s', 'color: white; background: black; font-size: 13px;', '[app.js]onDidReceiveGlobalSettings:' + JSON.stringify(jsonObj));
    globalSettings = Utils.getProp(jsonObj, 'payload.settings', {});
    if (globalSettings.hasOwnProperty('baseurl')) {
        connectServerEvents();
    }
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
    // TODO: Read current state of each overlay from server and set the global variables accordingly
    console.log("globalSettings: " + JSON.stringify(globalSettings));
    $SD.api.setGlobalSettings(pluginUUID, globalSettings);
};

// Called from each action's sendToPlugin to handle updates to the global settings
function updateGlobalSettings(payload) {
    console.log("Payload with global settings:", payload);
    if (payload.hasOwnProperty('baseurl')) {
        console.log("Received baseURL from Property Inspector:", payload.baseurl);
        globalSettings = {...globalSettings, baseurl: payload.baseurl};
        // globalSettings.baseurl = payload.baseurl;
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
    image.onerror = function() {
        console.log("Error loading image: " + imageUrl);
        $SD.api.showAlert(inContext);
    }
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
        // $SD.api.showOk(inContext);
    }
}

function drawClock(inContext, inClock) {
    console.log("drawClock:", inClock);
    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');
    canvas.width = 144;
    canvas.height = 144;
    ctx.font = '48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'red' ;
    ctx.fillRect(0, 0, 144, 144);
    // Now draw the time to the canvas
    ctx.fillStyle = 'white';
    ctx.fillText(inClock, 72, 72);
    let dataURL = canvas.toDataURL();
    $SD.api.setImage(inContext, dataURL, DestinationEnum.HARDWARE_AND_SOFTWARE, StateEnum.ENABLED);
    ctx.fillStyle = 'green' ;
    ctx.fillRect(0, 0, 144, 144);
    // Now draw the time to the canvas
    ctx.fillStyle = 'white';
    ctx.fillText(inClock, 72, 72);
    dataURL = canvas.toDataURL();
    $SD.api.setImage(inContext, dataURL, DestinationEnum.HARDWARE_AND_SOFTWARE, StateEnum.DISABLED);
}

// ACTIONS

const adAction = {
    settings:{},
    onAdDidReceiveSettings: function(jsn) {
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

    onAdWillAppear: function (jsn) {
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
                if (!globalSettings.hasOwnProperty('baseurl')) {
                    globalSettings.baseurl = baseUrl;
                }
                // Now load the image into a canvas scaled to 144x144, convert to base64 and send setImage
                drawImage(jsn.context, baseUrl + "sponsors/images/" + data.image);
            })
            .catch(function (error) {
                $SD.api.showAlert(jsn.context);
                console.log("error: " + error);
            });
        }
        if (this.settings.sponsorid) {
            if (activeAd === this.settings.sponsorid) {
                $SD.api.setState(jsn.context, StateEnum.ENABLED);
            } else {
                $SD.api.setState(jsn.context, StateEnum.DISABLED);
            }
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
            let body = { id: state == 0 ? sponsorID : 0, requester: jsn.context };
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
                        }, globalSettings.adTimeout);
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

    onAdSendToPlugin: function (jsn) {
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
    onHilightDidReceiveSettings: function(jsn) {
        console.log('%c%s', 'color: white; background: red; font-size: 15px;', '[app.js]onDidReceiveSettings:');

        this.settings = Utils.getProp(jsn, 'payload.settings', {});
        console.log("settings: " + JSON.stringify(this.settings));
        // let newSettings = {};
        // newSettings.playerid  = this.settings.playerid;
        let newSettings = {...this.settings, url: globalSettings.baseurl + "rest/db/player/" + this.settings.playerid};
        console.log("newSettings: " + JSON.stringify(newSettings));
        // Call REST API to retreive full player details, then update the title
        // and image from data returned from REST API
        fetch(newSettings.url)
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

    onHilightWillAppear: function (jsn) {
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
                if (!globalSettings.hasOwnProperty('baseurl')) {
                    globalSettings.baseurl = baseUrl;
                }
                // Now load the image into a canvas scaled to 144x144, convert to base64 and send setImage
                drawImage(jsn.context, baseUrl + "players/images/" + data.image);
            })
            .catch(function (error) {
                $SD.api.showAlert(jsn.context);
                console.log("error: " + error);
            });
        }
    },

    onHilightKeyUp: function (jsn) {
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

    onHilightSendToPlugin: function (jsn) {
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

    onScoreboardWillDisappear: function (jsn) {
        // If we have a baseURL, let's paint the score using server-side events
        console.log("onScoreboardWillDisappear", jsn);
        let found = keysCache[jsn.context];
        if(found) {
            // remove the key from the cache
            delete this.cache[jsn.context];
        }
    },

    onScoreboardWillAppear: function (jsn) {
        // If we have a baseURL, let's paint the key using server-side events
        console.log("onScoreboardWillAppear", jsn);
        const context = Utils.getProp(jsn, 'context', '');
        let state = Utils.getProp(jsn, 'payload.state', 0);
        const key = new KeyFace(jsn);
        // cache the current key
        keysCache[context] = key;
        var args = {home: currentScore.HomeScore, guest: currentScore.GuestScore, state: state};
        key.drawKey(args);
        $SD.api.setState(context, isScoreboardShowing ? 1 : 0);
    },

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
            let body = { id: state == 0 ? 1 : 0, requester: context };
            console.log("url: " + url + " body: " + JSON.stringify(body));
            fetch(url, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) })
            .then(function (response) {
                if (response.status == 204) {
                    // Set state to 1 to indicate that the scoreboard is on
                    console.log("PUT scoreboard response: " + response.status); 
                    if (state == 0) {
                        isScoreboardShowing = true;
                        $SD.api.setState(context, 1);
                    } else {
                        isScoreboardShowing = false;
                        $SD.api.setState(context, 0);
                    }
                    var args = {home: currentScore.HomeScore, guest: currentScore.GuestScore, state: isScoreboardShowing};
                    keysCache[context].drawKey(args);
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

    onScoreboardSendToPlugin: function (jsn) {
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

const virtualKeyAction = {

    onVkeyKeyUp: function (jsn) {
        // Pull baseURL from globalSettings, 
        // Build the URL for the GET REST request to baseURL/{command}[/{param}]
        console.log("Virtual Key onKeyUp", jsn);
        const context = Utils.getProp(jsn, 'context', '');
        let command = Utils.getProp(jsn, 'payload.settings.command', 0);
        let params = Utils.getProp(jsn, 'payload.settings.param', 0);
        if (globalSettings.baseurl && command !== 0) {
            let url = globalSettings.baseurl + command + (params !== 0 ? '/' + params : '');
            console.log("url: " + url);
            fetch(url)
            .then(function (response) {
                if (!response.ok) {
                    // Set state to 1 to indicate that the scoreboard is on
                    console.log("GET virtual key response: " + response.status);
                    $SD.api.showAlert(context);
                }
            })
            .catch(function (err) {
                console.log('error: ' + err);
            });
        } else {
            console.log("No baseurl or settings", globalSettings, payload.settings);
        }
    },

    onVkeySendToPlugin: function (jsn) {
        /**
         * This is a message sent directly from the Property Inspector 
        **/ 

        const sdpi_collection = Utils.getProp(jsn, 'payload.sdpi_collection', {});
        const payload = Utils.getProp(jsn, 'payload', {});
        if (sdpi_collection.value && sdpi_collection.value !== undefined) {
            console.log('onSendToPlugin', { [sdpi_collection.key] : sdpi_collection.value });      
        } else {
            updateGlobalSettings(payload);
        }
    },
};

const clockKeyAction = {

    onClockWillDisappear: function (jsn) {
        // If we have a baseURL, let's paint the clock using server-side events
        console.log("onWillDisappear", jsn);
        let found = keysCache[jsn.context];
        if(found) {
            // remove the clock from the cache
            delete this.cache[jsn.context];
        }
    },

    onClockWillAppear: function (jsn) {
        // If we have a baseURL, let's paint the clock using server-side events
        console.log("onWillAppear", jsn);
        const context = Utils.getProp(jsn, 'context', '');
        let settings = Utils.getProp(jsn, 'payload.settings', {});
        if (!settings.hasOwnProperty('url') && globalSettings.hasOwnProperty('baseurl')) {
            settings.url = globalSettings.baseurl + 'events';
        }
        if (settings.hasOwnProperty('url') && settings.url.length > 12) {
            const clock = new KeyFace(jsn);
            // cache the current clock
            keysCache[context] = clock;
            var args = {time: currentClock, state: isClockRunning};
            clock.drawKey(args);
            $SD.api.setState(context, isClockRunning ? 1 : 0);
        }
    },

    onClockKeyDown: function (jsn) {
        // We are only interested in the clock key down event to track double-clicks
        // on the clock key to initiate the clock reset on standard double-click,
        // or launch the clock time set view on double-click-and-hold.
        console.log("Clock onKeyDown", jsn);
        const context = Utils.getProp(jsn, 'context', '');
        let command = 'api/clock';
        let params = 'start';
        let state = Utils.getProp(jsn, 'payload.state', 0);
        let desiredState = Utils.getProp(jsn, 'payload.userDesiredState', 0);
        let multiAction = Utils.getProp(jsn, 'payload.isInMultiAction', false);
        if (multiAction) {
            state = (desiredState == 0) ? 1 : 0;
        }
        if (state == 1) {
            params = 'stop';
        }
    },

    onClockKeyUp: function (jsn) {
        // Pull baseURL from globalSettings, 
        // Build the URL for the GET REST request to baseURL/{command}[/{param}]
        console.log("Clock onKeyUp", jsn);
        const context = Utils.getProp(jsn, 'context', '');
        let command = 'api/clock';
        let params = 'start';
        let state = Utils.getProp(jsn, 'payload.state', 0);
        let desiredState = Utils.getProp(jsn, 'payload.userDesiredState', 0);
        let multiAction = Utils.getProp(jsn, 'payload.isInMultiAction', false);
        if (multiAction) {
            state = (desiredState == 0) ? 1 : 0;
        }
        if (state == 1) {
            params = 'stop';
        }
        if (globalSettings.baseurl) {
            let url = globalSettings.baseurl + command + (params !== 0 ? '/' + params : '');
            console.log("url: " + url);
            fetch(url)
            .then(function (response) {
                if (!response.ok) {
                    // Show alert if the GET request failed
                    console.log("GET clock response: " + response.status);
                    $SD.api.showAlert(context);
                } else {
                    if (state == 0) {
                        $SD.api.setState(context, 1);
                    } else {
                        $SD.api.setState(context, 0);
                    }
                    console.log("GET clock response: " + response.status);
                }
            })
            .catch(function (err) {
                console.log('error: ' + err);
            });
        } else {
            console.log("No baseurl", globalSettings);
        }
    },

    onClockSendToPlugin: function (jsn) {
        /**
         * This is a message sent directly from the Property Inspector 
        **/ 

        const sdpi_collection = Utils.getProp(jsn, 'payload.sdpi_collection', {});
        const payload = Utils.getProp(jsn, 'payload', {});
        if (sdpi_collection.value && sdpi_collection.value !== undefined) {
            console.log('onSendToPlugin', { [sdpi_collection.key] : sdpi_collection.value });      
        } else {
            updateGlobalSettings(payload);
        }
    },
};

function scoreFace(canvas) {
    var ctx = canvas.getContext('2d');
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    function drawScoreKey(args) {
        console.log("drawScore:", args.home, args.guest, args.state);
        ctx.fillStyle = 'blue';
        ctx.fillRect(0, 0, 144, 72);
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 72, 144, 72);
        // Now draw the scores to the canvas
        ctx.fillStyle = 'white';
        ctx.fillText('Home: ' + args.home, 72, 36);
        ctx.fillText('Guest: ' + args.guest, 72, 108);
        if (args.state == true) {
            // add a darker overlay for the enabled state
            ctx.fillStyle = '#00000060';
            ctx.fillRect(0, 0, 144, 144);
            drawCircle(ctx, 35, 35, 15);
        }
    }
    function getImageData() {
        return canvas.toDataURL();
    }

    return {
        drawKey: drawScoreKey,
        getImageData: getImageData
    };
}

function clockFace(canvas) {
    var ctx = canvas.getContext('2d');
    ctx.font = '48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    function drawClockKey(args) {
        console.log("drawClock:", args.time, args.state);
        ctx.fillStyle = args.state === true ? 'red' : 'green';
        ctx.fillRect(0, 0, 144, 144);
        // Now draw the time to the canvas
        ctx.fillStyle = 'white';
        ctx.fillText(args.time, 72, 72);
    }
    function getImageData() {
        return canvas.toDataURL();
    }

    return {
        drawKey: drawClockKey,
        getImageData: getImageData
    };
}

function KeyFace(jsn) {
    var context = jsn.context,
    action = jsn.action,
    key = null,
    origContext = jsn.context,
    canvas = null;

    function createKey(settings) {
        console.log("KeyFace.createKey:", settings);
        canvas = document.createElement('canvas');
        canvas.width = 144;
        canvas.height = 144;
        if (settings.action === 'com.evanscreekdev.clock.action') {
            console.log("Creating clock face");
            key = new clockFace(canvas);
        } else if (settings.action === 'com.evanscreekdev.scoreboard.show.action') {
            console.log("Creating score face");
            key = new scoreFace(canvas);
        }
    }

    createKey(jsn);

    function drawKey(args) {
        key.drawKey(args);
        $SD.api.setImage(context, key.getImageData(), DestinationEnum.HARDWARE_AND_SOFTWARE, args.state ? 1 : 0);
    }

    return {
        drawKey: drawKey,
        action: action,
        context: context
    };
};
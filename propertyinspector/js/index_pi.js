/* global addDynamicStyles, $SD, Utils */
/* eslint-disable no-extra-boolean-cast */
/* eslint-disable no-else-return */

/**
 * This example contains a working Property Inspector, which already communicates
 * with the corresponding plugin throug settings and/or direct messages.
 * If you want to use other control-types, we recommend copy/paste these from the
 * PISamples demo-library, which already contains quite some example DOM elements
 */


/**
 * First we declare a global variable, which change all elements behaviour
 * globally. It installs the 'onchange' or 'oninput' event on the HTML controls and fiels.
 *
 * Change this, if you want interactive elements act on any modification (oninput),
 * or while their value changes 'onchange'.
 */

var onchangeevt = 'onchange'; // 'oninput';

/**
 * cache the static SDPI-WRAPPER, which contains all your HTML elements.
 * Please make sure, you put all HTML-elemenets into this wrapper, so they
 * are drawn properly using the integrated CSS.
 */

let sdpiWrapper = document.querySelector('.sdpi-wrapper');

/**
 * Since the Property Inspector is instantiated every time you select a key
 * in Stream Deck software, we can safely cache our settings in a global variable.
 */

let settings;
let globalSettings;
let action;

 /**
  * The 'connected' event is the first event sent to Property Inspector, after it's instance
  * is registered with Stream Deck software. It carries the current websocket, settings,
  * and other information about the current environmet in a JSON object.
  * You can use it to subscribe to events you want to use in your plugin.
  */

$SD.on('connected', (jsn) => {
    /**
     * The passed 'applicationInfo' object contains various information about your
     * computer, Stream Deck version and OS-settings (e.g. colors as set in your
     * OSes display preferences.)
     * We use this to inject some dynamic CSS values (saved in 'common_pi.js'), to allow
     * drawing proper highlight-colors or progressbars.
     */

    console.log("connected", jsn);
    addDynamicStyles($SD.applicationInfo.colors, 'connectSocket');
    $SD.api.getGlobalSettings($SD.uuid);
    action = Utils.getProp(jsn, 'actionInfo.action', '');

    var element = document.getElementById('playerPath');
    element.style.display = 'none';
    element = document.getElementById('playerTimeout');
    element.style.display = 'none';
    element = document.getElementById('sponsorPath');
    element.style.display = 'none';
    element = document.getElementById('sponsorTimeout');
    element.style.display = 'none';
    if (action === 'com.evanscreekdev.showplayer.action') {
        // Add select field for player to highlight
        document.getElementById('placeholder').innerHTML = `
        <div class='sdpi-item'>
            <div class='sdpi-item-label' id='playerid-label'>Select player</div>
            <select class='sdpi-item-value select' id='playerid'>
                <option id='no-players' value='0'>No players</option>
            </select>
        </div>
        `;
        var element = document.getElementById('playerPath');
        element.style.display = 'flex';
        element = document.getElementById('playerTimeout');
        element.style.display = 'flex';
    } else if (action === 'com.evanscreekdev.showsponsor.action') {
        // Add select field for sponsor to show
        document.getElementById('placeholder').innerHTML = `
        <div class='sdpi-item'>
            <div class='sdpi-item-label' id='sponsorid-label'>Select sponsor</div>
            <select class='sdpi-item-value select' id='sponsorid'>
                <option id='no-sponsors' value='0'>No sponsors</option>
            </select>
        </div>
        `;
        var element = document.getElementById('sponsorPath');
        element.style.display = 'flex';
        element = document.getElementById('sponsorTimeout');
        element.style.display = 'flex';
    } else if (action === 'com.evanscreekdev.virtualkey.action') {
        // Add select field for key type and input for parameters
        document.getElementById('placeholder').innerHTML = `
        <div class='sdpi-item'>
            <div class='sdpi-item-label' id='keytype-label'>Select key operation</div>
            <select class='sdpi-item-value select' id='keytype'>
                <optgroup label='Clock'>
                    <option value='api/clock/start'>Start clock</option>
                    <option value='api/clock/stop'>Stop clock</option>
                    <option value='api/clock/Reset'>Reset clock</option>
                    <option value='api/clock/Setup'>Set clock</option>
                    <option value='api/clock/Adjust'>Adjust clock</option>
                </optgroup>
                <optgroup label='Common'>
                    <option value='api/score/HomeScore'>Home score</option>
                    <option value='api/score/GuestScore'>Away score</option>
                    <option value='api/score/HomeTOL'>Home TOL</option>
                    <option value='api/score/GuestTOL'>Away TOL</option>
                    <option value='api/score/Quarter'>Period</option>
                </optgroup>
                <optgroup label='Football'>
                    <option value='api/score/Down'>Down</option>
                    <option value='api/score/ToGo'>Distance</option>
                    <option value='api/score/Timeout'>Timeout</option>
                    <option value='api/score/ChangePoss'>Possession</option>
                    <option value='api/score/Flag'>Flag</option>
                    <option value='rest/db/scoreboard'>Show/hide clock</option>
                </optgroup>
            </select>
        </div>
        <div class="sdpi-item">
            <div class="sdpi-item-label" id="keyparamsel-label">Key parameter</div>
            <select class="sdpi-item-value select" id="keyparamsel"/>
        </div>
        <div class="sdpi-item">
            <div class="sdpi-item-label" id="keyparam-label">Key parameter</div>
            <input class="sdpi-item-value" id="keyparam" type="number" value=""/>
        </div>
  `;
    }

    /**
     * Current settings are passed in the JSON node
     * {actionInfo: {
     *      payload: {
     *          settings: {
     *                  yoursetting: yourvalue,
     *                  otherthings: othervalues
     * ...
     * To conveniently read those settings, we have a little utility to read
     * arbitrary values from a JSON object, eg:
     *
     * const foundObject = Utils.getProp(JSON-OBJECT, 'path.to.target', defaultValueIfNotFound)
     */

    settings = Utils.getProp(jsn, 'actionInfo.payload.settings', false);
    if (settings) {
        console.log('settings:', settings);
        if (action === 'com.evanscreekdev.virtualkey.action') {
            // Add select field for key type and input for parameters
            // Setup listener for virtual keys key selection
            const keytypeselect = document.getElementById('keytype');
            keytypeselect.value = settings.command;
            updateKeyOptions();
            keytypeselect.onchange = function() {
                settings.command = keytypeselect.value;
                $SD.api.setSettings($SD.uuid, settings);
                updateKeyOptions();
            };
            // Setup listener for keyparamsel select field
            const paramselect = document.getElementById('keyparamsel');
            paramselect.onchange = function() {
                console.log("Virtual key params selected:", paramselect.value);
                settings.param = paramselect.value;
                $SD.api.setSettings($SD.uuid, settings);
            };
            // Setup listener for keyparam text field
            const param = document.getElementById('keyparam');
            param.onchange = function() {
                console.log("Virtual key param value:", param.value);
                settings.param = param.value;
                $SD.api.setSettings($SD.uuid, settings);
            };
            // var element = document.getElementById('keytype');
            // element.value = settings.command;
        } else {
            updateUI(settings);
        }
    }
});

/**
 * The 'didReceiveGlobalSettings' event can be used to receive global settings
 * previously saved by calling setGlobalSettings. SD sends this message after
 * you send the getGlobalSettings message.
 */

 $SD.on('didReceiveGlobalSettings', jsn => {
    globalSettings = Utils.getProp(jsn, 'payload.settings', false);
    processGlobalSettings(globalSettings);
});



/**
 * The 'sendToPropertyInspector' event can be used to send messages directly from your plugin
 * to the Property Inspector without saving these messages to the settings.
 */

$SD.on('sendToPropertyInspector', jsn => {
    const pl = jsn.payload;
    /**
     *  This is an example, how you could show an error to the user
     */
     if (pl.hasOwnProperty('error')) {
        sdpiWrapper.innerHTML = `<div class="sdpi-item">
            <details class="message caution">
            <summary class="${pl.hasOwnProperty('info') ? 'pointer' : ''}">${pl.error}</summary>
                ${pl.hasOwnProperty('info') ? pl.info : ''}
            </details>
        </div>`;
    } else {
        if (pl.hasOwnProperty('baseurl')) {
            processGlobalSettings(pl);
        }

        /**
         *
         * Do something with the data sent from the plugin
         * e.g. update some elements in the Property Inspector's UI.
         *
         */
    }
});

const processGlobalSettings = (receivedSettings) => {
    if (receivedSettings) {
        console.log('receivedSettings:', receivedSettings);
        if (receivedSettings.hasOwnProperty('baseurl')) {
            if (receivedSettings.baseurl.length > 12) {
                console.log("Collapse global settings fields.");
                var divGS = document.getElementById('globalSettings');
                divGS.removeAttribute('open');
            }
        }
        updateUI(receivedSettings);
        if (receivedSettings.hasOwnProperty('baseurl')) {
            // Call REST API to get players
            let url;
            if (action === 'com.evanscreekdev.clock.action') {
                if (!settings || !settings.hasOwnProperty('url')) {
                    if (!settings) {
                        settings = {};
                    }
                    settings.url = receivedSettings.baseurl + 'events';
                    $SD.api.setSettings($SD.uuid, settings);
                }
            } else if (action === 'com.evanscreekdev.showplayer.action') {
                url = `${receivedSettings.baseurl}rest/db/players`;
                fetch (url) 
                .then(function (response) {
                    return response.json();
                })
                .then(function (data) {
                    console.log("Players:", data);
                    if (data.length > 0) {
                        // Remove No players option
                        document.getElementById('no-players').remove();
                        // Add players to select field
                        let team = "";
                        const select = document.getElementById('playerid');
                        select.onchange = function() {
                            console.log("Player selected:", select.value);
                            settings.playerid = select.value;
                            $SD.api.setSettings($SD.uuid, settings);
                            // This will cause Stream Deck to send a didReceiveSettings message to the plugin
                            // in the plugin we will catch that message and set the title of the button to the
                            // selected player's jersey number, and set the button image to the player's image.
                        }
                        var optgroup = document.createElement('optgroup');
                        optgroup.label = team;
                        for (let i = 0; i < data.length; i++) {
                            if (data[i].school != team) {
                                if (optgroup.childElementCount > 0) {
                                    select.appendChild(optgroup);
                                    optgroup = document.createElement('optgroup');
                                }
                                team = data[i].school;
                                optgroup.label = team;
                            }
                            const player = data[i];
                            const option = document.createElement('option');
                            option.value = player.id;
                            // option.key = player.id;
                            option.text = player.jersey + " - " + player.name;
                            optgroup.appendChild(option);
                        }
                        if (optgroup.childElementCount > 0) {
                            select.appendChild(optgroup);
                        }
                        if (settings.hasOwnProperty('playerid')) {
                            select.value = settings.playerid;
                        }
                    }
                })
                .catch(function (err) {
                    console.log('error: ' + err);
                });
            } else if (action === 'com.evanscreekdev.showsponsor.action') {
                // Now Call REST API to get sponsors
                url = `${receivedSettings.baseurl}rest/db/sponsors`;
                fetch (url) 
                .then(function (response) {
                    return response.json();
                })
                .then(function (data) {
                    console.log("Sponsors:", data);
                    if (data.length > 0) {
                        // Remove No players option
                        document.getElementById('no-sponsors').remove();
                        // Add players to select field
                        let team = "";
                        const select = document.getElementById('sponsorid');
                        select.onchange = function() {
                            console.log("Sponsor selected:", select.value);
                            settings.sponsorid = select.value;
                            // TODO: We may need to load the settings with all other values to avoid losing those
                            $SD.api.setSettings($SD.uuid, settings);
                            // This will cause Stream Deck to send a didReceiveSettings message to the plugin
                            // in the plugin we will catch that message and set the title of the button to the
                            // selected sponsor's name, and set the button image to the player's image.
                        }
                        for (let i = 0; i < data.length; i++) {
                            const sponsor = data[i];
                            const option = document.createElement('option');
                            option.value = sponsor.id;
                            // option.key = sponsor.id;
                            option.text = sponsor.name;
                            select.appendChild(option);
                        }
                        if (settings.hasOwnProperty('sponsorid')) {
                            select.value = settings.sponsorid;
                        }
                    }
                })
                .catch(function (err) {
                    console.log('error: ' + err);
                });
            }
        };
    }
}

const updateKeyOptions = () => {
    const keytypeselect = document.getElementById('keytype');
    const keyparamselect = document.getElementById('keyparamsel');
    console.log("Virtual key selected:", keytypeselect.value);
    // settings.command = keytypeselect.value;
    // $SD.api.setSettings($SD.uuid, settings);
    // Hide keyparamsel and keyparam fields
    keyparamselect.style.display = 'none';
    document.getElementById('keyparam').style.display = 'none';
    // Remove all options from 'keyparamsel' select field
    while (keyparamselect.firstChild) {
        keyparamselect.removeChild(keyparamselect.firstChild);
    }
    // Add options to 'keyparamsel' select field based on selected virtual key
    if (keytypeselect.value === 'api/score/Quarter' || keytypeselect.value === 'api/score/HomeTOL' || 
            keytypeselect.value === 'api/score/GuestTOL' || keytypeselect.value === 'api/score/Down') {
        console.log("selected item was period, tol, or down");
        document.getElementById('keyparamsel').style.display = 'inline';
        // Add 'up', 'down', and 'reset' options to 'keyparamsel' select field
        var option = document.createElement('option');
        option.value = 'Up';
        option.text = 'Up';
        keyparamselect.appendChild(option);
        option = document.createElement('option');
        option.value = 'Down';
        option.text = 'Down';
        keyparamselect.appendChild(option);
        option = document.createElement('option');
        option.value = 'Reset';
        option.text = 'Reset';
        keyparamselect.appendChild(option);
        if (settings.hasOwnProperty('param')) {
            keyparamselect.value = settings.param;
        }
    } else if (keytypeselect.value === 'api/score/Timeout' || keytypeselect.value === 'api/score/ChangePoss') {
        console.log("selected item was timeout or possession");
        document.getElementById('keyparamsel').style.display = 'flex';
        // Add 'home', 'guest', and 'clear' options to 'keyparamsel' select field
        var option = document.createElement('option');
        option.value = 'Home';
        option.text = 'Home';
        keyparamselect.appendChild(option);
        option = document.createElement('option');
        option.value = 'Guest';
        option.text = 'Guest';
        keyparamselect.appendChild(option);
        option = document.createElement('option');
        option.value = 'Clear';
        option.text = 'Clear';
        keyparamselect.appendChild(option);
        if (settings.hasOwnProperty('param')) {
            keyparamselect.value = settings.param;
        }
    } else if (keytypeselect.value === 'api/score/HomeScore' || keytypeselect.value === 'api/score/GuestScore' ||
                keytypeselect.value === 'api/score/ToGo' || keytypeselect.value === 'api/clock/Setup' ||
                keytypeselect.value === 'api/clock/Reset' || keytypeselect.value === 'api/clock/Adjust' ||
                keytypeselect.value === 'rest/db/scoreboard') {
        console.log("Selected item was score, togo, setup, reset, or adjust");
        document.getElementById('keyparam').style.display = 'flex';
        if (settings.hasOwnProperty('param')) {
            document.getElementById('keyparam').value = settings.param;
        }
    }
};

const updateUI = (pl) => {
    Object.keys(pl).map(e => {
        if (e && e != '') {
            const foundElement = document.querySelector(`#${e}`);
            console.log(`searching for: #${e}`, 'found:', foundElement);
            if (foundElement && foundElement.type !== 'file') {
                foundElement.value = pl[e];
                const maxl = foundElement.getAttribute('maxlength') || 50;
                const labels = document.querySelectorAll(`[for='${foundElement.id}']`);
                if (labels.length) {
                    for (let x of labels) {
                        x.textContent = maxl ? `${foundElement.value.length}/${maxl}` : `${foundElement.value.length}`;
                    }
                }
            }
        }
   })
}

/**
 * Something in the PI changed:
 * either you clicked a button, dragged a slider or entered some text
 *
 * The 'piDataChanged' event is sent, if data-changes are detected.
 * The changed data are collected in a JSON structure
 *
 * It looks like this:
 *
 *  {
 *      checked: false
 *      group: false
 *      index: 0
 *      key: "mynameinput"
 *      selection: []
 *      value: "Elgato"
 *  }
 *
 * If you set an 'id' to an input-element, this will get the 'key' of this object.
 * The input's value will get the value.
 * There are other fields (e.g.
 *      - 'checked' if you clicked a checkbox
 *      - 'index', if you clicked an element within a group of other elements
 *      - 'selection', if the element allows multiple-selections
 * )
 *
 * Please note:
 * the template creates this object for the most common HTML input-controls.
 * This is a convenient way to start interacting with your plugin quickly.
 *
 */

$SD.on('piDataChanged', (returnValue) => {

    console.log('%c%s', 'color: white; background: blue}; font-size: 15px;', 'piDataChanged');
    console.log(returnValue);
    
    if (returnValue.key === 'clickme') {

        postMessage = (w) => {
            w.postMessage(
                Object.assign({}, $SD.applicationInfo.application, {action: $SD.actionInfo.action})
                ,'*');
        }

        if (!window.xtWindow || window.xtWindow.closed) {
            window.xtWindow  = window.open('../externalWindow.html', 'External Window');
            setTimeout(() => postMessage(window.xtWindow), 200);
        } else {
           postMessage(window.xtWindow);
        }

    } else if (returnValue.key === 'baseurl') {
        // Verify that we have a valid URL
        let url = returnValue.value;
        if (url.indexOf('http') === 0 && url.length > 12) {
            // See if we have a trailing slash
            if (url.lastIndexOf('/') === url.length - 1) {
                console.log('baseurl:', url);
                // See if we can get a response from the URL
                let response = fetch(url + 'rest/features').then(function (response) {
                    if (response.ok) {
                        // Save the new base url settings
                        // saveSettings(returnValue);
                        if (globalSettings.baseurl !== url) {
                            sendValueToPlugin(url, 'baseurl');
                        }
                    }
                });
            }
        }
    } else if (returnValue.key === 'hilightTimeout') {
        // Save the new hilightTimeout settings
        let hlto = returnValue.value;
        console.log('hilightTimeout:', hlto);
        // Save the new timeout settings
        if (globalSettings.hilightTimeout !== hlto) {
            sendValueToPlugin(hlto, 'hilightTimeout');
        }
    } else if (returnValue.key === 'adTimeout') {
        // Save the new adTimeout settings
        let adto = returnValue.value;
        console.log('adTimeout:', adto);
        // Save the new timeout settings
        if (globalSettings.adTimeout !== adto) {
            sendValueToPlugin(adto, 'adTimeout');
        }
    } else if (returnValue.key === 'playerImagePath') {
        // Save the new playerImagePath settings
        let imgPath = returnValue.value;
        console.log('playerImagePath:', imgPath);
        // Save the new timeout settings
        if (globalSettings.playerImagePath !== imgPath) {
            sendValueToPlugin(imgPath, 'playerImagePath');
        }
    } else if (returnValue.key === 'sponsorImagePath') {
        // Save the new sponsorImagePath settings
        let imgPath = returnValue.value;
        console.log('sponsorImagePath:', imgPath);
        // Save the new timeout settings
        if (globalSettings.sponsorImagePath !== imgPath) {
            sendValueToPlugin(imgPath, 'sponsorImagePath');
        }
    } else {
        console.log("Data changed: ", returnValue);
        /* SAVE THE VALUE TO SETTINGS */
        saveSettings(returnValue);

        /* SEND THE VALUES TO PLUGIN */
        sendValueToPlugin(returnValue, 'sdpi_collection');
    }
});

/**
 * Below are a bunch of helpers to make your DOM interactive
 * The will cover changes of the most common elements in your DOM
 * and send their value to the plugin on a change.
 * To accomplish this, the 'handleSdpiItemChange' method tries to find the
 * nearest element 'id' and the corresponding value of the element(along with
 * some other information you might need) . It then puts everything in a
 * 'sdpi_collection', where the 'id' will get the 'key' and the 'value' will get the 'value'.
 *
 * In the plugin you just need to listen for 'sdpi_collection' in the sent JSON.payload
 * and save the values you need in your settings (or StreamDeck-settings for persistence).
 *
 * In this template those key/value pairs are saved automatically persistently to StreamDeck.
 * Open the console in the remote debugger to inspect what's getting saved.
 *
 */

 function saveSettings(sdpi_collection) {

    if (typeof sdpi_collection !== 'object') return;

    if (sdpi_collection.hasOwnProperty('key') && sdpi_collection.key != '') {
        if (sdpi_collection.value && sdpi_collection.value !== undefined) {
            console.log(sdpi_collection.key, " => ", sdpi_collection.value);
            settings[sdpi_collection.key] = sdpi_collection.value;
            console.log('setSettings....', settings);
            $SD.api.setSettings($SD.uuid, settings);
        }
    }
 }

 /**
  * 'sendValueToPlugin' is a wrapper to send some values to the plugin
  *
  * It is called with a value and the name of a property:
  *
  * sendValueToPlugin(<any value>), 'key-property')
  *
  * where 'key-property' is the property you listen for in your plugin's
  * 'sendToPlugin' events payload.
  *
  */

 function sendValueToPlugin(value, prop) {
    console.log("sendValueToPlugin", value, prop);
    if ($SD.connection && $SD.connection.readyState === 1) {
        const json = {
            action: $SD.actionInfo['action'],
            event: 'sendToPlugin',
            context: $SD.uuid,
            payload: {
                [prop]: value,
                targetContext: $SD.actionInfo['context']
            }
        };

        $SD.connection.send(JSON.stringify(json));
    }
}

/** CREATE INTERACTIVE HTML-DOM
 * The 'prepareDOMElements' helper is called, to install events on all kinds of
 * elements (as seen e.g. in PISamples)
 * Elements can get clicked or act on their 'change' or 'input' event. (see at the top
 * of this file)
 * Messages are then processed using the 'handleSdpiItemChange' method below.
 * If you use common elements, you don't need to touch these helpers. Just take care
 * setting an 'id' on the element's input-control from which you want to get value(s).
 * These helpers allow you to quickly start experimenting and exchanging values with
 * your plugin.
 */

function prepareDOMElements(baseElement) {
    baseElement = baseElement || document;
    Array.from(baseElement.querySelectorAll('.sdpi-item-value')).forEach(
        (el, i) => {
            const elementsToClick = [
                'BUTTON',
                'OL',
                'UL',
                'TABLE',
                'METER',
                'PROGRESS',
                'CANVAS'
            ].includes(el.tagName);
            const evt = elementsToClick ? 'onclick' : onchangeevt || 'onchange';

            /** Look for <input><span> combinations, where we consider the span as label for the input
             * we don't use `labels` for that, because a range could have 2 labels.
             */
            const inputGroup = el.querySelectorAll('input + span');
            if (inputGroup.length === 2) {
                const offs = inputGroup[0].tagName === 'INPUT' ? 1 : 0;
                inputGroup[offs].textContent = inputGroup[1 - offs].value;
                inputGroup[1 - offs]['oninput'] = function() {
                    inputGroup[offs].textContent = inputGroup[1 - offs].value;
                };
            }
            /** We look for elements which have an 'clickable' attribute
             * we use these e.g. on an 'inputGroup' (<span><input type="range"><span>) to adjust the value of
             * the corresponding range-control
             */
            Array.from(el.querySelectorAll('.clickable')).forEach(
                (subel, subi) => {
                    subel['onclick'] = function(e) {
                        handleSdpiItemChange(e.target, subi);
                    };
                }
            );
            /** Just in case the found HTML element already has an input or change - event attached,
             * we clone it, and call it in the callback, right before the freshly attached event
            */
            const cloneEvt = el[evt];
            el[evt] = function(e) {
                if (cloneEvt) cloneEvt();
                handleSdpiItemChange(e.target, i);
            };
        }
    );

    /**
     * You could add a 'label' to a textares, e.g. to show the number of charactes already typed
     * or contained in the textarea. This helper updates this label for you.
     */
    baseElement.querySelectorAll('textarea').forEach((e) => {
        const maxl = e.getAttribute('maxlength');
        e.targets = baseElement.querySelectorAll(`[for='${e.id}']`);
        if (e.targets.length) {
            let fn = () => {
                for (let x of e.targets) {
                    x.textContent = maxl ? `${e.value.length}/${maxl}` : `${e.value.length}`;
                }
            };
            fn();
            e.onkeyup = fn;
        }
    });

    baseElement.querySelectorAll('[data-open-url').forEach(e => {
        const value = e.getAttribute('data-open-url');
        if (value) {
            e.onclick = () => {
                let path;
                if (value.indexOf('http') !== 0) {
                    path = document.location.href.split('/');
                    path.pop();
                    path.push(value.split('/').pop());
                    path = path.join('/');
                } else {
                    path = value;
                }
                $SD.api.openUrl($SD.uuid, path);
            };
        } else {
            console.log(`${value} is not a supported url`);
        }
    });
}

function handleSdpiItemChange(e, idx) {

    /** Following items are containers, so we won't handle clicks on them */

    if (['OL', 'UL', 'TABLE'].includes(e.tagName)) {
        return;
    }

    /** SPANS are used inside a control as 'labels'
     * If a SPAN element calls this function, it has a class of 'clickable' set and is thereby handled as
     * clickable label.
     */

    if (e.tagName === 'SPAN') {
        const inp = e.parentNode.querySelector('input');
        var tmpValue;

        // if there's no attribute set for the span, try to see, if there's a value in the textContent
        // and use it as value
        if (!e.hasAttribute('value')) {
               tmpValue = Number(e.textContent);
            if (typeof tmpValue === 'number' && tmpValue !== null) {
                e.setAttribute('value', 0+tmpValue); // this is ugly, but setting a value of 0 on a span doesn't do anything
                e.value = tmpValue;
            }
        } else {
            tmpValue = Number(e.getAttribute('value'));
        }

        if (inp && tmpValue !== undefined) {
            inp.value = tmpValue;
        } else return;
    }

    const selectedElements = [];
    const isList = ['LI', 'OL', 'UL', 'DL', 'TD'].includes(e.tagName);
    const sdpiItem = e.closest('.sdpi-item');
    const sdpiItemGroup = e.closest('.sdpi-item-group');
    let sdpiItemChildren = isList
        ? sdpiItem.querySelectorAll(e.tagName === 'LI' ? 'li' : 'td')
        : sdpiItem.querySelectorAll('.sdpi-item-child > input');

    if (isList) {
        const siv = e.closest('.sdpi-item-value');
        if (!siv.classList.contains('multi-select')) {
            for (let x of sdpiItemChildren) x.classList.remove('selected');
        }
        if (!siv.classList.contains('no-select')) {
            e.classList.toggle('selected');
        }
    }

    if (sdpiItemChildren.length && ['radio','checkbox'].includes(sdpiItemChildren[0].type)) {
        e.setAttribute('_value', e.checked); //'_value' has priority over .value
    }
    if (sdpiItemGroup && !sdpiItemChildren.length) {
        for (let x of ['input', 'meter', 'progress']) {
            sdpiItemChildren = sdpiItemGroup.querySelectorAll(x);
            if (sdpiItemChildren.length) break;
        }
    }

    if (e.selectedIndex !== undefined) {
        if (e.tagName === 'SELECT') {
            sdpiItemChildren.forEach((ec, i) => {
                selectedElements.push({ [ec.id]: ec.value });
            });
        }
        idx = e.selectedIndex;
    } else {
        sdpiItemChildren.forEach((ec, i) => {
            if (ec.classList.contains('selected')) {
                selectedElements.push(ec.textContent);
            }
            if (ec === e) {
                idx = i;
                selectedElements.push(ec.value);
            }
        });
    }

    const returnValue = {
        key: e.id && e.id.charAt(0) !== '_' ? e.id : sdpiItem.id,
        value: isList
            ? e.textContent
            : e.hasAttribute('_value')
            ? e.getAttribute('_value')
            : e.value
            ? e.type === 'file'
                ? decodeURIComponent(e.value.replace(/^C:\\fakepath\\/, ''))
                : e.value
            : e.getAttribute('value'),
        group: sdpiItemGroup ? sdpiItemGroup.id : false,
        index: idx,
        selection: selectedElements,
        checked: e.checked
    };

    /** Just simulate the original file-selector:
     * If there's an element of class '.sdpi-file-info'
     * show the filename there
     */
    if (e.type === 'file') {
        const info = sdpiItem.querySelector('.sdpi-file-info');
        if (info) {
            const s = returnValue.value.split('/').pop();
            info.textContent =                s.length > 28
                    ? s.substr(0, 10)
                      + '...'
                      + s.substr(s.length - 10, s.length)
                    : s;
        }
    }

    $SD.emit('piDataChanged', returnValue);
}

/**
 * This is a quick and simple way to localize elements and labels in the Property
 * Inspector's UI without touching their values.
 * It uses a quick 'lox()' function, which reads the strings from a global
 * variable 'localizedStrings' (in 'common.js')
 */

// eslint-disable-next-line no-unused-vars
function localizeUI() {
    const el = document.querySelector('.sdpi-wrapper') || document;
    let t;
    Array.from(el.querySelectorAll('sdpi-item-label')).forEach(e => {
        t = e.textContent.lox();
        if (e !== t) {
            e.innerHTML = e.innerHTML.replace(e.textContent, t);
        }
    });
    Array.from(el.querySelectorAll('*:not(script)')).forEach(e => {
        if (
            e.childNodes
            && e.childNodes.length > 0
            && e.childNodes[0].nodeValue
            && typeof e.childNodes[0].nodeValue === 'string'
        ) {
            t = e.childNodes[0].nodeValue.lox();
            if (e.childNodes[0].nodeValue !== t) {
                e.childNodes[0].nodeValue = t;
            }
        }
    });
}

/**
 *
 * Some more (de-) initialization helpers
 *
 */

document.addEventListener('DOMContentLoaded', function() {
    document.body.classList.add(navigator.userAgent.includes("Mac") ? 'mac' : 'win');
    prepareDOMElements();
    $SD.on('localizationLoaded', (language) => {
        localizeUI();
    });
});

/** the beforeunload event is fired, right before the PI will remove all nodes */
window.addEventListener('beforeunload', function(e) {
    e.preventDefault();
    sendValueToPlugin('propertyInspectorWillDisappear', 'property_inspector');
    // Don't set a returnValue to the event, otherwise Chromium with throw an error.  // e.returnValue = '';
});

function gotCallbackFromWindow(parameter) {
    console.log(parameter);
}

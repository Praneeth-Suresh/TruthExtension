import axios from "axios";

const VideoTitle = document.getElementById("VideoTitle");

window.onload = function() {
    chrome.storage.local.get("title", (result) => {
        console.log("Retrieved:", result.title);
        VideoTitle.innerHTML = result.title;
    });
};

// Listen for message to recieve the video title
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "ChangeTitle") {
        chrome.storage.local.get("title", (result) => {
            console.log("Retrieved:", result.title);
            VideoTitle.innerHTML = result.title;
        });
    }
});

// Tell the content script when the extension is active

var ExtensionOpen;

var intervalPopup = setInterval(() => {
    var views = chrome.extension.getViews({ type: "popup" });

    // Check if the extension is open or closed by checking if any tabs are identified
    if (views.length === 0) {
        ExtensionOpen = false;
    } else {
        ExtensionOpen = true;
    }
}, 250);


//********************************************************* */
// The following makes request to backend server
// axios.get("http://127.0.0.1:8000/api/errors")
// .then(response => {
//     sendResponse(response.data);
//     console.log(response.data);
// })
// .catch(error => sendResponse({ error: error.message }));

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fetchErrors") {
        console.log("Retrieving information");

        fetch("http://127.0.0.1:8000/api/errors", {
            method: 'GET',  // Use GET to check session validity
            headers: {
                'Content-Type': 'application/json'
            },
        })
        .then(response => {
            sendResponse(response.data);
            console.log(response.data);            
        })
        .catch(error => sendResponse({ error: error.message }))


        return true; // Keeps the response asynchronous
    }
});


//********************************************************* */
// Below is the logic to process the timestamps obtained from the content script

// Function to format time from seconds into MM:SS or HH:MM:SS
function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) {
        return "00:00";
    }

    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const paddedMins = String(mins).padStart(2, '0');
    const paddedSecs = String(secs).padStart(2, '0');

    if (hrs > 0) {
        const paddedHrs = String(hrs).padStart(2, '0');
        return `${paddedHrs}:${paddedMins}:${paddedSecs}`;
    } else {
        return `${paddedMins}:${paddedSecs}`;
    }
}

var currentTime = 0;

// Wait for the DOM to be fully loaded before trying to access elements
document.addEventListener('DOMContentLoaded', () => {
    const timeDisplayElement = document.getElementById('currentTimeDisplay');

    // Listen for messages from the extension runtime (sent by the content script)
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        // Check if the message is the one we're looking for
        if (request.type === "UPDATE_TIME") {
            currentTime = request.currentTime;
            // Format the time and update the display element
            timeDisplayElement.textContent = formatTime(currentTime);
        }
    });
});



//********************************************************* */
// Below is the code to handle the marking of timestamps
var button = document.getElementById("stamp");
var marked = document.getElementById("marked");
var instruction = document.getElementById("instruction");
var box_no = -1;

button.addEventListener('click', function() {
    if ( button.innerHTML === "Mark" ) {
        // Update the display to show 
        button.innerHTML = "Submit";
        button.style.color = "red";

        box_no += 1;

        marked.innerHTML += `
        <div>
        The start time is <span id="${box_no}StartTime"></span>
        The reason this is erroneous is because <input type="text" id="reason" name="reason" placeholder="Statement ..."><span id="${box_no}res_pres"></span>
        </div><br>`;
        var StartTime = document.getElementById(`${box_no}StartTime`);
        StartTime.textContent = formatTime(currentTime);
        instruction.innerHTML = "Press <b>Submit</b> submit the statement about why this is disinformation."

        // Send a message to the content script to pause the video
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const activeTab = tabs[0];
            if (activeTab && activeTab.id) {
                // Send a message to the content script in the active tab
                chrome.tabs.sendMessage(activeTab.id, {
                type: "PAUSE_VIDEO" // Define a message type
                }, (response) => {
                // Optional: Handle response from content script if needed
                if (chrome.runtime.lastError) {
                    console.error("Error sending message:", chrome.runtime.lastError.message);
                } else {
                    console.log("Message sent to content script:", response);
                }
                });
            } else {
                console.warn("Could not find active tab.");
            }
        });

    } else if ( button.innerHTML === "Submit" ) {
        button.innerHTML = "Mark";
        button.style.color = "green";
        instruction.innerHTML = "Press <b>Mark</b> to mark out a segment of the video you think is misinformation";

        // This removes the input box and converts it to text
        var statement = document.getElementById("reason");
        var reason = statement.value;
        console.log(reason);
        statement.readOnly = true;
        statement.disabled = true;
    }
  });
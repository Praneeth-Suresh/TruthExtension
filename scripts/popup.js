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
// function getErrors() {
//     axios
//     .get("http://127.0.0.1:8000/api/errors")
//     .then((res) => console.log("This is recieved from REST API", res.data))
//     .catch((err) => console.log("Error ", err));
// }

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fetchErrors") {
        console.log("Retrieving information");
        axios.get("http://127.0.0.1:8000/api/errors")
            .then(response => {
                sendResponse(response.data);
                console.log(response.data);
            })
            .catch(error => sendResponse({ error: error.message }));

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
button = document.getElementById("stamp");
marked = document.getElementById("marked");
instruction = document.getElementById("instruction");
var box_no = -1;

button.addEventListener('click', function() {
    if ( button.innerHTML === "Mark" ) {
        // Update the display to show 
        button.innerHTML = "Stop";
        button.style.color = "red";

        box_no += 1;

        marked.innerHTML += `
        <div>
        The start time is <p id="${box_no}StartTime"></p>
        The end time is <input type="text" id="endTime" name="endTime" placeholder="hh:mm:ss">
        </div><br>`;
        StartTime = document.getElementById(`${box_no}StartTime`);
        StartTime.textContent = formatTime(currentTime);
        instruction.innerHTML = "Press <b>Stop</b> to signal the end of the segment of the video you think is misinformation"
    } else if ( button.innerHTML === "Stop" ) {
        button.innerHTML = "Mark";
        button.style.color = "green";
        instruction.innerHTML = "Press <b>Mark</b> to start marking out a segment of the video you think is misinformation";
    }
  });
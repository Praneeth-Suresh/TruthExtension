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


intervalPopup = setInterval(() => {
    var views = chrome.extension.getViews({ type: "popup" });

    // Check if the extension is open or closed by checking if any tabs are identified
    if (views.length === 0) {
        ExtensionOpen = false;
    } else {
        ExtensionOpen = true;
    }
}, 250);



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

// Wait for the DOM to be fully loaded before trying to access elements
document.addEventListener('DOMContentLoaded', () => {
    const timeDisplayElement = document.getElementById('currentTimeDisplay');

    // Listen for messages from the extension runtime (sent by the content script)
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        // Check if the message is the one we're looking for
        if (request.type === "UPDATE_TIME") {
            const currentTime = request.currentTime;
            // Format the time and update the display element
            timeDisplayElement.textContent = formatTime(currentTime);
        }
    });
});



//********************************************************* */
// Below is the code to handle the marking of timestamps
button = document.getElementById("stamp");

button.addEventListener('click', function() {
    if ( button.innerHTML === "Mark" ) {
        button.innerHTML = "Stop";
        button.style.color = "red";
    } else if ( button.innerHTML === "Stop" ) {
        button.innerHTML = "Mark";
        button.style.color = "green";
    }
  });
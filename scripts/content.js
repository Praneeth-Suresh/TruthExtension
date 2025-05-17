
// This function ensures the code waits for the page to load before searching for the title
function waitForElements(selector, callback) {
    var observer = new MutationObserver((mutations, obs) => {
        var elements = document.querySelectorAll(selector);
        if (elements.length) {
            var elements = document.querySelectorAll(selector);
            callback(elements);
            obs.disconnect(); // Stop observing once found
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

// This code waits for the titles to appear on the page before running the popup script.
waitForElements("h1.ytd-watch-metadata yt-formatted-string", (videoTitles) => {
    console.log("Found video titles:", videoTitles);
    var VideoName;
    videoTitles.forEach(title => {
        VideoName = title.innerText;
    });
    console.log("First video loaded", VideoName);
    chrome.runtime.sendMessage({ action: "ChangeTitle"});
    chrome.storage.local.set({ title: VideoName });    
});

// This code is used to retrieve data from the database
// This code is run every time a new page is loaded
function GetStamps(url) {
    
}

// The below code is required to listen for URL changes when clicking a new video.
// This is because YouTube uses AJAX to load new videos without refreshing the page.
// This code listens for changes in the URL and runs the popup script again when a new video is detected.
var lastUrl = location.href;

function checkUrlChange() {
    if (location.href !== lastUrl) {
        console.log("YouTube video changed!");
        lastUrl = location.href;
        runPopupScript();
    }
}

// Function to run when a new video is detected
// function runPopupScript() {
//     waitForElements("h1.ytd-watch-metadata yt-formatted-string", (videoTitles) => {
//         console.log("Found video titles:", videoTitles);
//         videoTitles.forEach(title => console.log(title.innerText));
//     });
// }

// Listen for history changes
var observer = new MutationObserver(checkUrlChange);
observer.observe(document.body, { childList: true, subtree: true });

window.addEventListener('popstate', checkUrlChange);

// Function to run when a new video is detected
function runPopupScript() {
    setTimeout(() => {
        waitForElements("h1.ytd-watch-metadata yt-formatted-string", (videoTitles) => {
            console.log("Found video titles:", videoTitles);
            var VideoName;
            videoTitles.forEach(title => {
                VideoName = title.innerText;
            });
            console.log(VideoName);
            chrome.runtime.sendMessage({ action: "ChangeTitle"});
            chrome.storage.local.set({ title: VideoName }); 
        });
    }, 5000); // Short delay allows title to update
}



//********************************************************************** */
// The below code is used to retrieve the time elapsed for the video
// and contantly push it to the extension

let intervalId = null;

// Function to find the video element and send time updates
function startTimeUpdates() {
    // Find the main video element on the page
    const video = document.querySelector('video');

    if (video) {
        console.log("Content script found video element. Starting time updates.");

        // Clear any existing interval to avoid duplicates if the script runs again
        if (intervalId) {
            clearInterval(intervalId);
        }

         intervalId = setInterval(() => {
            const currentVideo = document.querySelector('video');
            if (currentVideo) {
                chrome.runtime.sendMessage({
                    type: "UPDATE_TIME",
                    currentTime: currentVideo.currentTime
                }).catch(error => {});
            } else {
                // If video element is no longer found, stop updates
                console.log("Video element not found. Stopping time updates.");
                clearInterval(intervalId);
                intervalId = null;
            }
         }, 250);

    } else {
        console.log("Content script could not find video element.");

        setTimeout(startTimeUpdates, 1000); // Try again after 1 second
    }
}

// Start trying to find the video when the script is injected
startTimeUpdates();



//****************************************** */
// The below code is used to display a message indicate misleading content

// This is hardcoded for demonstration. In a real extension, you'd likely
// load this data from extension storage or an external source based on the video ID.
const misleadingClaims = [];

console.log("Starting to retieve from REST API ...")

chrome.runtime.sendMessage({ action: "fetchErrors" }, (response) => {
    console.log("Received data:", response);

    for (let i = 0; i < response.length; i++ ) {
        misleadingClaims[i] = {
            time: response[i]["time"], // Timestamp in seconds 
            claimSummary: response[i]["claimSummary"],
            learnMoreUrl: response[i]["errorMetrics"]["URL"]
        }
    }
});

// function getErrors() {
//     axios
//     .get("http://127.0.0.1:8000/api/errors")
//     .then((res) => console.log("This is recieved from REST API", res.data))
//     .catch((err) => console.log("Error ", err));
// }

// --- CSS for the injected popup ---
const popupCss = `
  .yt-fact-check-popup {
    position: absolute;
    bottom: 50px; /* Adjust vertical position above controls */
    left: 20px; /* Adjust horizontal position */
    background-color: rgba(240, 180, 0, 0.95); /* Warning-like color */
    color: #333;
    padding: 10px 15px;
    border-radius: 5px;
    font-family: Roboto, Arial, sans-serif;
    font-size: 14px;
    max-width: 350px; /* Limit width */
    z-index: 2147483647; /* Ensure it's above YouTube's UI (max z-index) */
    opacity: 0; /* Start hidden */
    transition: opacity 0.5s ease-in-out; /* Smooth fade effect */
    pointer-events: none; /* Allow clicks/interactions to pass through when hidden */
  }

  .yt-fact-check-popup.visible {
    opacity: 1;
    pointer-events: auto; /* Enable interactions when visible */
  }

  .yt-fact-check-popup p {
    margin: 0 0 8px 0;
    color: #333; /* Ensure paragraph color is readable */
    line-height: 1.4;
  }

  .yt-fact-check-popup a {
    color: #0000ee; /* Standard link color */
    text-decoration: underline;
    margin-right: 10px;
  }

  .yt-fact-check-popup .close-btn {
    color: #555; /* Darker color for visibility */
    float: right; /* Position close button to the right */
    font-size: 18px;
    font-weight: bold;
    cursor: pointer;
    margin-left: 10px;
    text-decoration: none; /* No underline for close button */
  }

   .yt-fact-check-popup .close-btn:hover {
       color: #000;
   }
`;

// --- State Variables ---
let videoElement = null;
let popupElement = null;
let playerContainer = null; // The div containing the video player
let triggeredTimestamps = new Set(); // Keep track of claims already shown for the current video
let lastProcessedTime = 0; // To detect seeks backward

// --- Helper Functions ---

// Injects the CSS into the page head
function injectCss() {
    const style = document.createElement('style');
    style.type = 'text/css';
    style.appendChild(document.createTextNode(popupCss));
    (document.head || document.documentElement).appendChild(style);
    console.log("Fact Check Extension: CSS injected.");
}

// Creates and appends the popup element to the player container
function createPopup(container) {
    const popup = document.createElement('div');
    popup.classList.add('yt-fact-check-popup');
    popup.innerHTML = `
        <a href="#" class="close-btn">&times;</a>
        <p class="claim-summary"></p>
        <a href="#" class="learn-more-link" target="_blank" rel="noopener noreferrer">Learn More</a>
    `;
    container.appendChild(popup);

    // Add event listener to the close button
    popup.querySelector('.close-btn').addEventListener('click', (e) => {
        e.preventDefault(); // Prevent default link behavior
        hidePopup();
        // Optional: Store in chrome.storage.local that this claim was dismissed
        // for this video ID so it doesn't show again. Requires getting video ID.
    });

    console.log("Fact Check Extension: Popup element created.");
    return popup;
}

// Shows the popup with specific claim data
function showPopup(claim) {
    if (!popupElement) {
        console.warn("Fact Check Extension: Popup element not found when trying to show.");
        return;
    }
    popupElement.querySelector('.claim-summary').textContent = claim.claimSummary;
    const learnMoreLink = popupElement.querySelector('.learn-more-link');
    learnMoreLink.href = claim.learnMoreUrl;
    learnMoreLink.style.display = claim.learnMoreUrl ? '' : 'none'; // Hide link if no URL
    popupElement.classList.add('visible');
    console.log(`Fact Check Extension: Showing popup for timestamp ${claim.time}s.`);

    // Optional: Auto-hide after a few seconds
    // setTimeout(hidePopup, 10000); // Hide after 10 seconds
}

// Hides the popup
function hidePopup() {
    if (popupElement) {
        popupElement.classList.remove('visible');
        console.log("Fact Check Extension: Hiding popup.");
    }
}

// --- Main Logic: Finding Video and Monitoring Time ---

// Handles the 'timeupdate' event from the video element
function handleTimeUpdate() {
    if (!videoElement || videoElement.paused || videoElement.seeking) {
        // Don't check time if video is paused or seeking
        return;
    }

    const currentTime = videoElement.currentTime;

    // Detect significant backward seek (more than 1 second jump back)
    if (currentTime < lastProcessedTime - 1) {
        console.log("Fact Check Extension: Backward seek detected, resetting triggered timestamps.");
        triggeredTimestamps.clear(); // User seeks back, allow claims to show again
    }
    lastProcessedTime = currentTime;

    // Check if current time is at or past any untriggered claim timestamps
    misleadingClaims.forEach(claim => {
        // Use a small buffer (e.g., 0.5s) just in case the timeupdate event skips the exact second
        if (currentTime >= claim.time && currentTime < claim.time + 0.5 && !triggeredTimestamps.has(claim.time)) {
            showPopup(claim);
            triggeredTimestamps.add(claim.time); // Mark as triggered for this video
        }
    });
}

// Function to find the video player and set up listeners
function setupVideoPlayer() {
    // Find the main video player container first, it's more stable than the video element itself
    playerContainer = document.querySelector('.ytd-player'); // Common class for the player
    if (!playerContainer) {
        // If player container isn't found, try again later
        console.log("Fact Check Extension: Player container not found yet.");
        return;
    }

    // Now find the video element within the container
    const currentVideo = playerContainer.querySelector('video');
    if (!currentVideo) {
         // Video element might not be available yet (e.g., ads, loading)
         hidePopup(); // Ensure popup is hidden if video isn't present
         if (videoElement) { // Clean up old listeners if video disappeared
             videoElement.removeEventListener('timeupdate', handleTimeUpdate);
             videoElement = null;
              console.log("Fact Check Extension: Video element disappeared, cleaned up listeners.");
         }
         return;
    }

    // If we found a video element and it's a *new* one (different from what we're tracking)
    if (videoElement !== currentVideo) {
        console.log("Fact Check Extension: Found new video element.");
        // Clean up listeners from the previous video element if it exists
        if (videoElement) {
            videoElement.removeEventListener('timeupdate', handleTimeUpdate);
        }

        // Set the new video element
        videoElement = currentVideo;

        // Reset state for the new video
        triggeredTimestamps.clear();
        lastProcessedTime = 0;
        hidePopup(); // Hide popup for the new video

        // Add the timeupdate listener to the new video element
        videoElement.addEventListener('timeupdate', handleTimeUpdate);
        console.log("Fact Check Extension: Added timeupdate listener to new video element.");

         // Create and append the popup element if it doesn't exist or got removed
        if (!popupElement || !playerContainer.contains(popupElement)) {
             if (popupElement && popupElement.parentNode) {
                 popupElement.parentNode.removeChild(popupElement); // Remove old one if orphaned
             }
             popupElement = createPopup(playerContainer);
             console.log("Fact Check Extension: Popup element created/re-created.");
         }

         // Optional: Listen for video load to ensure claims are checked from the start
         // videoElement.addEventListener('loadeddata', () => {
         //     console.log("Fact Check Extension: Video loaded data.");
         //     // Check for claims starting from time 0 if needed
         //     // This might re-trigger if user seeks to start, handled by triggeredTimestamps
         // });

    } else {
        // Video element is the same, just ensure popup is still a child if playerContainer was re-rendered
         if (popupElement && !playerContainer.contains(popupElement)) {
             if (popupElement.parentNode) {
                 popupElement.parentNode.removeChild(popupElement); // Remove old one
             }
             popupElement = createPopup(playerContainer);
             console.log("Fact Check Extension: Popup element re-parented.");
         }
    }
}


// Use a MutationObserver to watch for changes in the DOM, specifically
// for the video player container to appear or disappear (handling SPA navigation)
const Vidobserver = new MutationObserver((mutations, obs) => {
    // We don't need to check every mutation, just periodically check for the player
     // This is more efficient than trying to infer player changes from specific mutations.
     // A small timeout prevents checking too frequently during rapid DOM changes.
     if (!obs.__isScheduled) {
         obs.__isScheduled = true;
         setTimeout(() => {
             setupVideoPlayer();
             obs.__isScheduled = false;
         }, 200); // Check every 200ms while mutations are happening
     }
});

// Start observing the body for changes. Watching the body with subtree: true
// allows us to detect the player container appearing anywhere.
injectCss(); // Inject CSS immediately when the script starts
Vidobserver.observe(document.body, { childList: true, subtree: true });

// Also, perform an initial check in case the player is already in the DOM
// when the script first loads (e.g., on a full page navigation).
// Add a slight delay to allow the page to render initially.
setTimeout(setupVideoPlayer, 500);


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Fact Check Extension: Message received in content script:", request.type);

    if (request.type === "PAUSE_VIDEO") {
        if (videoElement && !videoElement.paused) {
            console.log("Fact Check Extension: Pausing video...");
            videoElement.pause(); // <-- This is the core pause command
            sendResponse({ status: "paused" }); // Acknowledge the message
        } else if (videoElement && videoElement.paused) {
             console.log("Fact Check Extension: Video is already paused.");
             sendResponse({ status: "already_paused" });
        } else {
            console.warn("Fact Check Extension: Cannot pause, video element not found.");
            sendResponse({ status: "video_not_found" });
        }
         return true; // Required if you might send a response asynchronously
    }

    // // This is for future development purposes
    // // You can add other message types here, like "PLAY_VIDEO"
    // if (request.type === "PLAY_VIDEO") {
    //     if (videoElement && videoElement.paused) {
    //         console.log("Fact Check Extension: Playing video...");
    //         videoElement.play(); // <-- Command to play
    //         sendResponse({ status: "played" });
    //     } else if (videoElement && !videoElement.paused) {
    //             console.log("Fact Check Extension: Video is already playing.");
    //             sendResponse({ status: "already_playing" });
    //     } else {
    //         console.warn("Fact Check Extension: Cannot play, video element not found.");
    //         sendResponse({ status: "video_not_found" });
    //     }
    //     return true;
    // }
});
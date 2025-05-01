
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
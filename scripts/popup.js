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
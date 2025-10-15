function onAnchorClick(event) {
  chrome.tabs.create({ url: 'http://www.radiobells.com/?utm_campaign=chromeextension&utm_source=googlewebstore&utm_medium=toolbar' });
  return false;
}

chrome.action.onClicked.addListener(onAnchorClick);



(function () {
  try {
    var t = localStorage.getItem('omne-theme');
    document.documentElement.dataset.theme = t === 'light' ? 'light' : 'dark';
  } catch (_) {
    document.documentElement.dataset.theme = 'dark';
  }
})();

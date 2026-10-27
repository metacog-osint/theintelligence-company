// The Intelligence Company hub: time settings and the "Updated" date. No dependencies.
(function () {
  var holder = document.getElementById("time-settings");
  if (window.TicTime && holder) {
    window.TicTime.mountSettings(holder);
    window.TicTime.renderAll(document);
    window.TicTime.onChange(function () { window.TicTime.renderAll(document); });
  }
})();

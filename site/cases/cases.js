/* The worked cases page: mounts the time settings menu (no inline scripts under the CSP). */
(function () {
  var el = document.getElementById("time-settings");
  var T = window.TicTime;
  if (!T) return;
  if (el) T.mountSettings(el);
  T.renderAll(document);
  T.onChange(function () { T.renderAll(document); });
})();

(function () {
    var previewhash = "Special:Preview";
    var storagekey = "yourplaygroundarticle";
    var layoutkey = "yourplaygroundlayout";
    var hiddenkey = "yourplaygroundishidden";
    var panel; var textarea; var submittab; var togglebutton;
    var ispreviewmode = false; var rendertimer = 0;

    function normalizehash() {
        var raw = window.location.hash ? window.location.hash.slice(1) : "Main_Page";
        return decodeURIComponent(raw || "Main_Page");
    }
    function ispreviewhash() {
        return normalizehash().replace(/_/g, " ").replace(/\s+/g, " ") === previewhash.replace(/_/g, " ").replace(/\s+/g, " ");
    }
    function getdraft() {
        return localStorage.getItem(storagekey) || "Start writing here...";
    }
    function setdraft(value) {
        localStorage.setItem(storagekey, value);
    }
    function getsuggestedfilename(markdown) {
        var match = String(markdown || "yourplaygroundarticle").match(/^\s*#\s+(.+)$/m);
        var title = match ? match[1].trim() : "New Article";
        return title.replace(/[<>:"/\\|?*]+/g, "").replace(/_/g, " ").replace(/\s+/g, " ").trim() || "New Article";
    }
    function updatesubmithref() {
        if (!submittab || !textarea) return;
        var text = textarea.value || "";
        var filename = getsuggestedfilename(text) + ".md";
        submittab.href =
            "https://github.com/CtRHome/wiki/new/main/articles?filename=" +
            encodeURIComponent(filename) +
            "&value=" +
            encodeURIComponent(text);
    }
    function renderpreviewnow() {
        if (!window.WikiMarkdown || !textarea) return;
        window.WikiMarkdown.renderarticle("Special:Preview", textarea.value || "");
        updatesubmithref();
    }
    function schedulerender() {
        if (rendertimer) window.clearTimeout(rendertimer);
        rendertimer = window.setTimeout(renderpreviewnow, 500);
    }
    function savelayout() {
        if (!panel) return;
        var rect = panel.getBoundingClientRect();
        localStorage.setItem(layoutkey, JSON.stringify({
            left: Math.round(rect.left),
            top: Math.round(rect.top),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
        }));
    }
    function applysavedlayout() {
        if (!panel) return;
        var raw = localStorage.getItem(layoutkey);
        if (!raw) return;
        try {
            var layout = JSON.parse(raw);
            if (layout && typeof layout.left === "number" && typeof layout.top === "number") {
                panel.style.left = layout.left + "px";
                panel.style.top = layout.top + "px";
                panel.style.bottom = "auto";
                panel.style.right = "auto";
            }
            if (layout && typeof layout.width === "number") panel.style.width = Math.max(320, layout.width) + "px";
            if (layout && typeof layout.height === "number") panel.style.height = Math.max(160, layout.height) + "px";
        } catch (_err) {}
    }
    function setcollapsed(collapsed) {
        if (!panel || !togglebutton) return;
        panel.style.display = collapsed ? "none" : "";
        localStorage.setItem(hiddenkey, collapsed ? "1" : "");
        togglebutton.querySelector("img").src = collapsed ? "assets/images/icons/up.png" : "assets/images/icons/down.png";
        if (!collapsed && textarea) textarea.focus();
    }
    function ensuresubmittab() {
        var tabs = document.querySelector(".tabs");
        if (!tabs) return;
        submittab = document.querySelector("a.submittab");
        if (!submittab) {
            var li = document.createElement("li");
            submittab = document.createElement("a");
            submittab.className = "tab submittab";
            submittab.textContent = "Submit";
            submittab.target = "_blank";
            submittab.rel = "noopener noreferrer";
            li.appendChild(submittab);
            tabs.appendChild(li);
        }
    }
    function settoolbarmode(previewenabled) {
        var discussion = document.querySelector("a.discussion");
        var edit = document.querySelector("a.edit");
        var history = document.querySelector("a.viewhistory");
        var search = document.querySelector(".toolbar .search");
        var pagetab = document.querySelector("a.pagetab");
        ensuresubmittab();

        [discussion, edit, history, search].forEach(function (el) {
            if (!el) return;
            var host = el.tagName === "INPUT" ? el : (el.closest("li") || el);
            host.style.display = previewenabled ? "none" : "";
        });
        if (submittab) {
            var submithost = submittab.closest("li") || submittab;
            submithost.style.display = previewenabled ? "" : "none";
        }
        if (pagetab) pagetab.textContent = "Page";
    }
    function createpanel() {
        if (panel) return panel;

        panel = document.createElement("section");
        panel.className = "playgroundpanel";
        panel.innerHTML =
            '<button class="playgrounddraghandle"></button>' +
            '<button class="playgroundresizehandle"></button>' +
            '<div class="playgroundeditor">' +
            '<textarea class="playgroundinput" spellcheck="false" placeholder="Write markdown here..."></textarea>' +
            "</div>";
        document.body.appendChild(panel);
        togglebutton = document.createElement("button");
        togglebutton.className = "playgroundtoggle";
        togglebutton.title = "Hide or show editor";
        togglebutton.innerHTML = '<img src="assets/images/icons/down.png">';
        document.body.appendChild(togglebutton);

        textarea = panel.querySelector(".playgroundinput");
        textarea.value = getdraft();
        textarea.addEventListener("input", function () {
            setdraft(textarea.value || "");
            schedulerender();
        });

        togglebutton.addEventListener("click", function () {
            setcollapsed(panel.style.display !== "none");
        });

        applysavedlayout();
        setcollapsed(localStorage.getItem(hiddenkey) === "1");
        renderpreviewnow();
        makemovable(panel.querySelector(".playgrounddraghandle"));
        makeresizable(panel.querySelector(".playgroundresizehandle"));
        return panel;
    }
    function makemovable(handle) {
        if (!handle || !panel) return;
        var dragging = false;
        var startx = 0; var starty = 0;
        var panelx = 0; var panely = 0;
        handle.addEventListener("mousedown", function (e) {
            dragging = true;
            startx = e.clientX; starty = e.clientY;
            var rect = panel.getBoundingClientRect();
            panelx = rect.left; panely = rect.top;
            panel.style.left = panelx + "px";
            panel.style.top = panely + "px";
            panel.style.right = "auto";
            panel.style.bottom = "auto";
            e.preventDefault();
        });
        document.addEventListener("mousemove", function (e) {
            if (!dragging) return;
            panel.style.left = (panelx + (e.clientX - startx)) + "px";
            panel.style.top = (panely + (e.clientY - starty)) + "px";
        });
        document.addEventListener("mouseup", function () {
            if (dragging) savelayout();
            dragging = false;
        });
    }
    function makeresizable(handle) {
        if (!handle || !panel) return;
        var resizing = false;
        var startx = 0; var starty = 0;
        var startw = 0; var starth = 0; var starttop = 0;
        handle.addEventListener("mousedown", function (e) {
            resizing = true; startx = e.clientX;
            starty = e.clientY;
            var rect = panel.getBoundingClientRect();
            startw = rect.width; starth = rect.height;
            starttop = rect.top;
            panel.style.left = rect.left + "px";
            panel.style.top = rect.top + "px";
            panel.style.right = "auto"; panel.style.bottom = "auto";
            e.preventDefault();
        });
        document.addEventListener("mousemove", function (e) {
            if (!resizing) return;
            var deltax = e.clientX - startx; var deltay = e.clientY - starty;
            var nextw = startw + deltax; var nexth = starth - deltay;
            var minw = 320; var minh = 160;
            var maxw = Math.max(window.innerWidth * 0.95, minw);
            var maxh = Math.max(window.innerHeight * 0.95, minh);
            var clampedw = Math.max(minw, Math.min(maxw, nextw));
            var clampedh = Math.max(minh, Math.min(maxh, nexth));
            panel.style.width = clampedw + "px"; panel.style.height = clampedh + "px";
            panel.style.top = (starttop + (starth - clampedh)) + "px";
        });
        document.addEventListener("mouseup", function () {
            if (resizing) savelayout();
            resizing = false;
        });
    }
    function enterpreviewmode() {
        createpanel();
        textarea.value = getdraft();
        panel.style.display = "";
        settoolbarmode(true);
        renderpreviewnow();
        window.setTimeout(renderpreviewnow, 0);
    }
    function leavepreviewmode() {
        if (panel) panel.style.display = "none";
        if (togglebutton) togglebutton.style.display = "none";
        settoolbarmode(false);
    }
    function syncpreviewmode() {
        var nextmode = ispreviewhash();
        if (nextmode === ispreviewmode) return;
        ispreviewmode = nextmode;
        if (ispreviewmode) {
            enterpreviewmode();
            if (togglebutton) togglebutton.style.display = "";
            if (panel && localStorage.getItem(hiddenkey) === "1") panel.style.display = "none";
        }
        else leavepreviewmode();
    }

    window.addEventListener("hashchange", function () {
        syncpreviewmode();
        if (ispreviewmode) window.setTimeout(renderpreviewnow, 0);
    });
    document.addEventListener("wiki:article-rendered", function () {
        if (!ispreviewmode) return;
        if (!textarea) return;
        textarea.value = getdraft();
        renderpreviewnow();
    });
    document.addEventListener("DOMContentLoaded", function () {
        syncpreviewmode();
        if (ispreviewmode) renderpreviewnow();
    });
})();

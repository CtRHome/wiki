// cycles through noms when clicking on the logo : )
var randomnoms = [
    "assets/svgs/logo.svg",
    "assets/svgs/logo2.svg"
];
var logo = document.querySelector(".logo");
if (logo) {
    var logoimage = logo.querySelector("img");
    if (logoimage) {
        var nomindex = randomnoms.indexOf(logoimage.src.replace(window.location.origin + '/', ''));
        if (nomindex === -1) nomindex = 0;
        logoimage.addEventListener('click', function() {
            var nomindex;
            do {
                nomindex = Math.floor(Math.random() * randomnoms.length);
            } while (randomnoms.length > 1 && nomindex === nomindex);
            logoimage.src = randomnoms[nomindex];
            nomindex = nomindex;
        });
    }
}

document.addEventListener("DOMContentLoaded", function() {
    var fandombadge = document.querySelector(".fandombadge");
    if (fandombadge) {
        var fandombadgehiddenkey = "hidefandombadge";
        var showfandombadge = function() {fandombadge.classList.add("visible")};
        var hidefandombadge = function() {fandombadge.classList.remove("visible")};
        try {if (!localStorage.getItem(fandombadgehiddenkey)) {showfandombadge()}} 
        catch (_err) {}

        var closebutton = fandombadge.querySelector(".closebutton");
        if (closebutton) {
            closebutton.addEventListener("click", function(e) {
                e.preventDefault();
                e.stopPropagation();
                hidefandombadge();
                try {localStorage.setItem(fandombadgehiddenkey, "1")} 
                catch (_err) {}
            });
        }
    }

    function getexactarticlecandidates(query) {
        var raw = String(query || "").trim();
        var parts = raw.split(":");
        var hasprefix = parts.length > 1;
        var prefix = hasprefix ? parts[0].trim() : "";
        var body = hasprefix ? parts.slice(1).join(":").trim() : raw;
        var slug = body.replace(/\s+/g, "_");
        var spaced = slug.replace(/_/g, " ");
        return hasprefix
            ? [
                "articles/~" + prefix + "/" + spaced + ".md",
                "articles/~" + prefix.toLowerCase() + "/" + spaced + ".md",
                "articles/~" + prefix + "/" + slug + ".md",
                "articles/~" + prefix.toLowerCase() + "/" + slug + ".md"
            ]
            : [
                "articles/" + spaced + ".md",
                "articles/" + slug + ".md"
            ];
    }
    async function findexistingarticlepath(paths) {
        for (var i = 0; i < paths.length; i++) {
            try {
                var resp = await fetch(paths[i]);
                if (resp.ok) return paths[i];
            } catch (_err) {}
        }
        return "";
    }
    function querytowikihash(query) {
        var raw = String(query || "").trim();
        var parts = raw.split(":");
        var hasprefix = parts.length > 1;
        var prefix = hasprefix ? parts[0].trim() : "";
        var body = hasprefix ? parts.slice(1).join(":").trim() : raw;
        var slug = body.replace(/\s+/g, "_");
        return hasprefix ? (prefix + ":" + slug) : slug;
    }
    function gethashslug() {
        return window.location.hash ? window.location.hash.substring(1) : "Main_Page";
    }
    function copywithfeedback(link, value, shownvalue) {
        var display = shownvalue || value;
        link.textContent = display;
        navigator.clipboard.writeText(value).then(function() {
            link.textContent = "Copied!";
            setTimeout(function() {
                link.textContent = display;
            }, 1200);
        }, function() {
            link.textContent = "Couldn\'t copy...";
            setTimeout(function() {
                link.textContent = display;
            }, 1200);
        });
    }
    
    // url "shortener" (like 4 bytes less bruh 😭)
    var shortlinks = document.querySelectorAll("a.shortlink");
    shortlinks.forEach(function(link) {
        link.addEventListener("click", function(e) {
            e.preventDefault();
            var hash = gethashslug();
            var shortlink = "w.candies.monster/" + hash;

            function copyshortlink() {
                copywithfeedback(link, shortlink, shortlink);
            }
            link.removeEventListener("click", arguments.callee);
            link.addEventListener("click", function handler(ev) {
                ev.preventDefault();
                copyshortlink();
            }); copyshortlink();
        }, {once: true});
    });

    var fulllink = document.querySelector("a.link");
    if (fulllink) {
        fulllink.addEventListener("click", function(e) {
            e.preventDefault();
            var articlelink = "ctrhome.github.io/wiki#" + gethashslug();
            copywithfeedback(fulllink, articlelink, articlelink);
        });
    }
    var search = document.querySelector("input.search");
    if (search) {
        search.addEventListener("keydown", async function(e) {
            if (e.key !== "Enter") return;
            e.preventDefault();
            var query = (search.value || "").trim();
            if (!query) return;

            var candidates = getexactarticlecandidates(query);
            var exactpath = await findexistingarticlepath(candidates);
            if (exactpath) {
                window.location.hash = "#" + querytowikihash(query);
                return;
            }

            var searchquery = "repo:CtRHome/wiki " + query + " path:/^articles\\//";
            var url = "https://github.com/search?q=" + encodeURIComponent(searchquery) + "&type=code&type=code";
            window.location.href = url;
        });
    }
    
    /*//////////////////////////////////////////////////////////////////////*/

    // navigation tool links
    function normalizehash() {
        var raw = window.location.hash ? window.location.hash.slice(1) : "Main_Page";
        if (!raw) raw = "Main_Page";
        return decodeURIComponent(raw.trim());
    }

    function getarticlepathfromhash() {
        var hash = normalizehash();
        var parts = hash.split(":");
        var hasprefix = parts.length > 1;
        var prefix = hasprefix ? parts[0].trim() : "";
        var rawpage = hasprefix ? parts.slice(1).join(":").trim() : hash.trim();
        var slug = rawpage.replace(/\s+/g, "_");
        return hasprefix
            ? "articles/~" + prefix + "/" + slug + ".md"
            : "articles/" + slug + ".md";
    }

    function setactionlinks() {
        var articlepath = getarticlepathfromhash();
        var pagetab = document.querySelector("a.pagetab");
        var discussion = document.querySelector("a.discussion");
        var edit = document.querySelector("a.edit");
        var viewhistory = document.querySelector("a.viewhistory");
        var pagehash = window.location.hash || "#Main_Page";
        var hashname = normalizehash();
        var iseditblocked = !!(window.WikiMarkdown && typeof window.WikiMarkdown.hasblockededitprefix === "function" && window.WikiMarkdown.hasblockededitprefix(hashname));

        if (pagetab) pagetab.href = pagehash;
        if (discussion) {
            var bodyurl = "https://github.com/CtRHome/wiki/blob/main/" + articlepath;
            discussion.href = "https://github.com/CtRHome/wiki/discussions/new?category=general&body=" + encodeURIComponent(bodyurl);
        }
        if (edit) {
            edit.href = "https://github.com/CtRHome/wiki/edit/main/" + articlepath;
            edit.style.display = iseditblocked ? "none" : "";
        }
        if (viewhistory) viewhistory.href = "https://github.com/CtRHome/wiki/commits/main/" + articlepath;
    }

    setactionlinks();
    window.addEventListener("hashchange", setactionlinks);
});

/*//////////////////////////////////////////////////////////////////////*/

(function() {
    var debug = false; var lol = "mustvebeenthewind";
    if (navigator.userAgent.indexOf("Windows") !== -1) {
        var shownt = debug || !localStorage.getItem(lol);

        if (shownt) {
            var img = document.createElement('img');
            img.className = "lol"; img.src = "/assets/images/lol.png";
            img.draggable = false; img.style.position = "fixed";
            img.style.bottom = "2em"; img.style.right = "2em";
            img.style.zIndex = "50000";

            document.body.appendChild(img);

            function notroll() {
                if (img && img.parentNode) {img.parentNode.removeChild(img)}
                if (!debug) {localStorage.setItem(lol, "1")}
            }
            img.addEventListener("mouseover", notroll, {once: true});
        }
    }
})();
// cycles through noms when clicking on the logo : )
// perhaps add more om nom vectors you have here
var randomnoms = [
    "assets/svgs/logo.svg",
    "assets/svgs/logo2.svg"
];
var logo = document.querySelector(".logo");
if (logo) {
    var logoimage = logo.querySelector("img");
    if (logoimage) {
        var currentnomindex = randomnoms.indexOf(logoimage.src.replace(window.location.origin + '/', ''));
        if (currentnomindex === -1) currentnomindex = 0;
        logoimage.addEventListener('click', function() {
            var nextindex;
            do {
                nextindex = Math.floor(Math.random() * randomnoms.length);
            } while (randomnoms.length > 1 && nextindex === currentnomindex);
            currentnomindex = nextindex;
            logoimage.src = randomnoms[currentnomindex];
        });
    }
}

document.addEventListener("DOMContentLoaded", function() {
    
    document.addEventListener("dragstart", function(e) {
        if (e.target && e.target.tagName === "IMG") {e.preventDefault()}
    });

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
        var spaced = body.replace(/_/g, " ").replace(/\s+/g, " ").trim();
        return hasprefix
            ? [
                "articles/~" + prefix + "/" + spaced + ".md",
                "articles/~" + prefix.toLowerCase() + "/" + spaced + ".md"
            ]
            : [
                "articles/" + spaced + ".md"
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
        var pagename = body.replace(/_/g, " ").replace(/\s+/g, " ").trim();
        return hasprefix ? (prefix + ":" + pagename) : pagename;
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

    var lasteditrequestid = 0;
    async function updatelasteditedtext(articlepath) {
        var footerlabel = document.querySelector(".lastedit");
        if (!footerlabel) return;
        var requestid = ++lasteditrequestid;
        footerlabel.textContent = "This page was last edited on...";

        var apipath = "https://api.github.com/repos/CtRHome/wiki/commits?path=" + encodeURIComponent(articlepath) + "&per_page=1";
        try {
            var response = await fetch(apipath, {headers: {"Accept": "application/vnd.github+json"}});
            if (!response.ok) throw new Error("github api returned an error: " + response.status);

            var commits = await response.json();
            if (requestid !== lasteditrequestid) return;
            if (!Array.isArray(commits) || !commits.length || !commits[0] || !commits[0].commit) {
                footerlabel.textContent = "This page was last edited on an unknown date.";
                return;
            }

            var commit = commits[0].commit;
            var datevalue = (commit.committer && commit.committer.date) || (commit.author && commit.author.date) || "";
            if (!datevalue) {
                footerlabel.textContent = "This page was last edited on an unknown date.";
                return;
            }

            var parsed = new Date(datevalue);
            if (isNaN(parsed.getTime())) {
                footerlabel.textContent = "This page was last edited on an unknown date.";
                return;
            }

            var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            var day = String(parsed.getUTCDate());
            var month = months[parsed.getUTCMonth()];
            var year = String(parsed.getUTCFullYear());
            var hour = String(parsed.getUTCHours()).padStart(2, "0");
            var minute = String(parsed.getUTCMinutes()).padStart(2, "0");

            var authorlogin = commits[0] && commits[0].author && commits[0].author.login ? commits[0].author.login : "";
            var authorurl = commits[0] && commits[0].author && commits[0].author.html_url ? commits[0].author.html_url : "";
            var authorname = authorlogin || ((commit.author && commit.author.name) ? commit.author.name : "unknown");

            footerlabel.textContent = "This page was last edited on " + day + " " + month + " " + year + ", at " + hour + ":" + minute + " (UTC) by ";
            if (authorurl && authorlogin) {
                var authorlink = document.createElement("a");
                authorlink.href = authorurl;
                authorlink.textContent = authorlogin;
                authorlink.target = "_blank";
                authorlink.rel = "noopener noreferrer";
                footerlabel.appendChild(authorlink);
                footerlabel.appendChild(document.createTextNode("."));
            } else {
                footerlabel.appendChild(document.createTextNode(authorname + "."));
            }
        } catch (_err) {
            if (requestid !== lasteditrequestid) return;
            footerlabel.textContent = "This page was last edited on an unknown date.";
        }
    }
    
    /*//////////////////////////////////////////////////////////////////////*/

    // navigation tool links
    var discussionapi = "https://discuss.w.candies.monster";
    var randomapi = "https://random.w.candies.monster?format=json";
    var discussionrequestid = 0;
    var randominprogress = false;
    var localdebug = /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname); // this prevents request spamming for the sake of that daily 100k request limit
    var pendinglasteditpath = "";

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
        var pagename = rawpage.replace(/_/g, " ").replace(/\s+/g, " ").trim();
        return hasprefix
            ? "articles/~" + prefix + "/" + pagename + ".md"
            : "articles/" + pagename + ".md";
    }

    /*//////////////////////////////////////////////////////////////////////*/

    function getarticletitlefromhash() {
        var hash = normalizehash();
        var parts = hash.split(":");
        var hasprefix = parts.length > 1;
        var prefix = hasprefix ? parts[0].trim() : "";
        var rawpage = hasprefix ? parts.slice(1).join(":").trim() : hash.trim();
        var pretty = rawpage.replace(/_/g, " ");
        return hasprefix ? (prefix + ":" + pretty) : pretty;
    }

    async function mayberedirectrandompage() {
        if (normalizehash() !== "Special:Random Page") return false;
        if (randominprogress) return true;
        randominprogress = true;

        try {
            var response = await fetch(randomapi, {headers: {"Accept": "application/json"}});
            if (!response.ok) throw new Error("random api returned " + response.status);
            var payload = await response.json();

            if (payload && typeof payload.hash === "string" && payload.hash.trim()) {
                window.location.hash = "#" + payload.hash.trim();
                return true;
            }
            if (payload && typeof payload.url === "string" && payload.url.trim()) {
                window.location.href = payload.url.trim();
                return true;
            }
            throw new Error("random api did not include hash/url..");
        } catch (_err) {
            window.location.href = "https://random.w.candies.monster";
            return true;
        } finally {
            randominprogress = false;
        }
    }

    function setdiscussionbutton(link, state, href) {
        if (!link) return;
        link.classList.remove("discussionload", "discussionmissing", "discussionfound");
        if (state) link.classList.add(state);

        if (href) {
            link.href = href;
            link.removeAttribute("aria-disabled");
            link.tabIndex = 0;
        } else {
            link.removeAttribute("href");
            link.setAttribute("aria-disabled", "true");
            link.tabIndex = -1;
        }
    }

    async function updatediscussionbutton(link, articletitle, fallbackurl) {
        var requestid = ++discussionrequestid;
        setdiscussionbutton(link, "discussionload");
        link.dataset.discussionresulthref = "";
        link.dataset.discussionload = "1";

        var endpoint = discussionapi.replace(/\/$/, "") + "/" + encodeURIComponent(articletitle) + "?format=json";
        try {
            var response = await fetch(endpoint);
            if (!response.ok) throw new Error("discussion api returned " + response.status);
            var data = await response.json();
            if (requestid !== discussionrequestid) return;

            if (data && data.exists && data.discussionurl) {
                link.dataset.discussionresulthref = data.discussionurl;
                setdiscussionbutton(link, "discussionfound", data.discussionurl);
                return;
            }
            var createurl = (data && data.createurl) ? data.createurl : fallbackurl;
            link.dataset.discussionresulthref = createurl;
            setdiscussionbutton(link, "discussionmissing", createurl);
        } catch (_err) {
            if (requestid !== discussionrequestid) return;
            link.dataset.discussionresulthref = fallbackurl;
            setdiscussionbutton(link, "discussionmissing", fallbackurl);
        } finally {
            if (requestid === discussionrequestid) {
                link.dataset.discussionload = "0";
            }
        }
    }

    function setactionlinks() {
        if (normalizehash() === "Special:Random Page") {
            mayberedirectrandompage();
            return;
        }

        var articlepath = getarticlepathfromhash();
        var pagetab = document.querySelector("a.pagetab");
        var discussion = document.querySelector("a.discussion");
        var edit = document.querySelector("a.edit");
        var viewhistory = document.querySelector("a.viewhistory");
        var pagehash = window.location.hash || "#Main_Page";
        var hashname = normalizehash();
        var articletitle = getarticletitlefromhash();
        var iseditblocked = !!(window.WikiMarkdown && typeof window.WikiMarkdown.hasblockededitprefix === "function" && window.WikiMarkdown.hasblockededitprefix(hashname));

        if (pagetab) pagetab.href = pagehash;
        if (discussion) {
            var bodyurl = "https://github.com/CtRHome/wiki/blob/main/" + articlepath;
            var newdiscussionurl = "https://github.com/CtRHome/wiki/discussions/new?category=general&title=" + encodeURIComponent(articletitle) + "&body=" + encodeURIComponent(bodyurl);
            var searchquery = "repo:CtRHome/wiki is:discussion in:title \"" + articletitle + "\"";
            var searchurl = "https://github.com/CtRHome/wiki/discussions?discussions_q=" + encodeURIComponent(searchquery);

            // now i KNOW this doesn't make sense but trust the process
            discussion.href = "";
            discussion.dataset.discussionsearchlink = searchurl;
            discussion.dataset.discussionnewlink = newdiscussionurl;
            discussion.dataset.discussiontitle = articletitle;
            discussion.dataset.discussionresulthref = "";
            discussion.dataset.discussionload = "0";
            setdiscussionbutton(discussion, "discussionload");
            if (!localdebug) {updatediscussionbutton(discussion, articletitle, newdiscussionurl)}
        }
        if (edit) {
            edit.href = "https://github.com/CtRHome/wiki/edit/main/" + articlepath;
            edit.style.display = iseditblocked ? "none" : "";
        }
        if (viewhistory) viewhistory.href = "https://github.com/CtRHome/wiki/commits/main/" + articlepath;
        if (localdebug) {
            pendinglasteditpath = articlepath;
            var footerlabel = document.querySelector(".lastedit");
            if (footerlabel) footerlabel.textContent = "This page was last edited on... (hover to load)";
        } else {
            pendinglasteditpath = "";
            updatelasteditedtext(articlepath);
        }
    }

    setactionlinks();
    window.addEventListener("hashchange", setactionlinks);

    var discussionlink = document.querySelector("a.discussion");
    if (discussionlink) {
        var triggerdiscussioncheck = function() {
            if (discussionlink.dataset.discussionresulthref) return;
            if (discussionlink.dataset.discussionload === "1") return;

            var title = discussionlink.dataset.discussiontitle || getarticletitlefromhash();
            var fallbackurl = discussionlink.dataset.discussionnewlink || "";
            if (!title) return;
            updatediscussionbutton(discussionlink, title, fallbackurl);
        };

        discussionlink.addEventListener("click", function(e) {
            if (localdebug && !discussionlink.dataset.discussionresulthref && discussionlink.dataset.discussionload !== "1") {
                e.preventDefault();
                triggerdiscussioncheck(); return;
            }
            var href = discussionlink.dataset.discussionresulthref || discussionlink.getAttribute("href");
            if (!href) {
                e.preventDefault();
            }
        });
    }

    var lasteditlabel = document.querySelector(".lastedit");
    if (lasteditlabel) {
        var triggermaybeupdatelastedit = function() {
            if (!localdebug) return;
            if (!pendinglasteditpath) return;
            var path = pendinglasteditpath;
            pendinglasteditpath = "";
            updatelasteditedtext(path);
        };
        lasteditlabel.addEventListener("mouseenter", triggermaybeupdatelastedit);
        lasteditlabel.addEventListener("focus", triggermaybeupdatelastedit);
    }
});

/*//////////////////////////////////////////////////////////////////////*/

(function() {
    var debug = false; var lol = "mustvebeenthewind";
    if (navigator.userAgent.indexOf("Windows") !== -1) {
        var shownt = debug || !localStorage.getItem(lol);

        if (shownt) {
            var img = document.createElement('img');
            img.className = "lol"; img.src = "assets/images/lol.png";
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
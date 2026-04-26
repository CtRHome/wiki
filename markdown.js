// markdown parser
// (this is completely different from s.soggy.cat/info, so no sog nabbing this time)

(function () {
    var contentroot = document.querySelector(".content");
    var maintitle = '<h1 class="title">$TITLE$</h1>';

    var hostwhitelist = [
        window.location.hostname,
        "github.com",
        "raw.githubusercontent.com",
        "files.catbox.moe",
        "imgur.com",
        "i.imgur.com",
        "drive.google.com",
        "gyazo.com", //
        "prnt.sc", // if you use these you're a boomer man i'm sorry
        "postimg.cc", //
        "ibb.co"
    ];
    var blockedext = {
        svg: true, svgz: true,
        html: true, htm: true, xml: true,
        js: true, mjs: true, cjs: true,
        vbs: true, wasm: true
    };
    var reservedprefixes = ["special", "wiki"];

    var externallink = "assets/images/icons/linkbluesmall.png";
    var activecitationrenderer = null;
    var pendingredirectnotice = null;
    var imageoverlay = null;
    var imageoverlaylink = null;
    var imageoverlayimg = null;

    /*//////////////////////////////////////////////////////////////////////*/

    function escapehtml(val) {
        return String(val || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }
    function escapeattr(val) {
        return escapehtml(val).replace(/"/g, "&quot;");
    }
    function isexternalhref(href) {
        try {
            var parsed = new URL(href, window.location.href);
            return parsed.origin !== window.location.origin;
        } catch (_err) {
            return false;
        }
    }
    function makewikihref(target) {
        return wikilinktohash(target);
    }
    function isallowedhost(hostname) {
        var lower = String(hostname || "").toLowerCase();
        return hostwhitelist.some(function (host) {
            var allowed = String(host || "").toLowerCase();
            return lower === allowed || lower.endsWith("." + allowed);
        });
    }
    function normalizemediaurl(rawurl) {
        var raw = String(rawurl || "").trim();
        if (!raw) return { ok: false, reason: "No media URL was provided." };
        if (/^\s*javascript:/i.test(raw) || /^\s*data:/i.test(raw)) {
            return { ok: false, reason: "This URL scheme is not allowed..." };
        }

        // chunk below's for unique errors
        var parsed;
        try {parsed = new URL(raw, window.location.href)} 
        catch (_err) {return {ok: false, reason: "The URL for this file was invalid."}}

        var islocal = !parsed.host || parsed.origin === window.location.origin;
        if (!islocal && !isallowedhost(parsed.hostname)) {
            return {ok: false, reason: "This host is not whitelisted."};
        }

        var pathname = parsed.pathname || "";
        var extmatch = pathname.toLowerCase().match(/\.([a-z0-9]+)$/);
        var ext = extmatch ? extmatch[1] : "";
        if (ext && blockedext[ext]) {
            return {ok: false, reason: "." + ext + " files are blocked for safety."};
        }

        return {ok: true, url: parsed.href, ext: ext};
    }
    function getdecodedfilenamefromurl(url) {
        try {
            var parsed = new URL(url, window.location.href);
            var parts = (parsed.pathname || "").split("/").filter(Boolean);
            var rawname = parts.length ? parts[parts.length - 1] : "media";
            return decodeURIComponent(rawname);
        } catch (_err) {
            return "media";
        }
    }
    function maybeprependlocalimagepath(rawurl) {
        var val = String(rawurl || "").trim();
        if (!val) return val;
        if (/^(https?:|data:|javascript:|\/\/|\/|#|\.\/|\.\.\/)/i.test(val)) return val;
        if (val.indexOf("/") === -1) return "articles/media/" + val;
        return val;
    }
    function sanitizehref(rawhref) {
        var href = String(rawhref || "").trim();
        if (!href) return "#";
        if (href[0] === "#" || href[0] === "/") return escapeattr(href);
        if (href.startsWith("./") || href.startsWith("../")) return escapeattr(href);

        var parsed;
        try {parsed = new URL(href, window.location.href)}
        catch (_err) {return "#"}

        var protocol = parsed.protocol.toLowerCase();
        if (protocol === "http:" || protocol === "https:" || protocol === "mailto:") {
            return escapeattr(parsed.href);
        }
        return "#";
    }
    function resolvecardlink(rawlink) {
        var val = String(rawlink || "").trim();
        if (!val) return "#";
        if (/^(https?:|mailto:|#|\/|\.\/|\.\.\/)/i.test(val)) return sanitizehref(val);
        return escapeattr(makewikihref(val));
    }
    function appendexternalicon(html) {
        return '<span class="externallinkwrap">' + html + '<img class="externalicon" src="' + escapeattr(externallink) + '" aria-hidden="true"></span>';
    }
    function buildlinkhtml(labelhtml, href) {
        var safehref = sanitizehref(href);
        var isexternal = isexternalhref(safehref);
        var base = '<a href="' + safehref + '"' + (isexternal ? ' rel="noopener noreferrer nofollow" target="_blank"' : "") + ">" + labelhtml + "</a>";
        return isexternal ? appendexternalicon(base) : base;
    }

    /*//////////////////////////////////////////////////////////////////////*/
    
    function hideimageoverlay() {
        if (!imageoverlay) return;
        imageoverlay.classList.remove("active");
    }
    function ensureimageoverlay() {
        if (imageoverlay) return;

        imageoverlay = document.createElement("div");
        imageoverlay.className = "imageoverlay";
        imageoverlaylink = document.createElement("a");
        imageoverlaylink.className = "imageoverlaylink";
        imageoverlaylink.target = "_blank";
        imageoverlaylink.rel = "noopener noreferrer";
        imageoverlayimg = document.createElement("img");

        imageoverlaylink.appendChild(imageoverlayimg);
        imageoverlay.appendChild(imageoverlaylink);
        document.body.appendChild(imageoverlay);

        imageoverlay.addEventListener("click", function (e) {
            if (e.target === imageoverlay) hideimageoverlay();
        });
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") hideimageoverlay();
        });
    }
    function bindexpandableimages(scope) {
        ensureimageoverlay();
        var images = scope.querySelectorAll(".infobox img, .embed img");
        images.forEach(function (img) {
            if (img.dataset.expandbound === "1") return;
            img.dataset.expandbound = "1";
            img.classList.add("expandableimage");
            img.addEventListener("click", function () {
                imageoverlayimg.src = img.currentSrc || img.src;
                imageoverlayimg.alt = img.alt || "";
                imageoverlaylink.href = img.currentSrc || img.src;
                imageoverlay.classList.add("active");
            });
        });
    }

    /*//////////////////////////////////////////////////////////////////////*/

    function normalizehash() {
        var raw = window.location.hash ? window.location.hash.slice(1) : "Main Page";
        if (!raw) raw = "Main Page";
        return decodeURIComponent(raw.trim());
    }
    function displaytitlefrompagename(pagename) {
        return pagename.replace(/_/g, " ").trim() || "Untitled";
    }
    function wikilinktohash(target) {
        return "#" + target.trim();
    }

    /*//////////////////////////////////////////////////////////////////////*/

    function parseinline(txt, opts) {
        opts = opts || {};
        var rendercitationref = typeof opts.rendercitationref === "function"
            ? opts.rendercitationref
            : (typeof activecitationrenderer === "function" ? activecitationrenderer : null);
        var escapes = [];
        var neutralized = String(txt || "").replace(/\\([\\`*_~\[\]\(\)-])/g, function (_, ch) {
            var token = "%%esc" + escapes.length + "%%";
            escapes.push(ch);
            return token;
        });
        var safe = escapehtml(neutralized);
        safe = safe.replace(/&lt;\s*br\s*\/?\s*&gt;/gi, "<br>");
        safe = safe.split("\n").map(function (line) {
            if (/^\s*-#\s+/.test(line)) {
                return '<span class="sizetextsmall">' + line.replace(/^\s*-#\s+/, "") + "</span>";
            }
            if (/^\s*#\s+/.test(line)) {
                return '<span class="sizetextbig">' + line.replace(/^\s*#\s+/, "") + "</span>";
            }
            return line;
        }).join("\n");

        safe = safe
            // inline code with single or double ticks
            .replace(/``([^`]+)``/g, "<code>$1</code>")
            .replace(/`([^`]+)`/g, "<code>$1</code>")
            // bold
            .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
            // italic
            .replace(/\*([^*]+)\*/g, "<em>$1</em>")
            // underline
            .replace(/__([^_]+)__/g, "<u>$1</u>")
            .replace(/_([^_]+)_/g, "<u>$1</u>")
            // strikethrough
            .replace(/~~([^~]+)~~/g, "<del>$1</del>")
            .replace(/~([^~]+)~/g, "<del>$1</del>")
            // article links with a custom label
            .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, function (_, t, l) {
                return '<a href="' + escapeattr(makewikihref(t)) + '">' + l + "</a>";
            })
            // article links
            .replace(/\[\[([^\]]+)\]\]/g, function (_, t) {
                return '<a href="' + escapeattr(makewikihref(t)) + '">' + t.replace(/_/g, " ") + "</a>";
            })
            // external links
            .replace(/\[([^\]]+)\]\(((?:[^()\s]+|\([^()]*\))+)\)/g, function (_, label, href) {
                return buildlinkhtml(label, href);
            })
            // cite references like [^id] and cite needed like [^?]
            .replace(/\[\^([^\]]+)\]/g, function (_, id) {
                var key = String(id || "").trim();
                if (key === "?") {
                    return '<sup class="citationneeded"><a href="' + escapeattr(makewikihref("Wiki:Provide sources to big claims")) + '"><em>(source?)</em></a></sup>';
                }
                if (!key) return "";
                if (rendercitationref) return rendercitationref(key);
                return '<sup class="citeref">[?]</sup>';
            });

        safe = safe.replace(/ - /g, " — ");
        safe = safe.replace(/\n/g, "<br>");

        escapes.forEach(function (ch, idx) {
            safe = safe.replace(new RegExp("%%esc" + idx + "%%", "g"), escapehtml(ch));
        });
        return safe;
    }

    function guessmediatype(ext) {
        var image = { png: 1, jpg: 1, jpeg: 1, webp: 1, gif: 1, bmp: 1, ico: 1, avif: 1 };
        var audio = { mp3: 1, wav: 1, ogg: 1, m4a: 1, aac: 1, flac: 1 };
        var video = { mp4: 1, webm: 1, ogv: 1, mov: 1, m4v: 1 };
        if (image[ext]) return "image";
        if (audio[ext]) return "audio";
        if (video[ext]) return "video";
        return "unknown";
    }
    function mediarenderhtml(url, mediatype) {
        var safeurl = escapeattr(url);
        if (mediatype === "image") return '<img loading="lazy" src="' + safeurl + '">';
        if (mediatype === "audio") return '<audio controls preload="metadata" src="' + safeurl + '"></audio>';
        if (mediatype === "video") return '<video controls preload="metadata" src="' + safeurl + '"></video>';
        var filename = escapehtml(getdecodedfilenamefromurl(url));
        return '<p class="paragraph"><a href="' + safeurl + '">' + filename + "</a></p>";
    }
    function renderdangercard(title, text) {
        return (
            '<section class="card carddanger">' +
            '<h3><img class="cardicon" src="assets/images/icons/danger.png"> ' + parseinline(title || "Danger") + "</h3>" +
            "<p>" + parseinline(text || "") + "</p>" +
            "</section>"
        );
    }

    function parsedirectiveblock(name, args, lines) {
        var data = {};
        var rowsource = [];
        var lastkey = "";
        lines.forEach(function (line) {
            var idx = line.indexOf(":");
            var looksproperty = idx > 0 && line.slice(0, idx).trim() !== "";

            if (looksproperty) {
                var rawkey = line.slice(0, idx).trim();
                var key = rawkey.toLowerCase();
                var val = line.slice(idx + 1).trim();
                if (key) {
                    data[key] = val;
                    rowsource.push({ rawkey: rawkey, key: key, value: val });
                    lastkey = key;
                }
                return;
            }

            if (lastkey) {
                var cont = line.trim();
                data[lastkey] += "\n" + cont;
                for (var r = rowsource.length - 1; r >= 0; r--) {
                    if (rowsource[r].key === lastkey) {
                        rowsource[r].value = data[lastkey]; break;
                    }
                }
            }
        });

        // ::infobox
        if (name === "infobox") {
            var imagehtml = "";
            if (data.image) {
                var infoboximage = maybeprependlocalimagepath(data.image);
                var img = normalizemediaurl(infoboximage);
                if (img.ok && guessmediatype(img.ext) === "image") {
                    imagehtml = '<img src="' + escapeattr(img.url) + '">';
                } else if (!img.ok) {
                    imagehtml = '<p class="paragraph infoboxwarning">' + parseinline(img.reason) + "</p>";
                }
            }

            var rows = rowsource
                .filter(function (r) { return r.key !== "title" && r.key !== "image"; })
                .map(function (r) {
                    return "<tr><th>" + parseinline(r.rawkey) + "</th><td>" + parseinline(r.value) + "</td></tr>";
                }).join("");

            return (
                '<aside class="infobox">' +
                (data.title ? "<h3>" + parseinline(data.title) + "</h3>" : "") +
                imagehtml +
                "<table>" + rows + "</table>" +
                "</aside>"
            );
        }

        // ::media / ::video / ::image
        if (name === "video" || name === "image" || name === "media") {
            var rawmediaurl = data.url || "";
            var alignment = args[0] === "left" || args[0] === "right" ? args[0] : "";
            var chosenmediatype = name === "video" ? "video" : (name === "image" ? "image" : "");
            if (name === "media" || chosenmediatype === "image") rawmediaurl = maybeprependlocalimagepath(rawmediaurl);

            var media = normalizemediaurl(rawmediaurl);
            if (!media.ok) {
                return renderdangercard("Blocked media", media.reason);
            }

            var mediatype = chosenmediatype || guessmediatype(media.ext);
            var alignclass = alignment ? " embed" + alignment : "";

            return (
                '<figure class="embed' + alignclass + '">' +
                mediarenderhtml(media.url, mediatype) +
                (data.caption ? "<figcaption>" + parseinline(data.caption) + "</figcaption>" : "") +
                "</figure>"
            );
        }

        // ::card (info, warning, danger)
        if (name === "card") {
            var cardtype = (args[0] || "info").toLowerCase();
            if (cardtype !== "warning" && cardtype !== "danger" && cardtype !== "info") cardtype = "info";
            var icon = cardtype === "danger"
                ? "assets/images/icons/danger.png"
                : (cardtype === "warning" ? "assets/images/icons/warning.png" : "assets/images/icons/info.png");

            return (
                '<section class="card card' + cardtype + '">' +
                (data.title ? '<h3><img class="cardicon" src="' + escapeattr(icon) + '"> ' + parseinline(data.title) + "</h3>" : "") +
                (data.text ? "<p>" + parseinline(data.text) + "</p>" : "") +
                (data.link ? '<p>' + buildlinkhtml("Read more", resolvecardlink(data.link)) + "</p>" : "") +
                "</section>"
            );
        }
        return "";
    }

    /*//////////////////////////////////////////////////////////////////////*/

    function markdowntohtml(md) {
        activecitationrenderer = null;
        var cleanmd = String(md || "")
            .replace(/\r\n/g, "\n")
            .replace(/<!--[\s\S]*?-->/g, "");
        var lines = cleanmd.split("\n");
        var html = []; var inlist = false;
        var inblockquote = false;
        var citationsbyid = {};
        var citationorder = [];
        var citationdefs = {};

        function escid(id) {
            return String(id || "").replace(/[^a-z0-9_-]/gi, "-");
        }
        function parsecitationlinks(raw) {
            var source = String(raw || "").trim();
            if (!source) return [];
            return source
                .split(/\s+/)
                .map(function (chunk) { return chunk.trim(); })
                .filter(function (chunk) { return /^(https?:\/\/|mailto:)/i.test(chunk); });
        }
        function parsecitationdefinition(raw) {
            var val = String(raw || "").trim();
            if (!val) return { desc: "", links: [] };
            var pipe = val.indexOf("|");
            if (pipe !== -1) {
                return {
                    desc: val.slice(0, pipe).trim(),
                    links: parsecitationlinks(val.slice(pipe + 1))
                };
            }
            if (/^(https?:\/\/|mailto:)/i.test(val)) {
                return { desc: "", links: parsecitationlinks(val) };
            }
            return { desc: val, links: [] };
        }
        function extractinlinedefinition(line) {
            var source = String(line || "");
            var start = 0;
            while (true) {
                var idx = source.indexOf("[^", start);
                if (idx === -1) return { text: source, id: "", def: "" };
                if (idx > 0 && source[idx - 1] === "\\") {
                    start = idx + 2;
                    continue;
                }
                var tail = source.slice(idx);
                var m = tail.match(/^\[\^([^\]]+)\]:\s*(.*)$/);
                if (!m) {
                    start = idx + 2;
                    continue;
                }
                return { text: source.slice(0, idx), id: String(m[1] || "").trim(), def: String(m[2] || "") };
            }
        }
        function registercitationref(id) {
            if (!citationsbyid[id]) {
                citationsbyid[id] = citationorder.length + 1;
                citationorder.push(id);
            }
            var idx = citationsbyid[id];
            return '<sup class="citeref"><a id="citeref' + idx + '" href="#" data-cite-target="cite' + idx + '">[' + idx + "]</a></sup>";
        }
        function inlinewithcites(text) {
            return parseinline(text, { rendercitationref: registercitationref });
        }
        activecitationrenderer = registercitationref;

        function closelist() {
            if (inlist) {
                html.push("</ul>");
                inlist = false;
            }
        }
        function closequote() {
            if (inblockquote) {
                html.push("</blockquote>");
                inblockquote = false;
            }
        }

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            var inlinedef = extractinlinedefinition(line);
            if (inlinedef.id) {
                citationdefs[inlinedef.id] = parsecitationdefinition(inlinedef.def || "");
                line = inlinedef.text;
            }
            var trimmed = line.trim();

            if (!trimmed) {
                closelist(); closequote();
                // html.push('<p class="paragraph"><br></p>');
                continue;
            }

            var citedef = trimmed.match(/^\[\^([^\]]+)\]:\s*(.*)$/);
            if (citedef) {
                var citeid = String(citedef[1] || "").trim();
                if (citeid) citationdefs[citeid] = parsecitationdefinition(citedef[2] || "");
                continue;
            }

            // code blocks like 
            // ```lang 
            // code
            // ```
            if (/^```/.test(trimmed)) {
                closelist(); closequote();

                var lang = (trimmed.slice(3).trim().toLowerCase() || "txt").replace(/[^a-z0-9_-]/g, "");
                var codelines = [];
                i++;
                while (i < lines.length && !/^```/.test(lines[i].trim())) {
                    codelines.push(lines[i]);
                    i++;
                }
                html.push(
                    '<pre class="codeblock"><code class="language-' + escapeattr(lang || "txt") + '">' +
                    escapehtml(codelines.join("\n")) +
                    "</code></pre>"
                );
                continue;
            }

            // ::infobox / ::media / ::card
            if (trimmed.startsWith("::")) {
                closelist(); closequote();

                var directiveheader = trimmed.slice(2).trim().toLowerCase();
                var parts = directiveheader.split(/\s+/).filter(Boolean);
                var dir = parts[0] || "";
                var args = parts.slice(1);
                var block = []; i++;
                while (i < lines.length && lines[i].trim() !== "::") block.push(lines[i++]);
                html.push(parsedirectiveblock(dir, args, block));
                continue;
            }

            // headings
            var heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
            if (heading) {
                closelist(); closequote();
                var lvl = heading[1].length;
                html.push("<h" + lvl + ">" + inlinewithcites(heading[2]) + "</h" + lvl + ">"); continue;
            }

            // separators
            if (/^---+$/.test(trimmed)) {
                closelist(); closequote();
                html.push("<hr>");
                continue;
            }

            // bullet point list
            if (/^[-*]\s+/.test(trimmed)) {
                closequote();
                if (!inlist) {
                    html.push('<ul class="articlelist">');
                    inlist = true;
                }
                html.push("<li>" + inlinewithcites(trimmed.replace(/^[-*]\s+/, "")) + "</li>");
                continue;
            }

            // quotes
            var quote = trimmed.match(/^>\s?(.*)$/);
            if (quote) {
                closelist();
                if (!inblockquote) {
                    html.push('<blockquote class="quote">');
                    inblockquote = true;
                }
                html.push("<p>" + inlinewithcites(quote[1]) + "</p>");
                continue;
            }

            // small text
            if (/^-#\s+/.test(trimmed)) {
                closelist();
                closequote();
                html.push('<p class="paragraph smalltext">' + inlinewithcites(trimmed.replace(/^-#\s+/, "")) + "</p>");
                continue;
            }
            closelist(); closequote();
            html.push('<p class="paragraph">' + inlinewithcites(trimmed) + "</p>");
        }
        closelist(); closequote();
        if (citationorder.length) {
            var refs = citationorder.map(function (id) {
                var def = citationdefs[id] || { desc: "", links: [] };
                var idx = citationsbyid[id];
                var chunks = [];
                if (def.desc) chunks.push(inlinewithcites(def.desc));
                if (def.links && def.links.length) {
                    var linkhtml = def.links.map(function (rawlink, linkidx) {
                        var safelink = sanitizehref(rawlink);
                        var linklabel;
                        if (def.desc) {
                            linklabel = def.links.length > 1 ? "Source " + (linkidx + 1) : "Source link";
                        } else {
                            linklabel = rawlink;
                        }
                        return buildlinkhtml(escapehtml(linklabel), safelink);
                    }).join(" ");
                    chunks.push(linkhtml);
                }
                if (!chunks.length) chunks.push('<span class="infoboxwarning">(no citation details, this is likely a mistake)</span>');
                return '<li id="cite' + idx + '">' + chunks.join(" ") + ' <a class="citeback" href="#" data-cite-target="citeref' + idx + '">↑</a></li>';
            }).join("");
            html.push('<section class="citations"><h2>References</h2><ol>' + refs + "</ol></section>");
        }
        activecitationrenderer = null;
        return html.join("\n");
    }

    function getarticlecandidates(hashval) {
        var parts = hashval.split(":");
        var hasprefix = parts.length > 1;
        var prefix = hasprefix ? parts[0].trim() : "";
        var raw = hasprefix ? parts.slice(1).join(":").trim() : hashval.trim();
        var pagename = raw.replace(/_/g, " ").replace(/\s+/g, " ").trim();
        var title = displaytitlefrompagename(pagename);
        var spaced = pagename;
        var hashtitle = hasprefix ? (prefix + ":" + spaced) : spaced;

        var candidates = hasprefix
            ? [
                "articles/~" + prefix + "/" + spaced + ".md",
                "articles/~" + prefix.toLowerCase() + "/" + spaced + ".md"
            ]
            : [
                "articles/" + spaced + ".md"
            ];

        return { title: title, hashtitle: hashtitle, candidates: candidates };
    }
    function hasblockededitprefix(hashval) {
        var parts = String(hashval || "").split(":");
        if (parts.length < 2) return false;
        var prefix = String(parts[0] || "").trim().toLowerCase();
        return reservedprefixes.indexOf(prefix) !== -1;
    }
    async function fetchfirstexisting(paths) {
        for (var i = 0; i < paths.length; i++) {
            var resp = await fetch(paths[i]);
            if (resp.ok) return { path: paths[i], markdown: await resp.text() };
        }
        return null;
    }

    /*//////////////////////////////////////////////////////////////////////*/

    function parseredirect(markdown) {
        var lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
        for (var i = 0; i < lines.length; i++) {
            var trimmed = lines[i].trim();
            if (!trimmed) continue;
            var m = trimmed.match(/^#redirect\s+\[\[([^\]]+)\]\]$/i);
            if (m) {
                return { target: String(m[1] || "").trim(), externalurl: "" };
            }
            var ext = trimmed.match(/^#redirect\s+(https:\/\/\S+)$/i);
            if (ext) {
                return { target: "", externalurl: String(ext[1] || "").trim() };
            }
            break;
        }
        return null;
    }
    function normalizedtargethash(target) {
        return "#" + String(target || "").trim();
    }
    function redirectnotice(fromname) {
        var safe = escapehtml(String(fromname || "").replace(/_/g, " "));
        var href = escapeattr("#" + String(fromname || "").trim());
        return '<p class="paragraph smalltext redirectnote">(Redirected from <a href="' + href + '">' + safe + "</a>)</p>";
    }
    function setpagetitle(hashtitle) {
        document.title = hashtitle + " - Cut the Rope Modding Wiki!";
    }
    function renderarticle(title, markdown, options) {
        options = options || {};
        var redirectedfrom = options.redirectedfrom || "";
        if (!contentroot) return;
        contentroot.innerHTML =
            maintitle.replace("$TITLE$", escapehtml(title)) +
            (redirectedfrom ? redirectnotice(redirectedfrom) : "") +
            markdowntohtml(markdown);
        if (window.Prism && typeof window.Prism.highlightAllUnder === "function") {
            window.Prism.highlightAllUnder(contentroot);
        }
        bindexpandableimages(contentroot);
        var citeanchors = contentroot.querySelectorAll("[data-cite-target]");
        citeanchors.forEach(function (anchor) {
            anchor.addEventListener("click", function (e) {
                e.preventDefault();
                var targetid = anchor.getAttribute("data-cite-target");
                if (!targetid) return;
                var target = document.getElementById(targetid);
                if (!target) return;
                target.scrollIntoView({ behavior: "smooth", block: "center" });
            });
        });
    }
    async function loadarticlefromhash() {
        if (!contentroot) return;

        var hashval = normalizehash();
        var inheritedredirectfrom = "";
        if (pendingredirectnotice && pendingredirectnotice.target === hashval) {
            inheritedredirectfrom = pendingredirectnotice.from || "";
            pendingredirectnotice = null;
        }
        var art = getarticlecandidates(hashval);
        var res = await fetchfirstexisting(art.candidates);
        setpagetitle(art.hashtitle);

        // 404 text, basically, feel free to adjust
        if (!res) {
            contentroot.innerHTML =
                maintitle.replace("$TITLE$", escapehtml(art.hashtitle)) +
                '<p class="paragraph">There is currently no text in this page. ' +
                'You can contribute by <a href="https://github.com/CtRHome/wiki/new/main/articles?filename=' + escapeattr(art.title) + '.md">creating it</a>!</p>';
            document.dispatchEvent(new CustomEvent("wiki:article-rendered", { detail: { hash: hashval } }));
            return;
        }

        var redirectfrom = inheritedredirectfrom; var seen = {}; var maxredirects = 8;
        var currenthash = hashval; var currentarticle = art;
        var currentres = res;
        for (var r = 0; r < maxredirects; r++) {
            var redirect = parseredirect(currentres.markdown);
            if (!redirect) break;
            if (redirect.externalurl) {
                window.location.replace(redirect.externalurl);
                return;
            }
            if (!redirect.target) break;
            if (!redirectfrom) redirectfrom = currenthash;
            var targethash = String(redirect.target).replace(/_/g, " ").replace(/\s+/g, " ").trim();
            if (!targethash || seen[targethash]) break;
            seen[targethash] = true;
            pendingredirectnotice = {target: targethash, from: redirectfrom};

            currenthash = targethash;
            currentarticle = getarticlecandidates(currenthash);
            setpagetitle(currentarticle.hashtitle);
            window.location.replace("#" + encodeURIComponent(targethash));
            var targetres = await fetchfirstexisting(currentarticle.candidates);
            if (!targetres) break;
            currentres = targetres;
        }
        renderarticle(currentarticle.hashtitle, currentres.markdown, { redirectedfrom: redirectfrom });
        document.dispatchEvent(new CustomEvent("wiki:article-rendered", { detail: { hash: currenthash } }));
    }

    window.WikiMarkdown = {
        markdowntohtml: markdowntohtml, renderarticle: renderarticle,
        normalizehash: normalizehash, displaytitlefrompagename: displaytitlefrompagename,
        getarticlecandidates: getarticlecandidates, fetchfirstexisting: fetchfirstexisting,
        loadarticlefromhash: loadarticlefromhash, hasblockededitprefix: hasblockededitprefix
    };

    window.addEventListener("hashchange", loadarticlefromhash);
    document.addEventListener("DOMContentLoaded", loadarticlefromhash);
})();
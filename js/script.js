"use strict";


window.onerror = function (msg, url, line, column, err) {
    if (msg.indexOf("Permission denied") > -1) return;
    if (msg.indexOf("Object expected") > -1 && url.indexOf("epub") > -1) return;
    document.querySelector(".app .error").classList.remove("hidden");
    document.querySelector(".app .error .error-title").innerHTML = "Error";
    document.querySelector(".app .error .error-description").innerHTML = "Please try reloading the page or using a different browser (Chrome or Firefox), and if the error still persists, <a href=\"https://github.com/geek1011/ePubViewer/issues\">report an issue</a>.";
    document.querySelector(".app .error .error-info").innerHTML = msg;
    document.querySelector(".app .error .error-dump").innerHTML = JSON.stringify({
        error: err.toString(),
        stack: err.stack,
        msg: msg,
        url: url,
        line: line,
        column: column,
    });
};


/* Call functions search, settings change, change location, prev & next buttons, open file button
======================================= */

let App = function (el) {
    this.appElm = el;
    this.bookmArr = [];
    this.state = {};
    this.doReset();

    document.body.addEventListener("keyup", this.onKeyUp.bind(this));

    this.qsa(".menu-bar .menu-tool").forEach(el => {
        el.onmouseover = function() {
            let tooltip = this.querySelector(".menu-tooltip");
            if(tooltip) {
                tooltip.classList.add("tooltip-active");
                this.onmouseleave = () => tooltip.classList.remove("tooltip-active");
            }
            return;
        }
    }); 
    
    this.qsa(".tab-list .tab-item").forEach(el => el.addEventListener("click", this.onTabClick.bind(this, el.dataset.tab)));
    
    this.qs(".tab[data-tab=search] .search-bar .search-input").addEventListener("keydown", event => {
        if (event.keyCode == 13)
            this.qs(".tab[data-tab=search] .search-bar .do-search").click();
        else if (event.keyCode == 8 || event.keyCode == 46) //on backspace or delete click
            this.qs(".search-results").innerHTML = "";
    });
    this.qs(".tab[data-tab=search] .search-bar .do-search").addEventListener("click", this.onSearchClick.bind(this));
    
    
    this.qs(".do-bookmark").addEventListener("click", this.makeBookmark.bind(this));
    this.qs(".new-bookmark .bookmark-input").addEventListener("keydown", event => {
        if(event.keyCode == 13) {
            this.makeBookmark();
        }
    });
    
    //temporary!!!
    this.qsa(".modal").forEach(el => el.addEventListener("click", e => {
        if(e.target != el && !e.target.classList.contains("close-btn"))
            return;
        else
            el.classList.add("hidden");
    }));


    // this.qs(".sidebar-wrapper").addEventListener("click", event => {
    //     try {
    //         if (event.target.classList.contains("sidebar-wrapper")) event.target.classList.add("out");
    //     } catch (err) {
    //         this.fatal("error hiding sidebar", err);
    //     }
    // });
    // Old version
    // this.qsa(".chips[data-chips]").forEach(el => {
    //     Array.from(el.querySelectorAll(".chip[data-value]")).forEach(cel => cel.addEventListener("click", event => {
    //         this.setChipActive(el.dataset.chips, cel.dataset.value);
    //     }));
    // });

    // New version
    this.qsa(".settings-row[data-type]").forEach(el => {
        Array.from(el.querySelectorAll(".settings-item[data-value]")).forEach(cel => cel.addEventListener("click", event => {
            this.setChipActive(el.dataset.type, cel.dataset.value);
        }));
    });

    this.qs("button.prev").addEventListener("click", () => this.state.rendition.prev());
    this.qs("button.next").addEventListener("click", () => this.state.rendition.next());
    // this.qs("button.open").addEventListener("click", () => this.doOpenBook());

    // try {
    //     this.qs(".bar .loc").style.cursor = "pointer";
    //     this.qs(".bar .loc").addEventListener("click", event => {
    //         try {
    //             let answer = prompt(`Location to go to (up to ${this.state.book.locations.length()})?`, this.state.rendition.currentLocation().start.location);
    //             if (!answer) return;
    //             answer = answer.trim();
    //             if (answer == "") return;

    //             let parsed = parseInt(answer, 10);
    //             if (isNaN(parsed) || parsed < 0) throw new Error("Invalid location: not a positive integer");
    //             if (parsed > this.state.book.locations.length()) throw new Error("Invalid location");

    //             let cfi = this.state.book.locations.cfiFromLocation(parsed);
    //             if (cfi === -1) throw new Error("Invalid location");

    //             this.state.rendition.display(cfi);
    //         } catch (err) {
    //             alert(err.toString());
    //         }
    //     });
    // } catch (err) {
    //     this.fatal("error attaching event handlers for location go to", err);
    //     throw err;
    // }

    // this.doTab("toc");

    try {
        this.loadSettingsFromStorage();
    } catch (err) {
        this.fatal("error loading settings", err);
        throw err;
    }
    this.applyTheme();
};



App.prototype.doBook = function (url, opts) {
    this.qs(".book").innerHTML = "Loading";

    opts = opts || {
        encoding: "epub"
    };
    console.log("doBook", url, opts);
    console.log("HACER LIBRO");
    this.doReset();

    try {
        this.state.book = ePub(url, opts);
        this.qs(".book").innerHTML = "";
        this.state.rendition = this.state.book.renderTo(this.qs(".book"), {});
    } catch (err) {
        this.fatal("error loading book", err);
        throw err;
    }

    this.state.book.ready.then(this.onBookReady.bind(this)).catch(this.fatal.bind(this, "error loading book"));

    this.state.book.loaded.navigation.then(this.onNavigationLoaded.bind(this)).catch(this.fatal.bind(this, "error loading toc"));
    this.state.book.loaded.metadata.then(this.onBookMetadataLoaded.bind(this)).catch(this.fatal.bind(this, "error loading metadata"));
    // this.state.book.loaded.cover.then(this.onBookCoverLoaded.bind(this)).catch(this.fatal.bind(this, "error loading cover"));

    this.state.rendition.hooks.content.register(this.applyTheme.bind(this));
    this.state.rendition.hooks.content.register(this.loadFonts.bind(this));

    this.state.rendition.on("relocated", this.onRenditionRelocated.bind(this));
    this.state.rendition.on("click", this.onRenditionClick.bind(this));
    this.state.rendition.on("keyup", this.onKeyUp.bind(this));
    this.state.rendition.on("displayed", this.onRenditionDisplayedTouchSwipe.bind(this));
    this.state.rendition.on("relocated", this.onRenditionRelocatedUpdateIndicators.bind(this));
    this.state.rendition.on("relocated", this.onRenditionRelocatedSavePos.bind(this));
    this.state.rendition.on("started", this.onRenditionStartedRestorePos.bind(this));
    this.state.rendition.on("started", this.restoreBookm.bind(this));
    this.state.rendition.on("displayError", this.fatal.bind(this, "error rendering book"));

    this.state.rendition.display();

    // if (this.state.dictInterval)
    //     window.clearInterval(this.state.dictInterval);
    // this.state.dictInterval = window.setInterval(this.checkDictionary.bind(this), 50);
    // this.doDictionary(null);
};

App.prototype.loadSettingsFromStorage = function () {
    ["theme", "font"].forEach(container => this.restoreChipActive(container));
    this.changeFS(0, localStorage.getItem(`ePubViewer:font-size`));
};

/* Setting buttons
======================================= */

//*
App.prototype.restoreChipActive = function (container) {
    let v = localStorage.getItem(`ePubViewer:${container}`);
    if (v)
        return this.setChipActive(container, v);
    this.setDefaultChipActive(container);
};

App.prototype.setDefaultChipActive = function (container) {
    let el = this.qs(`.settings-row[data-type='${container}']`).querySelector(".settings-item[data-default]");
    this.setChipActive(container, el.dataset.value);
    return el.dataset.value;
};

// Old version 
// App.prototype.setChipActive = function (container, value) {
//     Array.from(this.qs(`.chips[data-chips='${container}']`).querySelectorAll(".chip[data-value]")).forEach(el => {
//         el.classList[el.dataset.value == value ? "add" : "remove"]("active");
//     });
//     localStorage.setItem(`ePubViewer:${container}`, value);
//     this.applyTheme();
//     if (this.state.rendition && this.state.rendition.location) this.onRenditionRelocatedUpdateIndicators(this.state.rendition.location);
//     return value;
// };

// App.prototype.getChipActive = function (container) {
//     let el = this.qs(`.chips[data-chips='${container}']`).querySelector(".chip.active[data-value]");
//     if (!el) return this.qs(`.chips[data-chips='${container}']`).querySelector(".chip[data-default]");
//     return el.dataset.value;
// };


// New version 
App.prototype.setChipActive = function (container, value) {
    Array.from(this.qs(`.settings-row[data-type='${container}']`).querySelectorAll(".settings-item[data-value]")).forEach(el => {
        el.classList[el.dataset.value == value ? "add" : "remove"]("active");
    });
    localStorage.setItem(`ePubViewer:${container}`, value);
    this.applyTheme();
    if (this.state.rendition && this.state.rendition.location)
        this.onRenditionRelocatedUpdateIndicators(this.state.rendition.location);
    return value;
};

App.prototype.getChipActive = function (container) {
    console.log("container : ");
    console.dir(container);
    let el = this.qs(`.settings-row[data-type='${container}']`).querySelector(".settings-item.active[data-value]");
    if (!el) return this.qs(`.settings-row[data-type='${container}']`).querySelector(".settings-item[data-default]");
    return el.dataset.value;
};

App.prototype.changeFS = function(mode, set) {
    let fontEl = this.qs("[data-font-size]"),
        sizes = [4,8,9,10,12,14,16,18,30],
        currFZ = +fontEl.dataset.fontSize,
        btns = this.qsa("[data-font-size] .settings-item");

    btns[0].classList.remove('disabled');
    btns[1].classList.remove('disabled');

    if (mode == -1 && currFZ == 8) {
        btns[0].classList.add('disabled');
        return;
    }
    else if ( mode == 1 && currFZ == 18) {
        btns[1].classList.add('disabled');
        return;
    }
    currFZ = !set ? sizes[sizes.indexOf(currFZ) + mode] : set;
    fontEl.dataset.fontSize = currFZ;
    localStorage.setItem(`ePubViewer:font-size`, currFZ);
    this.applyTheme();
}


//Bookmarks

// App.onBookmItemClick = function (href, event) {
//     this.state.rendition.display(this.state.book.locations.cfiFromLocation(href)).catch(err => console.warn("error displaying page", err));
//     this.qsa(".modal").forEach(el => el.classList.add("hidden"));
//     event.stopPropagation();
//     event.preventDefault();
// }
App.prototype.makeBookmark = function () {
    let textInput = this.qs(".new-bookmark .bookmark-input"),
        text = textInput.value.trim();

    if (!text) return;

    this.addBookm({title: text, href: this.qs(".rangebar").value});
    textInput.value = "";
    this.qs(".menu-bar .bookmark-tool").classList.add("bookmarked");
}
App.prototype.addBookm = function (item) {
    console.log(item);
    this.bookmArr.push(item);
    this.updateBookm();
}
App.prototype.rmBookm = function (index) {
    this.bookmArr.splice(index, 1);
    this.updateBookm();
}
App.prototype.updateBookm = function () {
    let bookmElm = this.qs(".tab[data-tab=bookmarks] .bookmark-list");
        bookmElm.innerHTML = "";

    this.bookmArr.forEach((item, i) => {
        let bookmark = bookmElm.appendChild(this.el("div", "bookmark")),
            a = bookmark.appendChild(this.el("a", "bookmark-item")),
            btn = bookmark.appendChild(this.el("span", "rm-bookmark"));

        a.href = a.dataset.href = item.href;
        a.innerText = item.title;
        a.addEventListener("click", event => {
            this.state.rendition.display(this.state.book.locations.cfiFromLocation(item.href)).catch(err => console.warn("error displaying page", err));
            this.qsa(".modal").forEach(el => el.classList.add("hidden"));
            event.stopPropagation();
            event.preventDefault();
        });

        btn.addEventListener("click", () => {
            this.rmBookm(i);
        });
    });

    this.storeBookm();
}

App.prototype.storeBookm = function () {
    localStorage.setItem(`${this.state.book.key()}:bookm`, JSON.stringify(this.bookmArr));
}

App.prototype.restoreBookm = function () {
    let localBookm = JSON.parse(localStorage.getItem(`${this.state.book.key()}:bookm`));
    if(localBookm) {
        this.bookmArr = localBookm;
        this.updateBookm();
    }
}

App.prototype.doOpenBook = function () {
    var fi = document.createElement("input");

    fi.setAttribute("accept", "application/epub+zip");
    fi.style.display = "none";
    fi.type = "file";


    fi.onchange = event => {
        var reader = new FileReader();

        reader.addEventListener("load", () => {
            var arr = (new Uint8Array(reader.result)).subarray(0, 2);

            var header = "";
            for (var i = 0; i < arr.length; i++) {
                header += arr[i].toString(16);
            }if (header == "504b") {
                this.doBook(reader.result, {
                    encoding: "binary"
                });
            } else {
                this.fatal("invalid file", "not an epub book");
            }
        }, false);

        
        console.log(fi.files[0]);

        if (fi.files[0]) {
            reader.readAsArrayBuffer(fi.files[0]);
        }
    };
    document.body.appendChild(fi);
    fi.click();
    // console.log(fi)
};

App.prototype.fatal = function (msg, err, usersFault) {
    console.error(msg, err);
    document.querySelector(".app .error").classList.remove("hidden");
    document.querySelector(".app .error .error-title").innerHTML = "Error";
    document.querySelector(".app .error .error-description").innerHTML = usersFault ? "" : "Please try reloading the page or using a different browser, and if the error still persists, <a href=\"https://github.com/geek1011/ePubViewer/issues\">report an issue</a>.";
    document.querySelector(".app .error .error-info").innerHTML = msg + ": " + err.toString();
    document.querySelector(".app .error .error-dump").innerHTML = JSON.stringify({
        error: err.toString(),
        stack: err.stack
    });
};

App.prototype.doReset = function () {
    // if (this.state.dictInterval) window.clearInterval(this.state.dictInterval);
    if (this.state.rendition) this.state.rendition.destroy();
    if (this.state.book) this.state.book.destroy();
    this.state = {
        book: null,
        rendition: null
    };
    // this.qs(".sidebar-wrapper").classList.add("out");
    this.qs(".menu-bar .book-title").innerHTML = "";
    this.qs(".menu-bar .book-author").innerHTML = "";
    this.qs(".tab[data-tab=bookmarks] .bookmark-list").innerHTML = "";
    // this.qs(".bar .loc").innerHTML = "";
    this.qs(".search-results").innerHTML = "";
    this.qs(".search-input").value = "";
    this.qs(".chapter-list").innerHTML = "";
    // this.qs(".info .cover").src = "";
    // this.qs(".info .title").innerHTML = "";
    // this.qs(".info .series-info").classList.remove("hidden");
    // this.qs(".info .series-name").innerHTML = "";
    // this.qs(".info .series-index").innerHTML = "";
    // this.qs(".info .author").innerHTML = "";
    // this.qs(".info .description").innerHTML = "";
    this.qs(".book").innerHTML = '<div class="empty-wrapper"><div class="empty"><div class="app-name">ePubViewer</div><div class="message"><a href="javascript:ePubViewer.doOpenBook();" class="big-button">Open a Book</a></div></div></div>';
    // this.qs(".sidebar-button").classList.add("hidden");
    this.qs("button.prev").classList.add("hidden");
    this.qs("button.next").classList.add("hidden");
    // this.doDictionary(null);
};

App.prototype.qs = function (q) {
    return this.appElm.querySelector(q);
};

App.prototype.qsa = function (q) {
    return Array.from(this.appElm.querySelectorAll(q));
};

App.prototype.el = function (t, c) {
    let e = document.createElement(t);
    if (c) e.classList.add(c);
    return e;
};

App.prototype.onBookReady = function (event) {
    // this.qs(".sidebar-button").classList.remove("hidden");
    this.qs("button.prev").classList.remove("hidden");
    this.qs("button.next").classList.remove("hidden");


    console.log("bookKey", this.state.book.key());

    // this.qs(".info .cover").src = "./images/logo.png";

    let chars = 1650;
    let key = `${this.state.book.key()}:locations-${chars}`;
    let stored = localStorage.getItem(key);
    console.log("storedLocations", typeof stored == "string" ? stored.substr(0, 40) + "..." : stored);

    if (stored) return this.state.book.locations.load(stored);
    console.log("generating locations");
    return this.state.book.locations.generate(chars).then(() => {
        localStorage.setItem(key, this.state.book.locations.save());
        console.log("locations generated", this.state.book.locations);
    }).catch(err => console.error("error generating locations", err));


    //?????
    // this.qs(".item").addEventListener("click", myFunction);

    // function myFunction() {
    //     document.getElementsByClassName("item").css("display","none");
    // }
};


/* Markers & chapters click function
======================================= */

App.prototype.onTocItemClick = function (href, event) {
    console.log("tocClick", href);

    this.state.rendition.display(href).catch(err => console.warn("error displaying page", err));
    this.qsa(".modal").forEach(el => el.classList.add("hidden"));
    event.stopPropagation();
    event.preventDefault();

    // document.getElementsByClassName("item").addEventListener("click", myFunction);

    // function myFunction() {
    //     document.getElementsByClassName("item").css("display","none");
    // }
};

App.prototype.getNavItem = function(loc, ignoreHash) {
    return (function flatten(arr) {
        return [].concat(...arr.map(v => [v, ...flatten(v.subitems)]));
    })(this.state.book.navigation.toc).filter(
        item => ignoreHash ?
            this.state.book.canonical(item.href).split("#")[0] == this.state.book.canonical(loc.start.href).split("#")[0] :
            this.state.book.canonical(item.href) == this.state.book.canonical(loc.start.href)
    )[0] || null;
};

App.prototype.onNavigationLoaded = function (nav) {
    console.log("navigation", nav);
    let toc = this.qs(".chapter-list");
    toc.innerHTML = "";
    let handleItems = (items, indent) => {
        items.forEach(item => {
            let a = toc.appendChild(this.el("a", "chapter-item"));
            a.href = a.dataset.href = item.href;
            a.innerHTML = item.label.trim();

            if(indent > 0 && item.subitems.length < 1)
                a.classList.add("level-3");
            else if (indent == 0)
                a.classList.add("level-1");
            else
                a.classList.add("level-2");

            // a.innerHTML = `${'&nbsp'.repeat(indent*4)} ${item.label.trim()}`;
            a.addEventListener("click", this.onTocItemClick.bind(this, item.href));
            handleItems(item.subitems, indent + 1);
        });
    };
    handleItems(nav.toc, 0);
};

App.prototype.onRenditionRelocated = function (event) {
    // try {this.doDictionary(null);} catch (err) {}
    try {
        let navItem = this.getNavItem(event, false) || this.getNavItem(event, true);
        this.qsa(".chapter-list .chapter-item").forEach(el => el.classList[(navItem && el.dataset.href == navItem.href) ? "add" : "remove"]("active"));
    } catch (err) {
        this.fatal("error updating toc", err);
    }
};

App.prototype.onBookMetadataLoaded = function (metadata) {
    console.log("metadata", metadata);
    this.qs(".menu-bar .book-title").innerText = this.qs(".tabs-wrapper .book-name").innerText = metadata.title.trim();
    this.qs(".menu-bar .book-author").innerText = metadata.creator.trim();
    // this.qs(".info .title").innerText = metadata.title.trim();
    // this.qs(".info .author").innerText = metadata.creator.trim();
    // if (!metadata.series || metadata.series.trim() == "") this.qs(".info .series-info").classList.add("hidden");
    // this.qs(".info .series-name").innerText = metadata.series.trim();
    // this.qs(".info .series-index").innerText = metadata.seriesIndex.trim();
    // this.qs(".info .description").innerText = metadata.description;
    // if (sanitizeHtml) this.qs(".info .description").innerHTML = sanitizeHtml(metadata.description);
};

App.prototype.onBookCoverLoaded = function (url) {
    if (!url)
        return;
    if (!this.state.book.archived) {
        this.qs(".cover").src = url;
        return;
    }
    this.state.book.archive.createUrl(url).then(url => {
        this.qs(".cover").src = url;
    }).catch(this.fatal.bind(this, "error loading cover"));
};


/* Prev && Next by arrows
======================================= */

App.prototype.onKeyUp = function (event) {
    let kc = event.keyCode || event.which;
    let b = null;
    if (kc == 37) {
        this.state.rendition.prev();
        b = this.qs(".app .bar button.prev");
    } else if (kc == 39) {
        this.state.rendition.next();
        b = this.qs(".app .bar button.next");
    }
    if (b) {
        b.style.transform = "scale(1.15)";
        window.setTimeout(() => b.style.transform = "", 150);
    }
};

App.prototype.onRenditionClick = function (event) {
    try {
        if (event.target.tagName.toLowerCase() == "a" && event.target.href) return;
        if (event.target.parentNode.tagName.toLowerCase() == "a" && event.target.parentNode.href) return;
        if (window.getSelection().toString().length !== 0) return;
        if (this.state.rendition.manager.getContents()[0].window.getSelection().toString().length !== 0) return;
    } catch (err) {}

    let wrapper = this.state.rendition.manager.container;
    let third = wrapper.clientWidth / 3;
    let x = event.pageX - wrapper.scrollLeft;
    let b = null;
    /*if (x > wrapper.clientWidth - 20) {
        event.preventDefault();
        // this.doSidebar();
    } else*/ if (x < third) {
        event.preventDefault();
        this.state.rendition.prev();
        b = this.qs(".bar button.prev");
    } else if (x > (third * 2)) {
        event.preventDefault();
        this.state.rendition.next();
        b = this.qs(".bar button.next");
    }
    if (b) {
        b.style.transform = "scale(1.15)";
        window.setTimeout(() => b.style.transform = "", 150);
    }
};

App.prototype.onRenditionDisplayedTouchSwipe = function (event) {
    let start = null
    let end = null;
    const el = event.document.documentElement;

    el.addEventListener('touchstart', event => {
        start = event.changedTouches[0];
    });
    el.addEventListener('touchend', event => {
        end = event.changedTouches[0];

        let hr = (end.screenX - start.screenX) / el.getBoundingClientRect().width;
        let vr = (end.screenY - start.screenY) / el.getBoundingClientRect().height;

        if (hr > vr && hr > 0.25) return this.state.rendition.prev();
        if (hr < vr && hr < -0.25) return this.state.rendition.next();
        if (vr > hr && vr > 0.25) return;
        if (vr < hr && vr < -0.25) return;
    });
};


/* Change Themes
======================================= */

App.prototype.applyTheme = function () {
    let viewerElm = this.qs(".app .viewer");

    let theme = {
        linkColor: "#1e83d2",
        textAlign: "justify",
        fontFamily: this.getChipActive("font"),
        fontSize: this.qs("[data-font-size]").dataset.fontSize + 'pt',
        // lineHeight: 1
    };

    [theme.bodyBg, theme.viewerBg, theme.viewerShadowColor, theme.fontColor] = this.getChipActive("theme").split(";");

    let rules = {
        "body": {
            "background": theme.viewerBg,
            "color": theme.fontColor != "" ? `${theme.fontColor} !important` : "!invalid-hack",
            "font-family": theme.fontFamily != "" ? `${theme.fontFamily} !important` : "!invalid-hack",
            "font-size": theme.fontSize != "" ? `${theme.fontSize} !important` : "!invalid-hack",
            "line-height": `${theme.lineHeight} !important`,
            "text-align": `${theme.textAlign} !important`,
            "padding": `${theme.margin} 0`,
        },
        "p": {
            "font-family": theme.fontFamily != "" ? `${theme.fontFamily} !important` : "!invalid-hack",
            "font-size": theme.fontSize != "" ? `${theme.fontSize} !important` : "!invalid-hack",
            "color": theme.fontColor != "" ? `${theme.fontColor} !important` : "!invalid-hack",
        },
        "a": {
            "color": "inherit !important",
            "text-decoration": "none !important",
            "-webkit-text-fill-color": "inherit !important"
        },
        "a:link": {
            "color": `${theme.linkColor} !important`,
            "text-decoration": "none !important",
            "-webkit-text-fill-color": `${theme.linkColor} !important`
        },
        "a:link:hover": {
            "background": "rgba(0, 0, 0, 0.1) !important"
        },
        "img": {
            "max-width": "100% !important"
        },
    };

    try {
        this.appElm.style.background = theme.bodyBg;
        viewerElm.style.background = theme.viewerBg;
        viewerElm.style.boxShadow = `0 0 10px ${theme.viewerShadowColor}`;
        // this.appElm.style.fontFamily = theme.fontFamily;
        // this.appElm.style.color = theme.fontColor;
        if(this.state.rendition) this.state.rendition.getContents().forEach(c => c.addStylesheetRules(rules));
    } catch (err) {
        console.error("error applying theme", err);
    }
};

App.prototype.loadFonts = function() {
    this.state.rendition.getContents().forEach(c => {
        [
            "https://fonts.googleapis.com/css?family=Arbutus+Slab",
            "https://fonts.googleapis.com/css?family=Lato:400,400i,700,700i"
        ].forEach(url => {
            let el = c.document.body.appendChild(c.document.createElement("link"));
            el.setAttribute("rel", "stylesheet");
            el.setAttribute("href", url);
        });
    });
};



/* Progress bar
======================================= */
App.prototype.updateRangeBar = function (r) {
    let x = r.value / r.max;
    r.style.backgroundImage = [
        '-webkit-gradient(',
            'linear, ',
            'left top, ',
            'right top, ',
            'color-stop(' + x + ', #3d66ef), ',
            'color-stop(' + x + ', #e6e6e6)',
        ')' 
    ].join('');
}

App.prototype.onRenditionRelocatedUpdateIndicators = function (event) {
    try {
        //progress update
        let range = this.qs('.bar .rangebar');
        range.classList.remove('hidden');
        range.min = 0;
        range.max = this.state.book.locations.length() - 1 ;
        range.value = event.start.location;
        this.updateRangeBar(range);
        range.oninput = () => {
            this.updateRangeBar(range);
            this.state.rendition.display(this.state.book.locations.cfiFromLocation(range.value));
        }

        //bookmark indicator update
        let icon = this.qs(".menu-bar .bookmark-tool");
        for(let item of this.bookmArr) {
            if(item.href == event.start.location) {
                icon.classList.add("bookmarked");
                break;
            }

            icon.classList.remove("bookmarked");
        }
        
    } catch (err) {
        console.error("error updating indicators: " + err);
    }
};

App.prototype.onRenditionRelocatedSavePos = function (event) {
    localStorage.setItem(`${this.state.book.key()}:pos`, event.start.cfi);
};

/* Local storage position
======================================= */

App.prototype.onRenditionStartedRestorePos = function (event) {
    try {
        let stored = localStorage.getItem(`${this.state.book.key()}:pos`);
        console.log("storedPos", stored);
        if (stored) this.state.rendition.display(stored);
    } catch (err) {
        this.fatal("error restoring position", err);
    }
};

// App.prototype.checkDictionary = function () {
//     try {
//         let selection = (this.state.rendition.manager && this.state.rendition.manager.getContents().length > 0) ? this.state.rendition.manager.getContents()[0].window.getSelection().toString().trim() : "";
//         if (selection.length < 2 || selection.indexOf(" ") > -1) {
//             if (this.state.showDictTimeout) window.clearTimeout(this.state.showDictTimeout);
//             this.doDictionary(null);
//             return;
//         }
//         this.state.showDictTimeout = window.setTimeout(() => {
//             try {
//                 let newSelection = this.state.rendition.manager.getContents()[0].window.getSelection().toString().trim();
//                 if (newSelection == selection) this.doDictionary(newSelection);
//             } catch (err) {console.error(`showDictTimeout: ${err.toString()}`)}
//         }, 300);
//     } catch (err) {console.error(`checkDictionary: ${err.toString()}`)}
// };

// App.prototype.doDictionary = function (word) {
//     if (this.state.lastWord) if (this.state.lastWord == word) return;
//     this.state.lastWord = word;

//     if (!this.qs(".dictionary-wrapper").classList.contains("hidden")) console.log("hide dictionary");
//     this.qs(".dictionary-wrapper").classList.add("hidden");
//     this.qs(".dictionary").innerHTML = "";
//     if (!word) return;

//     console.log(`define ${word}`);
//     this.qs(".dictionary-wrapper").classList.remove("hidden");
//     this.qs(".dictionary").innerHTML = "";

//     let definitionEl = this.qs(".dictionary").appendChild(document.createElement("div"));
//     definitionEl.classList.add("definition");

//     let wordEl = definitionEl.appendChild(document.createElement("div"));
//     wordEl.classList.add("word");
//     wordEl.innerText = word;

//     let meaningsEl = definitionEl.appendChild(document.createElement("div"));
//     meaningsEl.classList.add("meanings");
//     meaningsEl.innerHTML = "Loading";

//     fetch(`https://dict.geek1011.net/word/${encodeURIComponent(word)}`).then(resp => {
//         if (resp.status >= 500) throw new Error(`Dictionary not available`);
//         return resp.json();
//     }).then(obj => {
//         if (obj.status == "error") throw new Error(`ApiError: ${obj.result}`);
//         return obj.result;
//     }).then(word => {
//         console.log("dictLookup", word);
//         meaningsEl.innerHTML = "";
//         wordEl.innerText = [word.word].concat(word.alternates || []).join(", ").toLowerCase();
        
//         if (word.info && word.info.trim() != "") {
//             let infoEl = meaningsEl.appendChild(document.createElement("div"));
//             infoEl.classList.add("info");
//             infoEl.innerText = word.info;
//         }
        
//         (word.meanings || []).map((meaning, i) => {
//             let meaningEl = meaningsEl.appendChild(document.createElement("div"));
//             meaningEl.classList.add("meaning");

//             let meaningTextEl = meaningEl.appendChild(document.createElement("div"));
//             meaningTextEl.classList.add("text");
//             meaningTextEl.innerText = `${i + 1}. ${meaning.text}`;

//             if (meaning.example && meaning.example.trim() != "") {
//                 let meaningExampleEl = meaningEl.appendChild(document.createElement("div"));
//                 meaningExampleEl.classList.add("example");
//                 meaningExampleEl.innerText = meaning.example;
//             }
//         });
        
//         if (word.credit && word.credit.trim() != "") {
//             let creditEl = meaningsEl.appendChild(document.createElement("div"));
//             creditEl.classList.add("credit");
//             creditEl.innerText = word.credit;
//         }
//     }).catch(err => {
//         try {
//             console.error("dictLookup", err);
//             if (err.toString().toLowerCase().indexOf("not in dictionary") > -1) {
//                 meaningsEl.innerHTML = "Word not in dictionary.";
//                 return;
//             }
//             if (err.toString().toLowerCase().indexOf("not available") > -1 || err.toString().indexOf("networkerror") > -1 || err.toString().indexOf("failed to fetch") > -1) {
//                 meaningsEl.innerHTML = "Dictionary not available.";
//                 return;
//             }
//             meaningsEl.innerHTML = `Dictionary not available: ${err.toString()}`;
//         } catch (err) {}
//     });
// };

App.prototype.doFullscreen = () => {
    document.fullscreenEnabled = document.fullscreenEnabled || document.mozFullScreenEnabled || document.documentElement.webkitRequestFullScreen;

    let requestFullscreen = element => {
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
        } else if (element.webkitRequestFullScreen) {
            element.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
        }
    };

    if (document.fullscreenEnabled) {
        requestFullscreen(document.documentElement);
    }
};

/* Search
======================================= */

App.prototype.doSearch = function (q) {
    return Promise.all(this.state.book.spine.spineItems.map(item => {
        return item.load(this.state.book.load.bind(this.state.book)).then(doc => {
            let results = item.find(q);
            item.unload();
            return Promise.resolve(results);
        });
    })).then(results => Promise.resolve([].concat.apply([], results)));
};

App.prototype.onResultClick = function (href, event) {
    console.log("tocClick", href);
    this.state.rendition.display(href);
    //temporary!!!
    this.qsa(".modal").forEach(el => el.classList.add("hidden"));
    event.stopPropagation();
    event.preventDefault();
};

App.prototype.doTab = function (tab) {
    try {
        this.qsa(".tab-list .tab-item").forEach(el => el.classList[(el.dataset.tab == tab) ? "add" : "remove"]("active"));
        this.qsa(".tab-container .tab").forEach(el => el.classList[(el.dataset.tab != tab) ? "remove" : "add"]("tab-active"));
        try {
            this.qs(".tab-wrapper").scrollTop = 0;
        } catch (err) {}
    } catch (err) {
        this.fatal("error showing tab", err);
    }
};

App.prototype.onTabClick = function (tab, event) {
    console.log("tabClick", tab);
    this.doTab(tab);
    event.stopPropagation();
    event.preventDefault();
};

App.prototype.onSearchClick = function (event) {
    let q = this.qs(".search-bar .search-input").value.trim();
    if(q == "") return;

    this.doSearch(q).then(results => {
        
        let resultContainer = this.qs(".tab[data-tab=search] .search-results"),
            resultsEl = document.createDocumentFragment();

        resultContainer.innerHTML = "";

        if(results.length > 0) {
            results.slice(0, 200).forEach(result => {
                let resultEl = resultsEl.appendChild(this.el("a", "search-item"));
                resultEl.href = result.cfi;
                resultEl.addEventListener("click", this.onResultClick.bind(this, result.cfi));
    
                let textEl = resultEl.appendChild(this.el("span", "text"));
                textEl.innerText = result.excerpt.trim();
    
                resultEl.appendChild(this.el("span", "pbar")).style.width = (this.state.book.locations.percentageFromCfi(result.cfi)*100).toFixed(3) + "%";
            });
    
            resultContainer.appendChild(resultsEl);
        } else {
            resultContainer.innerHTML = "<center>Matches not found</center>";
        }

    }).catch(err => this.fatal("error searching book", err));
};

//temporary!!!
App.prototype.doModal = function (activeTab) {
    this.qs(".modal").classList.toggle('hidden');
    this.doTab(activeTab);
};

let ePubViewer = null;

try {
    ePubViewer = new App(document.querySelector(".app"));
    let ufn = location.search.replace("?", "") || location.hash.replace("#", "");
    if (ufn.startsWith("!")) {
        ufn = ufn.replace("!", "");
        // document.querySelector(".app button.open").style = "display: none !important";
    }
    if (ufn) {
        fetch(ufn).then(resp => {
            if (resp.status != 200) throw new Error("response status: " + resp.status.toString() + " " + resp.statusText);
        }).catch(err => {
            ePubViewer.fatal("error loading book", err, true);
        });
        ePubViewer.doBook(ufn);
    }
} catch (err) {
    document.querySelector(".app .error").classList.remove("hidden");
    document.querySelector(".app .error .error-title").innerHTML = "Error";
    document.querySelector(".app .error .error-description").innerHTML = "Please try reloading the page or using a different browser (Chrome or Firefox), and if the error still persists, <a href=\"https://github.com/geek1011/ePubViewer/issues\">report an issue</a>.";
    document.querySelector(".app .error .error-dump").innerHTML = JSON.stringify({
        error: err.toString(),
        stack: err.stack
    });
}

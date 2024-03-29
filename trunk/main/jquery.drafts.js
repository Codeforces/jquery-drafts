(function ($) {
    var textareasToListen = [];
    var buttonsToListen = [];
    var textById = {};

    var updateButtonsPosition = function () {
        $.each(textareasToListen, function (index, textarea) {
            var button = buttonsToListen[index];
            var buttonContainer = textarea;
            if (buttonContainer.is(":hidden")) {
                button.hide();
            }

            var buttonContainerSelector = button.attr("buttonContainerSelector");
            if (buttonContainerSelector && buttonContainerSelector.length > 0) {
                buttonContainer = $($(buttonContainerSelector)[0]);
            }

            var xOffset = buttonContainer.get(0).clientWidth - button.outerWidth() - 6;
            var yOffset = 8;

            var buttonXOffset = button.attr("buttonXOffset");
            if (buttonXOffset) {
                xOffset += parseInt(buttonXOffset);
            }

            var buttonYOffset = button.attr("buttonYOffset");
            if (buttonYOffset) {
                yOffset += parseInt(buttonYOffset);
            }

            button.css("top", buttonContainer.position().top + yOffset);
            button.css("left", buttonContainer.position().left + xOffset);
            if (!buttonContainer.is(":hidden")) {
                button.show();
            }
        });
    };

    setInterval(updateButtonsPosition, 200);

    function showDraftsPopup(textarea, settings) {
        var popup = $(".drafts-popup");
        var entries = popup.find(".drafts-entries");
        entries.find(".drafts-button").click(function () {
            settings["useItHandler"](textarea, $(this).parent().prev().text());
            $(".drafts-popup").fadeOut();
        });
        popup.show();
        popup.css("top", pageYOffset);
    }

    function _escapeHtml(s) {
        return s
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function addDraftEntry(item, settings) {
        var popup = $(".drafts-popup");
        var entries = popup.find(".drafts-entries");
        var hasSame = false;
        entries.find(".drafts-entry-body").each(function () {
            if ($(this).text() === item.draft) {
                hasSame = true;
                return false;
            }
        });
        let time = "";
        if (item.time !== "") {
            time = new Date(item.time).toLocaleString();
        }
        if (!hasSame) {
            $("<pre class='drafts-entry-body'></pre>").text(item.draft).appendTo(entries);
            $("<div class='drafts-entry-actions' style='display: inline'><span class='drafts-button'>" + settings["textUseIt"] + "</span></div><span class='drafts-creation-time'> " + _escapeHtml(time) + "</span>").appendTo(entries);
        }
    }

    function addFromLocalStorage(publicKey, key, settings) {
        if (publicKey && key) {
            var text = window.localStorage["draft-" + publicKey];
            let time = window.localStorage["draft-time-" + publicKey];
            if (text) {
                try {
                    text = sjcl.decrypt(key, text);
                    if (time) {
                        time = sjcl.decrypt(key, time);
                    } else {
                        time = "";
                    }
                    addDraftEntry({draft: text, time: time}, settings);
                } catch (e) {
                    window.localStorage.removeItem("draft-" + publicKey);
                }
            }
        }
    }

    function putToLocalStorage(publicKey, key, text, time) {
        if (publicKey && key && text) {
            if (window.localStorage) {
                window.localStorage["draft-" + publicKey] = sjcl.encrypt(key, text);
                if (time) {
                    window.localStorage["draft-time-" + publicKey] = sjcl.encrypt(key, time);
                }
            }
        }
    }

    $.fn.drafts = function (options) {
        var settings = $.extend({
            textDrafts: 'Drafts',
            textUseIt: 'Use it',
            url: '/data/drafts.php',
            pollDelay: 10000,
            showDelay: 2500,
            saveErrorMessage: "Can't save draft. Possibly connection is lost or session is expired. Stay on the page (cancel to reload)?",
            useItHandler: function (textarea, text) {
                textarea.val(text);
                textarea.trigger("paste.autoResize");
            }
        });

        $.extend(settings, options);

        var textareas = this;
        var hasDraftsPrototype = false;
        var hasDraftsPopup = false;

        setTimeout(function () {
            textareas.each(function () {
                var textarea = $(this);
                if (textarea.parent()[0].tagName.toLowerCase() === "arclones") {
                    return;
                }

                if (!hasDraftsPrototype && $(".drafts-prototype").length === 0) {
                    $("<div class=\"drafts-prototype drafts-show-drafts\"><span class=\"drafts-button drafts-online\">"
                        + settings["textDrafts"]
                        + "</span></div>").appendTo($("body"));
                    hasDraftsPrototype = true;
                }

                if (!hasDraftsPopup && $(".drafts-popup").length === 0) {
                    $("<div class=\"drafts-popup\"><div class=\"drafts-close\">&times;</div><h1>"
                        + settings["textDrafts"]
                        + "</h1><div class=\"drafts-entries\"></div></div>").appendTo($("body"));
                    hasDraftsPopup = true;
                }

                if (textarea.prop("tagName").toLowerCase() !== "textarea") {
                    $.error("jquery.drafts.js can be used only for textareas, but " + textarea.prop("tagName").toLowerCase() + " found.");
                }

                if (!textarea.attr("data-drafts-id")) {
                    $.error("jquery.drafts.js requires textarea to have attribute data-drafts-id.");
                }

                var id = textarea.attr("data-drafts-id");
                var publicKey;
                var key;

                var textChanged = false;
                window.setTimeout(function () {
                    textarea.change(function () {
                        textChanged = true;
                    });
                    textarea.bind('input propertychange', function () {
                        textChanged = true;
                    });
                }, 10000);

                window.setInterval(function () {
                    if (!key) {
                        $.post(settings["url"], {action: 'getKey', id: id}, function (result) {
                            publicKey = result["publicKey"];
                            key = result["key"];
                            let text = window.localStorage["draft-" + publicKey];
                            let time = window.localStorage["draft-time-" + publicKey];
                            if (text) {
                                text = sjcl.decrypt(key, text);
                                if (time) {
                                    time = sjcl.decrypt(key, time);
                                } else {
                                    time = new Date().toISOString();
                                }
                                $.post(settings["url"], {action: 'put', id: id, text: text, time: time});
                            }
                        }, "json");
                    }
                    if (key && textChanged) {
                        putToLocalStorage(publicKey, key, textarea.val(), new Date().toISOString());
                        textChanged = false;
                    }
                }, 1000);

                var button = $(".drafts-prototype").clone()
                    .removeClass("drafts-prototype")
                    .css("opacity", "0.2");

                button.mouseover(function () {
                    button.css("opacity", "1.0");
                });

                button.mouseleave(function () {
                    button.css("opacity", "0.2");
                });

                button.click(function () {
                    var popup = $(".drafts-popup");
                    var entries = popup.find(".drafts-entries");
                    entries.empty();
                    addFromLocalStorage(publicKey, key, settings);
                    showDraftsPopup(textarea, settings);

                    $.post(settings["url"], {action: 'get', id: id}, function (items) {
                        // entries.empty();
                        // addFromLocalStorage(publicKey, key, settings);

                        entries.empty();
                        let localDraft = undefined;
                        if (publicKey) {
                            let text = window.localStorage["draft-" + publicKey];
                            let time = window.localStorage["draft-time-" + publicKey];
                            if (key && text) {
                                text = sjcl.decrypt(key, text);
                                if (time) {
                                    time = sjcl.decrypt(key, time);
                                } else {
                                    time = "";
                                }
                                localDraft = {draft: text, time: time};
                            }
                        }

                        let draftsAndTimes = [];
                        if (localDraft) {
                            draftsAndTimes.push(localDraft);
                        }
                        $.each(items, function (draft, time) {
                            draftsAndTimes.push({
                                draft: draft,
                                time: time
                            });
                        })
                        draftsAndTimes.sort(function (lhs, rhs) {
                            if (lhs.time === "" && rhs.time === "") {
                                return 0;
                            } else if (lhs.time === "") {
                                return 1;
                            } else if (rhs.time === "") {
                                return -1;
                            } else {
                                return Date.parse(rhs.time) - Date.parse(lhs.time);
                            }
                        });
                        draftsAndTimes.forEach(element => addDraftEntry(element, settings));
                        showDraftsPopup(textarea, settings);
                    }, "json");
                });

                var buttonXOffset = settings["buttonXOffset"];
                if (buttonXOffset) {
                    button.attr("buttonXOffset", buttonXOffset);
                }

                var buttonYOffset = settings["buttonYOffset"];
                if (buttonYOffset) {
                    button.attr("buttonYOffset", buttonYOffset);
                }

                var buttonContainerSelector = settings["buttonContainerSelector"];
                if (buttonContainerSelector && buttonContainerSelector.length > 0) {
                    button.attr("buttonContainerSelector", buttonContainerSelector);
                    $($(buttonContainerSelector)[0]).append(button);
                } else {
                    $(textarea.parent()).append(button);
                }

                button.css("position", "absolute");

                textareasToListen.push(textarea);
                buttonsToListen.push(button);
                updateButtonsPosition();

                $(".drafts-popup .drafts-close").click(function () {
                    $(".drafts-popup").fadeOut();
                });
                $(document).keydown(function(e) {
                    if (e.keyCode === 27) {
                        $(".drafts-popup").fadeOut();
                    }
                });

                window.setInterval(function () {
                    var text = textarea.val();
                    var innerButton = button.find(".drafts-button");
                    if (textById[id] === text) {
                        return;
                    }
                    textById[id] = text;
                    $.post(settings["url"], {action: 'put', id: id, text: text, time: new Date().toISOString()}, function (response) {
                        if (response === "OK") {
                            if (!innerButton.hasClass("drafts-online")) {
                                innerButton.removeClass("drafts-offline");
                                innerButton.addClass("drafts-online");
                            }
                        } else {
                            if (!innerButton.hasClass("drafts-offline")) {
                                innerButton.removeClass("drafts-online");
                                innerButton.addClass("drafts-offline");
                            }
                        }
                    }, "json").fail(function () {
                        if (!innerButton.hasClass("drafts-offline")) {
                            innerButton.removeClass("drafts-online");
                            innerButton.addClass("drafts-offline");
                        }
                    });
                }, settings["pollDelay"]);
            });
        }, settings["showDelay"]);

        return this;
    };
})(jQuery);

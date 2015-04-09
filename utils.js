/**
 * String扩展
*/
$.extend(String.prototype, {
    /**
     * 移除字符串中的html标签，whiteList中的标签保留
    */
    trimTags: function(whiteList) {
        var replacement = '';
        if(whiteList && whiteList.length) {
            replacement = function(matchStr, matchTag) {
                return ($.inArray(matchTag, whiteList) < 0 ? '' : matchStr);
            };
        }
        return this.replace(/<\/?([^>]*)>/g, replacement);
    },
    /**
     * 按html标签嵌套格式化字符串
    */
    regularTags: function() {
        return $('<div>' + this.replace(/<\/?div>/g, '') + '</div>').html();
    },
    /**
     * 截断字符串，不破坏html标签的嵌套；超出最大长度 用指定省略字符串拼接
    */
    cutForHtml: function(maxLen, ellipsisStr, ellipsisCharLen) {
        ellipsisStr = ellipsisStr || '';
        var text = this.trimTags(),
            result = this;
        if(text.length > maxLen) {
            maxLen -= (ellipsisCharLen || String(ellipsisStr).length);
            var matcheTags = [],
                preTagStrLen = 0,
                full = false;
            this.replace(/<\/?[^>]*>/g, function(matchStr, matchedIndex) {
                if(!full) {
                    var info = {tagStr: matchStr, index: matchedIndex - preTagStrLen};
                    matcheTags.push(info);
                    preTagStrLen += matchStr.length;
                    full = (info.index >= maxLen);
                }
                return matchStr;
            });
            text = text.substr(0, maxLen);
            if(matcheTags.length) {
                var info;
                for (var i = matcheTags.length - 1; i >= 0; i--) {
                    info = matcheTags[i];
                    text = text.substr(0, info.index) + info.tagStr + text.substr(info.index);
                };
            }
            result = text.regularTags() + ellipsisStr;
        }
        return result;
    },
    /**
     * 首字母大写
    */
    capitalize: function() {
        return this.substr(0, 1).toUpperCase() + this.substr(1);
    },
    /**
     * 获取字符串的字节长度
    */
    byteLength: function () {
        return this.replace(/[^\x00-\xff]/g, "ci").length;
    }
});

/**
 * ui相关通用函数
*/
var ui = {
    isSupportCss3: function(feature, element, notCheckExp) {
        element = element || document.body;
        var styleObj = element.style,
            prefix = ['webkit', 'moz', 'ms', 'o'];
        if(typeof(styleObj[feature]) != 'undefined') {
            return true;
        }
        if(!notCheckExp) {
            var isSupportExp = false;
            feature = feature.capitalize();
            $(['webkit', 'moz', 'ms', 'o']).each(function(i, p) {
                if(typeof(styleObj[p + feature]) != 'undefined') {
                    isSupportExp = true;
                    return false;
                }
            });
            return isSupportExp;
        }
        return false;
    }
};

var Utils = {
    tryDecodeURIComponent: function(str) {
        try {
            return decodeURIComponent(str);
        } catch(ex) {
            return str;
        }
    },
    escapeHTML: function(str) {
        return str.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    },
    throttle: function(fn, delay) {
        var timer = null;
        return function() {
            var context = this,
                args = arguments;
            clearTimeout(timer);
            timer = setTimeout(function() {
                fn.apply(context, args);
            }, delay);
        };
    },
    buffer: function(fn, ms, context) {
        ms = ms || 150;

        if (ms === -1) {
            return function() {
                fn.apply(context || this, arguments);
            };
        }
        var bufferTimer = null;

        function f() {
            f.stop();
            bufferTimer = Utils.delay(fn, ms, context || this, arguments);
        }


        f.stop = function() {
            if (bufferTimer) {
                bufferTimer.cancel();
                bufferTimer = 0;
            }
        };

        return f;
    },
    delay = function(fn, when, context, data) {
        when = when || 0;

        var f = function() {
            fn.apply(context, data || []);
        };

        r = setTimeout(f, when);

        return {
            cancel : function() {
                clearTimeout(r);
            }
        };
    },
    encodeURL: function(source) {
        return String(source)
                .replace(/</g,'&lt;')
                .replace(/>/g,'&gt;')
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#39;");
    },
    encodeHTML: function(source) {
        return String(source)
                .replace(/&/g,'&amp;')
                .replace(/</g,'&lt;')
                .replace(/>/g,'&gt;')
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#39;");
    },
    ui: ui
};

module.exports = Utils;

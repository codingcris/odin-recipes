var _bsa = {
  init: function (format, zoneKey, segment, options) {
    var options = typeof options !== "undefined" ? options : {};
    if (!this.isset(window["_bsa_queue"])) window["_bsa_queue"] = [];
    var forceUrlPreview = this.getURLVar(
      "_bsa_url_preview",
      window.location.href
    );
    if (forceUrlPreview) {
      var previewData = JSON.parse(decodeURIComponent(forceUrlPreview));
      options.testMode = true;
      options.testData = {
        ads: [
          Object.assign({}, previewData, {
            zonekey: zoneKey,
            statlink: previewData.link,
          }),
          {},
        ],
      };
    }
    if (!this.isset(options.target)) options.target = "body";
    if (
      this.isset(options) &&
      this.isset(options.target) &&
      document.querySelectorAll(options.target).length > 0
    ) {
      var pretendSrv = document.createElement("div");
      pretendSrv.id = "_bsa_srv-" + zoneKey + "_" + window["_bsa_queue"].length;
      options.script_id = pretendSrv.id;
      if ((options && !this.isset(options.platforms)) || !this.isset(options))
        options.platforms = ["desktop", "mobile"];
      if (
        _bsa[format].readyToInit != false ||
        (options && options.testMode) ||
        !_bsa.objExists(zoneKey)
      )
        window["_bsa_queue"].push([format, zoneKey, segment, options]);
      if (options.forceReload)
        this.removeElement(document.getElementById(options.script_id));
      if (_bsa[format].readyToInit != false && !options.testMode) {
        var jsonSrc = this._buildSrvUrl(
          options && options.path
            ? options.path
            : "//" + _bsa.srv() + "/ads/" + zoneKey + ".json",
          segment,
          options
        );
        if (
          _bsa.objExists(zoneKey) &&
          !_bsa.exists(document.getElementById(options.script_id))
        ) {
          document.getElementsByTagName("head")[0].appendChild(pretendSrv);
          var req = new XMLHttpRequest();
          req.addEventListener("load", function () {
            var json = null;
            try {
              json = JSON.parse(req.responseText);
            } catch (error) {
              console.log("BSA ad connectivity issue!", zoneKey);
            }
            if (json) {
              _bsa_go(json);
            }
          });
          req.open("GET", jsonSrc);
          req.send();
        }
      } else if ((options && options.testMode) || !_bsa.objExists(zoneKey))
        _bsa_go(options.testData ? options.testData : _bsa[format].testData);
      else _bsa[format](zoneKey, segment, options);
    }
  },
  srv: function () {
    if (_bsa.SRV_OVERRIDE) {
      return _bsa.SRV_OVERRIDE;
    }
    return "srv.buysellads.com";
  },
  _buildSrvUrl(base, segment, options, overrideUrlForcebanner) {
    var forcebanner = overrideUrlForcebanner
        ? overrideUrlForcebanner
        : this.getURLVar("bsaforcebanner", window.location.href),
      ignore = this.getURLVar("bsaignore", window.location.href),
      forwardedip = this.getURLVar("bsaforwardedip", window.location.href),
      ignoretargeting = this.getURLVar(
        "bsaignoretargeting",
        window.location.href
      );
    if (segment) base = this.appendQueryString(base, "segment", segment);
    if (options && this.isset(options.ip))
      base = this.appendQueryString(base, "forwardedip", options.ip);
    if (options && this.isset(options.country))
      base = this.appendQueryString(base, "country", options.country);
    if (options && this.isset(options.number_of_ads))
      base = this.appendQueryString(base, "forcenads", options.number_of_ads);
    if (forcebanner)
      base = this.appendQueryString(base, "forcebanner", forcebanner);
    if (ignore) base = this.appendQueryString(base, "ignore", ignore);
    if (ignoretargeting)
      base = this.appendQueryString(base, "ignoretargeting", ignoretargeting);
    if (forwardedip)
      base = this.appendQueryString(base, "forwardedip", forwardedip);
    base += this.frequencyCap();
    return base;
  },
  frequencyCap: function () {
    var day = _bsa.getCookie("_bsap_daycap"),
      life = _bsa.getCookie("_bsap_lifecap"),
      day = this.isset(day) ? day.split(";")[0].split(",") : [],
      life = this.isset(life) ? life.split(";")[0].split(",") : [];
    if (day.length || life.length) {
      var freqcap = [];
      for (var i = 0; i < day.length; i++) {
        var adspot = day[i];
        for (
          var found = -1, find = 0;
          find < freqcap.length && found == -1;
          find++
        )
          if (freqcap[find][0] == adspot) found = find;
        if (found == -1) freqcap.push([adspot, 1, 0]);
        else freqcap[found][1]++;
      }
      for (var i = 0; i < life.length; i++) {
        var adspot = day[i];
        for (
          var found = -1, find = 0;
          find < freqcap.length && found == -1;
          find++
        )
          if (freqcap[find][0] == adspot) found = find;
        if (found == -1) freqcap.push([adspot, 0, 1]);
        else freqcap[found][2]++;
      }
      for (var i = 0; i < freqcap.length; i++)
        freqcap[i] = freqcap[i][0] + ":" + freqcap[i][1] + "," + freqcap[i][2];
    }
    if (freqcap && freqcap.length)
      return "&freqcap=" + encodeURIComponent(freqcap.join(";"));
    else return "";
  },
  appendQueryString: function (url, name, value) {
    var re = new RegExp("([?&]" + name + "=)[^&]+", "");
    function add(sep) {
      url += sep + name + "=" + encodeURI(value);
    }
    function change() {
      url = url.replace(re, "$1" + encodeURI(value));
    }
    if (url.indexOf("?") === -1) {
      add("?");
    } else {
      if (re.test(url)) {
        change();
      } else {
        add("&");
      }
    }
    return url;
  },
  clearQueue: function (index) {
    window["_bsa_queue"].splice(index, 1);
  },
  link: function (link, segment, domain, timestamp, clicktag) {
    var l = link.split("?encredirect="),
      fulllink;
    if (typeof l[1] != "undefined")
      fulllink =
        l[0] +
        "?segment=" +
        segment +
        ";&encredirect=" +
        encodeURIComponent(l[1]);
    else if (l[0].search(_bsa.srv()) > 0)
      fulllink = l[0] + "?segment=" + segment + ";";
    else fulllink = l[0];
    fulllink = fulllink.replace("[placement]", segment);
    fulllink = fulllink.replace("[timestamp]", timestamp);
    if (domain)
      fulllink = fulllink.replace(new RegExp(_bsa.srv(), "g"), domain);
    return (_bsa.isset(clicktag) ? clicktag + "https:" : "") + fulllink;
  },
  pixel: function (p, timestamp) {
    var c = "";
    if (_bsa.isset(p)) {
      var pixels = p.split("||");
      for (var j = 0; j < pixels.length; j++)
        c +=
          '<img src="' +
          pixels[j].replace("[timestamp]", timestamp) +
          '" style="display:none;" height="0" width="0" />';
    }
    return c;
  },
  findInQueue: function (key) {
    for (var i = 0; i < window["_bsa_queue"].length; i++)
      if (window["_bsa_queue"][i][1] == key) return i;
  },
  drop: function (output, target, elType, idName, attributes) {
    var div = document.createElement(elType);
    div.id = idName;
    div.innerHTML = output;
    if (attributes)
      div.setAttribute("data-attributes", JSON.stringify(attributes));
    var b = document.body.firstChild;
    if (target.indexOf("::clone::") >= 0) {
      target = target.replace("::clone::", "");
      document.querySelector(target).insertAdjacentHTML("beforebegin", output);
      return;
    }
    for (var i = 0; i < document.querySelectorAll(target).length; i++)
      if (target == "body") b.parentNode.insertBefore(div, b);
      else {
        if (attributes.options.clear_contents == true)
          document.querySelectorAll(target)[i].innerHTML = "";
        document.querySelectorAll(target)[i].appendChild(div);
      }
  },
  callback: function (a) {
    typeof BSANativeCallback === "function"
      ? BSANativeCallback(a)
      : function () {};
  },
  hide: function (e) {
    if (document.getElementById(e)) {
      this.removeClass(document.getElementById(e), "_bsa_show");
      this.addClass(document.getElementById(e), "_bsa_hide");
    }
  },
  show: function (e) {
    if (document.getElementById(e)) {
      this.removeClass(document.getElementById(e), "_bsa_hide");
      this.addClass(document.getElementById(e), "_bsa_show");
    }
  },
  close: function (e, t) {
    this.hide(e);
    if (this.isset(_bsa.setCookie))
      _bsa.setCookie(e, "hide", this.isset(t) ? t : 1e3 * 60 * 60 * 6);
  },
  hasClass: function (el, name) {
    return new RegExp("(\\s|^)" + name + "(\\s|$)").test(el.className);
  },
  addClass: function (el, name) {
    if (!this.hasClass(el, name))
      el.className += (el.className ? " " : "") + name;
  },
  removeClass: function (el, name) {
    if (this.hasClass(el, name))
      el.className = el.className
        .replace(new RegExp("(\\s|^)" + name + "(\\s|$)"), " ")
        .replace(/^\s+|\s+$/g, "");
  },
  removeElement: function (el) {
    if (typeof el !== "undefined" && el != null) el.parentNode.removeChild(el);
  },
  emptyElement: function (el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  },
  reload: function (e) {
    var el = document.querySelector(e);
    if (typeof el !== "undefined" && el != null) {
      if (_bsa.isset(el.firstChild.getAttribute("data-attributes"))) {
        var attributes = JSON.parse(
          el.firstChild.getAttribute("data-attributes")
        );
        this.removeElement(
          document.getElementById(attributes.options.script_id)
        );
        this.emptyElement(el);
      } else {
        var attributes = JSON.parse(el.getAttribute("data-attributes"));
        this.removeElement(
          document.getElementById(attributes.options.script_id)
        );
        this.removeElement(el);
      }
      this.init(
        attributes.type,
        attributes.key,
        attributes.segment,
        attributes.options
      );
    }
  },
  isHex: function (c) {
    return /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(c);
  },
  isMobile: function () {
    var check = false;
    (function (a) {
      if (
        /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(
          a
        ) ||
        /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(
          a.substr(0, 4)
        )
      )
        check = true;
    })(navigator.userAgent || navigator.vendor || window.opera);
    return check;
  },
  extend: function (target) {
    for (var i = 1; i < arguments.length; ++i) {
      var from = arguments[i];
      if (typeof from !== "object") continue;
      for (var j in from) {
        if (from.hasOwnProperty(j)) {
          target[j] =
            typeof from[j] === "object"
              ? this.extend({}, target[j], from[j])
              : from[j];
        }
      }
    }
    return target;
  },
  isset: function (v) {
    return typeof v !== "undefined" && v != null;
  },
  exists: function (el) {
    if (el === null) return false;
    return true;
  },
  objExists: function (obj) {
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    if (obj == null) return false;
    if (obj.length > 0) return true;
    if (obj.length === 0) return false;
    for (var key in obj) if (hasOwnProperty.call(obj, key)) return true;
    return false;
  },
  getAttr: function (v, id) {
    return document.getElementById(id).getAttribute("data-" + v);
  },
  getURLVar: function (name, url) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regexS = "[\\?&]" + name + "=([^&#]*)",
      regex = new RegExp(regexS),
      results = regex.exec(url);
    if (results == null) return "";
    else return results[1];
  },
  htmlEncode: function (v) {
    if (typeof v === "undefined") v = "";
    return v
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\//g, "&#x2F;");
  },
};
var _bsa_go = function (json) {
  var queue_index = _bsa.findInQueue(json["ads"][0].zonekey);
  if (window["_bsa_queue"][queue_index]) {
    if (
      (window["_bsa_queue"][queue_index][3] &&
        window["_bsa_queue"][queue_index][3].platforms.indexOf("mobile") > -1 &&
        _bsa.isMobile()) ||
      (window["_bsa_queue"][queue_index][3] &&
        window["_bsa_queue"][queue_index][3].platforms.indexOf("desktop") >
          -1 &&
        !_bsa.isMobile())
    ) {
      if (_bsa.isset(json))
        for (var i = json["ads"].length - 1; i >= 0; i--)
          if (
            !_bsa.isset(json["ads"][i].statlink) &&
            !_bsa.isset(json["ads"][i].snippet)
          ) {
            var attributes = {
              type: window["_bsa_queue"][queue_index][0],
              key: json["ads"][0].zonekey,
              segment: window["_bsa_queue"][queue_index][2],
              options: window["_bsa_queue"][queue_index][3],
              fallback: json["ads"][0].fallbackZoneKey,
              ads: [],
            };
            json["ads"].splice(i, 1);
          }
      if (
        _bsa.isset(json) &&
        _bsa.isset(json["ads"]) &&
        json["ads"].length > 0 &&
        (_bsa.isset(json["ads"][0].statlink) ||
          _bsa.isset(json["ads"][0].snippet))
      ) {
        for (var i = 0; i < json["ads"].length; i++)
          _bsa_serving_callback(
            json["ads"][i].bannerid,
            json["ads"][i].zonekey,
            json["ads"][i].freqcap
          );
        _bsa[window["_bsa_queue"][queue_index][0]](
          window["_bsa_queue"][queue_index][1],
          window["_bsa_queue"][queue_index][2],
          window["_bsa_queue"][queue_index][3],
          json["ads"]
        );
      } else if (_bsa.isset(attributes.fallback)) {
        _bsa.clearQueue(_bsa.findInQueue(attributes.key));
        _bsa.init(
          attributes.format,
          attributes.fallback,
          attributes.segment,
          attributes.options
        );
      } else if (_bsa.isset(attributes.options.carbonfallback)) {
        _bsa.carbonbackfill(attributes);
      } else {
        _bsa.callback(attributes);
      }
    }
  }
};
_bsa.testData = {
  ads: [
    {
      backgroundColor: "#ff6347",
      backgroundHoverColor: "#416ae2",
      ctaTextColor: "#2e8b57",
      ctaTextColorHover: "#67cdaa",
      callToAction: "Learn More",
      company: "{ Company Name }",
      ctaBackgroundColor: "#ff8051",
      ctaBackgroundHoverColor: "#9a32cc",
      description: "{ Campaign Description }",
      image: "https://cdn4.buysellads.net/uu/1/18/1504373058-32397.png",
      logo: "https://cdn4.buysellads.net/uu/1/18/1504373139-azure-1.png",
      statlink: "//www.buysellads.com/",
      textColor: "#ffffff",
      textColorHover: "#ffffff",
      timestamp: "1508185654",
      title: "The best widgets",
    },
  ],
};
_bsa.getCookie = function (name) {
  var nameEQ = name + "=",
    ca = document.cookie.split(";");
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};
_bsa.setCookie = function (name, value, seconds) {
  if (seconds) {
    var date = new Date();
    date.setTime(date.getTime() + seconds);
    var expires = "; expires=" + date.toGMTString();
  } else var expires = "";
  document.cookie = name + "=" + value + expires + "; SameSite=Lax; path=/";
};
_bsa.removeCookie = function (name) {
  this.setCookie(name, "", -1);
};
window["_bsa_serving_callback"] = function (banner, zone, freqcap) {
  var append = function (w, data, days) {
    var c = document.cookie,
      i = c.indexOf(w + "="),
      existing =
        i >= 0 ? c.substring(i + w.length + 1).split(";")[0] + "," : "",
      d = new Date();
    d.setTime(days * 36e5 + d);
    data = existing + data;
    data = data.substring(0, 2048);
    document.cookie =
      w +
      "=" +
      data +
      "; expires=" +
      d.toGMTString() +
      "; SameSite=Lax; path=/";
  };
  if (freqcap) {
    append("_bsap_daycap", banner, 1);
    append("_bsap_lifecap", banner, 365);
  }
};
_bsa.custom = function (zoneKey, segment, options, ads) {
  var custom_domain =
      _bsa.isset(options) && _bsa.isset(options.custom_domain)
        ? options.custom_domain
        : false,
    single = [];
  _bsa.custom.attributes = {
    type: "custom",
    key: zoneKey,
    segment: segment,
    options: options,
    ads: ads,
  };
  _bsa.custom.elID = function (options) {
    return options && options.id ? options.id : "_custom_";
  };
  function template(ads) {
    var c = "";
    if (_bsa.isset(ads[0].custom_css)) {
      c += "<style>";
      c += ads[0].custom_css;
      c += "</style>";
    }
    for (var i = 0; i < ads.length; i++) {
      single[i] = options.template;
      Object.keys(ads[i]).map(function (key, index) {
        var value = ads[i][key];
        if (key === "statlink")
          single[i] = single[i].replace(
            new RegExp("##" + key + "##", "g"),
            _bsa.link(ads[i][key], segment, custom_domain, ads[i].timestamp)
          );
        else
          single[i] = single[i].replace(
            new RegExp("##" + key + "##", "g"),
            function () {
              return _bsa.htmlEncode(value);
            }
          );
      });
      single[i] = single[i]
        .replace(
          new RegExp("##link##", "g"),
          _bsa.link(ads[i].statlink, segment, custom_domain, ads[i].timestamp)
        )
        .replace(
          new RegExp("##adViaLink##", "g"),
          _bsa.htmlEncode(ads[i].ad_via_link)
        )
        .replace(new RegExp("##tagline##", "g"), function () {
          return _bsa.htmlEncode(ads[i].companyTagline);
        })
        .replace(new RegExp("##.*##", "g"), function () {
          return "";
        });
      c += single[i];
      c += _bsa.pixel(ads[i].pixel, ads[i].timestamp);
    }
    return c;
  }
  if (!options.template) return false;
  if (!_bsa.getCookie(_bsa.custom.elID(options)))
    if (ads) {
      _bsa.drop(
        template(ads),
        options.target,
        "div",
        _bsa.custom.elID(options),
        _bsa.custom.attributes
      );
      _bsa.clearQueue(_bsa.findInQueue(zoneKey));
    }
  _bsa.callback(_bsa.custom.attributes);
};
_bsa.custom.readyToInit = true;

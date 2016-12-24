// Screw Maxthon: Start
function polyfill(obj, name, value) {
  if (!obj[name]) Object.defineProperty(obj, name, {
    value: value,
  });
}

polyfill(Object, 'assign', function () {
  var obj = arguments[0];
  for (var i = 1; i < arguments.length; i ++) {
    var arg = arguments[i];
    arg && Object.keys(arg).forEach(function (key) {
      obj[key] = arg[key];
    });
  }
  return obj;
});
polyfill(String.prototype, 'startsWith', function (str) {
  return this.slice(0, str.length) === str;
});
polyfill(String.prototype, 'endsWith', function (str) {
  return this.slice(-str.length) === str;
});
polyfill(Array.prototype, 'findIndex', function (predicate) {
  var length = this.length;
  for (var i = 0; i < length; i ++) {
    var item = this[i];
    if (predicate(item, i, this)) return i;
  }
  return -1;
});
polyfill(Array.prototype, 'find', function (predicate) {
  return this[this.findIndex(predicate)];
});

// Screw Maxthon: End

var _ = exports;
_.mx = {
  rt: window.external.mxGetRuntime(),
};
_.mx.br = _.mx.rt.create('mx.browser');

_.setIcon = function (icon) {
  // Initialize on first call
  function setIcon(icon) {
    _.mx.rt.icon.setIconImage(icon);
    tIcon && tIcon.setIconImage(icon);
  }
  var ui = _.mx.rt.create('mx.app.ui');
  var tIcon = ui && ui.getEntryPointByActionName && ui.getEntryPointByActionName('icon', 'toolbar');
  _.setIcon = setIcon;
  setIcon(icon);
};

_.i18n = function (key) {
  if (!key) return '';
  var data = _.mx.rt.locale.t(key);
  var args = [].slice.call(arguments).slice(1);
  if (Array.isArray(args[0])) args = args[0];
  args.unshift('');
  if (/^".*"$/.test(data)) try {
    data = JSON.parse(data);
  } catch (e) {
    data = data.slice(1, -1);
  }
  data = data.replace(/\$(?:\{(\d+)\}|(\d+))/g, function (match, group1, group2) {
    var arg = args[group1 || group2];
    return arg == null ? match : arg;
  });
  return data;
};

function normalizeKeys(key) {
  if (!key) key = [];
  if (!Array.isArray(key)) key = key.toString().split('.');
  return key;
}

_.normalizeKeys = normalizeKeys;

_.object = function () {
  function get(obj, key, def) {
    var keys = normalizeKeys(key);
    for (var i = 0, len = keys.length; i < len; i ++) {
      key = keys[i];
      if (obj && (key in obj)) obj = obj[key];
      else return def;
    }
    return obj;
  }
  function set(obj, key, val) {
    var keys = normalizeKeys(key);
    if (!keys.length) return val;
    var sub = obj = obj || {};
    for (var i = 0, len = keys.length - 1; i < len; i ++) {
      key = keys[i];
      sub = sub[key] = sub[key] || {};
    }
    sub[keys[keys.length - 1]] = val;
    return obj;
  }
  return {
    get: get,
    set: set,
  };
}();

_.options = function () {
  function getOption(key, def) {
    var keys = normalizeKeys(key);
    key = keys[0];
    var value = localStorage.getItem(key), obj;
    if (value) {
      try {
        obj = JSON.parse(value);
      } catch (e) {
        // ignore invalid JSON
      }
    }
    if (obj == null) obj = defaults[key];
    if (obj == null) obj = def;
    return keys.length > 1 ? _.object.get(obj, keys.slice(1), def) : obj;
  }

  function setOption(key, value) {
    var keys = normalizeKeys(key);
    key = keys[0];
    if (key in defaults) {
      if (keys.length > 1) {
        value = _.object.set(getOption(key), keys.slice(1), value);
      }
      localStorage.setItem(key, JSON.stringify(value));
    }
  }

  function getAllOptions() {
    return Object.keys(defaults).reduce(function (options, key) {
      options[key] = getOption(key);
      return options;
    }, {});
  }

  function parseArgs(args) {
    return args.length === 1 ? {
      key: '',
      cb: args[0],
    } : {
      key: args[0] || '',
      cb: args[1],
    };
  }

  function hook() {
    var arg = parseArgs(arguments);
    var list = hooks[arg.key];
    if (!list) list = hooks[arg.key] = [];
    list.push(arg.cb);
    return function () {
      unhook(arg.key, arg.cb);
    };
  }
  function unhook() {
    var arg = parseArgs(arguments);
    var list = hooks[arg.key];
    if (list) {
      var i = list.indexOf(arg.cb);
      ~i && list.splice(i, 1);
    }
  }

  var defaults = {
    isApplied: true,
    startReload: true,
    reloadHTTPS: false,
    autoUpdate: true,
    ignoreGrant: false,
    lastUpdate: 0,
    showBadge: true,
    exportValues: true,
    closeAfterInstall: false,
    trackLocalFile: false,
    injectMode: 0,
    autoReload: false,
    dropbox: {},
    onedrive: {},
    features: null,
  };
  var hooks = {};

  // XXX migrate sync status options
  ['dropbox', 'onedrive'].forEach(function (name) {
    var key = name + 'Enabled';
    var val = getOption(key);
    if (val != null) {
      setOption([name, 'enabled'], val);
      localStorage.removeItem(key);
    }
  });

  return {
    get: getOption,
    set: setOption,
    getAll: getAllOptions,
    hook: hook,
    unhook: unhook,
  };
}();

_.debounce = function (func, time) {
  function run(thisObj, args) {
    timer = null;
    func.apply(thisObj, args);
  }
  var timer;
  return function (args) {
    timer && clearTimeout(timer);
    timer = setTimeout(run, time, this, args);
  };
};

_.noop = function () {};

_.zfill = function (num, length) {
  num = num.toString();
  while (num.length < length) num = '0' + num;
  return num;
};

_.getUniqId = function () {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
};

/**
 * Get locale attributes such as `@name:zh-CN`
 */
_.getLocaleString = function (meta, key) {
  var languages = [navigator.language];
  var i = languages[0].indexOf('-');
  if (i > 0) languages.push(languages[0].slice(0, i));
  var lang = languages.find(function (lang) {
    return (key + ':' + lang) in meta;
  });
  if (lang) key += ':' + lang;
  return meta[key] || '';
};

_.getMessenger = function (commands) {
  var id = _.getUniqId();
  var callbacks = {};
  commands = commands || {};
  commands.Callback = function (ret) {
    var func = callbacks[ret.id];
    if (func) {
      delete callbacks[ret.id];
      func(ret.data);
    }
  };
  _.mx.rt.listen(id, function (ret) {
    var func = commands[ret.cmd];
    func && func(ret.data);
  });
  return function (data) {
    return new Promise(function (resolve, reject) {
      data.src = {id: id};
      callbacks[data.callback = _.getUniqId()] = function (res) {
        res && res.error ? reject(res.error) : resolve(res && res.data);
      };
      _.mx.rt.post('Background', data);
    });
  };
};

_.injectContent = function (s) {
  _.mx.br.executeScript('if(window.mx)try{' + s + '}catch(e){}');
};

_.tabs = {
  create: function (url) {
    _.mx.br.tabs.newTab({url: url});
  },
  get: function (id) {
    return Promise.resolve(_.mx.br.tabs.getTabById(id));
  },
  remove: function (id) {
    _.tabs.get(id).then(function (tab) {
      tab && tab.close();
    });
  },
};

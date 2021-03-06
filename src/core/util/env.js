/* @flow */
/* globals MessageChannel */

import { handleError } from "./error";

// can we use __proto__?
/* 判断当前浏览器是否支持__proto__这个非标准属性*/
export const hasProto = "__proto__" in {};

// Browser environment sniffing
export const inBrowser = typeof window !== "undefined";
export const UA = inBrowser && window.navigator.userAgent.toLowerCase();
export const isIE = UA && /msie|trident/.test(UA);
export const isIE9 = UA && UA.indexOf("msie 9.0") > 0;
export const isEdge = UA && UA.indexOf("edge/") > 0;
export const isAndroid = UA && UA.indexOf("android") > 0;
export const isIOS = UA && /iphone|ipad|ipod|ios/.test(UA);
export const isChrome = UA && /chrome\/\d+/.test(UA) && !isEdge;

// Firefox has a "watch" function on Object.prototype...
export const nativeWatch = {}.watch;

export let supportsPassive = false;
if (inBrowser) {
  try {
    const opts = {};
    Object.defineProperty(
      opts,
      "passive",
      ({
        get() {
          /* istanbul ignore next */
          supportsPassive = true;
        },
      }: Object)
    ); // https://github.com/facebook/flow/issues/285
    window.addEventListener("test-passive", null, opts);
  } catch (e) {}
}

// this needs to be lazy-evaled because vue may be required before
// vue-server-renderer can set VUE_ENV
let _isServer;
export const isServerRendering = () => {
  if (_isServer === undefined) {
    /* istanbul ignore if */
    if (!inBrowser && typeof global !== "undefined") {
      // detect presence of vue-server-renderer and avoid
      // Webpack shimming the process
      _isServer = global["process"].env.VUE_ENV === "server";
    } else {
      _isServer = false;
    }
  }
  return _isServer;
};

// detect devtools
export const devtools = inBrowser && window.__VUE_DEVTOOLS_GLOBAL_HOOK__;

/* istanbul ignore next */
export function isNative(Ctor: any): boolean {
  return typeof Ctor === "function" && /native code/.test(Ctor.toString());
}

export const hasSymbol =
  typeof Symbol !== "undefined" &&
  isNative(Symbol) &&
  typeof Reflect !== "undefined" &&
  isNative(Reflect.ownKeys);

/**
 * Defer a task to execute it asynchronously.
 */
export const nextTick = (function () {
  /* 存放异步执行的回调*/
  const callbacks = [];
  /* 一个标记位，如果已经有timerFunc被推送到任务队列中去则不需要重复推送*/
  let pending = false;
  /* 一个函数指针，指向函数将被推送到任务队列中，等到主线程任务执行完时，任务队列中的timerFunc被调用*/
  let timerFunc;

  /* 下一个tick时的回调*/
  function nextTickHandler() {
    /* 一个标记位，标记等待状态（即函数已经被推入任务队列或者主线程，已经在等待当前栈执行完毕去执行），这样就不需要在push多个回调到callbacks时将timerFunc多次推入任务队列或者主线程*/
    pending = false;
    // 拷贝存储所有回调的数组
    const copies = callbacks.slice(0);
    // 清空callbacks数组
    callbacks.length = 0;
    /* 执行所有callback*/
    for (let i = 0; i < copies.length; i++) {
      copies[i]();
    }
  }

  // An asynchronous deferring mechanism.
  // In pre 2.4, we used to use microtasks (Promise/MutationObserver)
  // but microtasks actually has too high a priority and fires in between
  // supposedly sequential events (e.g. #4521, #6690) or even between
  // bubbling of the same event (#6566). Technically setImmediate should be
  // the ideal choice, but it's not available everywhere; and the only polyfill
  // that consistently queues the callback after all DOM events triggered in the
  // same loop is by using MessageChannel.
  /* istanbul ignore if */
  if (typeof setImmediate !== "undefined" && isNative(setImmediate)) {
    timerFunc = () => {
      setImmediate(nextTickHandler);
    };
  } else if (
    typeof MessageChannel !== "undefined" &&
    (isNative(MessageChannel) ||
      // PhantomJS
      MessageChannel.toString() === "[object MessageChannelConstructor]")
  ) {
    console.log("进入内部MessageChannel");
    const channel = new MessageChannel();
    const port = channel.port2;
    channel.port1.onmessage = nextTickHandler;
    timerFunc = () => {
      port.postMessage(1);
    };
  } else if (typeof Promise !== "undefined" && isNative(Promise)) {
  /* istanbul ignore next */
    console.log("进入内部promise");
    // use microtask in non-DOM environments, e.g. Weex
    const p = Promise.resolve();
    timerFunc = () => {
      p.then(nextTickHandler);
    };
  } else {
    // fallback to setTimeout
    timerFunc = () => {
      setTimeout(nextTickHandler, 0);
    };
  }
  /*
    推送到队列中下一个tick时执行
    cb 回调函数
    ctx 上下文
  */
  return function queueNextTick(cb?: Function, ctx?: Object) {
    let _resolve;
    /* cb存到callbacks中*/
    callbacks.push(() => {
      if (cb) {
        try {
          cb.call(ctx);
        } catch (e) {
          handleError(e, ctx, "nextTick");
        }
      } else if (_resolve) {
        _resolve(ctx);
      }
    });
    if (!pending) {
      pending = true;
      timerFunc();
    }
    // $flow-disable-line
    if (!cb && typeof Promise !== "undefined") {
      return new Promise((resolve, reject) => {
        _resolve = resolve;
      });
    }
  };
})();

let _Set;
/* istanbul ignore if */ // $flow-disable-line
if (typeof Set !== "undefined" && isNative(Set)) {
  // use native Set when available.
  _Set = Set;
} else {
  // a non-standard Set polyfill that only works with primitive keys.
  _Set = class Set implements ISet {
    set: Object;
    constructor() {
      this.set = Object.create(null);
    }
    has(key: string | number) {
      return this.set[key] === true;
    }
    add(key: string | number) {
      this.set[key] = true;
    }
    clear() {
      this.set = Object.create(null);
    }
  };
}

interface ISet {
  has(key: string | number): boolean;
  add(key: string | number): mixed;
  clear(): void;
}

export { _Set };
export type { ISet };

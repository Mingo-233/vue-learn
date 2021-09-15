/* @flow */

import Dep from './dep'
import VNode from '../vdom/vnode'
import { arrayMethods } from './array'
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isValidArrayIndex,
  isServerRendering
} from '../util/index'

const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * By default, when a reactive property is set, the new value is
 * also converted to become reactive. However when passing down props,
 * we don't want to force conversion because the value may be a nested value
 * under a frozen data structure. Converting it would defeat the optimization.
 */
export const observerState = {
  shouldConvert: true
}

/**
 * Observer class that are attached to each observed
 * object. Once attached, the observer converts target
 * object's property keys into getter/setters that
 * collect dependencies and dispatches updates.
 */
export class Observer {
  value: any;
  dep: Dep;
  vmCount: number; // number of vms that has this object as root $data
    /*
    将Observer实例绑定到data的__ob__属性上面去，observe的时候会先检测是否已经有__ob__对象存放Observer实例了
    */
  constructor (value: any) {
    // 要被观察的值
    this.value = value
    this.dep = new Dep()
    this.vmCount = 0
    def(value, '__ob__', this)
    if (Array.isArray(value)) {
     /*
          如果是数组，将修改后可以截获响应的数组方法替换掉该数组的原型中的原生方法，达到监听数组数据变化响应的效果。
          这里如果当前浏览器支持__proto__属性，则直接覆盖当前数组对象原型上的原生数组方法，如果不支持该属性，则定义覆盖数组对象上的方法
    */
      const augment = hasProto
        ? protoAugment /* 直接覆盖原型的方法来修改目标对象*/
        : copyAugment  /* 定义（覆盖）目标对象或数组的某一个方法*/
      augment(value, arrayMethods, arrayKeys)
       /* 如果是数组则需要遍历数组的每一个成员进行observe*/
      this.observeArray(value)
    } else {
       /* 如果是对象则直接walk进行绑定*/
      this.walk(value)
    }
  }

  /**
   * Walk through each property and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   */
  walk (obj: Object) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i], obj[keys[i]])
    }
  }

  /**
   * Observe a list of Array items.
   */
  /* 对一个数组的每一个成员进行observe*/
  observeArray (items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

// helpers

/**
 * Augment an target Object or Array by intercepting
 * the prototype chain using __proto__
 */
 /* 直接覆盖原型的方法来修改目标对象或数组*/
function protoAugment (target, src: Object, keys: any) {
  /* eslint-disable no-proto */
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * Augment an target Object or Array by defining
 * hidden properties.
 */
/* istanbul ignore next */
/* 定义（覆盖）目标对象或数组的某一个方法*/
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    def(target, key, src[key])
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 */
// 这个函数就是创建ob对象，若原先就存在则返回原先的ob对象
export function observe (value: any, asRootData: ?boolean): Observer | void {
   // 如果设置的参数value不是一个对象或者是一个虚拟dom。则直接返回。
  if (!isObject(value) || value instanceof VNode) {
    return
  }
  let ob: Observer | void
  /* 这里用__ob__这个属性来判断是否已经有Observer实例，如果没有Observer实例则会新建一个Observer实例并赋值给__ob__这个属性，
  如果已有Observer实例则直接返回该Observer实例。 （单例模式）*/
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__
  } else if (
    /*
      这里的判断是为了确保value是单纯的对象，而不是函数或者是Regexp等情况。
      而且该对象在shouldConvert的时候才会进行Observer。这是一个标识位，避免重复对value进行Observer
    */
    observerState.shouldConvert &&
    !isServerRendering() &&
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value._isVue
  ) {
    ob = new Observer(value)
  }
    /* 如果是根数据则计数，后面Observer中的observe的asRootData非true*/
  if (asRootData && ob) {
    ob.vmCount++
  }
  return ob
}

/**
 * Define a reactive property on an Object.
 */
 /* 为对象defineProperty上在变化时通知的属性*/
export function defineReactive (
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,
  shallow?: boolean
) {
  const dep = new Dep()

  const property = Object.getOwnPropertyDescriptor(obj, key)
  if (property && property.configurable === false) {
    return
  }
  /* 如果之前该对象已经预设了getter以及setter函数则将其取出来，新定义的getter/setter中会将其执行，保证不会覆盖之前已经定义的getter/setter。*/
  // cater for pre-defined getter/setters
  const getter = property && property.get
  const setter = property && property.set
/* 对象的子对象递归进行observe并返回子节点的Observer对象*/
  let childOb = !shallow && observe(val)
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () {
       /* 如果原本对象拥有getter方法,则覆盖*/
      console.log('进了getter')
      const value = getter ? getter.call(obj) : val
      if (Dep.target) {
         /* 进行依赖收集*/
        dep.depend()
        if (childOb) {
          /* 子对象进行依赖收集，如果有子对象那么这里就是将同一个watcher观察者实例放进了两个depend中，
          一个是正在本身闭包中的depend（当前的dep），另一个是子元素的depend（子元素observer实例创建时，自动生成的dep实例）*/
          childOb.dep.depend()
          if (Array.isArray(value)) {
             /* 是数组则需要对每一个成员都进行依赖收集，如果数组的成员还是数组，则递归。*/
            dependArray(value)
          }
        }
      }
      return value
    },
    set: function reactiveSetter (newVal) {
      /* 通过getter方法获取当前值，与新值进行比较，一致则不需要执行下面的操作*/
      const value = getter ? getter.call(obj) : val
      /* eslint-disable no-self-compare */
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }
      if (setter) {
        setter.call(obj, newVal)
      } else {
        val = newVal
      }
      /* 新的值需要重新进行observe，保证数据响应式*/
      childOb = !shallow && observe(newVal)
      /* dep对象通知所有的观察者*/
      dep.notify()
    }
  })
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
export function set (target: Array<any> | Object, key: any, val: any): any {
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)
    return val
  }
  if (hasOwn(target, key)) {
    target[key] = val
    return val
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }
  if (!ob) {
    target[key] = val
    return val
  }
  defineReactive(ob.value, key, val)
  ob.dep.notify()
  return val
}

/**
 * Delete a property and trigger change if necessary.
 */
export function del (target: Array<any> | Object, key: any) {
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1)
    return
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }
  if (!hasOwn(target, key)) {
    return
  }
  delete target[key]
  if (!ob) {
    return
  }
  ob.dep.notify()
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
function dependArray (value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) {
      dependArray(e)
    }
  }
}

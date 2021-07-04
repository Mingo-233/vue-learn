/*
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 * 不检查此文件的类型，因为flow不能很好地处理阵列原型的动态访问方法
 */

import { def } from '../util/index'
/* 取得原生数组的原型*/
const arrayProto = Array.prototype
/* 创建一个新的数组对象，修改该对象上的数组的七个方法，防止污染原生数组方法.
create方法接受的第一个参数为原型对象*/
export const arrayMethods = Object.create(arrayProto)
// console.log(this) 因为在严格模式下，所以这里this为undefined
/**
 * Intercept mutating methods and emit events
 * 截获变异方法并发出事件
 */
;[
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]
.forEach(function (method) {
  // cache original method
  const original = arrayProto[method]
  def(arrayMethods, method, function mutator (...args) {
    // 剩余参数语法允许我们将一个不定数量的参数表示为一个数组。
    const result = original.apply(this, args)
  // 这里的this指向调用数组方法的数组本身,若不使用apply,this指向undefined
    const ob = this.__ob__
    let inserted
    switch (method) {
      case 'push':
      case 'unshift':
        inserted = args
        break
      case 'splice':
        inserted = args.slice(2)
        break
    }
    /* 对新加的数组成员进行observe*/
    if (inserted) ob.observeArray(inserted)
    // notify change
    ob.dep.notify()
    console.log(ob)

    return result
  })
})

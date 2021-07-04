/* @flow */

import type Watcher from './watcher'
import { remove } from '../util/index'

let uid = 0

/**
 * A dep is an observable that can have multiple directives subscribing to it.
 * dep是一个可观察的对象，可以有多个指令订阅它。
 */
export default class Dep {
  static target: ?Watcher;
  id: number;
  subs: Array<Watcher>;

  constructor () {
    this.id = uid++
    this.subs = []
  }
  /* 添加一个观察者对象*/
  addSub (sub: Watcher) {
    this.subs.push(sub)
  }
  /* 移除一个观察者对象*/
  removeSub (sub: Watcher) {
    remove(this.subs, sub)
  }
  /* 依赖收集，当存在Dep.target的时候添加观察者对象*/
  depend () {
    console.log(Dep.target)
    if (Dep.target) {
      Dep.target.addDep(this)
    }
  }
/* 通知所有订阅者*/
  notify () {
    // stabilize the subscriber list first
    const subs = this.subs.slice()
    console.log(subs)
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()
    }
  }
}

// the current target watcher being evaluated.
// this is globally unique because there could be only one
// watcher being evaluated at any time.
/* 依赖收集完需要将Dep.target设为null，防止后面重复添加依赖。*/
Dep.target = null
const targetStack = []

export function pushTarget (_target: Watcher) {
  if (Dep.target) targetStack.push(Dep.target)
  Dep.target = _target
}

export function popTarget () {
  Dep.target = targetStack.pop()
}

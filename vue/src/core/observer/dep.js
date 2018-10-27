/* @flow */

import type Watcher from './watcher'
import { remove } from '../util/index'

let uid = 0

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 */
// dep类
// uid是一个全局变量,每次new一个uid++,因此有一个唯一id,这个方式好多地方都有用到,值得学习
// subs一个数组,里面放着watcher
// target作为静态属性,可以不传入

// subs压入各种watcher,Watcher本身应该有addDep的方法
//

export default class Dep {
  static target: ?Watcher;
  id: number;
  subs: Array<Watcher>;

  constructor () {
    this.id = uid++
    this.subs = []
  }

  addSub (sub: Watcher) {
    this.subs.push(sub)
  }

  removeSub (sub: Watcher) {
    remove(this.subs, sub)
  }

  depend () {
    if (Dep.target) {
      Dep.target.addDep(this)
    }
  }
// 通知函数,subs中推入的每个watcher调用update()
  notify () {
    // stabilize the subscriber list first
    const subs = this.subs.slice()
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()
    }
  }
}

// the current target watcher being evaluated.
// this is globally unique because there could be only one
// watcher being evaluated at any time.
Dep.target = null  // 静态属性的初始化
const targetStack = [] // target栈

// 压栈
export function pushTarget (_target: Watcher) {
  if (Dep.target) targetStack.push(Dep.target)
  Dep.target = _target
}
// 弹栈
export function popTarget () {
  Dep.target = targetStack.pop()
}

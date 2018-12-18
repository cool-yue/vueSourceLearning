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
// 为什么会有dep这个东西,首先要vue考虑到了最一般的情况,一个组件的销毁和创建
// 都伴随着很多依赖的移除和新建,例如一个组件中有{a:1},另外一个组件中有{a:2}
// 这2个组件都有一个同名的属性a并且同时一起渲染,修改任何一个a,都需要去通知watcher
// 去更新dom,现在的问题是,如果不靠dep,我这么去区分到底是哪个组件的a呢,因为要做到
// 最优的更新,必须要当事人组件,即被修改的那个组件里面的那个值去通知,显然不好区分,
// 又比如有一种情况,就是这2个组件是是通过v-if来进行渲染的,那么比如收集了一个a
// 然后v-if的值要变化,当前组件销毁,靠什么移除依赖呢,如果单纯靠属性名,显然就不合理
// 因为名字一样,所以这个a对应的dep他们的id不同,因此可以根据不同的id来进行判断,因为
// id永远都是在++的,不会重复,可是说一个dep代表着data的一个属性,通过判断id,最后在销毁
// 的时候,方便移除watcher和在watcher中移除dep,总不能让这些已销毁的还在内存里面
// 导致性能不好

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

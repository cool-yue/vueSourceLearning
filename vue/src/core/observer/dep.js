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
// 最优的更新,必须要当事人组件,即被修改的那个组件里面的那个值去通知,单纯的区分不同组件
// 的属性难度不大,但是根据组件的属性的变化去触发组件去更新视图,后期的这个逻辑量就会很麻烦
// 例如收集依赖和移除依赖其实是很频繁的发生，每一次都要去拿组件的id+属性名,才能唯一区分这个
// 组件,单纯的通过id来区分,能够让逻辑更加单纯,id不同属性就不同，不需要考虑同名属性
// 等一系列问题
// 比如通过组件id前缀去区分？例如1-a,2-a,但是这里又存在后期的逻辑,需要去解析
// 出1和a,或者2和a,1代表组件实例id,每次压栈收集依赖的时候都要事先去处理成id-属性名
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
// 注意这里的弹栈,这个栈相当于保护现场
// 因为computed的get,会改变当前的target
// watch的修改会改变当前的target
// 但是最终vm._watcher还要收集视图的依赖
// 因此vm._watcher不能被覆盖了
// 在wathcer的get()函数中
// 首先pushTarget
// 运行完之后popTarget
// 把当前target换成栈顶的新的一个watcher
export function popTarget () {
  Dep.target = targetStack.pop()
}

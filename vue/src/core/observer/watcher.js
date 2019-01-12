/* @flow */

import { queueWatcher } from './scheduler'
import Dep, { pushTarget, popTarget } from './dep'

import {
  warn,
  remove,
  isObject,
  parsePath,
  _Set as Set,
  handleError
} from '../util/index'

import type { ISet } from '../util/index'

let uid = 0

/**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 */
// 一个watcher解析一个表达式,收集依赖并且触发回调,当表达式的值发生变化的时候
// 用于$watch api 和 directives

export default class Watcher {
  vm: Component;
  expression: string;
  cb: Function;
  id: number;
  deep: boolean;
  user: boolean;
  lazy: boolean;
  sync: boolean;
  dirty: boolean;
  active: boolean;
  deps: Array<Dep>;
  newDeps: Array<Dep>;
  depIds: ISet;
  newDepIds: ISet;
  getter: Function;
  value: any;

  // 构造函数,传入4个参数
  // 1，vue实例
  // 2，观察的属性
  // 3，cb:回调函数
  // 4，option:选项，可选项
  constructor (
    vm: Component,
    expOrFn: string | Function,
    cb: Function,
    options?: Object
  ) {
    this.vm = vm
    // _watcher属性
    vm._watchers.push(this)
    // options
    if (options) {
      // 如果有options把options里面的值转化成对应的bool值
      // 有4个,分别是deep,user,lazy,sync
      // deep,顾名思义就是比如一个对象,对象里头又有嵌套的对象和值,需要watch这些,那么就用deep,一般情况下watch一个值不必watch一个对象这种,基本值就行了
      //
      this.deep = !!options.deep
      this.user = !!options.user
      this.lazy = !!options.lazy
      this.sync = !!options.sync
    } else {
      // 如果没有传选项,那么这些值全是false
      this.deep = this.user = this.lazy = this.sync = false
    }
    // 以下是单纯的属性赋值
    this.cb = cb
    this.id = ++uid // uid for batching
    this.active = true
    this.dirty = this.lazy // for lazy watchers
    this.deps = []
    this.newDeps = []
    this.depIds = new Set()
    this.newDepIds = new Set()
    this.expression = process.env.NODE_ENV !== 'production'
      ? expOrFn.toString()
      : ''
    // parse expression for getter
    if (typeof expOrFn === 'function') {
      // 如果传入的数是函数则把expOrFn赋值给getter
      this.getter = expOrFn
    } else {
      // 如果string,这个string可能是'a.b.c'这种类型
      // getter是一个函数,接受一个参数,这个参数是一个对象,比如如果传入的是vm,返回属性vm.a.b.c的值,即c的值
      this.getter = parsePath(expOrFn)
      // parsePath返回的是function(obj) {return obj.a.b.c}
      // getter就是一个函数这个函数返回c,
      if (!this.getter) {
        // 如果getter没有值,证明expOrFn这个字符串不是x.x.x
        // 就把getter初始化一个空函数
        this.getter = function () {}
        // 这里的警告信息表示watch的第一个参数非法
        process.env.NODE_ENV !== 'production' && warn(
          `Failed watching path: "${expOrFn}" ` +
          'Watcher only accepts simple dot-delimited paths. ' +
          'For full control, use a function instead.',
          vm
        )
      }
    }
    // 给this.value赋值,lazy有值就给value赋值undefined,如果不是undefined就是赋值this.get()
    // 这个lazy有什么用呢?就是当给lazy赋值为true的时候,顾名思义就是懒的意思
    // 就是在初始化的时候并不会调用get()
    // 通过什么后期的run来驱动
    this.value = this.lazy
      ? undefined
      : this.get()
  }

  /**
   * Evaluate the getter, and re-collect dependencies.
   */
  get () {
    // 把当前实例watcher实例push到一个数组中,这个数组是targetStack
    pushTarget(this)
    let value
    // 拿到vue实例
    const vm = this.vm
    try {
      // 调用getter,拿到被监听的值
      value = this.getter.call(vm, vm)
    } catch (e) {
      if (this.user) {
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      } else {
        throw e
      }
    } finally {
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
      if (this.deep) {
       // 如果是deep,深度监听,就去遍历这个值
       // 如果这个值是基本类型,情况较为单纯
       // 如果是对象的话,或者是数组,那么会继续遍历下去
        traverse(value)
      }
      // 弹出push进去的当前watcher对象
      popTarget()
      // 清空依赖
      this.cleanupDeps()
    }
    // 返回值
    return value
  }

  /**
   * Add a dependency to this directive.
   */
  // watch对象添加一个dep对象,拿到dep对象的id
  // 如果newDepIds没有,就把这个id加入到这个集合中,newDeps把当前dep对象压入
  // 如果depIds没有这个id,dep对象里面的子subs数组,把当前watcher压进去
  addDep (dep: Dep) {
    const id = dep.id
    if (!this.newDepIds.has(id)) {
      this.newDepIds.add(id)
      this.newDeps.push(dep)
      if (!this.depIds.has(id)) {
        dep.addSub(this)
      }
    }
  }

  /**
   * Clean up for dependency collection.
   */
  // 清理收集的依赖集合
  cleanupDeps () {
    let i = this.deps.length
    while (i--) {
      // 遍历deps中的每个元素,如果newDepIds中没有dep对象中的id
      // 就去当前dep对象中,清理当前的移除watcher实例
      const dep = this.deps[i]
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this)
      }
    }

    // 以下功能总体实现了把newDeps和newDepIds给deps和newDepIds,然后清空newDeps和newDepIds
    // depIds一个装有depId的数组
    let tmp = this.depIds
    // newDepIds给depIds
    this.depIds = this.newDepIds
    // 之前depId的值给newDepIds
    // 以上操作完成depIds和newDepIds的交换
    this.newDepIds = tmp
    // 清理newDepIds也就是清理交换之前depIds
    this.newDepIds.clear()
    // 以下操作deps和newDeps交换
    // 清理newDeps
    tmp = this.deps
    this.deps = this.newDeps
    this.newDeps = tmp
    this.newDeps.length = 0
  }

  /**
   * Subscriber interface.
   * Will be called when a dependency changes.
   */
  // 订阅接口,如果一个依赖变化了,将会被调用
  update () {
    /* istanbul ignore else */
    if (this.lazy) {
      this.dirty = true
    } else if (this.sync) {
      this.run()
    } else {
      queueWatcher(this)
    }
  }

  /**
   * Scheduler job interface.
   * Will be called by the scheduler.
   */
  // 调度任务的接口
  run () {
    if (this.active) {
      // 如果还active,就拿到当前watch的值
      const value = this.get()
      if (
        // 对于对象和数组这种类型,哪怕改变的值是一样的,只要有改动这个过程,也应该触发
        value !== this.value ||
        // Deep watchers and watchers on Object/Arrays should fire even
        // when the value is the same, because the value may
        // have mutated.
        isObject(value) ||
        this.deep
      ) {
        // set new value
        const oldValue = this.value
        this.value = value
        if (this.user) {
          // this.user表示用户设定的watch options
          // 在initWatch的时候进行设置
          try {
            // 也是调用一样的方法,但是用户属性加了异常控制,便于用户去调试
            this.cb.call(this.vm, value, oldValue)
          } catch (e) {
            handleError(e, this.vm, `callback for watcher "${this.expression}"`)
          }
        } else {
          // 这里调用回调,第一个回调传入vue实例,第一个参数为新值,第二个参数为旧值
          // 对于视图的更新,cb为noop,也就是一个空函数,什么也不调用
          // 如果不传这里会报错
          this.cb.call(this.vm, value, oldValue)
        }
      }
    }
  }

  /**
   * Evaluate the value of the watcher.
   * This only gets called for lazy watchers.
   */
  evaluate () {
    // 拿到被watch的值
    // 把dirty赋值false
    this.value = this.get()
    this.dirty = false
  }

  /**
   * Depend on all deps collected by this watcher.
   */
  // 把deps中的每个dep对象，都调用depend方法
  depend () {
    let i = this.deps.length
    while (i--) {
      this.deps[i].depend()
      // dep对象中的Target即一个watcher对象,使用该watch对象调用addDep(this.deps[i])
    }
  }

  /**
   * Remove self from all dependencies' subscriber list.
   */
  // 从所有的依赖中移除自己
  teardown () {
    // 如果this.active设置为true就继续运行,false就什么也不做
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      if (!this.vm._isBeingDestroyed) {
        // 如果vm对象已经被Destroyed
        // 把this从this.vm._watchers中移除
        remove(this.vm._watchers, this)
      }
      // 如果当前的vm对象还没有被销毁
      // 先去找deps.length
      // 然后每个dep对象,移除自己subs里面装的当前watcher对象
      let i = this.deps.length
      while (i--) {
        this.deps[i].removeSub(this)
      }
      // 然后把active赋值为false,表示这个watcher已经不active了
      this.active = false
    }
  }
}

/**
 * Recursively traverse an object to evoke all converted
 * getters, so that every nested property inside the object
 * is collected as a "deep" dependency.
 */
// 递归遍历一个对象来调用所有的getters,用来让每个对象内部嵌套的属性都被收集为deep依赖
// 初始化一个set清空
const seenObjects = new Set()
function traverse (val: any) {
  // traverse之前先把集合清空
  seenObjects.clear()
  _traverse(val, seenObjects)
}

function _traverse (val: any, seen: ISet) {
  let i, keys
  // 判断val是不是数组
  const isA = Array.isArray(val)
  // 如果既不是数组又不是对象又不能扩展,就什么也不做
  if ((!isA && !isObject(val)) || !Object.isExtensible(val)) {
    return
  }
  // 下面的逻辑分了3个情况
  // val是一个带有__ob__属性的对象
  // val是一个数组
  // val是一个对象

  // 如果val里面有__ob__
  if (val.__ob__) {
    // 把__ob__.id给这个depId
    const depId = val.__ob__.dep.id
    if (seen.has(depId)) {
      // 如果集合里面有这个id就返回
      return
    }
    // 不存在这个id就添加进去
    seen.add(depId)
  }
  // 如果val是个数组
  if (isA) {
    i = val.length
    // 这里开始递归思维了
    // 每个都跑一遍traverse
    while (i--) _traverse(val[i], seen)
  } else {
    // 这里表示val是一个对象
    // 获取对象的键值数组
    // 然后遍历这个对象,把对象的每个值在一次进行traverse
    keys = Object.keys(val)
    i = keys.length
    while (i--) _traverse(val[keys[i]], seen)
  }
}

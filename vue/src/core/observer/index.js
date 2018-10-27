/* @flow */

import Dep from './dep'
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

  constructor (value: any) {
    this.value = value
    this.dep = new Dep()
    this.vmCount = 0
    def(value, '__ob__', this)
    if (Array.isArray(value)) {
      const augment = hasProto
        ? protoAugment
        : copyAugment
      augment(value, arrayMethods, arrayKeys)
      this.observeArray(value)
    } else {
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
export function observe (value: any, asRootData: ?boolean): Observer | void {
  // 如果不是对象,那么就返回
  if (!isObject(value)) {
    return
  }
  // 这里说明value是对象
  // 定义一个ob,这个ob要么是void要么是Observer对象
  let ob: Observer | void
  // 如果这个对象有__ob__属性,并且__ob__属性是Observer的是实例
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    // ob就被赋值
    ob = value.__ob__
  } else if (
    // 如果这里默认转化响应属性的话
    // 同时也不是服务器渲染
    // value是数组或者普通对象
    // 同时这个对象还是可扩展的
    // 并且这个对象不是vue实例
    observerState.shouldConvert &&
    !isServerRendering() &&
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value._isVue
  ) {
    // 这里就为这个值创建一个观察者实例
    ob = new Observer(value)
  }
  // 如果传入了asRootData同时ob也存在,那么就把ob的vmCount++,然后返回ob
  if (asRootData && ob) {
    ob.vmCount++
  }
  return ob
}

/**
 * Define a reactive property on an Object.
 */
// 在一个对象上定义一个响应式属性
// 这个函数可以传入5个参数
// 1.对象,2键,3值,4自定义setter(可选),5shallow?展示不清楚(可选),表面意思是浅的意思
export function defineReactive (
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,
  shallow?: boolean
) {
  // 首先生成一个Dep对象
  const dep = new Dep()
  // 获取obj上面的key的描述信息
  // 如果该属性已经存在并且不可配置,就return
  const property = Object.getOwnPropertyDescriptor(obj, key)
  if (property && property.configurable === false) {
    return
  }
  // 运行到这里,表示该属性并不在obj上或者在obj上但是可配置
  // cater for pre-defined getter/setters
  // property如果存在他就是一个对象{set:,get:,enumerable,configable}类似这样一个东西
  // 那么就把getter和setter分别赋值到上面
  const getter = property && property.get
  const setter = property && property.set

  // 如果shollow传的是false,也就是不是浅的,那么就定义一个childOb = observe(val)
  // 为这个值生成一个观察对象
  let childOb = !shallow && observe(val)
  // 这里就是经典的在obj上定义一个key
  Object.defineProperty(obj, key, {
    enumerable: true, // 可枚举
    configurable: true,// 可以配置
    // 为这个属性生成get函数是一个具名函数
    get: function reactiveGetter () {
      // 这里设置一个局部变量value
      // 如果getter存在,就用这对象去调动getter,如果对象不存在就用val
      const value = getter ? getter.call(obj) : val
      // Dep.target存在
      if (Dep.target) {
        // 调动depend
        dep.depend()
        if (childOb) {
          // 子对象存在,调用depend
          childOb.dep.depend()
        }
        // 如果value是array的话,就用dependArray方法
        if (Array.isArray(value)) {
          dependArray(value)
        }
      }
      return value
    },
    set: function reactiveSetter (newVal) {
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
      // 如果不是浅的,就继续观察这个新的值,为他生成一个observer对象
      childOb = !shallow && observe(newVal)
      // 通知发生了改变
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
    // 如果被检测的目标是数组,并且具有合法的索引
    // 索引必须大于0,并且向下取证等于自身表示是整数,同时为有限值
    // 判断被set的索引和数组长度哪个大
    target.length = Math.max(target.length, key)
    // 取大的,然后key的位置插入val
    // 比如[1,2],key是1,值为n => [1,n,2]
    // 比如[1,2],key是2,值为n => [1,2,n]
    target.splice(key, 1, val)
    // 返回的被插入数组的值
    return val
  }
  // 如果target有这个属性值,那么就把这个值赋值给这个属性,返回这个值
  if (hasOwn(target, key)) {
    target[key] = val
    return val
  }
  // 程序走到这里,表示target是对象并且没有这个key
  // 拿到target的__ob__属性
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    // target是个vue对象或者ob有vmCount属性
    // 这里表示,后期往vue对象中插入了值,给个警告,不要给一个vue实例添加相应数据isVue会给每个vue实例给这个标志
    // $data属性里面是有__ob__属性的,该属性相当于是个观察对象,Obeserve生成的对象
    // __ob__.vmCount目前还不得知，感觉是观察的实例个数
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }
  if (!ob) {
    // 如果还没有ob,表示这个对象不是响应对象
    // 这应该就是最简单的情况,直接把该值赋给对象,然后返回
    target[key] = val
    return val
  }
// 走到这里来,表示目标对象既不是$data,并且还没有这个属性,因此这个属性需要变成响应式的
//
  defineReactive(ob.value, key, val)
  ob.dep.notify()
  return val
}

/**
 * Delete a property and trigger change if necessary.
 */
// 删除一个元素,可以是在数组和对象上面删除
// 如果是数组,直接就splice
// 如果是对象,拿到对象的__ob__
// 如果对象是vue实例或者有vmCount表示这是一个实例的$data属性
// 那么会阻止删除并给警告
// 除了上面的情况外
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
// 由于数组并没有拦截器,即像属性一样的getter和setter,所以必须要另外单独写
// 这里的逻辑是遍历数组
// 如果数组的元素存在,且有__ob__对象,就调用该元素的__ob__的dep.denpen()
// 如果元素的元素还是数组,递归一下
function dependArray (value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) {
      dependArray(e)
    }
  }
}

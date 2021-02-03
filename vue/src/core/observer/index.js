/* @flow */

import Dep from './dep' // 依赖对象
import { arrayMethods } from './array' //拿到一个具有能够通过改变数组方法来监听的方法
// 引入工具类方法
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
// Object.keys或用for...in循环还会获取到原型链上的可枚举属性，不过可以使用hasOwnProperty()方法过滤掉
// 由于上面的对象的原型就是Array.prototype,所以这里不能够用原生方法,所以这把原型链上的方法屏蔽掉
// 用getOwnPropertyNames来屏蔽掉原型链上的属性,道格拉斯克劳福德建议for in配合hasOwnProperty来使用

/**
 * By default, when a reactive property is set, the new value is
 * also converted to become reactive. However when passing down props,
 * we don't want to force conversion because the value may be a nested value
 * under a frozen data structure. Converting it would defeat the optimization.
 */
// 默认情况下一个响应数据属性被设置后,新的值也会被设置为响应式,但是,当向下传props的时候
// 我们不想强制转换因为那个值可能有一个嵌套的值,在一个冰冻数据结构下,转化他可能会打破优化
export const observerState = {
  shouldConvert: true
}

/**
 * Observer class that are attached to each observed
 * object. Once attached, the observer converts target
 * object's property keys into getter/setters that
 * collect dependencies and dispatches updates.
 */
// observer类附着在每一个被观察对象,一旦被附上,观察者把目标对象的属性键值转化成getters和setters
// 这个getters和setters收集依赖然后触发更新
// Observer类
// 实例化必须传入至少一个值
// 把这个值给this.value
// 实例化一个Dep对象给this.dep
// vmCount初始化为0,这个属性表示当前这个Ob对象有多少个实例来作为root $data?(起始数据?)
// 在这个值上面定义个

// 注意observer也算是一个是属性名字叫__ob__
// 如果一个对象中有__ob__且为Observer的实例
// 那么表示这个对象的所有属性是响应式的

// 比如data（）,在收集依赖的时候实际上__ob__也被收集
// 到watcher中进行依赖的管理,这么做的原因在于
// 为了方便$set方法来进行响应式的监听
// 比如data里面有一个属性aaa:{a:1,b:2}
// this.aaa.c = 3;
// 并不会触发dep.notify
// 这个时候需要用到set
// 例如v,.$set(this.aaa,"c",3)
// 运行这个函数的过程就是首先把c并入到this.aaa中
// 同时将c定义为响应式
// 最后触发dep.notify(),来进行视图的重新渲染
export class Observer {
  value: any;
  dep: Dep;
  vmCount: number; // number of vms that has this object as root $data

  constructor (value: any) {
    this.value = value
    this.dep = new Dep()
    this.vmCount = 0
    // 注意这里value必须是个对象,要不然会报错,虽然这里申明的是any
    // 在这个对象上面定义一个__ob__属性,然后把对象自己当做值
    def(value, '__ob__', this)
    // 如果value是数组
    if (Array.isArray(value)) {
      // 当前环境能不能用__proto__
      // 如果有__proto__这个api就把argument赋值为hasProto
      // 如果没有就augment就赋值为copyAugment
      const augment = hasProto
        ? protoAugment
        : copyAugment
      // 无论怎样,这里给augment传入了3个参数
      // 如果有__proto__属性可用,那么这里就只用前2个参数,如果没有的话就给用3个参数
      // 第三个参数为第二参数的属性值(不包括原型链上的)数组
      augment(value, arrayMethods, arrayKeys)
      // 一般情况下认为有__proto__,那么这里的操作就是value.__proto__ = arrayMethods;
      // 也就是说如果value是数组,那么value的proto上面给绑定一个自定义带有拦截器的数组方法对象,而不是用原始的数组方法
      this.observeArray(value)
      // 然后当前对象观察这个value,用observe(value[i])来观察
    } else {
      // 如果是对象的话,就要去遍历这个对象,使用defineReactive,把这个对象上面的所有属性变成getter/setter
      this.walk(value)
    }
  }

  /**
   * Walk through each property and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   */
  // 步行迅游一个对象,然后把该对象上面的每个值都转化成getters和setters
  // 这个方法参数必须是个对象
  walk (obj: Object) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i], obj[keys[i]])
    }
  }

  /**
   * Observe a list of Array items.
   */
  // 观察一个数组,也就是把数组里面的所有值遍历出来然后observe
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
// 把目标对象的__proto__属性设置为keys
function protoAugment (target, src: Object, keys: any) {
  /* eslint-disable no-proto */
  // 这么操作的影响是比如 a = {};a.__proto__ === Object.prototype
  // 当a.__proto__ = Array.prototype的时候
  // a -> Array.prototype -> Object.prototype
  // a现在既是Array的实例也是Object的实例
  // 并且toString的值为[obejct,Obejct]
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * Augment an target Object or Array by defining
 * hidden properties.
 */
/* istanbul ignore next */
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  // keys是一个字符串数组
  // 遍历这个数组,然后把值拿到
  // 在target上面定义这个值,用defineProperty来定义不可枚举的属性
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

 // 每一次set之后,都需要重新observe一下,这里分为3种情况
 // 原始值修改 -> 那么就！isObject返回了

 // 如果是对象修改，{a:1, b:2, __ob__} -> {a:3, b:2, __ob__},修改了a,但是以前创建的__ob__没有丢失
 // 这里就不单独再去Observe了

 // 如果整个对象覆盖, {a:1, b:2, __ob__} -> {a:1, b:2},虽然没有值修改，但是依旧会来一次Observe(),在对象
 // 上创建__ob__,同时把a和b重新收集依赖。

 // 那么以前收集的a和b会不会被清理？答案是会，因为每一次收集依赖，watcher都会更新一遍
 // render()里面所有的依赖都会再次被收集一次
 // newDeps -> Deps , 原始Deps清理
 // newDepIds -> depIds ，原始depIds清理

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
  // 运行到这里,表示该属性不在obj上或者在obj上但是可配置
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
    /*
    // 注释下面这段代码的原因是vscode高亮异常,不过这里也不影响看源码
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    */
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
    /*
    //这里加这个注释的原因是,vscode中的高亮异常,就把这里也注释掉
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    */
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
